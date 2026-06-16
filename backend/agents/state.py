"""AIHPSState — shared LangGraph state contract for all 6 agents."""
from typing import Any, Optional, TypedDict


class AIHPSState(TypedDict):
    # ── Incoming (set once by the caller) ────────────────────────────────────
    raw_query: str
    platform: str          # whatsapp | sms | ussd | mobile | web
    stream: str            # A | B
    user_id: Optional[str]
    user_role: Optional[str]
    session_id: Optional[str]
    chatbot_mode: bool

    # ── AGENT-R outputs ───────────────────────────────────────────────────────
    is_emergency: bool
    language: str          # EN | FR
    intent: Optional[str]  # navigation | information | procedure | unknown

    # ── AGENT-C outputs ───────────────────────────────────────────────────────
    reformulated_query: Optional[str]
    dept_info: Optional[dict]
    chat_history: Optional[list]

    # ── AGENT-E outputs ───────────────────────────────────────────────────────
    emergency_content: Optional[dict]

    # ── AGENT-N outputs ───────────────────────────────────────────────────────
    navigation_result: Optional[dict]

    # ── AGENT-P outputs ───────────────────────────────────────────────────────
    procedure_result: Optional[dict]
    had_result: bool

    # ── AGENT-O outputs (final) ───────────────────────────────────────────────
    formatted_output: Optional[Any]
    output_type: Optional[str]  # text | json | ussd_screens | sms

    # ── Cross-cutting ─────────────────────────────────────────────────────────
    error: Optional[str]


def initial_state(
    raw_query: str,
    platform: str = "web",
    stream: str = "A",
    user_id: Optional[str] = None,
    user_role: Optional[str] = None,
    session_id: Optional[str] = None,
    chatbot_mode: bool = False,
) -> AIHPSState:
    return AIHPSState(
        raw_query=raw_query,
        platform=platform,
        stream=stream,
        user_id=user_id,
        user_role=user_role,
        session_id=session_id,
        chatbot_mode=chatbot_mode,
        is_emergency=False,
        language="EN",
        intent=None,
        reformulated_query=None,
        dept_info=None,
        chat_history=None,
        emergency_content=None,
        navigation_result=None,
        procedure_result=None,
        had_result=False,
        formatted_output=None,
        output_type=None,
        error=None,
    )
