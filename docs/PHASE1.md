# Phase 1 — Foundation

## What was built

| Deliverable | Location | Description |
|---|---|---|
| PostgreSQL schema | `backend/schema.sql` | 5 schemas, 17 tables, triggers, indexes, seed data |
| Docker Compose | `docker/docker-compose.yml` | RabbitMQ 3.12 + Redis 7.2 |
| Shared config | `backend/shared/config.py` | Pydantic-settings, loaded from `.env` |
| SQLAlchemy models | `backend/shared/models/` | ORM for all 17 tables |
| SVC-02 Auth & RBAC | `backend/services/svc02_auth/` | JWT login, logout, bcrypt, lockout, token blacklist |

### Database tables

```
aihps_auth          users  lockout_records  token_blacklist
aihps_procedures    departments  categories  procedure_entries  procedure_versions
                    procedure_approvals  navigation_paths  escalation_pathways  emergency_content
aihps_notifications push_registrations  notifications
aihps_analytics     query_events  content_gaps  weekly_reports
aihps_audit         audit_log (append-only, HMAC-signed)
```

### Seed data loaded automatically

- 6 Phase 1 departments (Emergency, Blood Bank, ICU, Surgery, Maternity, Infection Control)
- 4 emergency content rows (EN/FR × Stream A/B)
- 12 navigation paths (EN + FR for all 6 departments from Main Entrance)

---

## Environment requirements

| Service | How it runs | Port |
|---|---|---|
| PostgreSQL 15 | Native install | 5432 |
| Redis 7.2 | docker-compose | 6379 |
| RabbitMQ 3.12 | docker-compose | 5672 / 15672 |

---

## How to start the environment

### Step 1 — Start Redis + RabbitMQ

> If you had Redis running separately in Docker Desktop, stop it first so port 6379 is free:
> `docker stop <old-redis-container-name>`

```powershell
cd D:\AI-HPS\docker
docker compose up -d
docker ps  # expect: aihps_redis, aihps_rabbitmq, aihps_gateway
```

RabbitMQ management UI: http://localhost:15672 — login: `aihps` / `aihps_dev_pass`

### Step 2 — Activate Python venv

```powershell
cd D:\AI-HPS\backend
.\venv\Scripts\activate
# (venv) should appear in the prompt
```

### Step 3 — Apply the database schema (first time only)

```powershell
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d AIHPS -f schema.sql
```

Expected output: `CREATE TABLE` × 17, `INSERT 0 6` (departments), `INSERT 0 4` (emergency content), `DO` (navigation paths).

### Step 4 — Create the super admin (first time only)

```powershell
python create_superadmin.py
```

Credentials created: `admin@hgd.cm` / `Admin@AIHPS2026` — **change the password on first login.**

### Step 5 — Verify everything connects

```powershell
$env:PYTHONIOENCODING="utf-8"; python check_setup.py
```

Expected:
```
OK PostgreSQL  PostgreSQL 15.13 ...
  Schemas     aihps_analytics, aihps_audit, aihps_auth, aihps_notifications, aihps_procedures
  Departments 6 rows
OK Redis       v8.x.x — connected
OK RabbitMQ    connected
```

### Step 6 — Run SVC-02 Auth

```powershell
cd D:\AI-HPS\backend
uvicorn services.svc02_auth.main:app --port 8010 --reload
```

Swagger UI: http://localhost:8010/docs

---

## SVC-02 Auth — API endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | None | Returns JWT access token |
| POST | `/auth/logout` | Bearer | Blacklists current token |
| GET | `/auth/me` | Bearer | Returns current user profile |
| POST | `/auth/users` | super_admin | Creates a new user |
| POST | `/auth/change-password` | Bearer | Change own password |
| GET | `/auth/validate` | Bearer | Internal — used by Nginx auth_request |

---

## What to test

### Test 1 — Login and get token

```powershell
$r = Invoke-RestMethod http://localhost:8010/auth/login -Method Post `
     -ContentType application/json `
     -Body '{"email":"admin@hgd.cm","password":"Admin@AIHPS2026"}'
Write-Host $r.access_token
$H = @{Authorization="Bearer $($r.access_token)"}
```

Expected: JSON with `access_token`, `role: super_admin`, `expires_in: 14400`.

### Test 2 — Get current user

```powershell
Invoke-RestMethod http://localhost:8010/auth/me -Headers $H
```

Expected: user object with `email`, `full_name`, `role: super_admin`.

### Test 3 — Create a staff user

```powershell
$body = '{"email":"nurse@hgd.cm","full_name":"Mary Nurse","password":"Nurse@2026","role":"nurse"}'
Invoke-RestMethod http://localhost:8010/auth/users -Method Post `
    -ContentType application/json -Headers $H -Body $body
```

Expected: new user object with `role: nurse`.

### Test 4 — Lockout after 5 failed attempts

```powershell
1..6 | ForEach-Object {
    try { Invoke-RestMethod http://localhost:8010/auth/login -Method Post `
        -ContentType application/json -Body '{"email":"nurse@hgd.cm","password":"wrong"}' }
    catch { Write-Host "Attempt $_: $($_.Exception.Message)" }
}
```

Expected: after the 5th failure, response includes `"Account locked"`.

### Test 5 — Logout blacklists the token

```powershell
Invoke-RestMethod http://localhost:8010/auth/logout -Method Post -Headers $H
# Now try to use the old token:
Invoke-RestMethod http://localhost:8010/auth/me -Headers $H
```

Expected: second call returns `401 Token has been revoked`.

### Test 6 — Verify database

```powershell
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d AIHPS `
  -c "SELECT email, role, is_active FROM aihps_auth.users;"
```

---

## Environment file reference

`backend/.env`:

```env
DATABASE_URL=postgresql://postgres:postgresql@localhost:5432/AIHPS
REDIS_URL=redis://localhost:6379/0
RABBITMQ_URL=amqp://aihps:aihps_dev_pass@localhost:5672/
SECRET_KEY=aihps-dev-secret-key-minimum-32-chars-change-in-production!!
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES_STAFF=480   # 8 hours
ACCESS_TOKEN_EXPIRE_MINUTES_ADMIN=240   # 4 hours
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_MINUTES=30
```
