import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Phone, Mail, MapPin } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table, TableColumn } from '../components/ui/Table';
import { CardSkeleton } from '../components/ui/LoadingSkeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { Supplier, PurchaseInvoice } from '../types';
import { dbService } from '../services/dbService';
import { formatDisplayDate, formatINR } from '../utils/dateUtils';

export const SupplierDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => { if (id) load(); }, [id]);

  const load = async () => {
    setLoading(true); setFetchError(null);
    try {
      const [sup, allInvoices] = await Promise.all([
        dbService.getSupplierById(id!),
        dbService.getInvoices(),
      ]);
      setSupplier(sup);
      setInvoices(allInvoices.filter((inv) => inv.supplier_id === id));
      if (!sup) setFetchError('Supplier not found.');
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load supplier.');
    } finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="skeleton h-9 w-40 rounded-md" />
        <CardSkeleton /><CardSkeleton />
      </div>
    );
  }

  if (fetchError || !supplier) {
    return <ErrorState title="Supplier not found" message={fetchError ?? `No supplier with ID "${id}"`} onRetry={load} showHomeButton />;
  }

  const totalSpend = invoices.reduce((s, i) => s + i.grand_total, 0);

  const columns: TableColumn<PurchaseInvoice>[] = [
    {
      header: 'Invoice #',
      cell: (row) => (
        <button
          type="button"
          onClick={() => navigate(`/purchases/${row.id}`)}
          className="font-mono text-sm font-semibold text-brand-700 hover:underline"
        >
          {row.invoice_number}
        </button>
      ),
    },
    { header: 'Date', cell: (row) => <span className="text-sm font-mono text-slate-600">{formatDisplayDate(row.invoice_date)}</span> },
    {
      header: 'Items',
      cell: (row) => {
        const packs = row.items?.reduce((s, it) => s + (Number(it.quantity) || 0), 0) || 0;
        return (
          <div>
            <span className="text-sm text-slate-700">{row.items?.length || 0} items</span>
            {packs > 0 && <p className="text-xs font-mono text-slate-500">{packs} packs</p>}
          </div>
        );
      },
    },
    { header: 'Status', cell: (row) => <Badge variant={row.payment_status === 'PAID' ? 'success' : 'warning'}>{row.payment_status}</Badge> },
    {
      header: 'Total',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (row) => <span className="font-mono font-semibold text-slate-900 tabular-nums">₹{formatINR(row.grand_total)}</span>,
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Button variant="outline" size="sm" onClick={() => navigate('/suppliers')} icon={<ArrowLeft className="h-4 w-4" />}>
        Back to suppliers
      </Button>

      {/* Profile banner */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-brand-600" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-semibold text-slate-900">{supplier.name}</h1>
                <Badge variant={supplier.is_active ? 'success' : 'default'}>
                  {supplier.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              {supplier.gstin && <p className="text-xs font-mono text-slate-500 mt-0.5">GSTIN: {supplier.gstin}</p>}
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total spend</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-brand-700 mt-1">₹{formatINR(totalSpend)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {supplier.phone && (
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 text-sm">
              <Phone className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <span className="font-mono text-slate-700">{supplier.phone}</span>
            </div>
          )}
          {supplier.email && (
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 text-sm">
              <Mail className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <span className="text-slate-700">{supplier.email}</span>
            </div>
          )}
          {supplier.address && (
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 text-sm">
              <MapPin className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <span className="text-slate-700 truncate max-w-[280px]">{supplier.address}</span>
            </div>
          )}
        </div>
      </div>

      <Card title={`Purchase invoices (${invoices.length})`} subtitle="All bills from this supplier">
        <Table
          columns={columns}
          data={invoices}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => navigate(`/purchases/${row.id}`)}
          isLoading={false}
          emptyTitle="No invoices from this supplier"
          emptyText="No bills have been recorded under this supplier."
          emptyActionLabel="New invoice"
          onEmptyAction={() => navigate('/purchases/import')}
        />
      </Card>
    </div>
  );
};
