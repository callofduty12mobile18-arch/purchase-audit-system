-- Migration: Schedule the cheque reminder processor every minute
-- Created: 2026-11-01
--
-- PREREQUISITES (run once in the Supabase dashboard / SQL editor BEFORE this
-- migration, and keep the secret value out of source control):
--
--   select vault.create_secret(
--     'https://<your-project-ref>.supabase.co/functions/v1/process-cheque-reminders',
--     'cheque_function_url',
--     'URL of the process-cheque-reminders Edge Function'
--   );
--
--   select vault.create_secret(
--     '<long-random-shared-secret>',
--     'cheque_cron_secret',
--     'Shared secret sent in the x-cron-secret header'
--   );
--
-- The same value used for cheque_cron_secret must be set as the Edge Function
-- secret CHEQUE_CRON_SECRET:
--   supabase secrets set CHEQUE_CRON_SECRET=<long-random-shared-secret>

-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any previous version of this job so the migration is idempotent.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-cheque-reminders-every-minute') THEN
        PERFORM cron.unschedule('process-cheque-reminders-every-minute');
    END IF;
END $$;

-- Run every minute. Reads the function URL and shared secret from Vault so no
-- credentials are committed to the repository.
SELECT cron.schedule(
    'process-cheque-reminders-every-minute',
    '* * * * *',
    $$
    SELECT net.http_post(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cheque_function_url'),
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cheque_cron_secret')
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 30000
    ) AS request_id;
    $$
);
