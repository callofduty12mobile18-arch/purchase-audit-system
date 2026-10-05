import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Plus,
  ShieldAlert,
  ArrowLeft,
  Building2,
  DollarSign,
  Package,
  Sparkles,
  Receipt
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { InvoiceFormData, InvoiceFormItem, PurchaseInvoice, Supplier, Product } from '../../types';
import { createBlankInvoice, createBlankInvoiceItem } from '../../services/invoiceService';
import { dbService } from '../../services/dbService';

export const BillUploadWorkflow: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<InvoiceFormData>(createBlankInvoice());
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [existingDuplicate, setExistingDuplicate] = useState<PurchaseInvoice | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  useEffect(() => {
    loadMetadata();
  }, []);

  const loadMetadata = async () => {
    try {
      setLoadingInitial(true);
      const [fetchedSuppliers, fetchedProducts] = await Promise.all([
        dbService.getSuppliers(),
        dbService.getProducts()
      ]);
      setSuppliers(fetchedSuppliers);
      setProducts(fetchedProducts);
    } catch (err) {
      console.error('Failed to load suppliers/products:', err);
    } finally {
      setLoadingInitial(false);
    }
  };

  // Mathematical Recalculations
  const recalcFromItems = (items: InvoiceFormItem[], roundOff = formData.round_off ?? 0) => {
    const subtotal = items.reduce((sum, i) => sum + (Number(i.taxable_value) || (Number(i.invoice_amount || i.total) / 1.4)), 0);
    const cgstTotal = items.reduce((sum, i) => sum + (Number(i.cgst) || 0), 0);
    const sgstTotal = items.reduce((sum, i) => sum + (Number(i.sgst) || 0), 0);
    const igstTotal = items.reduce((sum, i) => sum + (Number(i.igst) || 0), 0);
    const totalTax = cgstTotal + sgstTotal + igstTotal;
    const itemsTotal = items.reduce((sum, i) => sum + (Number(i.invoice_amount ?? i.total) || 0), 0);
    const totalPacks = items.reduce((sum, i) => sum + (Number(i.pack_qty) || 0), 0);

    return {
      items,
      total_items: items.length,
      total_packs: Math.round(totalPacks),
      subtotal: Number(subtotal.toFixed(2)),
      taxable_amount: Number(subtotal.toFixed(2)),
      cgst: Number(cgstTotal.toFixed(2)),
      sgst: Number(sgstTotal.toFixed(2)),
      igst: Number(igstTotal.toFixed(2)),
      total_tax: Number(totalTax.toFixed(2)),
      grand_total: Number(itemsTotal > 0 ? (itemsTotal + roundOff).toFixed(2) : (subtotal + totalTax + roundOff).toFixed(2)),
    };
  };

  // Header change updates
  const handleHeaderChange = (field: keyof InvoiceFormData, value: string | number) => {
    const updated: InvoiceFormData = { ...formData, [field]: value } as InvoiceFormData;

    if (['subtotal', 'taxable_amount', 'cgst', 'sgst', 'igst', 'round_off'].includes(field)) {
      if (field === 'taxable_amount') {
        updated.subtotal = Number(value) || 0;
      } else if (field === 'subtotal') {
        updated.taxable_amount = Number(value) || 0;
      }
      const sub = Number(updated.subtotal) || 0;
      const cgst = Number(updated.cgst) || 0;
      const sgst = Number(updated.sgst) || 0;
      const igst = Number(updated.igst) || 0;
      const round = Number(updated.round_off) || 0;
      updated.total_tax = Number((cgst + sgst + igst).toFixed(2));
      updated.grand_total = Number((sub + updated.total_tax + round).toFixed(2));
    }
    setFormData(updated);
  };

  const handleSupplierSelect = (supplierName: string) => {
    const matched = suppliers.find(s => s.name.toLowerCase() === supplierName.toLowerCase());
    setFormData(prev => ({
      ...prev,
      supplier_name: supplierName,
      supplier_gstin: matched?.gstin || prev.supplier_gstin || ''
    }));
  };

  const handleItemChange = (index: number, field: keyof InvoiceFormItem, value: string | number) => {
    const items = [...formData.items];
    const item = { ...items[index], [field]: value } as InvoiceFormItem;

    if (field === 'supplier_item_name' || field === 'item_name') {
      item.item_name = String(value);
      item.supplier_item_name = String(value);
      
      // Auto-suggest product info if matched
      const matchedProd = products.find(p =>
        p.supplier_item_name.toLowerCase() === String(value).toLowerCase() ||
        p.nickname.toLowerCase() === String(value).toLowerCase()
      );
      if (matchedProd) {
        item.hsn = matchedProd.hsn || item.hsn || '24022090';
        item.uom = matchedProd.uom || 'PAC';
        if (matchedProd.current_purchase_ref_price && !item.each_pack_rate) {
          item.each_pack_rate = matchedProd.current_purchase_ref_price;
        }
        if (matchedProd.current_selling_price && !item.mrp_rsp) {
          item.mrp_rsp = matchedProd.current_selling_price;
        }
      }
    } else if (field === 'qty' || field === 'quantity') {
      item.qty = Number(value) || 0;
      item.quantity = Number(value) || 0;
    } else if (field === 'mrp_rsp') {
      item.mrp_rsp = Number(value) || 0;
    } else if (field === 'pack_qty') {
      item.pack_qty = Number(value) || 0;
    } else if (field === 'invoice_amount' || field === 'total') {
      item.invoice_amount = Number(value) || 0;
      item.total = Number(value) || 0;
    }

    // Deterministic each_pack_rate = invoice_amount / pack_qty
    const packQty = Number(item.pack_qty) || 0;
    const invAmt = Number(item.invoice_amount ?? item.total) || 0;
    if (packQty > 0 && invAmt > 0) {
      item.each_pack_rate = Number((invAmt / packQty).toFixed(2));
    }

    if (field === 'taxable_value') {
      const taxVal = Number(value) || 0;
      const gstRate = Number(item.gst_rate) || 40;
      item.taxable_value = taxVal;
      item.cgst = Number(((taxVal * (gstRate / 2)) / 100).toFixed(2));
      item.sgst = Number(((taxVal * (gstRate / 2)) / 100).toFixed(2));
      item.igst = 0;
      item.total = Number((taxVal + item.cgst + item.sgst).toFixed(2));
      item.invoice_amount = item.total;
    } else if (['purchase_rate', 'gst_rate'].includes(field)) {
      const qty = Number(item.qty || item.quantity) || 0;
      const rate = Number(item.purchase_rate) || 0;
      const gstRate = Number(item.gst_rate) || 40;
      if (rate > 0 && qty > 0) {
        item.taxable_value = Number((qty * rate).toFixed(2));
        item.cgst = Number(((item.taxable_value * (gstRate / 2)) / 100).toFixed(2));
        item.sgst = Number(((item.taxable_value * (gstRate / 2)) / 100).toFixed(2));
        item.igst = 0;
        item.total = Number((item.taxable_value + item.cgst + item.sgst).toFixed(2));
        item.invoice_amount = item.total;
      }
    }

    // Validation checks
    const warnings: string[] = [];
    if (!item.supplier_item_name?.trim()) warnings.push('Item description is required');
    if (!item.pack_qty || item.pack_qty <= 0) warnings.push('Pack quantity is required');
    if (!item.invoice_amount || item.invoice_amount <= 0) warnings.push('Invoice amount is required');
    if (item.mrp_rsp && item.each_pack_rate && item.each_pack_rate > item.mrp_rsp * 1.05) {
      warnings.push(`Each pack rate (₹${item.each_pack_rate}) exceeds MRP (₹${item.mrp_rsp})`);
    }
    item.needs_review = warnings.length > 0;
    item.validation = { valid: warnings.length === 0, warnings };

    items[index] = item;
    setFormData({
      ...formData,
      ...recalcFromItems(items, formData.round_off),
    });
  };

  const handleAddItem = () => {
    const newItem = createBlankInvoiceItem();
    const items = [...formData.items, newItem];
    setFormData({
      ...formData,
      ...recalcFromItems(items, formData.round_off),
    });
  };

  const handleRemoveItem = (index: number) => {
    if (formData.items.length <= 1) return;
    const items = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, ...recalcFromItems(items, formData.round_off) });
  };

  // Validation Checks
  const calculatedGrandTotal = formData.subtotal + formData.total_tax + formData.round_off;
  const isTotalMismatch = Math.abs(calculatedGrandTotal - formData.grand_total) > 0.05;

  // Duplicate Inspection & Confirmation
  const handleInitiateConfirm = async () => {
    if (!formData.supplier_name.trim()) {
      alert('Please enter or select a supplier name.');
      return;
    }
    if (!formData.invoice_number.trim()) {
      alert('Please enter an invoice number.');
      return;
    }
    if (formData.items.length === 0) {
      alert('Please enter at least one line item.');
      return;
    }

    setIsSubmitting(true);

    try {
      const matchedSupplier = suppliers.find(
        s => s.name.trim().toLowerCase() === formData.supplier_name.trim().toLowerCase()
      );

      if (matchedSupplier) {
        const duplicate = await dbService.checkDuplicateInvoice(
          matchedSupplier.id,
          formData.invoice_number,
          formData.invoice_date
        );
        if (duplicate) {
          setExistingDuplicate(duplicate);
          setShowDuplicateModal(true);
          setIsSubmitting(false);
          return;
        }
      }

      await executeSave();
    } catch (err: any) {
      console.error('Save error:', err);
      alert(err.message || 'Failed to save purchase invoice');
      setIsSubmitting(false);
    }
  };

  const executeSave = async () => {
    setIsSubmitting(true);
    setShowDuplicateModal(false);
    try {
      const saved = await dbService.confirmAndSaveInvoice(formData);
      navigate(`/purchases/${saved.id}`);
    } catch (err: any) {
      alert(err.message || 'Error saving invoice to database');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/purchases')}
            icon={<ArrowLeft className="w-4 h-4" />}
            className="mb-2 text-[#6C7383] hover:text-[#4B49AC]"
          >
            Back to Invoices Ledger
          </Button>
          <h1 className="page-title flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-[#4B49AC]" />
            New Purchase Invoice Entry
          </h1>
          <p className="page-subtitle">
            Record supplier purchase bills, auto-calculate GST line items, and maintain inventory reference prices.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/purchases')}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleInitiateConfirm}
            isLoading={isSubmitting}
            icon={<CheckCircle2 className="w-4 h-4" />}
            className="shadow-md shadow-[#4B49AC]/25"
          >
            Save & Confirm Invoice
          </Button>
        </div>
      </div>

      {/* Main Invoice Form */}
      <div className="space-y-6">
        
        {/* Header Metadata Card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#ECEEF5] shadow-skydash space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#ECEEF5]">
            <div className="flex items-center gap-2">
              <Building2 className="w-4.5 h-4.5 text-[#4B49AC]" />
              <h2 className="text-sm font-bold text-[#1F1F2C] uppercase tracking-wider">Invoice Header Information</h2>
            </div>
            <Badge variant="purple">Bill Details</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1F1F2C] mb-1">
                Supplier Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  list="suppliers-datalist"
                  type="text"
                  required
                  placeholder="e.g. ITC LIMITED"
                  value={formData.supplier_name}
                  onChange={(e) => handleSupplierSelect(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#ECEEF5] text-xs text-[#1F1F2C] focus:outline-none focus:ring-2 focus:ring-[#4B49AC]/20 focus:border-[#4B49AC]"
                />
                <datalist id="suppliers-datalist">
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.name} />
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1F1F2C] mb-1">Supplier GSTIN</label>
              <input
                type="text"
                placeholder="33AAAAA0000A1Z5"
                value={formData.supplier_gstin || ''}
                onChange={(e) => handleHeaderChange('supplier_gstin', e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#ECEEF5] text-xs font-mono text-[#1F1F2C] focus:outline-none focus:ring-2 focus:ring-[#4B49AC]/20 focus:border-[#4B49AC]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1F1F2C] mb-1">
                Invoice Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. INV-2026-081"
                value={formData.invoice_number}
                onChange={(e) => handleHeaderChange('invoice_number', e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#ECEEF5] text-xs font-mono font-bold text-[#4B49AC] focus:outline-none focus:ring-2 focus:ring-[#4B49AC]/20 focus:border-[#4B49AC]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1F1F2C] mb-1">
                Invoice Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.invoice_date}
                onChange={(e) => handleHeaderChange('invoice_date', e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#ECEEF5] text-xs font-mono text-[#1F1F2C] focus:outline-none focus:ring-2 focus:ring-[#4B49AC]/20 focus:border-[#4B49AC]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1F1F2C] mb-1">Payment Mode</label>
              <select
                value={formData.payment_mode}
                onChange={(e) => handleHeaderChange('payment_mode', e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#ECEEF5] text-xs text-[#1F1F2C] focus:outline-none focus:ring-2 focus:ring-[#4B49AC]/20 focus:border-[#4B49AC]"
              >
                <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                <option value="UPI">UPI</option>
                <option value="CASH">Cash</option>
                <option value="CREDIT">Credit (Accounts Payable)</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1F1F2C] mb-1">Payment Status</label>
              <select
                value={formData.payment_status}
                onChange={(e) => handleHeaderChange('payment_status', e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#ECEEF5] text-xs text-[#1F1F2C] focus:outline-none focus:ring-2 focus:ring-[#4B49AC]/20 focus:border-[#4B49AC]"
              >
                <option value="PAID">Paid</option>
                <option value="UNPAID">Unpaid</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
              </select>
            </div>
          </div>
        </div>

        {/* Line Items Table Card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#ECEEF5] shadow-skydash space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#ECEEF5]">
            <div>
              <h3 className="text-sm font-bold text-[#1F1F2C] uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-[#4B49AC]" />
                Line Items ({formData.items.length})
              </h3>
              <p className="text-[11px] text-[#6C7383]">
                Unit price per pack is auto-calculated from <code>Bill Total / Packs</code>.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Line Item
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-[#F5F7FF] text-[#6C7383] uppercase text-[10px] font-bold border-b border-[#ECEEF5]">
                  <th className="py-2.5 px-3 w-8">#</th>
                  <th className="py-2.5 px-3 min-w-[220px]">Item Description</th>
                  <th className="py-2.5 px-3 w-24">HSN</th>
                  <th className="py-2.5 px-3 w-20 text-right">Packs</th>
                  <th className="py-2.5 px-3 w-24 text-right">MRP (₹)</th>
                  <th className="py-2.5 px-3 w-28 text-right">Bill Total (₹)</th>
                  <th className="py-2.5 px-3 w-28 text-right">Each Pack Rate</th>
                  <th className="py-2.5 px-3 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEEF5]">
                {formData.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#F8F9FE] transition-colors">
                    <td className="py-2 px-3 font-mono text-[#6C7383] text-center font-bold">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3">
                      <input
                        list={`products-datalist-${idx}`}
                        type="text"
                        placeholder="e.g. CI Ice Burst 10M"
                        value={item.supplier_item_name || item.item_name || ''}
                        onChange={(e) => handleItemChange(idx, 'supplier_item_name', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#F5F7FF] border border-[#ECEEF5] text-xs font-medium text-[#1F1F2C] focus:outline-none focus:ring-1 focus:ring-[#4B49AC]"
                      />
                      <datalist id={`products-datalist-${idx}`}>
                        {products.map((p) => (
                          <option key={p.id} value={p.supplier_item_name}>
                            {p.nickname}
                          </option>
                        ))}
                      </datalist>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        placeholder="24022090"
                        value={item.hsn || ''}
                        onChange={(e) => handleItemChange(idx, 'hsn', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#F5F7FF] border border-[#ECEEF5] text-xs font-mono text-[#6C7383] focus:outline-none focus:ring-1 focus:ring-[#4B49AC]"
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.pack_qty || ''}
                        onChange={(e) => handleItemChange(idx, 'pack_qty', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-right rounded-lg bg-[#F5F7FF] border border-[#ECEEF5] text-xs font-mono font-semibold text-[#1F1F2C] focus:outline-none focus:ring-1 focus:ring-[#4B49AC]"
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={item.mrp_rsp || ''}
                        onChange={(e) => handleItemChange(idx, 'mrp_rsp', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-right rounded-lg bg-[#F5F7FF] border border-[#ECEEF5] text-xs font-mono text-[#1F1F2C] focus:outline-none focus:ring-1 focus:ring-[#4B49AC]"
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={item.invoice_amount || item.total || ''}
                        onChange={(e) => handleItemChange(idx, 'invoice_amount', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-right rounded-lg bg-[#F5F7FF] border border-[#ECEEF5] text-xs font-mono font-bold text-[#4B49AC] focus:outline-none focus:ring-1 focus:ring-[#4B49AC]"
                      />
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-[#1F1F2C]">
                      ₹{item.each_pack_rate?.toFixed(2) || '0.00'}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={formData.items.length <= 1}
                        className="p-1 text-[#8F93A0] hover:text-rose-600 disabled:opacity-30 transition-colors"
                        title="Delete line item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            icon={<Plus className="w-3.5 h-3.5" />}
            className="w-full justify-center py-2 text-xs"
          >
            Add Another Line Item
          </Button>
        </div>

        {/* Financial Totals & Balance Summary */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#ECEEF5] shadow-skydash space-y-4">
          <h3 className="text-sm font-bold text-[#1F1F2C] uppercase tracking-wider pb-3 border-b border-[#ECEEF5] flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#4B49AC]" />
            Tax & Grand Total Summary
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-[#F5F7FF] border border-[#ECEEF5]">
              <span className="text-[#6C7383] block text-[11px] font-semibold">Taxable Subtotal</span>
              <span className="font-mono text-base font-bold text-[#1F1F2C] mt-1 block">
                ₹{formData.subtotal.toFixed(2)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F5F7FF] border border-[#ECEEF5]">
              <span className="text-[#6C7383] block text-[11px] font-semibold">Total GST (CGST+SGST)</span>
              <span className="font-mono text-base font-bold text-[#7DA0FA] mt-1 block">
                ₹{formData.total_tax.toFixed(2)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F5F7FF] border border-[#ECEEF5]">
              <label className="text-[#6C7383] block text-[11px] font-semibold mb-1">Round Off (₹)</label>
              <input
                type="number"
                step="0.01"
                value={formData.round_off}
                onChange={(e) => handleHeaderChange('round_off', e.target.value)}
                className="w-full px-2.5 py-1 rounded bg-white border border-[#ECEEF5] font-mono text-xs font-semibold text-[#1F1F2C]"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-[#4B49AC]/10 border border-[#4B49AC]/30">
              <span className="text-[#4B49AC] block text-[11px] font-bold uppercase tracking-wider">Grand Total</span>
              <span className="font-mono text-lg font-bold text-[#4B49AC] mt-1 block">
                ₹{formData.grand_total.toFixed(2)}
              </span>
            </div>
          </div>

          {isTotalMismatch && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Calculated Total Discrepancy:</strong> Sum of (Subtotal + GST + Round Off) = ₹{calculatedGrandTotal.toFixed(2)}, which differs from Grand Total ₹{formData.grand_total.toFixed(2)}.
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/purchases')}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleInitiateConfirm}
              isLoading={isSubmitting}
              icon={<CheckCircle2 className="w-4 h-4" />}
              className="px-6 shadow-md shadow-[#4B49AC]/25"
            >
              Save & Confirm Purchase Invoice
            </Button>
          </div>
        </div>
      </div>

      {/* Duplicate Invoice Warning Modal */}
      <Modal
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        title="Potential Duplicate Purchase Invoice"
        size="md"
      >
        <div className="space-y-4 text-sm">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-900">Invoice #{formData.invoice_number} Already Exists</h4>
              <p className="text-xs text-amber-800 mt-1">
                A verified purchase invoice with this exact invoice number and supplier was recorded in the database.
              </p>
            </div>
          </div>

          {existingDuplicate && (
            <div className="p-3 bg-[#F5F7FF] rounded-xl text-xs space-y-1.5 font-mono">
              <div>Invoice Date: <strong>{existingDuplicate.invoice_date}</strong></div>
              <div>Grand Total: <strong>₹{existingDuplicate.grand_total.toFixed(2)}</strong></div>
              <div>Created At: <strong>{new Date(existingDuplicate.created_at).toLocaleString()}</strong></div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" size="sm" onClick={() => setShowDuplicateModal(false)}>
              Cancel & Review
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={executeSave}
              isLoading={isSubmitting}
            >
              Proceed & Save Anyway
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
