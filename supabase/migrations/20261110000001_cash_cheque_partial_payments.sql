-- Migration: Cash + Cheque Partial Payment Management
-- Created: 2026-11-10
--
-- Implements:
--   1. Dedicated invoice_payments table for Cash + Cheque partial payments
--   2. Multiple cheques per invoice support with per-cheque reminder tracking
--   3. Concurrency-safe calculation and status transition trigger
--   4. Updated auto_clear_due_cheque_invoices() compatible with partial payments
--   5. Safe idempotent backfill of existing purchase invoices into invoice_payments
--   6. Strict RLS policies and grants

-- ---------------------------------------------------------------------------
-- 0. PREREQUISITES & IDEMPOTENT TYPE CHECKS
-- ---------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE cheque_status_enum AS ENUM ('PENDING', 'CLEARED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.purchase_invoices
    ADD COLUMN IF NOT EXISTS cheque_status cheque_status_enum;

ALTER TABLE public.purchase_invoices
    ADD COLUMN IF NOT EXISTS cheque_presentation_date DATE;

ALTER TABLE public.purchase_invoices
    ADD COLUMN IF NOT EXISTS cheque_amount NUMERIC(12, 2);

ALTER TABLE public.purchase_invoices
    ADD COLUMN IF NOT EXISTS bank_name TEXT;

-- ---------------------------------------------------------------------------
-- 1. CREATE INVOICE PAYMENTS TABLE
--    Only CASH and CHEQUE payment methods are supported.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoice_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.purchase_invoices(id) ON DELETE CASCADE,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH', 'CHEQUE')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL,
    payment_status TEXT NOT NULL CHECK (payment_status IN ('PENDING', 'CLEARED', 'BOUNCED', 'CANCELLED')),
    cheque_number TEXT,
    bank_name TEXT,
    cheque_date DATE,
    clearance_date DATE,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Cash is always completed (CLEARED) upon recording
    CONSTRAINT chk_cash_status CHECK (
        payment_method <> 'CASH' OR payment_status = 'CLEARED'
    ),
    -- Cheques cycle through PENDING, CLEARED, BOUNCED, CANCELLED
    CONSTRAINT chk_cheque_status CHECK (
        payment_method <> 'CHEQUE' OR payment_status IN ('PENDING', 'CLEARED', 'BOUNCED', 'CANCELLED')
    )
);

-- Link cheque_reminders to an optional specific payment line
ALTER TABLE public.cheque_reminders
    ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.invoice_payments(id) ON DELETE CASCADE;

-- Relax single reminder constraint per invoice to support multiple cheques per invoice
ALTER TABLE public.cheque_reminders
    DROP CONSTRAINT IF EXISTS cheque_reminders_invoice_unique;

-- Each partial payment can have at most one reminder
CREATE UNIQUE INDEX IF NOT EXISTS ux_cheque_reminders_payment_id 
    ON public.cheque_reminders(payment_id) 
    WHERE payment_id IS NOT NULL;

-- Backward compatibility: at most one unlinked legacy reminder per invoice
CREATE UNIQUE INDEX IF NOT EXISTS ux_cheque_reminders_legacy_invoice 
    ON public.cheque_reminders(invoice_id) 
    WHERE payment_id IS NULL;

-- ---------------------------------------------------------------------------
-- 2. INDEXES
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id 
    ON public.invoice_payments(invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_method_status 
    ON public.invoice_payments(payment_method, payment_status);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_due_cheques 
    ON public.invoice_payments(clearance_date) 
    WHERE payment_method = 'CHEQUE' AND payment_status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_invoice_payments_payment_date 
    ON public.invoice_payments(payment_date);

CREATE INDEX IF NOT EXISTS idx_cheque_reminders_payment_id 
    ON public.cheque_reminders(payment_id);

-- ---------------------------------------------------------------------------
-- 3. CONCURRENCY-SAFE PAYMENT CALCULATION & STATUS FUNCTION
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalculate_invoice_payment_status(p_invoice_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_grand_total NUMERIC(12, 2);
    v_cleared_amount NUMERIC(12, 2) := 0.00;
    v_pending_cheque_amount NUMERIC(12, 2) := 0.00;
    v_new_status payment_status_enum;
    v_invoice_date DATE;
BEGIN
    -- Concurrency guard: lock target invoice row
    SELECT grand_total, invoice_date
    INTO v_grand_total, v_invoice_date
    FROM public.purchase_invoices
    WHERE id = p_invoice_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Cleared Amount: All Cash + All Cleared Cheques
    SELECT COALESCE(SUM(amount), 0.00)
    INTO v_cleared_amount
    FROM public.invoice_payments
    WHERE invoice_id = p_invoice_id
      AND payment_status = 'CLEARED';

    -- Pending Cheque Amount: All Pending Cheques
    SELECT COALESCE(SUM(amount), 0.00)
    INTO v_pending_cheque_amount
    FROM public.invoice_payments
    WHERE invoice_id = p_invoice_id
      AND payment_method = 'CHEQUE'
      AND payment_status = 'PENDING';

    -- Prevent payments exceeding invoice grand total
    IF (v_cleared_amount + v_pending_cheque_amount) > (v_grand_total + 0.01) THEN
        RAISE EXCEPTION 'Total payments (cleared: %, pending: %) exceed invoice total (%) for invoice %',
            v_cleared_amount, v_pending_cheque_amount, v_grand_total, p_invoice_id;
    END IF;

    -- Determine Invoice Payment Status:
    -- 1. Full settled -> PAID
    -- 2. Partial cleared -> PARTIALLY_PAID
    -- 3. Unsettled / Cheque pending clearance -> UNPAID
    IF v_cleared_amount >= (v_grand_total - 0.01) THEN
        v_new_status := 'PAID';
    ELSIF v_cleared_amount > 0 THEN
        v_new_status := 'PARTIALLY_PAID';
    ELSE
        v_new_status := 'UNPAID';
    END IF;

    UPDATE public.purchase_invoices
    SET payment_status = v_new_status,
        cheque_status = CASE 
            WHEN v_cleared_amount >= (v_grand_total - 0.01) AND cheque_status = 'PENDING' THEN 'CLEARED'::cheque_status_enum
            WHEN v_pending_cheque_amount > 0 THEN 'PENDING'::cheque_status_enum
            ELSE cheque_status
        END,
        updated_at = NOW()
    WHERE id = p_invoice_id;
END;
$$;

REVOKE ALL ON FUNCTION public.recalculate_invoice_payment_status(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recalculate_invoice_payment_status(UUID) TO authenticated, anon, service_role;

-- ---------------------------------------------------------------------------
-- 4. TRIGGER ON INVOICE PAYMENTS
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_invoice_payments_recalc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_invoice_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_invoice_id := OLD.invoice_id;
    ELSE
        target_invoice_id := NEW.invoice_id;
    END IF;

    PERFORM public.recalculate_invoice_payment_status(target_invoice_id);

    IF TG_OP = 'UPDATE' AND OLD.invoice_id <> NEW.invoice_id THEN
        PERFORM public.recalculate_invoice_payment_status(OLD.invoice_id);
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoice_payments_after_change ON public.invoice_payments;
CREATE TRIGGER trg_invoice_payments_after_change
AFTER INSERT OR UPDATE OR DELETE ON public.invoice_payments
FOR EACH ROW
EXECUTE FUNCTION public.trg_invoice_payments_recalc();

-- ---------------------------------------------------------------------------
-- 5. UPDATED AUTO-CLEARANCE FUNCTION
--    Safely clears individual due cheque payments on their clearance dates
--    and updates invoice payment statuses accordingly.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_clear_due_cheque_invoices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_today DATE := (NOW() AT TIME ZONE 'Asia/Kolkata')::date;
    v_cleared INT := 0;
    v_cancelled INT := 0;
    r RECORD;
BEGIN
    BEGIN
        -- 1. Find and clear due cheque payments
        WITH due_payments AS (
            SELECT id, invoice_id, amount
            FROM public.invoice_payments
            WHERE payment_method = 'CHEQUE'
              AND payment_status = 'PENDING'
              AND clearance_date IS NOT NULL
              AND clearance_date <= v_today
            ORDER BY clearance_date
            FOR UPDATE SKIP LOCKED
        ),
        cleared_payments AS (
            UPDATE public.invoice_payments ip
            SET payment_status = 'CLEARED',
                updated_at = NOW()
            FROM due_payments dp
            WHERE ip.id = dp.id
            RETURNING ip.id, ip.invoice_id, ip.amount
        ),
        ins_audit AS (
            INSERT INTO public.audit_logs (
                user_id, action, entity_type, entity_id,
                old_value, new_value, reason, timestamp
            )
            SELECT
                NULL,
                'CHEQUE_AUTO_CLEARED',
                'invoice_payments',
                cp.id,
                jsonb_build_object('payment_status', 'PENDING', 'amount', cp.amount),
                jsonb_build_object('payment_status', 'CLEARED', 'amount', cp.amount),
                'Cheque payment automatically cleared on its clearance date',
                NOW()
            FROM cleared_payments cp
            RETURNING entity_id
        ),
        cancel_rem AS (
            UPDATE public.cheque_reminders cr
            SET status     = 'CANCELLED',
                last_error = 'Cheque payment cleared automatically on its presentation date',
                updated_at = NOW()
            WHERE (cr.payment_id IN (SELECT id FROM cleared_payments)
                   OR cr.invoice_id IN (SELECT invoice_id FROM cleared_payments))
              AND cr.status IN ('PENDING', 'PROCESSING', 'FAILED')
            RETURNING cr.id
        )
        SELECT (SELECT COUNT(*) FROM cleared_payments)::int,
               (SELECT COUNT(*) FROM cancel_rem)::int
        INTO v_cleared, v_cancelled;

        -- 2. Recalculate status for all affected invoices
        FOR r IN (
            SELECT DISTINCT invoice_id
            FROM public.invoice_payments
            WHERE payment_method = 'CHEQUE'
              AND clearance_date <= v_today
              AND updated_at >= NOW() - INTERVAL '1 minute'
        ) LOOP
            PERFORM public.recalculate_invoice_payment_status(r.invoice_id);
        END LOOP;

        -- 3. Legacy compatibility: also process any unmigrated invoices if present
        WITH legacy_due AS (
            SELECT id
            FROM public.purchase_invoices pi
            WHERE payment_mode = 'CHEQUE'
              AND cheque_status = 'PENDING'
              AND payment_status <> 'PAID'
              AND cheque_presentation_date IS NOT NULL
              AND cheque_presentation_date <= v_today
              AND NOT EXISTS (
                  SELECT 1 FROM public.invoice_payments ip WHERE ip.invoice_id = pi.id
              )
            ORDER BY cheque_presentation_date
            FOR UPDATE SKIP LOCKED
        ),
        legacy_updated AS (
            UPDATE public.purchase_invoices pi
            SET payment_status = 'PAID',
                cheque_status  = 'CLEARED',
                updated_at     = NOW()
            FROM legacy_due
            WHERE pi.id = legacy_due.id
            RETURNING pi.id
        )
        SELECT v_cleared + (SELECT COUNT(*) FROM legacy_updated)::int INTO v_cleared;

        IF v_cleared > 0 OR v_cancelled > 0 THEN
            INSERT INTO public.cheque_automation_log (
                run_at, source, cleared_count, cancelled_reminders, status
            ) VALUES (NOW(), 'pg_cron', v_cleared, v_cancelled, 'SUCCESS');
            RAISE LOG 'auto_clear_due_cheque_invoices: cleared=%, cancelled=%', v_cleared, v_cancelled;
        END IF;

    EXCEPTION WHEN OTHERS THEN
        BEGIN
            INSERT INTO public.cheque_automation_log (
                run_at, source, cleared_count, cancelled_reminders, status, error_message
            ) VALUES (NOW(), 'pg_cron', 0, 0, 'ERROR', SQLERRM);
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
        RAISE WARNING 'auto_clear_due_cheque_invoices FAILED: % (SQLSTATE %)', SQLERRM, SQLSTATE;
        RETURN;
    END;
END;
$$;

REVOKE ALL ON FUNCTION public.auto_clear_due_cheque_invoices() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auto_clear_due_cheque_invoices() TO service_role;

-- ---------------------------------------------------------------------------
-- 6. IDEMPOTENT BACKFILL OF HISTORICAL INVOICES
-- ---------------------------------------------------------------------------
-- Backfill CASH invoices (41 existing records in production)
INSERT INTO public.invoice_payments (
    invoice_id,
    payment_method,
    amount,
    payment_date,
    payment_status,
    notes,
    created_at,
    updated_at
)
SELECT
    pi.id,
    'CASH',
    pi.grand_total,
    pi.invoice_date,
    'CLEARED',
    'Auto-migrated from legacy purchase invoice cash settlement',
    pi.created_at,
    NOW()
FROM public.purchase_invoices pi
WHERE pi.payment_mode = 'CASH'
  AND pi.payment_status = 'PAID'
  AND NOT EXISTS (
      SELECT 1 FROM public.invoice_payments ip WHERE ip.invoice_id = pi.id
  );

-- Backfill CLEARED CHEQUE invoices
INSERT INTO public.invoice_payments (
    invoice_id,
    payment_method,
    amount,
    payment_date,
    payment_status,
    cheque_date,
    clearance_date,
    notes,
    created_at,
    updated_at
)
SELECT
    pi.id,
    'CHEQUE',
    COALESCE(pi.cheque_amount, pi.grand_total),
    pi.invoice_date,
    'CLEARED',
    pi.invoice_date,
    COALESCE(pi.cheque_presentation_date, pi.invoice_date),
    'Auto-migrated from legacy cleared cheque settlement',
    pi.created_at,
    NOW()
FROM public.purchase_invoices pi
WHERE pi.payment_mode = 'CHEQUE'
  AND (pi.cheque_status = 'CLEARED' OR pi.payment_status = 'PAID')
  AND NOT EXISTS (
      SELECT 1 FROM public.invoice_payments ip WHERE ip.invoice_id = pi.id
  );

-- Backfill PENDING CHEQUE invoices
INSERT INTO public.invoice_payments (
    invoice_id,
    payment_method,
    amount,
    payment_date,
    payment_status,
    cheque_date,
    clearance_date,
    notes,
    created_at,
    updated_at
)
SELECT
    pi.id,
    'CHEQUE',
    COALESCE(pi.cheque_amount, pi.grand_total),
    pi.invoice_date,
    'PENDING',
    pi.invoice_date,
    COALESCE(pi.cheque_presentation_date, pi.invoice_date),
    'Auto-migrated from legacy pending cheque settlement',
    pi.created_at,
    NOW()
FROM public.purchase_invoices pi
WHERE pi.payment_mode = 'CHEQUE'
  AND pi.cheque_status = 'PENDING'
  AND pi.payment_status <> 'PAID'
  AND NOT EXISTS (
      SELECT 1 FROM public.invoice_payments ip WHERE ip.invoice_id = pi.id
  );

-- ---------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ---------------------------------------------------------------------------
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Allow authenticated read on invoice_payments"
        ON public.invoice_payments FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow authenticated insert on invoice_payments"
        ON public.invoice_payments FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow authenticated update on invoice_payments"
        ON public.invoice_payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow authenticated delete on invoice_payments"
        ON public.invoice_payments FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Allow anon read/write if demo auth is enabled
DO $$ BEGIN
    CREATE POLICY "Allow anon read on invoice_payments"
        ON public.invoice_payments FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow anon insert on invoice_payments"
        ON public.invoice_payments FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow anon update on invoice_payments"
        ON public.invoice_payments FOR UPDATE TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

GRANT ALL ON public.invoice_payments TO authenticated;
GRANT ALL ON public.invoice_payments TO anon;
GRANT ALL ON public.invoice_payments TO service_role;

