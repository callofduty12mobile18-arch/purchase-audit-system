-- Migration: Rename cheque_reminders.cheque_clearance_date -> cheque_presentation_date
-- Created: 2026-11-01
--
-- The reminder is now driven by the cheque PRESENTATION date (the date the
-- cheque is expected to be presented / clear), so the column is renamed to
-- match the vocabulary used everywhere else.
--
-- Guarded and idempotent: the rename only happens when the old column exists
-- and the new column does not, so this migration is safe to re-run and safe on
-- a database where the table has not been created yet.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'cheque_reminders'
          AND column_name = 'cheque_clearance_date'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'cheque_reminders'
          AND column_name = 'cheque_presentation_date'
    ) THEN
        ALTER TABLE public.cheque_reminders
            RENAME COLUMN cheque_clearance_date TO cheque_presentation_date;
    END IF;
END $$;
