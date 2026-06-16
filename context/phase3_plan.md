# Phase 3 — Agent Pipeline Implementation Plan

---

## Goal
Build all 6 LangGraph agents in order (E → N → R → C → P → O), seed the knowledge base from PDFs, and expose the pipeline via a single FastAPI service on :8020.

---

## Read Only
- `context/AI_HPS_Implementation_Plan_v1.1.html` — agent specs, routing table, constraints
- `backend/schema.sql` — all 17 tables
- `backend/shared/models/` — ORM models (Department, NavigationPath, EmergencyContent, ProcedureEntry, User)
- `backend/services/svc07_kb_sync/service.py` — search(), rebuild_full_index()
- `backend/services/svc06_audit/consumer.py` — queue name: `audit.events`, schema: AuditEventIn
- `backend/shared/config.py` — Settings (OPENAI_API_KEY, REDIS_URL, RABBITMQ_URL, DATABASE_URL)
- `PROCEDURES/` — WHO PDF source documents per department

## Modify Only
- `backend/requirements.txt` — add pdfplumber
- `backend/agents/` — all agent files (new directory, was empty)
- `backend/scripts/ingest_procedures.py` — new PDF ingestion script

---

## Constraints
- AGENT-E: zero LLM calls, ≤3s SLA, never compressed by AGENT-O, emergency content cached in Redis at startup
- AGENT-P: hard threshold 0.40 — no answer generated below it; grounded on retrieved content only
- AGENT-R: emergency regex runs first, before any LLM call
- AGENT-O: emergency state always bypasses all formatting constraints
- Build order: E → N → R → C → P → O → graph → main
- All agents are sync Python functions in one LangGraph StateGraph, one FastAPI app

---

## Output

| File | Description |
|------|-------------|
| `backend/requirements.txt` | + pdfplumber |
| `backend/scripts/ingest_procedures.py` | Extract PDFs → DB → rebuild FAISS |
| `backend/agents/state.py` | AIHPSState TypedDict + initial_state() factory |
| `backend/agents/shared/embeddings.py` | In-memory dept name embedding index (shared by N+C) |
| `backend/agents/shared/audit.py` | Fire-and-forget RabbitMQ audit publisher |
| `backend/agents/agent_e.py` | Emergency agent — Redis-cached DB content, audit emit |
| `backend/agents/agent_n.py` | Navigation — cosine similarity dest resolution + DB path retrieval |
| `backend/agents/agent_r.py` | Router — emergency regex + langdetect + GPT-4o-mini intent |
| `backend/agents/agent_c.py` | Conversational — dept info lookup + chatbot session reformulation |
| `backend/agents/agent_p.py` | Procedure RAG — internal filters + semantic+FTS merge + GPT-4o-mini |
| `backend/agents/agent_o.py` | Output — 5-platform formatters (WhatsApp/SMS/USSD/Mobile/Web) |
| `backend/agents/graph.py` | LangGraph StateGraph assembly |
| `backend/agents/main.py` | FastAPI entrypoint on :8020 |

---

## Pipeline Flow

```
Incoming request
      │
  AGENT-R ──────────────────────────────────────────┐
      │ is_emergency=True                            │
      │ ──────────────────→ AGENT-E ──────────────→ AGENT-O → response
      │
      │ intent=navigation  → AGENT-N ──────────────→ AGENT-O → response
      │ intent=information → AGENT-C (dept lookup) → AGENT-O → response
      │ intent=procedure + chatbot_mode → AGENT-C → AGENT-P → AGENT-O
      │ intent=procedure (direct)       → AGENT-P ──────────→ AGENT-O
      │ intent=unknown                  → AGENT-O (clarification)
```

---

## Run commands

```powershell
# 1. Install dependencies
cd D:\AI-HPS\backend
.\venv\Scripts\pip install pdfplumber

# 2. Ingest PDFs → DB → rebuild KB index
.\venv\Scripts\python scripts\ingest_procedures.py

# 3. Start agent pipeline
.\venv\Scripts\uvicorn agents.main:app --port 8020 --reload

# Docs at http://localhost:8020/docs
```
