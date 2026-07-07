-- AI-HPS RAG v2 Migration
-- Drops and rebuilds aihps_procedures schema.
-- Keeps: departments, categories, procedure_entries, procedure_versions,
--         procedure_approvals, navigation_paths
-- Adds:  knowledge_sources, knowledge_chunks
-- Drops: escalation_pathways, emergency_content
--
-- Run from backend/ directory:
--   $env:PGPASSWORD="postgresql"
--   & "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -h localhost -d AIHPS -f scripts/migrate_rag_v2.sql

BEGIN;

-- ── Wipe schema ──────────────────────────────────────────────────────────────
DROP SCHEMA IF EXISTS aihps_procedures CASCADE;
CREATE SCHEMA aihps_procedures;

-- ── departments ──────────────────────────────────────────────────────────────
CREATE TABLE aihps_procedures.departments (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              VARCHAR(255) UNIQUE NOT NULL,
    name_fr           VARCHAR(255),
    informal_names    TEXT[]  NOT NULL DEFAULT '{}',
    services          JSONB   NOT NULL DEFAULT '[]',
    operating_hours   JSONB   NOT NULL DEFAULT '{}',
    location          TEXT,
    contact_details   JSONB   NOT NULL DEFAULT '{}',
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    last_verified_at  TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── categories ───────────────────────────────────────────────────────────────
CREATE TABLE aihps_procedures.categories (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             VARCHAR(255) NOT NULL,
    knowledge_domain VARCHAR(60)  NOT NULL DEFAULT 'clinical_procedure',
    description      TEXT,
    parent_id        UUID REFERENCES aihps_procedures.categories(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── knowledge_sources ────────────────────────────────────────────────────────
-- Tracks every ingested source document (PDF, DOCX, etc.)
CREATE TABLE aihps_procedures.knowledge_sources (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id         VARCHAR(150) UNIQUE NOT NULL,  -- slug used as prefix in chunk_ids
    filename            VARCHAR(500) NOT NULL,
    original_path       TEXT,
    document_type       VARCHAR(20)  NOT NULL DEFAULT 'pdf',
    knowledge_domain    VARCHAR(60)  NOT NULL DEFAULT 'who_guideline',
    department_id       UUID REFERENCES aihps_procedures.departments(id) ON DELETE SET NULL,
    language            VARCHAR(2)   NOT NULL DEFAULT 'EN',
    source_organization VARCHAR(255),
    citation            TEXT,
    approval_status     VARCHAR(20)  NOT NULL DEFAULT 'approved',
    version             VARCHAR(50),
    total_chunks        INTEGER      NOT NULL DEFAULT 0,
    last_ingested_at    TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── knowledge_chunks ─────────────────────────────────────────────────────────
-- Every extracted, cleaned, chunked piece of knowledge ready for embedding.
CREATE TABLE aihps_procedures.knowledge_chunks (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    chunk_id         VARCHAR(200) UNIQUE NOT NULL,
    source_id        UUID        NOT NULL REFERENCES aihps_procedures.knowledge_sources(id) ON DELETE CASCADE,
    document_id      VARCHAR(150) NOT NULL,
    title            TEXT        NOT NULL,
    content          TEXT        NOT NULL,
    category         VARCHAR(60) NOT NULL DEFAULT 'who_guideline',
    knowledge_domain VARCHAR(60) NOT NULL DEFAULT 'who_guideline',
    department       VARCHAR(255),
    department_id    UUID REFERENCES aihps_procedures.departments(id) ON DELETE SET NULL,
    source           VARCHAR(500),
    language         VARCHAR(2)  NOT NULL DEFAULT 'EN',
    document_type    VARCHAR(20),
    procedure_type   VARCHAR(100),
    visibility       VARCHAR(20) NOT NULL DEFAULT 'public',
    role             VARCHAR(50) NOT NULL DEFAULT 'all',
    page             INTEGER,
    section          TEXT,
    chunk_index      INTEGER     NOT NULL DEFAULT 0,
    citation         TEXT,
    approval_status  VARCHAR(20) NOT NULL DEFAULT 'approved',
    last_updated     DATE,
    version          VARCHAR(50),
    is_table         BOOLEAN     NOT NULL DEFAULT FALSE,
    search_vector    TSVECTOR,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── procedure_entries ────────────────────────────────────────────────────────
-- Manual procedure entries created via the admin UI.
CREATE TABLE aihps_procedures.procedure_entries (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title                   VARCHAR(500) NOT NULL,
    summary                 TEXT,
    content                 TEXT NOT NULL,
    steps                   JSONB NOT NULL DEFAULT '[]',
    compliance_annotations  JSONB NOT NULL DEFAULT '[]',
    knowledge_domain        VARCHAR(60) NOT NULL DEFAULT 'clinical_procedure',
    stream_target           VARCHAR(4)  NOT NULL DEFAULT 'both',
    applicable_roles        TEXT[]      NOT NULL DEFAULT '{}',
    risk_level              VARCHAR(20) NOT NULL DEFAULT 'low',
    status                  VARCHAR(20) NOT NULL DEFAULT 'draft',
    department_id           UUID REFERENCES aihps_procedures.departments(id) ON DELETE SET NULL,
    category_id             UUID REFERENCES aihps_procedures.categories(id) ON DELETE SET NULL,
    source_id               UUID REFERENCES aihps_procedures.knowledge_sources(id) ON DELETE SET NULL,
    language                VARCHAR(2)  NOT NULL DEFAULT 'EN',
    version                 INTEGER     NOT NULL DEFAULT 1,
    search_vector           TSVECTOR,
    created_by              UUID NOT NULL REFERENCES aihps_auth.users(id),
    updated_by              UUID REFERENCES aihps_auth.users(id),
    published_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── procedure_versions ───────────────────────────────────────────────────────
CREATE TABLE aihps_procedures.procedure_versions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id   UUID NOT NULL REFERENCES aihps_procedures.procedure_entries(id) ON DELETE CASCADE,
    version    INTEGER NOT NULL,
    title      VARCHAR(500) NOT NULL,
    content    TEXT NOT NULL,
    steps      JSONB NOT NULL DEFAULT '[]',
    snapshot   JSONB NOT NULL DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES aihps_auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── procedure_approvals ──────────────────────────────────────────────────────
CREATE TABLE aihps_procedures.procedure_approvals (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id     UUID NOT NULL REFERENCES aihps_procedures.procedure_entries(id) ON DELETE CASCADE,
    approver_id  UUID NOT NULL REFERENCES aihps_auth.users(id),
    decision     VARCHAR(20) NOT NULL DEFAULT 'pending',
    comment      TEXT,
    decided_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── navigation_paths ─────────────────────────────────────────────────────────
-- Kept for future navigation intelligence phase.
CREATE TABLE aihps_procedures.navigation_paths (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_location           VARCHAR(255) NOT NULL,
    to_department_id        UUID NOT NULL REFERENCES aihps_procedures.departments(id) ON DELETE CASCADE,
    language                VARCHAR(2) NOT NULL DEFAULT 'EN',
    steps                   JSONB NOT NULL DEFAULT '[]',
    estimated_time_minutes  INTEGER,
    last_verified_at        TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX ON aihps_procedures.knowledge_chunks USING GIN(search_vector);
CREATE INDEX ON aihps_procedures.knowledge_chunks (knowledge_domain);
CREATE INDEX ON aihps_procedures.knowledge_chunks (department_id);
CREATE INDEX ON aihps_procedures.knowledge_chunks (language);
CREATE INDEX ON aihps_procedures.knowledge_chunks (source_id);
CREATE INDEX ON aihps_procedures.knowledge_chunks (approval_status);

CREATE INDEX ON aihps_procedures.procedure_entries USING GIN(search_vector);
CREATE INDEX ON aihps_procedures.procedure_entries (status);
CREATE INDEX ON aihps_procedures.procedure_entries (knowledge_domain);
CREATE INDEX ON aihps_procedures.procedure_entries (department_id);

-- ── Search vector triggers ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION aihps_procedures.update_chunk_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english',
        coalesce(NEW.title, '') || ' ' ||
        coalesce(NEW.content, '') || ' ' ||
        coalesce(NEW.department, '') || ' ' ||
        coalesce(NEW.section, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_chunk_search_vector
    BEFORE INSERT OR UPDATE ON aihps_procedures.knowledge_chunks
    FOR EACH ROW EXECUTE FUNCTION aihps_procedures.update_chunk_search_vector();

CREATE OR REPLACE FUNCTION aihps_procedures.update_entry_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english',
        coalesce(NEW.title, '') || ' ' ||
        coalesce(NEW.summary, '') || ' ' ||
        coalesce(NEW.content, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_entry_search_vector
    BEFORE INSERT OR UPDATE ON aihps_procedures.procedure_entries
    FOR EACH ROW EXECUTE FUNCTION aihps_procedures.update_entry_search_vector();

COMMIT;

-- Verify
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'aihps_procedures'
ORDER BY table_name;
