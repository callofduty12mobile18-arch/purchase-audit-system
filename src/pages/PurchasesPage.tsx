import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, PlusCircle, Search, Eye } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Table } from '../components/ui/Table';
import { Pagination } from '../components/ui/Pagination';
import { PurchaseInvoice } from '../types';
import { dbService } from '../services/dbService';

export const PurchasesPage: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    const data = await dbService.getInvoices();
    setInvoices(data);
    setLoading(false);
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (inv.supplier?.name && inv.supplier.name.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = !statusFilter || inv.verification_status === statusFilter;
    return matchesSearch && matchesStatus;
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
      header: 'Items',
      cell: (row: PurchaseInvoice) => (
        <span className="px-2.5 py-0.5 rounded-full bg-[#F5F7FF] border border-[#D5DCED] text-[#4B49AC] font-mono text-xs font-semibold">
          {row.items?.length || 0} items
        </span>
      )
    },
    {
      header: 'Taxable Amount',
      cell: (row: PurchaseInvoice) => <span className="font-mono text-[#1F1F2C]">₹{row.taxable_amount.toFixed(2)}</span>
    },
    {
      header: 'GST Tax',
      cell: (row: PurchaseInvoice) => <span className="font-mono text-[#1F1F2C] font-semibold">₹{row.total_tax.toFixed(2)}</span>
    },
    {
      header: 'Grand Total',
      cell: (row: PurchaseInvoice) => (
        <span className="font-mono font-bold text-[#4B49AC] text-sm">₹{row.grand_total.toFixed(2)}</span>
      )
    },
    {
      header: 'Status',
      cell: (row: PurchaseInvoice) => (
        <Badge variant={row.verification_status === 'VERIFIED' ? 'success' : 'warning'}>
          {row.verification_status}
        </Badge>
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
          Inspect
        </Button>
      )
    }
  ];

  const totalSpend = filteredInvoices.reduce((sum, i) => sum + i.grand_total, 0);
  const totalTax = filteredInvoices.reduce((sum, i) => sum + i.total_tax, 0);

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
            Audited purchase invoices, attached bill documents, and itemized GST tax breakdowns.
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#ECEEF5] shadow-skydash">
          <span className="text-[11px] font-bold text-[#6C7383] uppercase tracking-wider block">Filtered Invoices</span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-[#1F1F2C] mt-1 block">{filteredInvoices.length}</span>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-[#ECEEF5] shadow-skydash">
          <span className="text-[11px] font-bold text-[#6C7383] uppercase tracking-wider block">Total Spend</span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-[#4B49AC] mt-1 block">₹{totalSpend.toFixed(2)}</span>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-[#ECEEF5] shadow-skydash">
          <span className="text-[11px] font-bold text-[#6C7383] uppercase tracking-wider block">Total GST Input Tax</span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-[#7DA0FA] mt-1 block">₹{totalTax.toFixed(2)}</span>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-[#ECEEF5] shadow-skydash">
          <span className="text-[11px] font-bold text-[#6C7383] uppercase tracking-wider block">Audit State</span>
          <span className="text-sm font-bold text-emerald-600 mt-2 block flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            100% Immutable
          </span>
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
        <div className="w-full sm:w-64">
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            options={[
              { value: '', label: 'All Verification Statuses' },
              { value: 'VERIFIED', label: 'Verified Only' },
              { value: 'DRAFT', label: 'Drafts Only' },
              { value: 'PENDING_VERIFICATION', label: 'Pending Verification' },
              { value: 'REJECTED', label: 'Rejected' },
            ]}
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="space-y-4">
        <Table
          columns={columns}
          data={paginatedInvoices}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => navigate(`/purchases/${row.id}`)}
          isLoading={loading}
          emptyText="No invoices matched your filter criteria."
        />

        {totalPages > 1 && (
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
