"""
Fire-and-forget event helpers.
All publishes run in daemon threads so they never block a request response.
Each call opens a fresh connection — acceptable for Phase 2 dev traffic.
"""
import json
import threading
from datetime import datetime, timezone

import pika
import redis

from shared.config import get_settings

settings = get_settings()


def _rabbit_publish(queue: str, payload: dict) -> None:
    try:
        params = pika.URLParameters(settings.RABBITMQ_URL)
        conn = pika.BlockingConnection(params)
        ch = conn.channel()
        ch.queue_declare(queue=queue, durable=True)
        ch.basic_publish(
            exchange="",
            routing_key=queue,
            body=json.dumps(payload, default=str).encode(),
            properties=pika.BasicProperties(delivery_mode=2),
        )
        conn.close()
    except Exception as exc:
        print(f"[events] RabbitMQ publish failed → {queue}: {exc}")


def _redis_publish(channel: str, payload: dict) -> None:
    try:
        r = redis.from_url(settings.REDIS_URL)
        r.publish(channel, json.dumps(payload, default=str))
    except Exception as exc:
        print(f"[events] Redis publish failed → {channel}: {exc}")


def publish_audit(
    event_type: str,
    user_id: str | None,
    entity_type: str | None,
    entity_id: str | None,
    changes: dict,
    extra: dict | None = None,
) -> None:
    """Publish an audit event to RabbitMQ audit.events (fire-and-forget)."""
    payload = {
        "event_type": event_type,
        "user_id": user_id,
        "entity_type": entity_type,
        "entity_id": str(entity_id) if entity_id else None,
        "changes": changes,
        "metadata": extra or {},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    threading.Thread(
        target=_rabbit_publish, args=("audit.events", payload), daemon=True
    ).start()


def publish_redis(channel: str, payload: dict) -> None:
    """Publish a Redis Pub/Sub event (fire-and-forget)."""
    threading.Thread(
        target=_redis_publish, args=(channel, payload), daemon=True
    ).start()
