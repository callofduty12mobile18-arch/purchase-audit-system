-- Migration: Cheque payment workflow — invoice columns + cheque status enum
-- Created: 2026-11-01
--
-- Adds first-class support for cheque payments WITHOUT altering any existing
-- production data and WITHOUT touching the existing payment_status_enum.
--
-- Design notes:
--   * Cheque invoices keep payment_status = 'UNPAID' until the cheque clears on
--     its presentation date, then become 'PAID'. The value 'CHEQUE' is
--     intentionally NOT added to payment_status_enum because "cheque" is a
--     payment MODE, not a payment status. (Writing 'CHEQUE' into payment_status
--     was the exact cause of cheque invoices failing to persist remotely.)
--   * cheque_status is nullable and has NO default, so pre-existing rows are
--     left untouched (no automatic backfill). The scheduled auto-clearance job
--     only ever processes rows that are explicitly marked cheque_status
--     = 'PENDING', so historical invoices are never silently marked PAID.
--
-- This migration is additive and idempotent: it can be re-run safely.

-- ---------------------------------------------------------------------------
-- 1. CHEQUE STATUS ENUM  (PENDING -> CLEARED only; no bounced tracking)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE cheque_status_enum AS ENUM ('PENDING', 'CLEARED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ---------------------------------------------------------------------------
-- 2. NEW INVOICE COLUMNS  (all nullable, no defaults -> zero data mutation)
-- ---------------------------------------------------------------------------
ALTER TABLE public.purchase_invoices
    ADD COLUMN IF NOT EXISTS invoice_name TEXT;

ALTER TABLE public.purchase_invoices
    ADD COLUMN IF NOT EXISTS cheque_amount NUMERIC(12, 2);

ALTER TABLE public.purchase_invoices
    ADD COLUMN IF NOT EXISTS cheque_presentation_date DATE;

ALTER TABLE public.purchase_invoices
    ADD COLUMN IF NOT EXISTS cheque_status cheque_status_enum;

-- ---------------------------------------------------------------------------
-- 3. INDEXES
--    Supports the outstanding-cheque KPI queries and the auto-clearance scan.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_cheque
    ON public.purchase_invoices (payment_mode, cheque_status);

CREATE INDEX IF NOT EXISTS idx_purchase_invoices_cheque_presentation
    ON public.purchase_invoices (cheque_presentation_date)
    WHERE payment_mode = 'CHEQUE' AND cheque_status = 'PENDING';
