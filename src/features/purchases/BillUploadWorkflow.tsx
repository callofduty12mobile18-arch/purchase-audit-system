import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CheckCircle2, Trash2, Plus, AlertTriangle, ArrowLeft, Building2,
  Package, Receipt, Calendar, Eye, WifiOff, Edit3, Save, ShieldAlert,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { CardSkeleton } from '../../components/ui/LoadingSkeleton';
import { InvoiceFormData, InvoiceFormItem, PurchaseInvoice, Supplier, Product } from '../../types';
import { createBlankInvoice, createBlankInvoiceItem } from '../../services/invoiceService';
import { dbService } from '../../services/dbService';
import { chequeReminderService, utcIsoToIstParts } from '../../services/chequeReminderService';
import { ChequeReminderSection } from './ChequeReminderSection';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { getTodayIST, generateISTInvoiceNumber, formatISTTimestamp, formatDisplayDate, formatINR } from '../../utils/dateUtils';

export const INVOICE_NAME_OPTIONS = [
  'RAMACHANDRAN',
  'ASHWIN KARTHIK',
  'BERRY QUEQ',
  'SUBIKSHA STORE',
] as const;

export const MEMO_NAME_OPTIONS = INVOICE_NAME_OPTIONS;

// ─── Shared input class ──────────────────────────────────────────────────────
const inputCls =
  'h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 font-mono ' +
  'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 transition-colors';

export const BillUploadWorkflow: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();
  const { user, profile } = useAuth();

  // Registered email of the authenticated administrator (auto-filled into reminders).
  const adminEmail = profile?.email || user?.email || '';

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

  useEffect(() => { loadMetadata(); }, [id]);

  // ── Data loading ────────────────────────────────────────────────────────────
  const loadMetadata = async () => {
    try {
      setLoadingInitial(true);
      const [fetchedSuppliers, fetchedProducts] = await Promise.all([
        dbService.getSuppliers(),
        dbService.getProducts(),
      ]);
      setSuppliers(fetchedSuppliers);
      setProducts(fetchedProducts);

      if (id) {
        const existingInv = await dbService.getInvoiceById(id);
        if (existingInv) {
          const mappedItems: InvoiceFormItem[] = (existingInv.items || []).map((item) => ({
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
            validation: { valid: true, warnings: [] },
          }));

          // Re-hydrate any existing cheque email reminder for this invoice.
          const existingReminder = await chequeReminderService.getByInvoice(id);
          const reminderActive = Boolean(existingReminder && existingReminder.status !== 'CANCELLED');
          const reminderParts = existingReminder ? utcIsoToIstParts(existingReminder.reminder_at) : { date: '', time: '' };

          setFormData({
            supplier_name: existingInv.supplier?.name || 'AYYAPPA ENTERPRISES',
            supplier_gstin: existingInv.supplier?.gstin || '33AABFA2949R1Z5',
            invoice_name: existingInv.invoice_name || 'RAMACHANDRAN',
            invoice_date: existingInv.invoice_date || getTodayIST(),
            invoice_number: existingInv.invoice_number || '',
            payment_mode: existingInv.payment_mode || 'CASH',
            payment_status: existingInv.payment_status || 'PAID',
            cheque_status: existingInv.cheque_status ?? null,
            cheque_amount: existingInv.cheque_amount ?? null,
            cheque_presentation_date: existingInv.cheque_presentation_date || existingInv.invoice_date || getTodayIST(),
            reminder_enabled: reminderActive,
            reminder_date: reminderActive ? reminderParts.date : '',
            reminder_time: reminderActive ? reminderParts.time : '',
            reminder_email: existingReminder?.recipient_email || '',
            items: mappedItems.length > 0 ? mappedItems : [createBlankInvoiceItem()],
            subtotal: existingInv.subtotal,
            taxable_amount: existingInv.taxable_amount,
            cgst: existingInv.cgst,
            sgst: existingInv.sgst,
            igst: existingInv.igst,
            total_tax: existingInv.total_tax,
            round_off: existingInv.round_off,
            grand_total: existingInv.grand_total,
          });
          setLoadingInitial(false);
          return;
        } else {
          toastError('Invoice not found', `Invoice "${id}" could not be found.`);
          navigate('/purchases');
          return;
        }
      }

      setFormData((prev) => ({
        ...prev,
        supplier_name: 'AYYAPPA ENTERPRISES',
        supplier_gstin: '33AABFA2949R1Z5',
        invoice_name: prev.invoice_name || 'RAMACHANDRAN',
        invoice_date: prev.invoice_date || getTodayIST(),
        invoice_number: prev.invoice_number || generateISTInvoiceNumber(),
        payment_mode: prev.payment_mode === 'CHEQUE' ? 'CHEQUE' : 'CASH',
        payment_status: prev.payment_mode === 'CHEQUE' ? 'UNPAID' : 'PAID',
        cheque_presentation_date: prev.cheque_presentation_date || prev.invoice_date || getTodayIST(),
      }));
    } catch (err: unknown) {
      toastError('Load failed', err instanceof Error ? err.message : 'Check database connection.');
    } finally {
      setLoadingInitial(false);
    }
  };

  // ── Calculation (identical business logic) ──────────────────────────────────
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

  const handleHeaderChange = (field: keyof InvoiceFormData, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

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
      const matchedProd = products.find(
        (p) =>
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
        const billAmt = Number((refRate * packQty).toFixed(2));
        item.invoice_amount = billAmt;
        item.total = billAmt;
      } else {
        item.supplier_item_name = selectedValue;
        item.item_name = selectedValue;
      }
    }

    const warnings: string[] = [];
    if (!item.supplier_item_name?.trim()) warnings.push('Product selection is required');
    if (!item.pack_qty || item.pack_qty <= 0) warnings.push('Pack quantity is required');
    if (!item.invoice_amount || item.invoice_amount <= 0) warnings.push('Invoice amount is required');
    if (item.mrp_rsp && item.each_pack_rate && item.each_pack_rate > item.mrp_rsp * 1.05)
      warnings.push(`Rate (₹${formatINR(item.each_pack_rate)}) exceeds MRP (₹${formatINR(item.mrp_rsp)})`);
    item.needs_review = warnings.length > 0;
    item.validation = { valid: warnings.length === 0, warnings };

    items[index] = item;
    setFormData((prev) => ({ ...prev, ...recalcFromItems(items) }));
  };

  const handleItemChange = (index: number, field: keyof InvoiceFormItem, value: string | number) => {
    const items = [...formData.items];
    const item = { ...items[index], [field]: value } as InvoiceFormItem;

    if (field === 'supplier_item_name' || field === 'item_name') {
      item.item_name = String(value);
      item.supplier_item_name = String(value);
      const matched = products.find(
        (p) =>
          p.supplier_item_name.toLowerCase() === String(value).toLowerCase() ||
          p.nickname.toLowerCase() === String(value).toLowerCase()
      );
      if (matched) {
        item.hsn = matched.hsn || item.hsn || '24022090';
        item.uom = matched.uom || 'PAC';
        if (matched.current_purchase_ref_price && !item.each_pack_rate)
          item.each_pack_rate = matched.current_purchase_ref_price;
        if (matched.current_selling_price && !item.mrp_rsp)
          item.mrp_rsp = matched.current_selling_price;
      }
    } else if (field === 'pack_qty' || field === 'qty' || field === 'quantity') {
      const pQty = Number(value) || 0;
      item.pack_qty = pQty; item.qty = pQty; item.quantity = pQty;
      const rate = Number(item.each_pack_rate || item.purchase_rate) || 0;
      if (pQty > 0 && rate > 0) { item.invoice_amount = Number((rate * pQty).toFixed(2)); item.total = item.invoice_amount; }
      else if (pQty > 0 && item.invoice_amount && item.invoice_amount > 0) { item.each_pack_rate = Number((item.invoice_amount / pQty).toFixed(2)); item.purchase_rate = item.each_pack_rate; }
    } else if (field === 'each_pack_rate' || field === 'purchase_rate') {
      const rate = Number(value) || 0;
      item.each_pack_rate = rate; item.purchase_rate = rate;
      const pQty = Number(item.pack_qty) || 0;
      if (pQty > 0) { item.invoice_amount = Number((rate * pQty).toFixed(2)); item.total = item.invoice_amount; }
    } else if (field === 'mrp_rsp') {
      item.mrp_rsp = Number(value) || 0;
    } else if (field === 'invoice_amount' || field === 'total') {
      const invAmt = Number(value) || 0;
      item.invoice_amount = invAmt; item.total = invAmt;
      const packQty = Number(item.pack_qty) || 0;
      if (packQty > 0) { item.each_pack_rate = Number((invAmt / packQty).toFixed(2)); item.purchase_rate = item.each_pack_rate; }
    }

    const warnings: string[] = [];
    if (!item.supplier_item_name?.trim()) warnings.push('Product selection is required');
    if (!item.pack_qty || item.pack_qty <= 0) warnings.push('Pack quantity is required');
    if (!item.invoice_amount || item.invoice_amount <= 0) warnings.push('Invoice amount is required');
    if (item.mrp_rsp && item.each_pack_rate && item.each_pack_rate > item.mrp_rsp * 1.05)
      warnings.push(`Rate (₹${formatINR(item.each_pack_rate)}) exceeds MRP (₹${formatINR(item.mrp_rsp)})`);
    item.needs_review = warnings.length > 0;
    item.validation = { valid: warnings.length === 0, warnings };

    items[index] = item;
    setFormData((prev) => ({ ...prev, ...recalcFromItems(items) }));
  };

  const handleAddItem = () => {
    const items = [...formData.items, createBlankInvoiceItem()];
    setFormData((prev) => ({ ...prev, ...recalcFromItems(items) }));
  };

  const handleRemoveItem = (index: number) => {
    if (formData.items.length <= 1) return;
    const items = formData.items.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, ...recalcFromItems(items) }));
  };

  // ── Validation & submission ─────────────────────────────────────────────────
  const validateForm = (): boolean => {
    const errors: string[] = [];
    if (!navigator.onLine) errors.push('No internet connection. Please reconnect to save.');
    if (!formData.invoice_date) errors.push('Invoice date is required.');
    if (formData.items.length === 0) errors.push('At least one line item is required.');
    if (formData.items.some((it) => !it.supplier_item_name?.trim())) errors.push('All line items must have a product selected.');
    if (formData.items.some((it) => !it.pack_qty || it.pack_qty <= 0)) errors.push('All line items must have pack quantity > 0.');
    if (formData.items.some((it) => !it.invoice_amount || it.invoice_amount <= 0)) errors.push('All line items must have a bill amount > 0.');

    // Cheque email reminder validation (only relevant for cheque payments)
    const isCheque = formData.payment_mode === 'CHEQUE';
    if (isCheque && formData.reminder_enabled) {
      if (!formData.reminder_date) errors.push('Reminder date is required when the email reminder is enabled.');
      if (!formData.reminder_time) errors.push('Reminder time is required when the email reminder is enabled.');
      if (!(formData.reminder_email || adminEmail).trim()) errors.push('Recipient email is required when the email reminder is enabled.');
    }

    setFormValidationErrors(errors);
    return errors.length === 0;
  };

  const handleInitiateConfirm = async () => {
    if (!validateForm()) { toastWarning('Incomplete form', 'Check the highlighted fields.'); return; }
    const finalNumber = formData.invoice_number?.trim() || generateISTInvoiceNumber();
    const submissionData: InvoiceFormData = { ...formData, supplier_name: 'AYYAPPA ENTERPRISES', supplier_gstin: '33AABFA2949R1Z5', invoice_number: finalNumber };
    setIsSubmitting(true);
    try {
      const matchedSupplier = suppliers.find((s) => s.name.trim().toLowerCase() === 'ayyappa enterprises');
      if (matchedSupplier) {
        const dup = await dbService.checkDuplicateInvoice(matchedSupplier.id, finalNumber, submissionData.invoice_date, id);
        if (dup) { setExistingDuplicate(dup); setShowDuplicateModal(true); setIsSubmitting(false); return; }
      }
      await executeSave(submissionData);
    } catch (err: unknown) {
      toastError(isEditMode ? 'Update failed' : 'Save failed', err instanceof Error ? err.message : 'Error saving invoice.');
      setIsSubmitting(false);
    }
  };

  const executeSave = async (overrideData?: InvoiceFormData) => {
    setIsSubmitting(true); setShowDuplicateModal(false);
    const data = overrideData || formData;
    try {
      const saved = await dbService.confirmAndSaveInvoice(data, undefined, id);

      // ── Cheque email reminder sync ──────────────────────────────────────────
      // The reminder is only relevant for cheque invoices with reminder_enabled.
      // A reminder failure must NEVER block or reverse the invoice save — the
      // invoice is already persisted at this point. We surface the error as a
      // warning so the user knows to re-enable the reminder manually.
      const isCheque = saved.payment_mode === 'CHEQUE' || data.payment_mode === 'CHEQUE';
      const reminderEnabled = isCheque && Boolean(data.reminder_enabled);

      if (isCheque) {
        try {
          await chequeReminderService.syncForInvoice(reminderEnabled, {
            invoiceId: saved.id,
            invoiceNumber: saved.invoice_number,
            supplierName: saved.supplier?.name || data.supplier_name,
            amount: Number(saved.grand_total) || 0,
            chequePresentationDate: data.cheque_presentation_date || saved.invoice_date,
            recipientEmail: (data.reminder_email || adminEmail).trim(),
            reminderDate: data.reminder_date || '',
            reminderTime: data.reminder_time || '',
            createdBy: user?.id,
          });
          // Only show "reminder scheduled" confirmation when it was actually requested
          if (reminderEnabled) {
            toastSuccess(
              isEditMode ? 'Invoice updated' : 'Invoice saved',
              `#${saved.invoice_number} recorded. Email reminder scheduled.`
            );
          } else {
            toastSuccess(
              isEditMode ? 'Invoice updated' : 'Invoice saved',
              `#${saved.invoice_number} recorded.`
            );
          }
        } catch (remErr: unknown) {
          // Invoice saved — reminder did not. Tell the user precisely.
          const remMsg =
            remErr instanceof Error ? remErr.message : 'Could not save the cheque email reminder.';
          // Show invoice success FIRST, then reminder warning separately so the
          // user understands the invoice itself is safe.
          toastSuccess(
            isEditMode ? 'Invoice updated' : 'Invoice saved',
            `#${saved.invoice_number} recorded.`
          );
          toastWarning(
            'Email reminder not scheduled',
            `Invoice saved successfully. Reminder failed: ${remMsg}. ` +
              'Please edit this invoice to re-enable the reminder.'
          );
        }
      } else {
        toastSuccess(
          isEditMode ? 'Invoice updated' : 'Invoice saved',
          `#${saved.invoice_number} recorded.`
        );
      }

      setSavedInvoice(saved);
      setShowSuccessModal(true);
    } catch (err: unknown) {
      toastError(isEditMode ? 'Update error' : 'Save error', err instanceof Error ? err.message : 'Error saving.');
    } finally { setIsSubmitting(false); }
  };

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loadingInitial) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="skeleton h-8 w-56 rounded-md" />
        <CardSkeleton /><CardSkeleton />
      </div>
    );
  }

  const chequeMode = formData.payment_mode === 'CHEQUE';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/purchases')}
            icon={<ArrowLeft className="h-4 w-4" />}
            className="-ml-2 mb-1"
          >
            Back to invoices
          </Button>
          <h1 className="page-title">
            {isEditMode ? (
              <><Edit3 className="h-5 w-5 text-brand-600" aria-hidden="true" /> Edit invoice #{formData.invoice_number}</>
            ) : (
              <><Receipt className="h-5 w-5 text-brand-600" aria-hidden="true" /> New purchase invoice</>
            )}
          </h1>
          <p className="page-subtitle">
            {isEditMode
              ? 'Update line items, quantities, rates, memo name, or payment details.'
              : 'Record supplier purchase bills, select items from catalog, maintain purchase history.'}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/purchases')}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleInitiateConfirm}
            isLoading={isSubmitting}
            icon={isEditMode ? <Save className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          >
            {isEditMode ? 'Update invoice' : 'Save invoice'}
          </Button>
        </div>
      </div>

      {/* Offline warning */}
      {!navigator.onLine && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
          No internet connection. Data may not save to the remote database.
        </div>
      )}

      {/* Validation errors */}
      {formValidationErrors.length > 0 && (
        <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-1.5">
          <p className="text-sm font-semibold text-red-900 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" aria-hidden="true" />
            Please fix the following before saving:
          </p>
          <ul className="list-disc list-inside space-y-0.5 pl-2">
            {formValidationErrors.map((err, i) => (
              <li key={i} className="text-sm text-red-700">{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ─── Header metadata card ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-card p-5 space-y-4">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
          <Building2 className="h-4 w-4 text-brand-600" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-slate-900">Invoice header</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Invoice number */}
          <div>
            <label htmlFor="invoice_number" className="block text-sm font-medium text-slate-700 mb-1.5">
              Invoice # <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="invoice_number"
              type="text"
              required
              placeholder="INV-08102026-0001"
              value={formData.invoice_number}
              onChange={(e) => { handleHeaderChange('invoice_number', e.target.value); if (formValidationErrors.length) setFormValidationErrors([]); }}
              className={inputCls}
            />
          </div>

          {/* Invoice name */}
          <div>
            <label htmlFor="invoice_name" className="block text-sm font-medium text-slate-700 mb-1.5">
              Invoice name <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <select
                id="invoice_name"
                value={formData.invoice_name || 'RAMACHANDRAN'}
                onChange={(e) => handleHeaderChange('invoice_name', e.target.value)}
                className={inputCls + ' appearance-none pr-8 cursor-pointer'}
              >
                {INVOICE_NAME_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                {formData.invoice_name && !INVOICE_NAME_OPTIONS.includes(formData.invoice_name as never) && (
                  <option value={formData.invoice_name}>{formData.invoice_name}</option>
                )}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400" aria-hidden="true">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          {/* Invoice date */}
          <div>
            <label htmlFor="invoice_date" className="block text-sm font-medium text-slate-700 mb-1.5">
              Invoice date <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="invoice_date"
              type="date"
              required
              value={formData.invoice_date}
              onChange={(e) => { handleHeaderChange('invoice_date', e.target.value); if (formValidationErrors.length) setFormValidationErrors([]); }}
              className={inputCls}
            />
          </div>

          {/* Payment mode */}
          <div>
            <label htmlFor="payment_mode" className="block text-sm font-medium text-slate-700 mb-1.5">Payment mode</label>
            <div className="relative">
              <select
                id="payment_mode"
                value={formData.payment_mode === 'CHEQUE' ? 'CHEQUE' : 'CASH'}
                onChange={(e) => {
                  const mode = e.target.value;
                  handleHeaderChange('payment_mode', mode);
                  if (mode === 'CHEQUE') {
                    // A cheque never settles the invoice on hand-over.
                    handleHeaderChange('payment_status', 'UNPAID');
                  } else {
                    handleHeaderChange('payment_status', 'PAID');
                    handleHeaderChange('reminder_enabled', false);
                  }
                }}
                className={inputCls + ' appearance-none pr-8 cursor-pointer'}
              >
                <option value="CASH">Cash</option>
                <option value="CHEQUE">Cheque</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400" aria-hidden="true">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          {/* Payment status */}
          <div>
            <label htmlFor="payment_status" className="block text-sm font-medium text-slate-700 mb-1.5">Payment status</label>
            <div className="relative">
              <select
                id="payment_status"
                value={formData.payment_status === 'PAID' ? 'PAID' : 'UNPAID'}
                onChange={(e) => handleHeaderChange('payment_status', e.target.value)}
                className={inputCls + ' appearance-none pr-8 cursor-pointer'}
              >
                <option value="PAID">Paid</option>
                <option value="UNPAID">Unpaid</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400" aria-hidden="true">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>
        </div>

        {/* Cheque presentation date row */}
        {chequeMode && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
              <div>
                <label htmlFor="cheque_presentation_date" className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
                  Cheque presentation date <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="cheque_presentation_date"
                  type="date"
                  required
                  value={formData.cheque_presentation_date || formData.invoice_date}
                  onChange={(e) => handleHeaderChange('cheque_presentation_date', e.target.value)}
                  className={inputCls}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Date the cheque is presented to the bank. The invoice clears automatically on this date ({formatDisplayDate(formData.cheque_presentation_date || formData.invoice_date)}).
                </p>
              </div>
            </div>

            <ChequeReminderSection
              enabled={Boolean(formData.reminder_enabled)}
              onEnabledChange={(v) => handleHeaderChange('reminder_enabled', v)}
              reminderDate={formData.reminder_date || ''}
              reminderTime={formData.reminder_time || ''}
              onDateChange={(v) => handleHeaderChange('reminder_date', v)}
              onTimeChange={(v) => handleHeaderChange('reminder_time', v)}
              email={formData.reminder_email || adminEmail}
              onEmailChange={(v) => handleHeaderChange('reminder_email', v)}
              defaultEmail={adminEmail}
              showErrors={formValidationErrors.length > 0}
            />
          </>
        )}
      </div>

      {/* ─── Line items card ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Package className="h-4 w-4 text-brand-600" aria-hidden="true" />
              Line items ({formData.items.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Bill Total = Packs × Purchase Rate (auto-calculated)
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            icon={<Plus className="h-3.5 w-3.5" />}
          >
            Add item
          </Button>
        </div>

        {/* Mobile cards */}
        <div className="lg:hidden space-y-3">
          {formData.items.map((item, idx) => {
            const isCustom = item.supplier_item_name && !products.some((p) => p.supplier_item_name === item.supplier_item_name);
            const hasError = !item.supplier_item_name || (item.pack_qty || 0) <= 0;
            return (
              <div key={idx} className={`p-4 rounded-lg border space-y-3 ${hasError ? 'border-red-200 bg-red-50/30' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Item {idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    disabled={formData.items.length <= 1}
                    aria-label={`Remove item ${idx + 1}`}
                    className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30 rounded-md hover:bg-red-50 min-w-[32px] min-h-[32px] flex items-center justify-center"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Product <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <select
                    value={isCustom ? '__custom__' : (item.supplier_item_name || '')}
                    onChange={(e) => e.target.value === '__custom__' ? handleItemChange(idx, 'supplier_item_name', 'Custom Item') : handleProductSelect(idx, e.target.value)}
                    className={`${inputCls} ${!item.supplier_item_name ? 'border-red-400' : ''} appearance-none`}
                  >
                    <option value="">— Select product —</option>
                    {products.map((p) => <option key={p.id} value={p.supplier_item_name}>{p.nickname}</option>)}
                    <option value="__custom__">+ Custom item</option>
                  </select>
                  {isCustom && (
                    <input
                      type="text"
                      placeholder="Enter custom item name..."
                      value={item.supplier_item_name || ''}
                      onChange={(e) => handleItemChange(idx, 'supplier_item_name', e.target.value)}
                      className={`${inputCls} mt-2`}
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Packs</label>
                    <input type="number" min="1" placeholder="100" value={item.pack_qty || ''} onChange={(e) => handleItemChange(idx, 'pack_qty', e.target.value)} className={`${inputCls} text-right`} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">MRP (₹)</label>
                    <input type="number" min="0" step="0.01" placeholder="0.00" value={item.mrp_rsp || ''} onChange={(e) => handleItemChange(idx, 'mrp_rsp', e.target.value)} className={`${inputCls} text-right`} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Rate (₹)</label>
                    <input type="number" min="0" step="0.01" placeholder="0.00" value={item.each_pack_rate || item.purchase_rate || ''} onChange={(e) => handleItemChange(idx, 'each_pack_rate', e.target.value)} className={`${inputCls} text-right font-semibold text-brand-700`} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Total (₹)</label>
                    <input type="number" min="0" step="0.01" placeholder="0.00" value={item.invoice_amount || item.total || ''} onChange={(e) => handleItemChange(idx, 'invoice_amount', e.target.value)} className={`${inputCls} text-right font-semibold`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden lg:block overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-10">#</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[240px]">Product</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">Packs</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-28">MRP (₹)</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Rate (₹)</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Total (₹)</th>
                <th scope="col" className="px-4 py-3 w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {formData.items.map((item, idx) => {
                const isCustom = item.supplier_item_name && !products.some((p) => p.supplier_item_name === item.supplier_item_name);
                const hasError = !item.supplier_item_name;
                return (
                  <tr key={idx} className={hasError ? 'bg-red-50/20' : 'hover:bg-slate-50 transition-colors'}>
                    <td className="px-4 py-2.5 text-xs font-mono text-slate-400 text-center">{idx + 1}</td>
                    <td className="px-4 py-2.5">
                      <select
                        value={isCustom ? '__custom__' : (item.supplier_item_name || '')}
                        onChange={(e) => e.target.value === '__custom__' ? handleItemChange(idx, 'supplier_item_name', 'Custom Item') : handleProductSelect(idx, e.target.value)}
                        className={[
                          'w-full h-8 rounded-md border bg-white px-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 appearance-none cursor-pointer',
                          !item.supplier_item_name ? 'border-red-400' : 'border-slate-200',
                        ].join(' ')}
                        aria-label={`Product for item ${idx + 1}`}
                      >
                        <option value="">— Select product —</option>
                        {products.map((p) => <option key={p.id} value={p.supplier_item_name}>{p.nickname}</option>)}
                        <option value="__custom__">+ Custom item</option>
                      </select>
                      {isCustom && (
                        <input
                          type="text"
                          placeholder="Custom item name..."
                          value={item.supplier_item_name || ''}
                          onChange={(e) => handleItemChange(idx, 'supplier_item_name', e.target.value)}
                          className="mt-1 h-8 w-full rounded-md border border-brand-300 bg-white px-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                        />
                      )}
                    </td>
                    {/* Packs */}
                    <td className="px-4 py-2.5">
                      <input type="number" min="1" step="1" placeholder="100" value={item.pack_qty || ''} onChange={(e) => handleItemChange(idx, 'pack_qty', e.target.value)}
                        className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-right text-sm font-mono font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600" />
                    </td>
                    {/* MRP */}
                    <td className="px-4 py-2.5">
                      <input type="number" min="0" step="0.01" placeholder="0.00" value={item.mrp_rsp || ''} onChange={(e) => handleItemChange(idx, 'mrp_rsp', e.target.value)}
                        className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-right text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600" />
                    </td>
                    {/* Rate */}
                    <td className="px-4 py-2.5">
                      <input type="number" min="0" step="0.01" placeholder="0.00" value={item.each_pack_rate || item.purchase_rate || ''} onChange={(e) => handleItemChange(idx, 'each_pack_rate', e.target.value)}
                        className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-right text-sm font-mono font-semibold text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600" />
                    </td>
                    {/* Total */}
                    <td className="px-4 py-2.5">
                      <input type="number" min="0" step="0.01" placeholder="0.00" value={item.invoice_amount || item.total || ''} onChange={(e) => handleItemChange(idx, 'invoice_amount', e.target.value)}
                        className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-right text-sm font-mono font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600" />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={formData.items.length <= 1}
                        aria-label={`Remove item ${idx + 1}`}
                        className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30 rounded-md hover:bg-red-50 min-w-[32px] min-h-[32px] flex items-center justify-center mx-auto"
                      >
                        <Trash2 className="h-4 w-4" />
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
          icon={<Plus className="h-3.5 w-3.5" />}
          className="w-full justify-center"
        >
          Add line item
        </Button>
      </div>

      {/* ─── Totals summary card ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 pb-4 border-b border-slate-100">
          Invoice totals
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Line items</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
              {formData.items.length}
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total packs</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-violet-700 mt-1.5">
              {(formData.total_packs || 0).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="p-4 bg-brand-50 rounded-lg border border-brand-200">
            <p className="text-xs font-medium text-brand-700 uppercase tracking-wide">Grand total</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-brand-800 mt-1.5">
              ₹{formatINR(formData.grand_total)}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={() => navigate('/purchases')} className="sm:w-auto justify-center">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleInitiateConfirm}
            isLoading={isSubmitting}
            icon={isEditMode ? <Save className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            className="sm:w-auto justify-center"
          >
            {isEditMode ? 'Update invoice' : 'Save invoice'}
          </Button>
        </div>
      </div>

      {/* ─── Mobile sticky footer ──────────────────────────────────────────────── */}
      <div className="lg:hidden no-print fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 shadow-xl p-3 pb-safe z-30 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">Total</p>
          <p className="text-base font-bold font-mono tabular-nums text-brand-700">₹{formatINR(formData.grand_total)}</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleInitiateConfirm}
          isLoading={isSubmitting}
          icon={isEditMode ? <Save className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
        >
          {isEditMode ? 'Update' : 'Save invoice'}
        </Button>
      </div>

      {/* ─── Duplicate warning modal ───────────────────────────────────────────── */}
      <Modal
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        title="Possible duplicate invoice"
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowDuplicateModal(false)}>
              Cancel & review
            </Button>
            <Button variant="danger" size="sm" onClick={() => executeSave()} isLoading={isSubmitting}>
              Save anyway
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Invoice #{formData.invoice_number} already exists
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                An invoice with this number and supplier was already recorded.
              </p>
            </div>
          </div>
          {existingDuplicate && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono space-y-1">
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Date:</span>
                <span className="font-semibold">{formatDisplayDate(existingDuplicate.invoice_date)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Total:</span>
                <span className="font-semibold">₹{formatINR(existingDuplicate.grand_total)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Recorded:</span>
                <span className="font-semibold">{formatISTTimestamp(existingDuplicate.created_at)}</span>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ─── Save success modal ────────────────────────────────────────────────── */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => { setShowSuccessModal(false); if (savedInvoice) navigate(`/purchases/${savedInvoice.id}`); }}
        title={isEditMode ? 'Invoice updated' : 'Invoice saved'}
        size="sm"
        footer={
          <div className="flex items-center gap-2 w-full justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowSuccessModal(false);
                if (isEditMode) { navigate('/purchases'); }
                else { setSavedInvoice(null); setFormData(createBlankInvoice()); loadMetadata(); }
              }}
              icon={<Plus className="h-3.5 w-3.5" />}
            >
              {isEditMode ? 'Back to invoices' : 'New invoice'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => { setShowSuccessModal(false); if (savedInvoice) navigate(`/purchases/${savedInvoice.id}`); else navigate('/purchases'); }}
              icon={<Eye className="h-3.5 w-3.5" />}
            >
              View invoice
            </Button>
          </div>
        }
      >
        <div className="text-center py-2 space-y-4">
          <div className="w-14 h-14 mx-auto rounded-xl bg-green-50 border border-green-200 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {isEditMode ? 'Invoice updated successfully' : 'Invoice saved successfully'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Recorded in your database ledger.
            </p>
          </div>
          {savedInvoice && (
            <div className="text-left p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono space-y-1.5">
              <div className="flex justify-between gap-2 pb-1.5 border-b border-slate-200">
                <span className="text-slate-500">Invoice #</span>
                <span className="font-semibold text-slate-900">{savedInvoice.invoice_number}</span>
              </div>
              {savedInvoice.invoice_name && (
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Name</span>
                  <span className="font-semibold text-brand-700">{savedInvoice.invoice_name}</span>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Date</span>
                <span className="font-semibold">{formatDisplayDate(savedInvoice.invoice_date)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Supplier</span>
                <span className="font-semibold">{savedInvoice.supplier?.name || 'AYYAPPA ENTERPRISES'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Items</span>
                <span className="font-semibold">
                  {savedInvoice.items?.length || 0} items, {savedInvoice.items?.reduce((s, it) => s + (Number(it.quantity) || 0), 0) || 0} packs
                </span>
              </div>
              <div className="flex justify-between gap-2 pt-1.5 border-t border-slate-200 text-sm">
                <span className="font-semibold text-slate-900">Grand total</span>
                <span className="font-bold text-brand-700">₹{formatINR(savedInvoice.grand_total)}</span>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
