// Supabase Edge Function: save-cheque-reminder
// -----------------------------------------------------------------------------
// Accepts an authenticated (or demo-mode) request from the frontend to create,
// update, or cancel a cheque reminder.  The function uses the service-role key
// (injected automatically by Supabase) to bypass RLS when writing to
// cheque_reminders, while still enforcing authorization:
//
//   - The referenced invoice_id MUST exist in purchase_invoices.
//   - The caller MUST supply a valid Supabase JWT **or** the app-wide
//     x-app-secret header (for the demo / offline auth fallback).
//
// Required function secrets:
//   APP_SECRET   - a long random string also stored in VITE_APP_SECRET (but
//                  NEVER with the VITE_ prefix in this function — the service-
//                  role key is already injected automatically).
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.
//
// Allowed operations (passed in the JSON body):
//   { op: "schedule", invoiceId, invoiceNumber, supplierName?, amount,
//     chequePresentationDate?, recipientEmail, reminderAt, createdBy? }
//   { op: "cancel",   invoiceId }
//   { op: "get",      invoiceId }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const json = (body: Record<string, unknown>, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });

Deno.serve(async (req: Request): Promise<Response> => {
  // CORS pre-flight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-app-secret',
      },
    });
  }

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // ─── 1. Authenticate the caller ─────────────────────────────────────────────
  // Two valid credential paths:
  //   A. Real Supabase JWT in the Authorization header (normal session).
  //   B. x-app-secret header matching APP_SECRET (demo / offline auth fallback).
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const appSecret = (Deno.env.get('APP_SECRET') ?? '').trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Server misconfigured' }, 500);
  }

  // Build service-role client (bypasses RLS — used only after authorization passes)
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let callerAuthenticated = false;
  let callerId: string | null = null;

  // Path A: Supabase JWT
  const authHeader = req.headers.get('Authorization') ?? '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const { data: { user }, error } = await adminClient.auth.getUser(token);
    if (!error && user?.id) {
      callerAuthenticated = true;
      callerId = user.id;
    }
  }

  // Path B: Demo / offline app secret
  if (!callerAuthenticated && appSecret) {
    const providedSecret = (req.headers.get('x-app-secret') ?? '').trim();
    if (providedSecret === appSecret) {
      callerAuthenticated = true;
      callerId = null; // demo user — no real UUID
    }
  }

  if (!callerAuthenticated) {
    return json({ error: 'Unauthorized' }, 401);
  }

  // ─── 2. Parse request body ──────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const op = String(body.op ?? '');
  const invoiceId = String(body.invoiceId ?? '');

  if (!invoiceId) return json({ error: 'invoiceId is required' }, 400);

  // ─── 3. Authorization gate: invoice must exist ─────────────────────────────
  // This is the server-side check that "users can only create reminders for
  // invoices they are authorized to access."
  const { data: invoice, error: invErr } = await adminClient
    .from('purchase_invoices')
    .select('id, payment_mode, payment_status')
    .eq('id', invoiceId)
    .maybeSingle();

  if (invErr || !invoice) {
    return json({ error: 'Invoice not found or access denied' }, 403);
  }

  // ─── 4. Dispatch by operation ───────────────────────────────────────────────
  if (op === 'get') {
    const { data, error } = await adminClient
      .from('cheque_reminders')
      .select('*')
      .eq('invoice_id', invoiceId)
      .maybeSingle();
    if (error) return json({ error: error.message }, 500);
    return json({ reminder: data ?? null });
  }

  if (op === 'cancel') {
    const { error } = await adminClient
      .from('cheque_reminders')
      .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
      .eq('invoice_id', invoiceId);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  if (op === 'schedule') {
    const invoiceNumber = String(body.invoiceNumber ?? '');
    const reminderAt = String(body.reminderAt ?? '');
    const recipientEmail = String(body.recipientEmail ?? '');
    const amount = Number(body.amount ?? 0);

    if (!invoiceNumber) return json({ error: 'invoiceNumber is required' }, 400);
    if (!reminderAt) return json({ error: 'reminderAt is required' }, 400);
    if (!recipientEmail) return json({ error: 'recipientEmail is required' }, 400);
    if (amount < 0) return json({ error: 'amount must be >= 0' }, 400);

    // Basic ISO timestamp validation
    if (isNaN(new Date(reminderAt).getTime())) {
      return json({ error: 'reminderAt must be a valid ISO timestamp' }, 400);
    }

    // Guard: do not re-schedule a reminder for an already-cleared cheque
    if (invoice.payment_status === 'PAID') {
      return json({ error: 'Cannot schedule a reminder for an already paid invoice' }, 409);
    }

    const upsertRow = {
      invoice_id: invoiceId,
      invoice_number: invoiceNumber,
      supplier_name: body.supplierName ? String(body.supplierName) : null,
      amount,
      cheque_presentation_date: body.chequePresentationDate
        ? String(body.chequePresentationDate)
        : null,
      recipient_email: recipientEmail,
      reminder_at: reminderAt,
      status: 'PENDING',
      attempts: 0,
      last_error: null,
      sent_at: null,
      created_by: callerId ?? (body.createdBy ? String(body.createdBy) : null),
      updated_at: new Date().toISOString(),
    };

    // Check if an existing reminder already exists for this invoice to avoid
    // ON CONFLICT constraint mismatch issues across database schema variations
    const { data: existing } = await adminClient
      .from('cheque_reminders')
      .select('id')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let data, error;
    if (existing?.id) {
      const res = await adminClient
        .from('cheque_reminders')
        .update(upsertRow)
        .eq('id', existing.id)
        .select()
        .single();
      data = res.data;
      error = res.error;
    } else {
      const res = await adminClient
        .from('cheque_reminders')
        .insert(upsertRow)
        .select()
        .single();
      data = res.data;
      error = res.error;
    }

    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, reminder: data });
  }

  return json({ error: `Unknown operation: ${op}` }, 400);
});
