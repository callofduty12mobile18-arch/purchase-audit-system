import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit3, Building2, Calendar, Package2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table, TableColumn } from '../components/ui/Table';
import { CardSkeleton } from '../components/ui/LoadingSkeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { PurchaseInvoice, PurchaseItem } from '../types';
import { dbService } from '../services/dbService';
import { formatDisplayDate, formatISTTimestamp, formatINR } from '../utils/dateUtils';
import { PaymentDetailsSection } from '../features/purchases/PaymentDetailsSection';

export const PurchaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<PurchaseInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => { if (id) loadInvoice(); }, [id]);

  const loadInvoice = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await dbService.getInvoiceById(id!);
      setInvoice(data);
      if (!data) setFetchError('Invoice not found.');
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load invoice.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="h-9 w-40"><div className="skeleton h-full rounded-md" /></div>
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (fetchError || !invoice) {
    return (
      <ErrorState
        title="Invoice not found"
        message={fetchError ?? `No invoice with ID "${id}"`}
        onRetry={loadInvoice}
        showHomeButton
      />
    );
  }

  const totalPacks = invoice.items?.reduce((s, it) => s + (Number(it.quantity) || 0), 0) || 0;

  const columns: TableColumn<PurchaseItem>[] = [
    { header: '#', cell: (_r, idx) => <span className="text-xs font-mono text-slate-400">{idx + 1}</span> },
    {
      header: 'Product',
      cell: (row) => (
        <div>
          <p className="text-sm font-medium text-slate-900">
            {row.product?.nickname || row.supplier_item_name_snapshot}
          </p>
          <p className="text-xs font-mono text-slate-400">{row.supplier_item_name_snapshot}</p>
        </div>
      ),
    },
    { header: 'HSN', cell: (row) => <span className="text-xs font-mono text-slate-500">{row.hsn_snapshot || '24022090'}</span> },
    {
      header: 'Packs',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (row) => (
        <span className="text-sm font-mono font-semibold text-slate-900 tabular-nums">
          {row.quantity} {row.uom_snapshot || 'PAC'}
        </span>
      ),
    },
    {
      header: 'Rate (₹)',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (row) => (
        <span className="text-sm font-mono font-semibold text-brand-700 tabular-nums">₹{formatINR(row.purchase_rate)}</span>
      ),
    },
    {
      header: 'Total (₹)',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (row) => (
        <span className="text-sm font-mono font-semibold text-slate-900 tabular-nums">₹{formatINR(row.total)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/purchases')}
          icon={<ArrowLeft className="h-4 w-4" />}
        >
          Back to invoices
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate(`/purchases/edit/${invoice.id}`)}
          icon={<Edit3 className="h-4 w-4" />}
        >
          Edit invoice
        </Button>
      </div>

      {/* Banner */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-card p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold font-mono text-slate-900">{invoice.invoice_number}</h1>
              <Badge
                variant={
                  invoice.payment_status === 'PAID'
                    ? 'success'
                    : invoice.payment_status === 'CHEQUE_PENDING'
                    ? 'info'
                    : invoice.payment_status === 'PARTIALLY_PAID'
                    ? 'warning'
                    : invoice.payment_status === 'OVERDUE'
                    ? 'danger'
                    : 'default'
                }
              >
                {invoice.payment_status}
              </Badge>
              {invoice.payment_mode === 'CHEQUE' && (
                <Badge variant={invoice.cheque_status === 'CLEARED' ? 'success' : 'info'}>
                  Cheque {invoice.cheque_status ?? 'PENDING'}
                </Badge>
              )}
              <Badge variant="default">{invoice.invoice_name || '—'}</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Recorded {formatISTTimestamp(invoice.created_at)}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Grand total</p>
            <p className="text-3xl font-bold font-mono tabular-nums text-brand-700 mt-1">
              ₹{formatINR(invoice.grand_total)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mb-1">
              <Building2 className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" /> Supplier
            </p>
            <p className="text-sm font-semibold text-slate-900">{invoice.supplier?.name || '—'}</p>
            <p className="text-xs font-mono text-slate-500 mt-0.5">{invoice.supplier?.gstin}</p>
          </div>
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mb-1">
              <Calendar className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" /> Date & payment
            </p>
            <p className="text-sm font-semibold font-mono text-slate-900">{formatDisplayDate(invoice.invoice_date)}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Mode: <strong className="text-slate-700">{invoice.payment_mode}</strong>
            </p>
          </div>
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mb-1">
              <Package2 className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" /> Volume
            </p>
            <p className="text-sm font-semibold font-mono text-slate-900">{invoice.items?.length || 0} items</p>
            <p className="text-xs font-mono text-slate-500 mt-0.5">{totalPacks} packs</p>
          </div>
        </div>

        {invoice.payment_mode === 'CHEQUE' && (
          <div className="p-4 rounded-lg bg-brand-50 border border-brand-200">
            <p className="text-xs font-medium text-brand-700 flex items-center gap-1.5 mb-2">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" /> Cheque payment
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-slate-500">Cheque status</p>
                <p className="text-sm font-semibold text-slate-900">{invoice.cheque_status ?? 'PENDING'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Cheque amount</p>
                <p className="text-sm font-semibold font-mono text-slate-900 tabular-nums">
                  ₹{formatINR(invoice.cheque_amount ?? invoice.grand_total)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Presentation date</p>
                <p className="text-sm font-semibold font-mono text-slate-900">
                  {invoice.cheque_presentation_date ? formatDisplayDate(invoice.cheque_presentation_date) : '—'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment details and partial payments ledger */}
      <PaymentDetailsSection invoice={invoice} onInvoiceUpdated={setInvoice} />

      {/* Line items */}
      <Card
        title={`Purchased items (${invoice.items?.length || 0})`}
        subtitle="Item purchase rates and line totals"
      >
        <Table
          columns={columns}
          data={invoice.items || []}
          keyExtractor={(row) => row.id}
          isLoading={false}
          emptyText="No line items for this invoice."
        />
      </Card>
    </div>
  );
};
