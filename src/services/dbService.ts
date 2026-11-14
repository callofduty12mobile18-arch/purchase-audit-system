import { supabase } from '../integrations/supabase/client';
import { getTodayIST, generateISTInvoiceNumber, formatINR } from '../utils/dateUtils';
import {
  Supplier,
  Product,
  Category,
  PurchaseInvoice,
  PurchaseItem,
  PriceHistory,
  AuditLog,
  InvoiceFormData,
  PaymentStatus,
  ChequeStatus
} from '../types';

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// All data is dynamically fetched from and synced directly with Supabase database.
// Empty fallback arrays preserved for type-signature backward compatibility only.
export const DEFAULT_SUPPLIERS: Supplier[] = [];
export const DEFAULT_17_PRODUCTS: Product[] = [];
export const DEFAULT_PRODUCTS: Product[] = [];

export const dbService = {
  // Clear all data directly from Supabase remote database
  clearAllData: async (): Promise<void> => {
    // Purge any residual legacy localStorage keys
    try {
      localStorage.removeItem('ramachandran_products_v1');
      localStorage.removeItem('ramachandran_suppliers_v1');
      localStorage.removeItem('ramachandran_invoices_v1');
      localStorage.removeItem('ramachandran_audit_v1');
      localStorage.removeItem('ramachandran_price_history_v1');
      localStorage.removeItem('ramachandran_invoice_payments_v1');
      localStorage.removeItem('ramachandran_sales_v1');
    } catch {
      // Ignore
    }

    try {
      try {
        await supabase.from('sales').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      } catch {}
      await supabase.from('invoice_payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('purchase_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('purchase_invoice_documents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('purchase_invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('price_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('stock_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('suppliers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (e) {
      console.error('Supabase remote clear error:', e);
      throw e;
    }
  },

  // --- SUPPLIERS ---
  getSuppliers: async (): Promise<Supplier[]> => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name');
    if (error) {
      console.error('Supabase suppliers fetch error:', error);
      throw error;
    }
    return (data || []) as Supplier[];
  },

  getSupplierById: async (id: string): Promise<Supplier | null> => {
    if (!id) return null;
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      console.error('Supabase supplier by id error:', error);
      return null;
    }
    return data as Supplier | null;
  },

  saveSupplier: async (supplier: Partial<Supplier>): Promise<Supplier> => {
    const now = new Date().toISOString();
    const isExistingUUID = Boolean(supplier.id && supplier.id.length === 36 && supplier.id.includes('-'));

    // Check existing supplier in database for accurate audit diff
    let existingSupplier: Supplier | null = null;
    if (isExistingUUID && supplier.id) {
      existingSupplier = await dbService.getSupplierById(supplier.id);
    } else if (supplier.name) {
      const { data } = await supabase
        .from('suppliers')
        .select('*')
        .ilike('name', supplier.name.trim())
        .maybeSingle();
      if (data) {
        existingSupplier = data as Supplier;
      }
    }

    const id = existingSupplier?.id || (isExistingUUID ? supplier.id! : generateUUID());
    const newRecord: Supplier = {
      id,
      name: supplier.name?.trim() || existingSupplier?.name || 'Vendor',
      gstin: supplier.gstin !== undefined ? supplier.gstin.trim() : (existingSupplier?.gstin || ''),
      address: supplier.address !== undefined ? supplier.address : (existingSupplier?.address || ''),
      phone: supplier.phone !== undefined ? supplier.phone : (existingSupplier?.phone || ''),
      email: supplier.email !== undefined ? supplier.email : (existingSupplier?.email || ''),
      payment_terms: supplier.payment_terms || existingSupplier?.payment_terms || 'CREDIT',
      notes: supplier.notes !== undefined ? supplier.notes : (existingSupplier?.notes || ''),
      is_active: supplier.is_active ?? existingSupplier?.is_active ?? true,
      created_at: existingSupplier?.created_at || supplier.created_at || now,
      updated_at: now
    };

    const { error } = await supabase
      .from('suppliers')
      .upsert(newRecord);

    if (error) {
      console.error('Supabase supplier upsert error:', error);
      throw error;
    }

    const oldSupplierVal = existingSupplier ? {
      name: existingSupplier.name,
      gstin: existingSupplier.gstin,
      payment_terms: existingSupplier.payment_terms,
      phone: existingSupplier.phone
    } : null;

    const newSupplierVal = {
      name: newRecord.name,
      gstin: newRecord.gstin,
      payment_terms: newRecord.payment_terms,
      phone: newRecord.phone
    };

    await dbService.logAudit(
      existingSupplier ? 'SUPPLIER_UPDATED' : 'SUPPLIER_CREATED',
      'suppliers',
      newRecord.id,
      oldSupplierVal,
      newSupplierVal,
      `Saved supplier record: ${newRecord.name} (GSTIN: ${newRecord.gstin || 'N/A'})`
    );

    return newRecord;
  },

  // --- PRODUCTS & CATEGORIES ---
  getCategories: async (): Promise<Category[]> => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    if (error) {
      console.error('Supabase categories fetch error:', error);
      return [];
    }
    return (data || []) as Category[];
  },

  getProducts: async (): Promise<Product[]> => {
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .order('nickname');

    if (error) {
      console.error('Supabase products fetch error:', error);
      throw error;
    }

    return (data || []) as Product[];
  },

  getProductById: async (id: string): Promise<Product | null> => {
    if (!id) return null;
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Supabase getProductById error:', error);
      return null;
    }

    return data as Product | null;
  },

  saveProduct: async (product: Partial<Product>, priceChangeReason?: string, skipAuditLog = false): Promise<Product> => {
    const now = new Date().toISOString();
    let existing: Product | null = null;
    if (product.id && product.id.length === 36 && product.id.includes('-')) {
      existing = await dbService.getProductById(product.id);
    } else if (product.supplier_item_name) {
      const { data } = await supabase
        .from('products')
        .select('*')
        .ilike('supplier_item_name', product.supplier_item_name.trim())
        .maybeSingle();
      if (data) {
        existing = data as Product;
      }
    }

    const id = existing?.id || (product.id && product.id.length === 36 && product.id.includes('-') ? product.id : generateUUID());
    const oldPrice = existing?.current_purchase_ref_price;

    const savedProd: Product = {
      id,
      supplier_item_name: product.supplier_item_name?.trim() || existing?.supplier_item_name || 'Item',
      nickname: product.nickname?.trim() || existing?.nickname || product.supplier_item_name?.trim() || 'Item',
      sku: product.sku || existing?.sku,
      barcode: product.barcode || existing?.barcode,
      hsn: product.hsn || existing?.hsn || '24022090',
      uom: product.uom || existing?.uom || 'PAC',
      current_purchase_ref_price: product.current_purchase_ref_price ?? existing?.current_purchase_ref_price ?? 0,
      current_selling_price: product.current_selling_price ?? existing?.current_selling_price ?? 0,
      min_stock_level: product.min_stock_level ?? existing?.min_stock_level ?? 5,
      is_active: product.is_active ?? existing?.is_active ?? true,
      created_at: existing?.created_at || now,
      updated_at: now
    };

    const { error } = await supabase
      .from('products')
      .upsert(savedProd);

    if (error) {
      console.error('Supabase product upsert error:', error);
      throw error;
    }

    if (
      oldPrice !== undefined &&
      savedProd.current_purchase_ref_price !== undefined &&
      savedProd.current_purchase_ref_price !== oldPrice
    ) {
      await dbService.addPriceHistory({
        product_id: savedProd.id,
        price_type: 'PURCHASE_REF',
        old_value: oldPrice,
        new_value: savedProd.current_purchase_ref_price,
        effective_from: now,
        reason: priceChangeReason || 'Manual reference price update',
      });
    }

    const oldProdVal = existing ? {
      supplier_item_name: existing.supplier_item_name,
      nickname: existing.nickname,
      current_purchase_ref_price: existing.current_purchase_ref_price,
      current_selling_price: existing.current_selling_price,
      min_stock_level: existing.min_stock_level,
      uom: existing.uom,
      hsn: existing.hsn
    } : null;

    const newProdVal = {
      supplier_item_name: savedProd.supplier_item_name,
      nickname: savedProd.nickname,
      current_purchase_ref_price: savedProd.current_purchase_ref_price,
      current_selling_price: savedProd.current_selling_price,
      min_stock_level: savedProd.min_stock_level,
      uom: savedProd.uom,
      hsn: savedProd.hsn
    };

    const auditReasonText = priceChangeReason
      ? `${priceChangeReason}: ${savedProd.nickname} (Ref Rate: ₹${savedProd.current_purchase_ref_price})`
      : `Saved product: ${savedProd.nickname} (${savedProd.supplier_item_name})`;

    if (!skipAuditLog) {
      await dbService.logAudit(
        existing ? 'PRODUCT_UPDATED' : 'PRODUCT_CREATED',
        'products',
        savedProd.id,
        oldProdVal,
        newProdVal,
        auditReasonText
      );
    }

    return savedProd;
  },

  // --- INVOICES & PURCHASES ---
  getInvoices: async (): Promise<PurchaseInvoice[]> => {
    const { data, error } = await supabase
      .from('purchase_invoices')
      .select('*, supplier:suppliers(*), items:purchase_items(*, product:products(*))')
      .order('invoice_date', { ascending: false });

    if (error) {
      console.error('Supabase invoices fetch error:', error);
      throw error;
    }

    const invoices = (data || []) as PurchaseInvoice[];
    for (const inv of invoices) {
      if (inv.items) {
        inv.items = inv.items.map((it) => {
          const qty = Number(it.quantity) || 0;
          const tot = Number(it.total) || 0;
          if (qty > 0 && tot > 0) {
            it.purchase_rate = tot / qty;
          }
          return it;
        });
      }
    }

    return invoices;
  },

  getInvoiceById: async (id: string): Promise<PurchaseInvoice | null> => {
    if (!id) return null;

    const { data, error } = await supabase
      .from('purchase_invoices')
      .select('*, supplier:suppliers(*), items:purchase_items(*, product:products(*))')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Supabase single invoice fetch error:', error);
      throw error;
    }

    const inv = data as PurchaseInvoice | null;
    if (inv && inv.items) {
      inv.items = inv.items.map((it) => {
        const qty = Number(it.quantity) || 0;
        const tot = Number(it.total) || 0;
        if (qty > 0 && tot > 0) {
          it.purchase_rate = tot / qty;
        }
        return it;
      });
    }

    return inv;
  },

  checkDuplicateInvoice: async (supplierId: string, invoiceNumber: string, invoiceDate?: string, excludeInvoiceId?: string): Promise<PurchaseInvoice | null> => {
    if (!supplierId || !invoiceNumber) return null;
    let query = supabase
      .from('purchase_invoices')
      .select('*, supplier:suppliers(*)')
      .eq('supplier_id', supplierId)
      .ilike('invoice_number', invoiceNumber.trim());

    if (invoiceDate) {
      query = query.eq('invoice_date', invoiceDate);
    }
    if (excludeInvoiceId) {
      query = query.neq('id', excludeInvoiceId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      console.warn('Check duplicate invoice query warning:', error);
      return null;
    }
    return (data as PurchaseInvoice) || null;
  },

  confirmAndSaveInvoice: async (extractedData: InvoiceFormData, _documentPath?: string, existingInvoiceId?: string): Promise<PurchaseInvoice> => {
    const now = new Date().toISOString();
    const isEdit = Boolean(existingInvoiceId);
    const invoiceId = existingInvoiceId || generateUUID();

    // Fetch previous invoice if editing for audit log diff
    let oldInvoice: PurchaseInvoice | null = null;
    if (isEdit) {
      oldInvoice = await dbService.getInvoiceById(invoiceId);
    }

    // Resolve or create supplier directly in DB
    const suppliers = await dbService.getSuppliers();
    let supplier = suppliers.find(
      s => s.name.trim().toLowerCase() === (extractedData.supplier_name || '').trim().toLowerCase()
    );

    if (!supplier) {
      supplier = await dbService.saveSupplier({
        name: extractedData.supplier_name?.trim() || 'Vendor',
        gstin: extractedData.supplier_gstin?.trim() || ''
      });
    }

    // 1. Process and Insert Line Items & Auto-map Products
    const itemsToInsert: PurchaseItem[] = [];

    for (const itemData of extractedData.items) {
      const effectiveQty = Number(itemData.pack_qty || itemData.quantity || itemData.qty) || 1;
      const lineTotal = Number(itemData.invoice_amount || itemData.total || 0);
      const effectiveRate = (effectiveQty > 0 && lineTotal > 0)
        ? (lineTotal / effectiveQty)
        : (Number(itemData.each_pack_rate || itemData.purchase_rate) || 0);
      const sellingPrice = Number(itemData.mrp_rsp) || Math.round(effectiveRate * 1.3);

      const savedProduct = await dbService.saveProduct({
        id: itemData.product_id,
        supplier_item_name: itemData.supplier_item_name || itemData.item_name,
        nickname: itemData.item_name || itemData.supplier_item_name,
        hsn: itemData.hsn,
        uom: itemData.uom || 'PAC',
        current_purchase_ref_price: effectiveRate,
        current_selling_price: sellingPrice,
        min_stock_level: 5,
        is_active: true
      }, undefined, true);

      const taxableVal = Number(itemData.taxable_value) || Number((lineTotal / 1.4).toFixed(2));
      const totTax = Number(itemData.total_tax) || Number((lineTotal - taxableVal).toFixed(2));
      const cgstVal = Number(itemData.cgst) || Number((totTax / 2).toFixed(2));
      const sgstVal = Number(itemData.sgst) || Number((totTax - cgstVal).toFixed(2));

      const itemId = generateUUID();
      itemsToInsert.push({
        id: itemId,
        purchase_invoice_id: invoiceId,
        product_id: savedProduct.id,
        product: savedProduct,
        supplier_item_name_snapshot: itemData.supplier_item_name || itemData.item_name || savedProduct.supplier_item_name,
        hsn_snapshot: itemData.hsn || savedProduct.hsn,
        quantity: effectiveQty,
        uom_snapshot: itemData.uom || 'PAC',
        purchase_rate: effectiveRate,
        gst_rate: Number(itemData.gst_rate) || 40,
        taxable_value: taxableVal,
        cgst: cgstVal,
        sgst: sgstVal,
        igst: Number(itemData.igst) || 0,
        total: lineTotal,
        created_at: now
      });
    }

    const invoiceNumber = extractedData.invoice_number?.trim() || (isEdit && oldInvoice ? oldInvoice.invoice_number : generateISTInvoiceNumber());

    const validPaymentModes = ['CASH', 'UPI', 'BANK_TRANSFER', 'CREDIT', 'CHEQUE', 'OTHER'];
    const safePaymentMode = (extractedData.payment_mode && validPaymentModes.includes(extractedData.payment_mode))
      ? (extractedData.payment_mode as any)
      : 'CASH';

    const isChequeMode = safePaymentMode === 'CHEQUE';
    const wasCleared = oldInvoice?.cheque_status === 'CLEARED' || oldInvoice?.payment_status === 'PAID';
    const safePaymentStatus: PaymentStatus = extractedData.payment_status === 'PARTIALLY_PAID'
      ? 'PARTIALLY_PAID'
      : isChequeMode
        ? (wasCleared ? 'PAID' : 'UNPAID')
        : (extractedData.payment_status === 'UNPAID' ? 'UNPAID' : 'PAID');

    const chequeStatus: ChequeStatus | null = isChequeMode
      ? (wasCleared ? 'CLEARED' : 'PENDING')
      : null;
    const chequePresentationDate = isChequeMode
      ? (extractedData.cheque_presentation_date || extractedData.invoice_date || getTodayIST())
      : null;
    const chequeAmount = isChequeMode
      ? Number((Number(extractedData.grand_total) || 0).toFixed(2))
      : null;

    const effectiveInvoiceName = extractedData.invoice_name?.trim() || '';

    // If updating, delete existing items from remote table to cleanly replace with new line items
    if (isEdit) {
      await supabase.from('purchase_items').delete().eq('purchase_invoice_id', invoiceId);
    }

    const invoiceRow = {
      id: invoiceId,
      supplier_id: supplier.id,
      invoice_number: invoiceNumber,
      invoice_name: effectiveInvoiceName,
      invoice_date: extractedData.invoice_date || getTodayIST(),
      payment_mode: safePaymentMode,
      payment_status: safePaymentStatus,
      cheque_status: chequeStatus,
      cheque_amount: chequeAmount,
      cheque_presentation_date: chequePresentationDate,
      bank_name: extractedData.bank_name || null,
      subtotal: extractedData.subtotal,
      taxable_amount: extractedData.taxable_amount,
      cgst: extractedData.cgst,
      sgst: extractedData.sgst,
      igst: extractedData.igst,
      total_tax: extractedData.total_tax,
      round_off: extractedData.round_off,
      grand_total: extractedData.grand_total,
      verification_status: 'VERIFIED',
      ocr_status: (isEdit && oldInvoice ? oldInvoice.ocr_status : 'MANUAL'),
      created_at: oldInvoice?.created_at || now,
      updated_at: now
    };

    const { error: invErr } = await supabase
      .from('purchase_invoices')
      .upsert(invoiceRow);

    if (invErr) {
      console.error('Supabase purchase_invoices upsert error:', invErr);
      throw invErr;
    }

    // Insert line items directly to Supabase
    if (itemsToInsert.length > 0) {
      const { error: itemsErr } = await supabase
        .from('purchase_items')
        .upsert(
          itemsToInsert.map(i => ({
            id: i.id,
            purchase_invoice_id: invoiceId,
            product_id: (i.product_id && i.product_id.length === 36 && i.product_id.includes('-')) ? i.product_id : null,
            supplier_item_name_snapshot: i.supplier_item_name_snapshot,
            hsn_snapshot: i.hsn_snapshot,
            quantity: i.quantity,
            uom_snapshot: i.uom_snapshot || 'PAC',
            purchase_rate: i.purchase_rate,
            gst_rate: i.gst_rate || 0,
            taxable_value: i.taxable_value || 0,
            cgst: i.cgst || 0,
            sgst: i.sgst || 0,
            igst: i.igst || 0,
            total: i.total,
            created_at: now
          }))
        );
      if (itemsErr) {
        console.error('Supabase purchase_items upsert error:', itemsErr);
        throw itemsErr;
      }
    }

    const savedInvoice: PurchaseInvoice = {
      ...invoiceRow,
      supplier,
      items: itemsToInsert,
      payment_mode: safePaymentMode,
      payment_status: safePaymentStatus,
      verification_status: 'VERIFIED'
    };

    // Audit Log directly in database
    if (isEdit) {
      await dbService.logAudit(
        'INVOICE_UPDATED',
        'purchase_invoices',
        invoiceId,
        oldInvoice ? { invoice_number: oldInvoice.invoice_number, grand_total: oldInvoice.grand_total, item_count: oldInvoice.items?.length } : null,
        { invoice_number: savedInvoice.invoice_number, grand_total: savedInvoice.grand_total, item_count: itemsToInsert.length },
        `Updated purchase invoice #${savedInvoice.invoice_number} from ${supplier.name}`
      );
    } else {
      await dbService.logAudit(
        'INVOICE_CONFIRMED',
        'purchase_invoices',
        invoiceId,
        null,
        { invoice_number: savedInvoice.invoice_number, grand_total: savedInvoice.grand_total, item_count: itemsToInsert.length },
        `Confirmed purchase invoice #${savedInvoice.invoice_number} from ${supplier.name}`
      );
    }

    return savedInvoice;
  },

  updateInvoice: async (id: string, extractedData: InvoiceFormData): Promise<PurchaseInvoice> => {
    return dbService.confirmAndSaveInvoice(extractedData, undefined, id);
  },

  deleteInvoice: async (id: string): Promise<boolean> => {
    const targetInvoice = await dbService.getInvoiceById(id);

    // Delete child records and parent directly in Supabase
    try {
      await supabase.from('invoice_payments').delete().eq('invoice_id', id);
      await supabase.from('purchase_items').delete().eq('purchase_invoice_id', id);
      await supabase.from('purchase_invoice_documents').delete().eq('purchase_invoice_id', id);
      const { error } = await supabase.from('purchase_invoices').delete().eq('id', id);
      if (error) {
        console.error('Supabase delete invoice error:', error.message);
        throw error;
      }

      // Re-evaluate affected products' reference rates and selling prices
      if (targetInvoice?.items && targetInvoice.items.length > 0) {
        try {
          const affectedProductIds = Array.from(new Set(targetInvoice.items.map((i) => i.product_id).filter(Boolean))) as string[];
          for (const prodId of affectedProductIds) {
            const { data: remainingItems } = await supabase
              .from('purchase_items')
              .select('purchase_rate, total, quantity, purchase_invoices(invoice_date)')
              .eq('product_id', prodId);

            if (remainingItems && remainingItems.length > 0) {
              remainingItems.sort((a, b) => ((b.purchase_invoices as any)?.invoice_date || '').localeCompare((a.purchase_invoices as any)?.invoice_date || ''));
              const latest = remainingItems[0];
              const latestRate = Number(latest.purchase_rate) || (Number(latest.quantity) > 0 ? Number(latest.total) / Number(latest.quantity) : 0);
              if (latestRate > 0) {
                const { data: prodData } = await supabase.from('products').select('nickname').eq('id', prodId).single();
                const isFilter = (prodData?.nickname || '').toLowerCase().includes('filter');
                await supabase.from('products').update({
                  current_purchase_ref_price: Number(latestRate.toFixed(2)),
                  current_selling_price: isFilter && latestRate <= 120 ? 118 : undefined,
                  updated_at: new Date().toISOString()
                }).eq('id', prodId);
              }
            }
          }
        } catch (syncErr) {
          console.warn('Failed to re-sync product prices after invoice deletion:', syncErr);
        }
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('revenue-data-invalidated'));
      }
    } catch (e) {
      console.error('Supabase delete invoice exception:', e);
      throw e;
    }

    // Record permanent immutable audit trail event for deletion in DB
    if (targetInvoice) {
      await dbService.logAudit(
        'INVOICE_DELETED',
        'purchase_invoices',
        id,
        {
          invoice_number: targetInvoice.invoice_number,
          supplier_name: targetInvoice.supplier?.name,
          grand_total: targetInvoice.grand_total,
          item_count: targetInvoice.items?.length || 0,
          invoice_date: targetInvoice.invoice_date
        },
        null,
        `Deleted purchase invoice #${targetInvoice.invoice_number} (₹${formatINR(targetInvoice.grand_total)})`
      );
    }

    return true;
  },

  // --- PRICE HISTORY ---
  getPriceHistory: async (): Promise<PriceHistory[]> => {
    const { data, error } = await supabase
      .from('price_history')
      .select('*, product:products(*)')
      .order('changed_at', { ascending: false });
    if (error) {
      console.error('Supabase price_history fetch error:', error);
      return [];
    }
    return (data || []) as PriceHistory[];
  },

  addPriceHistory: async (entry: Omit<PriceHistory, 'id' | 'changed_at'>): Promise<PriceHistory> => {
    const now = new Date().toISOString();
    const id = generateUUID();
    const newEntry: PriceHistory = {
      id,
      ...entry,
      changed_at: now
    };

    const { error } = await supabase
      .from('price_history')
      .insert(newEntry);

    if (error) {
      console.error('Supabase price history insert error:', error);
      throw error;
    }

    return newEntry;
  },

  // --- AUDIT LOGS ---
  getAuditLogs: async (): Promise<AuditLog[]> => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Supabase audit logs fetch error:', error);
      throw error;
    }

    let allLogs = (data || []) as AuditLog[];
    allLogs = allLogs.filter(l => {
      if (l.action === 'PRODUCT_UPDATED' && (l.reason?.startsWith('Invoice #') || l.reason?.toLowerCase().includes('invoice #'))) {
        return false;
      }
      return true;
    });

    return allLogs;
  },

  logAudit: async (
    action: string,
    entityType: string,
    entityId?: string,
    oldValue?: Record<string, unknown> | null,
    newValue?: Record<string, unknown> | null,
    reason?: string
  ): Promise<void> => {
    const now = new Date().toISOString();
    const id = generateUUID();
    const validEntityId = (entityId && entityId.length === 36 && entityId.includes('-')) ? entityId : undefined;

    let userEmail = 'polonium84r@gmail.com';
    let userId: string | undefined = undefined;
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        userEmail = data.session.user.email || userEmail;
        userId = data.session.user.id;
      }
    } catch {}

    const { error } = await supabase
      .from('audit_logs')
      .insert({
        id,
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: validEntityId,
        old_value: oldValue,
        new_value: newValue,
        reason,
        timestamp: now
      });

    if (error) {
      console.warn('Audit log remote insert note:', error.message);
    }
  }
};
