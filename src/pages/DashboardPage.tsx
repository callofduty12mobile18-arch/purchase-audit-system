import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  Receipt,
  Package,
  TrendingUp,
  Building2,
} from 'lucide-react';
import { StatCard } from '../components/ui/StatCard';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { PurchaseInvoice, Product, PriceHistory } from '../types';
import { dbService } from '../services/dbService';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [dateFilter, setDateFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    const invs = await dbService.getInvoices();
    const prods = await dbService.getProducts();
    const history = await dbService.getPriceHistory();

    setInvoices(invs);
    setProducts(prods);
    setPriceHistory(history);
    setLoading(false);
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
  const totalGstPaid = visibleInvoices.reduce((sum, inv) => sum + inv.total_tax, 0);

  // Supplier calculation
  const supplierSpendMap: Record<string, { name: string; total: number }> = {};
  visibleInvoices.forEach(inv => {
    if (inv.supplier) {
      if (!supplierSpendMap[inv.supplier.id]) {
        supplierSpendMap[inv.supplier.id] = { name: inv.supplier.name, total: 0 };
      }
      supplierSpendMap[inv.supplier.id].total += inv.grand_total;
    }
  });

  const topSupplierEntry = Object.values(supplierSpendMap).sort((a, b) => b.total - a.total)[0];
  const topSupplierName = topSupplierEntry ? topSupplierEntry.name : 'N/A';

  // Recent 5 Invoices
  const recentInvoices = visibleInvoices.slice(0, 5);

  // Top Products
  const topProducts = products.slice(0, 5);

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
      header: 'Grand Total',
      cell: (row: PurchaseInvoice) => (
        <span className="font-mono font-bold text-[#1F1F2C] text-sm">₹{row.grand_total.toFixed(2)}</span>
      )
    },
    {
      header: 'Status',
      cell: (row: PurchaseInvoice) => (
        <Badge variant={row.verification_status === 'VERIFIED' ? 'success' : 'warning'}>
          {row.verification_status}
        </Badge>
      )
    }
  ];

  return (
    <div className="space-y-7">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="page-title">
            <LayoutDashboard className="w-6 h-6 text-[#4B49AC]" />
            Executive Audit Dashboard
          </h1>
          <p className="page-subtitle">
            Real-time procurement metrics, verified invoice tax breakdown & active price monitoring.
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

      {/* Metrics Row (Skydash 4 Vibrant Color Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          color="blue"
          title="Total Purchase Value"
          value={`₹${totalPurchaseValue.toFixed(2)}`}
          subtitle={`${visibleInvoices.length} verified bills`}
          change={visibleInvoices.length > 0 ? `${visibleInvoices.length} Bills` : undefined}
          changeType="positive"
          icon={<Receipt className="w-5 h-5" />}
        />
        <StatCard
          color="indigo"
          title="Total GST Tax Audited"
          value={`₹${totalGstPaid.toFixed(2)}`}
          subtitle="Input tax ledger"
          change="Audited"
          changeType="neutral"
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          color="purple"
          title="Top Supplier"
          value={topSupplierName}
          subtitle="Highest procurement volume"
          icon={<Building2 className="w-5 h-5" />}
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
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices Table Widget */}
        <div className="lg:col-span-2">
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
              isLoading={loading}
              emptyText="No invoices recorded yet. Click '+ New Purchase Invoice' to enter your first bill."
            />
          </Card>
        </div>

        {/* Right Column: Top Products & Recent Price Changes */}
        <div className="space-y-6">
          <Card
            title="Top Products by Alias"
            subtitle="Frequently purchased items"
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate('/products')} className="text-xs">
                Catalog
              </Button>
            }
          >
            <div className="space-y-2.5">
              {topProducts.length === 0 ? (
                <div className="text-[#8F93A0] text-xs py-6 text-center font-mono">No products cataloged yet</div>
              ) : (
                topProducts.map((prod, idx) => (
                  <div
                    key={prod.id}
                    onClick={() => navigate(`/products/${prod.id}`)}
                    className="p-3.5 rounded-xl bg-[#F5F7FF] hover:bg-[#EBEFFF] border border-[#ECEEF5] hover:border-[#98BDFF] flex items-center justify-between cursor-pointer transition-all duration-150 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-white border border-[#D5DCED] text-[#4B49AC] group-hover:bg-[#4B49AC] group-hover:text-white flex items-center justify-center font-mono text-[11px] font-bold shrink-0 shadow-xs transition-colors">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-[#1F1F2C] text-xs block truncate group-hover:text-[#4B49AC]">{prod.nickname}</span>
                        <span className="text-[11px] font-mono text-[#6C7383] block truncate">"{prod.supplier_item_name}"</span>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-[#4B49AC] shrink-0 ml-2 px-2.5 py-1 rounded-full bg-white border border-[#D5DCED] shadow-xs">
                      ₹{prod.current_purchase_ref_price.toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card
            title="Price Adjustments Audit"
            subtitle="Immutable rate change audit trail"
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate('/price-history')} className="text-xs">
                History
              </Button>
            }
          >
            <div className="space-y-2.5">
              {priceHistory.length === 0 ? (
                <div className="text-[#8F93A0] text-xs py-6 text-center font-mono">No price adjustments recorded yet</div>
              ) : (
                priceHistory.slice(0, 3).map((ph) => (
                  <div key={ph.id} className="p-3.5 rounded-xl bg-[#F5F7FF] border border-[#ECEEF5] text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#1F1F2C] font-mono">
                        ₹{ph.old_value.toFixed(2)} → <span className="text-[#4B49AC] underline">₹{ph.new_value.toFixed(2)}</span>
                      </span>
                      <span className="text-[10px] text-[#6C7383] font-mono px-2 py-0.5 rounded-full bg-white border border-[#ECEEF5]">
                        {ph.changed_at.split('T')[0]}
                      </span>
                    </div>
                    <p className="text-[#6C7383] text-[11px] italic truncate">"{ph.reason}"</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
