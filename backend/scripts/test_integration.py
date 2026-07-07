"""
AI-HPS Integration Test Suite.

Tests the full pipeline by invoking Python modules directly — no HTTP server required.
Requires: PostgreSQL and Redis running, .env configured.

Run from D:\\AI-HPS\\backend\\ :
    ..\\venv\\Scripts\\python scripts\\test_integration.py

Exit code: 0 = all passed, 1 = one or more failed.
"""
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

PASS = "[PASS]"
FAIL = "[FAIL]"
SKIP = "[SKIP]"


def check(label: str, cond: bool) -> bool:
    print(f"  {PASS if cond else FAIL}  {label}")
    return cond


def skip(label: str, reason: str) -> None:
    print(f"  {SKIP}  {label}  ({reason})")


# ── Connectivity ──────────────────────────────────────────────────────────────

def check_db() -> bool:
    print("\n── DB connectivity ──")
    try:
        import sqlalchemy
        from shared.database import SessionLocal
        db = SessionLocal()
        db.execute(sqlalchemy.text("SELECT 1"))
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
        from services.svc07_kb_sync.service import load_index, get_status, embedder
        load_index()
        embedder.embed(["warm"])  # trigger lazy model load before status check
        st = get_status()
        vc = st["vector_count"]
        ok = check(f"Vector count: {vc} vectors / {st['unique_documents']} documents", vc > 0)
        ok &= check(f"Embedder: {st['embedder']}", "stub" not in st["embedder"])
        return vc > 0
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
        result = agent_r(initial_state(query))
        ok &= check(f"emergency={expected}: {query!r}", result["is_emergency"] == expected)
    return ok


def test_agent_r_rule_classify() -> bool:
    print("\n── AGENT-R: rule-based classification ──")
    from agents.agent_r import _rule_classify
    ok = True
    intent, _ = _rule_classify("how to perform a blood transfusion")
    ok &= check(f"procedure query → intent={intent!r}", intent == "procedure")
    intent2, _ = _rule_classify("where is the blood bank")
    ok &= check(f"location query → intent={intent2!r}", intent2 == "dept_info")
    intent3, _ = _rule_classify("billing and registration")
    ok &= check(f"admin query → intent={intent3!r}", intent3 == "administrative")
    return ok


def test_agent_r_language() -> bool:
    print("\n── AGENT-R: language detection ──")
    from agents.agent_r import _detect_language
    ok = True
    ok &= check("EN: English query", _detect_language("How do I perform a blood transfusion?") == "EN")
    ok &= check("FR: French query", _detect_language("Comment effectuer une transfusion sanguine?") == "FR")
    ok &= check("EN fallback on empty string", _detect_language("") == "EN")
    return ok


def test_agent_o_formatters() -> bool:
    print("\n── AGENT-O: platform formatters ──")
    from agents.agent_o import agent_o
    from agents.state import initial_state

    procedure_data = {
        "disclaimer": "AI summary. Verify with staff.",
        "answer": "Blood transfusion requires compatibility check and consent.",
        "key_steps": [
            "Verify patient identity",
            "Check blood group and crossmatch",
            "Obtain signed consent",
            "Infuse at 5 mL/hr for first 15 min",
        ],
        "risk_level": "high",
        "when_to_seek_help": "If adverse reaction occurs, stop transfusion immediately.",
        "source": "WHO Blood Transfusion Guidelines",
    }

    ok = True
    for platform, expected_type in [
        ("web", "json"), ("mobile", "json"),
        ("whatsapp", "text"), ("sms", "sms"), ("ussd", "ussd_screens"),
    ]:
        state = initial_state("blood transfusion", platform=platform, stream="A")
        state["language"] = "EN"
        state["is_emergency"] = False
        state["procedure_result"] = {"found": True, "data": procedure_data}
        state["had_result"] = True
        result = agent_o(state)
        ok &= check(f"{platform}: output_type={result.get('output_type')!r}", result.get("output_type") == expected_type)
        ok &= check(f"{platform}: formatted_output set", result.get("formatted_output") is not None)

    # Verify JSON schema for web
    state_web = initial_state("test", platform="web")
    state_web["language"] = "EN"
    state_web["is_emergency"] = False
    state_web["procedure_result"] = {"found": True, "data": procedure_data}
    state_web["had_result"] = True
    data_out = (agent_o(state_web).get("formatted_output") or {}).get("data") or {}
    ok &= check("web JSON has 'answer' key", "answer" in data_out)
    ok &= check("web JSON has 'key_steps' list", isinstance(data_out.get("key_steps"), list))

    # SMS character limit
    state_sms = initial_state("test", platform="sms")
    state_sms["language"] = "EN"
    state_sms["is_emergency"] = False
    state_sms["procedure_result"] = {"found": True, "data": procedure_data}
    sms_text = agent_o(state_sms).get("formatted_output", "")
    ok &= check(f"SMS <= 155 chars (got {len(sms_text)})", len(sms_text) <= 155)
    return ok


def test_dept_embeddings(has_db: bool) -> bool:
    print("\n── Shared embeddings: department lookup ──")
    if not has_db:
        skip("Department embeddings", "DB not available")
        return True
    from agents.shared.embeddings import load, find_department
    load(force=True)
    result = find_department("blood bank")
    ok = check("Direct lookup: 'blood bank' resolves", result is not None)
    if result:
        ok &= check(f"  name={result['name']!r}", True)
    return ok


def test_kb_semantic_search(has_kb: bool) -> bool:
    print("\n── SVC-07: KB semantic search ──")
    if not has_kb:
        skip("KB semantic search", "KB index empty or missing")
        return True
    from services.svc07_kb_sync.service import search

    results = search("blood transfusion compatibility check", top_k=5)
    ok = check(f"Returned {len(results)} hits for procedure query", len(results) > 0)
    if results:
        top_score, top_meta = results[0]
        ok &= check(f"Top score {top_score:.3f} > 0.10", top_score > 0.10)
        ok &= check("Top hit has chunk_id", "chunk_id" in top_meta)
        ok &= check("Top hit has content", "content" in top_meta)
        print(f"         top: score={top_score:.3f}  dept={top_meta.get('department','?')!r}  section={top_meta.get('section','')[:50]!r}")

    results_fr = search("transfusion sanguine procédure étapes", top_k=5)
    ok &= check(f"French query returned {len(results_fr)} hits", len(results_fr) > 0)
    return ok


def test_agent_p_rag(has_db: bool, has_kb: bool) -> bool:
    print("\n── AGENT-P: RAG procedure retrieval ──")
    if not has_db or not has_kb:
        skip("RAG test", f"DB={'ok' if has_db else 'missing'}, KB={'ok' if has_kb else 'empty'}")
        return True

    from agents.agent_p import agent_p
    from agents.state import initial_state

    state = initial_state("blood transfusion procedure steps", platform="web", stream="B")
    state["language"] = "EN"
    state["intent"] = "procedure"
    state["knowledge_domain"] = "who_guideline"
    state["user_role"] = "nurse"

    t0 = time.time()
    result = agent_p(state)
    elapsed = int((time.time() - t0) * 1000)

    ok = check("procedure_result key present", "procedure_result" in result)
    pr = result.get("procedure_result") or {}
    ok &= check(f"RAG returned in {elapsed}ms", elapsed < 30_000)

    if pr.get("found"):
        data = pr.get("data") or {}
        ok &= check("data is dict", isinstance(data, dict))
        ok &= check("data has answer or disclaimer", bool(data.get("answer") or data.get("disclaimer")))
    else:
        ok &= check("no-match message present", bool(pr.get("message")))
        print(f"         (message: {pr.get('message','')[:80]!r})")
    return ok


def test_agent_p_threshold_rejection(has_db: bool, has_kb: bool) -> bool:
    print("\n── AGENT-P: confidence threshold rejection ──")
    if not has_db or not has_kb:
        skip("Threshold test", "DB or KB not available")
        return True

    from agents.agent_p import agent_p
    from agents.state import initial_state

    state = initial_state("xyzzy frobulate wibble wombat", platform="web", stream="A")
    state["language"] = "EN"
    state["intent"] = "procedure"
    result = agent_p(state)
    pr = result.get("procedure_result") or {}
    ok = check("threshold rejection: had_result=False", result.get("had_result") == False)
    ok &= check("threshold rejection: found=False", pr.get("found") == False)
    ok &= check("threshold rejection: message present", bool(pr.get("message")))
    return ok


def test_full_pipeline_emergency(has_db: bool, has_redis: bool) -> bool:
    print("\n── Full pipeline: emergency path ──")
    if not has_db or not has_redis:
        skip("Full pipeline emergency", "DB or Redis not available")
        return True

    from agents.graph import get_pipeline
    from agents.state import initial_state

    pipeline = get_pipeline()
    result = pipeline.invoke(initial_state("cardiac arrest patient collapsed", platform="whatsapp", stream="A"))

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
    result = pipeline.invoke(
        initial_state("steps for blood transfusion procedure", platform="web", stream="B", user_role="nurse")
    )

    ok = check("is_emergency=False", result.get("is_emergency") == False)
    ok &= check("intent is set", result.get("intent") is not None)
    ok &= check("knowledge_domain is set", result.get("knowledge_domain") is not None)
    ok &= check("output_type set", result.get("output_type") is not None)
    ok &= check("formatted_output set", result.get("formatted_output") is not None)
    print(f"         intent={result.get('intent')!r}  domain={result.get('knowledge_domain')!r}  had_result={result.get('had_result')}  lang={result.get('language')!r}")
    return ok


def test_full_pipeline_french(has_db: bool, has_redis: bool) -> bool:
    print("\n── Full pipeline: French language ──")
    if not has_db or not has_redis:
        skip("French pipeline", "DB or Redis not available")
        return True

    from agents.graph import get_pipeline
    from agents.state import initial_state

    pipeline = get_pipeline()
    result = pipeline.invoke(initial_state("Comment effectuer une transfusion sanguine?", platform="web", stream="A"))

    ok = check("language detected as FR", result.get("language") == "FR")
    ok &= check("output set", result.get("formatted_output") is not None)
    return ok


# ── Runner ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("AI-HPS Integration Test Suite")
    print("=" * 60)

    has_db = check_db()
    has_redis = check_redis()
    has_kb = check_kb_index()

    if not has_db:
        print("\n[!] Database unavailable — most tests will be skipped.")
    if not has_redis:
        print("\n[!] Redis unavailable — session/cache tests will be skipped.")

    results = [
        ("AGENT-R emergency detection",       test_agent_r_emergency()),
        ("AGENT-R rule-based classification", test_agent_r_rule_classify()),
        ("AGENT-R language detection",        test_agent_r_language()),
        ("AGENT-O platform formatters",       test_agent_o_formatters()),
        ("Shared embeddings dept lookup",     test_dept_embeddings(has_db)),
        ("SVC-07 KB semantic search",         test_kb_semantic_search(has_kb)),
        ("AGENT-P RAG retrieval",             test_agent_p_rag(has_db, has_kb)),
        ("AGENT-P threshold rejection",       test_agent_p_threshold_rejection(has_db, has_kb)),
        ("Full pipeline: emergency path",     test_full_pipeline_emergency(has_db, has_redis)),
        ("Full pipeline: procedure path",     test_full_pipeline_procedure(has_db, has_kb)),
        ("Full pipeline: French language",    test_full_pipeline_french(has_db, has_redis)),
    ]

    print(f"\n{'=' * 60}")
    passed = sum(1 for _, ok in results if ok)
    failed = [name for name, ok in results if not ok]

    print(f"Results: {passed}/{len(results)} test groups passed")
    if failed:
        print("\nFailed groups:")
        for name in failed:
            print(f"  - {name}")
        sys.exit(1)
    else:
        print("All integration tests passed.")
