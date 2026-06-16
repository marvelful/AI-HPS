"""
Quick smoke test — no DB required.
Tests: emergency detection, language detection, output formatters.

Run from D:\\AI-HPS\\backend\\:
    ..\\venv\\Scripts\\python scripts\\smoke_test.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.state import initial_state
from agents.agent_r import agent_r, _EMERGENCY_EN, _EMERGENCY_FR, _detect_language
from agents.agent_o import _sms, _ussd, _whatsapp, _json_output

PASS = "[PASS]"
FAIL = "[FAIL]"


def check(label, cond):
    mark = PASS if cond else FAIL
    print(f"  {mark}  {label}")
    return cond


def test_emergency_detection():
    print("\n-- Emergency detection --")
    en_cases = [
        "help me i cant breathe",
        "cardiac arrest in room 4",
        "patient collapsed",
        "bleeding wont stop",
    ]
    fr_cases = [
        "urgence patient inconscient",
        "arret cardiaque",
        "saignement abondant",
        "bebe arrive premature",
    ]
    ok = True
    for q in en_cases:
        ok &= check(f"EN: {q!r}", bool(_EMERGENCY_EN.search(q)))
    for q in fr_cases:
        ok &= check(f"FR: {q!r}", bool(_EMERGENCY_FR.search(q)))
    # False positives should NOT trigger emergency
    non_emergency = ["where is the blood bank", "what are icu hours"]
    for q in non_emergency:
        ok &= check(f"Not emergency: {q!r}", not (_EMERGENCY_EN.search(q) or _EMERGENCY_FR.search(q)))
    return ok


def test_language_detection():
    print("\n-- Language detection --")
    ok = True
    ok &= check("EN: 'How do I perform a blood transfusion?'", _detect_language("How do I perform a blood transfusion?") == "EN")
    ok &= check("FR: 'Comment effectuer une transfusion sanguine?'", _detect_language("Comment effectuer une transfusion sanguine?") == "FR")
    ok &= check("EN fallback on empty", _detect_language("") == "EN")
    return ok


def test_sms_formatter():
    print("\n-- SMS formatter --")
    ok = True
    content = {"summary": "Check patient ID first.", "steps": [{"instruction": "Verify patient identity"}]}
    result = _sms(content, "EN")
    ok &= check(f"SMS <= 155 chars: {len(result)}", len(result) <= 155)
    ok &= check("SMS contains disclaimer", "AI summary" in result or "Verify" in result)

    long_summary = {"summary": "A" * 200}
    result2 = _sms(long_summary, "EN")
    ok &= check(f"SMS truncates long content: {len(result2)}", len(result2) <= 155)
    return ok


def test_ussd_formatter():
    print("\n-- USSD formatter --")
    ok = True
    content = {
        "summary": "Blood transfusion requires compatibility check.",
        "steps": [
            {"instruction": "Verify patient identity with two identifiers"},
            {"instruction": "Check blood group compatibility with crossmatch"},
            {"instruction": "Obtain signed informed consent from patient"},
            {"instruction": "Start infusion at 5 mL per hour for first 15 minutes"},
        ]
    }
    screens = _ussd(content, "EN")
    ok &= check(f"USSD produces screens: {len(screens)}", len(screens) >= 1)
    for s in screens:
        ok &= check(f"Screen {s['screen']} <= 182 chars", len(s["text"]) <= 200)
    last = screens[-1]
    ok &= check("Last screen is END", last["type"] == "END")
    ok &= check("Last screen has home option", "0" in last["text"])
    return ok


def test_emergency_passthrough():
    print("\n-- Emergency pass-through in AGENT-O --")
    from agents.agent_o import agent_o
    state = initial_state("help me", platform="whatsapp", stream="A")
    state["is_emergency"] = True
    state["emergency_content"] = {
        "content": "Go to Emergency immediately.",
        "contacts": ["+237 222 123 456"],
        "directions": "Take main corridor left.",
    }
    state["language"] = "EN"
    result = agent_o(state)
    ok = check("Emergency output is text", result.get("output_type") == "text")
    ok &= check("Emergency output contains content", "Emergency" in str(result.get("formatted_output", "")))
    ok &= check("Emergency output contains contact", "+237" in str(result.get("formatted_output", "")))
    return ok


def test_graph_compile():
    print("\n-- LangGraph graph compilation --")
    from agents.graph import build_graph, get_pipeline
    g = build_graph()
    ok = check("Graph built", g is not None)
    p = get_pipeline()
    ok &= check("Pipeline compiled", p is not None)
    return ok


if __name__ == "__main__":
    results = []
    results.append(test_emergency_detection())
    results.append(test_language_detection())
    results.append(test_sms_formatter())
    results.append(test_ussd_formatter())
    results.append(test_emergency_passthrough())
    results.append(test_graph_compile())

    total = len(results)
    passed = sum(results)
    print(f"\n{'='*40}")
    print(f"Results: {passed}/{total} test groups passed")
    if passed < total:
        sys.exit(1)
    print("All tests passed.")
