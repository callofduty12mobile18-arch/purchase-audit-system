// Supabase Edge Function: process-cheque-reminders
// -----------------------------------------------------------------------------
// Invoked every minute by pg_cron (via pg_net). It atomically claims due cheque
// reminders, verifies the invoice is still payable, and emails the reminder
// using Resend. All secrets live server-side as function secrets.
//
// Required function secrets (never exposed to the frontend):
//   CHEQUE_CRON_SECRET     - shared secret required in the `x-cron-secret` header
//   RESEND_API_KEY         - Resend API key (stored only in Edge Function Secrets)
//   FROM_EMAIL             - sender address. Defaults to Resend's permitted
//                            testing sender, "onboarding@resend.dev". Set this to
//                            an address on your own verified domain to go live.
//   RESEND_TEST_RECIPIENT  - optional. While you do not own a verified domain,
//                            set this to the email registered with your Resend
//                            account so every test email is delivered there and
//                            never to any other address. Remove it (and set
//                            FROM_EMAIL to your verified sender) to go live.
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.)

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildChequeReminderEmail } from './emailTemplate.ts';

const MAX_ATTEMPTS = 5;            // must match claim_due_cheque_reminders()
const BATCH_SIZE = 20;
const RETRY_BACKOFF_MINUTES = 5;   // backoff grows with the attempt count

interface ClaimedReminder {
  id: string;
  invoice_id: string;
  invoice_number: string;
  supplier_name: string | null;
  amount: number;
  cheque_clearance_date: string | null;
  recipient_email: string;
  reminder_at: string;
  status: string;
  attempts: number;
}

const json = (body: Record<string, unknown>, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const markCancelled = async (supabase: SupabaseClient, id: string, reason: string): Promise<void> => {
  await supabase
    .from('cheque_reminders')
    .update({ status: 'CANCELLED', last_error: reason, updated_at: new Date().toISOString() })
    .eq('id', id);
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // --- 1. Authenticate the caller (cron only) --------------------------------
  const expectedSecret = Deno.env.get('CHEQUE_CRON_SECRET') ?? '';
  const providedSecret = req.headers.get('x-cron-secret') ?? '';
  if (!expectedSecret || providedSecret !== expectedSecret) {
    return json({ error: 'Unauthorized' }, 401);
  }

  // --- 2. Read server-side configuration -------------------------------------
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? '';
  // Permitted testing sender by default; switch to a verified-domain address to go live.
  const fromAddress = Deno.env.get('FROM_EMAIL') ?? 'onboarding@resend.dev';
  // While set, every email is delivered here only (the address registered with
  // the Resend account), so no test mail can reach any other recipient.
  const testRecipient = (Deno.env.get('RESEND_TEST_RECIPIENT') ?? '').trim();

  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Server misconfigured' }, 500);
  // Fail before claiming so reminders are not consumed while email is unavailable.
  if (!resendApiKey) return json({ error: 'Email provider not configured' }, 500);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // --- 3. Atomically claim due reminders -------------------------------------
  const { data: due, error: claimError } = await supabase.rpc('claim_due_cheque_reminders', {
    batch_size: BATCH_SIZE,
  });
  if (claimError) return json({ error: `Claim failed: ${claimError.message}` }, 500);

  const reminders = (due ?? []) as ClaimedReminder[];
  const results = { claimed: reminders.length, sent: 0, failed: 0, cancelled: 0, retried: 0 };

  for (const reminder of reminders) {
    try {
      // --- 4. Verify the invoice is still payable ---------------------------
      const { data: invoice } = await supabase
        .from('purchase_invoices')
        .select('id, payment_status')
        .eq('id', reminder.invoice_id)
        .maybeSingle();

      if (!invoice) {
        await markCancelled(supabase, reminder.id, 'Invoice no longer exists');
        results.cancelled++;
        continue;
      }
      if (invoice.payment_status === 'PAID') {
        await markCancelled(supabase, reminder.id, 'Invoice already paid');
        results.cancelled++;
        continue;
      }

      // --- 5. Send the reminder email via Resend ----------------------------
      const { subject, html, text } = buildChequeReminderEmail({
        invoiceNumber: reminder.invoice_number,
        supplierName: reminder.supplier_name ?? '',
        amount: Number(reminder.amount) || 0,
        chequeClearanceDate: reminder.cheque_clearance_date,
        reminderAtIso: reminder.reminder_at,
      });

      // Route only to the registered test address while testing; otherwise to
      // the reminder's configured recipient.
      const recipients = testRecipient ? [testRecipient] : [reminder.recipient_email];

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: recipients,
          subject,
          html,
          text,
        }),
      });

      if (!resendRes.ok) {
        const bodyText = await resendRes.text();
        throw new Error(`Resend ${resendRes.status}: ${bodyText.slice(0, 300)}`);
      }

      await supabase
        .from('cheque_reminders')
        .update({
          status: 'SENT',
          sent_at: new Date().toISOString(),
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reminder.id);
      results.sent++;
    } catch (err: unknown) {
      // --- 6. Safe retry handling -------------------------------------------
      const message = err instanceof Error ? err.message : String(err);
      const attempts = Number(reminder.attempts) || 1;

      if (attempts >= MAX_ATTEMPTS) {
        await supabase
          .from('cheque_reminders')
          .update({ status: 'FAILED', last_error: message, updated_at: new Date().toISOString() })
          .eq('id', reminder.id);
        results.failed++;
      } else {
        const nextAttemptAt = new Date(
          Date.now() + attempts * RETRY_BACKOFF_MINUTES * 60_000
        ).toISOString();
        await supabase
          .from('cheque_reminders')
          .update({
            status: 'PENDING',
            reminder_at: nextAttemptAt,
            last_error: message,
            updated_at: new Date().toISOString(),
          })
          .eq('id', reminder.id);
        results.retried++;
      }
    }
  }

  return json({ ok: true, ...results });
});
