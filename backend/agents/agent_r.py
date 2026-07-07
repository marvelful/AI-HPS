"""
AGENT-R — Router & Intent Classifier.

Order of operations:
  1. Emergency keyword scan (no LLM, always first)
  2. Language detection
  3. LLM intent + domain classification (Groq → rule-based fallback)

Intents:    procedure | administrative | dept_info | emergency | unknown
Domains:    who_guideline | clinical_procedure | administrative |
            emergency | department_info | public_faq
"""
import json
import re
from typing import Optional

import redis as redis_lib

from agents.state import AIHPSState
from shared.config import get_settings

settings = get_settings()

# ── Emergency patterns ────────────────────────────────────────────────────────

_EMRG_EN = re.compile(
    r"\b(emergency|help\s*me|dying|die\b|cardiac\s*arrest|heart\s*attack|stroke"
    r"|choking|choke|seizure|convuls|overdose|bleed(ing)?|unconscious"
    r"|not\s*breathing|no\s*pulse|can.?t\s*breathe|collapse[d]?"
    r"|critical(ly)?|ambulance|trauma|accident|resuscitat"
    r"|baby\s*coming|labor|labour|miscarriage|premature\s*birth)\b",
    re.IGNORECASE,
)
_EMRG_FR = re.compile(
    r"\b(urgence|urgences|secours|aidez[\s\-]moi|mourir|mourant"
    r"|arr[eê]t\s*cardiaque|crise\s*cardiaque|avc|s[eé]touffe"
    r"|convulsions|surdose|saignement|inconscient"
    r"|ne\s*(peut\s*pas\s*)?respire|pas\s*de\s*pouls"
    r"|effondr[eé]|critique|ambulance|traumatisme"
    r"|b[eé]b[eé]\s*arrive|travail|fausse\s*couche|pr[eé]matur[eé]|r[eé]animation)\b",
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
    except Exception:
        pass
    return "EN"

# ── LLM classification ────────────────────────────────────────────────────────

_SYSTEM = (
    "You are an intent classifier for a hospital knowledge system. "
    "Classify into exactly one intent AND one knowledge_domain.\n"
    "Intents: procedure (wants a clinical/medical protocol or guideline), "
    "administrative (billing, registration, appointments, policies), "
    "dept_info (department hours, contact, location, services), "
    "unknown.\n"
    "Domains: who_guideline, clinical_procedure, administrative, "
    "department_info, public_faq.\n"
    "JSON only: {\"intent\": \"...\", \"knowledge_domain\": \"...\"}"
)

_VALID_INTENTS = {"procedure", "administrative", "dept_info", "unknown"}
_VALID_DOMAINS = {"who_guideline", "clinical_procedure", "administrative", "department_info", "public_faq"}

# Rule-based fallback patterns
_PROC_RE = re.compile(
    r"\b(procedure|protocol|guideline|sop|how (do|to)|steps?|transfusion|surgery|blood|icu"
    r"|infection|hygiene|wash|care|treatment|dose|administer|incision|checklist|steril)\b",
    re.IGNORECASE,
)
_ADMIN_RE = re.compile(
    r"\b(register|registration|bill|billing|pay|payment|insurance|appointment|book|visit)\b",
    re.IGNORECASE,
)
_DEPT_RE = re.compile(
    r"\b(where|contact|phone|email|services?|hours|open|close|about the|department|ward|floor|building)\b",
    re.IGNORECASE,
)


def _rule_classify(query: str) -> tuple[str, str]:
    if _PROC_RE.search(query):
        return "procedure", "who_guideline"
    if _ADMIN_RE.search(query):
        return "administrative", "administrative"
    if _DEPT_RE.search(query):
        return "dept_info", "department_info"
    return "unknown", "public_faq"


_redis: Optional[redis_lib.Redis] = None


def _redis_get(key: str) -> Optional[str]:
    global _redis
    try:
        if _redis is None:
            _redis = redis_lib.from_url(settings.REDIS_URL, decode_responses=True)
        return _redis.get(key)
    except Exception:
        return None


def _redis_set(key: str, value: str) -> None:
    try:
        if _redis:
            _redis.setex(key, 60, value)
    except Exception:
        pass


def _llm_classify(query: str) -> tuple[str, str]:
    cache_key = f"aihps:cls:{hash(query.strip().lower()) & 0xFFFFFFFF}"
    cached = _redis_get(cache_key)
    if cached:
        d = json.loads(cached)
        return d["intent"], d["knowledge_domain"]

    try:
        from agents.shared.groq_client import call_groq
        raw = call_groq(
            messages=[{"role": "user", "content": query[:500]}],
            system=_SYSTEM,
            max_tokens=40,
            temperature=0,
        )
        raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.DOTALL)
        d = json.loads(raw)
        intent = d.get("intent", "unknown")
        domain = d.get("knowledge_domain", "public_faq")
        if intent not in _VALID_INTENTS:
            intent = "unknown"
        if domain not in _VALID_DOMAINS:
            domain = "public_faq"
        _redis_set(cache_key, json.dumps({"intent": intent, "knowledge_domain": domain}))
        return intent, domain
    except Exception as exc:
        print(f"[agent_r] LLM classify failed: {exc}")

    return _rule_classify(query)


# ── Agent node ────────────────────────────────────────────────────────────────

def agent_r(state: AIHPSState) -> dict:
    query = state.get("raw_query", "")

    # Emergency — always checked first, no LLM
    if _EMRG_EN.search(query) or _EMRG_FR.search(query):
        return {
            "is_emergency": True,
            "language": _detect_language(query),
            "intent": "emergency",
            "knowledge_domain": "emergency",
        }

    language = _detect_language(query)
    intent, knowledge_domain = _llm_classify(query)

    return {
        "is_emergency": False,
        "language": language,
        "intent": intent,
        "knowledge_domain": knowledge_domain,
    }
