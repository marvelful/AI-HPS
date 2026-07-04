"""
Development launcher — starts all 6 backend services concurrently.

Run from D:\\AI-HPS\\backend\\ with venv activated:
    python run_dev.py

Press Ctrl+C once to shut everything down cleanly.
"""
import subprocess
import sys
import signal
import os

SERVICES = [
    ("svc02_auth",        8002, "services.svc02_auth.main:app"),
    ("svc03_procedures",  8003, "services.svc03_procedures.main:app"),
    ("svc05_analytics",   8005, "services.svc05_analytics.main:app"),
    ("svc06_audit",       8006, "services.svc06_audit.main:app"),
    ("svc07_kb_sync",     8007, "services.svc07_kb_sync.main:app"),
    ("agents_pipeline",   8020, "agents.main:app"),
]

COLORS = ["\033[94m", "\033[92m", "\033[93m", "\033[95m", "\033[96m", "\033[91m"]
RESET  = "\033[0m"


def main():
    procs = []
    python = sys.executable

    print("Starting AI-HPS backend services...\n")

    for i, (name, port, app) in enumerate(SERVICES):
        color = COLORS[i % len(COLORS)]
        print(f"  {color}[{name}]{RESET} → http://localhost:{port}  (docs: http://localhost:{port}/docs)")
        proc = subprocess.Popen(
            [python, "-m", "uvicorn", app, "--port", str(port), "--reload"],
            cwd=os.path.dirname(os.path.abspath(__file__)),
        )
        procs.append((name, proc))

    print(f"\nAll {len(procs)} services running. Press Ctrl+C to stop.\n")

    def shutdown(sig, frame):
        print("\nShutting down all services...")
        for name, proc in procs:
            proc.terminate()
        for name, proc in procs:
            proc.wait()
        print("Done.")
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    for name, proc in procs:
        proc.wait()


if __name__ == "__main__":
    main()
