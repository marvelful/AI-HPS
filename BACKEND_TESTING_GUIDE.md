# AI-HPS Backend — Complete Testing Guide

> Generated: 2026-06-18  
> Platform: Windows 11 / PowerShell  
> Author: AI-HPS Project

---

## Table of Contents
1. [Prerequisites & Known Issues](#1-prerequisites--known-issues)
2. [Infrastructure Verification](#2-infrastructure-verification)
3. [Phase 1 — Setup Check (check_setup.py)](#3-phase-1--setup-check)
4. [Phase 2 — Direct Service Health Checks](#4-phase-2--direct-service-health-checks)
5. [Phase 3 — Gateway & Auth Flow (Nginx on port 80)](#5-phase-3--gateway--auth-flow)
6. [Phase 4 — Smoke Tests (no DB required)](#6-phase-4--smoke-tests)
7. [Phase 5 — Integration Tests](#7-phase-5--integration-tests)
8. [Phase 6 — End-to-End Pipeline Test](#8-phase-6--end-to-end-pipeline-test)
9. [Interpreting Results](#9-interpreting-results)
10. [Common Errors & Fixes](#10-common-errors--fixes)

---

## 1. Prerequisites & Known Issues

### 1.1 — PowerShell vs curl

In PowerShell, `curl` is an **alias for `Invoke-WebRequest`**, not the real curl binary.  
This causes failures when using JSON `-d` flags or backtick line-continuation.

**Always use `curl.exe` explicitly** (the real curl comes with Windows 10/11):

```powershell
curl.exe http://localhost:8002/health
```

For POST with JSON body, use a single line or proper PowerShell here-string (see examples below).

---

### 1.2 — Missing Python Packages (redis, pika)

Your local Python environment is missing `redis` and `pika`.  
These are needed to run `check_setup.py` and `test_integration.py` locally.

**You must install them manually:**

```powershell
# Make sure you are in the backend folder with your venv activated
cd D:\AI-HPS\backend

# If using a venv (recommended):
..\venv\Scripts\activate

# Then install missing packages:
pip install redis pika
```

> **Why this happens**: The packages are installed inside Docker containers but not in your local Python environment. The `requirements.txt` lists them, but only Docker uses it automatically.

**Expected output after install:**
```
Successfully installed redis-5.0.4
Successfully installed pika-1.3.2
```

---

### 1.3 — Service Port Map (Quick Reference)

| Container | Direct Port | Nginx Path |
|---|---|---|
| aihps_gateway (Nginx) | **80** | — |
| aihps_svc02_auth | 8002 | `/api/auth/` |
| aihps_svc03_procedures | 8003 | `/api/procedures/` |
| aihps_svc05_analytics | 8005 | `/api/analytics/` |
| aihps_svc06_audit | 8006 | `/api/audit/` |
| aihps_svc07_kb_sync | 8007 | `/api/kb/` |
| aihps_svc_agents | 8020 | `/api/pipeline/` |
| aihps_rabbitmq | 15672 | (UI only) |
| aihps_redis | 6379 | (internal) |

---

## 2. Infrastructure Verification

### 2.1 — Check container health

Run from `D:\AI-HPS\docker\`:

```powershell
docker compose ps
```

**Expected output** — all containers should show `running` and healthy containers should show `(healthy)`:

```
NAME                     STATUS
aihps_redis              Up X minutes (healthy)
aihps_rabbitmq           Up X minutes (healthy)
aihps_svc02_auth         Up X minutes
aihps_svc03_procedures   Up X minutes
aihps_svc05_analytics    Up X minutes
aihps_svc06_audit        Up X minutes
aihps_svc07_kb_sync      Up X minutes
aihps_svc_agents         Up X minutes
aihps_gateway            Up X minutes
```

**If a container shows `Exited` or `Restarting`**, check its logs:

```powershell
docker logs aihps_svc_agents --tail 50
docker logs aihps_svc07_kb_sync --tail 50
```

---

### 2.2 — RabbitMQ Management UI

Open your browser and go to: `http://localhost:15672`

- **Username**: `aihps`  
- **Password**: `aihps_dev_pass`

**What to look for:**
- Overview tab → all connection counts should be ≥ 0 (not erroring)
- Queues tab → may be empty at startup (queues are created on first use)

---

### 2.3 — Gateway Health

```powershell
curl.exe http://localhost/health
```

**Expected response:**
```json
{"status":"ok","gateway":"SVC-01 Nginx"}
```

If this fails with "connection refused", Nginx didn't start. Check:
```powershell
docker logs aihps_gateway --tail 20
```

---

## 3. Phase 1 — Setup Check

Run after installing `redis` and `pika` locally (see §1.2).

```powershell
cd D:\AI-HPS\backend
..\venv\Scripts\activate   # activate your venv if not already done
python check_setup.py
```

**Expected output (all OK):**
```
==================================================
   AI-HPS Setup Check
==================================================

OK PostgreSQL  PostgreSQL 15.x ...
  Schemas     aihps_analytics, aihps_audit, aihps_auth, ...
  Departments 6 rows

OK Redis       Redis 7.x.x  (or whatever version)

OK RabbitMQ    Connected, channel OK
  Start with: cd docker && docker compose up -d

==================================================
```

**What each check means:**

| Check | What it verifies |
|---|---|
| PostgreSQL | Your local PG instance is reachable and schemas exist |
| Redis | Redis container is reachable on port 6379 |
| RabbitMQ | RabbitMQ container is reachable on port 5672 |

> **Note**: Redis and RabbitMQ are tested from your **local machine** (connecting to Docker ports). PostgreSQL connects to your local Windows PG install. If Redis/RabbitMQ fail after installing the packages, verify Docker containers are running (`docker compose ps`).

---

## 4. Phase 2 — Direct Service Health Checks

Test each service **directly** (bypassing Nginx). All services expose their own health endpoint.

```powershell
curl.exe http://localhost:8002/health
curl.exe http://localhost:8003/health
curl.exe http://localhost:8005/health
curl.exe http://localhost:8006/health
curl.exe http://localhost:8007/health
curl.exe http://localhost:8020/pipeline/health
```

**Expected response for each:**
```json
{"status": "ok", "service": "SVC-XX ..."}
```

### 4.1 — Interpreting SVC-07 (KB Sync)

> **Known issue**: `curl http://localhost:8007/kb/status` returns `{"detail":"Not Found"}` because `/kb/status` is the Nginx-proxied path. Direct access uses the raw path:

```powershell
curl.exe http://localhost:8007/status
```

**Expected response:**
```json
{
  "status": "ok",
  "vector_count": 0,
  "embedder": "sentence-transformers/...",
  "index_path": "/app/kb_index"
}
```

`vector_count: 0` is **normal** if no procedures have been ingested yet.

### 4.2 — Interpreting SVC-Agents (Pipeline at 8020)

```powershell
curl.exe http://localhost:8020/pipeline/health
```

**If you get "Empty reply from server"**: The agents service crashed during startup (likely due to missing model or sentence-transformers loading failure).

**Diagnose with:**
```powershell
docker logs aihps_svc_agents --tail 100
```

Look for:
- `OSError` or `FileNotFoundError` → model files missing
- `ImportError` → a Python dependency missing inside the container
- `Connection refused` to DB/Redis → connectivity issue
- If it loaded successfully, look for: `Application startup complete.`

---

## 5. Phase 3 — Gateway & Auth Flow

All requests through Nginx (port 80) require a JWT token **except login**.  
Test in this order:

### 5.1 — Login to get a JWT token

```powershell
curl.exe -X POST http://localhost/api/auth/login `
  -H "Content-Type: application/json" `
  -d "{\"username\": \"admin\", \"password\": \"YOUR_ADMIN_PASSWORD\"}"
```

> **PowerShell note**: Inside double-quoted strings, use `\"` to escape quotes. Or use a variable (see below).

**Alternative (cleaner) PowerShell approach:**

```powershell
$body = '{"username": "admin", "password": "YOUR_ADMIN_PASSWORD"}'
curl.exe -X POST http://localhost/api/auth/login -H "Content-Type: application/json" -d $body
```

**Expected response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": { "id": "...", "username": "admin", "role": "admin" }
}
```

Copy the `access_token` value — you need it for all subsequent calls.

---

### 5.2 — Test authenticated endpoints

Replace `YOUR_TOKEN` with the actual token from step 5.1:

```powershell
$token = "YOUR_TOKEN_HERE"

# Get your own profile
curl.exe http://localhost/api/auth/me -H "Authorization: Bearer $token"

# List departments
curl.exe http://localhost/api/procedures/departments/ -H "Authorization: Bearer $token"

# KB status via gateway
curl.exe http://localhost/api/kb/status -H "Authorization: Bearer $token"

# Analytics summary
curl.exe http://localhost/api/analytics/summary -H "Authorization: Bearer $token"
```

**Expected for /departments/:**
```json
[
  {"id": "...", "name": "Blood Bank", ...},
  {"id": "...", "name": "ICU", ...},
  ...
]
```
Should return 6 departments (matching what `check_setup.py` reported).

---

### 5.3 — Test rate limiting (optional)

Run the same endpoint more than 20 times rapidly. After the burst limit is exceeded you should receive:

```
HTTP/1.1 429 Too Many Requests
```

---

## 6. Phase 4 — Smoke Tests

These tests **do not require a database** and validate core logic only.

```powershell
cd D:\AI-HPS\backend
..\venv\Scripts\activate
..\venv\Scripts\python scripts\smoke_test.py
```

**What it tests:**

| Test | What it checks |
|---|---|
| Emergency keyword detection | EN/FR regex patterns recognize urgent phrases |
| Language detection | English and French inputs are correctly identified |
| SMS formatter | Output fits ≤ 155 characters |
| USSD formatter | Multi-screen pagination is correct |
| Emergency pass-through (AGENT-O) | Emergency queries bypass RAG and go straight to output |
| LangGraph compilation | The AI pipeline graph compiles without errors |

**Expected output:**
```
Running smoke tests...
[PASS] Emergency keyword detection (EN)
[PASS] Emergency keyword detection (FR)
[PASS] Language detection
[PASS] SMS formatter (155 chars)
[PASS] USSD pagination
[PASS] Emergency pass-through
[PASS] LangGraph graph compiled

All smoke tests passed.
```

If LangGraph fails, there's a Python dependency issue inside the graph. Check `docker logs aihps_svc_agents`.

---

## 7. Phase 5 — Integration Tests

These test the full stack: DB + Redis + services.

```powershell
cd D:\AI-HPS\backend
..\venv\Scripts\activate
..\venv\Scripts\python scripts\test_integration.py
```

**Test phases:**

### Phase 1 — Connectivity
- PostgreSQL reachable and schemas exist
- Redis reachable
- KB index file exists (may have 0 vectors)

### Phase 2 — Agent unit tests
- AGENT-R: emergency detection, intent classification, language detection
- AGENT-O: all 5 platform formatters (web, mobile, WhatsApp, SMS, USSD)

### Phase 3 — Infrastructure-dependent
- AGENT-E: Redis cache read/write
- Department embeddings loaded correctly
- AGENT-N: navigation path lookup
- SVC-07: semantic KB search (may return empty if no procedures ingested)
- AGENT-P: RAG retrieval
- Threshold rejection (low-confidence queries are rejected)

### Phase 4 — End-to-end pipeline
- Emergency path: sends emergency query → expects immediate formatted response
- Procedure path: sends procedure query → expects RAG-backed response
- French language: sends French query → expects French response

**Expected output:**
```
=====================================
Phase 1: Connectivity
=====================================
[PASS] PostgreSQL connection
[PASS] Redis connection
[PASS] KB index accessible

=====================================
Phase 2: Agent unit tests
=====================================
[PASS] AGENT-R emergency detection
[PASS] AGENT-R intent classification
...

=====================================
Results: 15/15 passed
=====================================
```

**If Phase 4 fails with 0 KB results:**  
This is expected if no procedures have been ingested. Ingest procedures first:

```powershell
..\venv\Scripts\python scripts\ingest_procedures.py
```

This reads PDFs from a `PROCEDURES/` folder, loads them to DB, and rebuilds the vector index.

---

## 8. Phase 6 — End-to-End Pipeline Test

Once services are healthy, test the full AI pipeline query:

### 8.1 — Via Direct Port (bypasses Nginx auth)

```powershell
$body = '{"raw_query":"What is the blood transfusion procedure?","platform":"web","stream":"B","user_id":"test","user_role":"nurse","session_id":"s1","chatbot_mode":false}'
curl.exe -X POST http://localhost:8020/pipeline/query -H "Content-Type: application/json" -d $body
```

### 8.2 — Via Nginx Gateway (with auth token)

```powershell
$token = "YOUR_TOKEN_HERE"
$body = '{"raw_query":"What is the blood transfusion procedure?","platform":"web","stream":"B","user_id":"test","user_role":"nurse","session_id":"s1","chatbot_mode":false}'
curl.exe -X POST http://localhost/api/pipeline/query `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $token" `
  -d $body
```

**Expected response structure:**
```json
{
  "answer": "The blood transfusion procedure requires...",
  "intent": "procedure_query",
  "language": "en",
  "platform": "web",
  "stream": "B",
  "sources": [...],
  "confidence": 0.87,
  "emergency": false
}
```

**Emergency query test:**
```powershell
$body = '{"raw_query":"Patient is not breathing, what do I do?","platform":"web","stream":"B","user_id":"test","user_role":"nurse","session_id":"s2","chatbot_mode":false}'
curl.exe -X POST http://localhost:8020/pipeline/query -H "Content-Type: application/json" -d $body
```

**Expected for emergency:** `"emergency": true` and an immediate pass-through response (no RAG search, instant reply).

---

## 9. Interpreting Results

### 9.1 — What "healthy" looks like

| Component | Healthy State |
|---|---|
| All containers | `Up` in `docker compose ps`, no restart loops |
| check_setup.py | All `OK` |
| /health endpoints | `{"status":"ok"}` from all 6 services |
| Smoke tests | All `[PASS]` |
| Integration Phase 1-2 | All pass |
| Integration Phase 3 | Pass (KB may return 0 results without ingested procedures) |
| Integration Phase 4 | Pass with procedures ingested; acceptable to skip without |

### 9.2 — Acceptable failures (not bugs)

- `vector_count: 0` in KB status → no procedures ingested yet, normal on first run
- Phase 3/4 KB search returning empty → same reason, ingest procedures first
- `pika`/`redis` errors in `check_setup.py` before installing packages → fixed by `pip install redis pika`

### 9.3 — Real failures (need investigation)

| Symptom | Likely Cause |
|---|---|
| Container keeps restarting | Check `docker logs <container> --tail 50` |
| `Empty reply from server` on pipeline | Agents service crashed; check logs |
| `401 Unauthorized` via Nginx | JWT expired or wrong; re-login |
| `502 Bad Gateway` via Nginx | Upstream service is down |
| `429 Too Many Requests` | Rate limit hit; wait ~1 minute |
| `/api/kb/status` → Not Found via gateway | Auth middleware blocking; use token |

---

## 10. Common Errors & Fixes

### Error: `curl: (3) URL rejected: Bad hostname`

**Cause**: Using PowerShell backtick (`` ` ``) for multi-line curl in a non-interactive session, or using single-quotes for JSON in PowerShell.

**Fix**: Keep curl commands on one line, use double-quotes for JSON with escaped inner quotes, or store the body in a variable:
```powershell
$body = '{"key": "value"}'
curl.exe -X POST http://localhost:8002/auth/login -H "Content-Type: application/json" -d $body
```

---

### Error: `No module named 'redis'` or `No module named 'pika'`

**Fix**: Install in your local venv:
```powershell
pip install redis pika
```

---

### Error: `{"detail":"Not Found"}` on `/kb/status`

**Cause**: Hitting the Nginx path directly on the service port.  
**Fix**: Use `curl.exe http://localhost:8007/status` (no `/kb/` prefix when going direct).

---

### Error: Empty reply on `/pipeline/health`

**Cause**: The agents service exited during startup.  
**Fix**:
1. `docker logs aihps_svc_agents --tail 100` — read the error
2. Common causes: sentence-transformers download failed, OpenAI API key missing, DB unreachable from container
3. Restart after fixing: `docker compose restart aihps_svc_agents` (from `docker/` folder)

---

### Error: `Connection refused` to PostgreSQL from containers

**Cause**: Containers connect to `host.docker.internal:5432`. Your local PostgreSQL must be running and listening on all interfaces.

**Fix**: Verify PG is running in Windows services, and the pg_hba.conf allows connections from Docker's network range.

---

## Swagger UI (interactive testing)

Each service exposes Swagger UI for interactive browser-based testing:

| Service | URL |
|---|---|
| Auth (SVC-02) | http://localhost:8002/docs |
| Procedures (SVC-03) | http://localhost:8003/docs |
| Analytics (SVC-05) | http://localhost:8005/docs |
| Audit (SVC-06) | http://localhost:8006/docs |
| KB Sync (SVC-07) | http://localhost:8007/docs |
| Agents Pipeline | http://localhost:8020/docs |

> You already confirmed `http://localhost:8002/docs` works. Use Swagger UI to test endpoints interactively — it's easier than crafting curl commands manually. Click "Authorize" at the top to enter your JWT token once, and all requests will include it automatically.

---

*End of AI-HPS Backend Testing Guide*
