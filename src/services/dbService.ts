import { supabase } from '../integrations/supabase/client';
import {
  Supplier,
  Product,
  Category,
  PurchaseInvoice,
  PurchaseItem,
  PriceHistory,
  AuditLog,
  InvoiceFormData
} from '../types';

export const dbService = {
  // Clear all data directly from Supabase
  clearAllData: async (): Promise<void> => {
    const { error: itemsErr } = await supabase.from('purchase_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (itemsErr) throw itemsErr;
    await supabase.from('purchase_invoice_documents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('purchase_invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('price_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('stock_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('suppliers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  },

  // --- SUPPLIERS ---
  getSuppliers: async (): Promise<Supplier[]> => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name');
    if (error) {
      console.error('Failed to fetch suppliers from Supabase:', error);
      throw new Error(`Database error fetching suppliers: ${error.message}`);
    }
    return (data || []) as Supplier[];
  },

  getSupplierById: async (id: string): Promise<Supplier | null> => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      console.error(`Failed to fetch supplier ${id}:`, error);
      throw new Error(`Database error: ${error.message}`);
    }
    return (data as Supplier) || null;
  },

  saveSupplier: async (supplier: Partial<Supplier>): Promise<Supplier> => {
    const now = new Date().toISOString();
    const payload = {
      ...supplier,
      updated_at: now
    };

    const { data, error } = await supabase
      .from('suppliers')
      .upsert(payload)
      .select()
      .single();

    if (error) {
      console.error('Failed to save supplier:', error);
      throw new Error(`Database error saving supplier: ${error.message}`);
    }

    const saved = data as Supplier;
    await dbService.logAudit(
      supplier.id ? 'SUPPLIER_UPDATED' : 'SUPPLIER_CREATED',
      'suppliers',
      saved.id,
      null,
      saved as unknown as Record<string, unknown>,
      `Saved supplier master record: ${saved.name}`
    );

    return saved;
  },

  // --- PRODUCTS & CATEGORIES ---
  getCategories: async (): Promise<Category[]> => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    if (error) {
      console.error('Failed to fetch categories:', error);
      throw new Error(`Database error fetching categories: ${error.message}`);
    }
    return (data || []) as Category[];
  },

  getProducts: async (): Promise<Product[]> => {
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .order('nickname');
    if (error) {
      console.error('Failed to fetch products:', error);
      throw new Error(`Database error fetching products: ${error.message}`);
    }
    return (data || []) as Product[];
  },

  getProductById: async (id: string): Promise<Product | null> => {
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      console.error(`Failed to fetch product ${id}:`, error);
      throw new Error(`Database error fetching product: ${error.message}`);
    }
    return (data as Product) || null;
  },

  saveProduct: async (product: Partial<Product>, priceChangeReason?: string): Promise<Product> => {
    const now = new Date().toISOString();
    let oldPrice: number | undefined;

    if (product.id) {
      const existing = await dbService.getProductById(product.id);
      if (existing) {
        oldPrice = existing.current_purchase_ref_price;
      }
    }

    const payload = {
      ...product,
      updated_at: now
    };

    const { data, error } = await supabase
      .from('products')
      .upsert(payload)
      .select()
      .single();

    if (error) {
      console.error('Failed to save product:', error);
      throw new Error(`Database error saving product: ${error.message}`);
    }

    const saved = data as Product;

    if (
      product.id &&
      oldPrice !== undefined &&
      product.current_purchase_ref_price !== undefined &&
      product.current_purchase_ref_price !== oldPrice
    ) {
      await dbService.addPriceHistory({
        product_id: saved.id,
        price_type: 'PURCHASE_REF',
        old_value: oldPrice,
        new_value: product.current_purchase_ref_price,
        effective_from: now,
        reason: priceChangeReason || 'Manual reference price update',
      });
    }

    await dbService.logAudit(
      product.id ? 'PRODUCT_UPDATED' : 'PRODUCT_CREATED',
      'products',
      saved.id,
      null,
      saved as unknown as Record<string, unknown>,
      priceChangeReason || `Saved product: ${saved.nickname}`
    );

    return saved;
  },

  // --- INVOICES & PURCHASES ---
  getInvoices: async (): Promise<PurchaseInvoice[]> => {
    const { data, error } = await supabase
      .from('purchase_invoices')
      .select('*, supplier:suppliers(*), items:purchase_items(*)')
      .order('invoice_date', { ascending: false });

    if (error) {
      console.error('Failed to fetch invoices:', error);
      throw new Error(`Database error fetching invoices: ${error.message}`);
    }
    return (data || []) as PurchaseInvoice[];
  },

  getInvoiceById: async (id: string): Promise<PurchaseInvoice | null> => {
    const { data, error } = await supabase
      .from('purchase_invoices')
      .select('*, supplier:suppliers(*), items:purchase_items(*), documents:purchase_invoice_documents(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(`Failed to fetch invoice ${id}:`, error);
      throw new Error(`Database error fetching invoice: ${error.message}`);
    }
    return (data as PurchaseInvoice) || null;
  },

  checkDuplicateInvoice: async (supplierId: string, invoiceNumber: string, invoiceDate?: string): Promise<PurchaseInvoice | null> => {
    let query = supabase
      .from('purchase_invoices')
      .select('*')
      .eq('supplier_id', supplierId)
      .ilike('invoice_number', invoiceNumber.trim());

    if (invoiceDate) {
      query = query.eq('invoice_date', invoiceDate);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('Duplicate invoice check query error:', error);
      return null;
    }
    return (data as PurchaseInvoice) || null;
  },

  confirmAndSaveInvoice: async (extractedData: InvoiceFormData, documentPath?: string): Promise<PurchaseInvoice> => {
    const suppliers = await dbService.getSuppliers();
    const products = await dbService.getProducts();

    let supplier = suppliers.find(
      s => s.name.trim().toLowerCase() === extractedData.supplier_name.trim().toLowerCase()
    );

    if (!supplier) {
      supplier = await dbService.saveSupplier({
        name: extractedData.supplier_name,
        gstin: extractedData.supplier_gstin
      });
    }

    const now = new Date().toISOString();

    // 1. Insert Header
    const invoicePayload = {
      supplier_id: supplier.id,
      invoice_number: extractedData.invoice_number,
      invoice_date: extractedData.invoice_date,
      payment_mode: extractedData.payment_mode || 'BANK_TRANSFER',
      payment_status: extractedData.payment_status || 'PAID',
      subtotal: extractedData.subtotal,
      taxable_amount: extractedData.taxable_amount,
      cgst: extractedData.cgst,
      sgst: extractedData.sgst,
      igst: extractedData.igst,
      total_tax: extractedData.total_tax,
      round_off: extractedData.round_off,
      grand_total: extractedData.grand_total,
      verification_status: 'VERIFIED' as const,
      ocr_status: 'MANUAL' as const,
      created_at: now,
      updated_at: now
    };

    const { data: savedInvoice, error: invErr } = await supabase
      .from('purchase_invoices')
      .insert(invoicePayload)
      .select('*, supplier:suppliers(*)')
      .single();

    if (invErr) {
      console.error('Failed to insert purchase invoice:', invErr);
      throw new Error(`Database error saving invoice: ${invErr.message}`);
    }

    const invoiceId = savedInvoice.id;

    // 2. Process and Insert Line Items & Auto-map Products
    const itemsToInsert: any[] = [];
    const currentProducts = [...products];

    for (const itemData of extractedData.items) {
      const effectiveRate = itemData.each_pack_rate || itemData.purchase_rate || 0;
      const effectiveQty = itemData.pack_qty || itemData.quantity || itemData.qty || 1;
      const sellingPrice = itemData.mrp_rsp || Math.round(effectiveRate * 1.3);

      let product = currentProducts.find(
        p => p.supplier_item_name.trim().toLowerCase() === (itemData.supplier_item_name || itemData.item_name || '').trim().toLowerCase()
      );

      if (!product) {
        const { data: newProd, error: prodErr } = await supabase
          .from('products')
          .insert({
            supplier_item_name: itemData.supplier_item_name || itemData.item_name,
            nickname: itemData.item_name || itemData.supplier_item_name,
            hsn: itemData.hsn,
            uom: itemData.uom || 'PAC',
            current_purchase_ref_price: effectiveRate,
            current_selling_price: sellingPrice,
            min_stock_level: 5,
            is_active: true,
            created_at: now,
            updated_at: now
          })
          .select()
          .single();

        if (!prodErr && newProd) {
          product = newProd as Product;
          currentProducts.push(product);
        }
      } else {
        if (effectiveRate > 0 && product.current_purchase_ref_price !== effectiveRate) {
          const oldPrice = product.current_purchase_ref_price;
          await supabase
            .from('products')
            .update({
              current_purchase_ref_price: effectiveRate,
              current_selling_price: sellingPrice || product.current_selling_price,
              updated_at: now
            })
            .eq('id', product.id);

          await dbService.addPriceHistory({
            product_id: product.id,
            price_type: 'PURCHASE_REF',
            old_value: oldPrice,
            new_value: effectiveRate,
            effective_from: now,
            reason: `Invoice verification #${extractedData.invoice_number}`,
          });
        }
      }

      itemsToInsert.push({
        purchase_invoice_id: invoiceId,
        product_id: product?.id,
        supplier_item_name_snapshot: itemData.supplier_item_name || itemData.item_name,
        hsn_snapshot: itemData.hsn,
        quantity: effectiveQty,
        uom_snapshot: itemData.uom || 'PAC',
        purchase_rate: effectiveRate,
        gst_rate: itemData.gst_rate,
        taxable_value: itemData.taxable_value,
        cgst: itemData.cgst,
        sgst: itemData.sgst,
        igst: itemData.igst,
        total: itemData.invoice_amount || itemData.total,
        created_at: now
      });
    }

    if (itemsToInsert.length > 0) {
      const { error: itemsErr } = await supabase
        .from('purchase_items')
        .insert(itemsToInsert);

      if (itemsErr) {
        console.error('Failed to insert purchase items:', itemsErr);
        throw new Error(`Database error saving invoice line items: ${itemsErr.message}`);
      }
    }

    // 3. Optional Document Record
    if (documentPath) {
      await supabase
        .from('purchase_invoice_documents')
        .insert({
          purchase_invoice_id: invoiceId,
          storage_path: documentPath,
          file_type: documentPath.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
          page_number: 1,
          uploaded_at: now
        });
    }

    // 4. Audit Log
    await dbService.logAudit(
      'INVOICE_CONFIRMED',
      'purchase_invoices',
      invoiceId,
      null,
      { invoice_number: savedInvoice.invoice_number, grand_total: savedInvoice.grand_total, item_count: itemsToInsert.length },
      `Confirmed purchase invoice #${savedInvoice.invoice_number} from ${supplier.name}`
    );

    // Return complete invoice with items
    const completeInvoice = await dbService.getInvoiceById(invoiceId);
    return completeInvoice || (savedInvoice as PurchaseInvoice);
  },

  // --- PRICE HISTORY ---
  getPriceHistory: async (): Promise<PriceHistory[]> => {
    const { data, error } = await supabase
      .from('price_history')
      .select('*, product:products(*)')
      .order('changed_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch price history:', error);
      throw new Error(`Database error fetching price history: ${error.message}`);
    }
    return (data || []) as PriceHistory[];
  },

  addPriceHistory: async (entry: Omit<PriceHistory, 'id' | 'changed_at'>): Promise<PriceHistory> => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('price_history')
      .insert({
        ...entry,
        changed_at: now
      })
      .select('*, product:products(*)')
      .single();

    if (error) {
      console.error('Failed to insert price history:', error);
      throw new Error(`Database error inserting price history: ${error.message}`);
    }
    return data as PriceHistory;
  },

  // --- AUDIT LOGS ---
  getAuditLogs: async (): Promise<AuditLog[]> => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Failed to fetch audit logs:', error);
      throw new Error(`Database error fetching audit logs: ${error.message}`);
    }
    return (data || []) as AuditLog[];
  },

  logAudit: async (
    action: string,
    entity_type: string,
    entity_id?: string,
    old_value?: Record<string, unknown> | null,
    new_value?: Record<string, unknown> | null,
    reason?: string
  ): Promise<AuditLog | null> => {
    const payload = {
      action,
      entity_type,
      entity_id,
      old_value,
      new_value,
      reason,
      timestamp: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('audit_logs')
      .insert(payload)
      .select()
      .maybeSingle();

    if (error) {
      console.warn('Audit log write error (non-fatal):', error.message);
      return null;
    }
    return (data as AuditLog) || null;
  }
};
