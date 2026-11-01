import React, { useEffect, useState } from 'react';
import {
  Plus, Minus, Trash2, FileDown, Wallet,
  RotateCcw, Sparkles, Search, Package,
  Building2, Layers, X,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Supplier, Product, PurchaseInvoice } from '../types';
import { dbService } from '../services/dbService';
import { formatINR } from '../utils/dateUtils';
import { generateOrderPdf } from '../utils/generateOrderPdf';
import { useToast } from '../context/ToastContext';

interface OrderPlanRow {
  product_id: string;
  product: Product;
  quantity: number;
  purchase_rate: number;
  rate_source: 'SUPPLIER_LAST' | 'MANUAL_REF' | 'USER_OVERRIDE';
  gst_rate: number;
  taxable_value: number;
  gst_amount: number;
  total: number;
}

type FilterTab = 'ALL' | 'ORDERED' | 'ZERO';

const inputCls =
  'h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 ' +
  'focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 transition-colors';

export const OrderPlannerPage: React.FC = () => {
  const { success: toastSuccess, error: toastError } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [planRows, setPlanRows] = useState<OrderPlanRow[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // ── Rate calculation (business logic preserved) ─────────────────────────────
  const calculateRateEstimate = (
    productId: string,
    supplierId: string,
    allProducts: Product[],
    allInvoices: PurchaseInvoice[]
  ) => {
    const product = allProducts.find((p) => p.id === productId);
    if (!product) return { rate: 0, defaultQty: 10, gstRate: 40, source: 'MANUAL_REF' as const };

    const sorted = [...allInvoices].sort(
      (a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime()
    );

    for (const inv of sorted) {
      if (inv.supplier_id === supplierId && inv.items) {
        const match = inv.items.find(
          (it) =>
            it.product_id === productId ||
            it.supplier_item_name_snapshot === product.supplier_item_name
        );
        if (match) {
          const rate =
            match.quantity > 0 ? match.total / match.quantity : match.purchase_rate;
          return {
            rate: Number(rate.toFixed(2)),
            defaultQty: match.quantity || 0,
            gstRate: match.gst_rate || 40,
            source: 'SUPPLIER_LAST' as const,
          };
        }
      }
    }

    return {
      rate: product.current_purchase_ref_price || 0,
      defaultQty: 0,
      gstRate: 40,
      source: 'MANUAL_REF' as const,
    };
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (selectedSupplierId && products.length > 0) {
      setPlanRows((prev) =>
        prev.map((row) => {
          if (row.rate_source === 'USER_OVERRIDE') return row;
          const { rate, source, gstRate } = calculateRateEstimate(
            row.product_id,
            selectedSupplierId,
            products,
            invoices
          );
          const divisor = 1 + gstRate / 100;
          const total = Number((row.quantity * rate).toFixed(2));
          const taxable = Number((total / divisor).toFixed(2));
          return {
            ...row,
            purchase_rate: rate,
            rate_source: source,
            gst_rate: gstRate,
            total,
            taxable_value: taxable,
            gst_amount: Number((total - taxable).toFixed(2)),
          };
        })
      );
    }
  }, [selectedSupplierId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sups, prods, invs] = await Promise.all([
        dbService.getSuppliers(),
        dbService.getProducts(),
        dbService.getInvoices(),
      ]);
      setSuppliers(sups);
      setProducts(prods);
      setInvoices(invs);
      const defaultSupp = sups[0]?.id || '';
      setSelectedSupplierId(defaultSupp);
      const rows: OrderPlanRow[] = prods.map((prod) => {
        const { rate, source, gstRate } = calculateRateEstimate(prod.id, defaultSupp, prods, invs);
        return {
          product_id: prod.id,
          product: prod,
          quantity: 0,
          purchase_rate: rate,
          rate_source: source,
          gst_rate: gstRate,
          taxable_value: 0,
          gst_amount: 0,
          total: 0,
        };
      });
      setPlanRows(rows);
    } finally {
      setLoading(false);
    }
  };

  // ── Quantity handlers ────────────────────────────────────────────────────────
  const updateQty = (productId: string, newQty: number) => {
    const qty = Math.max(0, Math.floor(newQty || 0));
    setPlanRows((prev) =>
      prev.map((row) => {
        if (row.product_id !== productId) return row;
        const total = Number((qty * row.purchase_rate).toFixed(2));
        const divisor = 1 + row.gst_rate / 100;
        const taxable = Number((total / divisor).toFixed(2));
        return { ...row, quantity: qty, total, taxable_value: taxable, gst_amount: Number((total - taxable).toFixed(2)) };
      })
    );
  };

  const addPreset = (productId: string, delta: number) => {
    const row = planRows.find((r) => r.product_id === productId);
    if (row) updateQty(productId, row.quantity + delta);
  };

  const handleLoadLastBill = () => {
    if (!invoices.length) return;
    const latest = invoices[0];
    if (!latest.items) return;
    setPlanRows((prev) =>
      prev.map((row) => {
        const match = latest.items?.find(
          (it) =>
            it.product_id === row.product_id ||
            it.supplier_item_name_snapshot === row.product.supplier_item_name
        );
        const qty = match ? Number(match.quantity) || 0 : 0;
        const total = Number((qty * row.purchase_rate).toFixed(2));
        const divisor = 1 + row.gst_rate / 100;
        const taxable = Number((total / divisor).toFixed(2));
        return { ...row, quantity: qty, total, taxable_value: taxable, gst_amount: Number((total - taxable).toFixed(2)) };
      })
    );
    toastSuccess('Quantities loaded', 'Replicated from latest confirmed bill.');
  };

  const handleResetAll = () => {
    setPlanRows((prev) =>
      prev.map((row) => ({ ...row, quantity: 0, total: 0, taxable_value: 0, gst_amount: 0 }))
    );
  };

  const handleSetAll10 = () => {
    setPlanRows((prev) =>
      prev.map((row) => {
        const qty = 10;
        const total = Number((qty * row.purchase_rate).toFixed(2));
        const divisor = 1 + row.gst_rate / 100;
        const taxable = Number((total / divisor).toFixed(2));
        return { ...row, quantity: qty, total, taxable_value: taxable, gst_amount: Number((total - taxable).toFixed(2)) };
      })
    );
    toastSuccess('Preset applied', 'All items set to 10 packs.');
  };

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);

  const filteredRows = planRows.filter((row) => {
    if (activeTab === 'ORDERED' && row.quantity === 0) return false;
    if (activeTab === 'ZERO' && row.quantity > 0) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      row.product.nickname.toLowerCase().includes(q) ||
      row.product.supplier_item_name.toLowerCase().includes(q) ||
      (row.product.hsn?.toLowerCase().includes(q) ?? false)
    );
  });

  const orderedItems = planRows.filter((r) => r.quantity > 0);
  const totalPacksOrdered = orderedItems.reduce((s, r) => s + r.quantity, 0);
  const totalTaxable = orderedItems.reduce((s, r) => s + r.taxable_value, 0);
  const totalGst = orderedItems.reduce((s, r) => s + r.gst_amount, 0);
  const rawGrandTotal = orderedItems.reduce((s, r) => s + r.total, 0);
  const grandTotalRounded = Math.round(rawGrandTotal);
  const uniqueGstRates = Array.from(new Set(orderedItems.map((r) => r.gst_rate)));
  const gstLabel = uniqueGstRates.length === 1 ? `GST (${uniqueGstRates[0]}%)` : 'GST';

  const handleDownloadPdf = () => {
    if (!orderedItems.length) return;
    setDownloadingPdf(true);
    try {
      generateOrderPdf({
        buyerName: 'RAMACHANDRAN',
        supplierName: selectedSupplier?.name || 'Distributor',
        supplierGstin: selectedSupplier?.gstin,
        lines: orderedItems.map((item) => ({
          nickname: item.product.nickname,
          supplierItemName: item.product.supplier_item_name,
          quantity: item.quantity,
          rate: item.purchase_rate,
          total: item.total,
        })),
        totalPacks: totalPacksOrdered,
        skuCount: orderedItems.length,
        taxable: totalTaxable,
        gst: totalGst,
        grandTotal: grandTotalRounded,
      });
      toastSuccess('PDF downloaded', 'Order estimate saved to your device.');
    } catch {
      toastError('Download failed', 'Could not generate the order PDF. Try again.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // ── Main planner view ────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-28 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Order planner</h1>
          <p className="page-subtitle">Configure pack quantities for distributor orders and compute GST totals.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {orderedItems.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleResetAll} icon={<RotateCcw className="h-3.5 w-3.5" />}>
              Clear
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            disabled={orderedItems.length === 0}
            onClick={handleDownloadPdf}
            isLoading={downloadingPdf}
            icon={<FileDown className="h-4 w-4" />}
          >
            Download Order PDF
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-card p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Supplier selector */}
          <div className="md:col-span-4">
            <label htmlFor="supplier-select" className="block text-xs font-medium text-slate-600 mb-1.5">
              Distributor
            </label>
            <div className="relative">
              <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" aria-hidden="true" />
              <select
                id="supplier-select"
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className={`${inputCls} pl-8 appearance-none`}
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}{s.gstin ? ` (${s.gstin})` : ''}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400" aria-hidden="true">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="md:col-span-4">
            <label htmlFor="product-search" className="block text-xs font-medium text-slate-600 mb-1.5">
              Search catalog
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" aria-hidden="true" />
              <input
                id="product-search"
                type="text"
                placeholder="Search by nickname, brand..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`${inputCls} pl-8`}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 rounded"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="md:col-span-4 flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadLastBill}
              className="flex-1 h-9 px-3 rounded-md bg-brand-50 border border-brand-200 text-brand-700 hover:bg-brand-100 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              title="Load quantities from most recent invoice"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Last bill
            </button>
            <button
              type="button"
              onClick={handleSetAll10}
              className="flex-1 h-9 px-3 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              title="Set all items to 10 packs"
            >
              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
              All ×10
            </button>
          </div>
        </div>

        {/* Filter tabs + count */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {(
              [
                { id: 'ALL',     label: 'All',         count: planRows.length },
                { id: 'ORDERED', label: 'In order',    count: orderedItems.length },
                { id: 'ZERO',    label: 'Not ordered', count: planRows.length - orderedItems.length },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={activeTab === tab.id}
                className={[
                  'shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5',
                  activeTab === tab.id
                    ? 'bg-brand-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900',
                ].join(' ')}
              >
                {tab.label}
                <span className={`text-xs font-mono px-1.5 rounded-full ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-white text-slate-500'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Showing <strong className="text-slate-900">{filteredRows.length}</strong> of {planRows.length} products
          </p>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Product cards */}
        <div className="lg:col-span-8">
          {loading ? (
            <div className="bg-white rounded-lg border border-slate-200 shadow-card p-12 text-center text-sm text-slate-400">
              Loading catalog...
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 shadow-card p-12 flex flex-col items-center gap-3 text-center">
              <Package className="h-8 w-8 text-slate-300" aria-hidden="true" />
              <p className="text-sm font-medium text-slate-700">No products found</p>
              {search && (
                <Button variant="outline" size="sm" onClick={() => setSearch('')}>Clear search</Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredRows.map((row) => {
                const isOrdered = row.quantity > 0;
                return (
                  <div
                    key={row.product_id}
                    className={[
                      'p-4 rounded-lg border transition-all duration-150',
                      isOrdered
                        ? 'bg-brand-50 border-brand-300 ring-1 ring-brand-200'
                        : 'bg-white border-slate-200 hover:border-slate-300',
                    ].join(' ')}
                  >
                    {/* Product info */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 truncate">{row.product.nickname}</p>
                        <p className="text-xs font-mono text-slate-400 truncate mt-0.5">"{row.product.supplier_item_name}"</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-mono font-semibold text-brand-700">₹{formatINR(row.purchase_rate)}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{row.rate_source === 'SUPPLIER_LAST' ? 'Last bill' : 'Ref rate'}</p>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="pt-3 border-t border-slate-200/80">
                      {row.quantity === 0 ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateQty(row.product_id, 10)}
                            className="flex-1 h-9 rounded-md bg-brand-50 border border-brand-200 text-brand-700 hover:bg-brand-700 hover:text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                            Add 10 packs
                          </button>
                          <button
                            type="button"
                            onClick={() => updateQty(row.product_id, 50)}
                            className="h-9 px-3 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors"
                            aria-label="Add 50 packs"
                          >
                            +50
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {/* Stepper row */}
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateQty(row.product_id, row.quantity - 1)}
                              aria-label="Decrease by 1"
                              className="w-9 h-9 rounded-md border border-slate-200 bg-white text-slate-600 hover:text-red-600 hover:border-red-300 flex items-center justify-center transition-colors"
                            >
                              <Minus className="h-4 w-4" />
                            </button>

                            <input
                              type="number"
                              min="0"
                              value={row.quantity}
                              onChange={(e) => updateQty(row.product_id, parseInt(e.target.value) || 0)}
                              onFocus={(e) => e.target.select()}
                              aria-label={`Quantity for ${row.product.nickname}`}
                              className="flex-1 h-9 px-2 text-center rounded-md font-mono font-semibold text-sm bg-white border-2 border-brand-500 text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                            />

                            <button
                              type="button"
                              onClick={() => updateQty(row.product_id, row.quantity + 1)}
                              aria-label="Increase by 1"
                              className="w-9 h-9 rounded-md bg-brand-700 text-white flex items-center justify-center hover:bg-brand-800 transition-colors"
                            >
                              <Plus className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => addPreset(row.product_id, 10)}
                              className="h-9 px-2.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600 hover:bg-brand-50 hover:text-brand-700 text-xs font-semibold transition-colors"
                              aria-label="Add 10 packs"
                            >
                              +10
                            </button>
                            <button
                              type="button"
                              onClick={() => addPreset(row.product_id, 50)}
                              className="h-9 px-2.5 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 text-xs font-semibold transition-colors"
                              aria-label="Add 50 packs"
                            >
                              +50
                            </button>
                            <button
                              type="button"
                              onClick={() => updateQty(row.product_id, 0)}
                              aria-label="Remove from order"
                              className="w-8 h-9 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Subtotal */}
                          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                            <span className="text-slate-500 font-mono">
                              {row.quantity} × ₹{formatINR(row.purchase_rate)}
                            </span>
                            <span className="font-mono font-semibold text-slate-900">₹{formatINR(row.total)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Desktop sticky cart */}
        <div className="hidden lg:block lg:col-span-4 sticky top-20 space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-brand-600" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Order estimate</p>
                  <p className="text-xs text-slate-500 truncate max-w-[160px]">
                    {selectedSupplier?.name || 'Agency'}
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-brand-50 text-brand-700 rounded-full border border-brand-200">
                {orderedItems.length} SKUs
              </span>
            </div>

            {/* Ordered items mini list */}
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {orderedItems.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  No items in order yet. Add packs above.
                </p>
              ) : (
                orderedItems.map((row) => (
                  <div key={row.product_id} className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-900 truncate">{row.product.nickname}</p>
                      <p className="text-xs font-mono text-slate-400">{row.quantity} packs</p>
                    </div>
                    <p className="text-xs font-mono font-semibold text-slate-900 shrink-0">₹{formatINR(row.total)}</p>
                  </div>
                ))
              )}
            </div>

            {/* Totals */}
            {orderedItems.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-1.5">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Taxable amount</span>
                  <span className="font-mono">₹{formatINR(totalTaxable)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{gstLabel}</span>
                  <span className="font-mono">₹{formatINR(totalGst)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold text-slate-900 pt-1.5 border-t border-slate-200">
                  <span>Grand total</span>
                  <span className="font-mono font-bold text-brand-700">₹{formatINR(grandTotalRounded)}</span>
                </div>
                <p className="text-xs text-slate-400 text-right font-mono">{totalPacksOrdered} packs total</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-2 pt-1">
              <Button
                variant="primary"
                size="sm"
                disabled={orderedItems.length === 0}
                onClick={handleDownloadPdf}
                isLoading={downloadingPdf}
                icon={<FileDown className="h-3.5 w-3.5" />}
                className="w-full justify-center"
              >
                Download Order PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky footer cart */}
      {orderedItems.length > 0 && (
        <div className="lg:hidden no-print fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-xl p-3 pb-safe z-30">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">
                {orderedItems.length} SKUs · {totalPacksOrdered} packs
              </p>
              <p className="text-base font-bold font-mono tabular-nums text-brand-700">
                ₹{formatINR(grandTotalRounded)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleDownloadPdf}
                isLoading={downloadingPdf}
                icon={<FileDown className="h-3.5 w-3.5" />}
              >
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
