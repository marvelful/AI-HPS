-- ============================================================
-- AI-HPS  Full Database Schema — PostgreSQL 15
-- Database : AIHPS
-- Run      : psql -U postgresql -d AIHPS -f schema.sql
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Schemas
CREATE SCHEMA IF NOT EXISTS aihps_auth;
CREATE SCHEMA IF NOT EXISTS aihps_procedures;
CREATE SCHEMA IF NOT EXISTS aihps_notifications;
CREATE SCHEMA IF NOT EXISTS aihps_analytics;
CREATE SCHEMA IF NOT EXISTS aihps_audit;

-- ============================================================
-- HELPER: updated_at trigger function (shared)
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- SCHEMA: aihps_auth
-- ============================================================

CREATE TABLE IF NOT EXISTS aihps_auth.users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    employee_id     VARCHAR(50)  UNIQUE,
    full_name       VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(50)  NOT NULL DEFAULT 'staff'
                        CHECK (role IN (
                            'super_admin','admin','department_admin',
                            'doctor','nurse','pharmacist','lab_technician',
                            'radiologist','infection_control_officer','staff'
                        )),
    department_id   UUID,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    failed_attempts INTEGER      NOT NULL DEFAULT 0,
    lockout_until   TIMESTAMPTZ,
    last_login      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email      ON aihps_auth.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role       ON aihps_auth.users(role);
CREATE INDEX IF NOT EXISTS idx_users_department ON aihps_auth.users(department_id);

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON aihps_auth.users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS aihps_auth.lockout_records (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID        NOT NULL REFERENCES aihps_auth.users(id) ON DELETE CASCADE,
    locked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unlocked_at TIMESTAMPTZ,
    reason      TEXT        NOT NULL DEFAULT 'Too many failed login attempts'
);

CREATE INDEX IF NOT EXISTS idx_lockout_user ON aihps_auth.lockout_records(user_id);

CREATE TABLE IF NOT EXISTS aihps_auth.token_blacklist (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    jti         VARCHAR(255) UNIQUE NOT NULL,
    user_id     UUID         NOT NULL REFERENCES aihps_auth.users(id) ON DELETE CASCADE,
    revoked_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ  NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_blacklist_jti     ON aihps_auth.token_blacklist(jti);
CREATE INDEX IF NOT EXISTS idx_blacklist_expires ON aihps_auth.token_blacklist(expires_at);

-- ============================================================
-- SCHEMA: aihps_procedures
-- ============================================================

CREATE TABLE IF NOT EXISTS aihps_procedures.departments (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name             VARCHAR(255) UNIQUE NOT NULL,
    informal_names   TEXT[]       NOT NULL DEFAULT '{}',
    services         JSONB        NOT NULL DEFAULT '[]',
    operating_hours  JSONB        NOT NULL DEFAULT '{}',
    location         TEXT,
    contact_details  JSONB        NOT NULL DEFAULT '{}',
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    last_verified_at TIMESTAMPTZ,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dept_name     ON aihps_procedures.departments(name);
CREATE INDEX IF NOT EXISTS idx_dept_informal ON aihps_procedures.departments USING GIN(informal_names);
CREATE INDEX IF NOT EXISTS idx_dept_active   ON aihps_procedures.departments(is_active);

CREATE TRIGGER trg_dept_updated_at
    BEFORE UPDATE ON aihps_procedures.departments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Now that departments exists, add FK from users (safe: only if not already there)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_users_department'
          AND table_schema = 'aihps_auth'
    ) THEN
        ALTER TABLE aihps_auth.users
            ADD CONSTRAINT fk_users_department
            FOREIGN KEY (department_id)
            REFERENCES aihps_procedures.departments(id)
            ON DELETE SET NULL;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS aihps_procedures.categories (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id   UUID         REFERENCES aihps_procedures.categories(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cat_parent ON aihps_procedures.categories(parent_id);

CREATE TABLE IF NOT EXISTS aihps_procedures.procedure_entries (
    id                     UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    title                  VARCHAR(500) NOT NULL,
    summary                TEXT,
    content                TEXT        NOT NULL,
    steps                  JSONB       NOT NULL DEFAULT '[]',
    compliance_annotations JSONB       NOT NULL DEFAULT '[]',
    stream_target          VARCHAR(4)  NOT NULL DEFAULT 'both'
                               CHECK (stream_target IN ('A','B','both')),
    applicable_roles       TEXT[]      NOT NULL DEFAULT '{}',
    risk_level             VARCHAR(20) NOT NULL DEFAULT 'low'
                               CHECK (risk_level IN ('low','medium','high','critical')),
    status                 VARCHAR(20) NOT NULL DEFAULT 'draft'
                               CHECK (status IN ('draft','pending','published','archived')),
    department_id          UUID        REFERENCES aihps_procedures.departments(id) ON DELETE SET NULL,
    category_id            UUID        REFERENCES aihps_procedures.categories(id) ON DELETE SET NULL,
    language               CHAR(2)     NOT NULL DEFAULT 'EN'
                               CHECK (language IN ('EN','FR')),
    version                INTEGER     NOT NULL DEFAULT 1,
    search_vector          TSVECTOR,
    created_by             UUID        NOT NULL REFERENCES aihps_auth.users(id),
    updated_by             UUID        REFERENCES aihps_auth.users(id),
    published_at           TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proc_status   ON aihps_procedures.procedure_entries(status);
CREATE INDEX IF NOT EXISTS idx_proc_stream   ON aihps_procedures.procedure_entries(stream_target);
CREATE INDEX IF NOT EXISTS idx_proc_dept     ON aihps_procedures.procedure_entries(department_id);
CREATE INDEX IF NOT EXISTS idx_proc_lang     ON aihps_procedures.procedure_entries(language);
CREATE INDEX IF NOT EXISTS idx_proc_roles    ON aihps_procedures.procedure_entries USING GIN(applicable_roles);
CREATE INDEX IF NOT EXISTS idx_proc_search   ON aihps_procedures.procedure_entries USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_proc_risk     ON aihps_procedures.procedure_entries(risk_level);

-- Auto-update search_vector on insert/update
CREATE OR REPLACE FUNCTION aihps_procedures.update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.summary, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_proc_search_vector
    BEFORE INSERT OR UPDATE OF title, summary, content
    ON aihps_procedures.procedure_entries
    FOR EACH ROW EXECUTE FUNCTION aihps_procedures.update_search_vector();

CREATE TRIGGER trg_proc_updated_at
    BEFORE UPDATE ON aihps_procedures.procedure_entries
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS aihps_procedures.procedure_versions (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_id    UUID        NOT NULL REFERENCES aihps_procedures.procedure_entries(id) ON DELETE CASCADE,
    version     INTEGER     NOT NULL,
    title       VARCHAR(500) NOT NULL,
    content     TEXT        NOT NULL,
    steps       JSONB       NOT NULL DEFAULT '[]',
    snapshot    JSONB       NOT NULL DEFAULT '{}',
    created_by  UUID        NOT NULL REFERENCES aihps_auth.users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (entry_id, version)
);

CREATE INDEX IF NOT EXISTS idx_pver_entry ON aihps_procedures.procedure_versions(entry_id);

CREATE TABLE IF NOT EXISTS aihps_procedures.procedure_approvals (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_id    UUID        NOT NULL REFERENCES aihps_procedures.procedure_entries(id) ON DELETE CASCADE,
    approver_id UUID        NOT NULL REFERENCES aihps_auth.users(id),
    decision    VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (decision IN ('approved','rejected','pending')),
    comment     TEXT,
    decided_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_papproval_entry    ON aihps_procedures.procedure_approvals(entry_id);
CREATE INDEX IF NOT EXISTS idx_papproval_approver ON aihps_procedures.procedure_approvals(approver_id);

CREATE TABLE IF NOT EXISTS aihps_procedures.navigation_paths (
    id                     UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_location          VARCHAR(255) NOT NULL,
    to_department_id       UUID        NOT NULL REFERENCES aihps_procedures.departments(id) ON DELETE CASCADE,
    language               CHAR(2)     NOT NULL DEFAULT 'EN'
                               CHECK (language IN ('EN','FR')),
    steps                  JSONB       NOT NULL DEFAULT '[]',
    estimated_time_minutes INTEGER,
    last_verified_at       TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_navpath_dept ON aihps_procedures.navigation_paths(to_department_id);
CREATE INDEX IF NOT EXISTS idx_navpath_lang ON aihps_procedures.navigation_paths(language);
CREATE INDEX IF NOT EXISTS idx_navpath_from ON aihps_procedures.navigation_paths(from_location);

CREATE TRIGGER trg_navpath_updated_at
    BEFORE UPDATE ON aihps_procedures.navigation_paths
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS aihps_procedures.escalation_pathways (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    procedure_id UUID        NOT NULL REFERENCES aihps_procedures.procedure_entries(id) ON DELETE CASCADE,
    steps        JSONB       NOT NULL DEFAULT '[]',
    contacts     JSONB       NOT NULL DEFAULT '[]',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escpath_proc ON aihps_procedures.escalation_pathways(procedure_id);

CREATE TABLE IF NOT EXISTS aihps_procedures.emergency_content (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    language         CHAR(2)     NOT NULL CHECK (language IN ('EN','FR')),
    stream           VARCHAR(4)  NOT NULL CHECK (stream IN ('A','B','both')),
    content          TEXT        NOT NULL,
    contacts         JSONB       NOT NULL DEFAULT '[]',
    directions       TEXT,
    last_reviewed_at TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (language, stream)
);

CREATE TRIGGER trg_emerg_updated_at
    BEFORE UPDATE ON aihps_procedures.emergency_content
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- SCHEMA: aihps_notifications
-- ============================================================

CREATE TABLE IF NOT EXISTS aihps_notifications.push_registrations (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID        NOT NULL REFERENCES aihps_auth.users(id) ON DELETE CASCADE,
    expo_token  VARCHAR(255) NOT NULL,
    platform    VARCHAR(20) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, expo_token)
);

CREATE INDEX IF NOT EXISTS idx_pushreg_user ON aihps_notifications.push_registrations(user_id);

CREATE TABLE IF NOT EXISTS aihps_notifications.notifications (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID        NOT NULL REFERENCES aihps_auth.users(id) ON DELETE CASCADE,
    title      VARCHAR(255) NOT NULL,
    body       TEXT        NOT NULL,
    data       JSONB       NOT NULL DEFAULT '{}',
    sent_at    TIMESTAMPTZ,
    read_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user    ON aihps_notifications.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_read    ON aihps_notifications.notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notif_created ON aihps_notifications.notifications(created_at DESC);

-- ============================================================
-- SCHEMA: aihps_analytics
-- ============================================================

CREATE TABLE IF NOT EXISTS aihps_analytics.query_events (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id       VARCHAR(255),
    user_id          UUID        REFERENCES aihps_auth.users(id) ON DELETE SET NULL,
    query            TEXT        NOT NULL,
    intent           VARCHAR(20) CHECK (intent IN ('navigation','information','procedure','emergency','unknown')),
    agent            VARCHAR(20),
    had_result       BOOLEAN,
    response_time_ms INTEGER,
    platform         VARCHAR(20) CHECK (platform IN ('whatsapp','sms','ussd','mobile','web')),
    stream           CHAR(1)     CHECK (stream IN ('A','B')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qevt_user    ON aihps_analytics.query_events(user_id);
CREATE INDEX IF NOT EXISTS idx_qevt_intent  ON aihps_analytics.query_events(intent);
CREATE INDEX IF NOT EXISTS idx_qevt_created ON aihps_analytics.query_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qevt_noresult ON aihps_analytics.query_events(had_result)
    WHERE had_result = FALSE;

CREATE TABLE IF NOT EXISTS aihps_analytics.content_gaps (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    query            TEXT        NOT NULL,
    occurrence_count INTEGER     NOT NULL DEFAULT 1,
    first_seen       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cgap_count ON aihps_analytics.content_gaps(occurrence_count DESC);

CREATE TABLE IF NOT EXISTS aihps_analytics.weekly_reports (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    week_start  DATE        NOT NULL UNIQUE,
    report_data JSONB       NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SCHEMA: aihps_audit
-- ============================================================

CREATE TABLE IF NOT EXISTS aihps_audit.audit_log (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type  VARCHAR(100) NOT NULL,
    user_id     UUID,
    entity_type VARCHAR(100),
    entity_id   UUID,
    changes     JSONB       NOT NULL DEFAULT '{}',
    metadata    JSONB       NOT NULL DEFAULT '{}',
    ip_address  INET,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user    ON aihps_audit.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity  ON aihps_audit.audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON aihps_audit.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event   ON aihps_audit.audit_log(event_type);

-- Append-only enforcement
CREATE OR REPLACE FUNCTION aihps_audit.prevent_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_log is append-only — UPDATE and DELETE are forbidden';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_readonly
    BEFORE UPDATE OR DELETE ON aihps_audit.audit_log
    FOR EACH ROW EXECUTE FUNCTION aihps_audit.prevent_modification();

-- ============================================================
-- SEED DATA
-- ============================================================

-- Phase 1 departments (safe to re-run: ON CONFLICT DO NOTHING)
INSERT INTO aihps_procedures.departments (name, informal_names, location) VALUES
    ('Emergency',
     ARRAY['emergency room','ER','urgences','salle d''urgence','urgence'],
     'Ground Floor, Block A'),
    ('Blood Bank',
     ARRAY['blood bank','banque de sang','blood','sang'],
     'Ground Floor, Block B'),
    ('ICU',
     ARRAY['intensive care','ICU','réanimation','soins intensifs','reanimation'],
     'Second Floor, Block A'),
    ('Surgery',
     ARRAY['operating theatre','OR','bloc opératoire','chirurgie','operating room'],
     'Third Floor, Block C'),
    ('Maternity',
     ARRAY['maternity ward','maternité','labour ward','obstetrics','maternite'],
     'Second Floor, Block B'),
    ('Infection Control',
     ARRAY['infection control','contrôle des infections','hygiene unit','infection'],
     'First Floor, Block D')
ON CONFLICT (name) DO NOTHING;

-- Emergency content placeholders (EN/FR × Stream A/B)
INSERT INTO aihps_procedures.emergency_content (language, stream, content, contacts, directions) VALUES
    ('EN', 'A',
     'EMERGENCY: Stay calm. Do not move the patient unless in immediate danger. '
     'Call hospital emergency: +237 XXX XXX XXX. '
     'Emergency department is on the Ground Floor, Block A — follow the RED emergency signs from the main entrance.',
     '[]',
     'Main entrance → follow RED signs → Ground Floor Block A'),
    ('FR', 'A',
     'URGENCE: Restez calme. Ne déplacez pas le patient sauf danger immédiat. '
     'Appelez les urgences hospitalières: +237 XXX XXX XXX. '
     'Le service des urgences se trouve au Rez-de-chaussée, Bloc A — suivez les panneaux rouges depuis l''entrée principale.',
     '[]',
     'Entrée principale → panneaux ROUGES → Rez-de-chaussée Bloc A'),
    ('EN', 'B',
     'EMERGENCY SOP: Activate code red. Secure airway, breathing, circulation. '
     'Call: Emergency Coordinator +237 XXX XXX XXX, Senior Doctor on-call +237 XXX XXX XXX. '
     'Document in patient record immediately. Transfer to Emergency Dept — Ground Floor Block A.',
     '[]',
     'Emergency Department — Ground Floor Block A'),
    ('FR', 'B',
     'SOP D''URGENCE: Activer le code rouge. Assurer les voies aériennes, respiration, circulation. '
     'Appelez: Coordonnateur d''urgences +237 XXX XXX XXX, Médecin de garde +237 XXX XXX XXX. '
     'Documenter immédiatement dans le dossier patient. Transférer aux urgences — Rez-de-chaussée Bloc A.',
     '[]',
     'Service des urgences — Rez-de-chaussée Bloc A')
ON CONFLICT (language, stream) DO NOTHING;

-- Phase 1 navigation paths (Main Entrance → each department, EN + FR)
DO $$
DECLARE
    v_emergency   UUID;
    v_blood_bank  UUID;
    v_icu         UUID;
    v_surgery     UUID;
    v_maternity   UUID;
    v_infection   UUID;
BEGIN
    SELECT id INTO v_emergency   FROM aihps_procedures.departments WHERE name = 'Emergency';
    SELECT id INTO v_blood_bank  FROM aihps_procedures.departments WHERE name = 'Blood Bank';
    SELECT id INTO v_icu         FROM aihps_procedures.departments WHERE name = 'ICU';
    SELECT id INTO v_surgery     FROM aihps_procedures.departments WHERE name = 'Surgery';
    SELECT id INTO v_maternity   FROM aihps_procedures.departments WHERE name = 'Maternity';
    SELECT id INTO v_infection   FROM aihps_procedures.departments WHERE name = 'Infection Control';

    -- English paths
    INSERT INTO aihps_procedures.navigation_paths (from_location, to_department_id, language, steps, estimated_time_minutes)
    VALUES
    ('Main Entrance', v_emergency, 'EN',
     '[{"step":1,"instruction":"Enter through the main entrance","landmark":"Main entrance doors"},{"step":2,"instruction":"Turn left and follow the RED emergency signs along the corridor"},{"step":3,"instruction":"The Emergency Department is at the end of the corridor, Ground Floor Block A"}]',
     2),
    ('Main Entrance', v_blood_bank, 'EN',
     '[{"step":1,"instruction":"Enter through the main entrance","landmark":"Main entrance doors"},{"step":2,"instruction":"Turn right at the reception desk"},{"step":3,"instruction":"Walk straight to Block B — the Blood Bank is on the ground floor, sign posted"}]',
     3),
    ('Main Entrance', v_icu, 'EN',
     '[{"step":1,"instruction":"Enter through the main entrance","landmark":"Main entrance doors"},{"step":2,"instruction":"Take the elevator or stairs to the Second Floor"},{"step":3,"instruction":"Turn left and follow signs to Block A — ICU is at the end of the corridor"}]',
     5),
    ('Main Entrance', v_surgery, 'EN',
     '[{"step":1,"instruction":"Enter through the main entrance","landmark":"Main entrance doors"},{"step":2,"instruction":"Take the elevator to the Third Floor"},{"step":3,"instruction":"Follow the blue signs to Block C — Surgery / Operating Theatre"}]',
     6),
    ('Main Entrance', v_maternity, 'EN',
     '[{"step":1,"instruction":"Enter through the main entrance","landmark":"Main entrance doors"},{"step":2,"instruction":"Take the elevator or stairs to the Second Floor"},{"step":3,"instruction":"Turn right and follow pink signs to Block B — Maternity Ward"}]',
     5),
    ('Main Entrance', v_infection, 'EN',
     '[{"step":1,"instruction":"Enter through the main entrance","landmark":"Main entrance doors"},{"step":2,"instruction":"Take the stairs to the First Floor"},{"step":3,"instruction":"Follow yellow signs to Block D — Infection Control Unit"}]',
     4)
    ON CONFLICT DO NOTHING;

    -- French paths
    INSERT INTO aihps_procedures.navigation_paths (from_location, to_department_id, language, steps, estimated_time_minutes)
    VALUES
    ('Entrée Principale', v_emergency, 'FR',
     '[{"step":1,"instruction":"Entrez par l''entrée principale","landmark":"Portes de l''entrée principale"},{"step":2,"instruction":"Tournez à gauche et suivez les panneaux rouges d''urgence"},{"step":3,"instruction":"Le service des urgences se trouve au bout du couloir, Rez-de-chaussée Bloc A"}]',
     2),
    ('Entrée Principale', v_blood_bank, 'FR',
     '[{"step":1,"instruction":"Entrez par l''entrée principale","landmark":"Portes de l''entrée principale"},{"step":2,"instruction":"Tournez à droite au niveau de l''accueil"},{"step":3,"instruction":"Marchez tout droit vers le Bloc B — la Banque de Sang est au rez-de-chaussée, bien indiquée"}]',
     3),
    ('Entrée Principale', v_icu, 'FR',
     '[{"step":1,"instruction":"Entrez par l''entrée principale","landmark":"Portes de l''entrée principale"},{"step":2,"instruction":"Prenez l''ascenseur ou les escaliers jusqu''au Deuxième Étage"},{"step":3,"instruction":"Tournez à gauche et suivez les panneaux vers le Bloc A — Réanimation / Soins Intensifs"}]',
     5),
    ('Entrée Principale', v_surgery, 'FR',
     '[{"step":1,"instruction":"Entrez par l''entrée principale","landmark":"Portes de l''entrée principale"},{"step":2,"instruction":"Prenez l''ascenseur jusqu''au Troisième Étage"},{"step":3,"instruction":"Suivez les panneaux bleus vers le Bloc C — Chirurgie / Bloc Opératoire"}]',
     6),
    ('Entrée Principale', v_maternity, 'FR',
     '[{"step":1,"instruction":"Entrez par l''entrée principale","landmark":"Portes de l''entrée principale"},{"step":2,"instruction":"Prenez l''ascenseur jusqu''au Deuxième Étage"},{"step":3,"instruction":"Tournez à droite et suivez les panneaux roses vers le Bloc B — Maternité"}]',
     5),
    ('Entrée Principale', v_infection, 'FR',
     '[{"step":1,"instruction":"Entrez par l''entrée principale","landmark":"Portes de l''entrée principale"},{"step":2,"instruction":"Prenez les escaliers jusqu''au Premier Étage"},{"step":3,"instruction":"Suivez les panneaux jaunes vers le Bloc D — Contrôle des Infections"}]',
     4)
    ON CONFLICT DO NOTHING;
END $$;
