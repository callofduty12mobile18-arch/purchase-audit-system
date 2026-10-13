import React, { useEffect, useState } from 'react';
import { LineChart as ChartIcon, TrendingUp, Receipt, Package, Layers, BarChart3 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { Select } from '../components/ui/Select';
import { Table } from '../components/ui/Table';
import { StatCardSkeleton, CardSkeleton } from '../components/ui/LoadingSkeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { PurchaseInvoice, Product } from '../types';
import { dbService } from '../services/dbService';
import { getTodayIST, formatDisplayMonthYear, formatINR } from '../utils/dateUtils';

export const AnalyticsPage: React.FC = () => {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [timeFilter, setTimeFilter] = useState('ALL');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>('bar');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalyticsData();

    const handleFocusSync = () => {
      if (document.visibilityState === 'visible') {
        loadAnalyticsData(true);
      }
    };

    window.addEventListener('visibilitychange', handleFocusSync);
    window.addEventListener('focus', handleFocusSync);

    return () => {
      window.removeEventListener('visibilitychange', handleFocusSync);
      window.removeEventListener('focus', handleFocusSync);
    };
  }, []);

  const loadAnalyticsData = async (isBackgroundSync = false) => {
    if (!isBackgroundSync) {
      setLoading(true);
    }
    setFetchError(null);
    try {
      const invs = await dbService.getInvoices();
      const prods = await dbService.getProducts();
      setInvoices(invs);
      setProducts(prods);
    } catch (err: any) {
      if (!isBackgroundSync) {
        setFetchError(err.message || 'Failed to load procurement analytics.');
      }
    } finally {
      if (!isBackgroundSync) {
        setLoading(false);
      }
    }
  };

  const matchesDateFilter = (invoiceDate: string, filter: string) => {
    if (filter === 'ALL') return true;
    if (!invoiceDate) return false;
    const invDateStr = invoiceDate.slice(0, 10);
    const todayIST = getTodayIST();

    if (filter === 'THIS_MONTH') {
      return invDateStr.slice(0, 7) === todayIST.slice(0, 7);
    }
    if (filter === 'LAST_MONTH') {
      const today = new Date();
      const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthPrefix = getTodayIST(lastMonthDate).slice(0, 7);
      return invDateStr.slice(0, 7) === lastMonthPrefix;
    }
    if (filter === 'THIS_YEAR') {
      return invDateStr.slice(0, 4) === todayIST.slice(0, 4);
    }
    return true;
  };

  const filteredInvoices = invoices.filter(inv => matchesDateFilter(inv.invoice_date, timeFilter));

  // Spend calculations
  const totalSpend = filteredInvoices.reduce((sum, i) => sum + i.grand_total, 0);

  // Group by month for timeline chart
  const monthlyDataMap: Record<string, { month: string; spend: number; invoiceCount: number }> = {};
  filteredInvoices.forEach(inv => {
    const monthKey = inv.invoice_date.slice(0, 7); // YYYY-MM
    if (!monthlyDataMap[monthKey]) {
      monthlyDataMap[monthKey] = {
        month: monthKey,
        spend: 0,
        invoiceCount: 0
      };
    }
    monthlyDataMap[monthKey].spend += inv.grand_total;
    monthlyDataMap[monthKey].invoiceCount += 1;
  });

  const timelineData = Object.values(monthlyDataMap).sort((a, b) => a.month.localeCompare(b.month));

  // Breakdown by Product Alias
  const productSpendMap: Record<string, { nickname: string; spend: number; totalPacks: number }> = {};
  filteredInvoices.forEach(inv => {
    inv.items?.forEach(it => {
      const pName = it.product?.nickname || it.supplier_item_name_snapshot;
      if (!productSpendMap[pName]) {
        productSpendMap[pName] = { nickname: pName, spend: 0, totalPacks: 0 };
      }
      productSpendMap[pName].spend += it.total;
      productSpendMap[pName].totalPacks += Number(it.quantity) || 0;
    });
  });

  const productBreakdown = Object.values(productSpendMap).sort((a, b) => b.spend - a.spend);

  const COLORS = ['#4B49AC', '#7DA0FA', '#7978E9', '#F3797E', '#FFB64D', '#57B657'];

  const productTableColumns = [
    {
      header: 'Product Alias',
      cell: (row: { nickname: string; spend: number; totalPacks: number }) => (
        <span className="font-bold text-[#1F1F2C]">{row.nickname}</span>
      )
    },
    {
      header: 'Total Quantity',
      cell: (row: { nickname: string; spend: number; totalPacks: number }) => (
        <span className="font-mono text-xs text-[#1F1F2C] font-semibold">{row.totalPacks} Packs</span>
      )
    },
    {
      header: 'Total Spend (₹)',
      cell: (row: { nickname: string; spend: number; totalPacks: number }) => (
        <span className="font-mono text-xs font-bold text-[#4B49AC]">₹{formatINR(row.spend)}</span>
      )
    }
  ];

  if (fetchError) {
    return (
      <div className="py-8">
        <ErrorState
          title="Analytics Unavailable"
          message={fetchError}
          onRetry={loadAnalyticsData}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            <ChartIcon className="w-6 h-6 text-[#4B49AC]" />
            Procurement Analytics & Spend Intelligence
          </h1>
          <p className="page-subtitle">
            Aggregate procurement trends, SKU breakdown, and volume patterns
          </p>
        </div>

        <div className="w-48">
          <Select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Invoices' },
              { value: 'THIS_MONTH', label: 'This Month' },
              { value: 'LAST_MONTH', label: 'Last Month' },
              { value: 'THIS_YEAR', label: 'This Year' },
            ]}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              color="blue"
              title="Total Billed Spend"
              value={`₹${formatINR(totalSpend)}`}
              subtitle="Procurement total"
              icon={<Receipt className="w-5 h-5" />}
            />
            <StatCard
              color="purple"
              title="Recorded Invoices"
              value={filteredInvoices.length}
              subtitle="Total verified bills"
              icon={<TrendingUp className="w-5 h-5" />}
            />
            <StatCard
              color="coral"
              title="Active SKUs Purchased"
              value={productBreakdown.length}
              subtitle="Unique items ordered"
              icon={<Package className="w-5 h-5" />}
            />
          </>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spend Over Time Chart */}
        <div className="lg:col-span-2">
          <Card
            title="Procurement Spend Timeline"
            subtitle="Monthly billed amount distribution"
            action={
              <div className="flex items-center gap-1 bg-[#F5F7FF] p-1 rounded-xl border border-[#ECEEF5]">
                <button
                  type="button"
                  onClick={() => setChartType('bar')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                    chartType === 'bar'
                      ? 'bg-white text-[#4B49AC] shadow-xs font-bold'
                      : 'text-[#6C7383] hover:text-[#1F1F2C]'
                  }`}
                  title="Monthly Bar / Column Chart"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Bar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('line')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                    chartType === 'line'
                      ? 'bg-white text-[#4B49AC] shadow-xs font-bold'
                      : 'text-[#6C7383] hover:text-[#1F1F2C]'
                  }`}
                  title="Monthly Trend Line"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Line</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('area')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                    chartType === 'area'
                      ? 'bg-white text-[#4B49AC] shadow-xs font-bold'
                      : 'text-[#6C7383] hover:text-[#1F1F2C]'
                  }`}
                  title="Shaded Area Distribution"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Area</span>
                </button>
              </div>
            }
          >
            {loading ? (
              <div className="h-72 bg-[#F5F7FF] rounded-xl animate-pulse flex items-center justify-center">
                <span className="text-xs text-[#8F93A0] font-mono">Generating trend charts...</span>
              </div>
            ) : timelineData.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-xs text-[#8F93A0] font-mono">
                No historical invoice data available for this range.
              </div>
            ) : (
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'bar' ? (
                    <BarChart data={timelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="barSpendGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4B49AC" stopOpacity={1} />
                          <stop offset="100%" stopColor="#7978E9" stopOpacity={0.85} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ECEEF5" />
                      <XAxis
                        dataKey="month"
                        stroke="#8F93A0"
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: '#ECEEF5' }}
                        tickFormatter={(m) => formatDisplayMonthYear(m)}
                      />
                      <YAxis
                        stroke="#8F93A0"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white border border-[#ECEEF5] rounded-xl p-3 shadow-skydash text-xs space-y-1.5 min-w-[190px]">
                                <div className="flex items-center justify-between gap-3 border-b border-[#ECEEF5] pb-1.5">
                                  <span className="font-bold text-[#1F1F2C] text-xs">
                                    {formatDisplayMonthYear(label)}
                                  </span>
                                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-[#F0F3FF] text-[#4B49AC] border border-[#D5DCED]">
                                    {data.invoiceCount} {data.invoiceCount === 1 ? 'bill' : 'bills'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-2 pt-0.5">
                                  <span className="text-[#6C7383] text-[11px]">Billed Spend:</span>
                                  <span className="font-mono font-bold text-[#4B49AC] text-xs">
                                    ₹{formatINR(data.spend)}
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                        cursor={{ fill: 'rgba(75, 73, 172, 0.05)', radius: 8 }}
                      />
                      <Bar
                        dataKey="spend"
                        fill="url(#barSpendGradient)"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={56}
                      />
                    </BarChart>
                  ) : chartType === 'line' ? (
                    <LineChart data={timelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ECEEF5" />
                      <XAxis
                        dataKey="month"
                        stroke="#8F93A0"
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: '#ECEEF5' }}
                        tickFormatter={(m) => formatDisplayMonthYear(m)}
                      />
                      <YAxis
                        stroke="#8F93A0"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white border border-[#ECEEF5] rounded-xl p-3 shadow-skydash text-xs space-y-1.5 min-w-[190px]">
                                <div className="flex items-center justify-between gap-3 border-b border-[#ECEEF5] pb-1.5">
                                  <span className="font-bold text-[#1F1F2C] text-xs">
                                    {formatDisplayMonthYear(label)}
                                  </span>
                                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-[#F0F3FF] text-[#4B49AC] border border-[#D5DCED]">
                                    {data.invoiceCount} {data.invoiceCount === 1 ? 'bill' : 'bills'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-2 pt-0.5">
                                  <span className="text-[#6C7383] text-[11px]">Billed Spend:</span>
                                  <span className="font-mono font-bold text-[#4B49AC] text-xs">
                                    ₹{formatINR(data.spend)}
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="spend"
                        stroke="#4B49AC"
                        strokeWidth={3}
                        dot={{ r: 5, fill: '#4B49AC', strokeWidth: 2, stroke: '#FFFFFF' }}
                        activeDot={{ r: 7, fill: '#4B49AC', stroke: '#FFFFFF', strokeWidth: 2 }}
                      />
                    </LineChart>
                  ) : (
                    <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4B49AC" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#4B49AC" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ECEEF5" />
                      <XAxis
                        dataKey="month"
                        stroke="#8F93A0"
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: '#ECEEF5' }}
                        tickFormatter={(m) => formatDisplayMonthYear(m)}
                      />
                      <YAxis
                        stroke="#8F93A0"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white border border-[#ECEEF5] rounded-xl p-3 shadow-skydash text-xs space-y-1.5 min-w-[190px]">
                                <div className="flex items-center justify-between gap-3 border-b border-[#ECEEF5] pb-1.5">
                                  <span className="font-bold text-[#1F1F2C] text-xs">
                                    {formatDisplayMonthYear(label)}
                                  </span>
                                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-[#F0F3FF] text-[#4B49AC] border border-[#D5DCED]">
                                    {data.invoiceCount} {data.invoiceCount === 1 ? 'bill' : 'bills'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-2 pt-0.5">
                                  <span className="text-[#6C7383] text-[11px]">Billed Spend:</span>
                                  <span className="font-mono font-bold text-[#4B49AC] text-xs">
                                    ₹{formatINR(data.spend)}
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="spend"
                        stroke="#4B49AC"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#spendGradient)"
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>

        {/* SKU Category Breakdown Chart */}
        <Card
          title="Product Spend Share"
          subtitle="Top items by purchase volume"
        >
          {loading ? (
            <div className="h-72 bg-[#F5F7FF] rounded-xl animate-pulse flex items-center justify-center">
              <span className="text-xs text-[#8F93A0] font-mono">Calculating proportions...</span>
            </div>
          ) : productBreakdown.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-xs text-[#8F93A0] font-mono">
              No products ordered in this range.
            </div>
          ) : (
            <div className="h-72 w-full flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height="80%">
                <PieChart>
                  <Pie
                    data={productBreakdown.slice(0, 5)}
                    dataKey="spend"
                    nameKey="nickname"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {productBreakdown.slice(0, 5).map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => [`₹${formatINR(val)}`, 'Spend']}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#ECEEF5',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-2 text-[10px] text-[#6C7383] font-semibold mt-1">
                {productBreakdown.slice(0, 4).map((p, idx) => (
                  <div key={p.nickname} className="flex items-center gap-1">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="truncate max-w-[80px]">{p.nickname}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* SKU Table Breakdown */}
      <Card
        title="Product Procurement Breakdown"
        subtitle="Ranked summary of all purchased items and procurement expenditure"
      >
        <Table
          columns={productTableColumns}
          data={productBreakdown}
          keyExtractor={(row) => row.nickname}
          isLoading={loading}
          emptyVariant="products"
          emptyTitle="No Items in this Time Period"
          emptyText="There are no product purchases recorded for the selected time filter."
          skeletonRows={4}
        />
      </Card>
    </div>
  );
};
