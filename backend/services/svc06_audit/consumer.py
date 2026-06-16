"""
RabbitMQ consumer for the audit.events queue.
Runs in a daemon thread so it doesn't block FastAPI startup.
Reconnects automatically on failure.
"""
import json
import threading

import pika

from shared.config import get_settings
from shared.database import SessionLocal
from services.svc06_audit import schemas, service

settings = get_settings()

_stop = threading.Event()
_thread: threading.Thread | None = None


def _on_message(channel, method, _properties, body):
    db = SessionLocal()
    try:
        raw = json.loads(body)
        event = schemas.AuditEventIn(**raw)
        service.write_audit_event(db, event)
        channel.basic_ack(delivery_tag=method.delivery_tag)
    except Exception as exc:
        print(f"[svc06-consumer] Failed to process message: {exc}")
        channel.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
    finally:
        db.close()


def _run() -> None:
    while not _stop.is_set():
        try:
            params = pika.URLParameters(settings.RABBITMQ_URL)
            conn = pika.BlockingConnection(params)
            ch = conn.channel()
            ch.queue_declare(queue="audit.events", durable=True)
            ch.basic_qos(prefetch_count=5)
            ch.basic_consume(queue="audit.events", on_message_callback=_on_message)
            print("[svc06-consumer] Connected — consuming audit.events")
            ch.start_consuming()
        except pika.exceptions.AMQPConnectionError as exc:
            print(f"[svc06-consumer] Connection lost: {exc}. Reconnecting in 5s …")
            _stop.wait(timeout=5)
        except Exception as exc:
            print(f"[svc06-consumer] Unexpected error: {exc}. Restarting in 5s …")
            _stop.wait(timeout=5)


def start() -> None:
    global _thread
    _stop.clear()
    _thread = threading.Thread(target=_run, name="audit-consumer", daemon=True)
    _thread.start()
    print("[svc06-consumer] Consumer thread started")


def stop() -> None:
    _stop.set()
    print("[svc06-consumer] Consumer stop requested")
