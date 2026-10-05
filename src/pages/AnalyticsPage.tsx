import React, { useEffect, useState } from 'react';
import { LineChart as ChartIcon, TrendingUp, Receipt, Package, Layers, Calendar } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
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
import { PurchaseInvoice, Product } from '../types';
import { dbService } from '../services/dbService';

export const AnalyticsPage: React.FC = () => {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [timeFilter, setTimeFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    setLoading(true);
    const invs = await dbService.getInvoices();
    const prods = await dbService.getProducts();
    setInvoices(invs);
    setProducts(prods);
    setLoading(false);
  };

  const matchesDateFilter = (invoiceDate: string, filter: string) => {
    if (filter === 'ALL') return true;
    const d = new Date(invoiceDate);
    if (Number.isNaN(d.getTime())) return false;
    const now = new Date();

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

  const visibleInvoices = invoices.filter((inv) => matchesDateFilter(inv.invoice_date, timeFilter));

  const totalSpend = visibleInvoices.reduce((sum, i) => sum + i.grand_total, 0);
  const totalTax = visibleInvoices.reduce((sum, i) => sum + i.total_tax, 0);
  const invoiceCount = visibleInvoices.length;

  const monthlyMap: Record<string, { month: string; total: number; tax: number; count: number }> = {};
  visibleInvoices.forEach((inv) => {
    const d = new Date(inv.invoice_date);
    if (Number.isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    if (!monthlyMap[key]) monthlyMap[key] = { month: label, total: 0, tax: 0, count: 0 };
    monthlyMap[key].total += inv.grand_total;
    monthlyMap[key].tax += inv.total_tax;
    monthlyMap[key].count += 1;
  });
  const monthlyData = Object.keys(monthlyMap).sort().map((k) => monthlyMap[k]);

  // Supplier-wise spend data
  const supplierSpendMap: Record<string, number> = {};
  visibleInvoices.forEach(inv => {
    const sName = inv.supplier?.name || 'Other';
    supplierSpendMap[sName] = (supplierSpendMap[sName] || 0) + inv.grand_total;
  });

  const supplierPieData = Object.keys(supplierSpendMap).map(sName => ({
    name: sName,
    value: supplierSpendMap[sName]
  }));

  // Skydash Palette for Charts
  const SKYDASH_CHART_COLORS = ['#4B49AC', '#7DA0FA', '#7978E9', '#F3797E', '#98BDFF', '#6563D9'];

  // Product analytical summary table
  const productAnalyticsList = products.map(prod => {
    let totalQty = 0;
    let totalVal = 0;
    let invoiceOccurrences = 0;
    let lastRate = prod.current_purchase_ref_price;

    visibleInvoices.forEach(inv => {
      inv.items?.forEach(item => {
        if (item.product_id === prod.id || item.supplier_item_name_snapshot === prod.supplier_item_name) {
          totalQty += item.quantity;
          totalVal += item.total;
          invoiceOccurrences += 1;
          lastRate = item.purchase_rate;
        }
      });
    });

    const avgRate = totalQty > 0 ? totalVal / totalQty : prod.current_purchase_ref_price;

    return {
      id: prod.id,
      nickname: prod.nickname,
      supplier_item_name: prod.supplier_item_name,
      uom: prod.uom,
      totalQty,
      totalVal,
      avgRate,
      lastRate,
      invoiceOccurrences
    };
  });

  type ProductAnalyticsRow = (typeof productAnalyticsList)[number];

  const columns = [
    {
      header: 'Product Alias',
      cell: (row: ProductAnalyticsRow) => (
        <div>
          <span className="font-bold text-[#1F1F2C] block group-hover:text-[#4B49AC] transition-colors">{row.nickname}</span>
          <span className="text-[11px] font-mono text-[#6C7383]">"{row.supplier_item_name}"</span>
        </div>
      )
    },
    {
      header: 'Total Quantity',
      cell: (row: ProductAnalyticsRow) => (
        <span className="font-mono text-[#1F1F2C] font-semibold">
          {row.totalQty} <span className="text-[#6C7383] text-xs">{row.uom}</span>
        </span>
      )
    },
    {
      header: 'Total Spend (₹)',
      cell: (row: ProductAnalyticsRow) => (
        <span className="font-mono font-bold text-[#4B49AC] tracking-tight">₹{row.totalVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      )
    },
    {
      header: 'Avg Rate (₹)',
      cell: (row: ProductAnalyticsRow) => (
        <span className="font-mono text-[#1F1F2C]">₹{row.avgRate.toFixed(2)}</span>
      )
    },
    {
      header: 'Last Purchase Rate',
      cell: (row: ProductAnalyticsRow) => (
        <span className="font-mono font-bold text-[#1F1F2C]">₹{row.lastRate.toFixed(2)}</span>
      )
    },
    {
      header: 'Audit Invoices',
      cell: (row: ProductAnalyticsRow) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#4B49AC]/10 text-[#4B49AC] border border-[#4B49AC]/20">
          {row.invoiceOccurrences} bills
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            <ChartIcon className="w-6 h-6 text-[#4B49AC]" />
            Spending & Tax Analytics
          </h1>
          <p className="page-subtitle">Audit spend velocity, tax breakdown, and product rates</p>
        </div>

        <div className="w-full sm:w-60">
          <Select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'Lifetime All Data' },
              { value: 'THIS_MONTH', label: 'This Month' },
              { value: 'LAST_MONTH', label: 'Previous Month' },
              { value: 'THIS_YEAR', label: 'This Year' },
            ]}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          color="blue"
          title="Total Purchase Spend"
          value={`₹${totalSpend.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="All verified invoices"
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          color="indigo"
          title="Total GST Tax Paid"
          value={`₹${totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="CGST + SGST + IGST audited"
          icon={<Receipt className="w-5 h-5" />}
        />
        <StatCard
          color="purple"
          title="Processed Invoices"
          value={invoiceCount}
          subtitle="Immutable audit entries"
          icon={<ChartIcon className="w-5 h-5" />}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Trend Area Chart */}
        <div className="lg:col-span-8">
          <Card title="Monthly Purchase Velocity" subtitle="Subtotal vs Tax paid across billing cycles">
            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="totalColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4B49AC" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#4B49AC" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="taxColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7DA0FA" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#7DA0FA" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#6C7383" fontSize={12} tickLine={false} axisLine={{ stroke: '#ECEEF5' }} />
                  <YAxis stroke="#6C7383" fontSize={12} tickLine={false} axisLine={{ stroke: '#ECEEF5' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#ECEEF5',
                      borderRadius: '12px',
                      color: '#1F1F2C',
                      boxShadow: '0 10px 25px -5px rgba(75, 73, 172, 0.15)'
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="total" name="Total Spend (₹)" stroke="#4B49AC" strokeWidth={2.5} fillOpacity={1} fill="url(#totalColor)" />
                  <Area type="monotone" dataKey="tax" name="GST Tax (₹)" stroke="#7DA0FA" strokeWidth={2} fillOpacity={1} fill="url(#taxColor)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Supplier Distribution Donut Chart */}
        <div className="lg:col-span-4">
          <Card title="Supplier Distribution" subtitle="Share by vendor spend volume">
            <div className="h-72 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={supplierPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {supplierPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SKYDASH_CHART_COLORS[index % SKYDASH_CHART_COLORS.length]} stroke="#FFFFFF" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#ECEEF5',
                      borderRadius: '12px',
                      color: '#1F1F2C',
                      boxShadow: '0 10px 25px -5px rgba(75, 73, 172, 0.15)'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#6C7383' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      {/* Product Analytical Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[#1F1F2C] flex items-center gap-2">
            <Package className="w-5 h-5 text-[#4B49AC]" />
            Per-Product Volume & Rate Breakdown
          </h3>
          <span className="text-xs text-[#6C7383] font-mono">{productAnalyticsList.length} registered products</span>
        </div>
        <Table
          columns={columns}
          data={productAnalyticsList}
          keyExtractor={(row) => row.id}
          isLoading={loading}
        />
      </div>
    </div>
  );
};
