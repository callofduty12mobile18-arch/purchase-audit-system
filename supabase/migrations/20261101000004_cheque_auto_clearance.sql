-- Migration: Automatic cheque clearance (atomic + idempotent) + audit trail
-- Created: 2026-11-01
--
-- On the cheque PRESENTATION date, every pending cheque invoice is
-- automatically moved:
--     cheque_status  : PENDING  -> CLEARED
--     payment_status : UNPAID   -> PAID
-- and any still-pending email reminder for that invoice is cancelled.
--
-- This is the ONLY primary auto-clearance mechanism (pg_cron runs the SQL
-- function below every minute). The process-cheque-reminders Edge Function
-- deliberately does NOT clear invoices -- it only sends reminder emails.
--
-- Safety properties:
--   * Atomic    - a single statement/transaction: either every invoice in the
--                 run is cleared (with its audit row and reminder cancel) or
--                 nothing is.
--   * Idempotent- only rows with cheque_status = 'PENDING' are ever touched, and
--                 a partial unique index guarantees at most ONE
--                 'CHEQUE_AUTO_CLEARED' audit row per invoice.
--   * No backfill- historical cheque invoices are never modified; only rows
--                 explicitly marked cheque_status = 'PENDING' are processed.
--   * Visible   - failures are written to cheque_automation_log AND raised as a
--                 WARNING so they surface in the Supabase / PostgreSQL logs.

-- ---------------------------------------------------------------------------
-- 1. EXTENSION
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ---------------------------------------------------------------------------
-- 2. AUTOMATION LOG  (one row per run that actually did work, plus every error)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cheque_automation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source TEXT NOT NULL DEFAULT 'pg_cron',
    cleared_count INTEGER NOT NULL DEFAULT 0,
    cancelled_reminders INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'SUCCESS',
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_cheque_automation_log_run_at
    ON public.cheque_automation_log (run_at DESC);

-- Ops log: not exposed through the public/anon/authenticated API.
REVOKE ALL ON public.cheque_automation_log FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.cheque_automation_log TO service_role;

-- ---------------------------------------------------------------------------
-- 3. IDEMPOTENCY GUARD
--    At most one auto-clearance audit entry per invoice, forever.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS ux_audit_cheque_auto_cleared
    ON public.audit_logs (entity_id)
    WHERE action = 'CHEQUE_AUTO_CLEARED';

-- ---------------------------------------------------------------------------
-- 4. AUTO-CLEARANCE FUNCTION
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
BEGIN
    BEGIN
        WITH due AS (
            SELECT id
            FROM public.purchase_invoices
            WHERE payment_mode = 'CHEQUE'
              AND cheque_status = 'PENDING'
              AND payment_status <> 'PAID'
              AND cheque_presentation_date IS NOT NULL
              AND cheque_presentation_date <= v_today
            ORDER BY cheque_presentation_date
            FOR UPDATE SKIP LOCKED
        ),
        updated AS (
            UPDATE public.purchase_invoices pi
            SET payment_status = 'PAID',
                cheque_status  = 'CLEARED',
                updated_at     = NOW()
            FROM due
            WHERE pi.id = due.id
            RETURNING pi.id
        ),
        ins_audit AS (
            INSERT INTO public.audit_logs (
                user_id, action, entity_type, entity_id,
                old_value, new_value, reason, timestamp
            )
            SELECT
                NULL,
                'CHEQUE_AUTO_CLEARED',
                'purchase_invoices',
                u.id,
                jsonb_build_object('payment_status', 'UNPAID', 'cheque_status', 'PENDING'),
                jsonb_build_object('payment_status', 'PAID',   'cheque_status', 'CLEARED'),
                'Cheque automatically cleared on its presentation date',
                NOW()
            FROM updated u
            ON CONFLICT DO NOTHING
            RETURNING entity_id
        ),
        cancel_rem AS (
            UPDATE public.cheque_reminders cr
            SET status     = 'CANCELLED',
                last_error = 'Invoice cleared automatically on its presentation date',
                updated_at = NOW()
            WHERE cr.invoice_id IN (SELECT id FROM updated)
              AND cr.status IN ('PENDING', 'PROCESSING', 'FAILED')
            RETURNING cr.id
        )
        SELECT (SELECT COUNT(*) FROM updated)::int,
               (SELECT COUNT(*) FROM cancel_rem)::int
        INTO v_cleared, v_cancelled;

        IF v_cleared > 0 OR v_cancelled > 0 THEN
            INSERT INTO public.cheque_automation_log (
                run_at, source, cleared_count, cancelled_reminders, status
            ) VALUES (NOW(), 'pg_cron', v_cleared, v_cancelled, 'SUCCESS');
            RAISE LOG 'auto_clear_due_cheque_invoices: cleared=%, reminders_cancelled=%',
                v_cleared, v_cancelled;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Whole clearance step is rolled back here: no partial updates and no
        -- duplicate audit entries. Log the failure in both places so it is
        -- never silent.
        BEGIN
            INSERT INTO public.cheque_automation_log (
                run_at, source, cleared_count, cancelled_reminders, status, error_message
            ) VALUES (NOW(), 'pg_cron', 0, 0, 'ERROR', SQLERRM);
        EXCEPTION WHEN OTHERS THEN
            NULL; -- the logger must never break the cron run
        END;
        RAISE WARNING 'auto_clear_due_cheque_invoices FAILED: % (SQLSTATE %)', SQLERRM, SQLSTATE;
        RETURN;
    END;
END;
$$;

-- Service-role only: never callable from the public / anon / authenticated API.
REVOKE ALL ON FUNCTION public.auto_clear_due_cheque_invoices() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auto_clear_due_cheque_invoices() TO service_role;

-- ---------------------------------------------------------------------------
-- 5. SCHEDULE  (every minute; idempotent reschedule)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-clear-cheque-invoices-every-minute') THEN
        PERFORM cron.unschedule('auto-clear-cheque-invoices-every-minute');
    END IF;
END $$;

SELECT cron.schedule(
    'auto-clear-cheque-invoices-every-minute',
    '* * * * *',
    $$ SELECT public.auto_clear_due_cheque_invoices(); $$
);
