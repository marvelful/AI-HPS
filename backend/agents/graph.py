"""
LangGraph StateGraph — AI-HPS procedure chatbot.

Topology:
  AGENT-R → [emergency]            → AGENT-O → END
           → [procedure/admin]     → AGENT-C (chatbot_mode) → AGENT-P → AGENT-O → END
           → [procedure/admin]     → AGENT-P (direct)        → AGENT-O → END
           → [dept_info]           → AGENT-C → AGENT-O → END
           → [unknown]             → AGENT-O → END
"""
from langgraph.graph import StateGraph, END

from agents.state import AIHPSState
from agents.agent_r import agent_r
from agents.agent_c import agent_c
from agents.agent_p import agent_p
from agents.agent_o import agent_o


def _route_after_r(state: AIHPSState) -> str:
    if state.get("is_emergency"):
        return "agent_o"
    intent = state.get("intent", "unknown")
    if intent in {"procedure", "administrative"}:
        return "agent_c" if state.get("chatbot_mode") else "agent_p"
    if intent == "dept_info":
        return "agent_c"  # agent_c handles dept lookup directly
    return "agent_o"


def _route_after_c(state: AIHPSState) -> str:
    # If agent_c produced a final result (dept info, clarification)
    if state.get("formatted_output") is not None or (
        state.get("procedure_result") is not None and state.get("had_result") is not None
    ):
        if state.get("intent") == "dept_info":
            return "agent_o"
        if state.get("formatted_output") is not None:
            return "agent_o"
    return "agent_p"


def build_graph() -> StateGraph:
    builder = StateGraph(AIHPSState)

    builder.add_node("agent_r", agent_r)
    builder.add_node("agent_c", agent_c)
    builder.add_node("agent_p", agent_p)
    builder.add_node("agent_o", agent_o)

    builder.set_entry_point("agent_r")

    builder.add_conditional_edges(
        "agent_r",
        _route_after_r,
        {"agent_c": "agent_c", "agent_p": "agent_p", "agent_o": "agent_o"},
    )
    builder.add_conditional_edges(
        "agent_c",
        _route_after_c,
        {"agent_p": "agent_p", "agent_o": "agent_o"},
    )
    builder.add_edge("agent_p", "agent_o")
    builder.add_edge("agent_o", END)

    return builder


_pipeline = None


def get_pipeline():
    global _pipeline
    if _pipeline is None:
        _pipeline = build_graph().compile()
    return _pipeline
