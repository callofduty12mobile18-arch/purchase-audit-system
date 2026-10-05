import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  Receipt,
  Package,
} from 'lucide-react';
import { StatCard } from '../components/ui/StatCard';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { StatCardSkeleton } from '../components/ui/LoadingSkeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { PurchaseInvoice, Product } from '../types';
import { dbService } from '../services/dbService';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dateFilter, setDateFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [invs, prods] = await Promise.all([
        dbService.getInvoices(),
        dbService.getProducts(),
      ]);

      setInvoices(invs);
      setProducts(prods);
    } catch (err: any) {
      setFetchError(err.message || 'Failed to fetch executive dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  const matchesDateFilter = (invoiceDate: string, filter: string) => {
    if (filter === 'ALL') return true;
    const d = new Date(invoiceDate);
    if (Number.isNaN(d.getTime())) return false;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (filter === 'TODAY') {
      return d >= startOfToday;
    }
    if (filter === 'THIS_WEEK') {
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
      return d >= startOfWeek;
    }
    if (filter === 'THIS_MONTH') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (filter === 'LAST_MONTH') {
      const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    }
    if (filter === 'THIS_YEAR') {
      return d.getFullYear() === now.getFullYear();
    }
    return true;
  };

  const visibleInvoices = invoices.filter((inv) => matchesDateFilter(inv.invoice_date, dateFilter));

  // Real data calculations
  const totalPurchaseValue = visibleInvoices.reduce((sum, inv) => sum + inv.grand_total, 0);

  // Recent 10 Invoices
  const recentInvoices = visibleInvoices.slice(0, 10);

  const invoiceColumns = [
    {
      header: 'Invoice Number',
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
      header: 'Supplier',
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
      header: 'Grand Total',
      cell: (row: PurchaseInvoice) => (
        <span className="font-mono font-bold text-[#4B49AC] text-sm">₹{row.grand_total.toFixed(2)}</span>
      )
    }
  ];

  if (fetchError) {
    return (
      <div className="py-8">
        <ErrorState
          title="Dashboard Unavailable"
          message={fetchError}
          onRetry={loadDashboardData}
        />
      </div>
    );
  }

  return (
    <div className="space-y-7 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="page-title">
            <LayoutDashboard className="w-6 h-6 text-[#4B49AC]" />
            Executive Audit Dashboard
          </h1>
          <p className="page-subtitle">
            Real-time procurement metrics, purchase invoice tracking & active price monitoring.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="w-44">
            <Select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Time' },
                { value: 'THIS_MONTH', label: 'This Month' },
                { value: 'TODAY', label: 'Today' },
                { value: 'THIS_WEEK', label: 'This Week' },
                { value: 'LAST_MONTH', label: 'Previous Month' },
                { value: 'THIS_YEAR', label: 'This Year' },
              ]}
            />
          </div>
          <Button
            variant="primary"
            onClick={() => navigate('/purchases/import')}
            icon={<PlusCircle className="w-4 h-4" />}
          >
            New Purchase Invoice
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              color="blue"
              title="Total Purchase Value"
              value={`₹${totalPurchaseValue.toFixed(2)}`}
              subtitle="Total procurement spend"
              change={visibleInvoices.length > 0 ? `${visibleInvoices.length} Invoices` : undefined}
              changeType="positive"
              icon={<Receipt className="w-5 h-5" />}
            />
            <StatCard
              color="coral"
              title="Cataloged SKUs"
              value={products.length}
              subtitle="Mapped item aliases"
              change={`${products.length} Active`}
              changeType="positive"
              icon={<Package className="w-5 h-5" />}
            />
          </>
        )}
      </div>

      {/* Full-width Recent Purchase Invoices Card */}
      <Card
        title="Recent Purchase Invoices"
        subtitle="Latest verified supplier bills and line item snapshots"
        action={
          <Button variant="outline" size="sm" onClick={() => navigate('/purchases')} className="text-xs">
            View All Invoices
          </Button>
        }
      >
        <Table
          columns={invoiceColumns}
          data={recentInvoices}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => navigate(`/purchases/${row.id}`)}
          isLoading={loading}
          emptyVariant="invoices"
          emptyTitle="No Invoices Recorded Yet"
          emptyText="Click '+ New Purchase Invoice' to enter your first bill."
          emptyActionLabel="Enter Purchase Bill"
          onEmptyAction={() => navigate('/purchases/import')}
          skeletonRows={4}
        />
      </Card>
    </div>
  );
};
