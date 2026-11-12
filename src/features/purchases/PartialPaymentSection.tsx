import React from 'react';
import {
  Banknote,
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Receipt,
  Sparkles
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { InvoiceFormData, InvoicePayment } from '../../types';
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
  const cashPaid = Number(formData.partial_amount) || 0;
  const remainingBalance = Number(Math.max(0, grandTotal - cashPaid).toFixed(2));
  const paidPercent = grandTotal > 0 ? Math.min(100, Math.max(0, Math.round((cashPaid / grandTotal) * 100))) : 0;

  const presentationDate = formData.cheque_presentation_date || formData.partial_clearance_date || formData.invoice_date || getTodayIST();

  const hasCashError = showErrors && (cashPaid <= 0 || (grandTotal > 0 && cashPaid >= grandTotal));
  const hasChequeNumError = showErrors && !formData.partial_cheque_number?.trim();
  const hasBankError = showErrors && !formData.partial_bank_name?.trim();

  return (
    <div className="pt-5 mt-5 border-t border-slate-200 space-y-5 animate-in fade-in duration-200">
      {/* Workflow Explanation Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white border border-blue-200/80 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600/10 border border-blue-300 flex items-center justify-center text-blue-700 shrink-0">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900">Partial Payment Workflow</h3>
              <Badge variant="warning">PARTIALLY PAID</Badge>
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Pay a partial amount now in <strong>Cash</strong>. The remaining balance of{' '}
              <strong className="text-blue-900 font-mono">₹{formatINR(remainingBalance)}</strong> is given by a specific date <strong>Cheque</strong> that automatically passes on its presentation date.
            </p>
          </div>
        </div>
      </div>

      {/* 3-metric financial summary card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-500">1. Total Bill</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-bold font-mono text-slate-900 tabular-nums">
              ₹{formatINR(grandTotal)}
            </span>
            <span className="text-[11px] text-slate-400">Total invoice amount</span>
          </div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-lg p-3.5 flex flex-col justify-between">
          <span className="text-xs font-medium text-emerald-800 flex items-center gap-1.5">
            <Banknote className="h-3.5 w-3.5 text-emerald-600" />
            2. Cash Paid Now
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-bold font-mono text-emerald-700 tabular-nums">
              ₹{formatINR(cashPaid)}
            </span>
            <span className="text-xs font-semibold font-mono text-emerald-700 bg-emerald-100/90 px-1.5 py-0.5 rounded">
              {paidPercent}% cash
            </span>
          </div>
        </div>

        <div className="bg-blue-50/70 border border-blue-200/80 rounded-lg p-3.5 flex flex-col justify-between">
          <span className="text-xs font-medium text-blue-900 flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5 text-blue-600" />
            3. Remaining by Cheque
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-bold font-mono text-blue-800 tabular-nums">
              ₹{formatINR(remainingBalance)}
            </span>
            <span className="text-xs font-mono text-blue-700 bg-blue-100/90 px-1.5 py-0.5 rounded">
              Auto-passes on date
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Settlement breakdown</span>
          <span className="font-mono text-slate-700">
            Cash: <strong>₹{formatINR(cashPaid)}</strong> ({paidPercent}%) · Cheque: <strong>₹{formatINR(remainingBalance)}</strong> ({100 - paidPercent}%)
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60 flex">
          <div
            className="bg-emerald-500 h-2 transition-all duration-300 ease-out"
            style={{ width: `${paidPercent}%` }}
            title={`Cash paid: ₹${formatINR(cashPaid)}`}
          />
          <div
            className="bg-blue-500 h-2 transition-all duration-300 ease-out"
            style={{ width: `${100 - paidPercent}%` }}
            title={`Cheque remaining: ₹${formatINR(remainingBalance)}`}
          />
        </div>
      </div>

      {/* Form Fields: Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Column: Cash Paid Now */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
            <h4 className="text-sm font-semibold text-emerald-900 flex items-center gap-2">
              <Banknote className="h-4 w-4 text-emerald-600" />
              Cash Paid Now
            </h4>
            <Badge variant="success">Immediate</Badge>
          </div>

          <div>
            <label htmlFor="partial_amount" className="block text-xs font-medium text-slate-700 mb-1.5">
              Cash amount paid manually (₹) <span className="text-red-500">*</span>
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
                placeholder="Enter cash amount (e.g. 50000)"
                className={`${inputCls} pl-7 font-semibold text-slate-900 ${
                  hasCashError ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''
                }`}
              />
            </div>
            {hasCashError && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {cashPaid <= 0
                  ? 'Please enter the cash amount paid manually.'
                  : 'Cash amount must be less than the total bill.'}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="partial_payment_date" className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              Cash payment date <span className="text-red-500">*</span>
            </label>
            <input
              id="partial_payment_date"
              type="date"
              value={formData.partial_payment_date || formData.invoice_date || getTodayIST()}
              onChange={(e) => onChange('partial_payment_date', e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {/* Right Column: Cheque for Remaining Balance */}
        <div className="bg-white p-4 rounded-xl border border-blue-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-blue-100">
            <h4 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-600" />
              Cheque for Remaining Balance
            </h4>
            <span className="font-mono font-bold text-sm text-blue-700">
              ₹{formatINR(remainingBalance)}
            </span>
          </div>

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
                placeholder="e.g. State Bank of India, HDFC"
                value={formData.partial_bank_name || ''}
                onChange={(e) => onChange('partial_bank_name', e.target.value)}
                className={`${inputCls} ${hasBankError ? 'border-red-400' : ''}`}
              />
              {hasBankError && (
                <p className="text-xs text-red-600 mt-1">Bank name is required.</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="cheque_presentation_date" className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-blue-600" />
              Cheque presentation date (Automatic pass date) <span className="text-red-500">*</span>
            </label>
            <input
              id="cheque_presentation_date"
              type="date"
              value={presentationDate}
              onChange={(e) => {
                onChange('cheque_presentation_date', e.target.value);
                onChange('partial_clearance_date', e.target.value);
              }}
              className={inputCls}
            />
          </div>

          {/* Automatic Clearance Notice */}
          <div className="p-2.5 rounded-lg bg-blue-50/80 border border-blue-200 text-xs text-blue-800 flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Automatic Clearance on Presentation Date</p>
              <p className="mt-0.5 text-blue-700">
                On <strong>{formatDisplayDate(presentationDate)}</strong>, this cheque of{' '}
                <strong>₹{formatINR(remainingBalance)}</strong> will automatically pass and clear, marking this invoice as 100% <strong>PAID</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Existing Recorded Payments (if in edit mode and has payments) */}
      {existingPayments.length > 0 && (
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Recorded Payment History ({existingPayments.length})
            </h4>
            <span className="text-xs text-slate-500 font-mono">
              Cleared: ₹{formatINR(existingPayments.filter(p => p.payment_status === 'CLEARED').reduce((s, p) => s + p.amount, 0))}
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
                    {p.payment_method === 'CHEQUE' ? `Cheque #${p.cheque_number || 'N/A'}` : 'Cash'}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500 font-mono">{formatDisplayDate(p.payment_date)}</span>
                  {p.payment_method === 'CHEQUE' && p.clearance_date && (
                    <span className="text-slate-400 font-mono">
                      (Clears: {formatDisplayDate(p.clearance_date)})
                    </span>
                  )}
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
