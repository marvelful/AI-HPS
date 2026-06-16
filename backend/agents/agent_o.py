"""
AGENT-O — Output Optimisation Agent.
Terminal node. Stateless, no LLM, no DB.
Adapts upstream content to 5 platform formats.
Emergency state always bypasses all constraints.
"""
import textwrap
from typing import Any

from agents.state import AIHPSState

_SMS_LIMIT = 155
_USSD_LIMIT = 178  # chars per screen (reserve ~4 for nav indicator)

_DISCLAIMER = {
    "EN": "⚕ AI summary. Verify with staff.",
    "FR": "⚕ Résumé IA. Vérifier avec le personnel.",
}


# ── Platform formatters ───────────────────────────────────────────────────────

def _whatsapp(content: dict, language: str) -> str:
    parts: list[str] = []
    if d := content.get("disclaimer"):
        parts.append(f"_{d}_\n")
    if s := content.get("summary"):
        parts.append(s)
    steps = content.get("steps") or content.get("key_steps") or []
    if steps:
        parts.append("\n*Steps:*")
        for i, step in enumerate(steps, 1):
            instr = step.get("instruction", step) if isinstance(step, dict) else step
            parts.append(f"{i}. {instr}")
    if notes := content.get("compliance_notes"):
        parts.append("\n*Compliance:*")
        for note in notes:
            parts.append(f"• {note}")
    if e := content.get("escalation"):
        parts.append(f"\n*Escalation:* {e}")
    if cites := content.get("citations"):
        parts.append("\n*Sources:* " + ", ".join(cites))
    return "\n".join(parts)


def _sms(content: dict, language: str) -> str:
    disclaimer = _DISCLAIMER.get(language, _DISCLAIMER["EN"])
    steps = content.get("steps") or content.get("key_steps") or []
    if steps:
        first = steps[0]
        body = first.get("instruction", first) if isinstance(first, dict) else first
        body = f"1. {body}"
    else:
        body = content.get("summary", "")

    full = f"{disclaimer} {body}"
    if len(full) <= _SMS_LIMIT:
        return full
    avail = _SMS_LIMIT - len(disclaimer) - 2
    truncated = body[:avail].rsplit(" ", 1)[0] + "…"
    return f"{disclaimer} {truncated}"


def _ussd(content: dict, language: str) -> list[dict]:
    """Paginate content into USSD screens (CON / END)."""
    lines: list[str] = []
    if s := content.get("summary"):
        lines.extend(textwrap.wrap(s, width=55))
    steps = content.get("steps") or content.get("key_steps") or []
    for i, step in enumerate(steps, 1):
        instr = step.get("instruction", step) if isinstance(step, dict) else step
        lines.extend(textwrap.wrap(f"{i}. {instr}", width=55))
    if not lines:
        lines = [content.get("message", "No information available.")]

    # Chunk lines into screens
    screens: list[list[str]] = []
    current: list[str] = []
    current_len = 0
    for line in lines:
        needed = len(line) + 1
        if current_len + needed > _USSD_LIMIT - 8:  # reserve for nav
            if current:
                screens.append(current)
            current = [line]
            current_len = needed
        else:
            current.append(line)
            current_len += needed
    if current:
        screens.append(current)
    if not screens:
        screens = [[lines[0] if lines else "No information."]]

    total = len(screens)
    result = []
    for i, chunk in enumerate(screens):
        is_last = i == total - 1
        screen_text = "\n".join(chunk)
        if not is_last:
            nav = f"\n({i+1}/{total})\n99. Next  0. Home"
            screen_type = "CON"
        else:
            nav = "\n0. Home"
            screen_type = "END"
        result.append({
            "text": screen_text + nav,
            "type": screen_type,
            "screen": i + 1,
            "total": total,
        })
    return result


def _json_output(content: dict) -> dict:
    """Typed JSON for mobile app / web portal."""
    return {
        "disclaimer": content.get("disclaimer"),
        "summary": content.get("summary"),
        "steps": content.get("steps") or [],
        "key_steps": content.get("key_steps") or [],
        "compliance_notes": content.get("compliance_notes") or [],
        "risk_level": content.get("risk_level"),
        "escalation": content.get("escalation"),
        "citations": content.get("citations") or [],
        "when_to_seek_help": content.get("when_to_seek_help"),
    }


# ── Agent node ────────────────────────────────────────────────────────────────

def agent_o(state: AIHPSState) -> dict:
    platform = state.get("platform", "web")
    language = state.get("language", "EN")
    is_emergency = state.get("is_emergency", False)

    # Emergency: pass content through without any modification
    if is_emergency:
        ec = state.get("emergency_content") or {}
        text = ec.get("content", _DISCLAIMER["EN"])
        if ec.get("contacts"):
            contact_str = " | ".join(str(c) for c in ec["contacts"][:2])
            text = f"{text}\n📞 {contact_str}"
        if ec.get("directions"):
            text = f"{text}\n📍 {ec['directions']}"
        return {"formatted_output": text, "output_type": "text"}

    # If AGENT-C already set formatted_output (clarification prompt), preserve it
    if state.get("formatted_output") is not None:
        return {}

    # Determine content from upstream agent results
    content: dict = {}

    if nr := state.get("navigation_result"):
        if not nr.get("found"):
            content = {"summary": nr.get("message", "")}
        else:
            content = {
                "summary": (
                    f"Directions to {nr.get('department', 'department')} "
                    f"({nr.get('estimated_time_minutes', '?')} min)"
                ),
                "steps": [
                    {"instruction": s.get("instruction", s.get("description", str(s)))}
                    for s in (nr.get("steps") or [])
                ],
            }

    elif di := state.get("dept_info"):
        if not di.get("found", True):
            content = {"summary": di.get("message", "")}
        else:
            hours = di.get("operating_hours") or {}
            contacts = di.get("contact_details") or {}
            content = {
                "summary": (
                    f"{di.get('name', 'Department')}\n"
                    f"Location: {di.get('location') or 'N/A'}\n"
                    f"Hours: {hours}\n"
                    f"Contact: {contacts}"
                ),
            }

    elif pr := state.get("procedure_result"):
        if not pr.get("found"):
            content = {"summary": pr.get("message", "")}
        else:
            content = dict(pr.get("data") or {})
            content["risk_level"] = pr.get("risk_level")

    else:
        fallback = {
            "EN": "I couldn't understand your request. Please try rephrasing.",
            "FR": "Je n'ai pas compris votre demande. Veuillez reformuler.",
        }
        content = {"summary": fallback.get(language, fallback["EN"])}

    # Format for target platform
    if platform == "sms":
        return {"formatted_output": _sms(content, language), "output_type": "sms"}
    if platform == "ussd":
        return {"formatted_output": _ussd(content, language), "output_type": "ussd_screens"}
    if platform in ("mobile", "web"):
        return {"formatted_output": _json_output(content), "output_type": "json"}
    # WhatsApp and default
    return {"formatted_output": _whatsapp(content, language), "output_type": "text"}
