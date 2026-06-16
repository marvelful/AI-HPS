"""
Run from backend/: python check_setup.py
Checks PostgreSQL, Redis, and RabbitMQ connectivity and schema state.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from shared.config import get_settings

settings = get_settings()

print("=" * 50)
print("   AI-HPS Setup Check")
print("=" * 50)
print()

# ── 1. PostgreSQL ──────────────────────────────────────
try:
    import psycopg2
    conn = psycopg2.connect(settings.DATABASE_URL)
    cur = conn.cursor()
    cur.execute("SELECT version();")
    ver = cur.fetchone()[0]
    print(f"OK PostgreSQL  {ver[:55]}")

    cur.execute("""
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name LIKE 'aihps_%'
        ORDER BY schema_name
    """)
    schemas = [r[0] for r in cur.fetchall()]
    if schemas:
        print(f"  Schemas     {', '.join(schemas)}")
    else:
        print("  ! Schemas missing — run: psql -U postgresql -d AIHPS -f schema.sql")

    cur.execute("SELECT COUNT(*) FROM aihps_procedures.departments")
    dept_count = cur.fetchone()[0]
    print(f"  Departments {dept_count} rows")

    conn.close()
except Exception as e:
    print(f"FAIL PostgreSQL  FAILED: {e}")

print()

# ── 2. Redis ───────────────────────────────────────────
try:
    import redis
    r = redis.from_url(settings.REDIS_URL)
    r.ping()
    info = r.info("server")
    print(f"OK Redis       v{info['redis_version']} — connected")
except Exception as e:
    print(f"FAIL Redis       FAILED: {e}")

print()

# ── 3. RabbitMQ ────────────────────────────────────────
try:
    import pika
    params = pika.URLParameters(settings.RABBITMQ_URL)
    params.socket_timeout = 5
    conn = pika.BlockingConnection(params)
    ch = conn.channel()
    ch.close()
    conn.close()
    print("OK RabbitMQ    connected")
except Exception as e:
    print(f"FAIL RabbitMQ    FAILED: {e}")
    print("  Start with: cd docker && docker compose up -d")

print()
print("=" * 50)
