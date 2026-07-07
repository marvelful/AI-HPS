"""
PDF text extractor using PyMuPDF (fitz).
Extracts text block-by-block preserving structural clues: font size, bold, position.
Filters headers/footers by vertical position heuristic.
"""
import re
from pathlib import Path


def _avg_font_size(blocks: list) -> float:
    sizes = []
    for b in blocks:
        if b.get("type") != 0:
            continue
        for line in b.get("lines", []):
            for span in line.get("spans", []):
                sz = span.get("size", 0)
                if sz > 0:
                    sizes.append(sz)
    return sum(sizes) / len(sizes) if sizes else 12.0


def _is_heading(block: dict, avg_size: float) -> bool:
    text = block.get("text", "").strip()
    if not text or len(text) > 200:
        return False
    for line in block.get("lines", []):
        for span in line.get("spans", []):
            size = span.get("size", 0)
            flags = span.get("flags", 0)
            is_bold = bool(flags & 16)
            if size > avg_size * 1.15 or is_bold:
                return True
    # Short numbered section e.g. "3.2 Pre-transfusion testing"
    if re.match(r"^\d+(\.\d+)*\.?\s+\S", text) and len(text) < 120:
        return True
    if text.isupper() and 4 < len(text) < 100:
        return True
    return False


def extract_pages(pdf_path: Path) -> list[dict]:
    """
    Return list of page dicts:
    {
        "page_num": int,
        "blocks": [{"text": str, "is_heading": bool}]
    }
    Headers and footers (top/bottom 8% of page) are excluded.
    """
    import fitz  # PyMuPDF

    doc = fitz.open(str(pdf_path))
    pages = []

    for page_num, page in enumerate(doc, start=1):
        raw = page.get_text("dict")
        raw_blocks = raw.get("blocks", [])
        page_height = page.rect.height
        margin = page_height * 0.08
        avg_size = _avg_font_size(raw_blocks)

        blocks = []
        for b in raw_blocks:
            if b.get("type") != 0:
                continue
            bbox = b.get("bbox", (0, 0, 0, page_height))
            # Skip header / footer regions
            if bbox[1] < margin or bbox[3] > page_height - margin:
                continue
            text = ""
            for line in b.get("lines", []):
                for span in line.get("spans", []):
                    text += span.get("text", "")
                text += "\n"
            text = text.strip()
            if not text or len(text) < 4:
                continue
            blocks.append({"text": text, "is_heading": _is_heading(b, avg_size)})

        if blocks:
            pages.append({"page_num": page_num, "blocks": blocks})

    doc.close()
    return pages
