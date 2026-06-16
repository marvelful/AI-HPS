"""
LangGraph StateGraph — AI-HPS agent pipeline.

Graph topology:
  AGENT-R → [conditional] → AGENT-E → AGENT-O → END
                          → AGENT-N → AGENT-O → END
                          → AGENT-C → [conditional] → AGENT-O → END
                                                    → AGENT-P → AGENT-O → END
                          → AGENT-P → AGENT-O → END
                          → AGENT-O → END  (unknown intent)
"""
from langgraph.graph import StateGraph, END

from agents.state import AIHPSState
from agents.agent_e import agent_e
from agents.agent_n import agent_n
from agents.agent_r import agent_r
from agents.agent_c import agent_c
from agents.agent_p import agent_p
from agents.agent_o import agent_o


def _route_after_r(state: AIHPSState) -> str:
    if state.get("is_emergency"):
        return "agent_e"
    intent = state.get("intent", "unknown")
    if intent == "navigation":
        return "agent_n"
    if intent == "information":
        return "agent_c"
    if intent == "procedure":
        return "agent_c" if state.get("chatbot_mode") else "agent_p"
    return "agent_o"  # unknown → clarification


def _route_after_c(state: AIHPSState) -> str:
    # If AGENT-C already produced output (dept info or clarification) → output
    if state.get("formatted_output") is not None or state.get("dept_info") is not None:
        return "agent_o"
    # Chatbot path: reformulated query set → procedure retrieval
    return "agent_p"


def build_graph() -> StateGraph:
    builder = StateGraph(AIHPSState)

    builder.add_node("agent_r", agent_r)
    builder.add_node("agent_e", agent_e)
    builder.add_node("agent_n", agent_n)
    builder.add_node("agent_c", agent_c)
    builder.add_node("agent_p", agent_p)
    builder.add_node("agent_o", agent_o)

    builder.set_entry_point("agent_r")

    builder.add_conditional_edges(
        "agent_r",
        _route_after_r,
        {
            "agent_e": "agent_e",
            "agent_n": "agent_n",
            "agent_c": "agent_c",
            "agent_p": "agent_p",
            "agent_o": "agent_o",
        },
    )

    builder.add_edge("agent_e", "agent_o")
    builder.add_edge("agent_n", "agent_o")
    builder.add_edge("agent_p", "agent_o")

    builder.add_conditional_edges(
        "agent_c",
        _route_after_c,
        {
            "agent_o": "agent_o",
            "agent_p": "agent_p",
        },
    )

    builder.add_edge("agent_o", END)

    return builder


_pipeline = None


def get_pipeline():
    global _pipeline
    if _pipeline is None:
        _pipeline = build_graph().compile()
    return _pipeline
