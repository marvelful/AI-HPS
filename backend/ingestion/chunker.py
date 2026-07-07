"""
Semantic chunker.
Groups extracted text blocks into meaningful chunks based on document structure.
Each chunk = one complete section / procedure / guideline (not a blind character split).

Strategy:
1. Detect section boundaries (headings, numbered sections).
2. Accumulate blocks under each heading.
3. If a section body exceeds MAX_CHUNK_CHARS, split it at paragraph boundaries.
4. Discard fragments shorter than MIN_CHUNK_CHARS.
"""
import re

MAX_CHUNK_CHARS = 1800
MIN_CHUNK_CHARS = 120

# Sections that contain no actionable content — skip entirely
_SKIP_SECTIONS = re.compile(
    r"^\s*(references?|bibliography|acknowledgements?|further\s+reading"
    r"|list\s+of\s+(references?|figures?|tables?|abbreviations?)"
    r"|abbreviations?|acronyms?|glossary|index|contents?|table\s+of\s+contents?"
    r"|copyright|disclaimer|foreword|preface|about\s+the\s+(author|who)"
    r"|funding|conflict\s+of\s+interest|contributors?)\s*$",
    re.IGNORECASE,
)


def _clean(text: str) -> str:
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" \n", "\n", text)
    return text.strip()


def _is_section_boundary(text: str) -> bool:
    s = text.strip()
    if not s:
        return False
    if re.match(r"^\d+(\.\d+)*\.?\s+\S", s) and len(s) < 130:
        return True
    if re.match(
        r"^(chapter|section|annex|part|appendix|introduction|conclusion|summary"
        r"|references|background|objectives?|scope|purpose|definitions?|acknowledgements?)\b",
        s, re.IGNORECASE,
    ) and len(s) < 130:
        return True
    return False


def chunk_pages(pages: list[dict]) -> list[dict]:
    """
    Input:  pages from pdf_extractor.extract_pages()
    Output: list of chunk dicts:
    {
        "text":       str,
        "section":    str,
        "start_page": int,
        "end_page":   int,
        "chunk_index": int,
    }
    """
    if not pages:
        return []

    # Flatten all blocks with page info
    flat: list[dict] = []
    for page in pages:
        for block in page["blocks"]:
            flat.append({**block, "page_num": page["page_num"]})

    # Group into sections
    sections: list[dict] = []
    cur = {"heading": "", "blocks": [], "start_page": flat[0]["page_num"], "end_page": flat[0]["page_num"]}

    for block in flat:
        text = block["text"]
        pnum = block["page_num"]
        is_boundary = block["is_heading"] or _is_section_boundary(text)

        if is_boundary and cur["blocks"]:
            sections.append(cur)
            cur = {"heading": text[:200], "blocks": [], "start_page": pnum, "end_page": pnum}
        elif is_boundary:
            cur["heading"] = text[:200]
            cur["start_page"] = pnum
        else:
            cur["blocks"].append(text)
            cur["end_page"] = pnum

    if cur["blocks"]:
        sections.append(cur)

    # Convert sections to chunks
    chunks: list[dict] = []
    idx = 0

    for sec in sections:
        heading = _clean(sec["heading"])

        # Skip non-content sections (references, bibliography, etc.)
        if heading and _SKIP_SECTIONS.match(heading):
            continue

        body = _clean("\n\n".join(sec["blocks"]))

        if not body and not heading:
            continue

        full = (heading + "\n\n" + body).strip() if heading else body

        if len(full) <= MAX_CHUNK_CHARS:
            if len(full) >= MIN_CHUNK_CHARS:
                chunks.append({
                    "text": full,
                    "section": heading or "General",
                    "start_page": sec["start_page"],
                    "end_page": sec["end_page"],
                    "chunk_index": idx,
                })
                idx += 1
        else:
            # Split at paragraph boundaries
            paragraphs = body.split("\n\n")
            buf = (heading + "\n\n") if heading else ""
            buf_start = sec["start_page"]

            for para in paragraphs:
                para = para.strip()
                if not para:
                    continue
                if len(buf) + len(para) + 2 <= MAX_CHUNK_CHARS:
                    buf += para + "\n\n"
                else:
                    if buf.strip() and len(buf.strip()) >= MIN_CHUNK_CHARS:
                        chunks.append({
                            "text": buf.strip(),
                            "section": heading or "General",
                            "start_page": buf_start,
                            "end_page": sec["end_page"],
                            "chunk_index": idx,
                        })
                        idx += 1
                    buf = para + "\n\n"

            if buf.strip() and len(buf.strip()) >= MIN_CHUNK_CHARS:
                chunks.append({
                    "text": buf.strip(),
                    "section": heading or "General",
                    "start_page": sec["start_page"],
                    "end_page": sec["end_page"],
                    "chunk_index": idx,
                })
                idx += 1

    return chunks
