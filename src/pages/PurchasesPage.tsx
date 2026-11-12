import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle, Search, X, Receipt, Building2, Calendar, Package,
  Printer, Trash2, Edit3,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Table, TableColumn } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Pagination } from '../components/ui/Pagination';
import { Skeleton } from '../components/ui/LoadingSkeleton';
import { PurchaseInvoice, PurchaseItem } from '../types';
import { dbService } from '../services/dbService';
import { useToast } from '../context/ToastContext';
import { formatDisplayDate, formatINR, getTodayIST } from '../utils/dateUtils';

const PAGE_SIZE = 10;

export const PurchasesPage: React.FC = () => {
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();

  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [memoFilter, setMemoFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [customDate, setCustomDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadInvoices = async (background = false) => {
    if (!background) setLoading(true);
    setFetchError(null);
    try {
      const data = await dbService.getInvoices();
      setInvoices(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load invoices.';
      if (!background) { setFetchError(msg); toastError('Load error', msg); }
    } finally {
      if (!background) setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
    const sync = () => { if (document.visibilityState === 'visible') loadInvoices(true); };
    window.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync);
    return () => { window.removeEventListener('visibilitychange', sync); window.removeEventListener('focus', sync); };
  }, []);

  // Memo name options
  const memoOptions = React.useMemo(() => {
    const preset = ['RAMACHANDRAN', 'ASHWIN KARTHIK', 'BERRY QUEQ', 'SUBIKSHA STORE'];
    const fromData = invoices.map((i) => i.invoice_name).filter(Boolean) as string[];
    const unique = Array.from(new Set([...preset, ...fromData]));
    return [
      { value: 'ALL', label: 'All memo names' },
      ...unique.map((n) => ({ value: n, label: n })),
    ];
  }, [invoices]);

  const matchDate = (invoiceDate: string, filter: string, custom: string): boolean => {
    if (filter === 'ALL') return true;
    if (!invoiceDate) return false;
    const d = invoiceDate.slice(0, 10);
    const today = getTodayIST();
    if (filter === 'CUSTOM') return custom ? d === custom : true;
    if (filter === 'TODAY') return d === today;
    if (filter === 'THIS_WEEK') {
      const now = new Date(); const start = new Date(now); start.setDate(now.getDate() - now.getDay());
      return d >= getTodayIST(start) && d <= today;
    }
    if (filter === 'THIS_MONTH') return d.slice(0, 7) === today.slice(0, 7);
    if (filter === 'LAST_MONTH') {
      const l = new Date(); l.setDate(1); l.setMonth(l.getMonth() - 1);
      return d.slice(0, 7) === getTodayIST(l).slice(0, 7);
    }
    if (filter === 'THIS_YEAR') return d.slice(0, 4) === today.slice(0, 4);
    return true;
  };

  const filtered = invoices.filter((inv) => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q || (
      inv.invoice_number.toLowerCase().includes(q) ||
      (inv.invoice_name?.toLowerCase().includes(q)) ||
      (inv.supplier?.name?.toLowerCase().includes(q))
    );
    const matchMemo = memoFilter === 'ALL' || (inv.invoice_name || 'RAMACHANDRAN').toUpperCase() === memoFilter;
    const matchStatus = statusFilter === 'ALL' || inv.payment_status === statusFilter;
    return matchSearch && matchDate(inv.invoice_date, dateFilter, customDate) && matchMemo && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const totalSpend = filtered.reduce((s, i) => s + i.grand_total, 0);

  const handleDelete = async () => {
    if (!selectedInvoice) return;
    setDeleting(true);
    try {
      await dbService.deleteInvoice(selectedInvoice.id);
      toastSuccess('Invoice deleted', `#${selectedInvoice.invoice_number} removed.`);
      setSelectedInvoice(null);
      setShowDelete(false);
      loadInvoices();
    } catch (err: unknown) {
      toastError('Delete failed', err instanceof Error ? err.message : 'Could not delete.');
    } finally {
      setDeleting(false);
    }
  };

  const clearFilters = () => {
    setSearch(''); setMemoFilter('ALL'); setStatusFilter('ALL'); setDateFilter('ALL'); setCustomDate(''); setCurrentPage(1);
  };
  const hasFilters = search || memoFilter !== 'ALL' || statusFilter !== 'ALL' || dateFilter !== 'ALL' || customDate;

  const columns: TableColumn<PurchaseInvoice>[] = [
    {
      header: 'Invoice',
      cell: (row) => (
        <div>
          <p className="font-mono text-sm font-semibold text-brand-700 whitespace-nowrap">{row.invoice_number}</p>
          <p className="text-xs text-slate-500 mt-0.5">{row.invoice_name || 'RAMACHANDRAN'}</p>
          <span className="sm:hidden text-[11px] text-slate-400 font-mono block mt-0.5">{formatDisplayDate(row.invoice_date)}</span>
        </div>
      ),
    },
    {
      header: 'Supplier',
      headerClassName: 'hidden sm:table-cell',
      className: 'hidden sm:table-cell',
      cell: (row) => (
        <span className="text-sm font-medium text-slate-900">
          {row.supplier?.name || 'AYYAPPA ENTERPRISES'}
        </span>
      ),
    },
    {
      header: 'Date',
      headerClassName: 'hidden md:table-cell',
      className: 'hidden md:table-cell',
      cell: (row) => (
        <span className="text-sm font-mono text-slate-600 whitespace-nowrap">
          {formatDisplayDate(row.invoice_date)}
        </span>
      ),
    },
    {
      header: 'Items',
      headerClassName: 'hidden lg:table-cell',
      className: 'hidden lg:table-cell',
      cell: (row) => {
        const packs = row.items?.reduce((s, it) => s + (Number(it.quantity) || 0), 0) || 0;
        return (
          <div>
            <span className="text-sm text-slate-700 whitespace-nowrap">{row.items?.length || 0} items</span>
            {packs > 0 && <p className="text-xs font-mono text-slate-500 whitespace-nowrap">{packs} packs</p>}
          </div>
        );
      },
    },
    {
      header: 'Mode',
      headerClassName: 'hidden sm:table-cell',
      className: 'hidden sm:table-cell',
      cell: (row) => <span className="text-sm text-slate-600 font-mono">{row.payment_mode}</span>,
    },
    {
      header: 'Status',
      cell: (row) => {
        const variant =
          row.payment_status === 'PAID'
            ? 'success'
            : row.payment_status === 'CHEQUE_PENDING'
            ? 'info'
            : row.payment_status === 'PARTIALLY_PAID'
            ? 'warning'
            : row.payment_status === 'OVERDUE'
            ? 'danger'
            : 'default';

        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant={variant}>
              {row.payment_status}
            </Badge>
            {row.payment_mode === 'CHEQUE' && row.cheque_status && (
              <Badge variant={row.cheque_status === 'CLEARED' ? 'success' : 'info'}>
                {row.cheque_status}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      header: 'Total',
      headerClassName: 'text-right whitespace-nowrap',
      className: 'text-right whitespace-nowrap',
      cell: (row) => (
        <span className="font-mono font-semibold text-slate-900 tabular-nums">
          ₹{formatINR(row.grand_total)}
        </span>
      ),
    },
  ];

  const selectedPacks = selectedInvoice?.items?.reduce((s, it) => s + (Number(it.quantity) || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Purchase invoices</h1>
          <p className="page-subtitle">Manage bills, track supplier history, view order totals.</p>
        </div>
        <Button
          variant="primary"
          onClick={() => navigate('/purchases/import')}
          icon={<PlusCircle className="h-4 w-4" />}
        >
          New invoice
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg border border-slate-200 shadow-card p-3 sm:p-4 min-w-0">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide truncate">Total invoices</p>
          {loading ? <Skeleton className="h-7 w-12 mt-1.5" /> : (
            <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">{filtered.length}</p>
          )}
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-card p-3 sm:p-4 min-w-0">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide truncate">Total spend</p>
          {loading ? <Skeleton className="h-7 w-28 mt-1.5" /> : (
            <p className="text-base sm:text-2xl font-bold font-mono tabular-nums text-brand-700 mt-1 truncate" title={`₹${formatINR(totalSpend)}`}>
              ₹{formatINR(totalSpend)}
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-card p-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Search invoice # or supplier..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              icon={<Search className="h-4 w-4" />}
            />
          </div>
          <div className="w-full sm:w-56">
            <Select
              value={memoFilter}
              onChange={(e) => { setMemoFilter(e.target.value); setCurrentPage(1); }}
              options={memoOptions}
            />
          </div>
          <div className="w-full sm:w-44">
            <Select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              options={[
                { value: 'ALL', label: 'All statuses' },
                { value: 'PAID', label: 'Paid' },
                { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
                { value: 'UNPAID', label: 'Unpaid' },
                { value: 'CHEQUE_PENDING', label: 'Cheque Pending' },
                { value: 'OVERDUE', label: 'Overdue' },
              ]}
            />
          </div>
          <div className="w-full sm:w-44">
            <Select
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
              options={[
                { value: 'ALL', label: 'All dates' },
                { value: 'TODAY', label: 'Today' },
                { value: 'THIS_WEEK', label: 'This week' },
                { value: 'THIS_MONTH', label: 'This month' },
                { value: 'LAST_MONTH', label: 'Last month' },
                { value: 'THIS_YEAR', label: 'This year' },
                { value: 'CUSTOM', label: 'Specific date...' },
              ]}
            />
          </div>
          {dateFilter === 'CUSTOM' && (
            <div className="w-full sm:w-36">
              <input
                type="date"
                value={customDate}
                onChange={(e) => { setCustomDate(e.target.value); setCurrentPage(1); }}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 font-mono"
              />
            </div>
          )}
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              icon={<X className="h-3.5 w-3.5" />}
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="space-y-4">
        <Table
          columns={columns}
          data={paginated}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => setSelectedInvoice(row)}
          isLoading={loading}
          isError={fetchError}
          onRetry={() => loadInvoices()}
          searchQuery={search}
          onClearSearch={clearFilters}
          emptyTitle="No invoices found"
          emptyText="Start recording purchase bills to track supplier procurement."
          emptyActionLabel="New invoice"
          onEmptyAction={() => navigate('/purchases/import')}
          skeletonRows={5}
        />
        {!loading && !fetchError && totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(p) => { setCurrentPage(p); window.scrollTo({ top: 0 }); }}
          />
        )}
      </div>

      {/* Invoice detail modal */}
      {selectedInvoice && (
        <Modal
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          title={`Invoice #${selectedInvoice.invoice_number}`}
          subtitle={`${selectedInvoice.supplier?.name || 'AYYAPPA ENTERPRISES'} · ${formatDisplayDate(selectedInvoice.invoice_date)}`}
          size="xl"
          footer={
            <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <p className="text-sm font-mono font-semibold text-slate-900 tabular-nums">
                Total: <span className="text-brand-700">₹{formatINR(selectedInvoice.grand_total)}</span>
              </p>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowDelete(true)}
                  icon={<Trash2 className="h-3.5 w-3.5" />}
                >
                  Delete
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => { const id = selectedInvoice.id; setSelectedInvoice(null); navigate(`/purchases/edit/${id}`); }}
                  icon={<Edit3 className="h-3.5 w-3.5" />}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  icon={<Printer className="h-3.5 w-3.5" />}
                >
                  Print
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedInvoice(null)}>
                  Close
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-5">
            {/* Summary row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mb-1">
                  <Building2 className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" /> Supplier
                </p>
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {selectedInvoice.supplier?.name || 'AYYAPPA ENTERPRISES'}
                </p>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedInvoice.supplier?.gstin}</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mb-1">
                  <Calendar className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" /> Date & payment
                </p>
                <p className="text-sm font-semibold font-mono text-slate-900">
                  {formatDisplayDate(selectedInvoice.invoice_date)}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedInvoice.payment_mode}{' '}
                  <Badge
                    variant={
                      selectedInvoice.payment_status === 'PAID'
                        ? 'success'
                        : selectedInvoice.payment_status === 'CHEQUE_PENDING'
                        ? 'info'
                        : selectedInvoice.payment_status === 'PARTIALLY_PAID'
                        ? 'warning'
                        : selectedInvoice.payment_status === 'OVERDUE'
                        ? 'danger'
                        : 'default'
                    }
                    className="ml-1"
                  >
                    {selectedInvoice.payment_status}
                  </Badge>
                  {selectedInvoice.payment_mode === 'CHEQUE' && (
                    <Badge variant={selectedInvoice.cheque_status === 'CLEARED' ? 'success' : 'info'} className="ml-1">
                      Cheque {selectedInvoice.cheque_status ?? 'PENDING'}
                    </Badge>
                  )}
                </p>
                {selectedInvoice.payment_mode === 'CHEQUE' && (
                  <p className="text-xs text-slate-500 mt-1 font-mono">
                    ₹{formatINR(selectedInvoice.cheque_amount ?? selectedInvoice.grand_total)}
                    {selectedInvoice.cheque_presentation_date && (
                      <> · {formatDisplayDate(selectedInvoice.cheque_presentation_date)}</>
                    )}
                  </p>
                )}
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mb-1">
                  <Package className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" /> Volume
                </p>
                <p className="text-sm font-semibold font-mono text-slate-900">
                  {selectedInvoice.items?.length || 0} items
                </p>
                <p className="text-xs font-mono text-slate-500 mt-0.5">{selectedPacks} packs</p>
              </div>
            </div>

            {/* Line items */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Purchased items ({selectedInvoice.items?.length || 0})
              </p>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">#</th>
                      <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                      <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">HSN</th>
                      <th scope="col" className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Qty</th>
                      <th scope="col" className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Rate</th>
                      <th scope="col" className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                      selectedInvoice.items.map((item: PurchaseItem, idx: number) => (
                        <tr key={item.id || idx} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 text-xs font-mono text-slate-400">{idx + 1}</td>
                          <td className="px-4 py-2.5">
                            <p className="text-sm font-medium text-slate-900">
                              {item.product?.nickname || item.supplier_item_name_snapshot}
                            </p>
                            <p className="text-xs font-mono text-slate-400">
                              {item.supplier_item_name_snapshot}
                            </p>
                          </td>
                          <td className="px-4 py-2.5 text-xs font-mono text-slate-500">
                            {item.hsn_snapshot || '24022090'}
                          </td>
                          <td className="px-4 py-2.5 text-right text-sm font-mono font-semibold text-slate-900 tabular-nums">
                            {item.quantity} {item.uom_snapshot || 'PAC'}
                          </td>
                          <td className="px-4 py-2.5 text-right text-sm font-mono font-semibold text-brand-700 tabular-nums">
                            ₹{formatINR(item.purchase_rate)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-sm font-mono font-semibold text-slate-900 tabular-nums">
                            ₹{formatINR(item.total)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-xs text-slate-400">
                          No items recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {showDelete && selectedInvoice && (
        <ConfirmDialog
          isOpen={showDelete}
          onClose={() => setShowDelete(false)}
          onConfirm={handleDelete}
          title="Delete invoice"
          message={`Delete Invoice #${selectedInvoice.invoice_number}? This will permanently remove the bill and all its line items.`}
          confirmText="Delete invoice"
          variant="danger"
          isLoading={deleting}
        />
      )}
    </div>
  );
};
