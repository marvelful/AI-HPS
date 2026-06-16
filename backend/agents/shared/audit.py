"""
Fire-and-forget audit event publisher to the audit.events RabbitMQ queue.
Consumed by SVC-06. Non-blocking: publishes in a daemon thread.
"""
import json
import threading
from datetime import datetime, timezone
from typing import Optional

import pika

from shared.config import get_settings

settings = get_settings()


def _publish(event: dict) -> None:
    try:
        params = pika.URLParameters(settings.RABBITMQ_URL)
        conn = pika.BlockingConnection(params)
        ch = conn.channel()
        ch.queue_declare(queue="audit.events", durable=True)
        ch.basic_publish(
            exchange="",
            routing_key="audit.events",
            body=json.dumps(event),
            properties=pika.BasicProperties(delivery_mode=2),
        )
        conn.close()
    except Exception as exc:
        print(f"[audit] Failed to publish: {exc}")


def emit(
    event_type: str,
    *,
    user_id: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    changes: Optional[dict] = None,
    metadata: Optional[dict] = None,
) -> None:
    event = {
        "event_type": event_type,
        "user_id": user_id,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "changes": changes or {},
        "metadata": metadata or {},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    threading.Thread(target=_publish, args=(event,), daemon=True).start()
