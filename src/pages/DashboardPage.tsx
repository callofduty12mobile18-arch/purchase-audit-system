import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  Receipt,
  Package,
  Wallet,
  Banknote,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { StatCard } from '../components/ui/StatCard';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Table, TableColumn } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { StatCardSkeleton } from '../components/ui/LoadingSkeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { PurchaseInvoice, Product } from '../types';
import { dbService } from '../services/dbService';
import { paymentService } from '../services/paymentService';
import { useToast } from '../context/ToastContext';
import { getTodayIST, formatDisplayDate, formatINR } from '../utils/dateUtils';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { error: toastError } = useToast();
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dateFilter, setDateFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [paymentMetrics, setPaymentMetrics] = useState({
    totalOutstanding: 0,
    totalPendingCheques: 0,
    totalClearedCheques: 0,
    totalCashPayments: 0,
  });

  const loadData = async (background = false) => {
    if (!background) setLoading(true);
    setFetchError(null);
    try {
      const [invs, prods] = await Promise.all([
        dbService.getInvoices(),
        dbService.getProducts(),
      ]);
      setInvoices(invs);
      setProducts(prods);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load dashboard data.';
      if (!background) {
        setFetchError(msg);
        toastError('Load error', msg);
      }
    } finally {
      if (!background) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const sync = () => { if (document.visibilityState === 'visible') loadData(true); };
    window.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('visibilitychange', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  const matchDate = (invoiceDate: string, filter: string): boolean => {
    if (filter === 'ALL' || !invoiceDate) return filter === 'ALL';
    const d = invoiceDate.slice(0, 10);
    const today = getTodayIST();
    if (filter === 'TODAY') return d === today;
    if (filter === 'THIS_WEEK') {
      const now = new Date();
      const start = new Date(now); start.setDate(now.getDate() - now.getDay());
      return d >= getTodayIST(start) && d <= today;
    }
    if (filter === 'THIS_MONTH') return d.slice(0, 7) === today.slice(0, 7);
    if (filter === 'LAST_MONTH') {
      const last = new Date(); last.setDate(1); last.setMonth(last.getMonth() - 1);
      return d.slice(0, 7) === getTodayIST(last).slice(0, 7);
    }
    if (filter === 'THIS_YEAR') return d.slice(0, 4) === today.slice(0, 4);
    return true;
  };

  const visible = invoices.filter((i) => matchDate(i.invoice_date, dateFilter));
  const totalValue = visible.reduce((s, i) => s + i.grand_total, 0);
  const recentInvoices = visible.slice(0, 10);

  useEffect(() => {
    let active = true;
    paymentService.getDashboardMetrics(visible).then((res) => {
      if (active) setPaymentMetrics(res);
    });
    return () => {
      active = false;
    };
  }, [invoices, dateFilter]);

  const columns: TableColumn<PurchaseInvoice>[] = [
    {
      header: 'Invoice',
      cell: (row) => (
        <div>
          <p className="font-mono text-sm font-semibold text-brand-700">{row.invoice_number}</p>
          <p className="text-xs text-slate-500 mt-0.5">{row.invoice_name || 'RAMACHANDRAN'}</p>
        </div>
      ),
    },
    {
      header: 'Supplier',
      cell: (row) => (
        <span className="text-sm font-medium text-slate-900">
          {row.supplier?.name || 'AYYAPPA ENTERPRISES'}
        </span>
      ),
    },
    {
      header: 'Date',
      cell: (row) => (
        <span className="text-sm font-mono text-slate-600">
          {formatDisplayDate(row.invoice_date)}
        </span>
      ),
    },
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
    {
      header: 'Payment',
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
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (row) => (
        <span className="font-mono font-semibold text-slate-900 tabular-nums">
          ₹{formatINR(row.grand_total)}
        </span>
      ),
    },
  ];

  if (fetchError) {
    return <ErrorState title="Dashboard unavailable" message={fetchError} onRetry={() => loadData()} />;
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Procurement overview and recent activity</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-44">
            <Select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              options={[
                { value: 'ALL',        label: 'All time' },
                { value: 'TODAY',      label: 'Today' },
                { value: 'THIS_WEEK',  label: 'This week' },
                { value: 'THIS_MONTH', label: 'This month' },
                { value: 'LAST_MONTH', label: 'Last month' },
                { value: 'THIS_YEAR',  label: 'This year' },
              ]}
            />
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/purchases/import')}
            icon={<PlusCircle className="h-4 w-4" />}
          >
            New invoice
          </Button>
        </div>
      </div>

      {/* Settlement & Cash/Cheque KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              color="amber"
              title="Total Outstanding"
              value={`₹${formatINR(paymentMetrics.totalOutstanding)}`}
              subtitle="Unsettled invoice balance"
              change={paymentMetrics.totalOutstanding > 0 ? 'Pending payment' : 'All settled'}
              changeType={paymentMetrics.totalOutstanding > 0 ? 'negative' : 'positive'}
              icon={<AlertCircle className="h-5 w-5" />}
            />
            <StatCard
              color="blue"
              title="Total Pending Cheques"
              value={`₹${formatINR(paymentMetrics.totalPendingCheques)}`}
              subtitle="Cheques awaiting clearance"
              changeType="neutral"
              icon={<Clock className="h-5 w-5" />}
            />
            <StatCard
              color="green"
              title="Total Cleared Cheques"
              value={`₹${formatINR(paymentMetrics.totalClearedCheques)}`}
              subtitle="Realized cheque payments"
              changeType="positive"
              icon={<CheckCircle2 className="h-5 w-5" />}
            />
            <StatCard
              color="green"
              title="Total Cash Payments"
              value={`₹${formatINR(paymentMetrics.totalCashPayments)}`}
              subtitle="Direct cash settlements"
              changeType="positive"
              icon={<Banknote className="h-5 w-5" />}
            />
          </>
        )}
      </div>

      {/* Secondary Procurement Volume Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          color="blue"
          title="Total purchase value"
          value={`₹${formatINR(totalValue)}`}
          subtitle="Total procurement spend"
          change={`${visible.length} invoice${visible.length !== 1 ? 's' : ''}`}
          changeType="positive"
          icon={<Receipt className="h-5 w-5" />}
        />
        <StatCard
          color="violet"
          title="Cataloged products"
          value={products.length}
          subtitle="Mapped SKU aliases"
          change={`${products.length} active`}
          changeType="positive"
          icon={<Package className="h-5 w-5" />}
        />
      </div>

      {/* Recent invoices */}
      <Card
        title="Recent invoices"
        subtitle="Latest verified supplier bills"
        action={
          <Button variant="outline" size="sm" onClick={() => navigate('/purchases')}>
            View all
          </Button>
        }
      >
        <Table
          columns={columns}
          data={recentInvoices}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => navigate(`/purchases/${row.id}`)}
          isLoading={loading}
          emptyTitle="No invoices yet"
          emptyText="Record your first purchase bill to see it here."
          emptyActionLabel="New invoice"
          onEmptyAction={() => navigate('/purchases/import')}
          skeletonRows={5}
        />
      </Card>
    </div>
  );
};
