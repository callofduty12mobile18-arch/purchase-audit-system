/**
 * Cheque Reminder Service
 * ---------------------------------------------------------------------------
 * All write operations (schedule, cancel) are routed through the
 * save-cheque-reminder Edge Function which uses the Supabase service-role key
 * server-side. This is the only correct approach because:
 *
 *   1. The demo / offline auth fallback in useAuth produces a synthetic User
 *      object without a real Supabase JWT. Without a valid JWT the anon role is
 *      used for all Supabase client calls — and the cheque_reminders RLS INSERT
 *      policy requires the `authenticated` role, not `anon`.
 *   2. Even for real Supabase sessions, routing through the Edge Function lets
 *      us enforce server-side authorization (invoice must exist) without
 *      trusting client-supplied data.
 *   3. The service-role key never reaches the browser.
 *
 * Read operations (getByInvoice) still go directly through the Supabase client
 * because the SELECT policy grants access to the `authenticated` role AND the
 * function also handles reads for the demo session via the Edge Function.
 */

import { supabase } from '../integrations/supabase/client';
import { ChequeReminder } from '../types';

// All reminder dates/times are captured in IST (Asia/Kolkata).
const IST_OFFSET = '+05:30';

/**
 * Convert an IST calendar date (YYYY-MM-DD) + time (HH:mm) into a UTC ISO
 * timestamp suitable for the cheque_reminders.reminder_at timestamptz column.
 */
export const istDateTimeToUtcIso = (date: string, time: string): string | null => {
  if (!date || !time) return null;
  const hhmm = time.length >= 5 ? time.slice(0, 5) : time;
  const parsed = new Date(`${date}T${hhmm}:00${IST_OFFSET}`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

/**
 * Convert a stored UTC ISO timestamp back into IST calendar date (YYYY-MM-DD)
 * and time (HH:mm) so the form can re-hydrate an existing reminder.
 */
export const utcIsoToIstParts = (iso: string): { date: string; time: string } => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: '', time: '' };
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  let hour = get('hour');
  if (hour === '24') hour = '00';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${hour}:${get('minute')}`,
  };
};

export interface ScheduleReminderInput {
  invoiceId: string;
  invoiceNumber: string;
  supplierName?: string;
  amount: number;
  chequePresentationDate?: string;
  recipientEmail: string;
  reminderDate: string; // YYYY-MM-DD (IST)
  reminderTime: string; // HH:mm (IST)
  createdBy?: string;
}

// ─── Edge Function transport ────────────────────────────────────────────────

const EDGE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL ?? ''}/functions/v1/save-cheque-reminder`;
const APP_SECRET = (import.meta.env.VITE_APP_SECRET ?? '').trim();

/**
 * Call the save-cheque-reminder Edge Function.
 *
 * Auth priority:
 *  1. Include the current Supabase session JWT (Bearer token) when available.
 *  2. Fall back to the x-app-secret header for demo / offline sessions.
 *
 * Throws with the server error message on non-2xx responses.
 */
async function callEdgeFn(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  // Attach the real JWT if a Supabase session exists
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  } else if (APP_SECRET) {
    // Demo / offline auth fallback — no real JWT available
    headers['x-app-secret'] = APP_SECRET;
  }

  const res = await fetch(EDGE_FN_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const payload = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) {
    throw new Error(
      (payload as { error?: string }).error ??
        `Edge Function returned HTTP ${res.status}`
    );
  }
  return payload as Record<string, unknown>;
}

// ─── Public service ─────────────────────────────────────────────────────────

export const chequeReminderService = {
  /**
   * Fetch the reminder attached to an invoice (if any).
   *
   * Tries the direct Supabase client first (works when the user has a real
   * session). Falls back to the Edge Function when the client is in anon/demo
   * mode so the UI can still re-hydrate the form on edit.
   */
  getByInvoice: async (invoiceId: string): Promise<ChequeReminder | null> => {
    // Try direct client — works for real Supabase sessions
    try {
      const { data, error } = await supabase
        .from('cheque_reminders')
        .select('*')
        .eq('invoice_id', invoiceId)
        .maybeSingle();

      // If there was no auth error and we got a clean result, return it
      if (!error) return (data as ChequeReminder) || null;

      // RLS rejection means we're in anon/demo mode — fall through to Edge Function
      if (!error.message.includes('row-level security') && !error.message.includes('policy')) {
        console.warn('cheque_reminders fetch note:', error.message);
        return null;
      }
    } catch (e) {
      console.warn('cheque_reminders direct fetch exception:', e);
    }

    // Fallback: read via Edge Function (handles demo/offline sessions)
    try {
      const result = await callEdgeFn({ op: 'get', invoiceId });
      return (result.reminder as ChequeReminder) ?? null;
    } catch (e) {
      console.warn('cheque_reminders edge fetch exception:', e);
      return null;
    }
  },

  /**
   * Create or reschedule the reminder for an invoice via the Edge Function.
   *
   * The upsert is keyed on invoice_id so there is always exactly one active
   * reminder per invoice. The function resets the row to PENDING with a clean
   * attempt counter, preventing duplicate emails on edit.
   *
   * Throws on failure — callers must handle the error and NOT show a success
   * message if this throws.
   */
  schedule: async (input: ScheduleReminderInput): Promise<ChequeReminder> => {
    const reminderAt = istDateTimeToUtcIso(input.reminderDate, input.reminderTime);
    if (!reminderAt) throw new Error('Reminder date and time are required.');

    const result = await callEdgeFn({
      op: 'schedule',
      invoiceId: input.invoiceId,
      invoiceNumber: input.invoiceNumber,
      supplierName: input.supplierName ?? null,
      amount: input.amount,
      chequePresentationDate: input.chequePresentationDate ?? null,
      recipientEmail: input.recipientEmail,
      reminderAt,
      createdBy: input.createdBy ?? null,
    });

    return result.reminder as ChequeReminder;
  },

  /**
   * Cancel the reminder for an invoice via the Edge Function.
   * Keeps the row for audit purposes (status -> CANCELLED).
   *
   * This is a best-effort operation — it must never block invoice save.
   */
  cancel: async (invoiceId: string): Promise<void> => {
    await callEdgeFn({ op: 'cancel', invoiceId });
  },

  /**
   * Reconcile reminder state with a saved invoice:
   * - enabled  -> schedule / reschedule
   * - disabled -> cancel any existing reminder
   *
   * Throws on schedule failure so the caller can surface the error.
   * Cancel failures are swallowed (non-fatal for the invoice save).
   */
  syncForInvoice: async (
    enabled: boolean,
    input: Omit<ScheduleReminderInput, 'invoiceId' | 'invoiceNumber'> & {
      invoiceId: string;
      invoiceNumber: string;
    }
  ): Promise<ChequeReminder | null> => {
    if (!enabled) {
      // Cancel is non-fatal
      try {
        await chequeReminderService.cancel(input.invoiceId);
      } catch (e) {
        console.warn('cheque reminder cancel (non-fatal):', e);
      }
      return null;
    }
    return chequeReminderService.schedule(input);
  },
};
