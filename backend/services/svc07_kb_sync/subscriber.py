"""
Redis Pub/Sub subscriber — listens for procedure lifecycle events.
Runs in a daemon thread; reconnects automatically on failure.
"""
import json
import threading

import redis

from shared.config import get_settings
from services.svc07_kb_sync import service as kb

settings = get_settings()

CHANNELS = ["procedure.published", "procedure.updated", "procedure.archived", "navigation.updated"]

_stop   = threading.Event()
_thread: threading.Thread | None = None


def _run() -> None:
    while not _stop.is_set():
        try:
            r = redis.from_url(settings.REDIS_URL, decode_responses=True)
            ps = r.pubsub()
            ps.subscribe(*CHANNELS)
            print(f"[svc07-sub] Subscribed to: {', '.join(CHANNELS)}")

            for msg in ps.listen():
                if _stop.is_set():
                    break
                if msg["type"] != "message":
                    continue
                channel = msg["channel"]
                try:
                    payload = json.loads(msg["data"])
                except Exception:
                    payload = {}

                entry_id = payload.get("entry_id")

                if channel in ("procedure.published", "procedure.updated"):
                    if entry_id:
                        print(f"[svc07-sub] Syncing {entry_id} ({channel})")
                        kb.sync_procedure(entry_id)

                elif channel == "procedure.archived":
                    if entry_id:
                        removed = kb.remove_procedure(entry_id)
                        print(f"[svc07-sub] Removed {removed} chunks for archived {entry_id}")

                elif channel == "navigation.updated":
                    # Navigation data is queried deterministically from DB.
                    # No vector indexing needed; log for observability.
                    print(f"[svc07-sub] navigation.updated — no KB action needed")

        except redis.exceptions.ConnectionError as exc:
            print(f"[svc07-sub] Redis connection lost: {exc}. Reconnecting in 5s …")
            _stop.wait(timeout=5)
        except Exception as exc:
            print(f"[svc07-sub] Unexpected error: {exc}. Restarting in 5s …")
            _stop.wait(timeout=5)


def start() -> None:
    global _thread
    _stop.clear()
    _thread = threading.Thread(target=_run, name="kb-subscriber", daemon=True)
    _thread.start()
    print("[svc07-sub] Subscriber thread started")


def stop() -> None:
    _stop.set()
    print("[svc07-sub] Subscriber stop requested")
