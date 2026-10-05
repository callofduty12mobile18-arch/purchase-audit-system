import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, PlusCircle, Search, Building2, Calendar, Package, DollarSign, Printer, X, Tag, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Table } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Pagination } from '../components/ui/Pagination';
import { ShimmerBar } from '../components/ui/LoadingSkeleton';
import { PurchaseInvoice, PurchaseItem } from '../types';
import { dbService } from '../services/dbService';
import { useToast } from '../context/ToastContext';

export const PurchasesPage: React.FC = () => {
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    loadInvoices();

    const handleFocusSync = () => {
      if (document.visibilityState === 'visible') {
        loadInvoices(true);
      }
    };

    window.addEventListener('visibilitychange', handleFocusSync);
    window.addEventListener('focus', handleFocusSync);

    return () => {
      window.removeEventListener('visibilitychange', handleFocusSync);
      window.removeEventListener('focus', handleFocusSync);
    };
  }, []);

  const handleDeleteInvoice = async () => {
    if (!selectedInvoice) return;
    setIsDeleting(true);
    try {
      await dbService.deleteInvoice(selectedInvoice.id);
      toastSuccess('Invoice Deleted', `Invoice #${selectedInvoice.invoice_number} has been deleted.`);
      setSelectedInvoice(null);
      setShowDeleteConfirm(false);
      loadInvoices();
    } catch (err: any) {
      toastError('Delete Failed', err.message || 'Could not delete invoice.');
    } finally {
      setIsDeleting(false);
    }
  };

  const loadInvoices = async (isBackgroundSync = false) => {
    if (!isBackgroundSync) {
      setLoading(true);
    }
    setFetchError(null);
    try {
      const data = await dbService.getInvoices();
      setInvoices(data);
    } catch (err: any) {
      const msg = err.message || 'Failed to retrieve purchase invoices from database.';
      if (!isBackgroundSync) {
        setFetchError(msg);
        toastError('Database Error', msg);
      }
    } finally {
      if (!isBackgroundSync) {
        setLoading(false);
      }
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const q = search.toLowerCase();
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(q) ||
      (inv.invoice_name && inv.invoice_name.toLowerCase().includes(q)) ||
      (inv.supplier?.name && inv.supplier.name.toLowerCase().includes(q));

    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredInvoices.length / pageSize) || 1;
  const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const columns = [
    {
      header: 'Invoice #',
      cell: (row: PurchaseInvoice) => (
        <div className="space-y-0.5">
          <span className="font-mono text-[#4B49AC] font-bold hover:underline cursor-pointer flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 text-[#7DA0FA]" />
            {row.invoice_number}
          </span>
          {row.invoice_name && (
            <span className="text-[11px] text-[#6C7383] font-medium block truncate max-w-[180px]" title={row.invoice_name}>
              {row.invoice_name}
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Supplier Name',
      cell: (row: PurchaseInvoice) => (
        <span className="font-semibold text-[#1F1F2C]">{row.supplier?.name || 'AYYAPPA ENTERPRISES'}</span>
      )
    },
    {
      header: 'Invoice Date',
      cell: (row: PurchaseInvoice) => <span className="font-mono text-[#6C7383] text-xs">{row.invoice_date}</span>
    },
    {
      header: 'Items & Packs',
      cell: (row: PurchaseInvoice) => {
        const totalPacks = row.items?.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) || 0;
        return (
          <div className="space-y-0.5">
            <span className="px-2.5 py-0.5 rounded-full bg-[#F5F7FF] border border-[#D5DCED] text-[#4B49AC] font-mono text-xs font-semibold inline-block">
              {row.items?.length || 0} items
            </span>
            {totalPacks > 0 && (
              <span className="text-[11px] font-mono text-[#6C7383] block">
                {totalPacks} packs
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Payment Mode',
      cell: (row: PurchaseInvoice) => (
        <span className="font-mono text-xs text-[#1F1F2C] font-medium">{row.payment_mode}</span>
      )
    },
    {
      header: 'Payment Status',
      cell: (row: PurchaseInvoice) => (
        <Badge variant={row.payment_status === 'PAID' ? 'success' : 'warning'}>
          {row.payment_status}
        </Badge>
      )
    },
    {
      header: 'Invoice Total',
      className: 'text-right',
      cell: (row: PurchaseInvoice) => (
        <span className="font-mono font-bold text-[#4B49AC] text-sm">₹{row.grand_total.toFixed(2)}</span>
      )
    }
  ];

  const totalSpend = filteredInvoices.reduce((sum, i) => sum + i.grand_total, 0);

  const selectedTotalPacks = selectedInvoice?.items?.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">
            <Receipt className="w-6 h-6 text-[#4B49AC]" />
            Purchase Invoices Ledger
          </h1>
          <p className="page-subtitle">
            Manage purchase bills, track supplier history, and view order totals.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => navigate('/purchases/import')}
          icon={<PlusCircle className="w-4 h-4" />}
        >
          New Purchase Invoice
        </Button>
      </div>

      {/* Summary Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#ECEEF5] shadow-skydash">
          <span className="text-[11px] font-bold text-[#6C7383] uppercase tracking-wider block">Total Invoices</span>
          {loading ? (
            <ShimmerBar className="h-7 w-20 mt-1" />
          ) : (
            <span className="text-xl sm:text-2xl font-bold font-mono text-[#1F1F2C] mt-1 block">
              {filteredInvoices.length}
            </span>
          )}
        </div>
        <div className="p-5 rounded-2xl bg-white border border-[#ECEEF5] shadow-skydash">
          <span className="text-[11px] font-bold text-[#6C7383] uppercase tracking-wider block">Total Spend</span>
          {loading ? (
            <ShimmerBar className="h-7 w-32 mt-1" />
          ) : (
            <span className="text-xl sm:text-2xl font-bold font-mono text-[#4B49AC] mt-1 block">
              ₹{totalSpend.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-white border border-[#ECEEF5] flex flex-col sm:flex-row items-center gap-3.5 shadow-skydash">
        <div className="flex-1 w-full">
          <Input
            placeholder="Search by invoice number, memo name, or supplier..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Invoices Table with Complete States */}
      <div className="space-y-4">
        <Table
          columns={columns}
          data={paginatedInvoices}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => setSelectedInvoice(row)}
          isLoading={loading}
          isError={fetchError}
          onRetry={loadInvoices}
          searchQuery={search}
          onClearSearch={() => setSearch('')}
          emptyVariant="invoices"
          emptyTitle="No Purchase Invoices Recorded Yet"
          emptyText="Start logging your purchase bills to keep track of supplier procurement, item rates, and totals."
          emptyActionLabel="Create First Purchase Invoice"
          onEmptyAction={() => navigate('/purchases/import')}
          skeletonRows={5}
        />

        {!loading && !fetchError && totalPages > 1 && (
          <div className="pt-2">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Interactive Invoice Details Modal */}
      {selectedInvoice && (
        <Modal
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          title={`Purchase Invoice #${selectedInvoice.invoice_number}`}
          subtitle={`Recorded Bill Details • ${selectedInvoice.invoice_date}`}
          size="xl"
          footer={
            <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="text-xs text-[#6C7383] font-mono">
                Invoice Total:{' '}
                <strong className="text-base text-[#4B49AC] font-bold">
                  ₹{selectedInvoice.grand_total.toFixed(2)}
                </strong>
              </div>
              <div className="flex items-center justify-end gap-2 flex-wrap">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                >
                  Delete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  icon={<Printer className="w-3.5 h-3.5" />}
                >
                  Print Invoice
                </Button>
                <Button variant="primary" size="sm" onClick={() => setSelectedInvoice(null)}>
                  Close
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-5">
            {/* Top Banner Overview */}
            <div className="p-4 rounded-2xl bg-[#F5F7FF] border border-[#ECEEF5] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="p-2 bg-white rounded-xl border border-[#ECEEF5] text-[#4B49AC] shadow-xs">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-extrabold text-[#1F1F2C]">
                        {selectedInvoice.invoice_number}
                      </span>
                      <Badge variant={selectedInvoice.payment_status === 'PAID' ? 'success' : 'warning'}>
                        {selectedInvoice.payment_status}
                      </Badge>
                    </div>
                    {selectedInvoice.invoice_name && (
                      <span className="text-xs font-semibold text-[#4B49AC] block mt-0.5">
                        🏷️ {selectedInvoice.invoice_name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[10px] uppercase font-bold text-[#6C7383] tracking-wider block">
                    Grand Total
                  </span>
                  <span className="text-xl sm:text-2xl font-bold font-mono text-[#4B49AC]">
                    ₹{selectedInvoice.grand_total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Header Info Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                <div className="p-3 rounded-xl bg-white border border-[#ECEEF5] space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-[#8F93A0] tracking-wider flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-[#4B49AC]" /> Supplier
                  </span>
                  <p className="font-bold text-[#1F1F2C] truncate">
                    {selectedInvoice.supplier?.name || 'AYYAPPA ENTERPRISES'}
                  </p>
                  <p className="text-[11px] text-[#6C7383]">ITC Authorized Agency</p>
                </div>

                <div className="p-3 rounded-xl bg-white border border-[#ECEEF5] space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-[#8F93A0] tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#7DA0FA]" /> Date & Terms
                  </span>
                  <p className="font-bold font-mono text-[#1F1F2C]">
                    {selectedInvoice.invoice_date}
                  </p>
                  <p className="text-[11px] text-[#6C7383]">
                    Mode: <strong className="text-[#1F1F2C]">{selectedInvoice.payment_mode}</strong>
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white border border-[#ECEEF5] space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-[#8F93A0] tracking-wider flex items-center gap-1">
                    <Package className="w-3 h-3 text-[#7978E9]" /> Volume Summary
                  </span>
                  <p className="font-bold font-mono text-[#1F1F2C]">
                    {selectedInvoice.items?.length || 0} Distinct SKUs
                  </p>
                  <p className="text-[11px] font-mono text-[#6C7383]">{selectedTotalPacks} Total Packs</p>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#6C7383] flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-[#4B49AC]" />
                  Purchased Items ({selectedInvoice.items?.length || 0})
                </h4>
                <span className="text-xs font-mono text-[#8F93A0]">
                  {selectedTotalPacks} total packs ordered
                </span>
              </div>

              <div className="overflow-hidden rounded-xl border border-[#ECEEF5] bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F5F7FF] text-[11px] font-bold uppercase tracking-wider text-[#6C7383] border-b border-[#ECEEF5]">
                    <tr>
                      <th className="px-3.5 py-2.5 text-center">#</th>
                      <th className="px-3.5 py-2.5">Product Name / Alias</th>
                      <th className="px-3.5 py-2.5">HSN</th>
                      <th className="px-3.5 py-2.5 text-right">Quantity (Packs)</th>
                      <th className="px-3.5 py-2.5 text-right">Purchase Rate (₹)</th>
                      <th className="px-3.5 py-2.5 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECEEF5]">
                    {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                      selectedInvoice.items.map((item: PurchaseItem, idx: number) => (
                        <tr key={item.id || idx} className="hover:bg-[#F8F9FE] transition-colors">
                          <td className="px-3.5 py-2.5 font-mono text-[#6C7383] text-center font-bold">
                            {idx + 1}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <span className="font-bold text-[#1F1F2C] block">
                              {item.product?.nickname || item.supplier_item_name_snapshot}
                            </span>
                            <span className="text-[10px] font-mono text-[#8F93A0]">
                              {item.supplier_item_name_snapshot}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-[#6C7383]">
                            {item.hsn_snapshot || '24022090'}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono font-bold text-[#1F1F2C]">
                            {item.quantity} {item.uom_snapshot || 'PAC'}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono font-semibold text-[#4B49AC]">
                            ₹{item.purchase_rate.toFixed(2)}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono font-bold text-[#1F1F2C]">
                            ₹{item.total.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-xs text-[#8F93A0]">
                          No item records attached to this invoice.
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

      {showDeleteConfirm && selectedInvoice && (
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteInvoice}
          title="Delete Purchase Invoice"
          message={`Are you sure you want to delete Invoice #${selectedInvoice.invoice_number}? This will permanently delete this bill and all its associated item entries from the database.`}
          confirmText="Yes, Delete Invoice"
          variant="danger"
          isLoading={isDeleting}
        />
      )}
    </div>
  );
};
