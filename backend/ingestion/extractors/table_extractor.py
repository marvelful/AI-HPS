"""
Table extractor using pdfplumber.
Returns tables as markdown strings, one dict per table found.
"""
from pathlib import Path


def _to_markdown(table: list[list]) -> str:
    if not table:
        return ""
    rows = []
    for row in table:
        cells = [str(c or "").replace("\n", " ").strip() for c in row]
        rows.append("| " + " | ".join(cells) + " |")
    if len(rows) >= 2:
        sep = "| " + " | ".join(["---"] * len(table[0])) + " |"
        rows.insert(1, sep)
    return "\n".join(rows)


def extract_tables(pdf_path: Path) -> list[dict]:
    """
    Return list of:
    {"page_num": int, "markdown": str}
    Only returns tables with at least 2 rows and 2 columns.
    """
    import pdfplumber

    results = []
    with pdfplumber.open(str(pdf_path)) as pdf:
        for page_num, page in enumerate(pdf.pages, start=1):
            try:
                tables = page.extract_tables()
            except Exception:
                continue
            for table in tables:
                if not table or len(table) < 2:
                    continue
                if not any(len(row) >= 2 for row in table):
                    continue
                md = _to_markdown(table)
                if md and len(md) > 40:
                    results.append({"page_num": page_num, "markdown": md})
    return results
