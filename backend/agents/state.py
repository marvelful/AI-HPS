"""AIHPSState — shared LangGraph state for the procedure chatbot pipeline."""
from typing import Any, Optional, TypedDict


class AIHPSState(TypedDict):
    # ── Incoming (set once by caller) ────────────────────────────────────────
    raw_query: str
    platform: str           # web | mobile | whatsapp | sms | ussd
    stream: str             # A (patient-facing) | B (staff-facing)
    user_id: Optional[str]
    user_role: Optional[str]
    session_id: Optional[str]
    chatbot_mode: bool

    # ── AGENT-R outputs ───────────────────────────────────────────────────────
    is_emergency: bool
    language: str           # EN | FR
    intent: Optional[str]   # procedure | administrative | dept_info | emergency | unknown
    knowledge_domain: Optional[str]  # who_guideline | clinical_procedure | administrative | emergency | department_info | public_faq

    # ── AGENT-C outputs (chatbot query reformulation) ─────────────────────────
    reformulated_query: Optional[str]
    chat_history: Optional[list]

    # ── AGENT-P outputs ───────────────────────────────────────────────────────
    retrieved_chunks: Optional[list]
    procedure_result: Optional[dict]
    had_result: bool

    # ── AGENT-O outputs (final) ───────────────────────────────────────────────
    formatted_output: Optional[Any]
    output_type: Optional[str]  # text | json | sms | ussd_screens

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
        knowledge_domain=None,
        reformulated_query=None,
        chat_history=None,
        retrieved_chunks=None,
        procedure_result=None,
        had_result=False,
        formatted_output=None,
        output_type=None,
        error=None,
    )
