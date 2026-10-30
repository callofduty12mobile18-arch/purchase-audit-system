import React, { useEffect, useState } from 'react';
import { LineChart as LineChartIcon, TrendingUp, Receipt, Package, BarChart3, Layers } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
  CartesianGrid, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend,
} from 'recharts';
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { Select } from '../components/ui/Select';
import { Table, TableColumn } from '../components/ui/Table';
import { StatCardSkeleton, CardSkeleton } from '../components/ui/LoadingSkeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { PurchaseInvoice, Product } from '../types';
import { dbService } from '../services/dbService';
import { getTodayIST, formatDisplayMonthYear, formatINR } from '../utils/dateUtils';
import { Button } from '../components/ui/Button';

type ChartType = 'bar' | 'line' | 'area';

const COLORS = ['#2563EB', '#7C3AED', '#16A34A', '#D97706', '#DC2626', '#0891B2'];

export const AnalyticsPage: React.FC = () => {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [timeFilter, setTimeFilter] = useState('ALL');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadData = async (background = false) => {
    if (!background) setLoading(true);
    setFetchError(null);
    try {
      const [invs, prods] = await Promise.all([dbService.getInvoices(), dbService.getProducts()]);
      setInvoices(invs); setProducts(prods);
    } catch (err: unknown) {
      if (!background) setFetchError(err instanceof Error ? err.message : 'Failed to load analytics.');
    } finally { if (!background) setLoading(false); }
  };

  useEffect(() => {
    loadData();
    const sync = () => { if (document.visibilityState === 'visible') loadData(true); };
    window.addEventListener('visibilitychange', sync); window.addEventListener('focus', sync);
    return () => { window.removeEventListener('visibilitychange', sync); window.removeEventListener('focus', sync); };
  }, []);

  const matchDate = (d: string, f: string) => {
    if (f === 'ALL' || !d) return f === 'ALL';
    const s = d.slice(0, 10); const today = getTodayIST();
    if (f === 'THIS_MONTH') return s.slice(0, 7) === today.slice(0, 7);
    if (f === 'LAST_MONTH') { const l = new Date(); l.setDate(1); l.setMonth(l.getMonth() - 1); return s.slice(0, 7) === getTodayIST(l).slice(0, 7); }
    if (f === 'THIS_YEAR') return s.slice(0, 4) === today.slice(0, 4);
    return true;
  };

  const filteredInvoices = invoices.filter((i) => matchDate(i.invoice_date, timeFilter));
  const totalSpend = filteredInvoices.reduce((s, i) => s + i.grand_total, 0);

  // Monthly timeline
  const monthlyMap: Record<string, { month: string; spend: number; invoiceCount: number }> = {};
  filteredInvoices.forEach((inv) => {
    const key = inv.invoice_date.slice(0, 7);
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, spend: 0, invoiceCount: 0 };
    monthlyMap[key].spend += inv.grand_total;
    monthlyMap[key].invoiceCount++;
  });
  const timelineData = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));

  // Product breakdown
  const productMap: Record<string, { nickname: string; spend: number; totalPacks: number }> = {};
  filteredInvoices.forEach((inv) => {
    inv.items?.forEach((it) => {
      const name = it.product?.nickname || it.supplier_item_name_snapshot;
      if (!productMap[name]) productMap[name] = { nickname: name, spend: 0, totalPacks: 0 };
      productMap[name].spend += it.total;
      productMap[name].totalPacks += Number(it.quantity) || 0;
    });
  });
  const productBreakdown = Object.values(productMap).sort((a, b) => b.spend - a.spend);

  const tooltipStyle = { backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' };

  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-dropdown text-xs min-w-[160px]">
        <p className="font-semibold text-slate-900 mb-1.5">{formatDisplayMonthYear(label)}</p>
        <div className="flex justify-between gap-3">
          <span className="text-slate-500">Spend</span>
          <span className="font-mono font-semibold text-brand-700">₹{formatINR(d.spend)}</span>
        </div>
        <div className="flex justify-between gap-3 mt-0.5">
          <span className="text-slate-500">Invoices</span>
          <span className="font-mono text-slate-700">{d.invoiceCount}</span>
        </div>
      </div>
    );
  };

  type ProductRow = { nickname: string; spend: number; totalPacks: number };

  const productColumns: TableColumn<ProductRow>[] = [
    { header: 'Product', cell: (row) => <span className="text-sm font-medium text-slate-900">{row.nickname}</span> },
    {
      header: 'Total packs',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (row) => <span className="text-sm font-mono text-slate-600 tabular-nums">{row.totalPacks}</span>,
    },
    {
      header: 'Total spend',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (row) => <span className="text-sm font-mono font-semibold text-brand-700 tabular-nums">₹{formatINR(row.spend)}</span>,
    },
  ];

  if (fetchError) return <ErrorState title="Analytics unavailable" message={fetchError} onRetry={() => loadData()} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Procurement spend trends, SKU breakdown, and volume patterns.</p>
        </div>
        <div className="w-44">
          <Select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            options={[
              { value: 'ALL',        label: 'All invoices' },
              { value: 'THIS_MONTH', label: 'This month' },
              { value: 'LAST_MONTH', label: 'Last month' },
              { value: 'THIS_YEAR',  label: 'This year' },
            ]}
          />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loading ? (
          <><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /></>
        ) : (
          <>
            <StatCard color="blue" title="Total billed spend" value={`₹${formatINR(totalSpend)}`} subtitle="Procurement total" icon={<Receipt className="h-5 w-5" />} />
            <StatCard color="violet" title="Recorded invoices" value={filteredInvoices.length} subtitle="Verified bills" icon={<TrendingUp className="h-5 w-5" />} />
            <StatCard color="green" title="Active SKUs purchased" value={productBreakdown.length} subtitle="Unique products ordered" icon={<Package className="h-5 w-5" />} />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline chart */}
        <div className="lg:col-span-2">
          <Card
            title="Procurement spend timeline"
            subtitle="Monthly billed amount"
            action={
              <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg">
                {([['bar', BarChart3, 'Bar'], ['line', TrendingUp, 'Line'], ['area', Layers, 'Area']] as [ChartType, React.ElementType, string][]).map(([type, Icon, label]) => (
                  <Button
                    key={type}
                    variant="ghost"
                    size="sm"
                    onClick={() => setChartType(type)}
                    icon={<Icon className="h-3.5 w-3.5" />}
                    className={[
                      '!min-h-[32px] !h-8 px-2.5 text-xs rounded-md transition-all',
                      chartType === type ? '!bg-white !text-brand-700 shadow-sm font-semibold' : '!text-slate-500 hover:!text-slate-700',
                    ].join(' ')}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            }
          >
            {loading ? (
              <div className="h-64 rounded-lg bg-slate-100 animate-pulse" />
            ) : timelineData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-slate-400">
                No invoice data for this period.
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'bar' ? (
                    <BarChart data={timelineData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatDisplayMonthYear} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={renderTooltip} cursor={{ fill: '#f8fafc' }} />
                      <Bar dataKey="spend" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={48} />
                    </BarChart>
                  ) : chartType === 'line' ? (
                    <LineChart data={timelineData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatDisplayMonthYear} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={renderTooltip} />
                      <Line type="monotone" dataKey="spend" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 4, fill: '#2563EB', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  ) : (
                    <AreaChart data={timelineData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563EB" stopOpacity={0.18} />
                          <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatDisplayMonthYear} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={renderTooltip} />
                      <Area type="monotone" dataKey="spend" stroke="#2563EB" strokeWidth={2.5} fill="url(#spendGrad)" />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>

        {/* Pie chart */}
        <Card title="Product spend share" subtitle="Top products by purchase volume">
          {loading ? (
            <div className="h-64 rounded-lg bg-slate-100 animate-pulse" />
          ) : productBreakdown.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-slate-400">
              No products in this period.
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center">
              <ResponsiveContainer width="100%" height="80%">
                <PieChart>
                  <Pie
                    data={productBreakdown.slice(0, 6)}
                    dataKey="spend"
                    nameKey="nickname"
                    cx="50%" cy="50%"
                    innerRadius={45} outerRadius={70}
                    paddingAngle={2}
                  >
                    {productBreakdown.slice(0, 6).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [`₹${formatINR(v)}`, 'Spend']}
                    contentStyle={tooltipStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1">
                {productBreakdown.slice(0, 4).map((p, i) => (
                  <div key={p.nickname} className="flex items-center gap-1 text-xs text-slate-600">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="truncate max-w-[80px]">{p.nickname}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* SKU table */}
      <Card title="Product procurement breakdown" subtitle="Ranked summary of all purchased items and expenditure">
        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4].map((i) => <div key={i} className="skeleton h-10 rounded" />)}
          </div>
        ) : (
          <Table
            columns={productColumns}
            data={productBreakdown}
            keyExtractor={(row) => row.nickname}
            isLoading={false}
            emptyTitle="No products in this period"
            emptyText="No purchases recorded for the selected time filter."
            skeletonRows={4}
          />
        )}
      </Card>
    </div>
  );
};
