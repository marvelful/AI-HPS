"""
AI-HPS Ingestion CLI.

Run from backend/ directory:
  python -m ingestion.cli                          # default paths
  python -m ingestion.cli --source PROCEDURES/ --output knowledge/
  python -m ingestion.cli --write-db               # also write to PostgreSQL
"""
import argparse
import sys
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(
        description="AI-HPS Knowledge Ingestion Pipeline — processes PDFs into knowledge_chunks.jsonl"
    )
    parser.add_argument(
        "--source", type=Path, default=Path("PROCEDURES"),
        help="Path to PROCEDURES directory (default: ./PROCEDURES)",
    )
    parser.add_argument(
        "--output", type=Path, default=Path("knowledge"),
        help="Output directory (default: ./knowledge)",
    )
    parser.add_argument(
        "--write-db", action="store_true",
        help="Also write knowledge_sources and knowledge_chunks to PostgreSQL",
    )
    args = parser.parse_args()

    if not args.source.exists():
        print(f"[error] Source directory not found: {args.source.resolve()}")
        sys.exit(1)

    from ingestion.pipeline import run_pipeline

    db_session = None
    if args.write_db:
        from shared.database import SessionLocal
        db_session = SessionLocal()
        print("[db] Connected to PostgreSQL")

    try:
        stats = run_pipeline(
            source_dir=args.source,
            output_dir=args.output,
            db_session=db_session,
        )
    finally:
        if db_session:
            db_session.close()

    print("\n── Summary ───────────────────────────────────")
    print(f"  Documents processed : {stats['documents_processed']}")
    print(f"  Documents failed    : {stats['documents_failed']}")
    print(f"  Total chunks        : {stats['total_chunks']}")
    for dept, count in stats.get("departments", {}).items():
        print(f"  {dept:<28} {count} chunks")
    print(f"\nNext step: rebuild the vector index")
    print(f"  curl -X POST http://localhost:8020/pipeline/rebuild-kb")


if __name__ == "__main__":
    main()
