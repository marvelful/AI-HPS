-- Migration: add OTP codes table + phone/dob columns to users
-- Run once against the AIHPS database:
--   psql -U postgres -d AIHPS -f scripts/migrate_add_otp_patient.sql

-- 1. New nullable columns on users (safe to run if already present)
ALTER TABLE aihps_auth.users
    ADD COLUMN IF NOT EXISTS phone          VARCHAR(50),
    ADD COLUMN IF NOT EXISTS date_of_birth  DATE;

-- 2. OTP codes table
CREATE TABLE IF NOT EXISTS aihps_auth.otp_codes (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) NOT NULL,
    code        VARCHAR(6)   NOT NULL,
    purpose     VARCHAR(20)  NOT NULL DEFAULT 'register',
    expires_at  TIMESTAMPTZ  NOT NULL,
    used        BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON aihps_auth.otp_codes (email);
