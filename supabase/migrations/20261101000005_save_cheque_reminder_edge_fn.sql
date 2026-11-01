-- Migration: save-cheque-reminder Edge Function — RLS fix
-- Created: 2026-11-01
--
-- Root cause of the production issue
-- -----------------------------------
-- The cheque_reminders INSERT RLS policy grants access to the `authenticated`
-- role. When the application runs in demo / offline auth mode (Supabase Auth
-- not configured or unreachable), the Supabase JS client has no valid JWT and
-- falls back to the `anon` role. The INSERT policy does not cover `anon`, so
-- every reminder upsert was silently rejected with:
--   "new row violates row-level security policy for table cheque_reminders"
-- The invoice itself saved because dbService has a localStorage fallback, but
-- the reminder has no such fallback and threw.
--
-- Fix
-- ---
-- All write operations (schedule, cancel) and the read fallback are now routed
-- through the save-cheque-reminder Edge Function, which uses the service-role
-- key (bypasses RLS). The function enforces its own authorization checks:
--   1. The caller must present a valid Supabase JWT or the APP_SECRET header.
--   2. The referenced invoice_id must exist in purchase_invoices.
-- RLS is kept ENABLED and unchanged — this migration adds no new policies and
-- does not alter existing ones.
--
-- Operations team checklist
-- -------------------------
-- After deploying this migration, set the function secret on Supabase:
--
--   supabase secrets set APP_SECRET=<value-of-VITE_APP_SECRET-from-.env.local>
--
-- The same long random string must be set as VITE_APP_SECRET in the frontend
-- environment (.env.local / Vercel / hosting platform) so the demo auth
-- fallback can authenticate against the Edge Function.
--
-- Verify with:
--   supabase secrets list   # should show APP_SECRET

-- This migration is documentation only — no DDL changes are required.
-- The Edge Function (supabase/functions/save-cheque-reminder/index.ts) carries
-- all the logic. No existing RLS policies, tables, indexes or functions are
-- modified here.

-- Confirm RLS is still active on cheque_reminders (idempotent, safe to re-run)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = 'cheque_reminders'
          AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE public.cheque_reminders ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'cheque_reminders: RLS was not enabled — enabled now.';
    ELSE
        RAISE NOTICE 'cheque_reminders: RLS is already enabled. No changes made.';
    END IF;
END $$;
