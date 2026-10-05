import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, PlusCircle, Search, Eye } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Table } from '../components/ui/Table';
import { Pagination } from '../components/ui/Pagination';
import { ShimmerBar } from '../components/ui/LoadingSkeleton';
import { PurchaseInvoice } from '../types';
import { dbService } from '../services/dbService';
import { useToast } from '../context/ToastContext';

export const PurchasesPage: React.FC = () => {
  const navigate = useNavigate();
  const { error: toastError } = useToast();
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await dbService.getInvoices();
      setInvoices(data);
    } catch (err: any) {
      const msg = err.message || 'Failed to retrieve purchase invoices from database.';
      setFetchError(msg);
      toastError('Database Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (inv.supplier?.name && inv.supplier.name.toLowerCase().includes(search.toLowerCase()));

    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredInvoices.length / pageSize) || 1;
  const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const columns = [
    {
      header: 'Invoice #',
      cell: (row: PurchaseInvoice) => (
        <span
          onClick={() => navigate(`/purchases/${row.id}`)}
          className="font-mono text-[#4B49AC] font-bold hover:underline cursor-pointer flex items-center gap-1.5"
        >
          <Receipt className="w-3.5 h-3.5 text-[#7DA0FA]" />
          {row.invoice_number}
        </span>
      )
    },
    {
      header: 'Supplier Name',
      cell: (row: PurchaseInvoice) => (
        <span className="font-semibold text-[#1F1F2C]">{row.supplier?.name || 'Unknown Vendor'}</span>
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
      cell: (row: PurchaseInvoice) => (
        <span className="font-mono font-bold text-[#4B49AC] text-sm">₹{row.grand_total.toFixed(2)}</span>
      )
    },
    {
      header: 'Action',
      cell: (row: PurchaseInvoice) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/purchases/${row.id}`)}
          icon={<Eye className="w-3.5 h-3.5" />}
        >
          View
        </Button>
      )
    }
  ];

  const totalSpend = filteredInvoices.reduce((sum, i) => sum + i.grand_total, 0);
  const totalPacksPurchased = filteredInvoices.reduce(
    (sum, inv) => sum + (inv.items?.reduce((s, it) => s + (Number(it.quantity) || 0), 0) || 0),
    0
  );

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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
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
        <div className="p-5 rounded-2xl bg-white border border-[#ECEEF5] shadow-skydash">
          <span className="text-[11px] font-bold text-[#6C7383] uppercase tracking-wider block">Total Packs Purchased</span>
          {loading ? (
            <ShimmerBar className="h-7 w-24 mt-1" />
          ) : (
            <span className="text-xl sm:text-2xl font-bold font-mono text-[#7978E9] mt-1 block">
              {totalPacksPurchased}
            </span>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-white border border-[#ECEEF5] flex flex-col sm:flex-row items-center gap-3.5 shadow-skydash">
        <div className="flex-1 w-full">
          <Input
            placeholder="Search by invoice number or supplier name..."
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
          onRowClick={(row) => navigate(`/purchases/${row.id}`)}
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
    </div>
  );
};
