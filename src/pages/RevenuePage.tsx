import React, { useEffect, useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Plus,
  Search,
  Calendar,
  Layers,
  ArrowUpDown,
  Filter,
  Eye,
  Pencil,
  Trash2,
  RefreshCw,
  BarChart3,
  Coins,
  ShieldCheck,
  ShoppingBag,
  Boxes,
  Percent
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Table, TableColumn } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { StatCardSkeleton, CardSkeleton } from '../components/ui/LoadingSkeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { AddSaleModal } from '../features/revenue/AddSaleModal';
import { ViewSaleModal } from '../features/revenue/ViewSaleModal';
import { EditSaleModal } from '../features/revenue/EditSaleModal';
import {
  SaleTransaction,
  ProductStockInfo,
  RevenueDateFilter,
  RevenueMetrics
} from '../types';
import { revenueService } from '../services/revenueService';
import { formatINR, formatDisplayDate, getTodayIST, formatDisplayMonthYear } from '../utils/dateUtils';
import { useToast } from '../context/ToastContext';

export const RevenuePage: React.FC = () => {
  const { success: toastSuccess, error: toastError } = useToast();

  const [sales, setSales] = useState<SaleTransaction[]>([]);
  const [stockInfos, setStockInfos] = useState<ProductStockInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filters
  const [dateFilter, setDateFilter] = useState<RevenueDateFilter>('ALL');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [selectedSaleToView, setSelectedSaleToView] = useState<SaleTransaction | null>(null);
  const [selectedSaleToEdit, setSelectedSaleToEdit] = useState<SaleTransaction | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<SaleTransaction | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  const loadData = async (background = false) => {
    if (!background) setLoading(true);
    setFetchError(null);
    try {
      const [fetchedSales, fetchedStocks] = await Promise.all([
        revenueService.getSales(),
        revenueService.getAllProductsStockInfo()
      ]);
      setSales(fetchedSales);
      setStockInfos(fetchedStocks);
    } catch (err: any) {
      if (!background) setFetchError(err.message || 'Failed to load revenue and sales data.');
    } finally {
      if (!background) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleSync = () => {
      if (document.visibilityState === 'visible') loadData(true);
    };
    window.addEventListener('visibilitychange', handleSync);
    window.addEventListener('focus', handleSync);
    return () => {
      window.removeEventListener('visibilitychange', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, []);

  // Filtered sales based on date filter
  const dateFilteredSales = useMemo(() => {
    return revenueService.filterSalesByDate(sales, dateFilter, customStart, customEnd);
  }, [sales, dateFilter, customStart, customEnd]);

  // Aggregate metrics
  const metrics: RevenueMetrics = useMemo(() => {
    return revenueService.getRevenueMetrics(dateFilteredSales, stockInfos);
  }, [dateFilteredSales, stockInfos]);

  // Chart Analytics data
  const analyticsData = useMemo(() => {
    return revenueService.getRevenueAnalytics(dateFilteredSales, sales);
  }, [dateFilteredSales, sales]);

  // Table filtered sales (search + status)
  const tableFilteredSales = useMemo(() => {
    return dateFilteredSales.filter(s => {
      if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const numMatch = s.sale_number.toLowerCase().includes(q);
      const prodMatch = (s.product?.nickname || '').toLowerCase().includes(q) ||
        (s.product?.supplier_item_name || '').toLowerCase().includes(q);
      const custMatch = (s.customer_name || '').toLowerCase().includes(q);
      return numMatch || prodMatch || custMatch;
    });
  }, [dateFilteredSales, statusFilter, searchQuery]);

  // Pagination slicing
  const paginatedSales = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return tableFilteredSales.slice(startIndex, startIndex + pageSize);
  }, [tableFilteredSales, currentPage]);

  const totalPages = Math.ceil(tableFilteredSales.length / pageSize) || 1;

  const handleDeleteConfirm = async () => {
    if (!saleToDelete) return;
    setIsDeleting(true);
    try {
      await revenueService.deleteSale(saleToDelete.id);
      toastSuccess('Sale deleted', `Sale #${saleToDelete.sale_number} has been deleted and stock restored.`);
      setSaleToDelete(null);
      loadData(true);
    } catch (err: any) {
      toastError('Delete failed', err.message || 'Could not delete sale.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Table columns
  const columns: TableColumn<SaleTransaction>[] = [
    {
      header: 'Transaction ID',
      cell: (row) => (
        <button
          type="button"
          onClick={() => setSelectedSaleToView(row)}
          className="text-xs font-mono font-bold text-brand-700 hover:text-brand-800 hover:underline flex items-center gap-1 text-left"
        >
          <span className="p-1 rounded bg-brand-50 border border-brand-200">
            {row.sale_number}
          </span>
        </button>
      )
    },
    {
      header: 'Date',
      cell: (row) => (
        <span className="text-xs font-mono text-slate-700">
          {formatDisplayDate(row.sale_date)}
        </span>
      )
    },
    {
      header: 'Product Name',
      cell: (row) => (
        <div>
          <p className="text-xs font-semibold text-slate-900">
            {row.product?.nickname || 'Unknown Item'}
          </p>
          <p className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">
            {row.customer_name ? `Cust: ${row.customer_name}` : row.product?.supplier_item_name}
          </p>
        </div>
      )
    },
    {
      header: 'Qty Sold',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (row) => (
        <span className="text-xs font-mono font-semibold text-slate-900 tabular-nums">
          {row.quantity} <span className="text-[10px] text-slate-400 font-sans">{row.product?.uom || 'units'}</span>
        </span>
      )
    },
    {
      header: 'Unit Cost',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (row) => (
        <span className="text-xs font-mono text-slate-600 tabular-nums">
          ₹{formatINR(row.purchase_price)}
        </span>
      )
    },
    {
      header: 'Selling Price',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (row) => (
        <span className="text-xs font-mono text-slate-900 font-medium tabular-nums">
          ₹{formatINR(row.selling_price)}
        </span>
      )
    },
    {
      header: 'Total Revenue',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (row) => (
        <span className="text-xs font-mono font-bold text-brand-700 tabular-nums">
          ₹{formatINR(row.total_revenue)}
        </span>
      )
    },
    {
      header: 'Total COGS',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (row) => (
        <span className="text-xs font-mono text-slate-700 tabular-nums">
          ₹{formatINR(row.total_cogs)}
        </span>
      )
    },
    {
      header: 'Gross Profit',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (row) => {
        const isProf = row.gross_profit >= 0;
        return (
          <div className="text-right">
            <span className={`text-xs font-mono font-bold tabular-nums ${isProf ? 'text-emerald-700' : 'text-rose-700'}`}>
              ₹{formatINR(row.gross_profit)}
            </span>
            <span className={`block text-[10px] font-mono ${isProf ? 'text-emerald-600' : 'text-rose-600'}`}>
              ({row.profit_margin.toFixed(1)}%)
            </span>
          </div>
        );
      }
    },
    {
      header: 'Actions',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => setSelectedSaleToView(row)}
            className="p-1 rounded text-slate-400 hover:text-brand-600 hover:bg-slate-100 transition-colors"
            title="View sale details & FIFO batch breakdown"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setSelectedSaleToEdit(row)}
            className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
            title="Edit sale transaction"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setSaleToDelete(row)}
            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Delete sale (Restores stock)"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  if (fetchError) {
    return (
      <ErrorState
        title="Revenue Analytics Unavailable"
        message={fetchError}
        onRetry={() => loadData()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="page-title">Revenue & Profit Analytics</h1>
            <Badge variant="blue">FIFO Costing</Badge>
          </div>
          <p className="page-subtitle">
            Track sales performance, cost of goods sold (COGS), gross margins, and inventory valuation in real time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Filter */}
          <div className="w-44">
            <Select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value as RevenueDateFilter);
                setCurrentPage(1);
              }}
              options={[
                { value: 'ALL', label: 'All Time' },
                { value: 'TODAY', label: 'Today' },
                { value: 'YESTERDAY', label: 'Yesterday' },
                { value: 'THIS_WEEK', label: 'This Week' },
                { value: 'THIS_MONTH', label: 'This Month' },
                { value: 'LAST_MONTH', label: 'Last Month' },
                { value: 'THIS_YEAR', label: 'This Year' },
                { value: 'CUSTOM', label: 'Custom Range...' }
              ]}
            />
          </div>

          {/* Add Sale Button */}
          <Button
            variant="primary"
            onClick={() => setIsAddOpen(true)}
            icon={<Plus className="h-4 w-4" />}
          >
            Add Sale
          </Button>
        </div>
      </div>

      {/* Custom Date Range Picker */}
      {dateFilter === 'CUSTOM' && (
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-wrap items-center gap-4 animate-fade-in text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-500" />
            <span className="font-semibold text-slate-700">Custom Date Range:</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-500">From:</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="h-8 rounded-md border border-slate-300 px-2.5 text-xs text-slate-800"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-500">To:</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="h-8 rounded-md border border-slate-300 px-2.5 text-xs text-slate-800"
            />
          </div>
          {(customStart || customEnd) && (
            <button
              type="button"
              onClick={() => {
                setCustomStart('');
                setCustomEnd('');
              }}
              className="text-xs text-slate-500 hover:text-slate-800 underline"
            >
              Reset Range
            </button>
          )}
        </div>
      )}

      {/* Section 2: Summary Dashboard Cards (6 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            {/* 1. Total Sales Revenue */}
            <StatCard
              title="Sales Revenue"
              value={`₹${formatINR(metrics.totalRevenue)}`}
              subtitle="Sum of selling price × qty"
              color="blue"
              icon={<DollarSign className="h-5 w-5" />}
            />

            {/* 2. Total COGS */}
            <StatCard
              title="Total Cost (COGS)"
              value={`₹${formatINR(metrics.totalCogs)}`}
              subtitle="FIFO purchase cost allocated"
              color="amber"
              icon={<Boxes className="h-5 w-5" />}
            />

            {/* 3. Gross Profit */}
            <StatCard
              title="Gross Profit"
              value={`₹${formatINR(metrics.grossProfit)}`}
              subtitle="Revenue − COGS"
              color={metrics.grossProfit >= 0 ? 'green' : 'coral'}
              changeType={metrics.grossProfit >= 0 ? 'positive' : 'negative'}
              change={metrics.grossProfit >= 0 ? 'Profitable' : 'Gross Loss'}
              icon={metrics.grossProfit >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            />

            {/* 4. Gross Profit Margin */}
            <StatCard
              title="Profit Margin"
              value={`${metrics.grossProfitMargin.toFixed(1)}%`}
              subtitle="(Gross Profit / Revenue) × 100"
              color={metrics.grossProfitMargin >= 0 ? 'green' : 'coral'}
              changeType={metrics.grossProfitMargin >= 0 ? 'positive' : 'negative'}
              icon={<Percent className="h-5 w-5" />}
            />

            {/* 5. Total Items Sold */}
            <StatCard
              title="Items Sold"
              value={metrics.totalItemsSold}
              subtitle={`${metrics.totalTransactions} transactions`}
              color="violet"
              icon={<ShoppingBag className="h-5 w-5" />}
            />

            {/* 6. Current Stock Value */}
            <StatCard
              title="Stock Value"
              value={`₹${formatINR(metrics.currentStockValue)}`}
              subtitle="Unsold inventory valuation"
              color="purple"
              icon={<Package className="h-5 w-5" />}
            />
          </>
        )}
      </div>

      {/* Section 4: Analytics and Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue vs COGS vs Gross Profit */}
        <div className="lg:col-span-2">
          <Card
            title="Monthly Revenue vs Cost vs Gross Profit"
            subtitle="Comparing sales income, cost of goods sold, and gross profitability"
          >
            {loading ? (
              <div className="h-72 rounded-lg bg-slate-100 animate-pulse" />
            ) : analyticsData.monthlyTimeline.length === 0 ? (
              <div className="h-72 flex flex-col items-center justify-center text-sm text-slate-400">
                <BarChart3 className="h-8 w-8 text-slate-300 mb-2" />
                No sales records found for this period. Click "Add Sale" to record transactions.
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analyticsData.monthlyTimeline}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="month"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={formatDisplayMonthYear}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(val: number, name: string) => [`₹${formatINR(val)}`, name]}
                      labelFormatter={formatDisplayMonthYear}
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '12px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                    <Bar dataKey="revenue" name="Sales Revenue" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="cogs" name="Cost (COGS)" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="profit" name="Gross Profit" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>

        {/* Best-Selling Products Ranking */}
        <Card
          title="Top Performing Products"
          subtitle="Ranked by sales volume & profit contribution"
        >
          {loading ? (
            <div className="h-72 rounded-lg bg-slate-100 animate-pulse" />
          ) : analyticsData.bestSelling.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-sm text-slate-400">
              No sales logged yet.
            </div>
          ) : (
            <div className="space-y-3.5 pt-1">
              {analyticsData.bestSelling.map((prod, idx) => (
                <div key={prod.product_id} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-900 truncate max-w-[140px]">
                      {idx + 1}. {prod.name}
                    </span>
                    <span className="font-mono font-bold text-brand-700">
                      ₹{formatINR(prod.revenue)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5 font-mono">
                    <span>Sold: {prod.quantitySold} units</span>
                    <span className={prod.profit >= 0 ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                      Profit: ₹{formatINR(prod.profit)} ({prod.margin}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Daily Revenue Trend & Product-wise Profit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Revenue Trend Chart */}
        <Card
          title="Daily Revenue Trend"
          subtitle="Sales performance day by day across selected period"
        >
          {loading ? (
            <div className="h-64 rounded-lg bg-slate-100 animate-pulse" />
          ) : analyticsData.dailyTrend.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-slate-400">
              No daily sales data for this date filter.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={analyticsData.dailyTrend}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatDisplayDate}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(val: number, name: string) => [`₹${formatINR(val)}`, name === 'revenue' ? 'Revenue' : 'Profit']}
                    labelFormatter={formatDisplayDate}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Daily Revenue"
                    stroke="#2563EB"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRev)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Product-wise Profit Breakdown */}
        <Card
          title="Product-wise Gross Profit"
          subtitle="Gross profit earned by individual product (Green = profit, Red = loss)"
        >
          {loading ? (
            <div className="h-64 rounded-lg bg-slate-100 animate-pulse" />
          ) : analyticsData.productBreakdown.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-slate-400">
              No product sales data available.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analyticsData.productBreakdown.slice(0, 8)}
                  margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(val: number, name: string) => [`₹${formatINR(val)}`, name]}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="profit" name="Gross Profit" radius={[4, 4, 0, 0]}>
                    {analyticsData.productBreakdown.slice(0, 8).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#10B981' : '#EF4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Section 5: Sales History Table */}
      <Card
        title="Sales Transaction History"
        subtitle="Complete record of fulfilled sales with FIFO inventory allocations"
        action={
          <div className="flex items-center gap-3">
            <div className="relative w-52 sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search product, sale #, cust..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-8 w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
              />
            </div>
            <div className="w-32">
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: 'ALL', label: 'All Status' },
                  { value: 'COMPLETED', label: 'Completed' },
                  { value: 'RETURNED', label: 'Returned' },
                  { value: 'CANCELLED', label: 'Cancelled' }
                ]}
              />
            </div>
          </div>
        }
      >
        <Table
          columns={columns}
          data={paginatedSales}
          keyExtractor={(row) => row.id}
          isLoading={loading}
          emptyTitle="No sales recorded"
          emptyText={
            searchQuery || statusFilter !== 'ALL' || dateFilter !== 'ALL'
              ? 'No transactions matched the selected filters.'
              : 'Click "Add Sale" to record your first sale transaction.'
          }
        />

        {/* Pagination Bar */}
        {tableFilteredSales.length > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
            <span>
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, tableFilteredSales.length)} of {tableFilteredSales.length} transactions
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="font-mono text-slate-700">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Add Sale Modal */}
      <AddSaleModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={() => loadData(true)}
        stockInfos={stockInfos}
      />

      {/* View Sale Modal */}
      <ViewSaleModal
        sale={selectedSaleToView}
        isOpen={Boolean(selectedSaleToView)}
        onClose={() => setSelectedSaleToView(null)}
        onEdit={(sale) => setSelectedSaleToEdit(sale)}
      />

      {/* Edit Sale Modal */}
      <EditSaleModal
        sale={selectedSaleToEdit}
        isOpen={Boolean(selectedSaleToEdit)}
        onClose={() => setSelectedSaleToEdit(null)}
        onSuccess={() => loadData(true)}
        stockInfos={stockInfos}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(saleToDelete)}
        title="Delete Sale Transaction"
        message={`Are you sure you want to delete Sale #${saleToDelete?.sale_number}? The sold quantity (${saleToDelete?.quantity} units) will be restored to available inventory stock and revenue will be adjusted.`}
        confirmText="Delete & Restore Stock"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setSaleToDelete(null)}
      />
    </div>
  );
};
