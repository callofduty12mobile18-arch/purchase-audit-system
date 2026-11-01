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
  chequeClearanceDate?: string;
  recipientEmail: string;
  reminderDate: string; // YYYY-MM-DD (IST)
  reminderTime: string; // HH:mm (IST)
  createdBy?: string;
}

export const chequeReminderService = {
  /** Fetch the reminder attached to an invoice (if any). */
  getByInvoice: async (invoiceId: string): Promise<ChequeReminder | null> => {
    try {
      const { data, error } = await supabase
        .from('cheque_reminders')
        .select('*')
        .eq('invoice_id', invoiceId)
        .maybeSingle();
      if (error) {
        console.warn('cheque_reminders fetch note:', error.message);
        return null;
      }
      return (data as ChequeReminder) || null;
    } catch (e) {
      console.warn('cheque_reminders fetch exception:', e);
      return null;
    }
  },

  /**
   * Create or reschedule the reminder for an invoice. Upserting on the unique
   * invoice_id keeps exactly one active reminder per invoice and resets the
   * row to PENDING with a clean attempt counter.
   */
  schedule: async (input: ScheduleReminderInput): Promise<ChequeReminder> => {
    const reminderAt = istDateTimeToUtcIso(input.reminderDate, input.reminderTime);
    if (!reminderAt) throw new Error('Reminder date and time are required.');

    const { data, error } = await supabase
      .from('cheque_reminders')
      .upsert(
        {
          invoice_id: input.invoiceId,
          invoice_number: input.invoiceNumber,
          supplier_name: input.supplierName ?? null,
          amount: input.amount,
          cheque_clearance_date: input.chequeClearanceDate ?? null,
          recipient_email: input.recipientEmail,
          reminder_at: reminderAt,
          status: 'PENDING',
          attempts: 0,
          last_error: null,
          sent_at: null,
          created_by: input.createdBy ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'invoice_id' }
      )
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as ChequeReminder;
  },

  /** Cancel the reminder for an invoice (keeps the row for audit purposes). */
  cancel: async (invoiceId: string): Promise<void> => {
    const { error } = await supabase
      .from('cheque_reminders')
      .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
      .eq('invoice_id', invoiceId);
    if (error) throw new Error(error.message);
  },

  /**
   * Reconcile reminder state with a saved invoice:
   * - enabled  -> schedule / reschedule
   * - disabled -> cancel any existing reminder
   */
  syncForInvoice: async (
    enabled: boolean,
    input: Omit<ScheduleReminderInput, 'invoiceId' | 'invoiceNumber'> & {
      invoiceId: string;
      invoiceNumber: string;
    }
  ): Promise<ChequeReminder | null> => {
    if (!enabled) {
      await chequeReminderService.cancel(input.invoiceId);
      return null;
    }
    return chequeReminderService.schedule(input);
  },
};
