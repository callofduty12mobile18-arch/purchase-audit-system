import React, { useEffect, useState, useRef } from 'react';
import { ShoppingCart, Plus, Trash2, Printer, FileDown, Wallet, ArrowLeft, RefreshCw, Sparkles, Search, Layers } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Supplier, Product, PurchaseInvoice } from '../types';
import { dbService } from '../services/dbService';

interface OrderLineItem {
  id: string;
  product_id: string;
  product?: Product;
  quantity: number;
  estimated_rate: number;
  rate_source: 'SUPPLIER_LAST' | 'AVG_PRICE' | 'MANUAL_REF' | 'USER_OVERRIDE';
  gst_rate: number;
  taxable_value: number;
  estimated_gst: number;
  total: number;
}

export const OrderPlannerPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [orderItems, setOrderItems] = useState<OrderLineItem[]>([]);
  
  // Search Bar Autocomplete state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [searchFilter, setSearchFilter] = useState<string>('');
  const [isProformaMode, setIsProformaMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();

    // Close search dropdown on click outside
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    setLoading(true);
    const sups = await dbService.getSuppliers();
    const prods = await dbService.getProducts();
    const invs = await dbService.getInvoices();

    setSuppliers(sups);
    setProducts(prods);
    setInvoices(invs);

    if (sups.length > 0) {
      setSelectedSupplierId(sups[0].id);
    }

    setOrderItems([]);
    setLoading(false);
  };

  const handleClearPlan = () => {
    setOrderItems([]);
  };

  const handleAddAllProducts = () => {
    const allLines: OrderLineItem[] = products.map((prod, idx) => {
      const { rate, defaultQty, gstRate, source } = calculateRateEstimate(prod.id, selectedSupplierId);
      const totalCost = Number((defaultQty * rate).toFixed(2));
      const divisor = 1 + (gstRate / 100);
      const taxableVal = Number((totalCost / divisor).toFixed(2));
      const gstVal = Number((totalCost - taxableVal).toFixed(2));

      return {
        id: `line-${idx}-${Date.now()}`,
        product_id: prod.id,
        product: prod,
        quantity: defaultQty,
        estimated_rate: Number(rate.toFixed(4)),
        rate_source: source,
        gst_rate: gstRate,
        taxable_value: taxableVal,
        estimated_gst: gstVal,
        total: totalCost
      };
    });
    setOrderItems(allLines);
  };

  const handleLoadLastBill = () => {
    if (invoices.length > 0 && invoices[0].items) {
      const initialLines: OrderLineItem[] = invoices[0].items.map((item, idx) => {
        const prod = products.find(p => p.id === item.product_id || p.supplier_item_name === item.supplier_item_name_snapshot);
        const ratePerPack = item.quantity > 0 ? (item.total / item.quantity) : item.purchase_rate;
        return {
          id: `line-${idx}`,
          product_id: item.product_id || prod?.id || '',
          product: prod || item.product,
          quantity: item.quantity,
          estimated_rate: Number(ratePerPack.toFixed(4)),
          rate_source: 'SUPPLIER_LAST',
          gst_rate: item.gst_rate,
          taxable_value: item.taxable_value,
          estimated_gst: item.cgst + item.sgst + item.igst,
          total: item.total
        };
      });
      setOrderItems(initialLines);
    }
  };

  const calculateRateEstimate = (productId: string, supplierId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return { rate: 0, defaultQty: 10, gstRate: 40, source: 'MANUAL_REF' as const };

    let supplierLastRate: number | null = null;
    let lastQty: number | null = null;
    let lastGstRate: number | null = null;

    // Sort invoices descending by date to guarantee finding the most recent invoice first
    const sortedInvoices = [...invoices].sort((a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime());

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
      return { rate: supplierLastRate, defaultQty: lastQty || 10, gstRate: lastGstRate || 40, source: 'SUPPLIER_LAST' as const };
    }

    return { rate: product.current_purchase_ref_price, defaultQty: 10, gstRate: 40, source: 'MANUAL_REF' as const };
  };

  const handleAddProductByObject = (product: Product) => {
    const existingIdx = orderItems.findIndex(i => i.product_id === product.id);
    if (existingIdx >= 0) {
      handleUpdateItem(orderItems[existingIdx].id, 'quantity', orderItems[existingIdx].quantity + 10);
      setSearchQuery('');
      setIsSearchOpen(false);
      return;
    }

    const { rate, defaultQty, gstRate, source } = calculateRateEstimate(product.id, selectedSupplierId);
    const totalCost = Number((defaultQty * rate).toFixed(2));
    const divisor = 1 + (gstRate / 100);
    const taxableVal = Number((totalCost / divisor).toFixed(2));
    const gstVal = Number((totalCost - taxableVal).toFixed(2));

    const newItem: OrderLineItem = {
      id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      product_id: product.id,
      product: product,
      quantity: defaultQty,
      estimated_rate: Number(rate.toFixed(4)),
      rate_source: source,
      gst_rate: gstRate,
      taxable_value: taxableVal,
      estimated_gst: gstVal,
      total: totalCost
    };

    setOrderItems([newItem, ...orderItems]);
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  const handleUpdateItem = (id: string, field: keyof OrderLineItem, value: string | number) => {
    const updated = orderItems.map((row) => {
      if (row.id !== id) return row;
      const item = { ...row, [field]: value } as OrderLineItem;
      if (field === 'estimated_rate') {
        item.rate_source = 'USER_OVERRIDE';
      }
      const qty = Number(item.quantity) || 0;
      const rate = Number(item.estimated_rate) || 0;
      const gstRate = Number(item.gst_rate) || 40;
      const divisor = 1 + (gstRate / 100);
      item.total = Number((qty * rate).toFixed(2));
      item.taxable_value = Number((item.total / divisor).toFixed(2));
      item.estimated_gst = Number((item.total - item.taxable_value).toFixed(2));
      return item;
    });
    setOrderItems(updated);
  };

  const handleRemoveItem = (id: string) => {
    setOrderItems(orderItems.filter((item) => item.id !== id));
  };

  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);
  const rawTotalCost = orderItems.reduce((sum, i) => sum + i.total, 0);
  const totalAgencyLandedCost = Math.round(rawTotalCost);
  const roundOffAmount = Number((totalAgencyLandedCost - rawTotalCost).toFixed(2));
  const totalTaxableSubtotal = orderItems.reduce((sum, i) => sum + i.taxable_value, 0);
  const totalGstComponent = orderItems.reduce((sum, i) => sum + i.estimated_gst, 0);

  // Filter products matching search bar query
  const autocompleteSuggestions = products.filter(p =>
    p.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.supplier_item_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Auto-generate clean PDF filename upon Save as PDF / Print
  const handlePrint = () => {
    const originalTitle = document.title;
    const supplierCleanName = selectedSupplier?.name ? selectedSupplier.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Ayyappa_Enterprises';
    const dateStr = new Date().toISOString().split('T')[0];
    document.title = `ITC_Wholesale_Order_Estimate_${supplierCleanName}_${dateStr}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1200);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Bar */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">
            <ShoppingCart className="w-6 h-6 text-[#4B49AC]" />
            Wholesale Order Planner
          </h1>
          <p className="page-subtitle">
            Search by personal nickname to calculate exact landed costs before placing orders with distributors.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isProformaMode ? (
            <>
              <Button variant="outline" onClick={() => setIsProformaMode(false)} icon={<ArrowLeft className="w-4 h-4" />}>
                Back to Edit
              </Button>
              <Button variant="primary" onClick={handlePrint} icon={<Printer className="w-4 h-4" />}>
                Save as PDF / Print
              </Button>
            </>
          ) : (
            <>
              {orderItems.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleClearPlan} icon={<RefreshCw className="w-4 h-4" />}>
                  Clear All
                </Button>
              )}
              <Button
                variant="primary"
                disabled={orderItems.length === 0}
                onClick={() => setIsProformaMode(true)}
                icon={<FileDown className="w-4 h-4" />}
              >
                Generate PO Estimate
              </Button>
            </>
          )}
        </div>
      </div>

      {!isProformaMode ? (
        <div className="no-print space-y-6">
          {/* EASY TOP CONTROL CARD: Vendor + SEARCH BY NICKNAME */}
          <Card title="Order Setup & Quick Search" className="relative z-30">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              
              {/* Agency Selector */}
              <div className="md:col-span-4">
                <Select
                  label="Distributor Agency *"
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  options={suppliers.map(s => ({ value: s.id, label: `${s.name} ${s.gstin ? `(${s.gstin})` : ''}` }))}
                />
              </div>

              {/* SEARCH BAR BY NICKNAME WITH WIDE FLOATING AUTOCOMPLETE */}
              <div className="md:col-span-5 relative" ref={searchRef}>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#6C7383] block mb-1.5">
                  Search by Product Nickname to Add
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6C7383]" />
                  <input
                    type="text"
                    placeholder="Type nickname (e.g. Mixpod, Filter, Gold Flake)..."
                    value={searchQuery}
                    onFocus={() => setIsSearchOpen(true)}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsSearchOpen(true);
                    }}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#D5DCED] hover:border-[#4B49AC]/50 rounded-xl text-sm text-[#1F1F2C] placeholder-[#6C7383]/60 focus:outline-none focus:ring-2 focus:ring-[#4B49AC]/20 focus:border-[#4B49AC] font-medium shadow-sm transition-all"
                  />
                </div>

                {/* ULTRA-CLEAN UNCLIPPED FLOATING DROPDOWN PANEL (z-50) */}
                {isSearchOpen && searchQuery.trim().length > 0 && (
                  <div className="absolute left-0 top-full mt-2 w-full md:w-[480px] bg-white border border-[#ECEEF5] rounded-2xl shadow-2xl z-50 max-h-80 overflow-y-auto divide-y divide-[#ECEEF5]">
                    {autocompleteSuggestions.length === 0 ? (
                      <div className="p-4 text-xs text-[#6C7383] text-center font-medium">
                        No product nickname matches "{searchQuery}"
                      </div>
                    ) : (
                      autocompleteSuggestions.map((prod) => {
                        const isAdded = orderItems.some(i => i.product_id === prod.id);
                        return (
                          <div
                            key={prod.id}
                            onClick={() => handleAddProductByObject(prod)}
                            className="p-3.5 hover:bg-[#F5F7FF] cursor-pointer flex items-center justify-between gap-3 transition-colors group"
                          >
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-xs text-[#1F1F2C] group-hover:text-[#4B49AC] block truncate">
                                {prod.nickname}
                              </span>
                              <span className="text-[11px] font-mono text-[#6C7383] block truncate mt-0.5">
                                Invoice Text: "{prod.supplier_item_name}"
                              </span>
                            </div>

                            <div className="text-right shrink-0 flex items-center gap-3">
                              <div className="text-right">
                                <span className="text-xs font-mono text-[#4B49AC] font-bold block">
                                  ₹{prod.current_purchase_ref_price.toFixed(2)}
                                </span>
                                <span className="text-[10px] text-[#6C7383] font-mono">ref price</span>
                              </div>

                              {isAdded ? (
                                <Badge variant="success" size="sm">Added ✓</Badge>
                              ) : (
                                <span className="px-3 py-1.5 rounded-lg bg-[#4B49AC] text-white hover:bg-[#3f3e91] font-bold text-xs flex items-center gap-1 transition-all shadow-sm shrink-0">
                                  <Plus className="w-3.5 h-3.5" /> Add
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Quick Action Buttons */}
              <div className="md:col-span-3 flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full text-xs"
                  onClick={handleAddAllProducts}
                  icon={<Layers className="w-3.5 h-3.5" />}
                >
                  Add All ({products.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={handleLoadLastBill}
                  icon={<Sparkles className="w-3.5 h-3.5" />}
                >
                  Last Bill
                </Button>
              </div>

            </div>
          </Card>

          {/* MAIN ORDER ITEMS SHEET */}
          <Card
            title={`Planned Order Lines (${orderItems.length} Products)`}
            className="relative z-10"
            action={
              orderItems.length > 0 && (
                <div className="text-right">
                  <span className="text-xs text-[#6C7383] mr-2">Estimated Total:</span>
                  <span className="text-base sm:text-lg font-bold text-[#4B49AC] font-mono">₹{totalAgencyLandedCost.toFixed(2)}</span>
                </div>
              )
            }
          >
            {orderItems.length === 0 ? (
              <div className="py-12 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#F5F7FF] border border-[#ECEEF5] flex items-center justify-center mx-auto text-[#4B49AC] shadow-sm">
                  <Search className="w-6 h-6 text-[#4B49AC]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F1F2C] tracking-tight">Search by Nickname to Start Your Order</h3>
                  <p className="text-xs sm:text-sm text-[#6C7383] mt-1 max-w-md mx-auto">
                    Type any personal nickname in the search bar above or click <strong>Add All {products.length} Products</strong> to plan your order quickly!
                  </p>
                </div>
                <div className="pt-2 flex justify-center gap-3">
                  <Button variant="primary" size="sm" onClick={handleAddAllProducts} icon={<Layers className="w-4 h-4" />}>
                    Add All Catalog Products
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleLoadLastBill} icon={<Sparkles className="w-4 h-4" />}>
                    Load Last Bill Items
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Search Filter Inside Current Table */}
                {orderItems.length > 5 && (
                  <div className="relative max-w-sm">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6C7383]" />
                    <input
                      type="text"
                      placeholder="Filter current order lines..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-[#D5DCED] rounded-xl text-xs text-[#1F1F2C] placeholder-[#6C7383]/60 focus:outline-none focus:border-[#4B49AC]"
                    />
                  </div>
                )}

                {/* Streamlined Table Rows */}
                <div className="divide-y divide-[#ECEEF5] border border-[#ECEEF5] rounded-2xl overflow-hidden bg-white shadow-skydash">
                  {orderItems
                    .filter(item =>
                      !searchFilter ||
                      item.product?.nickname.toLowerCase().includes(searchFilter.toLowerCase()) ||
                      item.product?.supplier_item_name.toLowerCase().includes(searchFilter.toLowerCase())
                    )
                    .map((item, idx) => (
                      <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F8F9FE] transition-colors">
                        {/* Product Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-xs text-[#6C7383] px-2 py-0.5 rounded bg-[#F5F7FF] font-medium">#{idx + 1}</span>
                            <span className="font-bold text-[#1F1F2C] text-sm">{item.product?.nickname}</span>
                          </div>
                          <span className="text-xs font-mono text-[#6C7383] block mt-0.5">
                            Invoice Text: "{item.product?.supplier_item_name}"
                          </span>
                        </div>

                        {/* Inline Controls */}
                        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
                          <div className="w-full sm:w-24">
                            <label className="text-[10px] font-bold text-[#6C7383] uppercase block mb-1">Pack Qty</label>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full px-2.5 py-1.5 bg-white border border-[#D5DCED] rounded-lg text-xs font-mono font-bold text-[#1F1F2C] text-right focus:outline-none focus:border-[#4B49AC] min-h-[38px]"
                            />
                          </div>

                          <div className="w-full sm:w-28">
                            <label className="text-[10px] font-bold text-[#6C7383] uppercase block mb-1">Rate / Pack (₹)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.estimated_rate}
                              onChange={(e) => handleUpdateItem(item.id, 'estimated_rate', parseFloat(e.target.value) || 0)}
                              className="w-full px-2.5 py-1.5 bg-white border border-[#D5DCED] rounded-lg text-xs font-mono text-[#1F1F2C] font-semibold text-right focus:outline-none focus:border-[#4B49AC] min-h-[38px]"
                            />
                          </div>

                          <div className="w-full sm:w-28 text-left sm:text-right">
                            <label className="text-[10px] font-bold text-[#6C7383] uppercase block mb-1">Total (₹)</label>
                            <span className="font-mono font-bold text-xs sm:text-sm text-[#4B49AC] block py-1.5 truncate">
                              ₹{item.total.toFixed(2)}
                            </span>
                          </div>

                          <div className="flex items-end justify-end sm:justify-start">
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="p-2 text-[#6C7383] hover:text-[#F3797E] rounded-lg hover:bg-[#F3797E]/10 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
                              title="Remove Line"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Final Total Cash Needed Card */}
                <div className="p-5 bg-gradient-to-r from-[#4B49AC] to-[#7978E9] text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-skydash-primary">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 rounded-xl bg-white/20 text-white backdrop-blur-sm shadow-md shrink-0">
                      <Wallet className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wide">
                        Exact Amount to Have Ready for Agency
                      </h4>
                      <p className="text-xs text-white/80 mt-0.5">
                        Taxable: ₹{totalTaxableSubtotal.toFixed(2)} • GST (40%): ₹{totalGstComponent.toFixed(2)} • Round Off: {roundOffAmount >= 0 ? `+₹${roundOffAmount.toFixed(2)}` : `-₹${Math.abs(roundOffAmount).toFixed(2)}`}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
                      ₹{totalAgencyLandedCost.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      ) : (
        /* ULTRA-CLEAN CORPORATE PDF PRINTABLE DOCUMENT VIEW */
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
                  ORDER ESTIMATE SHEET
                </span>
                <p className="text-xs font-mono text-zinc-700 mt-1">Ref #: EST-{Date.now().toString().slice(-6)}</p>
                <p className="text-xs font-mono text-zinc-700">Date: {new Date().toLocaleDateString('en-IN')}</p>
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
                <p className="font-mono text-zinc-800 mt-0.5">Payment Terms: <strong>{selectedSupplier?.payment_terms || 'CREDIT / BANK'}</strong></p>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-100 border-b-2 border-black text-black uppercase text-[10px] font-bold">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Product Description & Invoice Name</th>
                    <th className="py-2.5 px-3 text-right">Pack Qty</th>
                    <th className="py-2.5 px-3 text-right">Net Landed Rate / Pack (₹)</th>
                    <th className="py-2.5 px-3 text-right">Line Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {orderItems.map((item, idx) => (
                    <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50'}>
                      <td className="py-2.5 px-3 font-mono text-zinc-600">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-black block">{item.product?.nickname}</span>
                        <span className="text-[11px] font-mono text-zinc-600">"{item.product?.supplier_item_name}"</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-black">
                        {item.quantity} Packs
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-black">
                        ₹{item.estimated_rate.toFixed(2)}
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
                  Prices derived from agency billing history. Have exact total ready in bank/cash prior to order placement.
                </p>
              </div>

              <div className="w-full sm:w-72 space-y-2 text-xs">
                <div className="flex justify-between text-zinc-700">
                  <span>Taxable Subtotal (Est.):</span>
                  <span className="font-mono text-black">₹{totalTaxableSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-700">
                  <span>GST Tax Component (40% Est.):</span>
                  <span className="font-mono text-black">₹{totalGstComponent.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-700">
                  <span>Round Off Adjustment:</span>
                  <span className="font-mono text-black">{roundOffAmount >= 0 ? `+₹${roundOffAmount.toFixed(2)}` : `-₹${Math.abs(roundOffAmount).toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-black pt-2 border-t-2 border-black">
                  <span>TOTAL AMOUNT NEEDED:</span>
                  <span className="font-mono text-black text-base">₹{totalAgencyLandedCost.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Footer Signature */}
            <div className="pt-8 flex justify-between items-end text-[11px] text-zinc-600 border-t border-zinc-300">
              <div>
                <p>System Generated Document</p>
                <p className="font-mono text-[10px]">Timestamp: {new Date().toISOString()}</p>
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
