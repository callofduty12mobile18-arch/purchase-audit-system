-- Migration: Extend payment_status_enum
-- Created: 2026-11-10
--
-- Postgres requires new enum values to be committed in their own transaction
-- before they can be used in triggers, functions, or row data (error 55P04).
-- This migration runs first to commit the new enum values.

DO $$ BEGIN
    ALTER TYPE payment_status_enum ADD VALUE IF NOT EXISTS 'CHEQUE_PENDING';
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TYPE payment_status_enum ADD VALUE IF NOT EXISTS 'OVERDUE';
EXCEPTION WHEN duplicate_object THEN null; END $$;

