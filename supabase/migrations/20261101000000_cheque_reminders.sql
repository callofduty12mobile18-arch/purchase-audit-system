-- Migration: Automated Cheque Email Reminder System
-- Created: 2026-11-01
-- Adds the cheque_reminders table, RLS policies and the atomic claim function
-- used by the process-cheque-reminders Edge Function.
--
-- NOTE: RLS is ENABLED on this table and is never disabled.

-- ---------------------------------------------------------------------------
-- 1. STATUS ENUM
-- ---------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE cheque_reminder_status_enum AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ---------------------------------------------------------------------------
-- 2. CHEQUE REMINDERS TABLE
--    One active reminder per invoice (unique invoice_id) to guarantee we can
--    never schedule duplicate emails for the same invoice.
--    Invoice number / supplier / amount / cheque clearance date are stored as
--    snapshots so the scheduler does not depend on optional invoice columns.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cheque_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    supplier_name TEXT,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (amount >= 0),
    cheque_clearance_date DATE,
    recipient_email TEXT NOT NULL,
    reminder_at TIMESTAMPTZ NOT NULL,
    status cheque_reminder_status_enum NOT NULL DEFAULT 'PENDING',
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    last_error TEXT,
    sent_at TIMESTAMPTZ,
    -- Auth user id of the admin who scheduled the reminder. Stored without a
    -- foreign key so scheduling never fails when a profiles row is absent.
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT cheque_reminders_invoice_unique UNIQUE (invoice_id)
);

-- ---------------------------------------------------------------------------
-- 3. INDEXES
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_cheque_reminders_due ON cheque_reminders(status, reminder_at);
CREATE INDEX IF NOT EXISTS idx_cheque_reminders_invoice_id ON cheque_reminders(invoice_id);

-- ---------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS)
--    Authenticated admins may create, read, reschedule (update) and cancel
--    their reminders. Progress fields (status -> SENT/FAILED/PROCESSING,
--    attempts, sent_at, last_error) are owned by the service role, which
--    bypasses RLS. The UPDATE policy therefore only permits authenticated
--    users to keep a reminder PENDING or move it to CANCELLED.
-- ---------------------------------------------------------------------------
ALTER TABLE cheque_reminders ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Allow authenticated read on cheque_reminders"
        ON cheque_reminders FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow authenticated insert on cheque_reminders"
        ON cheque_reminders FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow authenticated reschedule/cancel on cheque_reminders"
        ON cheque_reminders FOR UPDATE TO authenticated
        USING (true)
        WITH CHECK (status IN ('PENDING', 'CANCELLED'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow authenticated delete on cheque_reminders"
        ON cheque_reminders FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Explicit grants (RLS still applies to authenticated; service_role bypasses it).
GRANT SELECT, INSERT, UPDATE, DELETE ON cheque_reminders TO authenticated;
GRANT ALL ON cheque_reminders TO service_role;

-- ---------------------------------------------------------------------------
-- 5. ATOMIC CLAIM FUNCTION
--    Selects due reminders and atomically flips them to PROCESSING while
--    incrementing attempts. FOR UPDATE SKIP LOCKED guarantees that two
--    concurrent scheduler runs never claim (and therefore never email)
--    the same reminder twice.
--    SECURITY DEFINER + execute granted to service_role only means the
--    function can never be invoked from the public/anon/authenticated API.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION claim_due_cheque_reminders(batch_size INT DEFAULT 20)
RETURNS SETOF cheque_reminders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH due AS (
        SELECT id
        FROM cheque_reminders
        WHERE status = 'PENDING'
          AND reminder_at <= NOW()
          AND attempts < 5
        ORDER BY reminder_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT batch_size
    )
    UPDATE cheque_reminders cr
    SET status = 'PROCESSING',
        attempts = cr.attempts + 1,
        updated_at = NOW()
    FROM due
    WHERE cr.id = due.id
    RETURNING cr.*;
END;
$$;

REVOKE EXECUTE ON FUNCTION claim_due_cheque_reminders(INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_due_cheque_reminders(INT) TO service_role;
