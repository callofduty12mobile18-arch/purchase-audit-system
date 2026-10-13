import React, { useEffect, useState } from 'react';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Printer,
  FileDown,
  Wallet,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Search,
  CheckCircle2,
  Package,
  Building2,
  Calendar,
  Layers,
  Check,
  X,
  Copy,
  ChevronRight
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Supplier, Product, PurchaseInvoice } from '../types';
import { dbService } from '../services/dbService';
import { getTodayIST, formatDisplayDate, formatISTTimestamp, formatINR } from '../utils/dateUtils';
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

export const OrderPlannerPage: React.FC = () => {
  const { success: toastSuccess } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [planRows, setPlanRows] = useState<OrderPlanRow[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [isProformaMode, setIsProformaMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  // Recalculate rate estimates when supplier changes
  useEffect(() => {
    if (selectedSupplierId && products.length > 0) {
      setPlanRows(prev =>
        prev.map(row => {
          if (row.rate_source === 'USER_OVERRIDE') return row;
          const { rate, source, gstRate } = calculateRateEstimate(row.product_id, selectedSupplierId, products, invoices);
          const divisor = 1 + (gstRate / 100);
          const total = Number((row.quantity * rate).toFixed(2));
          const taxable = Number((total / divisor).toFixed(2));
          return {
            ...row,
            purchase_rate: rate,
            rate_source: source,
            gst_rate: gstRate,
            total,
            taxable_value: taxable,
            gst_amount: Number((total - taxable).toFixed(2))
          };
        })
      );
    }
  }, [selectedSupplierId]);

  const calculateRateEstimate = (
    productId: string,
    supplierId: string,
    allProducts: Product[],
    allInvoices: PurchaseInvoice[]
  ) => {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return { rate: 0, defaultQty: 10, gstRate: 40, source: 'MANUAL_REF' as const };

    let supplierLastRate: number | null = null;
    let lastQty: number | null = null;
    let lastGstRate: number | null = null;

    const sortedInvoices = [...allInvoices].sort(
      (a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime()
    );

    for (const inv of sortedInvoices) {
      if (inv.supplier_id === supplierId && inv.items) {
        const matchingItem = inv.items.find(
          item => item.product_id === productId || item.supplier_item_name_snapshot === product.supplier_item_name
        );
        if (matchingItem) {
          supplierLastRate = matchingItem.quantity > 0 ? (matchingItem.total / matchingItem.quantity) : matchingItem.purchase_rate;
          lastQty = matchingItem.quantity;
          lastGstRate = matchingItem.gst_rate;
          break;
        }
      }
    }

    if (supplierLastRate !== null) {
      return {
        rate: Number(supplierLastRate.toFixed(2)),
        defaultQty: lastQty || 0,
        gstRate: lastGstRate || 40,
        source: 'SUPPLIER_LAST' as const
      };
    }

    return {
      rate: product.current_purchase_ref_price || 0,
      defaultQty: 0,
      gstRate: 40,
      source: 'MANUAL_REF' as const
    };
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [sups, prods, invs] = await Promise.all([
        dbService.getSuppliers(),
        dbService.getProducts(),
        dbService.getInvoices()
      ]);

      setSuppliers(sups);
      setProducts(prods);
      setInvoices(invs);

      const defaultSupplier = sups[0]?.id || '';
      setSelectedSupplierId(defaultSupplier);

      // Initialize plan rows for all catalog products
      const rows: OrderPlanRow[] = prods.map(prod => {
        const { rate, source, gstRate } = calculateRateEstimate(prod.id, defaultSupplier, prods, invs);
        return {
          product_id: prod.id,
          product: prod,
          quantity: 0,
          purchase_rate: rate,
          rate_source: source,
          gst_rate: gstRate,
          taxable_value: 0,
          gst_amount: 0,
          total: 0
        };
      });

      setPlanRows(rows);
    } finally {
      setLoading(false);
    }
  };

  // Update pack quantity for a product row
  const handleUpdateQuantity = (productId: string, newQty: number) => {
    const qty = Math.max(0, Math.floor(newQty || 0));
    setPlanRows(prev =>
      prev.map(row => {
        if (row.product_id !== productId) return row;
        const total = Number((qty * row.purchase_rate).toFixed(2));
        const divisor = 1 + (row.gst_rate / 100);
        const taxable = Number((total / divisor).toFixed(2));
        return {
          ...row,
          quantity: qty,
          total,
          taxable_value: taxable,
          gst_amount: Number((total - taxable).toFixed(2))
        };
      })
    );
  };

  // Quick preset adder (e.g. +10, +50, -10)
  const handleAddPreset = (productId: string, delta: number) => {
    const row = planRows.find(r => r.product_id === productId);
    if (row) {
      handleUpdateQuantity(productId, row.quantity + delta);
    }
  };

  // Quick action: Load quantities from the latest confirmed bill
  const handleLoadLastBillQuantities = () => {
    if (invoices.length === 0) return;
    const latest = invoices[0];
    if (!latest.items) return;

    setPlanRows(prev =>
      prev.map(row => {
        const matchingItem = latest.items?.find(
          it => it.product_id === row.product_id || it.supplier_item_name_snapshot === row.product.supplier_item_name
        );
        const qty = matchingItem ? Number(matchingItem.quantity) || 0 : 0;
        const total = Number((qty * row.purchase_rate).toFixed(2));
        const divisor = 1 + (row.gst_rate / 100);
        const taxable = Number((total / divisor).toFixed(2));
        return {
          ...row,
          quantity: qty,
          total,
          taxable_value: taxable,
          gst_amount: Number((total - taxable).toFixed(2))
        };
      })
    );
    toastSuccess('Quantities Loaded', 'Replicated pack quantities from latest confirmed bill');
  };

  // Quick action: Reset all quantities to 0
  const handleResetAll = () => {
    setPlanRows(prev =>
      prev.map(row => ({
        ...row,
        quantity: 0,
        total: 0,
        taxable_value: 0,
        gst_amount: 0
      }))
    );
  };

  // Quick action: Set all items to 10 packs
  const handleSetAllDefault = () => {
    setPlanRows(prev =>
      prev.map(row => {
        const qty = 10;
        const total = Number((qty * row.purchase_rate).toFixed(2));
        const divisor = 1 + (row.gst_rate / 100);
        const taxable = Number((total / divisor).toFixed(2));
        return {
          ...row,
          quantity: qty,
          total,
          taxable_value: taxable,
          gst_amount: Number((total - taxable).toFixed(2))
        };
      })
    );
    toastSuccess('Preset Applied', 'All catalog items updated to 10 packs');
  };

  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);

  // Filtered rows for display
  const filteredRows = planRows.filter(row => {
    if (activeTab === 'ORDERED' && row.quantity === 0) return false;
    if (activeTab === 'ZERO' && row.quantity > 0) return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      row.product.nickname.toLowerCase().includes(q) ||
      row.product.supplier_item_name.toLowerCase().includes(q) ||
      (row.product.hsn && row.product.hsn.toLowerCase().includes(q))
    );
  });

  // Active items included in final order (quantity > 0)
  const orderedItems = planRows.filter(r => r.quantity > 0);
  const totalPacksOrdered = orderedItems.reduce((sum, r) => sum + r.quantity, 0);
  const totalTaxable = orderedItems.reduce((sum, r) => sum + r.taxable_value, 0);
  const totalGst = orderedItems.reduce((sum, r) => sum + r.gst_amount, 0);
  const rawGrandTotal = orderedItems.reduce((sum, r) => sum + r.total, 0);
  const grandTotalRounded = Math.round(rawGrandTotal);

  const handleCopyWhatsApp = () => {
    if (orderedItems.length === 0) return;
    const lines = [
      `*ORDER TO: ${selectedSupplier?.name || 'DISTRIBUTOR AGENCY'}*`,
      `*Date:* ${formatDisplayDate(new Date())}`,
      `--------------------------------`,
      ...orderedItems.map((item, idx) => `${idx + 1}. *${item.product.nickname}* — ${item.quantity} Packs (@ ₹${formatINR(item.purchase_rate)}) = ₹${formatINR(item.total)}`),
      `--------------------------------`,
      `*Total Volume:* ${totalPacksOrdered} Packs (${orderedItems.length} SKUs)`,
      `*Estimated Amount:* ₹${formatINR(grandTotalRounded)} (Incl. 40% GST)`
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    toastSuccess('Order Copied!', 'Formatted WhatsApp order copied to clipboard');
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    const supplierClean = selectedSupplier?.name ? selectedSupplier.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Ayyappa_Enterprises';
    const dateStr = getTodayIST();
    document.title = `Wholesale_Order_Estimate_${supplierClean}_${dateStr}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1200);
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-28 md:pb-12">
      {/* Top Header Banner */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2.5 text-xl sm:text-2xl font-black text-[#1F1F2C]">
            <ShoppingCart className="w-6 h-6 text-[#4B49AC]" />
            Wholesale Order Planner
          </h1>
          <p className="page-subtitle text-xs sm:text-sm text-[#6C7383] mt-0.5">
            Configure pack quantities for distributor agency orders and compute landed GST totals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isProformaMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsProformaMode(false)}
                icon={<ArrowLeft className="w-4 h-4" />}
                className="text-xs"
              >
                Back to Edit
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handlePrint}
                icon={<Printer className="w-4 h-4" />}
                className="text-xs shadow-md shadow-[#4B49AC]/20"
              >
                Save PDF / Print
              </Button>
            </>
          ) : (
            <>
              {orderedItems.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetAll}
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                  className="text-xs"
                >
                  Clear (0)
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                disabled={orderedItems.length === 0}
                onClick={() => setIsProformaMode(true)}
                icon={<FileDown className="w-4 h-4" />}
                className="text-xs shadow-md shadow-[#4B49AC]/20 font-bold"
              >
                Generate PO ({orderedItems.length})
              </Button>
            </>
          )}
        </div>
      </div>

      {!isProformaMode ? (
        <div className="no-print space-y-4">
          {/* Agency & Control Bar */}
          <div className="p-3.5 sm:p-5 rounded-2xl bg-white border border-[#ECEEF5] shadow-skydash space-y-3.5">
            {/* Top Row: Agency Picker & Search */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              {/* Agency Selector */}
              <div className="md:col-span-5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8F93A0] mb-1">
                  Distributor Agency
                </label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F5F7FF] border border-[#ECEEF5] focus-within:border-[#4B49AC] transition-colors">
                  <Building2 className="w-4 h-4 text-[#4B49AC] shrink-0" />
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full bg-transparent text-xs sm:text-sm font-bold text-[#1F1F2C] focus:outline-none cursor-pointer truncate"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.gstin ? `(${s.gstin})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Search Bar */}
              <div className="md:col-span-4">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8F93A0] mb-1">
                  Search Catalog
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8F93A0]" />
                  <input
                    type="text"
                    placeholder="Search by nickname, brand, alias..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#F5F7FF] md:bg-white border border-[#ECEEF5] text-xs sm:text-sm text-[#1F1F2C] placeholder-[#8F93A0] focus:outline-none focus:ring-2 focus:ring-[#4B49AC]/20 focus:border-[#4B49AC]"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#8F93A0] hover:text-[#1F1F2C]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Batch Presets */}
              <div className="md:col-span-3 flex items-center gap-2 pt-1 md:pt-0">
                <button
                  type="button"
                  onClick={handleLoadLastBillQuantities}
                  className="flex-1 px-2.5 py-2 rounded-xl bg-[#F0F3FF] border border-[#D5DCED] text-[#4B49AC] hover:bg-[#4B49AC] hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
                  title="Replicate quantities from latest confirmed bill"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Last Bill</span>
                </button>
                <button
                  type="button"
                  onClick={handleSetAllDefault}
                  className="flex-1 px-2.5 py-2 rounded-xl bg-[#F5F7FF] border border-[#ECEEF5] text-[#6C7383] hover:text-[#4B49AC] hover:bg-[#EEF2FF] text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
                  title="Fill 10 packs for each item"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>All 10s</span>
                </button>
              </div>
            </div>

            {/* Segmented Filter Pills */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-[#ECEEF5]">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {(
                  [
                    { id: 'ALL', label: 'All Catalog', count: planRows.length },
                    { id: 'ORDERED', label: 'In Current Order', count: orderedItems.length },
                    { id: 'ZERO', label: 'Unordered', count: planRows.length - orderedItems.length }
                  ] as const
                ).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                      activeTab === tab.id
                        ? 'bg-[#4B49AC] text-white shadow-xs'
                        : 'bg-[#F5F7FF] text-[#6C7383] hover:text-[#4B49AC] hover:bg-[#EEF2FF]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-[#ECEEF5] text-[#6C7383]'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="text-xs text-[#8F93A0] font-mono">
                Showing <strong className="text-[#1F1F2C]">{filteredRows.length}</strong> of {planRows.length} items
              </div>
            </div>
          </div>

          {/* Main Workspace Grid (Products on Left, Live Cart on Desktop Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Products Column */}
            <div className="lg:col-span-8 space-y-3">
              {loading ? (
                <div className="p-12 rounded-2xl bg-white border border-[#ECEEF5] text-center text-xs text-[#6C7383] shadow-skydash">
                  Loading product catalog...
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="p-12 rounded-2xl bg-white border border-[#ECEEF5] text-center space-y-2 shadow-skydash">
                  <Package className="w-8 h-8 text-[#8F93A0] mx-auto opacity-50" />
                  <p className="text-sm font-bold text-[#1F1F2C]">No products found</p>
                  <p className="text-xs text-[#8F93A0]">
                    No items match "{search}" in the selected filter tab.
                  </p>
                  {search && (
                    <Button variant="outline" size="sm" onClick={() => setSearch('')} className="mt-2 text-xs">
                      Clear Search
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredRows.map((row) => {
                    const isSelected = row.quantity > 0;
                    return (
                      <div
                        key={row.product_id}
                        className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#F8F9FE] border-[#4B49AC] shadow-md shadow-[#4B49AC]/10 ring-1 ring-[#4B49AC]/20'
                            : 'bg-white border-[#ECEEF5] shadow-skydash hover:border-[#D5DCED]'
                        }`}
                      >
                        {/* Top: Product Title & Price Tag */}
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-bold text-[#1F1F2C] text-sm sm:text-base leading-snug truncate">
                                {row.product.nickname}
                              </h3>
                              <p className="text-[11px] text-[#6C7383] font-mono truncate mt-0.5" title={row.product.supplier_item_name}>
                                "{row.product.supplier_item_name}"
                              </p>
                            </div>

                            {/* Line Total or Status Tag */}
                            <div className="text-right shrink-0">
                              <div className="flex items-baseline justify-end gap-1">
                                <span className="font-mono font-bold text-sm text-[#4B49AC]">
                                  ₹{formatINR(row.purchase_rate)}
                                </span>
                                <span className="text-[10px] text-[#8F93A0] font-mono">/pack</span>
                              </div>
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#F5F7FF] text-[#6C7383] border border-[#ECEEF5] inline-block mt-0.5">
                                {row.rate_source === 'SUPPLIER_LAST' ? 'Last Bill' : 'Ref Rate'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Middle/Bottom: Interactive Controls */}
                        <div className="mt-3.5 pt-3 border-t border-[#ECEEF5]/80">
                          {row.quantity === 0 ? (
                            /* State 1: Quantity is 0 -> Clean "+ Add" Button & Quick Chips */
                            <div className="flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(row.product_id, 10)}
                                className="flex-1 py-2 px-3 rounded-xl bg-[#F0F3FF] hover:bg-[#4B49AC] text-[#4B49AC] hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 border border-[#D5DCED] active:scale-95"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add 10 Packs</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(row.product_id, 50)}
                                className="py-2 px-3 rounded-xl bg-white hover:bg-[#F5F7FF] text-[#6C7383] hover:text-[#4B49AC] font-bold text-xs transition-all border border-[#ECEEF5] active:scale-95 shadow-xs"
                                title="Add 50 Packs"
                              >
                                +50
                              </button>
                            </div>
                          ) : (
                            /* State 2: Quantity > 0 -> Touch Stepper & Line Total */
                            <div className="space-y-2.5">
                              {/* Quantity Stepper Row */}
                              <div className="flex items-center justify-between gap-1.5">
                                {/* Minus Button */}
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuantity(row.product_id, row.quantity - 1)}
                                  className="w-9 h-9 rounded-xl bg-white border border-[#D5DCED] text-[#6C7383] hover:text-rose-600 hover:border-rose-300 flex items-center justify-center active:scale-95 transition-all shadow-xs"
                                  title="Decrease by 1"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>

                                {/* Direct Input for Number of Packs */}
                                <div className="flex-1 relative">
                                  <input
                                    type="number"
                                    min="0"
                                    value={row.quantity}
                                    onChange={(e) => handleUpdateQuantity(row.product_id, parseInt(e.target.value) || 0)}
                                    onFocus={(e) => e.target.select()}
                                    className="w-full h-9 px-2 text-center rounded-xl font-mono font-bold text-sm bg-white border border-[#4B49AC] text-[#4B49AC] ring-2 ring-[#4B49AC]/20 shadow-xs focus:outline-none"
                                  />
                                  <span className="text-[10px] text-[#8F93A0] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none font-bold">
                                    pk
                                  </span>
                                </div>

                                {/* Plus Button */}
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuantity(row.product_id, row.quantity + 1)}
                                  className="w-9 h-9 rounded-xl bg-[#4B49AC] text-white flex items-center justify-center active:scale-95 transition-all shadow-xs hover:bg-[#3f3da0]"
                                  title="Increase by 1"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>

                                {/* Quick Boost Chips: +10 / +50 */}
                                <button
                                  type="button"
                                  onClick={() => handleAddPreset(row.product_id, 10)}
                                  className="px-2.5 h-9 rounded-xl bg-[#F0F3FF] border border-[#D5DCED] text-[#4B49AC] font-bold text-xs hover:bg-[#4B49AC] hover:text-white transition-all shadow-xs"
                                  title="Add 10 Packs"
                                >
                                  +10
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleAddPreset(row.product_id, 50)}
                                  className="px-2.5 h-9 rounded-xl bg-white border border-[#ECEEF5] text-[#6C7383] font-bold text-xs hover:bg-[#F5F7FF] hover:text-[#4B49AC] transition-all shadow-xs"
                                  title="Add 50 Packs"
                                >
                                  +50
                                </button>

                                {/* Trash / Reset */}
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuantity(row.product_id, 0)}
                                  className="w-8 h-9 rounded-xl text-[#8F93A0] hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                                  title="Remove from Order"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Subtotal Line Display */}
                              <div className="flex items-center justify-between text-xs pt-1 border-t border-[#ECEEF5]/60">
                                <span className="text-[11px] font-semibold text-[#6C7383]">
                                  {row.quantity} Packs × ₹{formatINR(row.purchase_rate)}
                                </span>
                                <span className="font-mono font-bold text-sm text-[#1F1F2C]">
                                  ₹{formatINR(row.total)}
                                </span>
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

            {/* Desktop Sticky Live Order Cart Summary (lg:block) */}
            <div className="hidden lg:block lg:col-span-4 sticky top-20 space-y-4">
              <div className="p-5 rounded-2xl bg-white border border-[#ECEEF5] shadow-skydash space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#ECEEF5]">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-[#F0F3FF] text-[#4B49AC]">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#1F1F2C]">Order Estimate</h3>
                      <p className="text-[11px] text-[#6C7383] truncate max-w-[160px]">
                        {selectedSupplier?.name || 'Agency'}
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#F0F3FF] text-[#4B49AC]">
                    {orderedItems.length} SKUs
                  </span>
                </div>

                {/* Ordered Items Mini List */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {orderedItems.length === 0 ? (
                    <div className="py-6 text-center text-xs text-[#8F93A0]">
                      No products added yet. Click <strong>+ Add Packs</strong> on any product card.
                    </div>
                  ) : (
                    orderedItems.map(item => (
                      <div
                        key={item.product_id}
                        className="p-2.5 rounded-xl bg-[#F8F9FE] border border-[#ECEEF5] flex items-center justify-between text-xs gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-[#1F1F2C] block truncate">
                            {item.product.nickname}
                          </span>
                          <span className="text-[11px] text-[#6C7383] font-mono">
                            {item.quantity} packs × ₹{formatINR(item.purchase_rate)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-bold text-xs text-[#4B49AC]">
                            ₹{formatINR(item.total)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.product_id, 0)}
                            className="text-[#8F93A0] hover:text-rose-600 p-1 rounded-md"
                            title="Remove item"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Landed Cost Breakdown */}
                <div className="pt-3 border-t border-[#ECEEF5] space-y-2 text-xs">
                  <div className="flex justify-between text-[#6C7383]">
                    <span>Total Pack Volume:</span>
                    <strong className="text-[#1F1F2C] font-mono">{totalPacksOrdered} Packs</strong>
                  </div>
                  <div className="flex justify-between text-[#6C7383]">
                    <span>Taxable Subtotal:</span>
                    <span className="font-mono text-[#1F1F2C]">₹{formatINR(totalTaxable)}</span>
                  </div>
                  <div className="flex justify-between text-[#6C7383]">
                    <span>GST Component (40%):</span>
                    <span className="font-mono text-[#1F1F2C]">₹{formatINR(totalGst)}</span>
                  </div>

                  <div className="pt-3 border-t-2 border-[#ECEEF5] flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#8F93A0] tracking-wider block">
                        Estimated Grand Total
                      </span>
                      <span className="text-2xl font-black font-mono text-[#4B49AC]">
                        ₹{formatINR(grandTotalRounded)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-2">
                  <Button
                    variant="primary"
                    disabled={orderedItems.length === 0}
                    onClick={() => setIsProformaMode(true)}
                    className="w-full justify-center py-3 text-xs font-bold shadow-lg shadow-[#4B49AC]/25"
                    icon={<FileDown className="w-4 h-4" />}
                  >
                    Generate PO Sheet ({orderedItems.length})
                  </Button>

                  <button
                    type="button"
                    disabled={orderedItems.length === 0}
                    onClick={handleCopyWhatsApp}
                    className="w-full py-2.5 px-3 rounded-xl bg-[#F0F3FF] hover:bg-[#EEF2FF] text-[#4B49AC] font-bold text-xs transition-colors flex items-center justify-center gap-2 border border-[#D5DCED] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy for WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Sticky Bottom Floating Dock (lg:hidden) */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#ECEEF5] p-3 shadow-2xl pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-[#6C7383] block truncate">
                {orderedItems.length} SKUs • {totalPacksOrdered} Packs
              </span>
              <span className="font-mono text-base font-black text-[#4B49AC] block truncate">
                ₹{formatINR(grandTotalRounded)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {orderedItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleCopyWhatsApp}
                  className="p-2.5 rounded-xl bg-[#F0F3FF] text-[#4B49AC] border border-[#D5DCED] active:scale-95"
                  title="Copy for WhatsApp"
                >
                  <Copy className="w-4 h-4" />
                </button>
              )}

              <Button
                variant="primary"
                size="sm"
                disabled={orderedItems.length === 0}
                onClick={() => setIsProformaMode(true)}
                className="shadow-lg shadow-[#4B49AC]/30 font-bold px-4 py-2 text-xs bg-[#4B49AC] hover:bg-[#3f3da0] text-white"
                icon={<FileDown className="w-4 h-4" />}
              >
                Review PO ({orderedItems.length})
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* ULTRA-CLEAN CORPORATE PRINTABLE DOCUMENT VIEW */
        <div className="printable-container space-y-4">
          <div className="printable-document max-w-4xl mx-auto bg-white text-black rounded-xl sm:rounded-none p-4 sm:p-8 space-y-6 shadow-sm sm:shadow-none border border-zinc-200 sm:border-black overflow-hidden">
            {/* Header / Brand Title */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b-2 border-black pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-black text-lg shrink-0">
                  AP
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-black tracking-tight text-black uppercase">
                    AUDIT & ORDER PLANNER
                  </h1>
                  <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase block">
                    Personal Purchase & Agency Billing Verification System
                  </span>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="px-3 py-1 bg-black text-white rounded-none font-mono text-[11px] sm:text-xs font-bold uppercase inline-block">
                  WHOLESALE ORDER ESTIMATE
                </span>
                <p className="text-xs font-mono text-zinc-700 mt-1">Ref #: EST-{Date.now().toString().slice(-6)}</p>
                <p className="text-xs font-mono text-zinc-700">Date: {formatDisplayDate(new Date())}</p>
              </div>
            </div>

            {/* Vendor & Buyer Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 p-4 bg-zinc-50 border border-zinc-300 text-xs">
              <div>
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider block mb-1">
                  TARGET DISTRIBUTOR AGENCY
                </span>
                <h2 className="text-sm font-bold text-black">{selectedSupplier?.name}</h2>
                {selectedSupplier?.gstin && (
                  <p className="font-mono text-zinc-800 mt-0.5">GSTIN: <strong>{selectedSupplier.gstin}</strong></p>
                )}
                <p className="text-zinc-700 mt-0.5">{selectedSupplier?.address}</p>
                <p className="text-zinc-700">Phone: {selectedSupplier?.phone || 'N/A'}</p>
              </div>

              <div className="sm:text-right">
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider block mb-1">
                  PURCHASER / PAYMENT DETAILS
                </span>
                <h2 className="text-sm font-bold text-black">BERRY QUEQ (RAMACHANDRAN)</h2>
                <p className="text-zinc-700 mt-0.5">Veppampattu, Chennai, Tamil Nadu</p>
                <p className="font-mono text-zinc-800 mt-0.5">
                  Payment Terms: <strong>{selectedSupplier?.payment_terms || 'CREDIT / CASH'}</strong>
                </p>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-zinc-100 border-b-2 border-black text-black uppercase text-[10px] font-bold">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Product Description & Invoice Alias</th>
                    <th className="py-2.5 px-3 text-right">Pack Qty</th>
                    <th className="py-2.5 px-3 text-right">Rate / Pack (₹)</th>
                    <th className="py-2.5 px-3 text-right">Line Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {orderedItems.map((item, idx) => (
                    <tr key={item.product_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50'}>
                      <td className="py-2.5 px-3 font-mono text-zinc-600">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-black block">{item.product.nickname}</span>
                        <span className="text-[11px] font-mono text-zinc-600">"{item.product.supplier_item_name}"</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-black">
                        {item.quantity} Packs
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-black">
                        ₹{formatINR(item.purchase_rate)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-black">
                        ₹{formatINR(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cost Breakdown & Ready Amount */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-4 border-t border-black">
              <div className="p-3 bg-zinc-50 border border-zinc-300 rounded-none text-xs max-w-sm">
                <span className="font-bold text-black block mb-1">Order Notes & Payment Preparation</span>
                <p className="text-[11px] text-zinc-700 leading-relaxed">
                  Prices derived from agency billing history and reference catalogs. Have exact cash / cheque ready prior to order placement.
                </p>
              </div>

              <div className="w-full sm:w-72 space-y-2 text-xs">
                <div className="flex justify-between text-zinc-700">
                  <span>Selected Products:</span>
                  <span className="font-mono text-black">{orderedItems.length} SKUs</span>
                </div>
                <div className="flex justify-between text-zinc-700">
                  <span>Total Packs Volume:</span>
                  <span className="font-mono text-black">{totalPacksOrdered} Packs</span>
                </div>
                <div className="flex justify-between text-zinc-700">
                  <span>Taxable Subtotal:</span>
                  <span className="font-mono text-black">₹{formatINR(totalTaxable)}</span>
                </div>
                <div className="flex justify-between text-zinc-700">
                  <span>GST Component (40%):</span>
                  <span className="font-mono text-black">₹{formatINR(totalGst)}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-black pt-2 border-t-2 border-black">
                  <span>TOTAL AMOUNT NEEDED:</span>
                  <span className="font-mono text-black text-base">₹{formatINR(grandTotalRounded)}</span>
                </div>
              </div>
            </div>

            {/* Footer Signature */}
            <div className="pt-6 sm:pt-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 text-[11px] text-zinc-600 border-t border-zinc-300">
              <div>
                <p>System Generated Order Estimate</p>
                <p className="font-mono text-[10px]">Timestamp: {formatISTTimestamp(new Date())}</p>
              </div>
              <div className="text-left sm:text-right">
                <div className="h-10 border-b border-black w-48 mb-1"></div>
                <p className="font-bold text-black">Authorized Signature</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
