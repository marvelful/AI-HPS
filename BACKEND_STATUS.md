# AI-HPS Backend Status & RAG Build Report
**Date:** 2026-06-16  
**Author:** Ful Marvel  
**Project:** AI Hospital Procedure System — Hôpital Général de Douala (HGD)

---

## 1. Overview

The AI-HPS backend is a **Python / FastAPI / LangGraph** system that processes hospital procedure queries across 5 delivery platforms (WhatsApp, SMS, USSD, Mobile App, Web Portal) in English and French. It uses a 6-agent LangGraph pipeline backed by a PostgreSQL + Redis + RabbitMQ infrastructure.

---

## 2. Infrastructure

| Component | Technology | Status |
|-----------|-----------|--------|
| PostgreSQL 15 | 5 schemas, 17 tables | ✅ Running |
| Redis 7.2 | Emergency cache, sessions, pub/sub | ✅ Docker |
| RabbitMQ 3.12 | Audit event queue | ✅ Docker |
| nginx 1.25 | API gateway on :80 | ✅ Docker |

**Docker startup:**
```powershell
cd D:\AI-HPS\docker
docker compose up -d
```

---

## 3. Microservices

| Service | Port | Purpose | Status |
|---------|------|---------|--------|
| SVC-02 | 8002 | Auth & RBAC (JWT, lockout, user CRUD) | ✅ Complete |
| SVC-03 | 8003 | Procedures CRUD + approval workflow | ✅ Complete |
| SVC-05 | 8005 | Analytics read API (queries, gaps, summary) | ✅ Built today |
| SVC-06 | 8006 | Audit log (RabbitMQ consumer → DB) | ✅ Complete |
| SVC-07 | 8007 | KB Sync (vector store, embedder, Redis subscriber) | ✅ Complete |
| Agents | 8020 | LangGraph AI pipeline endpoint | ✅ Complete |

**Missing / deferred:**
- SVC-01 (public platform gateway for USSD/SMS/WhatsApp webhooks) — Phase 4
- SVC-04 (push notification delivery) — Phase 4

---

## 4. Database Schema

**5 schemas, 17 tables:**

| Schema | Tables |
|--------|--------|
| `aihps_auth` | users, lockout_records, token_blacklist |
| `aihps_procedures` | departments, categories, procedure_entries, procedure_versions, procedure_approvals, navigation_paths, emergency_content, compliance_annotations |
| `aihps_notifications` | push_registrations, notifications |
| `aihps_analytics` | query_events, content_gaps, weekly_reports |
| `aihps_audit` | audit_log (HMAC-signed, append-only) |

---

## 5. The 6-Agent LangGraph Pipeline

```
POST /pipeline/query (port 8020)
         │
    AGENT-R (Router)
    ├─ Emergency regex → AGENT-E (zero LLM, Redis, ≤3s SLA) → AGENT-O
    ├─ intent=navigation  → AGENT-N (cosine similarity + DB path) → AGENT-O
    ├─ intent=information → AGENT-C (dept info lookup, no LLM)   → AGENT-O
    ├─ intent=procedure + chatbot → AGENT-C (reformulate) → AGENT-P → AGENT-O
    ├─ intent=procedure (direct)                          → AGENT-P → AGENT-O
    └─ intent=unknown                                             → AGENT-O
```

### Agent Details

| Agent | File | Description | LLM |
|-------|------|-------------|-----|
| AGENT-R | agents/agent_r.py | Route: emergency regex → langdetect → intent | gpt-4o-mini (intent, with rule-based fallback) |
| AGENT-E | agents/agent_e.py | Emergency content from Redis, zero LLM, audits every activation | None |
| AGENT-N | agents/agent_n.py | Destination via cosine similarity, navigation steps from DB | None |
| AGENT-C | agents/agent_c.py | Dept info lookup or chatbot query reformulation | gpt-4o-mini (reformulation only) |
| AGENT-P | agents/agent_p.py | Semantic + FTS merge, 0.40 threshold, grounded generation | gpt-4o-mini |
| AGENT-O | agents/agent_o.py | Format for 5 platforms, emergency bypass | None |

---

## 6. RAG Pipeline (AGENT-P + SVC-07)

### Architecture
```
User query
    │
embedder.embed_one(query)      ← paraphrase-multilingual-MiniLM-L12-v2 (384d)
    │
_semantic_search()             ← cosine similarity over numpy vector store
    │                             filtered by: stream_target, language, applicable_roles
_fts_search()                  ← PostgreSQL TSVECTOR plainto_tsquery
    │
_merge(semantic×0.7 + fts×0.3) ← hybrid score, top-5 chunks
    │
threshold check ≥ 0.40         ← hard reject below threshold
    │
    ├─ FAIL → ContentGap logged → return no-match message
    │
    └─ PASS → gpt-4o-mini grounding → structured JSON response
                  │
                  └─ disclaimer, summary, steps[], compliance_notes[],
                     risk_level, escalation, citations[]
```

### Vector Index
- **Location:** `backend/kb_index/aihps.npy` + `aihps.json`
- **Model:** `paraphrase-multilingual-MiniLM-L12-v2` (multilingual, 384 dimensions)
- **Chunking:** 2000 chars / 50-char overlap
- **Content:** WHO PDFs from `PROCEDURES/` (Blood Bank, ICU, Maternity, Surgery, Infection Control)

### Confidence Threshold
- Score ≥ 0.40 → answer generated
- Score < 0.40 → query rejected with no-match message, logged to `content_gaps`

### No API Key Fallback
If `OPENAI_API_KEY` is empty in `.env`:
- AGENT-R falls back to rule-based regex intent classification
- AGENT-P returns raw content from top chunk (no grounding)
- AGENT-C passes query through unreformed

---

## 7. Knowledge Base Population

### Ingest PDFs (run once):
```powershell
cd D:\AI-HPS\backend
..\venv\Scripts\python scripts\ingest_procedures.py
```
This script:
1. Reads PDFs from `PROCEDURES/` (Blood Bank, ICU, Maternity, Surgery, Infection Control)
2. Creates `ProcedureEntry` rows in `aihps_procedures.procedure_entries` (status=published)
3. Triggers `rebuild_full_index()` → embeds all content → saves `kb_index/aihps.npy` + `.json`

### Manual KB rebuild (after DB changes):
```powershell
# Via SVC-07 HTTP endpoint (requires admin token):
POST http://localhost:8007/kb/sync/rebuild
Authorization: Bearer <token>
```

---

## 8. Analytics (Built Today)

### What now gets tracked automatically:
Every call to `POST /pipeline/query` fires a background thread that writes to `aihps_analytics.query_events`:
- `query`, `intent`, `agent`, `had_result`, `response_time_ms`, `platform`, `stream`, `session_id`, `user_id`

Every time AGENT-P rejects a query (score < 0.40), a background thread upserts to `aihps_analytics.content_gaps`:
- `query`, `occurrence_count`, `first_seen`, `last_seen`

### Analytics API (SVC-05, port 8005):
```
GET  /analytics/queries   ?platform=&stream=&had_result=&intent=&limit=&skip=
GET  /analytics/gaps      ?min_occurrences=&limit=&skip=
GET  /analytics/summary
```
All endpoints require an admin-role JWT (Authorization: Bearer ...).

---

## 9. Startup Sequence

```powershell
# Terminal 1 — Docker infrastructure
cd D:\AI-HPS\docker
docker compose up -d

# Terminal 2 — Diagnostics (verify connectivity)
cd D:\AI-HPS\backend
..\venv\Scripts\python check_setup.py

# Terminal 3 — Ingest PDFs (first time only)
..\venv\Scripts\python scripts\ingest_procedures.py

# Terminal 4 — Auth service
..\venv\Scripts\uvicorn services.svc02_auth.main:app --port 8002 --reload

# Terminal 5 — Procedures service
..\venv\Scripts\uvicorn services.svc03_procedures.main:app --port 8003 --reload

# Terminal 6 — Analytics service (new)
..\venv\Scripts\uvicorn services.svc05_analytics.main:app --port 8005 --reload

# Terminal 7 — Audit service
..\venv\Scripts\uvicorn services.svc06_audit.main:app --port 8006 --reload

# Terminal 8 — KB Sync service
..\venv\Scripts\uvicorn services.svc07_kb_sync.main:app --port 8007 --reload

# Terminal 9 — Agent pipeline (main entry point)
..\venv\Scripts\uvicorn agents.main:app --port 8020 --reload
```

**Create super-admin user (first time):**
```powershell
cd D:\AI-HPS\backend
..\venv\Scripts\python create_superadmin.py
```

---

## 10. Testing

### Smoke Test (no infrastructure required)
```powershell
cd D:\AI-HPS\backend
..\venv\Scripts\python scripts\smoke_test.py
```
Tests: emergency detection, language detection, SMS/USSD formatters, emergency pass-through, graph compilation.

### Integration Test (requires DB + Redis)
```powershell
cd D:\AI-HPS\backend
..\venv\Scripts\python scripts\test_integration.py
```
Tests (13 groups):
- DB + Redis connectivity
- KB index load + vector count
- AGENT-R: emergency detection (8 cases), intent classification, language detection
- AGENT-E: Redis cache warm + emergency response
- Shared embeddings: department substring + semantic lookup
- AGENT-N: navigation path retrieval
- AGENT-P: RAG retrieval with real DB data
- AGENT-P: confidence threshold rejection (nonsense query)
- AGENT-O: all 5 platform formatters + SMS character limit
- Full pipeline end-to-end (emergency, procedure, French)
- SVC-07: semantic search, stream filtering, cross-lingual query

### Manual API test (pipeline running):
```powershell
# Emergency query
Invoke-RestMethod -Uri "http://localhost:8020/pipeline/query" `
  -Method POST -ContentType "application/json" `
  -Body '{"raw_query":"cardiac arrest in room 4","platform":"whatsapp","stream":"A"}'

# Procedure query (staff, no auth required for pipeline)
Invoke-RestMethod -Uri "http://localhost:8020/pipeline/query" `
  -Method POST -ContentType "application/json" `
  -Body '{"raw_query":"blood transfusion steps","platform":"web","stream":"B","user_role":"nurse"}'

# Health check
Invoke-RestMethod -Uri "http://localhost:8020/pipeline/health"
```

---

## 11. Configuration (`.env`)

```env
APP_ENV=development
DATABASE_URL=postgresql://postgresql:postgresql@localhost:5432/AIHPS
REDIS_URL=redis://localhost:6379/0
RABBITMQ_URL=amqp://aihps:aihps_dev_pass@localhost:5672/
SECRET_KEY=<minimum-32-chars>
OPENAI_API_KEY=         # optional — system works without it (rule-based fallback)
```

---

## 12. What Was Built / Fixed Today

| Item | File(s) | Description |
|------|---------|-------------|
| Content gap tracking | `agents/agent_p.py` | When confidence < 0.40, background thread upserts `content_gaps` table |
| Query event analytics | `agents/main.py` | Background thread writes `query_events` after every pipeline call with timing |
| SVC-05 Analytics | `services/svc05_analytics/` | New service: GET /analytics/queries, /gaps, /summary — admin-only |
| Integration test suite | `scripts/test_integration.py` | 13 test groups covering all agent paths, all formatters, real DB/KB |

---

## 13. Known Gaps (Deferred to Future Phases)

| Gap | Impact | Phase |
|-----|--------|-------|
| SVC-01 (public gateway) | USSD/SMS/WhatsApp webhooks not wired | Phase 4 |
| SVC-04 (notifications) | Push notifications to staff not functional | Phase 4 |
| Alembic migrations | Schema managed via `schema.sql` — no migration version history | Phase 4 |
| Mistral / Gemini fallback | Only OpenAI gpt-4o-mini wired; keys in `.env.example` but not in code | Phase 4 |
| Token refresh endpoint | JWT tokens expire; no refresh flow yet | Phase 4 |
| Rate limiting | No per-IP or per-user rate limits on pipeline endpoint | Phase 4 |
| USSD session state machine | USSD multi-screen navigation requires session continuity (CON/END) | Phase 4 |

---

## 14. Key File Index

```
backend/
├── agents/
│   ├── main.py          FastAPI :8020, QueryEvent analytics, timing
│   ├── graph.py         LangGraph StateGraph, conditional routing
│   ├── state.py         AIHPSState TypedDict + initial_state()
│   ├── agent_r.py       Router (emergency regex, langdetect, GPT-4o-mini intent)
│   ├── agent_e.py       Emergency (Redis cache, zero LLM, audit emit)
│   ├── agent_n.py       Navigation (cosine similarity + DB path retrieval)
│   ├── agent_c.py       Conversational (dept lookup or chatbot reformulation)
│   ├── agent_p.py       Procedure RAG (semantic+FTS, 0.40 threshold, GPT-4o-mini)
│   ├── agent_o.py       Output (WhatsApp, SMS, USSD, Mobile, Web formatters)
│   └── shared/
│       ├── embeddings.py  In-memory dept name embedding index (thread-safe)
│       └── audit.py       Fire-and-forget RabbitMQ audit publisher
├── services/
│   ├── svc02_auth/      Auth, JWT, lockout, user CRUD
│   ├── svc03_procedures/ CRUD, approval workflow, navigation paths
│   ├── svc05_analytics/  NEW — query events, content gaps, summary
│   ├── svc06_audit/     RabbitMQ consumer → audit_log table
│   └── svc07_kb_sync/   Vector store, embedder, Redis subscriber
├── shared/
│   ├── config.py        Settings (pydantic-settings, .env)
│   ├── database.py      SQLAlchemy engine + SessionLocal
│   ├── events.py        Fire-and-forget RabbitMQ + Redis publishers
│   └── models/          ORM models (auth, procedures, analytics, audit, notifications)
├── scripts/
│   ├── ingest_procedures.py  PDF → DB → KB index rebuild
│   ├── smoke_test.py         Pure-Python unit tests (no infra)
│   └── test_integration.py  NEW — full integration tests (DB + Redis + KB)
├── kb_index/
│   ├── aihps.npy        Vector embeddings (384d float32)
│   └── aihps.json       Chunk metadata (entry_id, title, stream_target, etc.)
├── schema.sql           Full PostgreSQL DDL (17 tables, 5 schemas, triggers)
├── requirements.txt     All Python dependencies
├── .env.example         Config template
└── check_setup.py       Connectivity diagnostic
```
