"""
AGENT-O — Output formatter (terminal node, stateless, no LLM).
Adapts upstream content to platform formats: web/mobile (JSON), WhatsApp, SMS, USSD.
"""
import textwrap
from agents.state import AIHPSState

_SMS_LIMIT = 155
_USSD_LIMIT = 178

_EMERGENCY = {
    "EN": (
        "EMERGENCY. Go immediately to the Emergency Department "
        "or call the hospital emergency line. "
        "If life-threatening, call 15 or 17 immediately."
    ),
    "FR": (
        "URGENCE. Rendez-vous immédiatement aux Urgences "
        "ou appelez la ligne d'urgence de l'hôpital. "
        "En cas de danger vital, appelez le 15 ou le 17 immédiatement."
    ),
}

_FALLBACK = {
    "EN": "I couldn't find an answer to your question. Please rephrase or contact a department directly.",
    "FR": "Je n'ai pas pu trouver de réponse. Veuillez reformuler ou contacter directement un département.",
}

_DISCLAIMER = {
    "EN": "AI summary — verify with medical staff.",
    "FR": "Résumé IA — vérifier avec le personnel médical.",
}


# ── Platform formatters ───────────────────────────────────────────────────────

def _to_whatsapp(data: dict, language: str) -> str:
    parts = []
    if d := data.get("disclaimer"):
        parts.append(f"_{d}_\n")
    if a := data.get("answer"):
        parts.append(a)
    steps = data.get("steps") or data.get("key_steps") or []
    if steps:
        parts.append("\n*Steps:*")
        for i, s in enumerate(steps, 1):
            instr = s.get("instruction", s) if isinstance(s, dict) else s
            parts.append(f"{i}. {instr}")
    if notes := data.get("compliance_notes"):
        parts.append("\n*Compliance:*")
        for n in notes:
            parts.append(f"• {n}")
    if w := data.get("when_to_seek_help"):
        parts.append(f"\n*When to seek help:* {w}")
    if src := data.get("source"):
        parts.append(f"\n*Source:* {src}")
    return "\n".join(parts)


def _to_sms(data: dict, language: str) -> str:
    disc = _DISCLAIMER.get(language, _DISCLAIMER["EN"])
    answer = data.get("answer", "") or ""
    full = f"{disc} {answer}"
    if len(full) <= _SMS_LIMIT:
        return full
    avail = _SMS_LIMIT - len(disc) - 2
    return f"{disc} {answer[:avail].rsplit(' ', 1)[0]}…"


def _to_ussd(data: dict, language: str) -> list[dict]:
    lines: list[str] = []
    if a := data.get("answer"):
        lines.extend(textwrap.wrap(a, width=55))
    steps = data.get("steps") or data.get("key_steps") or []
    for i, s in enumerate(steps, 1):
        instr = s.get("instruction", s) if isinstance(s, dict) else s
        lines.extend(textwrap.wrap(f"{i}. {instr}", width=55))
    if not lines:
        lines = [data.get("message", "No information available.")]

    screens: list[list[str]] = []
    cur: list[str] = []
    cur_len = 0
    for line in lines:
        needed = len(line) + 1
        if cur_len + needed > _USSD_LIMIT - 8:
            if cur:
                screens.append(cur)
            cur = [line]
            cur_len = needed
        else:
            cur.append(line)
            cur_len += needed
    if cur:
        screens.append(cur)
    if not screens:
        screens = [lines[:1] or ["No information."]]

    total = len(screens)
    result = []
    for i, screen in enumerate(screens):
        is_last = i == total - 1
        nav = f"\n({i+1}/{total})\n99. Next  0. Home" if not is_last else "\n0. Home"
        result.append({
            "text": "\n".join(screen) + nav,
            "type": "END" if is_last else "CON",
            "screen": i + 1,
            "total": total,
        })
    return result


def _to_json(data: dict) -> dict:
    return {
        "response_type":    data.get("response_type"),
        "disclaimer":       data.get("disclaimer"),
        "answer":           data.get("answer"),
        "key_steps":        data.get("key_steps") or [],
        "steps":            data.get("steps") or [],
        "compliance_notes": data.get("compliance_notes") or [],
        "risk_level":       data.get("risk_level"),
        "when_to_seek_help": data.get("when_to_seek_help"),
        "source":           data.get("source"),
        "map_url":          data.get("map_url"),
        "origin":           data.get("origin"),
        "destination":      data.get("destination"),
    }


# ── Agent node ────────────────────────────────────────────────────────────────

def agent_o(state: AIHPSState) -> dict:
    platform = state.get("platform", "web")
    language = state.get("language", "EN")

    # Emergency override — always highest priority
    if state.get("is_emergency"):
        msg = _EMERGENCY.get(language, _EMERGENCY["EN"])
        return {"formatted_output": msg, "output_type": "text", "had_result": True}

    # Already formatted (e.g. agent_c clarification)
    if state.get("formatted_output") is not None:
        return {}

    # Build content from procedure_result
    pr = state.get("procedure_result")
    if not pr:
        msg = _FALLBACK.get(language, _FALLBACK["EN"])
        if platform in ("web", "mobile"):
            return {"formatted_output": {"found": False, "message": msg}, "output_type": "json", "had_result": False}
        return {"formatted_output": msg, "output_type": "text", "had_result": False}

    if not pr.get("found"):
        msg = pr.get("message", _FALLBACK.get(language, _FALLBACK["EN"]))
        if platform in ("web", "mobile"):
            return {"formatted_output": {"found": False, "message": msg}, "output_type": "json", "had_result": False}
        return {"formatted_output": msg, "output_type": "text", "had_result": False}

    data = pr.get("data") or {}
    had = state.get("had_result", True)

    if platform in ("web", "mobile"):
        return {
            "formatted_output": {"found": True, "data": _to_json(data)},
            "output_type": "json",
            "had_result": had,
        }
    if platform == "sms":
        return {"formatted_output": _to_sms(data, language), "output_type": "sms", "had_result": had}
    if platform == "ussd":
        return {"formatted_output": _to_ussd(data, language), "output_type": "ussd_screens", "had_result": had}
    # whatsapp / default
    return {"formatted_output": _to_whatsapp(data, language), "output_type": "text", "had_result": had}
