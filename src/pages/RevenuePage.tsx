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
  Percent,
  Sparkles,
  ArrowUpRight,
  Download
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
  Cell
} from 'recharts';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Table, TableColumn } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { CardSkeleton } from '../components/ui/LoadingSkeleton';
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
import { generateRevenuePdf } from '../utils/generateRevenuePdf';
import { useToast } from '../context/ToastContext';

interface RevenueKpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  valueColor?: string;
}

const RevenueKpiCard: React.FC<RevenueKpiCardProps> = ({
  title,
  value,
  icon,
  iconBg,
  iconColor,
  valueColor = 'text-slate-900'
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-card hover:shadow-card-hover transition-all duration-200 p-4 sm:p-5 flex flex-col justify-between">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 truncate">
          {title}
        </span>
        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
          {icon}
        </div>
      </div>

      {/* Primary Value */}
      <div className="mt-2.5 sm:mt-3 min-w-0">
        <p
          className={`text-xl sm:text-2xl lg:text-3xl font-bold font-mono tracking-tight tabular-nums truncate ${valueColor}`}
          title={String(value)}
        >
          {value}
        </p>
      </div>
    </div>
  );
};

const KpiCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between animate-pulse">
    <div className="flex items-center justify-between">
      <div className="h-3.5 bg-slate-200 rounded w-24" />
      <div className="w-9 h-9 bg-slate-200 rounded-lg" />
    </div>
    <div className="h-8 bg-slate-200 rounded w-36 mt-3" />
  </div>
);

// Human-friendly Indian currency formatter for chart axes (e.g. ₹32 L instead of ₹3200k)
const formatIndianAxis = (v: number): string => {
  if (v === 0) return '₹0';
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(1)} Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(1)} L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(0)} k`;
  return `${sign}₹${abs}`;
};

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

  // Modals
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [selectedSaleToView, setSelectedSaleToView] = useState<SaleTransaction | null>(null);
  const [selectedSaleToEdit, setSelectedSaleToEdit] = useState<SaleTransaction | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<SaleTransaction | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);
  const [chartViewMode, setChartViewMode] = useState<'comparison' | 'profit'>('comparison');

  const loadData = async (background = false) => {
    if (!background) setLoading(true);
    setFetchError(null);
    try {
      const { sales: fetchedSales, stockInfos: fetchedStocks } = await revenueService.getRevenuePageData(background);
      setSales(fetchedSales);
      setStockInfos(fetchedStocks);
    } catch (err: any) {
      if (!background) setFetchError(err.message || 'Failed to load revenue and sales data.');
    } finally {
      if (!background) setLoading(false);
    }
  };

  useEffect(() => {
    let lastLoaded = Date.now();
    loadData();
    const handleSync = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastLoaded > 15000) {
        lastLoaded = Date.now();
        loadData(true);
      }
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

  // Table filtered sales (search query)
  const tableFilteredSales = useMemo(() => {
    if (!searchQuery.trim()) return dateFilteredSales;
    const q = searchQuery.toLowerCase();
    return dateFilteredSales.filter(s => {
      const numMatch = s.sale_number.toLowerCase().includes(q);
      const prodMatch = (s.product?.nickname || '').toLowerCase().includes(q) ||
        (s.product?.supplier_item_name || '').toLowerCase().includes(q);
      const custMatch = (s.customer_name || '').toLowerCase().includes(q);
      return numMatch || prodMatch || custMatch;
    });
  }, [dateFilteredSales, searchQuery]);

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
      header: 'Product Name (A-Z)',
      className: 'min-w-[150px]',
      cell: (row) => (
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-xs font-semibold text-slate-900">
              {row.product?.nickname || 'Unknown Item'}
            </p>
            {row.rate_tier === 'NEW' && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 border border-blue-200">
                New
              </span>
            )}
            {row.rate_tier === 'OLD' && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                Old
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 font-mono truncate max-w-[180px]" title={row.product?.supplier_item_name}>
            {row.product?.supplier_item_name}
          </p>
        </div>
      )
    },
    {
      header: 'Total Quantity',
      headerClassName: 'text-right min-w-[95px]',
      className: 'text-right min-w-[95px]',
      cell: (row) => (
        <span className="text-xs font-mono font-semibold text-slate-900 tabular-nums">
          {row.quantity} <span className="text-[10px] text-slate-400 font-sans">{row.product?.uom || 'units'}</span>
        </span>
      )
    },
    {
      header: 'Unit Cost',
      headerClassName: 'text-right min-w-[90px]',
      className: 'text-right min-w-[90px]',
      cell: (row) => (
        <span className="text-xs font-mono text-slate-600 tabular-nums">
          ₹{formatINR(row.purchase_price)}
        </span>
      )
    },
    {
      header: 'Selling Price (Manual Entry)',
      headerClassName: 'text-right min-w-[130px]',
      className: 'text-right min-w-[130px]',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <span className="text-xs font-mono text-slate-400">₹</span>
          <input
            type="number"
            step="any"
            min="0"
            key={`${row.id}-${row.selling_price}`}
            defaultValue={row.selling_price || ''}
            placeholder="0.00"
            onBlur={async (e) => {
              const val = parseFloat(e.target.value) || 0;
              if (val !== row.selling_price) {
                try {
                  await revenueService.updateSellingPrice(row.id, val);
                  toastSuccess('Price Updated', `Selling price for ${row.product?.nickname || 'Item'} set to ₹${formatINR(val)}`);
                  loadData(true);
                } catch (err: any) {
                  toastError('Error', err.message);
                }
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="w-24 h-7 text-right text-xs font-mono font-semibold text-slate-900 bg-white border border-slate-200 hover:border-slate-300 focus:border-brand-600 focus:ring-1 focus:ring-brand-600 rounded px-1.5 transition-colors shadow-2xs"
            title="Click to enter/update selling price"
          />
        </div>
      )
    },
    {
      header: 'Total Purchase Amount',
      headerClassName: 'text-right min-w-[125px]',
      className: 'text-right min-w-[125px]',
      cell: (row) => (
        <span className="text-xs font-mono font-bold text-slate-800 tabular-nums">
          ₹{formatINR(row.total_cogs)}
        </span>
      )
    },
    {
      header: 'Total Revenue',
      headerClassName: 'text-right min-w-[110px]',
      className: 'text-right min-w-[110px]',
      cell: (row) => (
        <span className="text-xs font-mono font-bold text-brand-700 tabular-nums">
          ₹{formatINR(row.total_revenue)}
        </span>
      )
    },
    {
      header: 'Gross Profit',
      headerClassName: 'text-right min-w-[110px]',
      className: 'text-right min-w-[110px]',
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
    }
  ];

  const handleDownloadPdf = () => {
    try {
      setDownloadingPdf(true);
      const periodLabelMap: Partial<Record<RevenueDateFilter, string>> = {
        ALL: 'All Time',
        THIS_MONTH: `This Month (${formatDisplayMonthYear(new Date())})`,
        LAST_MONTH: 'Last Month',
        THIS_YEAR: `This Year (${new Date().getFullYear()})`,
        CUSTOM: customStart && customEnd ? `${customStart} to ${customEnd}` : 'Custom Range'
      };

      generateRevenuePdf({
        periodLabel: periodLabelMap[dateFilter] || 'All Time',
        totalPurchased: metrics.totalCogs,
        totalSold: metrics.totalRevenue,
        grossProfit: metrics.grossProfit,
        profitMargin: metrics.grossProfitMargin,
        items: tableFilteredSales
      });
      toastSuccess('PDF Downloaded', 'Revenue & Profit report generated successfully.');
    } catch (err: any) {
      toastError('Download Failed', err?.message || 'Could not generate report.');
    } finally {
      setDownloadingPdf(false);
    }
  };

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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="page-title text-xl sm:text-2xl">Revenue & Profit Analytics</h1>
          </div>
          <p className="page-subtitle mt-0.5 text-xs sm:text-sm text-slate-500">
            Track sales performance, cost of goods sold (COGS), gross margins, and inventory valuation in real time.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
          {/* Date Filter */}
          <div className="w-full sm:w-44">
            <Select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value as RevenueDateFilter);
                setCurrentPage(1);
              }}
              options={[
                { value: 'ALL', label: 'All Time' },
                { value: 'THIS_MONTH', label: 'This Month' },
                { value: 'LAST_MONTH', label: 'Last Month' },
                { value: 'THIS_YEAR', label: 'This Year' },
                { value: 'CUSTOM', label: 'Custom Range...' }
              ]}
            />
          </div>

          {/* Action Buttons Row */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
            {/* Download PDF Button */}
            <Button
              variant="secondary"
              onClick={handleDownloadPdf}
              isLoading={downloadingPdf}
              icon={<Download className="h-4 w-4 shrink-0" />}
              className="justify-center w-full sm:w-auto text-xs px-2 sm:px-4 min-h-[38px]"
              title="Download Revenue & Profit Report as PDF"
            >
              Download PDF
            </Button>

            {/* Add Sale Button */}
            <Button
              variant="primary"
              onClick={() => setIsAddOpen(true)}
              icon={<Plus className="h-4 w-4 shrink-0" />}
              className="justify-center w-full sm:w-auto text-xs px-2 sm:px-4 min-h-[38px]"
            >
              Add Sale
            </Button>
          </div>
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

      {/* Section 2: Summary Dashboard Cards (Simple 3 Cards: How much I Purchased, How much I Sold, What is my Profit) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {loading ? (
          <>
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
          </>
        ) : (
          <>
            {/* 1. How Much I Purchased */}
            <RevenueKpiCard
              title="Total Purchased"
              value={`₹${formatINR(metrics.totalCogs)}`}
              icon={<Boxes className="h-5 w-5" />}
              iconBg="bg-amber-50"
              iconColor="text-amber-700"
              valueColor="text-slate-900"
            />

            {/* 2. How Much I Sold */}
            <RevenueKpiCard
              title="Total Sold"
              value={`₹${formatINR(metrics.totalRevenue)}`}
              icon={<DollarSign className="h-5 w-5" />}
              iconBg="bg-blue-50"
              iconColor="text-blue-700"
              valueColor="text-blue-700"
            />

            {/* 3. What Is My Profit */}
            <RevenueKpiCard
              title="My Profit"
              value={`${metrics.grossProfit >= 0 ? '+' : '-'} ₹${formatINR(Math.abs(metrics.grossProfit))}`}
              icon={metrics.grossProfit >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              iconBg={metrics.grossProfit >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}
              iconColor={metrics.grossProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}
              valueColor={metrics.grossProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}
            />
          </>
        )}
      </div>

      {/* Section 4: Analytics and Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Purchased vs Sold / Profit */}
        <div className="lg:col-span-2">
          <Card
            title={chartViewMode === 'comparison' ? 'Monthly Purchased vs Sold' : 'Monthly Profit Earned'}
            subtitle={
              chartViewMode === 'comparison'
                ? 'Compare what you bought against what you sold. When the Blue bar is higher than Orange, you made profit.'
                : 'Net profit earned each month (Total Sold minus Total Purchased)'
            }
            action={
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setChartViewMode('comparison')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    chartViewMode === 'comparison'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Purchased vs Sold
                </button>
                <button
                  type="button"
                  onClick={() => setChartViewMode('profit')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    chartViewMode === 'profit'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  My Profit Only
                </button>
              </div>
            }
          >
            {loading ? (
              <div className="h-72 rounded-lg bg-slate-100 animate-pulse" />
            ) : analyticsData.monthlyTimeline.length === 0 ? (
              <div className="h-72 flex flex-col items-center justify-center text-center p-6 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-3">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-semibold text-slate-800 mb-1">No sales recorded for this period</h4>
                <p className="text-xs text-slate-500 max-w-sm mb-4">
                  Record customer sales to see your monthly revenue trends, inventory cost, and profit margins.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAddOpen(true)}
                  icon={<Plus className="h-3.5 w-3.5" />}
                >
                  Record First Sale
                </Button>
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analyticsData.monthlyTimeline}
                    margin={{ top: 12, right: 10, left: -10, bottom: 0 }}
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
                      fontSize={10}
                      width={48}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={formatIndianAxis}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || !payload.length) return null;
                        const d = payload[0].payload;
                        const isProf = d.profit >= 0;
                        return (
                          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-lg text-xs space-y-1.5 min-w-[200px]">
                            <p className="font-bold text-slate-800 border-b border-slate-100 pb-1 text-xs">
                              {formatDisplayMonthYear(label)}
                            </p>
                            <div className="flex items-center justify-between text-slate-600">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                Total Purchased:
                              </span>
                              <span className="font-mono font-bold text-slate-900">₹{formatINR(d.cogs)}</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-600">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                                Total Sold:
                              </span>
                              <span className="font-mono font-bold text-blue-700">₹{formatINR(d.revenue)}</span>
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                              <span className="font-semibold text-slate-700">My Profit:</span>
                              <span className={`font-mono font-bold ${isProf ? 'text-emerald-700' : 'text-rose-700'}`}>
                                {isProf ? '+' : ''}₹{formatINR(d.profit)} ({d.margin}%)
                              </span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                    {chartViewMode === 'comparison' ? (
                      <>
                        <Bar dataKey="cogs" name="Total Purchased" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={36} />
                        <Bar dataKey="revenue" name="Total Sold" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={36} />
                      </>
                    ) : (
                      <Bar dataKey="profit" name="My Profit" radius={[4, 4, 0, 0]} maxBarSize={48}>
                        {analyticsData.monthlyTimeline.map((entry, index) => (
                          <Cell key={`profit-cell-${index}`} fill={entry.profit >= 0 ? '#10B981' : '#EF4444'} />
                        ))}
                      </Bar>
                    )}
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
            <div className="h-72 flex flex-col items-center justify-center text-center p-6 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
              <div className="w-12 h-12 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 mb-3">
                <Package className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800 mb-1">No product sales yet</h4>
              <p className="text-xs text-slate-500 max-w-xs">
                Products will appear here ranked by sales volume and profitability once transactions are logged.
              </p>
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

      {/* Product-wise Profit Breakdown */}
      <Card
        title="Product-wise Gross Profit"
        subtitle="Gross profit earned by individual product (Green = profit, Red = loss)"
      >
        {loading ? (
          <div className="h-64 rounded-lg bg-slate-100 animate-pulse" />
        ) : analyticsData.productBreakdown.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
            <Boxes className="h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-700">No product profit data available</p>
            <p className="text-xs text-slate-400 mt-1">Product profitability will render here as sales are made.</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <div className="h-64 min-w-[540px] sm:min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analyticsData.productBreakdown.slice(0, 12)}
                  margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
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
                    fontSize={10}
                    width={46}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatIndianAxis}
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
                    {analyticsData.productBreakdown.slice(0, 12).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#10B981' : '#EF4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </Card>

      {/* Section 5: Sales History Table */}
      <Card
        title="Sales Transaction History"
        subtitle="Product catalog items in alphabetical order with total purchase amounts, quantities, and editable selling prices"
        action={
          <div className="relative w-full sm:w-72 lg:w-80">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search product name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
            />
          </div>
        }
      >
        <Table
          columns={columns}
          data={paginatedSales}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => setSelectedSaleToView(row)}
          isLoading={loading}
          emptyTitle="No items found"
          emptyText={
            searchQuery || dateFilter !== 'ALL'
              ? 'No items matched the selected filters.'
              : 'Click "Add Sale" to record your first sale transaction.'
          }
        />

        {/* Pagination Bar */}
        {tableFilteredSales.length > pageSize && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
            <span className="text-center sm:text-left">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, tableFilteredSales.length)} of {tableFilteredSales.length} items
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
