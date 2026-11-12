/**
 * Payment Service — Cash & Cheque Partial Payment Management
 * ---------------------------------------------------------------------------
 * Handles all partial payment calculations, ledger tracking, cheque clearance/bounce
 * lifecycle, and invoice status recalculations directly against the database (Supabase).
 * No payment data is stored in the frontend or localStorage.
 *
 * Supported payment methods: strictly 'CASH' and 'CHEQUE'.
 * Supported payment statuses: 'PENDING', 'CLEARED', 'BOUNCED', 'CANCELLED'.
 */

import { supabase } from '../integrations/supabase/client';
import { dbService, generateUUID } from './dbService';
import {
  InvoicePayment,
  InvoicePaymentSummary,
  PaymentMethod,
  PaymentRecordStatus,
  PaymentStatus,
  PurchaseInvoice
} from '../types';
import { getTodayIST } from '../utils/dateUtils';

// In-flight mutex locks per invoice to serialize concurrent client submissions
const inFlightInvoiceLocks = new Set<string>();

// Duplicate submission tracker: maps submission fingerprint to timestamp
const recentSubmissions = new Map<string, number>();
const DUPLICATE_WINDOW_MS = 3000;

/**
 * Calculate payment breakdown and invoice status from payments array
 */
export function calculatePaymentBreakdown(
  invoiceAmount: number,
  payments: InvoicePayment[],
  invoiceDate?: string
): Omit<InvoicePaymentSummary, 'invoice_id' | 'payments'> {
  let totalCash = 0;
  let totalClearedCheques = 0;
  let totalPendingCheques = 0;
  const today = getTodayIST();

  for (const p of payments) {
    const isChequePassed = p.payment_method === 'CHEQUE' && p.payment_status === 'PENDING' && p.clearance_date && p.clearance_date <= today;
    const isCleared = p.payment_status === 'CLEARED' || isChequePassed;

    if (isCleared) {
      if (p.payment_method === 'CASH') {
        totalCash += Number(p.amount) || 0;
      } else if (p.payment_method === 'CHEQUE') {
        totalClearedCheques += Number(p.amount) || 0;
      }
    } else if (p.payment_method === 'CHEQUE' && p.payment_status === 'PENDING') {
      totalPendingCheques += Number(p.amount) || 0;
    }
  }

  const clearedAmount = Number((totalCash + totalClearedCheques).toFixed(2));
  const pendingChequeAmount = Number(totalPendingCheques.toFixed(2));
  const outstandingAmount = Number(Math.max(0, invoiceAmount - clearedAmount).toFixed(2));

  let payment_status: PaymentStatus = 'UNPAID';
  if (clearedAmount >= (invoiceAmount - 0.01)) {
    payment_status = 'PAID';
  } else if (clearedAmount > 0) {
    payment_status = 'PARTIALLY_PAID';
  } else if (pendingChequeAmount > 0) {
    payment_status = 'CHEQUE_PENDING';
  } else {
    if (invoiceDate) {
      const invDate = new Date(invoiceDate);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      if (invDate < thirtyDaysAgo) {
        payment_status = 'OVERDUE';
      } else {
        payment_status = 'UNPAID';
      }
    } else {
      payment_status = 'UNPAID';
    }
  }

  return {
    invoice_amount: invoiceAmount,
    cleared_amount: clearedAmount,
    outstanding_amount: outstandingAmount,
    pending_cheque_amount: pendingChequeAmount,
    payment_status
  };
}

export const paymentService = {
  /**
   * Get all payments for a specific invoice from Supabase database
   */
  getPaymentsByInvoiceId: async (invoiceId: string, invoice?: PurchaseInvoice | null): Promise<InvoicePayment[]> => {
    if (!invoiceId) return [];

    try {
      const { data, error } = await supabase
        .from('invoice_payments')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('payment_date', { ascending: true });

      if (!error && data && data.length > 0) {
        return data as InvoicePayment[];
      }
    } catch (err) {
      console.warn('Supabase getPaymentsByInvoiceId error:', err);
    }

    // If no payments exist in database and invoice exists, synthesize legacy payment and persist it to DB
    if (invoice) {
      const synthesized = paymentService.synthesizeLegacyPayment(invoice);
      if (synthesized) {
        try {
          await supabase.from('invoice_payments').insert(synthesized);
          return [synthesized];
        } catch (e) {
          console.warn('Failed to persist synthesized legacy payment to database:', e);
          return [synthesized];
        }
      }
    }

    return [];
  },

  /**
   * Synthesize an initial payment for pre-existing invoices
   */
  synthesizeLegacyPayment: (invoice: PurchaseInvoice): InvoicePayment | null => {
    const now = new Date().toISOString();
    const isCheque = invoice.payment_mode === 'CHEQUE';
    const isCleared = invoice.payment_status === 'PAID' || invoice.cheque_status === 'CLEARED';

    if (isCheque) {
      return {
        id: generateUUID(),
        invoice_id: invoice.id,
        payment_method: 'CHEQUE',
        amount: Number(invoice.cheque_amount ?? invoice.grand_total) || 0,
        payment_date: invoice.invoice_date || getTodayIST(),
        payment_status: isCleared ? 'CLEARED' : 'PENDING',
        cheque_number: invoice.invoice_number ? `CHQ-${invoice.invoice_number.slice(-4)}` : null,
        bank_name: invoice.bank_name || 'IOB',
        cheque_date: invoice.invoice_date || getTodayIST(),
        clearance_date: isCleared ? (invoice.cheque_presentation_date || invoice.invoice_date) : null,
        notes: 'Legacy cheque payment',
        created_at: invoice.created_at || now,
        updated_at: invoice.updated_at || now
      };
    } else {
      if (invoice.payment_status === 'PAID') {
        return {
          id: generateUUID(),
          invoice_id: invoice.id,
          payment_method: 'CASH',
          amount: Number(invoice.grand_total) || 0,
          payment_date: invoice.invoice_date || getTodayIST(),
          payment_status: 'CLEARED',
          notes: 'Legacy cash settlement',
          created_at: invoice.created_at || now,
          updated_at: invoice.updated_at || now
        };
      }
    }
    return null;
  },

  /**
   * Get payment summary for an invoice directly from database
   */
  getPaymentSummary: async (invoice: PurchaseInvoice): Promise<InvoicePaymentSummary> => {
    const payments = await paymentService.getPaymentsByInvoiceId(invoice.id, invoice);
    const breakdown = calculatePaymentBreakdown(invoice.grand_total, payments, invoice.invoice_date);

    return {
      invoice_id: invoice.id,
      payments,
      ...breakdown
    };
  },

  /**
   * Add a new payment (CASH or CHEQUE) and persist directly to Supabase database
   */
  addPayment: async (
    invoice: PurchaseInvoice,
    data: {
      payment_method: PaymentMethod;
      amount: number;
      payment_date: string;
      cheque_number?: string | null;
      bank_name?: string | null;
      cheque_date?: string | null;
      clearance_date?: string | null;
      notes?: string | null;
    }
  ): Promise<{ payment: InvoicePayment; summary: InvoicePaymentSummary }> => {
    if (data.amount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    if (inFlightInvoiceLocks.has(invoice.id)) {
      throw new Error('Another payment transaction is in progress for this invoice. Please wait.');
    }
    inFlightInvoiceLocks.add(invoice.id);

    try {
      const fingerprint = `${invoice.id}-${data.payment_method}-${data.amount.toFixed(2)}-${(data.cheque_number || '').trim().toLowerCase()}`;
      const nowMs = Date.now();
      const lastSubmitted = recentSubmissions.get(fingerprint);
      if (lastSubmitted && nowMs - lastSubmitted < DUPLICATE_WINDOW_MS) {
        throw new Error('Duplicate payment submission detected. Please do not submit the same payment multiple times.');
      }
      recentSubmissions.set(fingerprint, nowMs);

      for (const [key, ts] of recentSubmissions.entries()) {
        if (nowMs - ts > DUPLICATE_WINDOW_MS * 2) {
          recentSubmissions.delete(key);
        }
      }

      const existingPayments = await paymentService.getPaymentsByInvoiceId(invoice.id, invoice);
      const currentSummary = calculatePaymentBreakdown(invoice.grand_total, existingPayments, invoice.invoice_date);

      const currentCommitted = currentSummary.cleared_amount + currentSummary.pending_cheque_amount;
      const availableHeadroom = Number(Math.max(0, invoice.grand_total - currentCommitted).toFixed(2));

      if (data.amount > availableHeadroom + 0.01) {
        throw new Error(
          `Payment amount (₹${data.amount.toLocaleString('en-IN')}) exceeds available balance. Maximum payable is ₹${availableHeadroom.toLocaleString('en-IN')}.`
        );
      }

      const paymentId = generateUUID();
      const now = new Date().toISOString();
      const payment_status: PaymentRecordStatus = data.payment_method === 'CASH' ? 'CLEARED' : 'PENDING';

      const newPayment: InvoicePayment = {
        id: paymentId,
        invoice_id: invoice.id,
        payment_method: data.payment_method,
        amount: Number(data.amount.toFixed(2)),
        payment_date: data.payment_date || getTodayIST(),
        payment_status,
        cheque_number: data.payment_method === 'CHEQUE' ? (data.cheque_number?.trim() || null) : null,
        bank_name: data.payment_method === 'CHEQUE' ? (data.bank_name?.trim() || null) : null,
        cheque_date: data.payment_method === 'CHEQUE' ? (data.cheque_date || data.payment_date) : null,
        clearance_date: data.payment_method === 'CHEQUE' ? (data.clearance_date || null) : null,
        notes: data.notes?.trim() || null,
        created_at: now,
        updated_at: now
      };

      // Persist to Supabase database
      const { error: insertErr } = await supabase
        .from('invoice_payments')
        .insert(newPayment);

      if (insertErr) {
        console.error('Supabase invoice_payments insert error:', insertErr);
        throw insertErr;
      }

      const updatedPayments = [...existingPayments, newPayment];
      const newBreakdown = calculatePaymentBreakdown(invoice.grand_total, updatedPayments, invoice.invoice_date);

      // Sync status to purchase_invoices table in database
      await paymentService.syncInvoiceStatus(invoice.id, newBreakdown.payment_status);

      return {
        payment: newPayment,
        summary: {
          invoice_id: invoice.id,
          payments: updatedPayments,
          ...newBreakdown
        }
      };
    } finally {
      inFlightInvoiceLocks.delete(invoice.id);
    }
  },

  /**
   * Mark a cheque payment as CLEARED in database
   */
  markChequeCleared: async (
    invoice: PurchaseInvoice,
    paymentId: string,
    clearanceDate?: string
  ): Promise<InvoicePaymentSummary> => {
    const existingPayments = await paymentService.getPaymentsByInvoiceId(invoice.id, invoice);
    const target = existingPayments.find(p => p.id === paymentId);

    if (!target) {
      throw new Error('Payment record not found.');
    }
    if (target.payment_method !== 'CHEQUE') {
      throw new Error('Only cheque payments can be marked as cleared.');
    }
    if (target.payment_status === 'CLEARED') {
      throw new Error('This cheque is already cleared.');
    }

    const effectiveClearanceDate = clearanceDate || target.clearance_date || getTodayIST();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('invoice_payments')
      .update({
        payment_status: 'CLEARED',
        clearance_date: effectiveClearanceDate,
        updated_at: now
      })
      .eq('id', paymentId);

    if (error) {
      console.error('Supabase markChequeCleared error:', error);
      throw error;
    }

    const updatedPayments = existingPayments.map(p => {
      if (p.id === paymentId) {
        return {
          ...p,
          payment_status: 'CLEARED' as PaymentRecordStatus,
          clearance_date: effectiveClearanceDate,
          updated_at: now
        };
      }
      return p;
    });

    const newBreakdown = calculatePaymentBreakdown(invoice.grand_total, updatedPayments, invoice.invoice_date);
    await paymentService.syncInvoiceStatus(invoice.id, newBreakdown.payment_status, 'CLEARED');

    return {
      invoice_id: invoice.id,
      payments: updatedPayments,
      ...newBreakdown
    };
  },

  /**
   * Mark a cheque payment as BOUNCED in database
   */
  markChequeBounced: async (
    invoice: PurchaseInvoice,
    paymentId: string,
    reason?: string
  ): Promise<InvoicePaymentSummary> => {
    const existingPayments = await paymentService.getPaymentsByInvoiceId(invoice.id, invoice);
    const target = existingPayments.find(p => p.id === paymentId);

    if (!target) {
      throw new Error('Payment record not found.');
    }
    if (target.payment_method !== 'CHEQUE') {
      throw new Error('Only cheque payments can be marked as bounced.');
    }
    if (target.payment_status === 'BOUNCED') {
      throw new Error('This cheque is already marked as bounced.');
    }

    const now = new Date().toISOString();
    const notes = reason ? `${target.notes ? target.notes + ' | ' : ''}Bounced: ${reason}` : target.notes;

    const { error } = await supabase
      .from('invoice_payments')
      .update({
        payment_status: 'BOUNCED',
        notes,
        updated_at: now
      })
      .eq('id', paymentId);

    if (error) {
      console.error('Supabase markChequeBounced error:', error);
      throw error;
    }

    const updatedPayments = existingPayments.map(p => {
      if (p.id === paymentId) {
        return {
          ...p,
          payment_status: 'BOUNCED' as PaymentRecordStatus,
          notes,
          updated_at: now
        };
      }
      return p;
    });

    const newBreakdown = calculatePaymentBreakdown(invoice.grand_total, updatedPayments, invoice.invoice_date);
    await paymentService.syncInvoiceStatus(invoice.id, newBreakdown.payment_status);

    return {
      invoice_id: invoice.id,
      payments: updatedPayments,
      ...newBreakdown
    };
  },

  /**
   * Cancel a payment record in database
   */
  cancelPayment: async (
    invoice: PurchaseInvoice,
    paymentId: string
  ): Promise<InvoicePaymentSummary> => {
    const existingPayments = await paymentService.getPaymentsByInvoiceId(invoice.id, invoice);
    const target = existingPayments.find(p => p.id === paymentId);

    if (!target) {
      throw new Error('Payment record not found.');
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('invoice_payments')
      .update({
        payment_status: 'CANCELLED',
        updated_at: now
      })
      .eq('id', paymentId);

    if (error) {
      console.error('Supabase cancelPayment error:', error);
      throw error;
    }

    const updatedPayments = existingPayments.map(p => {
      if (p.id === paymentId) {
        return {
          ...p,
          payment_status: 'CANCELLED' as PaymentRecordStatus,
          updated_at: now
        };
      }
      return p;
    });

    const newBreakdown = calculatePaymentBreakdown(invoice.grand_total, updatedPayments, invoice.invoice_date);
    await paymentService.syncInvoiceStatus(invoice.id, newBreakdown.payment_status);

    return {
      invoice_id: invoice.id,
      payments: updatedPayments,
      ...newBreakdown
    };
  },

  /**
   * Delete a payment record permanently from database
   */
  deletePayment: async (
    invoice: PurchaseInvoice,
    paymentId: string
  ): Promise<InvoicePaymentSummary> => {
    const existingPayments = await paymentService.getPaymentsByInvoiceId(invoice.id, invoice);
    const target = existingPayments.find(p => p.id === paymentId);

    if (!target) {
      throw new Error('Payment record not found.');
    }

    const { error } = await supabase
      .from('invoice_payments')
      .delete()
      .eq('id', paymentId);

    if (error) {
      console.error('Supabase deletePayment error:', error);
      throw error;
    }

    const updatedPayments = existingPayments.filter(p => p.id !== paymentId);
    const newBreakdown = calculatePaymentBreakdown(invoice.grand_total, updatedPayments, invoice.invoice_date);
    await paymentService.syncInvoiceStatus(invoice.id, newBreakdown.payment_status);

    return {
      invoice_id: invoice.id,
      payments: updatedPayments,
      ...newBreakdown
    };
  },

  /**
   * Sync new status to purchase_invoices table in database
   */
  syncInvoiceStatus: async (invoiceId: string, newStatus: PaymentStatus, chequeStatus?: 'CLEARED' | 'PENDING'): Promise<void> => {
    try {
      await supabase
        .from('purchase_invoices')
        .update({
          payment_status: newStatus,
          ...(chequeStatus ? { cheque_status: chequeStatus } : {}),
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId);
    } catch (e) {
      console.error('Supabase syncInvoiceStatus error:', e);
    }
  },

  /**
   * Compute aggregate metrics across all invoices from the database
   */
  getDashboardMetrics: async (invoices: PurchaseInvoice[]): Promise<{
    totalOutstanding: number;
    totalPendingCheques: number;
    totalClearedCheques: number;
    totalCashPayments: number;
  }> => {
    let totalOutstanding = 0;
    let totalPendingCheques = 0;
    let totalClearedCheques = 0;
    let totalCashPayments = 0;

    let allPayments: InvoicePayment[] = [];
    try {
      const { data, error } = await supabase
        .from('invoice_payments')
        .select('*')
        .order('payment_date', { ascending: true });

      if (!error && data) {
        allPayments = data as InvoicePayment[];
      }
    } catch (e) {
      console.warn('Supabase getDashboardMetrics payment fetch note:', e);
    }

    const paymentMap = new Map<string, InvoicePayment[]>();
    for (const p of allPayments) {
      const list = paymentMap.get(p.invoice_id) || [];
      list.push(p);
      paymentMap.set(p.invoice_id, list);
    }

    for (const inv of invoices) {
      let payments = paymentMap.get(inv.id);
      if (!payments || payments.length === 0) {
        const syn = paymentService.synthesizeLegacyPayment(inv);
        payments = syn ? [syn] : [];
      }
      const breakdown = calculatePaymentBreakdown(inv.grand_total, payments, inv.invoice_date);
      totalOutstanding += breakdown.outstanding_amount;
      totalPendingCheques += breakdown.pending_cheque_amount;

      for (const p of payments) {
        if (p.payment_status === 'CLEARED') {
          if (p.payment_method === 'CASH') {
            totalCashPayments += p.amount;
          } else if (p.payment_method === 'CHEQUE') {
            totalClearedCheques += p.amount;
          }
        }
      }
    }

    return {
      totalOutstanding: Number(totalOutstanding.toFixed(2)),
      totalPendingCheques: Number(totalPendingCheques.toFixed(2)),
      totalClearedCheques: Number(totalClearedCheques.toFixed(2)),
      totalCashPayments: Number(totalCashPayments.toFixed(2))
    };
  }
};
