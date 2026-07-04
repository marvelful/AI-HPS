"""
AGENT-R — Router & Intent Classifier.
Pipeline: emergency regex → language detection → LLM intent (Gemini/Mistral) → routing state.
Emergency path uses zero LLM calls. Redis caches repeated intents for 60 s.
"""
import json
import re
from typing import Optional

import redis as redis_lib

from agents.state import AIHPSState
from shared.config import get_settings

settings = get_settings()

# ── Emergency keyword patterns ────────────────────────────────────────────────

_EMERGENCY_EN = re.compile(
    r"\b("
    r"emergency|help\s*me|dying|die\b|cardiac\s*arrest|heart\s*attack|stroke"
    r"|choking|choke|seizure|convuls|overdose|bleed(ing)?|unconscious"
    r"|not\s*breathing|no\s*pulse|can.?t\s*breathe|collapse[d]?"
    r"|critical(ly)?|ambulance|trauma|accident|resuscitat"
    r"|baby\s*coming|labor|labour|miscarriage|premature\s*birth"
    r")\b",
    re.IGNORECASE,
)

_EMERGENCY_FR = re.compile(
    r"\b("
    r"urgence|urgences|secours|aidez[\s\-]moi|mourir|mourant"
    r"|arr[eê]t\s*cardiaque|crise\s*cardiaque|avc|s.([eé]touffe|touffe)"
    r"|convulsions|surdose|saignement|inconscient"
    r"|ne\s*(peut\s*pas\s*)?respire|pas\s*de\s*pouls"
    r"|effondre[d]?|effondr[eé]|critique|ambulance|traumatisme"
    r"|b[eé]b[eé]\s*arrive|travail|fausse\s*couche|pr[eé]matur[eé]|r[eé]animation"
    r")\b",
    re.IGNORECASE,
)

# ── Language detection ────────────────────────────────────────────────────────

def _detect_language(text: str) -> str:
    try:
        from langdetect import detect_langs, DetectorFactory
        DetectorFactory.seed = 42
        probs = detect_langs(text)
        for p in probs:
            if p.lang == "fr" and p.prob >= 0.70:
                return "FR"
        if probs and probs[0].lang == "fr":
            return "FR"
    except Exception:
        pass
    return "EN"

# ── Intent cache ──────────────────────────────────────────────────────────────

_redis: Optional[redis_lib.Redis] = None
_INTENT_TTL = 60


def _get_redis() -> Optional[redis_lib.Redis]:
    global _redis
    if _redis is None:
        try:
            _redis = redis_lib.from_url(settings.REDIS_URL, decode_responses=True)
        except Exception:
            pass
    return _redis


def _cache_get(key: str) -> Optional[str]:
    try:
        r = _get_redis()
        return r.get(key) if r else None
    except Exception:
        return None


def _cache_set(key: str, value: str) -> None:
    try:
        r = _get_redis()
        if r:
            r.setex(key, _INTENT_TTL, value)
    except Exception:
        pass

# ── Intent classification ─────────────────────────────────────────────────────

_SYSTEM_PROMPT = (
    "You are an intent classifier for a hospital information system. "
    "Classify the user query into exactly one of: navigation, information, procedure, unknown.\n"
    "- navigation: user wants directions or wayfinding to a location/department\n"
    "- information: user wants general info about a department (hours, contact, services)\n"
    "- procedure: user wants a clinical procedure, protocol, or medical guideline\n"
    "- unknown: cannot determine intent\n"
    "Respond ONLY with JSON: {\"intent\": \"<intent>\"}"
)

_NAV_RE = re.compile(
    r"\b(where|directions?|how (do i|to) get|find|floor|building|room|entrance|ward|go to)\b",
    re.IGNORECASE,
)
_INFO_RE = re.compile(
    r"\b(hours|open|close|contact|phone|services?|what (does|is) .+ (do|offer)|about the)\b",
    re.IGNORECASE,
)
_PROC_RE = re.compile(
    r"\b(procedure|protocol|guideline|how (do|to)|steps?|transfusion|surgery|blood|icu"
    r"|infection|steril|hygiene|wash|care|treatment|dose|dosage|administer|incision)\b",
    re.IGNORECASE,
)


def _rule_based_intent(query: str) -> str:
    if _NAV_RE.search(query):
        return "navigation"
    if _INFO_RE.search(query):
        return "information"
    if _PROC_RE.search(query):
        return "procedure"
    return "unknown"


def _llm_intent(query: str) -> str:
    cache_key = f"aihps:intent:{hash(query.strip().lower()) & 0xFFFFFFFF}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    grok_key = settings.XAI_API_KEY
    gemini_key = settings.GEMINI_API_KEY

    # Try Grok (xAI) first
    if grok_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=grok_key, base_url="https://api.x.ai/v1")
            resp = client.chat.completions.create(
                model="grok-3",
                messages=[
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user", "content": query[:500]},
                ],
                max_tokens=30,
                temperature=0,
            )
            raw = resp.choices[0].message.content
            raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.DOTALL)
            data = json.loads(raw)
            intent = data.get("intent", "unknown")
            if intent not in ("navigation", "information", "procedure", "unknown"):
                intent = "unknown"
            _cache_set(cache_key, intent)
            return intent
        except Exception as exc:
            print(f"[agent_r] Grok intent failed: {exc}")

    # Fallback to Gemini
    if gemini_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_key)
            model = genai.GenerativeModel('gemini-1.5-flash', generation_config={"response_mime_type": "application/json"})
            full_prompt = f"{_SYSTEM_PROMPT}\n\n{query[:500]}"
            resp = model.generate_content(full_prompt, generation_config=genai.types.GenerationConfig(
                max_output_tokens=30,
                temperature=0,
            ))
            data = json.loads(resp.text)
            intent = data.get("intent", "unknown")
            if intent not in ("navigation", "information", "procedure", "unknown"):
                intent = "unknown"
            _cache_set(cache_key, intent)
            return intent
        except Exception as exc:
            print(f"[agent_r] Gemini intent failed: {exc}")

    # Rule-based fallback
    result = _rule_based_intent(query)
    _cache_set(cache_key, result)
    return result


# ── Agent node ────────────────────────────────────────────────────────────────

def agent_r(state: AIHPSState) -> dict:
    query = state.get("raw_query", "")

    # Step 1: emergency check — always first, no LLM
    if _EMERGENCY_EN.search(query) or _EMERGENCY_FR.search(query):
        language = _detect_language(query)
        return {"is_emergency": True, "language": language, "intent": "emergency"}

    # Step 2: language detection
    language = _detect_language(query)

    # Step 3: intent classification (LLM or rule-based fallback)
    intent = _llm_intent(query)

    return {"is_emergency": False, "language": language, "intent": intent}
