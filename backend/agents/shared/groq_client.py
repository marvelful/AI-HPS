"""
Groq API client — uses httpx directly.

Why httpx and not the openai/groq SDK?
  - Avoids all SDK version / base_url normalisation bugs
  - httpx is already a pinned dependency; no extra install needed
  - Full control over the exact URL, headers, and payload

RAG flow implemented here:
  embed question → retrieve top-k chunks → build prompt → call Groq → return text
"""
import json
from typing import Optional

import httpx

_settings = None


def _s():
    global _settings
    if _settings is None:
        from shared.config import get_settings
        _settings = get_settings()
    return _settings


# ── Error types ───────────────────────────────────────────────────────────────

class GroqError(Exception):
    """Raised on any Groq call failure with a human-readable message."""
    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.status_code = status_code


class GroqKeyMissingError(GroqError):
    pass


class GroqKeyInvalidError(GroqError):
    pass


class GroqModelNotFoundError(GroqError):
    pass


class GroqRateLimitError(GroqError):
    pass


class GroqNetworkError(GroqError):
    pass


# ── Key validation ────────────────────────────────────────────────────────────

def _get_key() -> str:
    key = _s().GROQ_API_KEY.strip()
    if not key:
        raise GroqKeyMissingError(
            "GROQ_API_KEY is not set. "
            "Open backend/.env, add GROQ_API_KEY=gsk_..., then restart the agent service."
        )
    if not key.startswith("gsk_"):
        raise GroqKeyInvalidError(
            f"GROQ_API_KEY looks wrong — it starts with '{key[:4]}…' but Groq keys start with 'gsk_'. "
            "Check your .env file."
        )
    return key


# ── Core HTTP call ────────────────────────────────────────────────────────────

def _post(messages: list[dict], model: str, temperature: float, max_tokens: int, timeout: float) -> str:
    """
    POST to GROQ_CHAT_ENDPOINT and return the assistant message text.
    Raises GroqError subclasses for every known failure mode.
    """
    api_key = _get_key()
    endpoint = _s().GROQ_CHAT_ENDPOINT

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    try:
        r = httpx.post(
            endpoint,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=timeout,
        )
    except httpx.TimeoutException:
        raise GroqNetworkError(
            "Groq request timed out after waiting for a response. "
            "Check your internet connection and try again."
        )
    except httpx.NetworkError as exc:
        raise GroqNetworkError(
            f"Cannot reach Groq API — no internet connection or DNS failure: {exc}"
        )

    # Map HTTP error codes to specific exceptions
    if r.status_code == 401:
        raise GroqKeyInvalidError(
            "Groq rejected the API key (HTTP 401). "
            "Verify GROQ_API_KEY in your .env file and restart the service.",
            status_code=401,
        )
    if r.status_code == 404:
        raise GroqModelNotFoundError(
            f"Model '{model}' was not found on Groq (HTTP 404). "
            "Check LLM_MODEL in your .env file.",
            status_code=404,
        )
    if r.status_code == 429:
        raise GroqRateLimitError(
            "Groq rate limit reached (HTTP 429). Wait a moment and try again.",
            status_code=429,
        )
    if r.status_code != 200:
        snippet = r.text[:400]
        raise GroqError(
            f"Groq returned an unexpected status HTTP {r.status_code}: {snippet}",
            status_code=r.status_code,
        )

    try:
        data = r.json()
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, json.JSONDecodeError) as exc:
        raise GroqError(f"Groq returned an unrecognised response format: {exc}")


# ── Public API ────────────────────────────────────────────────────────────────

def call_groq(
    messages: list[dict],
    *,
    system: Optional[str] = None,
    model: Optional[str] = None,
    temperature: Optional[float] = None,
    max_tokens: Optional[int] = None,
    timeout: float = 60.0,
) -> str:
    """
    Call Groq chat completions and return the assistant reply.

    Args:
        messages:    List of {"role": ..., "content": ...} dicts.
        system:      Optional system message prepended to messages.
        model:       Overrides LLM_MODEL from config.
        temperature: Overrides TEMPERATURE from config.
        max_tokens:  Overrides MAX_TOKENS from config.
        timeout:     HTTP request timeout in seconds.

    Returns:
        The assistant reply text.

    Raises:
        GroqKeyMissingError   – GROQ_API_KEY not in .env
        GroqKeyInvalidError   – Key rejected by Groq
        GroqModelNotFoundError – Model name wrong
        GroqRateLimitError    – Too many requests
        GroqNetworkError      – No internet / timeout
        GroqError             – Any other Groq failure
    """
    cfg = _s()
    all_messages = []
    if system:
        all_messages.append({"role": "system", "content": system})
    all_messages.extend(messages)

    return _post(
        messages=all_messages,
        model=model or cfg.LLM_MODEL,
        temperature=temperature if temperature is not None else cfg.TEMPERATURE,
        max_tokens=max_tokens or cfg.MAX_TOKENS,
        timeout=timeout,
    )


def smoke_test() -> dict:
    """
    Run a minimal Groq connectivity test.
    Returns {"ok": True, ...} on success or {"ok": False, "error": "..."} on failure.
    """
    cfg = _s()
    try:
        # Validate key format before making any HTTP call
        key = _get_key()
    except GroqError as exc:
        return {"ok": False, "error": str(exc), "hint": "Check GROQ_API_KEY in backend/.env"}

    try:
        text = call_groq(
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Say hello in one sentence."},
            ],
            max_tokens=50,
            timeout=30.0,
        )
        return {
            "ok": True,
            "response": text,
            "model": cfg.LLM_MODEL,
            "endpoint": cfg.GROQ_CHAT_ENDPOINT,
            "temperature": cfg.TEMPERATURE,
            "key_prefix": key[:7] + "…",
        }
    except GroqKeyMissingError as exc:
        return {"ok": False, "error": str(exc), "hint": "Add GROQ_API_KEY=gsk_... to backend/.env and restart"}
    except GroqKeyInvalidError as exc:
        return {"ok": False, "error": str(exc), "hint": "Your key was rejected — get a new one at https://console.groq.com"}
    except GroqModelNotFoundError as exc:
        return {"ok": False, "error": str(exc), "hint": f"Change LLM_MODEL in .env — current value: {cfg.LLM_MODEL}"}
    except GroqRateLimitError as exc:
        return {"ok": False, "error": str(exc), "hint": "Wait 30 seconds and try again"}
    except GroqNetworkError as exc:
        return {"ok": False, "error": str(exc), "hint": "Check your internet connection"}
    except GroqError as exc:
        return {"ok": False, "error": str(exc), "hint": "Unknown Groq error — check the agent service logs"}
