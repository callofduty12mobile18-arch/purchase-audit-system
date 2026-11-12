import React from 'react';
import {
  Banknote,
  CreditCard,
  Calendar,
  AlertCircle,
  Percent,
  CheckCircle2,
  Clock,
  ArrowRight,
  Receipt,
  FileText
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { InvoiceFormData, InvoicePayment, PaymentMethod } from '../../types';
import { formatDisplayDate, formatINR, getTodayIST } from '../../utils/dateUtils';

interface PartialPaymentSectionProps {
  formData: InvoiceFormData;
  onChange: (field: keyof InvoiceFormData, value: string | number | boolean) => void;
  showErrors?: boolean;
  existingPayments?: InvoicePayment[];
}

const inputCls =
  'h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 font-mono ' +
  'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 transition-colors';

export const PartialPaymentSection: React.FC<PartialPaymentSectionProps> = ({
  formData,
  onChange,
  showErrors = false,
  existingPayments = [],
}) => {
  const grandTotal = Number(formData.grand_total) || 0;
  const partialAmount = Number(formData.partial_amount) || 0;
  const remainingBalance = Number(Math.max(0, grandTotal - partialAmount).toFixed(2));
  const paidPercent = grandTotal > 0 ? Math.min(100, Math.max(0, Math.round((partialAmount / grandTotal) * 100))) : 0;

  const currentMethod: PaymentMethod = formData.partial_payment_method === 'CHEQUE' ? 'CHEQUE' : 'CASH';

  const hasAmountError = showErrors && (partialAmount <= 0 || (grandTotal > 0 && partialAmount > grandTotal));
  const isCheque = currentMethod === 'CHEQUE';
  const hasChequeNumError = showErrors && isCheque && !formData.partial_cheque_number?.trim();
  const hasBankError = showErrors && isCheque && !formData.partial_bank_name?.trim();

  const handleQuickPercent = (percent: number) => {
    if (grandTotal <= 0) return;
    const computed = Math.round((grandTotal * percent) / 100);
    onChange('partial_amount', computed);
  };

  return (
    <div className="pt-5 mt-5 border-t border-slate-200 space-y-5 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-amber-50/80 via-orange-50/50 to-white p-4 rounded-xl border border-amber-200/80 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900">Partial payment features</h3>
              <Badge variant="warning">PARTIALLY PAID</Badge>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Record an advance or partial installment. The remaining balance will be recorded as outstanding.
            </p>
          </div>
        </div>
      </div>

      {/* 3-metric financial summary card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-500">Invoice Total</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-bold font-mono text-slate-900 tabular-nums">
              ₹{formatINR(grandTotal)}
            </span>
            <span className="text-[11px] text-slate-400">100% total bill</span>
          </div>
        </div>

        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-lg p-3.5 flex flex-col justify-between">
          <span className="text-xs font-medium text-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Amount Paid Upfront
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-bold font-mono text-emerald-700 tabular-nums">
              ₹{formatINR(partialAmount)}
            </span>
            <span className="text-xs font-semibold font-mono text-emerald-600 bg-emerald-100/80 px-1.5 py-0.5 rounded">
              {paidPercent}% paid
            </span>
          </div>
        </div>

        <div className="bg-amber-50/60 border border-amber-200/80 rounded-lg p-3.5 flex flex-col justify-between">
          <span className="text-xs font-medium text-amber-900 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            Remaining Balance Due
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-bold font-mono text-amber-800 tabular-nums">
              ₹{formatINR(remainingBalance)}
            </span>
            <span className="text-xs font-mono text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded">
              Outstanding
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Payment progress</span>
          <span className="font-mono font-medium text-slate-700">
            {paidPercent}% settled (₹{formatINR(partialAmount)} of ₹{formatINR(grandTotal)})
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
          <div
            className="bg-emerald-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${paidPercent}%` }}
          />
        </div>
      </div>

      {/* Inputs Form */}
      <div className="space-y-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        {/* Row 1: Amount & Quick Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="partial_amount" className="block text-sm font-medium text-slate-700 mb-1.5">
              Partial amount paid <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 font-medium">
                ₹
              </span>
              <input
                id="partial_amount"
                type="number"
                step="0.01"
                min="0"
                max={grandTotal > 0 ? grandTotal : undefined}
                value={formData.partial_amount ?? ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? null : parseFloat(e.target.value);
                  onChange('partial_amount', val ?? 0);
                }}
                placeholder="0.00"
                className={`${inputCls} pl-7 font-semibold text-slate-900 ${
                  hasAmountError ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''
                }`}
              />
            </div>

            {/* Quick Fill Percentage Pills */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-xs text-slate-400 mr-1 flex items-center gap-1">
                <Percent className="h-3 w-3" /> Quick set:
              </span>
              {[25, 50, 75].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleQuickPercent(pct)}
                  disabled={grandTotal <= 0}
                  className="text-xs px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pct}%
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  if (grandTotal > 0) onChange('partial_amount', grandTotal);
                }}
                disabled={grandTotal <= 0}
                className="text-xs px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                100%
              </button>
            </div>

            {hasAmountError && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {partialAmount <= 0
                  ? 'Please enter a valid partial payment amount.'
                  : 'Amount cannot exceed the invoice total.'}
              </p>
            )}
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Partial payment mode <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChange('partial_payment_method', 'CASH')}
                className={`flex items-center justify-center gap-2 h-9 px-3 rounded-md text-sm font-medium transition-colors border ${
                  currentMethod === 'CASH'
                    ? 'bg-brand-50 border-brand-600 text-brand-700 font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Banknote className="h-4 w-4" />
                Cash / UPI
              </button>

              <button
                type="button"
                onClick={() => onChange('partial_payment_method', 'CHEQUE')}
                className={`flex items-center justify-center gap-2 h-9 px-3 rounded-md text-sm font-medium transition-colors border ${
                  currentMethod === 'CHEQUE'
                    ? 'bg-brand-50 border-brand-600 text-brand-700 font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="h-4 w-4" />
                Cheque
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              {currentMethod === 'CASH'
                ? 'Immediate settlement via Cash, UPI (GPay/PhonePe), or Direct Transfer.'
                : 'Settlement through bank cheque. Tracks clearance and presentation date.'}
            </p>
          </div>
        </div>

        {/* Row 2: Payment Date & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
          <div>
            <label htmlFor="partial_payment_date" className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-brand-600" />
              Payment date <span className="text-red-500">*</span>
            </label>
            <input
              id="partial_payment_date"
              type="date"
              value={formData.partial_payment_date || formData.invoice_date || getTodayIST()}
              onChange={(e) => onChange('partial_payment_date', e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="partial_notes" className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-slate-400" />
              Payment reference / notes
            </label>
            <input
              id="partial_notes"
              type="text"
              placeholder="e.g. Paid ₹5,000 via GPay ref #8374 or Cash token"
              value={formData.partial_notes || ''}
              onChange={(e) => onChange('partial_notes', e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {/* Cheque Details (if payment method is CHEQUE) */}
        {isCheque && (
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/80 space-y-3 mt-3 animate-in fade-in duration-150">
            <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-brand-600" />
              Cheque details
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="partial_cheque_number" className="block text-xs font-medium text-slate-700 mb-1">
                  Cheque number <span className="text-red-500">*</span>
                </label>
                <input
                  id="partial_cheque_number"
                  type="text"
                  placeholder="e.g. 048291"
                  value={formData.partial_cheque_number || ''}
                  onChange={(e) => onChange('partial_cheque_number', e.target.value)}
                  className={`${inputCls} ${hasChequeNumError ? 'border-red-400' : ''}`}
                />
                {hasChequeNumError && (
                  <p className="text-xs text-red-600 mt-1">Cheque number is required.</p>
                )}
              </div>

              <div>
                <label htmlFor="partial_bank_name" className="block text-xs font-medium text-slate-700 mb-1">
                  Bank name <span className="text-red-500">*</span>
                </label>
                <input
                  id="partial_bank_name"
                  type="text"
                  placeholder="e.g. State Bank of India, HDFC Bank"
                  value={formData.partial_bank_name || ''}
                  onChange={(e) => onChange('partial_bank_name', e.target.value)}
                  className={`${inputCls} ${hasBankError ? 'border-red-400' : ''}`}
                />
                {hasBankError && (
                  <p className="text-xs text-red-600 mt-1">Bank name is required.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="partial_cheque_date" className="block text-xs font-medium text-slate-700 mb-1">
                  Cheque issue date
                </label>
                <input
                  id="partial_cheque_date"
                  type="date"
                  value={formData.partial_cheque_date || formData.partial_payment_date || getTodayIST()}
                  onChange={(e) => onChange('partial_cheque_date', e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label htmlFor="partial_clearance_date" className="block text-xs font-medium text-slate-700 mb-1">
                  Cheque presentation / clearance date
                </label>
                <input
                  id="partial_clearance_date"
                  type="date"
                  value={formData.partial_clearance_date || formData.partial_payment_date || getTodayIST()}
                  onChange={(e) => onChange('partial_clearance_date', e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Existing Payments (if editing an existing invoice that already has payment history) */}
      {existingPayments.length > 0 && (
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Recorded Payment History ({existingPayments.length})
            </h4>
            <span className="text-xs text-slate-500 font-mono">
              Total cleared: ₹{formatINR(existingPayments.filter(p => p.payment_status === 'CLEARED').reduce((s, p) => s + p.amount, 0))}
            </span>
          </div>

          <div className="divide-y divide-slate-200 border border-slate-200 rounded-md bg-white overflow-hidden text-xs">
            {existingPayments.map((p, idx) => (
              <div key={p.id || idx} className="p-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-400">{idx + 1}.</span>
                  {p.payment_method === 'CASH' ? (
                    <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                  )}
                  <span className="font-medium text-slate-800">
                    {p.payment_method === 'CHEQUE' ? `Cheque #${p.cheque_number || 'N/A'}` : 'Cash / Direct'}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500 font-mono">{formatDisplayDate(p.payment_date)}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono font-semibold text-slate-900">
                    ₹{formatINR(p.amount)}
                  </span>
                  <Badge variant={p.payment_status === 'CLEARED' ? 'success' : 'info'}>
                    {p.payment_status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

