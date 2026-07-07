"""
Ingestion pipeline orchestrator.

Flow per PDF:
  extract text (PyMuPDF) → extract tables (pdfplumber)
  → semantic chunk → build metadata → append to JSONL

Output:
  knowledge/<domain>/<dept>/   — per-document JSONL files
  knowledge/knowledge_chunks.jsonl  — master chunk file (RAG source of truth)
  knowledge/chunk_metadata.json     — inventory statistics
"""
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from ingestion.extractors.pdf_extractor import extract_pages
from ingestion.extractors.table_extractor import extract_tables
from ingestion.chunker import chunk_pages
from ingestion.metadata_builder import (
    build_chunk_metadata, get_citation, resolve_department, slugify,
)


def _process_pdf(pdf_path: Path, department: str) -> list[dict]:
    """Extract, chunk and tag one PDF. Returns list of chunk metadata dicts."""
    dept_slug = slugify(department)
    doc_id = f"{dept_slug}_{slugify(pdf_path.stem)}"
    citation, version = get_citation(pdf_path.stem)

    print(f"    extracting: {pdf_path.name}")

    pages = extract_pages(pdf_path)
    if not pages:
        print(f"    [warn] no text extracted from {pdf_path.name}")
        return []

    tables = extract_tables(pdf_path)
    text_chunks = chunk_pages(pages)

    records: list[dict] = []

    for chunk in text_chunks:
        meta = build_chunk_metadata(
            chunk=chunk,
            pdf_path=pdf_path,
            department=department,
            document_id=doc_id,
            citation=citation,
            version=version,
            is_table=False,
        )
        records.append(meta)

    for i, tbl in enumerate(tables):
        if len(tbl["markdown"]) < 50:
            continue
        table_chunk = {
            "text": f"Table from {pdf_path.stem} (page {tbl['page_num']}):\n\n{tbl['markdown']}",
            "section": f"Table — page {tbl['page_num']}",
            "start_page": tbl["page_num"],
            "chunk_index": len(text_chunks) + i,
        }
        meta = build_chunk_metadata(
            chunk=table_chunk,
            pdf_path=pdf_path,
            department=department,
            document_id=doc_id,
            citation=citation,
            version=version,
            is_table=True,
        )
        records.append(meta)

    print(f"    done: {len(records)} chunks ({len(text_chunks)} text, {len(tables)} tables)")
    return records


def run_pipeline(
    source_dir: Path,
    output_dir: Path,
    db_session=None,
) -> dict:
    """
    Walk source_dir, process every PDF, write output files and optionally the DB.
    Returns a summary statistics dict.
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    all_chunks: list[dict] = []
    stats: dict = {
        "documents_processed": 0,
        "documents_failed": 0,
        "total_chunks": 0,
        "departments": {},
        "started_at": datetime.now(timezone.utc).isoformat(),
    }

    for dept_folder in sorted(source_dir.iterdir()):
        if not dept_folder.is_dir():
            continue

        department = resolve_department(dept_folder.name)
        dept_chunks: list[dict] = []
        dept_slug = slugify(department)
        dept_out = output_dir / "who" / dept_slug
        dept_out.mkdir(parents=True, exist_ok=True)

        print(f"\n[{department}]")

        for pdf_path in sorted(dept_folder.glob("*.pdf")):
            try:
                chunks = _process_pdf(pdf_path, department)
                dept_chunks.extend(chunks)
                all_chunks.extend(chunks)
                stats["documents_processed"] += 1

                # Per-document JSONL for inspection
                if chunks:
                    doc_id = chunks[0]["document_id"]
                    with open(dept_out / f"{doc_id}.jsonl", "w", encoding="utf-8") as f:
                        for c in chunks:
                            f.write(json.dumps(c, ensure_ascii=False) + "\n")

            except Exception as exc:
                import traceback
                print(f"    [error] {pdf_path.name}: {exc}")
                print(traceback.format_exc())
                stats["documents_failed"] += 1

        stats["departments"][department] = len(dept_chunks)

    # Master JSONL
    master = output_dir / "knowledge_chunks.jsonl"
    with open(master, "w", encoding="utf-8") as f:
        for chunk in all_chunks:
            f.write(json.dumps(chunk, ensure_ascii=False) + "\n")

    stats["total_chunks"] = len(all_chunks)
    stats["completed_at"] = datetime.now(timezone.utc).isoformat()

    # Inventory file
    with open(output_dir / "chunk_metadata.json", "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)

    if db_session is not None:
        _write_to_db(all_chunks, db_session, source_dir)

    print(f"\n[pipeline] Complete:")
    print(f"  Documents: {stats['documents_processed']} processed, {stats['documents_failed']} failed")
    print(f"  Chunks:    {stats['total_chunks']}")
    print(f"  Output:    {master}")
    return stats


def _write_to_db(chunks: list[dict], db_session, source_dir: Path) -> None:
    """Upsert knowledge_sources and knowledge_chunks into PostgreSQL."""
    from shared.models.procedures import KnowledgeSource, KnowledgeChunk
    from datetime import timezone

    now = datetime.now(timezone.utc)

    # Group by document_id
    docs: dict[str, list[dict]] = {}
    for c in chunks:
        docs.setdefault(c["document_id"], []).append(c)

    for doc_id, doc_chunks in docs.items():
        first = doc_chunks[0]

        # Upsert source
        src = db_session.query(KnowledgeSource).filter(
            KnowledgeSource.document_id == doc_id
        ).first()

        if src:
            src.total_chunks = len(doc_chunks)
            src.last_ingested_at = now
        else:
            src = KnowledgeSource(
                document_id=doc_id,
                filename=first["source"],
                original_path=str(source_dir),
                document_type="pdf",
                knowledge_domain=first["knowledge_domain"],
                language=first["language"],
                source_organization="World Health Organization",
                citation=first["citation"],
                approval_status="approved",
                version=first["version"],
                total_chunks=len(doc_chunks),
                last_ingested_at=now,
            )
            db_session.add(src)

        db_session.flush()

        # Remove stale chunks
        db_session.query(KnowledgeChunk).filter(
            KnowledgeChunk.document_id == doc_id
        ).delete(synchronize_session=False)

        # Insert fresh chunks
        for c in doc_chunks:
            db_session.add(KnowledgeChunk(
                chunk_id=c["chunk_id"],
                source_id=src.id,
                document_id=c["document_id"],
                title=c["title"][:500],
                content=c["content"],
                category=c["category"],
                knowledge_domain=c["knowledge_domain"],
                department=c["department"],
                source=c["source"][:500],
                language=c["language"],
                document_type=c["document_type"],
                procedure_type=c["procedure_type"],
                visibility=c["visibility"],
                role=c["role"],
                page=c.get("page"),
                section=(c.get("section") or "")[:500] or None,
                chunk_index=c["chunk_index"],
                citation=c.get("citation"),
                approval_status=c["approval_status"],
                version=c["version"],
                is_table=c.get("is_table", False),
            ))

    db_session.commit()
    print(f"[pipeline] DB: wrote {len(chunks)} chunks from {len(docs)} documents")
