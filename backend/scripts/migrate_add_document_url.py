"""
Run once to add the document_url column to the procedure_entries table.

Usage:
    cd backend
    python scripts/migrate_add_document_url.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

import psycopg2

def main():
    db_url = os.environ.get("DATABASE_URL", "postgresql://postgresql:postgresql@localhost:5432/AIHPS")
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute("""
        ALTER TABLE aihps_procedures.procedure_entries
        ADD COLUMN IF NOT EXISTS document_url TEXT;
    """)
    print("Migration complete: document_url column added to aihps_procedures.procedure_entries")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
