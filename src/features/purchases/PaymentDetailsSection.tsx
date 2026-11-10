import React, { useState, useEffect } from 'react';
import {
  PlusCircle,
  Banknote,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableColumn } from '../../components/ui/Table';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { CardSkeleton } from '../../components/ui/LoadingSkeleton';
import { AddPaymentModal } from './AddPaymentModal';
import {
  InvoicePayment,
  InvoicePaymentSummary,
  PurchaseInvoice,
  PaymentStatus
} from '../../types';
import { paymentService } from '../../services/paymentService';
import { formatDisplayDate, formatINR } from '../../utils/dateUtils';
import { useToast } from '../../context/ToastContext';

interface PaymentDetailsSectionProps {
  invoice: PurchaseInvoice;
  onInvoiceUpdated?: (updated: PurchaseInvoice) => void;
}

export const PaymentDetailsSection: React.FC<PaymentDetailsSectionProps> = ({
  invoice,
  onInvoiceUpdated,
}) => {
  const { success: toastSuccess, error: toastError } = useToast();

  const [summary, setSummary] = useState<InvoicePaymentSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Dialog state for cheque clearance
  const [clearingPayment, setClearingPayment] = useState<InvoicePayment | null>(null);
  const [isClearing, setIsClearing] = useState<boolean>(false);

  // Dialog state for cheque bounce
  const [bouncingPayment, setBouncingPayment] = useState<InvoicePayment | null>(null);
  const [isBouncing, setIsBouncing] = useState<boolean>(false);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const data = await paymentService.getPaymentSummary(invoice);
      setSummary(data);
    } catch (err: unknown) {
      console.error('Error loading payment summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [invoice.id, invoice.grand_total]);

  const handlePaymentAdded = (newSummary: InvoicePaymentSummary) => {
    setSummary(newSummary);
    if (onInvoiceUpdated) {
      onInvoiceUpdated({
        ...invoice,
        payment_status: newSummary.payment_status,
      });
    }
  };

  const handleConfirmClearCheque = async () => {
    if (!clearingPayment) return;
    setIsClearing(true);
    try {
      const updatedSummary = await paymentService.markChequeCleared(invoice, clearingPayment.id);
      setSummary(updatedSummary);
      toastSuccess(
        'Cheque cleared',
        `Cheque #${clearingPayment.cheque_number || 'N/A'} (₹${formatINR(clearingPayment.amount)}) marked as CLEARED.`
      );
      if (onInvoiceUpdated) {
        onInvoiceUpdated({
          ...invoice,
          payment_status: updatedSummary.payment_status,
          cheque_status: 'CLEARED',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to clear cheque.';
      toastError('Clearance failed', msg);
    } finally {
      setIsClearing(false);
      setClearingPayment(null);
    }
  };

  const handleConfirmBounceCheque = async () => {
    if (!bouncingPayment) return;
    setIsBouncing(true);
    try {
      const updatedSummary = await paymentService.markChequeBounced(
        invoice,
        bouncingPayment.id,
        'Marked bounced by user'
      );
      setSummary(updatedSummary);
      toastSuccess(
        'Cheque bounced',
        `Cheque #${bouncingPayment.cheque_number || 'N/A'} (₹${formatINR(bouncingPayment.amount)}) marked as BOUNCED.`
      );
      if (onInvoiceUpdated) {
        onInvoiceUpdated({
          ...invoice,
          payment_status: updatedSummary.payment_status,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to bounce cheque.';
      toastError('Bounce failed', msg);
    } finally {
      setIsBouncing(false);
      setBouncingPayment(null);
    }
  };

  const renderStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'PAID':
        return <Badge variant="success">PAID</Badge>;
      case 'PARTIALLY_PAID':
        return <Badge variant="warning">PARTIALLY PAID</Badge>;
      case 'CHEQUE_PENDING':
        return <Badge variant="info">CHEQUE PENDING</Badge>;
      case 'OVERDUE':
        return <Badge variant="danger">OVERDUE</Badge>;
      case 'UNPAID':
      default:
        return <Badge variant="default">UNPAID</Badge>;
    }
  };

  const renderPaymentRecordBadge = (status: string) => {
    switch (status) {
      case 'CLEARED':
        return <Badge variant="success">CLEARED</Badge>;
      case 'PENDING':
        return <Badge variant="warning">PENDING</Badge>;
      case 'BOUNCED':
        return <Badge variant="danger">BOUNCED</Badge>;
      case 'CANCELLED':
        return <Badge variant="default">CANCELLED</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  if (loading || !summary) {
    return <CardSkeleton />;
  }

  const columns: TableColumn<InvoicePayment>[] = [
    {
      header: 'Date',
      cell: (row) => (
        <span className="text-xs font-mono text-slate-700">
          {formatDisplayDate(row.payment_date)}
        </span>
      ),
    },
    {
      header: 'Method',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          {row.payment_method === 'CASH' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Banknote className="h-3 w-3" /> Cash
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              <CreditCard className="h-3 w-3" /> Cheque
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Details',
      cell: (row) => {
        if (row.payment_method === 'CHEQUE') {
          return (
            <div className="text-xs space-y-0.5">
              <p className="font-semibold text-slate-800">
                #{row.cheque_number || '—'} · {row.bank_name || 'Bank'}
              </p>
              <p className="text-slate-500 text-[11px]">
                Presentation:{' '}
                <span className="font-mono">{formatDisplayDate(row.clearance_date || row.cheque_date || '')}</span>
              </p>
              {row.notes && <p className="text-slate-400 italic text-[11px]">{row.notes}</p>}
            </div>
          );
        }
        return (
          <span className="text-xs text-slate-500 italic">
            {row.notes || 'Direct cash payment'}
          </span>
        );
      },
    },
    {
      header: 'Amount',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (row) => (
        <span className="text-sm font-mono font-bold text-slate-900 tabular-nums">
          ₹{formatINR(row.amount)}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (row) => renderPaymentRecordBadge(row.payment_status),
    },
    {
      header: 'Actions',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (row) => {
        if (row.payment_method === 'CHEQUE' && row.payment_status === 'PENDING') {
          return (
            <div className="flex items-center justify-end gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 h-7 px-2"
                onClick={() => setClearingPayment(row)}
                icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
              >
                Clear
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs text-red-700 border-red-200 hover:bg-red-50 h-7 px-2"
                onClick={() => setBouncingPayment(row)}
                icon={<XCircle className="h-3.5 w-3.5 text-red-600" />}
              >
                Bounce
              </Button>
            </div>
          );
        }
        return <span className="text-xs text-slate-400 font-mono">—</span>;
      },
    },
  ];

  const totalCommitted = summary.cleared_amount + summary.pending_cheque_amount;
  const canAddPayment = totalCommitted < (invoice.grand_total - 0.01);

  return (
    <div className="space-y-6">
      {/* Payment Details KPI Cards */}
      <Card
        title="Payment details & balance"
        subtitle="Cash and cheque settlement breakdown"
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            icon={<PlusCircle className="h-4 w-4" />}
            disabled={!canAddPayment}
          >
            Add payment
          </Button>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          {/* Invoice Total */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Invoice Total
            </span>
            <p className="text-lg font-bold font-mono text-slate-900 mt-1 tabular-nums">
              ₹{formatINR(invoice.grand_total)}
            </p>
          </div>

          {/* Cash Paid */}
          <div className="p-3.5 rounded-lg bg-emerald-50/60 border border-emerald-200">
            <span className="text-xs font-medium text-emerald-800 uppercase tracking-wide flex items-center gap-1">
              <Banknote className="h-3.5 w-3.5 text-emerald-600" /> Cash Paid
            </span>
            <p className="text-lg font-bold font-mono text-emerald-800 mt-1 tabular-nums">
              ₹{formatINR(summary.cleared_amount - (summary.payments.filter(p => p.payment_method === 'CHEQUE' && p.payment_status === 'CLEARED').reduce((s, p) => s + p.amount, 0)))}
            </p>
          </div>

          {/* Cheque Cleared */}
          <div className="p-3.5 rounded-lg bg-emerald-50/60 border border-emerald-200">
            <span className="text-xs font-medium text-emerald-800 uppercase tracking-wide flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Cheques Cleared
            </span>
            <p className="text-lg font-bold font-mono text-emerald-800 mt-1 tabular-nums">
              ₹{formatINR(summary.payments.filter(p => p.payment_method === 'CHEQUE' && p.payment_status === 'CLEARED').reduce((s, p) => s + p.amount, 0))}
            </p>
          </div>

          {/* Pending Cheques */}
          <div className="p-3.5 rounded-lg bg-blue-50/60 border border-blue-200">
            <span className="text-xs font-medium text-blue-800 uppercase tracking-wide flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-blue-600" /> Pending Cheques
            </span>
            <p className="text-lg font-bold font-mono text-blue-800 mt-1 tabular-nums">
              ₹{formatINR(summary.pending_cheque_amount)}
            </p>
          </div>

          {/* Outstanding Amount */}
          <div className="p-3.5 rounded-lg bg-amber-50/60 border border-amber-200">
            <span className="text-xs font-medium text-amber-800 uppercase tracking-wide">
              Outstanding
            </span>
            <p className="text-lg font-bold font-mono text-amber-900 mt-1 tabular-nums">
              ₹{formatINR(summary.outstanding_amount)}
            </p>
          </div>

          {/* Payment Status */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Status
            </span>
            <div className="mt-1">{renderStatusBadge(summary.payment_status)}</div>
          </div>
        </div>

        {summary.pending_cheque_amount > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md flex items-start gap-2.5 text-xs text-blue-900">
            <Clock className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
            <div>
              <p className="font-semibold">Pending Cheque Presentation Notice</p>
              <p className="text-blue-700 mt-0.5">
                Pending cheques (₹{formatINR(summary.pending_cheque_amount)}) do not reduce the outstanding balance until they are confirmed as CLEARED.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Payment History Table */}
      <Card
        title={`Payment transaction history (${summary.payments.length})`}
        subtitle="Audit trail of cash and cheque receipts"
      >
        <Table
          columns={columns}
          data={summary.payments}
          keyExtractor={(row) => row.id}
          isLoading={false}
          emptyTitle="No payments recorded yet"
          emptyText="Record partial payments via cash or cheque using the Add Payment button above."
          emptyActionLabel={canAddPayment ? 'Add payment' : undefined}
          onEmptyAction={canAddPayment ? () => setIsAddModalOpen(true) : undefined}
        />
      </Card>

      {/* Add Payment Modal */}
      {isAddModalOpen && (
        <AddPaymentModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          invoice={invoice}
          currentSummary={summary}
          onPaymentAdded={handlePaymentAdded}
        />
      )}

      {/* Clear Cheque Confirmation Dialog */}
      {clearingPayment && (
        <ConfirmDialog
          isOpen={Boolean(clearingPayment)}
          onClose={() => setClearingPayment(null)}
          onConfirm={handleConfirmClearCheque}
          title="Confirm Cheque Clearance"
          message={`Are you sure you want to mark Cheque #${clearingPayment.cheque_number || 'N/A'} for ₹${formatINR(clearingPayment.amount)} as CLEARED? This will reduce the invoice outstanding balance by ₹${formatINR(clearingPayment.amount)}.`}
          confirmText="Yes, Mark Cleared"
          cancelText="Cancel"
          variant="default"
          isLoading={isClearing}
        />
      )}

      {/* Bounce Cheque Confirmation Dialog */}
      {bouncingPayment && (
        <ConfirmDialog
          isOpen={Boolean(bouncingPayment)}
          onClose={() => setBouncingPayment(null)}
          onConfirm={handleConfirmBounceCheque}
          title="Confirm Cheque Bounce"
          message={`Are you sure you want to mark Cheque #${bouncingPayment.cheque_number || 'N/A'} for ₹${formatINR(bouncingPayment.amount)} as BOUNCED? This cheque will not reduce the outstanding balance.`}
          confirmText="Yes, Mark Bounced"
          cancelText="Cancel"
          variant="warning"
          isLoading={isBouncing}
        />
      )}
    </div>
  );
};

