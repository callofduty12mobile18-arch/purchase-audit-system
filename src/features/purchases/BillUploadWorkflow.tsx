import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  Trash2,
  Plus,
  ShieldAlert,
  ArrowLeft,
  Building2,
  DollarSign,
  Package,
  Receipt,
  Calendar,
  Eye,
  AlertTriangle,
  WifiOff,
  Edit3,
  Save
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { CardSkeleton } from '../../components/ui/LoadingSkeleton';
import { InvoiceFormData, InvoiceFormItem, PurchaseInvoice, Supplier, Product } from '../../types';
import { createBlankInvoice, createBlankInvoiceItem } from '../../services/invoiceService';
import { dbService } from '../../services/dbService';
import { useToast } from '../../context/ToastContext';
import { getTodayIST, generateISTInvoiceNumber, formatISTTimestamp, formatDisplayDate } from '../../utils/dateUtils';

export const MEMO_NAME_OPTIONS = [
  'RAMACHANDRAN',
  'ASHWIN KARTHIK',
  'BERRY QUEQ',
  'SUBIKSHA STORE'
] as const;

export const BillUploadWorkflow: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();
  const [formData, setFormData] = useState<InvoiceFormData>(createBlankInvoice());
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedInvoice, setSavedInvoice] = useState<PurchaseInvoice | null>(null);
  const [existingDuplicate, setExistingDuplicate] = useState<PurchaseInvoice | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [formValidationErrors, setFormValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    loadMetadata();
  }, [id]);

  const loadMetadata = async () => {
    try {
      setLoadingInitial(true);
      const [fetchedSuppliers, fetchedProducts] = await Promise.all([
        dbService.getSuppliers(),
        dbService.getProducts()
      ]);
      setSuppliers(fetchedSuppliers);
      setProducts(fetchedProducts);

      if (id) {
        const existingInv = await dbService.getInvoiceById(id);
        if (existingInv) {
          const mappedItems: InvoiceFormItem[] = (existingInv.items || []).map(item => ({
            supplier_item_name: item.supplier_item_name_snapshot,
            item_name: item.product?.nickname || item.supplier_item_name_snapshot,
            product_id: item.product_id,
            hsn: item.hsn_snapshot || '24022090',
            uom: item.uom_snapshot || 'PAC',
            pack_qty: Number(item.quantity) || 0,
            qty: Number(item.quantity) || 0,
            quantity: Number(item.quantity) || 0,
            each_pack_rate: Number(item.purchase_rate) || 0,
            purchase_rate: Number(item.purchase_rate) || 0,
            mrp_rsp: item.product?.current_selling_price || Math.round((Number(item.purchase_rate) || 0) * 1.3),
            invoice_amount: Number(item.total) || 0,
            total: Number(item.total) || 0,
            gst_rate: Number(item.gst_rate) || 40,
            taxable_value: Number(item.taxable_value) || 0,
            cgst: Number(item.cgst) || 0,
            sgst: Number(item.sgst) || 0,
            igst: Number(item.igst) || 0,
            validation: { valid: true, warnings: [] }
          }));

          const baseFormData: InvoiceFormData = {
            supplier_name: existingInv.supplier?.name || 'AYYAPPA ENTERPRISES',
            supplier_gstin: existingInv.supplier?.gstin || '33AABFA2949R1Z5',
            invoice_name: existingInv.invoice_name || 'RAMACHANDRAN',
            invoice_date: existingInv.invoice_date || getTodayIST(),
            invoice_number: existingInv.invoice_number || '',
            payment_mode: existingInv.payment_mode || 'CASH',
            payment_status: existingInv.payment_status || 'PAID',
            cheque_date: existingInv.cheque_date || existingInv.invoice_date || getTodayIST(),
            items: mappedItems.length > 0 ? mappedItems : [createBlankInvoiceItem()],
            subtotal: existingInv.subtotal,
            taxable_amount: existingInv.taxable_amount,
            cgst: existingInv.cgst,
            sgst: existingInv.sgst,
            igst: existingInv.igst,
            total_tax: existingInv.total_tax,
            round_off: existingInv.round_off,
            grand_total: existingInv.grand_total,
          };

          setFormData(baseFormData);
          setLoadingInitial(false);
          return;
        } else {
          toastError('Invoice Not Found', `Invoice record with ID "${id}" could not be found.`);
          navigate('/purchases');
          return;
        }
      }

      setFormData(prev => ({
        ...prev,
        supplier_name: 'AYYAPPA ENTERPRISES',
        supplier_gstin: '33AABFA2949R1Z5',
        invoice_name: prev.invoice_name || 'RAMACHANDRAN',
        invoice_date: prev.invoice_date || getTodayIST(),
        invoice_number: prev.invoice_number || generateISTInvoiceNumber(),
        payment_mode: prev.payment_mode === 'CHEQUE' ? 'CHEQUE' : 'CASH',
        payment_status: prev.payment_status === 'CHEQUE' ? 'CHEQUE' : 'PAID',
        cheque_date: prev.cheque_date || prev.invoice_date || getTodayIST()
      }));
    } catch (err: any) {
      console.error('Failed to load suppliers/products:', err);
      toastError('Failed to load catalog', err.message || 'Check database connection.');
    } finally {
      setLoadingInitial(false);
    }
  };

  // Mathematical Recalculations
  const recalcFromItems = (items: InvoiceFormItem[]) => {
    const itemsTotal = items.reduce((sum, i) => sum + (Number(i.invoice_amount ?? i.total) || 0), 0);
    const totalPacks = items.reduce((sum, i) => sum + (Number(i.pack_qty) || 0), 0);
    const subtotal = Number((itemsTotal / 1.4).toFixed(2));
    const totalTax = Number((itemsTotal - subtotal).toFixed(2));
    const halfTax = Number((totalTax / 2).toFixed(2));

    return {
      items,
      total_items: items.length,
      total_packs: Math.round(totalPacks),
      subtotal: Number(itemsTotal.toFixed(2)),
      taxable_amount: subtotal,
      cgst: halfTax,
      sgst: halfTax,
      igst: 0,
      total_tax: totalTax,
      round_off: 0,
      grand_total: Number(itemsTotal.toFixed(2)),
    };
  };

  // Header change updates
  const handleHeaderChange = (field: keyof InvoiceFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Product Selector Handler for Line Items
  const handleProductSelect = (index: number, selectedValue: string) => {
    const items = [...formData.items];
    const item = { ...items[index] };

    if (!selectedValue) {
      item.supplier_item_name = '';
      item.item_name = '';
      item.mrp_rsp = 0;
      item.each_pack_rate = 0;
      item.invoice_amount = 0;
      item.total = 0;
    } else {
      const matchedProd = products.find(p =>
        p.supplier_item_name === selectedValue ||
        p.nickname === selectedValue ||
        p.id === selectedValue
      );

      if (matchedProd) {
        item.supplier_item_name = matchedProd.supplier_item_name;
        item.item_name = matchedProd.nickname || matchedProd.supplier_item_name;
        item.hsn = matchedProd.hsn || '24022090';
        item.uom = matchedProd.uom || 'PAC';
        item.mrp_rsp = matchedProd.current_selling_price || 0;
        
        const packQty = item.pack_qty && item.pack_qty > 0 ? item.pack_qty : 100;
        item.pack_qty = packQty;
        item.qty = packQty;
        item.quantity = packQty;

        const refRate = matchedProd.current_purchase_ref_price || 0;
        item.purchase_rate = refRate;
        item.each_pack_rate = refRate;

        // Compute default bill total amount
        const billAmt = Number((refRate * packQty).toFixed(2));
        item.invoice_amount = billAmt;
        item.total = billAmt;
      } else {
        item.supplier_item_name = selectedValue;
        item.item_name = selectedValue;
      }
    }

    // Validation
    const warnings: string[] = [];
    if (!item.supplier_item_name?.trim()) warnings.push('Product selection is required');
    if (!item.pack_qty || item.pack_qty <= 0) warnings.push('Pack quantity is required');
    if (!item.invoice_amount || item.invoice_amount <= 0) warnings.push('Invoice amount is required');
    if (item.mrp_rsp && item.each_pack_rate && item.each_pack_rate > item.mrp_rsp * 1.05) {
      warnings.push(`Each pack rate (₹${item.each_pack_rate}) exceeds MRP (₹${item.mrp_rsp})`);
    }
    item.needs_review = warnings.length > 0;
    item.validation = { valid: warnings.length === 0, warnings };

    items[index] = item;
    setFormData(prev => ({
      ...prev,
      ...recalcFromItems(items),
    }));
  };

  const handleItemChange = (index: number, field: keyof InvoiceFormItem, value: string | number) => {
    const items = [...formData.items];
    const item = { ...items[index], [field]: value } as InvoiceFormItem;

    if (field === 'supplier_item_name' || field === 'item_name') {
      item.item_name = String(value);
      item.supplier_item_name = String(value);
      
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
    } else if (field === 'pack_qty' || field === 'qty' || field === 'quantity') {
      const pQty = Number(value) || 0;
      item.pack_qty = pQty;
      item.qty = pQty;
      item.quantity = pQty;

      const rate = Number(item.each_pack_rate || item.purchase_rate) || 0;
      if (pQty > 0 && rate > 0) {
        item.invoice_amount = Number((rate * pQty).toFixed(2));
        item.total = item.invoice_amount;
      } else if (pQty > 0 && item.invoice_amount && item.invoice_amount > 0) {
        item.each_pack_rate = Number((item.invoice_amount / pQty).toFixed(2));
        item.purchase_rate = item.each_pack_rate;
      }
    } else if (field === 'each_pack_rate' || field === 'purchase_rate') {
      const rate = Number(value) || 0;
      item.each_pack_rate = rate;
      item.purchase_rate = rate;

      const pQty = Number(item.pack_qty) || 0;
      if (pQty > 0) {
        item.invoice_amount = Number((rate * pQty).toFixed(2));
        item.total = item.invoice_amount;
      }
    } else if (field === 'mrp_rsp') {
      item.mrp_rsp = Number(value) || 0;
    } else if (field === 'invoice_amount' || field === 'total') {
      const invAmt = Number(value) || 0;
      item.invoice_amount = invAmt;
      item.total = invAmt;

      const packQty = Number(item.pack_qty) || 0;
      if (packQty > 0) {
        item.each_pack_rate = Number((invAmt / packQty).toFixed(2));
        item.purchase_rate = item.each_pack_rate;
      }
    }

    // Validation checks
    const warnings: string[] = [];
    if (!item.supplier_item_name?.trim()) warnings.push('Product selection is required');
    if (!item.pack_qty || item.pack_qty <= 0) warnings.push('Pack quantity is required');
    if (!item.invoice_amount || item.invoice_amount <= 0) warnings.push('Invoice amount is required');
    if (item.mrp_rsp && item.each_pack_rate && item.each_pack_rate > item.mrp_rsp * 1.05) {
      warnings.push(`Each pack rate (₹${item.each_pack_rate}) exceeds MRP (₹${item.mrp_rsp})`);
    }
    item.needs_review = warnings.length > 0;
    item.validation = { valid: warnings.length === 0, warnings };

    items[index] = item;
    setFormData(prev => ({
      ...prev,
      ...recalcFromItems(items),
    }));
  };

  const handleAddItem = () => {
    const newItem = createBlankInvoiceItem();
    const items = [...formData.items, newItem];
    setFormData(prev => ({
      ...prev,
      ...recalcFromItems(items),
    }));
  };

  const handleRemoveItem = (index: number) => {
    if (formData.items.length <= 1) return;
    const items = formData.items.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      ...recalcFromItems(items)
    }));
  };

  // Form Validation & Confirmation
  const validateForm = () => {
    const errors: string[] = [];

    if (!navigator.onLine) {
      errors.push('No internet connection. Please reconnect to save to database.');
    }

    if (!formData.invoice_date) {
      errors.push('Invoice date is required');
    }

    if (formData.items.length === 0) {
      errors.push('Please enter at least one line item.');
    }

    const unselected = formData.items.some(it => !it.supplier_item_name?.trim());
    if (unselected) {
      errors.push('Please choose a product for all line items.');
    }

    const invalidQuantities = formData.items.some(it => !it.pack_qty || it.pack_qty <= 0);
    if (invalidQuantities) {
      errors.push('All line items must have a pack quantity > 0.');
    }

    const invalidTotals = formData.items.some(it => !it.invoice_amount || it.invoice_amount <= 0);
    if (invalidTotals) {
      errors.push('All line items must have a bill amount > 0.');
    }

    setFormValidationErrors(errors);
    return errors.length === 0;
  };

  const handleInitiateConfirm = async () => {
    if (!validateForm()) {
      toastWarning('Form Incomplete', 'Please check highlighted fields and line items before saving.');
      return;
    }

    const finalInvoiceNumber = formData.invoice_number?.trim() || generateISTInvoiceNumber();

    const submissionData: InvoiceFormData = {
      ...formData,
      supplier_name: 'AYYAPPA ENTERPRISES',
      supplier_gstin: '33AABFA2949R1Z5',
      invoice_number: finalInvoiceNumber,
    };

    setIsSubmitting(true);

    try {
      const matchedSupplier = suppliers.find(
        s => s.name.trim().toLowerCase() === 'ayyappa enterprises'
      );

      if (matchedSupplier) {
        const duplicate = await dbService.checkDuplicateInvoice(
          matchedSupplier.id,
          finalInvoiceNumber,
          submissionData.invoice_date,
          id
        );
        if (duplicate) {
          setExistingDuplicate(duplicate);
          setShowDuplicateModal(true);
          setIsSubmitting(false);
          return;
        }
      }

      await executeSave(submissionData);
    } catch (err: any) {
      console.error('Save error:', err);
      toastError(isEditMode ? 'Update Failed' : 'Save Failed', err.message || 'Failed to save purchase invoice');
      setIsSubmitting(false);
    }
  };

  const executeSave = async (overrideData?: InvoiceFormData) => {
    setIsSubmitting(true);
    setShowDuplicateModal(false);
    try {
      const saved = await dbService.confirmAndSaveInvoice(overrideData || formData, undefined, id);
      setSavedInvoice(saved);
      setShowSuccessModal(true);
      toastSuccess(
        isEditMode ? 'Invoice Updated' : 'Invoice Saved',
        `Invoice #${saved.invoice_number} successfully ${isEditMode ? 'updated' : 'recorded'}.`
      );
    } catch (err: any) {
      toastError(isEditMode ? 'Update Error' : 'Save Error', err.message || 'Error saving invoice to database');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-16">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 w-60 bg-[#ECEEF5] rounded-xl animate-pulse" />
            <div className="h-4 w-96 bg-[#ECEEF5] rounded-xl animate-pulse" />
          </div>
        </div>
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6 max-w-6xl mx-auto pb-24 md:pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/purchases')}
            icon={<ArrowLeft className="w-4 h-4" />}
            className="mb-1 text-[#6C7383] hover:text-[#4B49AC] -ml-2"
          >
            Back to Invoices Ledger
          </Button>
          <h1 className="page-title flex items-center gap-2.5">
            {isEditMode ? (
              <Edit3 className="w-5.5 h-5.5 text-[#4B49AC]" />
            ) : (
              <Receipt className="w-5.5 h-5.5 text-[#4B49AC]" />
            )}
            {isEditMode ? `Edit Purchase Invoice #${formData.invoice_number}` : 'New Purchase Invoice Entry'}
          </h1>
          <p className="page-subtitle">
            {isEditMode
              ? 'Update bill line items, quantities, purchase rates, memo name, or payment details.'
              : 'Record supplier purchase bills, select items from catalog, and maintain inventory purchase history.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-stretch sm:self-auto">
          <Button
            variant="outline"
            onClick={() => navigate('/purchases')}
            className="flex-1 sm:flex-none justify-center"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleInitiateConfirm}
            isLoading={isSubmitting}
            icon={isEditMode ? <Save className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            className="flex-1 sm:flex-none justify-center shadow-md shadow-[#4B49AC]/25 font-bold"
          >
            {isEditMode ? 'Update Invoice' : 'Save this Invoice'}
          </Button>
        </div>
      </div>

      {/* Validation Errors Notice */}
      {formValidationErrors.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1.5 animate-in slide-in-from-top-2 duration-200 shadow-sm">
          <div className="flex items-center gap-2 font-bold text-rose-900 text-sm">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>Please complete all required invoice fields:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 pl-2 text-rose-700">
            {formValidationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Invoice Form */}
      <div className="space-y-5 sm:space-y-6">
        
        {/* Header Metadata Card */}
        <div className="p-4 sm:p-5 md:p-6 rounded-2xl bg-white border border-[#ECEEF5] shadow-skydash space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#ECEEF5]">
            <div className="flex items-center gap-2">
              <Building2 className="w-4.5 h-4.5 text-[#4B49AC]" />
              <h2 className="text-xs sm:text-sm font-bold text-[#1F1F2C] uppercase tracking-wider">Invoice Header Information</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {/* Invoice Number */}
            <div>
              <label className="block text-xs font-semibold text-[#1F1F2C] mb-1">
                Invoice Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. INV-20261008-1835"
                value={formData.invoice_number}
                onChange={(e) => {
                  handleHeaderChange('invoice_number', e.target.value);
                  if (formValidationErrors.length > 0) setFormValidationErrors([]);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#ECEEF5] text-xs sm:text-sm font-mono font-bold text-[#1F1F2C] focus:outline-none focus:ring-2 focus:ring-[#4B49AC]/20 focus:border-[#4B49AC] shadow-xs"
              />
            </div>

            {/* Static Supplier Name */}
            <div>
              <label className="block text-xs font-semibold text-[#6C7383] uppercase tracking-wider mb-1">
                Supplier Name
              </label>
              <div className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F7FF] border border-[#ECEEF5] text-xs sm:text-sm font-bold text-[#1F1F2C] flex items-center justify-between">
                <span>AYYAPPA ENTERPRISES</span>
                <span className="text-[10px] uppercase font-bold text-[#4B49AC] bg-white px-2 py-0.5 rounded-md border border-[#ECEEF5]">Distributor</span>
              </div>
            </div>

            {/* Static Supplier Agency */}
            <div>
              <label className="block text-xs font-semibold text-[#6C7383] uppercase tracking-wider mb-1">
                Supplier Agency
              </label>
              <div className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F7FF] border border-[#ECEEF5] text-xs sm:text-sm font-semibold text-[#1F1F2C]">
                ITC Authorized Agency
              </div>
            </div>

            {/* Memo Name Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-[#1F1F2C] mb-1">
                Memo Name
              </label>
              <select
                value={formData.invoice_name || 'RAMACHANDRAN'}
                onChange={(e) => handleHeaderChange('invoice_name', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#ECEEF5] text-xs sm:text-sm font-bold text-[#1F1F2C] focus:outline-none focus:ring-2 focus:ring-[#4B49AC]/20 focus:border-[#4B49AC] shadow-xs"
              >
                {MEMO_NAME_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Invoice Date */}
            <div>
              <label className="block text-xs font-semibold text-[#1F1F2C] mb-1">
                Invoice Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.invoice_date}
                onChange={(e) => {
                  handleHeaderChange('invoice_date', e.target.value);
                  if (formValidationErrors.length > 0) setFormValidationErrors([]);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#ECEEF5] text-xs sm:text-sm font-mono text-[#1F1F2C] focus:outline-none focus:ring-2 focus:ring-[#4B49AC]/20 focus:border-[#4B49AC] shadow-xs"
              />
              <p className="text-[10px] text-[#6C7383] mt-0.5 font-mono">
                Format: {formatDisplayDate(formData.invoice_date)} (DD/MM/YYYY)
              </p>
            </div>

            {/* Payment Mode (Cash & Cheque only) */}
            <div>
              <label className="block text-xs font-semibold text-[#1F1F2C] mb-1">Payment Mode</label>
              <select
                value={formData.payment_mode === 'CHEQUE' ? 'CHEQUE' : 'CASH'}
                onChange={(e) => {
                  const val = e.target.value;
                  handleHeaderChange('payment_mode', val);
                  if (val === 'CHEQUE' && formData.payment_status !== 'CHEQUE') {
                    handleHeaderChange('payment_status', 'CHEQUE');
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#ECEEF5] text-xs sm:text-sm font-semibold text-[#1F1F2C] focus:outline-none focus:ring-2 focus:ring-[#4B49AC]/20 focus:border-[#4B49AC] shadow-xs"
              >
                <option value="CASH">Cash</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>

            {/* Payment Status (Paid & Cheque only) */}
            <div>
              <label className="block text-xs font-semibold text-[#1F1F2C] mb-1">Payment Status</label>
              <select
                value={formData.payment_status === 'CHEQUE' ? 'CHEQUE' : 'PAID'}
                onChange={(e) => {
                  const val = e.target.value;
                  handleHeaderChange('payment_status', val);
                  if (val === 'CHEQUE' && formData.payment_mode !== 'CHEQUE') {
                    handleHeaderChange('payment_mode', 'CHEQUE');
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#ECEEF5] text-xs sm:text-sm font-semibold text-[#1F1F2C] focus:outline-none focus:ring-2 focus:ring-[#4B49AC]/20 focus:border-[#4B49AC] shadow-xs"
              >
                <option value="PAID">Paid</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>

            {/* Cheque Date Calendar Picker if Cheque is selected */}
            {(formData.payment_status === 'CHEQUE' || formData.payment_mode === 'CHEQUE') && (
              <div className="sm:col-span-2 lg:col-span-3 p-3.5 rounded-xl bg-[#F5F7FF] border-2 border-[#7978E9]/40 space-y-1.5 animate-in fade-in duration-200">
                <label className="block text-xs font-bold text-[#4B49AC] flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#7978E9]" />
                  Cheque Clearance Date (Date Amount Will Pass) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.cheque_date || formData.invoice_date}
                  onChange={(e) => handleHeaderChange('cheque_date', e.target.value)}
                  className="w-full sm:w-64 px-3.5 py-2 rounded-xl bg-white border border-[#7978E9]/50 text-xs sm:text-sm font-mono text-[#1F1F2C] focus:outline-none focus:ring-2 focus:ring-[#4B49AC]/30 focus:border-[#4B49AC] shadow-sm"
                />
                <p className="text-[11px] text-[#6C7383]">
                  Scheduled clearance date ({formatDisplayDate(formData.cheque_date || formData.invoice_date)}) for the bank to process and pass this cheque amount.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Line Items Card */}
        <div className="p-4 sm:p-5 md:p-6 rounded-2xl bg-white border border-[#ECEEF5] shadow-skydash space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[#ECEEF5]">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-[#1F1F2C] uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-[#4B49AC]" />
                Line Items ({formData.items.length})
              </h3>
              <p className="text-[11px] text-[#6C7383] mt-0.5">
                Select products from catalog. Bill Total is automatically calculated as <code>Packs × Purchase Rate</code>.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              icon={<Plus className="w-3.5 h-3.5" />}
              className="self-start sm:self-auto font-medium"
            >
              Add Line Item
            </Button>
          </div>

          {/* MOBILE CARDS VIEW (< 768px) */}
          <div className="md:hidden space-y-3.5">
            {formData.items.map((item, idx) => {
              const isCustom = item.supplier_item_name && !products.some(p => p.supplier_item_name === item.supplier_item_name);
              const hasError = !item.supplier_item_name || (item.pack_qty || 0) <= 0;
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border space-y-3 transition-colors ${
                    hasError ? 'bg-rose-50/20 border-rose-200' : 'bg-[#F8F9FE] border-[#ECEEF5]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#4B49AC] text-white font-mono font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-[#1F1F2C]">Item #{idx + 1}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={formData.items.length <= 1}
                      className="p-1.5 text-[#8F93A0] hover:text-rose-600 disabled:opacity-30 rounded-lg hover:bg-rose-50"
                      title="Delete item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#1F1F2C] mb-1">Select Product *</label>
                    <select
                      value={isCustom ? '__custom__' : (item.supplier_item_name || '')}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '__custom__') {
                          handleItemChange(idx, 'supplier_item_name', 'Custom Item');
                        } else {
                          handleProductSelect(idx, val);
                        }
                      }}
                      className={`w-full px-3 py-2 rounded-lg bg-white border text-xs font-semibold text-[#1F1F2C] focus:outline-none focus:ring-1 focus:ring-[#4B49AC] ${
                        !item.supplier_item_name ? 'border-rose-300' : 'border-[#ECEEF5]'
                      }`}
                    >
                      <option value="">-- Choose Product / Cigarette --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.supplier_item_name}>
                          {p.nickname}
                        </option>
                      ))}
                      <option value="__custom__">+ Other / Custom Item</option>
                    </select>
                    {isCustom && (
                      <input
                        type="text"
                        placeholder="Enter custom item name..."
                        value={item.supplier_item_name || ''}
                        onChange={(e) => handleItemChange(idx, 'supplier_item_name', e.target.value)}
                        className="w-full mt-2 px-3 py-1.5 rounded-lg bg-white border border-[#4B49AC]/40 text-xs font-medium text-[#1F1F2C] focus:outline-none focus:ring-1 focus:ring-[#4B49AC]"
                        autoFocus
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-semibold text-[#6C7383] uppercase mb-1">Packs *</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="100"
                        value={item.pack_qty || ''}
                        onChange={(e) => handleItemChange(idx, 'pack_qty', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-right rounded-lg bg-white border border-[#ECEEF5] text-xs font-mono font-bold text-[#1F1F2C] focus:outline-none focus:ring-1 focus:ring-[#4B49AC]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-[#6C7383] uppercase mb-1">MRP (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={item.mrp_rsp || ''}
                        onChange={(e) => handleItemChange(idx, 'mrp_rsp', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-right rounded-lg bg-white border border-[#ECEEF5] text-xs font-mono text-[#1F1F2C] focus:outline-none focus:ring-1 focus:ring-[#4B49AC]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-[#6C7383] uppercase mb-1">Purchase Rate (₹) *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={item.each_pack_rate || item.purchase_rate || ''}
                        onChange={(e) => handleItemChange(idx, 'each_pack_rate', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-right rounded-lg bg-white border border-[#ECEEF5] text-xs font-mono font-bold text-[#4B49AC] focus:outline-none focus:ring-1 focus:ring-[#4B49AC]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-[#6C7383] uppercase mb-1">Bill Total (₹) *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={item.invoice_amount || item.total || ''}
                        onChange={(e) => handleItemChange(idx, 'invoice_amount', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-right rounded-lg bg-white border border-[#ECEEF5] text-xs font-mono font-bold text-[#1F1F2C] focus:outline-none focus:ring-1 focus:ring-[#4B49AC]"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* DESKTOP / TABLET TABLE VIEW (>= 768px) */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-[#ECEEF5]">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-[#F5F7FF] text-[#6C7383] uppercase text-[10px] font-bold border-b border-[#ECEEF5]">
                  <th className="py-3 px-3.5 w-10 text-center">#</th>
                  <th className="py-3 px-3.5 min-w-[260px]">Select Product</th>
                  <th className="py-3 px-3.5 w-24 text-right">Packs</th>
                  <th className="py-3 px-3.5 w-28 text-right">MRP (₹)</th>
                  <th className="py-3 px-3.5 w-32 text-right">Purchase Rate (₹)</th>
                  <th className="py-3 px-3.5 w-36 text-right">Bill Total (₹)</th>
                  <th className="py-3 px-3.5 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEEF5]">
                {formData.items.map((item, idx) => {
                  const isCustom = item.supplier_item_name && !products.some(p => p.supplier_item_name === item.supplier_item_name);
                  const hasError = !item.supplier_item_name;
                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-[#F8F9FE] transition-colors ${
                        hasError ? 'bg-rose-50/10' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3.5 font-mono text-[#6C7383] text-center font-bold">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <div className="space-y-1.5">
                          <select
                            value={isCustom ? '__custom__' : (item.supplier_item_name || '')}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '__custom__') {
                                handleItemChange(idx, 'supplier_item_name', 'Custom Item');
                              } else {
                                handleProductSelect(idx, val);
                              }
                            }}
                            className={`w-full px-3 py-2 rounded-xl bg-[#F5F7FF] border text-xs font-semibold text-[#1F1F2C] focus:outline-none focus:ring-2 focus:ring-[#4B49AC]/20 focus:border-[#4B49AC] shadow-xs cursor-pointer ${
                              !item.supplier_item_name ? 'border-rose-300' : 'border-[#ECEEF5]'
                            }`}
                          >
                            <option value="">-- Choose Product / Cigarette --</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.supplier_item_name}>
                                {p.nickname}
                              </option>
                            ))}
                            <option value="__custom__">+ Other / Custom Item</option>
                          </select>
                          {isCustom && (
                            <input
                              type="text"
                              placeholder="Enter custom item name..."
                              value={item.supplier_item_name || ''}
                              onChange={(e) => handleItemChange(idx, 'supplier_item_name', e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#4B49AC]/40 text-xs font-medium text-[#1F1F2C] focus:outline-none focus:ring-1 focus:ring-[#4B49AC]"
                              autoFocus
                            />
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          placeholder="100"
                          value={item.pack_qty || ''}
                          onChange={(e) => handleItemChange(idx, 'pack_qty', e.target.value)}
                          className="w-full px-3 py-2 text-right rounded-xl bg-[#F5F7FF] border border-[#ECEEF5] text-xs font-mono font-bold text-[#1F1F2C] focus:outline-none focus:ring-2 focus:ring-[#4B49AC]/20 focus:border-[#4B49AC]"
                        />
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={item.mrp_rsp || ''}
                          onChange={(e) => handleItemChange(idx, 'mrp_rsp', e.target.value)}
                          className="w-full px-3 py-2 text-right rounded-xl bg-[#F5F7FF] border border-[#ECEEF5] text-xs font-mono font-semibold text-[#1F1F2C] focus:outline-none focus:ring-2 focus:ring-[#4B49AC]/20 focus:border-[#4B49AC]"
                        />
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={item.each_pack_rate || item.purchase_rate || ''}
                          onChange={(e) => handleItemChange(idx, 'each_pack_rate', e.target.value)}
                          className="w-full px-3 py-2 text-right rounded-xl bg-[#F5F7FF] border border-[#ECEEF5] text-xs font-mono font-bold text-[#4B49AC] focus:outline-none focus:ring-2 focus:ring-[#4B49AC]/20 focus:border-[#4B49AC]"
                        />
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={item.invoice_amount || item.total || ''}
                          onChange={(e) => handleItemChange(idx, 'invoice_amount', e.target.value)}
                          className="w-full px-3 py-2 text-right rounded-xl bg-[#F5F7FF] border border-[#7978E9]/30 text-xs font-mono font-bold text-[#1F1F2C] focus:outline-none focus:ring-2 focus:ring-[#4B49AC]/20 focus:border-[#4B49AC]"
                        />
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={formData.items.length <= 1}
                          className="p-1.5 text-[#8F93A0] hover:text-rose-600 disabled:opacity-25 transition-colors rounded-lg hover:bg-rose-50"
                          title="Delete line item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            icon={<Plus className="w-3.5 h-3.5" />}
            className="w-full justify-center py-2 text-xs font-semibold"
          >
            Add Another Line Item
          </Button>
        </div>

        {/* Invoice Grand Total Summary Card */}
        <div className="p-4 sm:p-5 md:p-6 rounded-2xl bg-white border border-[#ECEEF5] shadow-skydash space-y-4">
          <h3 className="text-xs sm:text-sm font-bold text-[#1F1F2C] uppercase tracking-wider pb-3 border-b border-[#ECEEF5] flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#4B49AC]" />
            Invoice Total Summary
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 text-xs">
            <div className="p-4 rounded-xl bg-[#F5F7FF] border border-[#ECEEF5] flex flex-col justify-between">
              <span className="text-[#6C7383] block text-xs font-semibold uppercase tracking-wider">Total Line Items</span>
              <span className="font-mono text-xl sm:text-2xl font-bold text-[#1F1F2C] mt-2 block">
                {formData.items.length} {formData.items.length === 1 ? 'Item' : 'Items'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#F5F7FF] border border-[#ECEEF5] flex flex-col justify-between">
              <span className="text-[#6C7383] block text-xs font-semibold uppercase tracking-wider">Total Quantity (Packs)</span>
              <span className="font-mono text-xl sm:text-2xl font-bold text-[#7978E9] mt-2 block">
                {(formData.total_packs || 0).toLocaleString()} Packs
              </span>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-br from-[#4B49AC]/10 to-[#7978E9]/15 border-2 border-[#4B49AC]/30 flex flex-col justify-between">
              <span className="text-[#4B49AC] block text-xs font-bold uppercase tracking-wider">Grand Total (Invoice Amount)</span>
              <span className="font-mono text-2xl sm:text-3xl font-black text-[#4B49AC] mt-1.5 block truncate">
                ₹{formData.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="pt-3 flex flex-col sm:flex-row justify-end gap-2.5 sm:gap-3 border-t border-[#ECEEF5]">
            <Button
              variant="outline"
              onClick={() => navigate('/purchases')}
              className="w-full sm:w-auto justify-center"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleInitiateConfirm}
              isLoading={isSubmitting}
              icon={isEditMode ? <Save className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
              className="w-full sm:w-auto justify-center px-8 py-3 text-sm font-bold shadow-lg shadow-[#4B49AC]/30 bg-[#4B49AC] hover:bg-[#3f3da0] text-white"
            >
              {isEditMode ? 'Update Invoice' : 'Save this Invoice'}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-3.5 bg-white/95 backdrop-blur-md border-t border-[#ECEEF5] shadow-2xl z-30 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[10px] uppercase font-bold text-[#6C7383] block">Invoice Total</span>
          <span className="font-mono text-base font-black text-[#4B49AC] block truncate">
            ₹{formData.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleInitiateConfirm}
          isLoading={isSubmitting}
          icon={isEditMode ? <Save className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          className="shadow-lg shadow-[#4B49AC]/30 font-bold px-5"
        >
          {isEditMode ? 'Update Invoice' : 'Save this Invoice'}
        </Button>
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
                A purchase invoice with this exact invoice number and supplier was already recorded in the database.
              </p>
            </div>
          </div>

          {existingDuplicate && (
            <div className="p-3 bg-[#F5F7FF] rounded-xl text-xs space-y-1.5 font-mono">
              <div>Invoice Date: <strong>{formatDisplayDate(existingDuplicate.invoice_date)}</strong></div>
              <div>Grand Total: <strong>₹{existingDuplicate.grand_total.toFixed(2)}</strong></div>
              <div>Created At: <strong>{formatISTTimestamp(existingDuplicate.created_at)}</strong></div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3">
            <Button variant="outline" size="sm" onClick={() => setShowDuplicateModal(false)} className="w-full sm:w-auto justify-center">
              Cancel & Review
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => executeSave()}
              isLoading={isSubmitting}
              className="w-full sm:w-auto justify-center font-semibold"
            >
              Proceed & Save Anyway
            </Button>
          </div>
        </div>
      </Modal>

      {/* Save Success Popup Modal */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          if (savedInvoice) navigate(`/purchases/${savedInvoice.id}`);
        }}
        title={isEditMode ? 'Invoice Updated' : 'Invoice Saved'}
        size="md"
      >
        <div className="text-center py-2 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm animate-in zoom-in-75 duration-300">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-[#1F1F2C]">
              {isEditMode ? 'Invoice Updated Successfully!' : 'Invoice Saved Successfully!'}
            </h3>
            <p className="text-xs text-[#6C7383] mt-1">
              {isEditMode
                ? 'Purchase invoice details have been updated in your database ledger.'
                : 'Purchase invoice has been recorded in your database ledger.'}
            </p>
          </div>

          {savedInvoice && (
            <div className="p-4 rounded-xl bg-[#F5F7FF] border border-[#ECEEF5] text-left text-xs space-y-2 font-mono">
              <div className="flex justify-between pb-1.5 border-b border-[#ECEEF5]">
                <span className="text-[#6C7383]">Invoice #:</span>
                <span className="font-bold text-[#1F1F2C]">{savedInvoice.invoice_number}</span>
              </div>
              {savedInvoice.invoice_name && (
                <div className="flex justify-between pb-1.5 border-b border-[#ECEEF5]">
                  <span className="text-[#6C7383]">Memo Name:</span>
                  <span className="font-bold text-[#4B49AC]">{savedInvoice.invoice_name}</span>
                </div>
              )}
              <div className="flex justify-between pb-1.5 border-b border-[#ECEEF5]">
                <span className="text-[#6C7383]">Invoice Date:</span>
                <span className="font-bold text-[#1F1F2C]">{formatDisplayDate(savedInvoice.invoice_date)}</span>
              </div>
              <div className="flex justify-between pb-1.5 border-b border-[#ECEEF5]">
                <span className="text-[#6C7383]">Supplier:</span>
                <span className="font-bold text-[#1F1F2C]">{savedInvoice.supplier?.name || 'AYYAPPA ENTERPRISES'}</span>
              </div>
              <div className="flex justify-between pb-1.5 border-b border-[#ECEEF5]">
                <span className="text-[#6C7383]">Total Items:</span>
                <span className="font-bold text-[#1F1F2C]">
                  {savedInvoice.items?.length || 0} Products ({savedInvoice.items?.reduce((s, it) => s + (Number(it.quantity) || 0), 0) || 0} packs)
                </span>
              </div>
              <div className="flex justify-between pb-1.5 border-b border-[#ECEEF5]">
                <span className="text-[#6C7383]">Payment:</span>
                <span className="font-bold text-[#1F1F2C]">{savedInvoice.payment_mode} ({savedInvoice.payment_status})</span>
              </div>
              <div className="flex justify-between pt-1 text-sm">
                <span className="font-bold text-[#1F1F2C]">Grand Total Paid:</span>
                <span className="font-bold text-[#4B49AC] text-base">₹{savedInvoice.grand_total.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowSuccessModal(false);
                if (isEditMode) {
                  navigate('/purchases');
                } else {
                  setSavedInvoice(null);
                  setFormData(createBlankInvoice());
                  loadMetadata();
                }
              }}
              icon={isEditMode ? <ArrowLeft className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              className="flex-1 justify-center"
            >
              {isEditMode ? 'Back to Invoices' : 'Add Another Invoice'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setShowSuccessModal(false);
                if (savedInvoice) navigate(`/purchases/${savedInvoice.id}`);
                else navigate('/purchases');
              }}
              icon={<Eye className="w-3.5 h-3.5" />}
              className="flex-1 justify-center shadow-md shadow-[#4B49AC]/20 font-semibold"
            >
              View Invoice Details
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
