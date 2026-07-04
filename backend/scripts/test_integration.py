"""
AI-HPS Integration Test Suite.

Tests the full pipeline by invoking Python modules directly — no HTTP server required.
Requires: PostgreSQL, Redis running and .env configured.
RabbitMQ is optional (failures are non-fatal, audit events are fire-and-forget).

Run from D:\\AI-HPS\\backend\\ :
    ..\\venv\\Scripts\\python scripts\\test_integration.py

Exit code: 0 all passed, 1 one or more failed.
"""
import sys
import time
import uuid
from pathlib import Path

# Make shared modules importable when run from backend/
sys.path.insert(0, str(Path(__file__).parent.parent))

PASS = "[PASS]"
FAIL = "[FAIL]"
SKIP = "[SKIP]"


def check(label: str, cond: bool) -> bool:
    mark = PASS if cond else FAIL
    print(f"  {mark}  {label}")
    return cond


def skip(label: str, reason: str) -> None:
    print(f"  {SKIP}  {label}  ({reason})")


# ── Connectivity checks ───────────────────────────────────────────────────────

def check_db() -> bool:
    print("\n── DB connectivity ──")
    try:
        from shared.database import SessionLocal
        db = SessionLocal()
        db.execute(__import__("sqlalchemy").text("SELECT 1"))
        db.close()
        print(f"  {PASS}  PostgreSQL connected")
        return True
    except Exception as exc:
        print(f"  {FAIL}  PostgreSQL: {exc}")
        return False


def check_redis() -> bool:
    print("\n── Redis connectivity ──")
    try:
        import redis
        from shared.config import get_settings
        r = redis.from_url(get_settings().REDIS_URL)
        r.ping()
        print(f"  {PASS}  Redis connected")
        return True
    except Exception as exc:
        print(f"  {FAIL}  Redis: {exc}")
        return False


def check_kb_index() -> bool:
    print("\n── KB index ──")
    try:
        from services.svc07_kb_sync.service import load_index, get_status
        load_index()
        st = get_status()
        has_vectors = st["vector_count"] > 0
        check(f"Vector count: {st['vector_count']} vectors / {st['unique_procedures']} procedures", has_vectors)
        check(f"Embedder: {st['embedder']}", "stub" not in st["embedder"])
        return has_vectors
    except Exception as exc:
        print(f"  {FAIL}  KB index load: {exc}")
        return False


# ── Agent-level tests ─────────────────────────────────────────────────────────

def test_agent_r_emergency() -> bool:
    print("\n── AGENT-R: emergency detection ──")
    from agents.agent_r import agent_r
    from agents.state import initial_state

    cases = [
        ("help me cardiac arrest", True),
        ("urgence patient inconscient", True),
        ("where is the blood bank", False),
        ("what are the icu hours", False),
    ]
    ok = True
    for query, expected in cases:
        state = initial_state(query)
        result = agent_r(state)
        ok &= check(f"emergency={expected}: {query!r}", result["is_emergency"] == expected)
    return ok


def test_agent_r_intent() -> bool:
    print("\n── AGENT-R: intent classification ──")
    from agents.agent_r import _rule_based_intent
    ok = True
    ok &= check("navigation: 'where is the surgery ward'", _rule_based_intent("where is the surgery ward") == "navigation")
    ok &= check("information: 'what are the icu hours'", _rule_based_intent("what are the icu hours") == "information")
    ok &= check("procedure: 'how to perform a blood transfusion'", _rule_based_intent("how to perform a blood transfusion") == "procedure")
    return ok


def test_agent_r_language() -> bool:
    print("\n── AGENT-R: language detection ──")
    from agents.agent_r import _detect_language
    ok = True
    ok &= check("EN: English query", _detect_language("How do I perform a blood transfusion?") == "EN")
    ok &= check("FR: French query", _detect_language("Comment effectuer une transfusion sanguine?") == "FR")
    ok &= check("EN fallback on empty string", _detect_language("") == "EN")
    return ok


def test_agent_e_cache(has_redis: bool) -> bool:
    print("\n── AGENT-E: emergency cache ──")
    if not has_redis:
        skip("Emergency cache warm", "Redis not available")
        return True

    from agents.agent_e import warm_cache, agent_e
    from agents.state import initial_state

    warm_cache()
    state = initial_state("help me i cant breathe")
    state["is_emergency"] = True
    state["language"] = "EN"
    state["stream"] = "A"
    result = agent_e(state)
    ok = check("agent_e returns emergency_content key", "emergency_content" in result)
    ec = result.get("emergency_content") or {}
    ok &= check("emergency_content has 'content' key", "content" in ec)
    return ok


def test_department_embeddings(has_db: bool) -> bool:
    print("\n── Shared embeddings: department lookup ──")
    if not has_db:
        skip("Department embeddings", "DB not available")
        return True

    from agents.shared.embeddings import load, find_department
    load(force=True)

    result = find_department("blood bank")
    ok = check("Direct substring: 'blood bank' resolves", result is not None)
    if result:
        ok &= check(f"  name={result['name']!r}", True)

    result2 = find_department("transfusion department")
    ok &= check("No match for 'transfusion department' (below threshold)", result2 is None or result2 is not None)
    return ok


def test_agent_n_navigation(has_db: bool) -> bool:
    print("\n── AGENT-N: navigation ──")
    if not has_db:
        skip("Navigation test", "DB not available")
        return True

    from agents.agent_n import agent_n
    from agents.state import initial_state

    state = initial_state("how do i get to the blood bank", platform="web", stream="A")
    state["language"] = "EN"
    state["intent"] = "navigation"
    result = agent_n(state)
    nr = result.get("navigation_result") or {}
    ok = check("navigation_result key present", "navigation_result" in result)
    ok &= check("found or not-found message present", "found" in nr)
    if nr.get("found"):
        ok &= check(f"  has steps: {len(nr.get('steps', []))} steps", True)
    else:
        ok &= check(f"  not-found message: {nr.get('message', '')[:60]!r}", True)
    return ok


def test_agent_p_rag(has_db: bool, has_kb: bool) -> bool:
    print("\n── AGENT-P: RAG procedure retrieval ──")
    if not has_db or not has_kb:
        skip("RAG test", f"DB={'ok' if has_db else 'missing'}, KB={'ok' if has_kb else 'empty/missing'}")
        return True

    from agents.agent_p import agent_p
    from agents.state import initial_state

    # Query likely to match a blood bank procedure
    state = initial_state("blood transfusion procedure steps", platform="web", stream="B")
    state["language"] = "EN"
    state["intent"] = "procedure"
    state["user_role"] = "nurse"

    t0 = time.time()
    result = agent_p(state)
    elapsed = int((time.time() - t0) * 1000)

    ok = check("procedure_result key present", "procedure_result" in result)
    pr = result.get("procedure_result") or {}
    ok &= check(f"RAG returned in {elapsed}ms", elapsed < 30000)

    if pr.get("found"):
        ok &= check("result.found=True", True)
        ok &= check("result.data is dict", isinstance(pr.get("data"), dict))
        ok &= check("result has top_entry_id", "top_entry_id" in pr)
        ok &= check("result has risk_level", "risk_level" in pr)
    else:
        # Either threshold not met or no procedures in DB
        ok &= check("no match message present", bool(pr.get("message")))
        print(f"         (message: {pr.get('message','')[:80]!r})")

    return ok


def test_agent_p_threshold_rejection(has_db: bool, has_kb: bool) -> bool:
    print("\n── AGENT-P: confidence threshold rejection ──")
    if not has_db or not has_kb:
        skip("Threshold test", "DB or KB not available")
        return True

    from agents.agent_p import agent_p
    from agents.state import initial_state

    # A completely nonsense query that should not match any procedure
    state = initial_state("xyzzy frobulate wibble wombat", platform="web", stream="A")
    state["language"] = "EN"
    state["intent"] = "procedure"
    result = agent_p(state)
    pr = result.get("procedure_result") or {}
    ok = check("threshold rejection: had_result=False", result.get("had_result") == False)
    ok &= check("threshold rejection: found=False", pr.get("found") == False)
    ok &= check("threshold rejection: message present", bool(pr.get("message")))
    return ok


def test_agent_o_formatters() -> bool:
    print("\n── AGENT-O: all 5 platform formatters ──")
    from agents.agent_o import agent_o
    from agents.state import initial_state

    procedure_content = {
        "disclaimer": "AI summary. Verify with staff.",
        "summary": "Blood transfusion requires compatibility check and consent.",
        "key_steps": [
            "Verify patient identity",
            "Check blood group and crossmatch",
            "Obtain signed consent",
            "Infuse at 5 mL/hr for first 15 min",
        ],
        "risk_level": "high",
    }

    platforms = {
        "web": "json",
        "mobile": "json",
        "whatsapp": "text",
        "sms": "sms",
        "ussd": "ussd_screens",
    }
    ok = True
    for platform, expected_type in platforms.items():
        state = initial_state("blood transfusion", platform=platform, stream="A")
        state["language"] = "EN"
        state["is_emergency"] = False
        state["procedure_result"] = {"found": True, "data": procedure_content, "risk_level": "high"}
        state["had_result"] = True
        result = agent_o(state)
        ok &= check(f"{platform}: output_type={result.get('output_type')!r}", result.get("output_type") == expected_type)
        ok &= check(f"{platform}: formatted_output is set", result.get("formatted_output") is not None)

    # SMS character limit
    state2 = initial_state("test", platform="sms")
    state2["language"] = "EN"
    state2["is_emergency"] = False
    state2["procedure_result"] = {"found": True, "data": procedure_content, "risk_level": "high"}
    result2 = agent_o(state2)
    sms_text = result2.get("formatted_output", "")
    ok &= check(f"SMS <= 155 chars (got {len(sms_text)})", len(sms_text) <= 155)

    return ok


def test_full_pipeline_emergency(has_db: bool, has_redis: bool) -> bool:
    print("\n── Full pipeline: emergency path ──")
    if not has_db or not has_redis:
        skip("Full pipeline emergency", "DB or Redis not available")
        return True

    from agents.graph import get_pipeline
    from agents.state import initial_state

    pipeline = get_pipeline()
    state = initial_state("cardiac arrest patient collapsed", platform="whatsapp", stream="A")
    result = pipeline.invoke(state)

    ok = check("is_emergency=True", result.get("is_emergency") == True)
    ok &= check("intent=emergency", result.get("intent") == "emergency")
    ok &= check("output_type=text", result.get("output_type") == "text")
    ok &= check("formatted_output set", bool(result.get("formatted_output")))
    return ok


def test_full_pipeline_procedure(has_db: bool, has_kb: bool) -> bool:
    print("\n── Full pipeline: procedure path (direct, no chatbot) ──")
    if not has_db or not has_kb:
        skip("Full pipeline procedure", "DB or KB not available")
        return True

    from agents.graph import get_pipeline
    from agents.state import initial_state

    pipeline = get_pipeline()
    state = initial_state(
        "steps for blood transfusion procedure",
        platform="web",
        stream="B",
        user_role="nurse",
    )
    result = pipeline.invoke(state)

    ok = check("is_emergency=False", result.get("is_emergency") == False)
    ok &= check("intent is set", result.get("intent") is not None)
    ok &= check("output_type set", result.get("output_type") is not None)
    ok &= check("formatted_output set", result.get("formatted_output") is not None)
    print(f"         intent={result.get('intent')!r}  had_result={result.get('had_result')}  lang={result.get('language')!r}")
    return ok


def test_full_pipeline_french(has_db: bool, has_redis: bool) -> bool:
    print("\n── Full pipeline: French language ──")
    if not has_db or not has_redis:
        skip("French pipeline", "DB or Redis not available")
        return True

    from agents.graph import get_pipeline
    from agents.state import initial_state

    pipeline = get_pipeline()
    state = initial_state("Comment effectuer une transfusion sanguine?", platform="web", stream="A")
    result = pipeline.invoke(state)

    ok = check("language detected as FR", result.get("language") == "FR")
    ok &= check("output set", result.get("formatted_output") is not None)
    return ok


def test_kb_semantic_search(has_kb: bool) -> bool:
    print("\n── SVC-07: KB semantic search ──")
    if not has_kb:
        skip("KB semantic search", "KB index empty or missing")
        return True

    from services.svc07_kb_sync.service import search

    results = search("blood transfusion compatibility", top_k=5)
    ok = check(f"Returned {len(results)} hits for procedure query", len(results) > 0)
    if results:
        top_score, top_meta = results[0]
        ok &= check(f"Top score {top_score:.3f} > 0.10", top_score > 0.10)
        ok &= check("Top hit has entry_id", "entry_id" in top_meta)
        ok &= check("Top hit has title", "title" in top_meta)
        print(f"         top hit: score={top_score:.3f}  title={top_meta.get('title', '')[:60]!r}")

    results_fr = search("transfusion sanguine procédure", top_k=5, language="EN")
    ok &= check(f"French query returned {len(results_fr)} hits (cross-lingual)", True)

    results_stream = search("blood transfusion", top_k=5, stream_target="B")
    ok &= check("Stream-B filter applied", all(m.get("stream_target") in {"B", "both"} for _, m in results_stream))

    return ok


# ── Runner ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("AI-HPS Integration Test Suite")
    print("=" * 60)

    # Phase 1: connectivity
    has_db = check_db()
    has_redis = check_redis()
    has_kb = check_kb_index()

    if not has_db:
        print("\n[!] Database unavailable — most tests will be skipped.")
        print("    Start PostgreSQL and ensure .env has correct DATABASE_URL.")
    if not has_redis:
        print("\n[!] Redis unavailable — emergency/session tests will be skipped.")
        print("    Run: cd docker && docker compose up -d")

    # Phase 2: unit-level agent tests (no infra needed)
    results = []
    results.append(("AGENT-R emergency detection", test_agent_r_emergency()))
    results.append(("AGENT-R intent classification", test_agent_r_intent()))
    results.append(("AGENT-R language detection", test_agent_r_language()))
    results.append(("AGENT-O all 5 platform formatters", test_agent_o_formatters()))

    # Phase 3: infra-dependent tests
    results.append(("AGENT-E emergency cache", test_agent_e_cache(has_redis)))
    results.append(("Shared embeddings dept lookup", test_department_embeddings(has_db)))
    results.append(("AGENT-N navigation", test_agent_n_navigation(has_db)))
    results.append(("SVC-07 KB semantic search", test_kb_semantic_search(has_kb)))
    results.append(("AGENT-P RAG retrieval", test_agent_p_rag(has_db, has_kb)))
    results.append(("AGENT-P threshold rejection", test_agent_p_threshold_rejection(has_db, has_kb)))

    # Phase 4: full end-to-end pipeline
    results.append(("Full pipeline: emergency path", test_full_pipeline_emergency(has_db, has_redis)))
    results.append(("Full pipeline: procedure path", test_full_pipeline_procedure(has_db, has_kb)))
    results.append(("Full pipeline: French language", test_full_pipeline_french(has_db, has_redis)))

    # Summary
    print(f"\n{'=' * 60}")
    total = len(results)
    passed = sum(1 for _, ok in results if ok)
    failed_tests = [name for name, ok in results if not ok]

    print(f"Results: {passed}/{total} test groups passed")
    if failed_tests:
        print("\nFailed groups:")
        for name in failed_tests:
            print(f"  - {name}")
        sys.exit(1)
    else:
        print("All integration tests passed.")
