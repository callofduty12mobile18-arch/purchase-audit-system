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
  Percent
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Supplier, Product, PurchaseInvoice } from '../types';
import { dbService } from '../services/dbService';
import { getTodayIST, formatDisplayDate, formatISTTimestamp } from '../utils/dateUtils';

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

      // Initialize plan rows for all catalog products (sorted A-Z)
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

  // Update purchase rate
  const handleUpdateRate = (productId: string, newRate: number) => {
    const rate = Math.max(0, newRate || 0);
    setPlanRows(prev =>
      prev.map(row => {
        if (row.product_id !== productId) return row;
        const total = Number((row.quantity * rate).toFixed(2));
        const divisor = 1 + (row.gst_rate / 100);
        const taxable = Number((total / divisor).toFixed(2));
        return {
          ...row,
          purchase_rate: rate,
          rate_source: 'USER_OVERRIDE',
          total,
          taxable_value: taxable,
          gst_amount: Number((total - taxable).toFixed(2))
        };
      })
    );
  };

  // Quick preset adder (e.g. +10, +50, +100)
  const handleAddPreset = (productId: string, delta: number) => {
    const row = planRows.find(r => r.product_id === productId);
    if (row) {
      handleUpdateQuantity(productId, row.quantity + delta);
    }
  };

  // Quick action: Load quantities from the latest bill
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
  };

  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);

  // Filtered rows for display
  const filteredRows = planRows.filter(row => {
    // 1. Tab Filter
    if (activeTab === 'ORDERED' && row.quantity === 0) return false;
    if (activeTab === 'ZERO' && row.quantity > 0) return false;

    // 2. Search Filter
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
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header Bar */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            <ShoppingCart className="w-6 h-6 text-[#4B49AC]" />
            Wholesale Order Planner
          </h1>
          <p className="page-subtitle">
            All catalog products are listed below. Simply enter the desired pack quantities to calculate exact landed amounts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isProformaMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsProformaMode(false)}
                icon={<ArrowLeft className="w-4 h-4" />}
              >
                Back to Edit
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handlePrint}
                icon={<Printer className="w-4 h-4" />}
              >
                Save as PDF / Print
              </Button>
            </>
          ) : (
            <>
              {orderedItems.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetAll}
                  icon={<RotateCcw className="w-4 h-4" />}
                >
                  Reset Quantities
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                disabled={orderedItems.length === 0}
                onClick={() => setIsProformaMode(true)}
                icon={<FileDown className="w-4 h-4" />}
              >
                Generate PO Estimate ({orderedItems.length})
              </Button>
            </>
          )}
        </div>
      </div>

      {!isProformaMode ? (
        <div className="no-print space-y-5">
          {/* Top Control Strip */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#ECEEF5] shadow-skydash space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
              {/* Agency Selector */}
              <div className="md:col-span-5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6C7383] mb-1.5">
                  Distributor Agency *
                </label>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#F5F7FF] border border-[#ECEEF5]">
                  <Building2 className="w-4 h-4 text-[#4B49AC] shrink-0" />
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full bg-transparent text-xs sm:text-sm font-bold text-[#1F1F2C] focus:outline-none cursor-pointer"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.gstin ? `(${s.gstin})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick Search */}
              <div className="md:col-span-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6C7383] mb-1.5">
                  Search Catalog Products
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8F93A0]" />
                  <input
                    type="text"
                    placeholder="Search by nickname, invoice text..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-[#ECEEF5] text-xs sm:text-sm text-[#1F1F2C] placeholder-[#8F93A0] focus:outline-none focus:ring-2 focus:ring-[#4B49AC]/20 focus:border-[#4B49AC] shadow-xs font-medium"
                  />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="md:col-span-3 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadLastBillQuantities}
                  className="flex-1 text-xs justify-center"
                  icon={<Sparkles className="w-3.5 h-3.5 text-[#7978E9]" />}
                  title="Copy quantities from last confirmed invoice"
                >
                  Last Bill
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSetAllDefault}
                  className="flex-1 text-xs justify-center"
                  icon={<Layers className="w-3.5 h-3.5" />}
                  title="Fill all items with 10 packs"
                >
                  All 10s
                </Button>
              </div>
            </div>

            {/* Filter Tabs Strip */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-[#ECEEF5]">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {(
                  [
                    { id: 'ALL', label: 'All Catalog Products', count: planRows.length },
                    { id: 'ORDERED', label: 'In Current Order', count: orderedItems.length },
                    { id: 'ZERO', label: 'Unordered (0 Packs)', count: planRows.length - orderedItems.length }
                  ] as const
                ).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                      activeTab === tab.id
                        ? 'bg-[#4B49AC] text-white shadow-sm shadow-[#4B49AC]/20'
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

              <div className="text-xs text-[#6C7383] font-mono">
                Showing <strong className="text-[#1F1F2C]">{filteredRows.length}</strong> of {planRows.length} products
              </div>
            </div>
          </div>

          {/* Product Order Table (Matches Products Page Look & Feel) */}
          <div className="rounded-2xl border border-[#ECEEF5] bg-white shadow-skydash overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F5F7FF] text-[11px] font-bold text-[#6C7383] uppercase tracking-wider border-b border-[#ECEEF5]">
                  <tr>
                    <th className="px-4 py-3.5 text-center w-12">#</th>
                    <th className="px-4 py-3.5">Product Alias / Nickname</th>
                    <th className="px-4 py-3.5 text-right w-36">Purchase Ref Rate</th>
                    <th className="px-4 py-3.5 text-center w-64">Order Packs (Quantity)</th>
                    <th className="px-4 py-3.5 text-right w-36">Line Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECEEF5]">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-xs text-[#6C7383]">
                        Loading products catalog...
                      </td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-xs text-[#6C7383]">
                        No products match your search/filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, idx) => {
                      const isSelected = row.quantity > 0;
                      return (
                        <tr
                          key={row.product_id}
                          className={`transition-colors ${
                            isSelected ? 'bg-[#F5F7FF]/60 hover:bg-[#EEF2FF]' : 'hover:bg-[#F8F9FE]'
                          }`}
                        >
                          {/* Row Index */}
                          <td className="px-4 py-3 text-center font-mono text-[#8F93A0] font-semibold">
                            {idx + 1}
                          </td>

                          {/* Product Alias & Subtitle */}
                          <td className="px-4 py-3">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#1F1F2C] text-sm hover:text-[#4B49AC] transition-colors">
                                  {row.product.nickname}
                                </span>
                                {isSelected && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    {row.quantity} Packs
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] font-mono text-[#6C7383] block">
                                Invoice Text: "{row.product.supplier_item_name}"
                              </span>
                            </div>
                          </td>

                          {/* Purchase Rate (₹) */}
                          <td className="px-4 py-3 text-right">
                            <div className="space-y-0.5">
                              <span className="font-mono font-bold text-sm text-[#4B49AC]">
                                ₹{row.purchase_rate.toFixed(2)}
                              </span>
                              <span className="text-[10px] font-mono text-[#8F93A0] block">
                                {row.rate_source === 'SUPPLIER_LAST' ? 'Last Bill' : 'Ref Rate'}
                              </span>
                            </div>
                          </td>

                          {/* Quantity (Packs) Controls */}
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Minus 10 Button */}
                              <button
                                type="button"
                                onClick={() => handleAddPreset(row.product_id, -10)}
                                disabled={row.quantity <= 0}
                                className="w-7 h-7 rounded-lg bg-[#F5F7FF] text-[#6C7383] hover:bg-[#EEF2FF] hover:text-[#4B49AC] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center font-bold text-xs border border-[#ECEEF5] transition-all"
                                title="Decrease by 10"
                              >
                                -10
                              </button>

                              {/* Minus 1 Button */}
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(row.product_id, row.quantity - 1)}
                                disabled={row.quantity <= 0}
                                className="w-7 h-7 rounded-lg bg-[#F5F7FF] text-[#6C7383] hover:bg-[#EEF2FF] hover:text-[#4B49AC] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center border border-[#ECEEF5] transition-all"
                                title="Decrease by 1"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>

                              {/* Numeric Input */}
                              <input
                                type="number"
                                min="0"
                                value={row.quantity === 0 ? '' : row.quantity}
                                placeholder="0"
                                onChange={(e) => handleUpdateQuantity(row.product_id, parseInt(e.target.value) || 0)}
                                onFocus={(e) => e.target.select()}
                                className={`w-20 px-2 py-1.5 rounded-lg border text-center font-mono font-bold text-sm focus:outline-none transition-all ${
                                  isSelected
                                    ? 'bg-white border-[#4B49AC] text-[#4B49AC] ring-2 ring-[#4B49AC]/20 shadow-xs'
                                    : 'bg-white border-[#ECEEF5] text-[#1F1F2C] hover:border-[#D5DCED]'
                                }`}
                              />

                              {/* Plus 1 Button */}
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(row.product_id, row.quantity + 1)}
                                className="w-7 h-7 rounded-lg bg-[#F5F7FF] text-[#6C7383] hover:bg-[#EEF2FF] hover:text-[#4B49AC] flex items-center justify-center border border-[#ECEEF5] transition-all"
                                title="Increase by 1"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>

                              {/* Plus 10 Button */}
                              <button
                                type="button"
                                onClick={() => handleAddPreset(row.product_id, 10)}
                                className="px-2 h-7 rounded-lg bg-[#F5F7FF] text-[#4B49AC] hover:bg-[#4B49AC] hover:text-white font-bold text-xs border border-[#ECEEF5] transition-all"
                                title="Add 10 Packs"
                              >
                                +10
                              </button>

                              {/* Plus 50 Button */}
                              <button
                                type="button"
                                onClick={() => handleAddPreset(row.product_id, 50)}
                                className="px-2 h-7 rounded-lg bg-[#F5F7FF] text-[#6C7383] hover:bg-[#7978E9] hover:text-white font-bold text-xs border border-[#ECEEF5] transition-all hidden sm:inline-flex items-center"
                                title="Add 50 Packs"
                              >
                                +50
                              </button>
                            </div>
                          </td>

                          {/* Line Total */}
                          <td className="px-4 py-3 text-right">
                            {isSelected ? (
                              <span className="font-mono font-bold text-sm text-[#1F1F2C] block">
                                ₹{row.total.toFixed(2)}
                              </span>
                            ) : (
                              <span className="font-mono text-xs text-[#8F93A0] italic block">
                                ₹0.00
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sticky / Live Order Summary Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-[#4B49AC] via-[#5C59BE] to-[#7978E9] text-white shadow-skydash-primary flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-white/20 text-white backdrop-blur-md shrink-0 shadow-sm">
                <Wallet className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-white tracking-wide uppercase">
                    Order Landed Estimate
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/25 text-white text-xs font-mono font-bold">
                    {orderedItems.length} Products
                  </span>
                </div>
                <p className="text-xs text-white/80 font-medium">
                  Total Volume: <strong>{totalPacksOrdered} Packs</strong> • Taxable: ₹{totalTaxable.toFixed(2)} • GST (40%): ₹{totalGst.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0">
              <div className="text-left sm:text-right">
                <span className="text-[11px] uppercase font-bold text-white/80 tracking-wider block">
                  Total Amount Needed
                </span>
                <span className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
                  ₹{grandTotalRounded.toFixed(2)}
                </span>
              </div>

              <Button
                variant="outline"
                size="lg"
                disabled={orderedItems.length === 0}
                onClick={() => setIsProformaMode(true)}
                className="bg-white text-[#4B49AC] hover:bg-[#F5F7FF] font-extrabold border-transparent shadow-md"
                icon={<FileDown className="w-4 h-4 text-[#4B49AC]" />}
              >
                Generate PO Sheet
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* ULTRA-CLEAN CORPORATE PRINTABLE DOCUMENT VIEW */
        <div className="printable-container">
          <div className="printable-document max-w-4xl mx-auto bg-white text-black rounded-none p-6 sm:p-8 space-y-6 shadow-none border border-black">
            {/* Header / Brand Title */}
            <div className="flex justify-between items-center border-b-2 border-black pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-black text-lg">
                  AP
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight text-black uppercase">
                    AUDIT & ORDER PLANNER
                  </h1>
                  <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase block">
                    Personal Purchase & Agency Billing Verification System
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="px-3 py-1 bg-black text-white rounded-none font-mono text-xs font-bold uppercase">
                  WHOLESALE ORDER ESTIMATE
                </span>
                <p className="text-xs font-mono text-zinc-700 mt-1">Ref #: EST-{Date.now().toString().slice(-6)}</p>
                <p className="text-xs font-mono text-zinc-700">Date: {formatDisplayDate(new Date())}</p>
              </div>
            </div>

            {/* Vendor & Buyer Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 bg-zinc-50 border border-zinc-300 text-xs">
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
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
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
                        ₹{item.purchase_rate.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-black">
                        ₹{item.total.toFixed(2)}
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
                  <span className="font-mono text-black">₹{totalTaxable.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-700">
                  <span>GST Component (40%):</span>
                  <span className="font-mono text-black">₹{totalGst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-black pt-2 border-t-2 border-black">
                  <span>TOTAL AMOUNT NEEDED:</span>
                  <span className="font-mono text-black text-base">₹{grandTotalRounded.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Footer Signature */}
            <div className="pt-8 flex justify-between items-end text-[11px] text-zinc-600 border-t border-zinc-300">
              <div>
                <p>System Generated Order Estimate</p>
                <p className="font-mono text-[10px]">Timestamp: {formatISTTimestamp(new Date())}</p>
              </div>
              <div className="text-right">
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
