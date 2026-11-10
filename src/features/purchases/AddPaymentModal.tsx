import React, { useState } from 'react';
import { Banknote, CreditCard, Calendar, AlertCircle } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PaymentMethod, PurchaseInvoice, InvoicePaymentSummary } from '../../types';
import { paymentService } from '../../services/paymentService';
import { formatINR, getTodayIST } from '../../utils/dateUtils';
import { useToast } from '../../context/ToastContext';

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: PurchaseInvoice;
  currentSummary: InvoicePaymentSummary;
  onPaymentAdded: (summary: InvoicePaymentSummary) => void;
}

export const AddPaymentModal: React.FC<AddPaymentModalProps> = ({
  isOpen,
  onClose,
  invoice,
  currentSummary,
  onPaymentAdded,
}) => {
  const { success: toastSuccess, error: toastError } = useToast();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(getTodayIST());
  const [notes, setNotes] = useState<string>('');

  // Cheque fields
  const [chequeNumber, setChequeNumber] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [chequeDate, setChequeDate] = useState<string>(getTodayIST());
  const [clearanceDate, setClearanceDate] = useState<string>(getTodayIST());

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Remaining uncommitted amount: Invoice Total - (Cleared + Pending)
  const committedAmount = currentSummary.cleared_amount + currentSummary.pending_cheque_amount;
  const availableBalance = Number(Math.max(0, invoice.grand_total - committedAmount).toFixed(2));

  // Reset modal state when opened
  React.useEffect(() => {
    if (isOpen) {
      setPaymentMethod('CASH');
      // Default to the remaining balance for convenience
      setAmount(availableBalance > 0 ? availableBalance.toString() : '');
      setPaymentDate(getTodayIST());
      setChequeDate(getTodayIST());
      setClearanceDate(getTodayIST());
      setChequeNumber('');
      setBankName('');
      setNotes('');
      setErrorMessage(null);
      setIsSubmitting(false);
    }
  }, [isOpen, availableBalance]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Please enter a valid payment amount greater than zero.');
      return;
    }

    if (numAmount > availableBalance + 0.01) {
      setErrorMessage(
        `Payment amount (₹${formatINR(numAmount)}) exceeds the remaining unpaid balance (₹${formatINR(availableBalance)}).`
      );
      return;
    }

    if (paymentMethod === 'CHEQUE') {
      if (!chequeNumber.trim()) {
        setErrorMessage('Please enter the cheque number.');
        return;
      }
      if (!bankName.trim()) {
        setErrorMessage('Please enter the bank name.');
        return;
      }
      if (!chequeDate) {
        setErrorMessage('Please select the cheque date.');
        return;
      }
      if (!clearanceDate) {
        setErrorMessage('Please select the presentation/clearance date.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const result = await paymentService.addPayment(invoice, {
        payment_method: paymentMethod,
        amount: numAmount,
        payment_date: paymentDate,
        cheque_number: paymentMethod === 'CHEQUE' ? chequeNumber : null,
        bank_name: paymentMethod === 'CHEQUE' ? bankName : null,
        cheque_date: paymentMethod === 'CHEQUE' ? chequeDate : null,
        clearance_date: paymentMethod === 'CHEQUE' ? clearanceDate : null,
        notes: notes.trim() || null,
      });

      toastSuccess(
        'Payment recorded',
        `${paymentMethod === 'CASH' ? 'Cash payment' : 'Cheque'} of ₹${formatINR(numAmount)} added.`
      );
      onPaymentAdded(result.summary);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record payment.';
      setErrorMessage(msg);
      toastError('Payment error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add partial payment"
      subtitle={`Invoice ${invoice.invoice_number} · Total ₹${formatINR(invoice.grand_total)}`}
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500">
            Available: <strong className="text-slate-800">₹{formatINR(availableBalance)}</strong>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              isLoading={isSubmitting}
              disabled={availableBalance <= 0 || isSubmitting}
            >
              Record payment
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Balance headroom info banner */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-slate-500">Invoice Total:</span>
            <p className="font-mono font-semibold text-slate-800">₹{formatINR(invoice.grand_total)}</p>
          </div>
          <div>
            <span className="text-slate-500">Already Cleared:</span>
            <p className="font-mono font-semibold text-emerald-700">₹{formatINR(currentSummary.cleared_amount)}</p>
          </div>
          <div>
            <span className="text-slate-500">Pending Cheques:</span>
            <p className="font-mono font-semibold text-blue-700">₹{formatINR(currentSummary.pending_cheque_amount)}</p>
          </div>
          <div>
            <span className="text-slate-500">Max Payable Now:</span>
            <p className="font-mono font-bold text-brand-700">₹{formatINR(availableBalance)}</p>
          </div>
        </div>

        {/* Payment Method Selector (Strictly Cash or Cheque) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Payment Method
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentMethod('CASH')}
              className={[
                'flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all',
                paymentMethod === 'CASH'
                  ? 'border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
              ].join(' ')}
            >
              <Banknote className="h-4 w-4 text-emerald-600" />
              <span>Cash Payment</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('CHEQUE')}
              className={[
                'flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all',
                paymentMethod === 'CHEQUE'
                  ? 'border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
              ].join(' ')}
            >
              <CreditCard className="h-4 w-4 text-blue-600" />
              <span>Cheque Payment</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {paymentMethod === 'CASH'
              ? 'Cash is completed immediately and reduces outstanding balance.'
              : 'Cheques remain pending until cleared on the presentation date.'}
          </p>
        </div>

        {/* Amount */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="payment-amount" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Amount (₹) *
            </label>
            {availableBalance > 0 && (
              <button
                type="button"
                onClick={() => setAmount(availableBalance.toString())}
                className="text-[11px] text-brand-600 hover:text-brand-800 font-medium underline"
              >
                Full balance (₹{formatINR(availableBalance)})
              </button>
            )}
          </div>
          <Input
            id="payment-amount"
            type="number"
            step="0.01"
            min="0.01"
            max={availableBalance}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`e.g. ${availableBalance}`}
            required
            autoFocus
          />
        </div>

        {/* CASH Fields */}
        {paymentMethod === 'CASH' && (
          <div>
            <label htmlFor="cash-date" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Payment Date *
            </label>
            <Input
              id="cash-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
          </div>
        )}

        {/* CHEQUE Fields */}
        {paymentMethod === 'CHEQUE' && (
          <div className="space-y-3 p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="cheque-num" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Cheque Number *
                </label>
                <Input
                  id="cheque-num"
                  type="text"
                  placeholder="e.g. 000124"
                  value={chequeNumber}
                  onChange={(e) => setChequeNumber(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="bank-name" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Bank Name *
                </label>
                <Input
                  id="bank-name"
                  type="text"
                  placeholder="e.g. HDFC Bank, SBI"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="cheque-date" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Cheque Date *
                </label>
                <Input
                  id="cheque-date"
                  type="date"
                  value={chequeDate}
                  onChange={(e) => setChequeDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="clearance-date" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-blue-600" /> Presentation Date *
                </label>
                <Input
                  id="clearance-date"
                  type="date"
                  value={clearanceDate}
                  onChange={(e) => setClearanceDate(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label htmlFor="payment-notes" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Notes (Optional)
          </label>
          <Input
            id="payment-notes"
            type="text"
            placeholder="e.g. Advance paid, Part payment 1 of 2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
};

