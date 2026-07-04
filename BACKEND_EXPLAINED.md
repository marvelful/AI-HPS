# AI-HPS Backend — Complete Explanation
> Every file, every role, every dependency, every communication path.  
> Written so anyone — technical or not — can understand exactly how this system works.

---

## How to Read This Document

Think of this hospital AI system like a **real hospital building**:
- The **front door** (Nginx) checks your ID before letting you in
- **Reception desks** (Services) handle specific departments
- The **switchboard** (RabbitMQ) routes internal messages
- The **bulletin board** (Redis) displays fast-changing information
- The **medical records room** (PostgreSQL) stores everything permanently
- The **AI doctors** (Agents) answer medical questions step by step

Every section below follows this format:
```
FILE PATH
│
├── What is this file? (the simple explanation)
├── What exactly does it do? (technical details)
├── What does it depend on? (other files it needs)
└── Who depends on it? (what would break without it)
```

---

# PART 1 — THE FOUNDATION (Setup & Configuration)

---

## `requirements.txt`
**Path:** `backend/requirements.txt`

### What is this file?
It is a **shopping list**. Before the system can run, Python must download and install a set of tools. This file lists all those tools with their exact versions.

### What exactly does it do?
When someone runs `pip install -r requirements.txt`, Python downloads and installs every tool listed. Think of it like an IKEA instruction sheet that says "you need these screws, these bolts, and this wrench before you can build."

| Tool | What it is / Why we need it |
|---|---|
| `fastapi` | The framework that powers all 6 services — it handles web requests |
| `uvicorn` | The engine that runs FastAPI (like a car engine for the FastAPI body) |
| `sqlalchemy` | The translator between Python objects and database rows |
| `psycopg2-binary` | The actual connector to PostgreSQL (the database driver) |
| `alembic` | The tool that creates/updates database tables (schema migrations) |
| `python-jose` | Handles JWT tokens (digital ID cards for logged-in users) |
| `bcrypt` | Hashes (scrambles) passwords so they can't be read even if stolen |
| `redis` | Lets Python talk to the Redis cache server |
| `pika` / `aio-pika` | Lets Python send and receive messages via RabbitMQ |
| `langgraph` | The framework that wires the 5 AI agents into a pipeline |
| `langchain-openai` | Connects the agents to OpenAI's GPT models |
| `sentence-transformers` | The AI model that converts text to numbers (for search) |
| `langdetect` | Detects whether a query is English or French |
| `pydantic` | Validates that data has the right shape before it's used |
| `pdfplumber` | Reads text out of PDF files (for ingesting procedures) |
| `numpy` | Math library for fast vector calculations (similarity search) |
| `httpx` | Lets services make HTTP calls to each other |

### Dependencies
- **Depends on:** Nothing (it's the root)
- **Everything depends on it:** Every single Python file in the project

---

## `shared/config.py`
**Path:** `backend/shared/config.py`

### What is this file?
It is the **master settings panel**. Every service and every agent reads their settings from this one place. Instead of each file having its own hardcoded passwords and URLs, they all ask config.py.

### What exactly does it do?
It reads a `.env` file and environment variables, then makes those values available as a Python object called `settings`. Any file can do `from shared.config import settings` and then use `settings.DATABASE_URL`, `settings.SECRET_KEY`, etc.

| Setting | What it controls |
|---|---|
| `DATABASE_URL` | Where PostgreSQL is and how to connect |
| `REDIS_URL` | Where Redis is (default: localhost:6379) |
| `RABBITMQ_URL` | Where RabbitMQ is (includes username/password) |
| `SECRET_KEY` | The master password used to sign and verify JWT tokens |
| `ALGORITHM` | "HS256" — the math formula used to sign tokens |
| `ACCESS_TOKEN_EXPIRE_MINUTES_STAFF` | Staff tokens last 480 minutes (8 hours) |
| `ACCESS_TOKEN_EXPIRE_MINUTES_ADMIN` | Admin tokens last 240 minutes (4 hours) |
| `MAX_LOGIN_ATTEMPTS` | 5 failed logins → account locked |
| `LOCKOUT_MINUTES` | 30 minutes of lockout after too many failures |
| `OPENAI_API_KEY` | The API key to access GPT-4o-mini (can be empty for offline mode) |
| `PHASE1_DEPARTMENTS` | Comma-separated list of the 6 hospital departments |

### Dependencies
- **Depends on:** `pydantic-settings` (the tool that reads .env files), `.env` file
- **Used by:** Every service and every agent (it is the most widely imported file in the project)

---

## `shared/database.py`
**Path:** `backend/shared/database.py`

### What is this file?
It is the **database connection factory**. It creates the connection to PostgreSQL and provides a way for every service to get a database session (a temporary working connection).

### What exactly does it do?
1. Creates one `engine` — the permanent pipeline to PostgreSQL using the `DATABASE_URL` from config.py
2. Creates a `SessionLocal` factory — every time a service needs to talk to the database, it calls this to get a fresh session
3. Defines `Base` — the parent class that all database table models inherit from
4. Defines `get_db()` — a FastAPI dependency (a reusable helper function that routes call automatically). It opens a session before a request, gives it to the route, then closes it after — even if the request crashes

**Connection pool settings:**
- `pool_size=10`: Keep 10 permanent connections open (faster than reconnecting each time)
- `max_overflow=20`: Allow up to 20 extra connections if under heavy load
- `pool_pre_ping=True`: Before using an old connection, check it's still alive

### Dependencies
- **Depends on:** `shared/config.py` (for DATABASE_URL), `sqlalchemy`
- **Used by:** All 6 services, all models, `check_setup.py`, all test scripts

---

# PART 2 — THE DATABASE TABLES (Models)

> These files define the structure of the database — what tables exist and what columns they have. They do NOT contain logic, only structure.

---

## `shared/models/auth.py`
**Path:** `backend/shared/models/auth.py`

### What is this file?
It defines the **3 tables that manage users and logins**.

### Tables

**Table 1: `User`** (stored in schema `aihps_auth`)
This is the staff register. One row per hospital staff member.
| Column | Meaning |
|---|---|
| `id` | Unique ID (UUID, auto-generated) |
| `email` | Login email address (must be unique) |
| `employee_id` | Hospital employee number (optional) |
| `full_name` | Staff member's name |
| `password_hash` | The scrambled (bcrypt) version of the password — never stored plain |
| `role` | What they are: doctor, nurse, admin, pharmacist, etc. |
| `department_id` | Which department they belong to (links to Departments table) |
| `is_active` | True = can log in; False = account disabled |
| `failed_attempts` | Count of wrong passwords since last success |
| `lockout_until` | If locked out, when the lockout expires |
| `last_login` | Timestamp of the most recent successful login |

**Table 2: `LockoutRecord`**
A history log of every time an account was locked for too many failed attempts.

**Table 3: `TokenBlacklist`**
When a user logs out, their token ID (JTI) is stored here. Before accepting any request, the system checks if the token is in this table (= revoked).

### Dependencies
- **Depends on:** `shared/database.py` (for Base), references `aihps_procedures.departments` table
- **Used by:** `svc02_auth` service (all authentication operations)

---

## `shared/models/procedures.py`
**Path:** `backend/shared/models/procedures.py`

### What is this file?
It defines the **7 tables that store all medical content** — procedures, departments, approval records, etc.

### Tables

**Table 1: `Department`**
The 6 hospital departments (Blood Bank, ICU, Surgery, Maternity, Emergency, Infection Control).
Each department has `informal_names` (aliases like "icu", "intensive care") used for AI search.

**Table 2: `Category`**
Procedure categories (like "Blood Products", "Surgical Protocols"). Can have parent categories (hierarchical).

**Table 3: `ProcedureEntry`**
The heart of the system. One row per medical procedure.
| Column | Meaning |
|---|---|
| `title` | Procedure name |
| `summary` | Short description |
| `content` | Full procedure text |
| `steps` | JSON list of step-by-step instructions |
| `stream_target` | A (patients), B (staff), or both |
| `applicable_roles` | Which staff roles can see this (e.g., only nurses, only doctors) |
| `risk_level` | low / medium / high / critical |
| `status` | draft → pending → published → archived (the lifecycle) |
| `language` | EN or FR |
| `search_vector` | Auto-updated PostgreSQL full-text search index |
| `version` | Increments each time procedure is approved and published |

**Table 4: `ProcedureVersion`**
An immutable snapshot (frozen copy) of a procedure taken at the moment it is submitted for approval. If someone approves version 3, this table stores exactly what version 3 looked like.

**Table 5: `ProcedureApproval`**
Every approval or rejection decision. A procedure needs **2 distinct approvals** from different approvers to be published. Each vote is a row here.

**Table 6: `NavigationPath`**
Physical directions from a location to a department. For example: "From main entrance to ICU: go through corridor B, take elevator to floor 3, turn left." Available in EN and FR.

**Table 7: `EmergencyContent`**
Pre-written emergency responses stored in the database and pre-loaded into Redis at startup. Organized by language (EN/FR) and stream (A/B). Used by AGENT-E to respond instantly to emergencies without calling the AI.

### Dependencies
- **Depends on:** `shared/database.py`, references `aihps_auth.users` table
- **Used by:** `svc03_procedures`, `svc07_kb_sync` (to read published procedures), `agents/agent_e.py` (emergency content), `agents/agent_n.py` (navigation paths)

---

## `shared/models/analytics.py`
**Path:** `backend/shared/models/analytics.py`

### What is this file?
It defines **3 tables that record usage data** for reporting and improvement.

### Tables

**Table 1: `QueryEvent`**
Every time someone asks a question, a row is inserted here.
Records: the question, the platform (web/sms/ussd), the stream (A/B), whether an answer was found, how long it took, what intent was detected.

**Table 2: `ContentGap`**
When the AI cannot find an answer (score below threshold), the query is recorded here. Over time, this list tells content editors what procedures are missing from the knowledge base.

**Table 3: `WeeklyReport`**
Pre-computed summary statistics stored as JSON every week.

### Dependencies
- **Depends on:** `shared/database.py`
- **Used by:** `svc05_analytics` (to read data), `agents/agent_p.py` (to write content gaps)

---

## `shared/models/audit.py`
**Path:** `backend/shared/models/audit.py`

### What is this file?
It defines **1 table: the tamper-proof audit log**.

### Table: `AuditLog`
Every significant action in the system (user created, procedure approved, emergency triggered, etc.) produces a row here. What makes it special:
- Each row contains an **HMAC-SHA256 signature** computed from the event's key fields
- You can call the `/events/{id}/verify` endpoint to recompute the signature and confirm the record has never been modified
- This satisfies hospital compliance and legal requirements

| Column | Meaning |
|---|---|
| `event_type` | What happened (e.g., "procedure.approved") |
| `user_id` | Who did it |
| `entity_type` | What was affected (e.g., "procedure") |
| `entity_id` | The ID of the thing affected |
| `changes` | JSON diff of what changed |
| `event_metadata` | Contains the HMAC signature and timestamp |
| `ip_address` | Where the request came from |

### Dependencies
- **Depends on:** `shared/database.py`
- **Used by:** `svc06_audit`

---

## `shared/models/notifications.py`
**Path:** `backend/shared/models/notifications.py`

### What is this file?
It defines **2 tables for mobile push notifications** (future use).

- `PushRegistration`: stores Expo push tokens for mobile devices
- `Notification`: stores notification history (what was sent, when, was it read)

### Dependencies
- **Depends on:** `shared/database.py`, `aihps_auth.users`
- **Used by:** Not yet fully wired (infrastructure for future mobile notifications)

---

## `shared/events.py`
**Path:** `backend/shared/events.py`

### What is this file?
It is the **inter-service messaging hub**. When Service A needs to tell Service B something happened, it uses this file.

### What exactly does it do?

**Function 1: `publish_audit(event_type, user_id, ...)`**
- Sends a message to RabbitMQ (the message queue)
- Queue name: `audit.events`
- SVC-06 is always listening on that queue
- The message is **durable** (won't be lost even if RabbitMQ restarts)
- Runs in a **daemon thread** — this means the service does NOT wait for the message to be delivered; it fires and forgets, so requests stay fast

**Function 2: `publish_redis(channel, payload)`**
- Sends a message to a Redis Pub/Sub channel
- SVC-07 is subscribed to channels: `procedure.published`, `procedure.updated`, `procedure.archived`, `navigation.updated`
- When a procedure is published, SVC-03 calls this → SVC-07 auto-updates its search index

**How the threads work:**
1. A service finishes a database operation (e.g., approves a procedure)
2. It calls `publish_audit(...)` — this starts a new background thread
3. The background thread connects to RabbitMQ and sends the message
4. The original request returns immediately to the user — no waiting
5. SVC-06 consumer picks up the message seconds later and writes to the audit log

### Dependencies
- **Depends on:** `shared/config.py` (for RABBITMQ_URL, REDIS_URL), `pika`, `redis`
- **Used by:** `svc03_procedures` (procedure events), `agents/shared/audit.py` (emergency audit), indirectly by all services

---

# PART 3 — THE 6 SERVICES

> Services are the publicly-accessible parts of the system. Each is a separate FastAPI web application running in its own Docker container.

---

## SERVICE 1: SVC-02 — Auth & RBAC
**Files:** `services/svc02_auth/main.py`, `router.py`, `service.py`, `schemas.py`, `dependencies.py`  
**Port:** 8002

### What is this service?
The **security checkpoint**. Every person who uses the system must first prove who they are through this service. It also enforces role-based access (a nurse cannot do what an admin can).

---

### `svc02_auth/main.py`
The startup file. Creates the FastAPI app, enables CORS (allows web browsers from any origin to call this service), and plugs in the router.

---

### `svc02_auth/router.py`
Defines all the URL endpoints. Think of it as the **menu of available actions**:

| Endpoint | Action | Who can use it |
|---|---|---|
| `POST /auth/login` | Submit email+password, get a JWT token | Anyone |
| `POST /auth/logout` | Revoke (invalidate) a token | Logged-in user |
| `GET /auth/me` | See your own profile | Logged-in user |
| `POST /auth/users` | Create a new staff account | Admins only |
| `GET /auth/users` | List all staff accounts | Admins only |
| `GET /auth/users/{id}` | See one staff account | Admins only |
| `PATCH /auth/users/{id}` | Update a staff account | Admins only |
| `POST /auth/users/{id}/reset-password` | Reset someone's password | Admins only |
| `GET /auth/validate` | Internal check (used by Nginx only) | Nginx only |
| `POST /auth/change-password` | Change your own password | Logged-in user |

---

### `svc02_auth/service.py`
The **logic brain** of authentication. Contains all the real work:

**Login Flow:**
1. User sends email + password
2. `authenticate_user()` finds the user in DB
3. Checks if account is locked (failed_attempts >= 5 and within lockout period)
4. `verify_password()` compares the plain password against the stored bcrypt hash
5. If wrong password: increment `failed_attempts`, lock if threshold reached
6. If correct: reset `failed_attempts`, update `last_login`
7. `create_access_token()` builds a JWT token containing: user ID, role, email, a unique JTI (token ID), and expiry time

**Logout Flow:**
1. Token's JTI extracted
2. Stored in PostgreSQL `TokenBlacklist` table
3. Also stored in Redis as `blacklist:token:{jti}` with TTL equal to the remaining token lifetime
4. All future requests with this token are rejected

**Token Verification:**
- Redis is checked first (fast cache)
- If not in Redis, fall back to database check
- This hybrid approach keeps logout fast without hitting the DB on every request

**Role Escalation Protection:**
- Only a `super_admin` can create or promote to admin roles
- A `department_admin` cannot create another admin

---

### `svc02_auth/schemas.py`
Defines the **exact shape of data** going in and out of the auth service. Pydantic validates every request against these schemas before the route handler sees it. For example, `password` must be at least 8 characters; if not, a `422 Unprocessable Entity` error is returned automatically.

---

### `svc02_auth/dependencies.py`
Defines **reusable guards** that routes attach to protect themselves:

- `get_current_user()`: Reads the `Authorization: Bearer <token>` header, decodes the JWT, checks the blacklist, returns the User object
- `require_admin()`: Calls `get_current_user()` then additionally checks the role is admin-level
- `require_super_admin()`: Same but stricter

Any route that includes `current_user: User = Depends(get_current_user)` in its parameters is automatically protected.

### SVC-02 Dependency Chain
```
main.py
  └─> router.py
        ├─> service.py
        │     ├─> shared/config.py (SECRET_KEY, ALGORITHM, lockout settings)
        │     ├─> shared/models/auth.py (User, TokenBlacklist tables)
        │     └─> redis (blacklist caching)
        ├─> schemas.py (data validation)
        └─> dependencies.py
              ├─> shared/config.py
              ├─> shared/models/auth.py
              └─> redis
```

---

## SERVICE 2: SVC-03 — Procedure Management
**Files:** `services/svc03_procedures/main.py`, `router.py`, `service.py`, `schemas.py`  
**Port:** 8003

### What is this service?
The **content management system** for all medical procedures. It handles the full lifecycle of a procedure from creation to publication, including a 2-person approval workflow.

---

### The Procedure Lifecycle (State Machine)

```
  [Admin creates]
       │
       ▼
    DRAFT ──────────────────────────────────────────────── (can be edited)
       │
  [Submitted for approval]
       │
       ▼
   PENDING ──────────────────────────────────────────────── (locked, no edits)
       │
       ├─ Rejected by anyone? ──────────────> back to DRAFT (approvals cleared)
       │
       ├─ 1st approval (approver can't be the author)
       │
       └─ 2nd approval (must be a different person)
               │
               ▼
          PUBLISHED ──────────────────────────────────────── (visible to AI)
               │
          [Admin archives]
               │
               ▼
          ARCHIVED ───────────────────────────────────────── (hidden from AI)
```

---

### `svc03_procedures/router.py`
Endpoints for managing departments, categories, navigation paths, and procedures. After any state change, it fires two background messages:
1. `publish_audit(...)` → goes to RabbitMQ → SVC-06 logs it
2. `publish_redis(channel, ...)` → goes to Redis Pub/Sub → SVC-07 updates search index

---

### `svc03_procedures/service.py`
The approval logic lives here:
- A procedure can only be submitted if it's a `draft`
- Creating a `ProcedureVersion` (snapshot) happens at submit time
- An approver cannot approve their own procedure
- An approver cannot vote twice on the same procedure cycle
- On rejection: all existing approvals for that cycle are deleted and status reverts to draft
- On 2nd approval: status becomes `published`, version number increments, `published_at` timestamp set

### SVC-03 Dependency Chain
```
main.py
  └─> router.py
        ├─> service.py
        │     ├─> shared/models/procedures.py (all procedure tables)
        │     ├─> shared/models/auth.py (User, for permission checks)
        │     └─> shared/events.py (to fire RabbitMQ + Redis events)
        └─> schemas.py
```

---

## SERVICE 3: SVC-05 — Analytics
**Files:** `services/svc05_analytics/main.py`, `router.py`, `service.py`, `schemas.py`  
**Port:** 8005

### What is this service?
The **reporting dashboard backend**. It is purely read-only — it never modifies any data. It answers questions like "How many queries were answered last week?" and "What are users asking about that we don't have procedures for?"

---

### Endpoints
| Endpoint | What it returns |
|---|---|
| `GET /analytics/queries` | Raw query log (filterable by platform, stream, intent) |
| `GET /analytics/gaps` | Content gaps — queries that got no answer |
| `GET /analytics/summary` | Aggregated stats: totals, success rate, average response time, top intents |

### SVC-05 Dependency Chain
```
main.py
  └─> router.py
        └─> service.py
              ├─> shared/models/analytics.py (QueryEvent, ContentGap tables)
              └─> shared/database.py (DB session)
```

---

## SERVICE 4: SVC-06 — Audit & Compliance
**Files:** `services/svc06_audit/main.py`, `router.py`, `service.py`, `consumer.py`, `schemas.py`  
**Port:** 8006

### What is this service?
The **tamper-proof black box recorder**. Every significant action in the system gets logged here with a cryptographic signature that proves it hasn't been altered.

---

### Two Ways Audit Events Are Written

**Way 1: Via RabbitMQ Consumer (background)**
- SVC-06 starts a background thread at startup that permanently listens on the `audit.events` queue
- When other services fire `publish_audit(...)`, this consumer receives the message
- It validates the message format, then calls `write_audit_event()`
- This is how 99% of audit records are created

**Way 2: Via HTTP POST `/events/`**
- Admins can write audit events directly via the API
- Used for manual compliance entries

### The HMAC-SHA256 Signature
When writing an audit record, `service.py` computes:
```
canonical = f"{event_type}|{user_id}|{entity_id}|{timestamp}"
signature = HMAC-SHA256(canonical, SECRET_KEY)
```
The signature is stored in `event_metadata.hmac_sha256`. To verify: recompute with the same inputs and compare. If someone modified the database row, the signature won't match.

### `svc06_audit/consumer.py`
The RabbitMQ consumer thread. It:
1. Connects to RabbitMQ on startup
2. Declares the `audit.events` queue (durable, survives RabbitMQ restart)
3. Sets `prefetch_count=5` (processes 5 messages at a time)
4. For each message: parse JSON → validate schema → write to DB → acknowledge
5. If connection drops: waits 5 seconds and reconnects (auto-recovery)

### SVC-06 Dependency Chain
```
main.py
  └─> lifespan (starts/stops consumer.py thread)
  └─> router.py
        └─> service.py
              ├─> shared/models/audit.py (AuditLog table)
              ├─> shared/config.py (SECRET_KEY for HMAC)
              └─> shared/database.py

consumer.py
  ├─> shared/config.py (RABBITMQ_URL)
  ├─> service.py (write_audit_event)
  └─> pika (RabbitMQ client)
```

---

## SERVICE 5: SVC-07 — Knowledge Base Sync
**Files:** `services/svc07_kb_sync/main.py`, `router.py`, `service.py`, `subscriber.py`, `schemas.py`  
**Port:** 8007

### What is this service?
The **search engine**. It maintains a vector index (a mathematical representation of all published procedures) that enables the AI to find relevant procedures by meaning, not just keyword matching.

---

### What is a Vector Index?
Imagine converting every procedure into a list of 384 numbers (a "vector") that captures its meaning. "Blood transfusion protocol" and "how to give blood" become similar number arrays. When a user asks a question, that question is also converted to 384 numbers, and the system finds the procedures with the most similar number arrays (cosine similarity). This is semantic search — finding by meaning.

### The Embedding Model
Uses `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`:
- Supports both English and French (multilingual)
- Produces 384-dimensional vectors
- Normalizes vectors (length = 1) so cosine similarity = dot product = fast

### How Content Gets Into the Index

**Automatic Path (triggered by SVC-03):**
1. Admin publishes a procedure in SVC-03
2. SVC-03's router fires: `publish_redis("procedure.published", {"entry_id": "..."})`
3. SVC-07's subscriber thread receives this message
4. Subscriber calls `kb.sync_procedure(entry_id)` automatically
5. Procedure text is chunked → embedded → added to index → index saved to disk

**Manual Path (via API):**
- `POST /kb/sync/{entry_id}` → re-sync a single procedure
- `POST /kb/sync/rebuild` → rebuild entire index from scratch

### Text Chunking
Procedures can be long. The service splits them into overlapping chunks:
- Each chunk: ~2000 characters
- Overlap: ~200 characters (so context isn't lost at boundaries)
- Each chunk is embedded separately and stored with metadata (title, stream, language, roles, etc.)

### Index Storage
The index is saved to disk as:
- `backend/kb_index/aihps.npy` — the actual vectors (numpy array)
- `backend/kb_index/aihps.json` — the metadata for each vector

These files are loaded into memory at startup. All searches happen in memory (no disk reads during queries = fast).

### `svc07_kb_sync/subscriber.py`
A Redis Pub/Sub consumer thread that:
- Subscribes to: `procedure.published`, `procedure.updated`, `procedure.archived`, `navigation.updated`
- On `published` or `updated`: calls `sync_procedure(entry_id)`
- On `archived`: calls `remove_procedure(entry_id)`
- On connection failure: waits 5 seconds and reconnects

### SVC-07 Dependency Chain
```
main.py
  └─> lifespan (loads index + starts subscriber)
  └─> router.py
        └─> service.py
              ├─> shared/models/procedures.py (ProcedureEntry, to read published procedures)
              ├─> shared/database.py
              └─> sentence-transformers (embedding model)

subscriber.py
  ├─> shared/config.py (REDIS_URL)
  ├─> service.py (sync/remove functions)
  └─> redis (pub/sub)
```

---

# PART 4 — THE AI AGENT PIPELINE

> This is the most complex part. 5 specialized AI agents are connected in a chain. Each one does one job and passes the result to the next.

---

## Overview: How a Question Travels Through the Agents

```
USER asks: "What is the blood transfusion procedure?"
                │
                ▼
         [SVC-AGENTS receives it]
                │
                ▼
         ┌──────────────┐
         │   AGENT-R    │  ← "What language? What type of question?"
         │   (Router)   │
         └──────┬───────┘
                │
        ┌───────┼───────────────────────────┐
        │       │                           │
    Emergency  Navigation              Procedure/Info
        │       │                           │
        ▼       ▼                           ▼
   AGENT-E  AGENT-N                    AGENT-C (optional)
 (Zero AI)  (Lookup)               (Reformulate + History)
        │       │                           │
        └───────┴─────────────┬─────────────┘
                              │
                              ▼
                          AGENT-P
                     (Find procedure,
                      generate answer)
                              │
                              ▼
                          AGENT-O
                     (Format for
                      web/sms/ussd/etc.)
                              │
                              ▼
                       ANSWER returned
```

---

## `agents/state.py`
**Path:** `backend/agents/state.py`

### What is this file?
It is the **shared memory clipboard** that all agents read from and write to. As a question moves through the pipeline, each agent adds its results to this shared state object. The next agent picks up where the previous one left off.

### State Fields (what the clipboard holds)

**Set by the caller (user input):**
- `raw_query`: the original question text
- `platform`: web, mobile, sms, ussd, or whatsapp
- `stream`: A (patient) or B (staff)
- `user_id`: who is asking
- `user_role`: their job title (nurse, doctor, etc.)
- `session_id`: for multi-turn conversations (chatbot mode)
- `chatbot_mode`: True if this is part of a conversation

**Written by AGENT-R:**
- `is_emergency`: True if emergency keywords detected
- `language`: EN or FR
- `intent`: navigation, information, procedure, or unknown

**Written by AGENT-C:**
- `reformulated_query`: cleaner version of the question for better search
- `dept_info`: department info if intent was "information"
- `chat_history`: conversation history from Redis

**Written by AGENT-E:**
- `emergency_content`: pre-cached emergency response

**Written by AGENT-N:**
- `navigation_result`: directions to a department

**Written by AGENT-P:**
- `procedure_result`: the found procedure + generated answer
- `had_result`: True if a good answer was found

**Written by AGENT-O (final output):**
- `formatted_output`: the final answer formatted for the platform
- `output_type`: text, json, sms, ussd_screens

---

## `agents/graph.py`
**Path:** `backend/agents/graph.py`

### What is this file?
It is the **flowchart / wiring diagram** for the agent pipeline. LangGraph uses this file to know which agent runs when, and what decision routes to which next step.

### The Full Decision Tree
```
START
  └─> AGENT-R
        ├─ is_emergency = True  ──────────────> AGENT-E → AGENT-O → END
        ├─ intent = navigation  ──────────────> AGENT-N → AGENT-O → END
        ├─ intent = information ──────────────> AGENT-C
        │                                           ├─ found dept info ─> AGENT-O → END
        │                                           └─ no dept info ───> AGENT-P → AGENT-O → END
        ├─ intent = procedure
        │    ├─ chatbot_mode = True  ──────────> AGENT-C → AGENT-P → AGENT-O → END
        │    └─ chatbot_mode = False ──────────> AGENT-P → AGENT-O → END
        └─ intent = unknown  ─────────────────> AGENT-O → END
```

This means:
- Emergency questions never go through the AI search — they get instant pre-written responses
- Navigation questions go to a lookup — no AI generation
- Procedure questions are the most complex path
- Unknown intent → AGENT-O sends a polite "I didn't understand" message

---

## `agents/agent_r.py` — AGENT-R: Router & Intent Classifier
**Path:** `backend/agents/agent_r.py`

### What is this file?
The **traffic director**. It reads the incoming question and decides: what language is this, is this an emergency, and what type of question is this?

### Step 1: Language Detection
- Uses the `langdetect` library
- If the language is detected as French with ≥ 70% confidence → `language = FR`
- Otherwise → `language = EN`
- Language is used later by AGENT-P and AGENT-O to generate/format responses in the right language

### Step 2: Emergency Detection
Runs a regex pattern match against the query:
- **English keywords:** emergency, help me, dying, cardiac arrest, heart attack, stroke, choking, seizure, overdose, bleeding, unconscious, not breathing, collapse, ambulance
- **French keywords:** urgence, secours, aidez-moi, mourir, arrêt cardiaque, avc, s'étouffe, convulsions, saignement, inconscient
- If any match → `is_emergency = True` → pipeline routes to AGENT-E immediately

### Step 3: Intent Classification
**Method 1 (no API key): Rule-based regex**
- Navigation keywords → `navigation`
- Information keywords (hours, contact, services) → `information`
- Procedure keywords (protocol, guideline, steps, blood, surgery) → `procedure`
- Nothing matches → `unknown`

**Method 2 (with OPENAI_API_KEY): LLM classification**
- Sends query to GPT-4o-mini (only first 500 characters)
- Caches result in Redis for 60 seconds (same query → same cached result, no extra API calls)
- Falls back to rule-based if API call fails

### Dependencies
- **Depends on:** `agents/state.py`, `shared/config.py`, `redis`, `langdetect`, LangChain OpenAI

---

## `agents/agent_e.py` — AGENT-E: Emergency Agent
**Path:** `backend/agents/agent_e.py`

### What is this file?
The **instant emergency responder**. It operates under strict rules:
- Zero AI calls (no GPT, no embeddings)
- Must respond in under 3 seconds
- Content is pre-loaded into Redis memory at system startup

### How Pre-warming Works
At system startup (main.py lifespan), `warm_cache()` is called:
1. Queries all `EmergencyContent` rows from PostgreSQL
2. For each row, stores it in Redis with key: `aihps:emergency:{language}:{stream}`
3. TTL: 3600 seconds (1 hour, auto-refreshed)
4. Result: emergency responses are in RAM, ready in milliseconds

### How It Responds
When AGENT-R detects `is_emergency = True`:
1. Try Redis: `GET aihps:emergency:{language}:{stream}`
2. If cache miss: fallback to DB query
3. If DB also empty: try `stream = both`
4. If still nothing: use a hardcoded fallback message ("Please contact emergency services immediately")
5. Log the activation to audit log via RabbitMQ (for compliance)
6. Return: `{emergency_content: {content, contacts, directions}}`

### Why This Design?
Emergency queries must never be slow. If the AI is loading, if the database is slow, if the API key is expired — none of that matters. The emergency response is always available because it lives in RAM.

### Dependencies
- **Depends on:** `agents/state.py`, `shared/models/procedures.py` (EmergencyContent), `shared/config.py`, `redis`, `agents/shared/audit.py`

---

## `agents/agent_n.py` — AGENT-N: Navigation Agent
**Path:** `backend/agents/agent_n.py`

### What is this file?
The **hospital map reader**. Fully deterministic (no randomness, no AI generation). Given a question about getting somewhere, it looks up the physical directions.

### How It Works
1. Calls `find_department(raw_query)` from `agents/shared/embeddings.py`
   - This uses semantic similarity against department name embeddings
   - Threshold: 0.65 similarity (if lower → "department not found")
2. If department found: queries `NavigationPath` table for that department
   - Prefers the user's language (EN or FR)
   - Falls back to any language if preferred not found
3. Returns: `{found, department_name, from_location, steps, estimated_time_minutes, language}`
4. If no match: returns `{found: False, message: "I couldn't identify the department..."}`

### Dependencies
- **Depends on:** `agents/state.py`, `agents/shared/embeddings.py`, `shared/models/procedures.py` (NavigationPath), `shared/database.py`

---

## `agents/agent_c.py` — AGENT-C: Conversational Agent
**Path:** `backend/agents/agent_c.py`

### What is this file?
The **conversation manager**. It has two different jobs depending on the intent:

### Job 1: Information Intent (no AI)
When someone asks "what are the ICU's operating hours?":
1. Calls `find_department(raw_query)` to identify which department
2. If found: returns the department's details directly from DB (services, hours, location, contact)
3. No AI generation needed — it's just a database lookup

### Job 2: Chatbot Path (with AI)
When chatbot_mode is True (multi-turn conversation):
1. Load conversation history from Redis: `aihps:session:{session_id}` (last 10 messages)
2. Send the current query + last 6 messages (3 turns) to GPT-4o-mini
3. GPT reformulates the query to be precise and searchable
   - Example: "that procedure I asked about before" → "ICU central line insertion protocol"
4. GPT also returns a confidence score (0.0–1.0)
5. If confidence < 0.60: returns a clarification prompt ("Could you specify which procedure?")
6. Save updated history back to Redis (TTL: 30 minutes)
7. Pass `reformulated_query` to AGENT-P

### Dependencies
- **Depends on:** `agents/state.py`, `agents/shared/embeddings.py`, `shared/models/procedures.py` (Department), `shared/config.py`, `redis`, LangChain OpenAI

---

## `agents/agent_p.py` — AGENT-P: Procedure Intelligence Agent
**Path:** `backend/agents/agent_p.py`

### What is this file?
The **medical knowledge engine**. This is the core of the AI — it finds the most relevant procedures and generates a clinically appropriate answer.

### Step 1: Dual Search (Hybrid Retrieval)
Two search methods run in parallel:

**Semantic Search (via SVC-07)**
- Converts the query to a 384-dim vector
- Finds the top 20 procedure chunks with highest cosine similarity
- Filters by: stream (A or B), language, and for Stream B: user's role must be in `applicable_roles`

**Full-Text Search (via PostgreSQL)**
- Uses PostgreSQL's built-in `tsvector` + `plainto_tsquery` (keyword matching)
- Finds top 10 procedures containing the exact words
- Same stream/role filters apply

### Step 2: Hybrid Merging
Results from both searches are combined:
- Semantic score weight: **70%**
- Full-text score weight: **30%**
- Top 5 unique procedures selected

Why both? Semantic search is great for meaning but can miss exact technical terms. Full-text search catches exact phrases but misses synonyms. Together they're better than either alone.

### Step 3: Similarity Threshold Check
- If the top result's score < **0.95** → the system considers the answer unreliable
- Writes the query to `ContentGap` table (so editors know what to add)
- Returns `{had_result: False}` — the system says "I don't have a confident answer" rather than hallucinating

### Step 4: Answer Generation
Top 5 chunks (up to 4000 characters total) are sent to GPT-4o-mini with a carefully crafted prompt:

**Stream A (patient-facing):**
- "Explain in plain language the patient can understand"
- Adds medical disclaimer
- Returns: disclaimer, summary, key_steps, escalation

**Stream B (staff-facing):**
- "Provide clinical detail"
- Includes compliance notes, approval status, risk level
- Returns: summary, clinical_steps, compliance_notes, risk_level, citations, escalation

The AI is strictly instructed: "Answer ONLY from provided content." This prevents hallucination.

### Content Gap Recording
When `had_result = False`, a background thread calls `_write_gap(query)`:
- If this exact query has been asked before: increment `occurrence_count`
- If new: create a new `ContentGap` row
- Admins can see these via the analytics service to know what procedures to add

### Dependencies
- **Depends on:** `agents/state.py`, `svc07_kb_sync/service.py` (search), `shared/models/procedures.py`, `shared/models/analytics.py` (content gaps), `shared/database.py`, `shared/config.py`, LangChain OpenAI

---

## `agents/agent_o.py` — AGENT-O: Output Optimisation Agent
**Path:** `backend/agents/agent_o.py`

### What is this file?
The **translator between the AI and the real world**. The AI generates a JSON object with medical information. AGENT-O formats it correctly for each communication channel.

### The 5 Platform Formatters

**1. Web / Mobile → JSON output**
Returns the full structured JSON object. The frontend app renders it however it likes (with formatting, headers, bold text).

**2. WhatsApp → Rich text**
Converts the JSON to WhatsApp formatting:
- `*bold*` for section headers
- `_italics_` for disclaimers
- `•` bullet points for steps
- Maximum length applies (WhatsApp message limits)

**3. SMS → ≤155 characters**
Aggressively compressed:
- Takes disclaimer + first key step or summary
- Truncates with "…" if needed
- 155 chars is the limit because some SMS gateways split at 160 chars (5 chars for safety margin)

**4. USSD → Paginated screens**
USSD is the most constrained format (think: feature phone menus, *123#):
- Max 178 characters per screen
- Text is word-wrapped at 55 characters per line
- Each screen shows: (1/5) type indicator, content, "99. Next", "0. Home" navigation
- Returns a list of screens: `[{text, type: CON/END, screen: 1, total: 5}]`
- `CON` = "continue" (more screens follow), `END` = final screen

**5. Emergency (any platform)**
Special case: emergency content is NEVER compressed, summarized, or reformulated. The original emergency response text, contacts, and directions are passed through unchanged.

### Dependencies
- **Depends on:** `agents/state.py` (reads all upstream results)
- **Depends on nothing else** — it is a pure formatter with no I/O

---

## `agents/shared/embeddings.py`
**Path:** `backend/agents/shared/embeddings.py`

### What is this file?
The **department name search engine** used by AGENT-N and AGENT-C. It answers "which department is this query about?"

### How It Works
At startup, `load()` is called:
1. Fetches all active departments from DB
2. For each department: collects the formal name + all informal names (e.g., ["icu", "intensive care", "réanimation"])
3. Encodes all name variants using sentence-transformers → 384-dim vectors
4. Stores vectors + department metadata in memory

When `find_department(query, threshold=0.65)` is called:
1. **Strategy 1**: Substring check — does the query contain any department name/alias directly?
   - e.g., query contains "icu" → match Blood Bank → instant match, no math needed
2. **Strategy 2**: Semantic similarity — embed the query, compute cosine similarity against all department vectors
   - Returns the best match if score >= threshold (0.65)
   - Returns None if no match is confident enough

Thread-safe: uses `threading.Lock()` to prevent race conditions during reload.

### Dependencies
- **Depends on:** `shared/models/procedures.py` (Department), `shared/database.py`, `sentence-transformers`
- **Used by:** `agents/agent_n.py`, `agents/agent_c.py`

---

## `agents/shared/audit.py`
**Path:** `backend/agents/shared/audit.py`

### What is this file?
A thin wrapper around `shared/events.py` used specifically by the agents to emit audit events. Used by AGENT-E to log every emergency activation (compliance requirement).

### Dependencies
- **Depends on:** `shared/events.py`
- **Used by:** `agents/agent_e.py`

---

## `agents/main.py`
**Path:** `backend/agents/main.py`

### What is this file?
The **front door of the agent pipeline**. The only HTTP service in the agents package.

### Startup Sequence (lifespan)
1. `load_embeddings()` → loads department name vectors (for AGENT-N + AGENT-C)
2. `warm_cache()` → pre-loads emergency content into Redis (for AGENT-E)
3. `load_index()` → loads the KB vector index from disk (for AGENT-P)
4. `get_pipeline()` → compiles the LangGraph state machine (builds the wiring diagram into executable code)

If any of these fail, the service won't start properly (which is why `docker logs aihps_svc_agents` is useful when the service has issues).

### The Query Endpoint
`POST /pipeline/query` receives a `QueryRequest` and:
1. Builds the initial `AIHPSState` from the request fields
2. Runs `pipeline.invoke(state)` in a thread pool (LangGraph is synchronous; this prevents blocking the async server)
3. Fires a background thread to write a `QueryEvent` row to the analytics DB (fire-and-forget)
4. Returns `QueryResponse`

### Dependencies
- **Depends on:** `agents/state.py`, `agents/graph.py`, all 5 agent files, `agents/shared/embeddings.py`, `svc07_kb_sync/service.py`, `agents/agent_e.py` (warm_cache), `shared/models/analytics.py` (QueryEvent logging), `shared/database.py`

---

# PART 5 — INFRASTRUCTURE

---

## `docker/docker-compose.yml`

### What is this file?
The **blueprint for launching all 9 containers** together. Running `docker compose up -d` in the docker/ folder starts the entire system.

### Container Dependency Order
```
redis (starts first, health check)
rabbitmq (starts first, health check)
  └─ All 6 services wait for redis + rabbitmq to be healthy before starting
       └─ nginx (gateway) starts last, after all services are up
```

### Volume Mounts
- Redis: stores its data in a named volume so data survives container restarts
- SVC-07 / SVC-Agents: both mount `../backend/kb_index:/app/kb_index` — they share the same vector index folder. When SVC-07 saves the index, SVC-Agents can read it, and vice versa.

---

## `docker/nginx/nginx.conf`

### What is this file?
The **security guard and traffic router** at the front door (port 80).

### What It Does

**1. Rate Limiting (preventing abuse)**
- Login endpoint: 5 requests per minute per IP
- API endpoints: 10–20 requests per minute per IP depending on the service
- If exceeded: `429 Too Many Requests`

**2. Auth Validation (for every protected route)**
Before forwarding any request to a service:
1. Nginx makes an internal subrequest to `SVC-02/auth/validate`
2. SVC-02 validates the JWT token from the Authorization header
3. If valid: SVC-02 returns HTTP 200 with headers `X-User-ID` and `X-User-Role`
4. Nginx injects these headers into the forwarded request
5. Services trust these headers (they don't need to validate the token themselves)
6. If invalid: SVC-02 returns 401 → Nginx returns 401 to the caller (request never reaches the service)

**3. Request Routing**
| URL path | Forwarded to |
|---|---|
| `/api/auth/*` | `svc02_auth:8002` |
| `/api/procedures/*` | `svc03_procedures:8003` |
| `/api/analytics/*` | `svc05_analytics:8005` |
| `/api/audit/*` | `svc06_audit:8006` |
| `/api/kb/*` | `svc07_kb_sync:8007` |
| `/api/pipeline/*` | `svc_agents:8020` |

The pipeline has a 60-second timeout (AI responses can take a while).

---

## `run_dev.py`
**Path:** `backend/run_dev.py`

### What is this file?
A convenience script for **local development** (not using Docker). It starts all 6 services simultaneously using Python's `subprocess` module. Ctrl+C gracefully terminates all of them.

Use this when you want to develop and debug services locally without rebuilding Docker images.

---

## `check_setup.py`
**Path:** `backend/check_setup.py`

### What is this file?
A **pre-flight checklist**. Before running the system for the first time, run this to verify that PostgreSQL, Redis, and RabbitMQ are all accessible and correctly configured.

---

# PART 6 — SCRIPTS

---

## `scripts/ingest_procedures.py`

### What is this file?
The **content loader**. Run this when you have PDF procedure files and want to load them into the system.

### Workflow
1. Scans a `PROCEDURES/` folder organized by department subfolders
2. For each PDF: extracts text using `pdfplumber`
3. Creates a `ProcedureEntry` row in the database (status = draft)
4. After all PDFs processed: calls `rebuild_full_index()` on SVC-07 to embed everything

### Folder → Department Mapping
```
PROCEDURES/
  BLOODBANK/   → Blood Bank department
  ICU/         → ICU department
  SURGERY/     → Surgery department
  MATERNITY/   → Maternity department
  EMERGENCY/   → Emergency department
  INFECTION/   → Infection Control department
```

---

## `scripts/smoke_test.py`

### What is this file?
**Fast sanity checks** that take seconds and don't need a database. Run after any code change to catch obvious breakage.

Tests: Emergency keyword detection, language detection, SMS formatter (≤155 chars), USSD pagination, LangGraph graph compilation.

---

## `scripts/test_integration.py`

### What is this file?
**Deep tests** that verify the entire stack. Needs PostgreSQL and Redis running. Tests each agent individually, then tests the full pipeline end-to-end.

---

# PART 7 — THE BIG PICTURE: How Everything Connects

---

## Complete Data Flow for a Staff Query

**Scenario:** A nurse on WhatsApp asks "what are the steps for blood transfusion?"

```
1. NURSE sends message to WhatsApp gateway
   └─> WhatsApp gateway calls: POST http://hospital.example.com/api/pipeline/query
       Body: {raw_query: "blood transfusion steps", platform: "whatsapp", stream: "B",
              user_id: "nurse-uuid", user_role: "nurse", session_id: "s123", chatbot_mode: false}

2. NGINX receives request on port 80
   ├─> Rate limit check: OK (under 20/min)
   ├─> Auth subrequest to SVC-02: validates JWT token
   │   └─> SVC-02 returns X-User-ID: nurse-uuid, X-User-Role: nurse
   └─> Forwards to svc_agents:8020/pipeline/query with injected headers

3. SVC-AGENTS receives request
   └─> Builds initial AIHPSState, runs pipeline.invoke(state)

4. AGENT-R runs
   ├─> langdetect → EN (95% confidence)
   ├─> Emergency check → no emergency keywords
   └─> LLM intent → "procedure" (cached if same query within 60s)
       Writes to state: {is_emergency: false, language: EN, intent: procedure}

5. GRAPH routes to AGENT-P (chatbot_mode = false, so skip AGENT-C)

6. AGENT-P runs
   ├─> Semantic search: embeds query → calls SVC-07 search()
   │   └─> SVC-07 finds top 20 chunks, filters by stream=B and role=nurse
   ├─> Full-text search: SQL plainto_tsquery("blood transfusion")
   │   └─> Returns 10 matching procedures
   ├─> Hybrid merge: 70/30 weighting → top 5 results
   ├─> Top score = 0.97 ≥ 0.95 → proceed
   └─> GPT-4o-mini generates clinical answer from chunks
       System prompt: Stream B (staff), language EN
       Returns: {summary, steps, compliance_notes, risk_level: high, citations, escalation}
       Writes to state: {procedure_result: {...}, had_result: true}

7. AGENT-O runs
   ├─> Platform = whatsapp
   └─> _whatsapp formatter converts JSON to:
       "*Blood Transfusion Protocol*
       Steps:
       • 1. Verify patient ID and blood type...
       • 2. Cross-match blood product...
       _⚠ Clinical staff use only. Risk level: HIGH_"
       Writes to state: {formatted_output: "...", output_type: text}

8. SVC-AGENTS returns response to caller:
   {output: "...", output_type: text, is_emergency: false, had_result: true, language: EN, intent: procedure}

9. BACKGROUND THREADS fire:
   ├─> Thread A: write QueryEvent row to analytics DB (platform=whatsapp, had_result=true, response_time_ms=1240)
   └─> (no audit event for queries — only for admin actions)
```

---

## Complete Data Flow for an Emergency

**Scenario:** A visitor types "help me, the patient is not breathing" on USSD (*123#)

```
1. USSD gateway → POST /api/pipeline/query
   {raw_query: "help the patient is not breathing", platform: ussd, stream: A}

2. NGINX → auth → SVC-AGENTS

3. AGENT-R
   └─> Emergency regex matches "not breathing" → is_emergency = true
   └─> language = EN

4. GRAPH routes to AGENT-E (skips AGENT-C, AGENT-N, AGENT-P)

5. AGENT-E
   ├─> Redis GET aihps:emergency:EN:A → HIT (pre-loaded at startup)
   ├─> Retrieves: {content: "Call emergency services immediately...",
   │              contacts: {"emergency": "+237 680 000 000"},
   │              directions: "Go to emergency entrance, ground floor"}
   ├─> Fire-and-forget: publish to RabbitMQ audit.events
   │   └─> SVC-06 consumer writes AuditLog row (HMAC-signed) in background
   └─> Writes to state: {emergency_content: {...}}

6. AGENT-O
   ├─> is_emergency = true → bypass all compression
   ├─> Platform = ussd → paginate into screens
   └─> Screen 1: "EMERGENCY (1/2)\nCall +237 680 000 000\nimmediately\n99. Next  0. Home"
       Screen 2: "EMERGENCY (2/2)\nGround floor\nEmergency entrance\n0. Home"

7. Response returned: TOTAL TIME < 3 seconds (no AI calls on this path)
```

---

## Message Flow Diagram (All Services)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           NGINX (port 80)                               │
│  Rate limit + JWT validation via SVC-02 + routing                       │
└────────────┬─────────┬──────────┬────────┬───────────┬─────────────────┘
             │         │          │        │           │
             ▼         ▼          ▼        ▼           ▼
          SVC-02    SVC-03     SVC-05   SVC-06      SVC-07     SVC-AGENTS
          Auth    Procedures  Analytics  Audit      KB Sync     Pipeline
          :8002     :8003       :8005    :8006       :8007        :8020
             │         │                  ▲           ▲             │
             │         │                  │           │             │
             │         ├──RabbitMQ───────►│           │             │
             │         │  audit.events    │           │             │
             │         │                  │           │             │
             │         └──Redis Pub/Sub──────────────►│             │
             │            procedure.*                  │             │
             │                                         │             │
             │         ◄───────────────────────────────┘             │
             │            (SVC-07 search called by AGENT-P)          │
             │                                                        │
             └──Redis────────────────────────────────────────────────┘
                token blacklist
                (SVC-02 writes, SVC-02 reads via get_current_user)
```

---

## Dependency Summary Table

| File | Depends On | Used By |
|---|---|---|
| `requirements.txt` | nothing | everything |
| `shared/config.py` | `.env` file | everything |
| `shared/database.py` | `config.py` | all services, all models |
| `shared/models/auth.py` | `database.py` | SVC-02, SVC-03 (FK) |
| `shared/models/procedures.py` | `database.py`, `models/auth.py` (FK) | SVC-03, SVC-07, agent_e, agent_n |
| `shared/models/analytics.py` | `database.py` | SVC-05, agent_p |
| `shared/models/audit.py` | `database.py` | SVC-06 |
| `shared/models/notifications.py` | `database.py` | (future use) |
| `shared/events.py` | `config.py`, `pika`, `redis` | SVC-03, `agents/shared/audit.py` |
| `svc02_auth/*` | `config.py`, `models/auth.py`, `redis` | called by Nginx, all users |
| `svc03_procedures/*` | `models/procedures.py`, `events.py` | admins, triggers SVC-07 |
| `svc05_analytics/*` | `models/analytics.py` | admins only |
| `svc06_audit/*` | `models/audit.py`, `config.py`, RabbitMQ | compliance |
| `svc07_kb_sync/*` | `models/procedures.py`, sentence-transformers, Redis | AGENT-P |
| `agents/state.py` | nothing | all agents, `agents/main.py` |
| `agents/graph.py` | all 5 agents, `state.py` | `agents/main.py` |
| `agents/agent_r.py` | `state.py`, `config.py`, `redis`, `langdetect` | `graph.py` |
| `agents/agent_e.py` | `state.py`, `models/procedures.py`, `redis`, `agents/shared/audit.py` | `graph.py` |
| `agents/agent_n.py` | `state.py`, `agents/shared/embeddings.py`, `models/procedures.py` | `graph.py` |
| `agents/agent_c.py` | `state.py`, `agents/shared/embeddings.py`, `redis`, OpenAI | `graph.py` |
| `agents/agent_p.py` | `state.py`, `svc07_kb_sync/service.py`, `models/*`, OpenAI | `graph.py` |
| `agents/agent_o.py` | `state.py` only | `graph.py` |
| `agents/shared/embeddings.py` | `models/procedures.py`, sentence-transformers | `agent_n.py`, `agent_c.py` |
| `agents/shared/audit.py` | `shared/events.py` | `agent_e.py` |
| `agents/main.py` | all agents, `graph.py`, `svc07_kb_sync/service.py`, `models/analytics.py` | Docker container |

---

*End of AI-HPS Backend Explanation*
