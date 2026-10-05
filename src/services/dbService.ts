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

export const DEFAULT_SUPPLIERS: Supplier[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    name: 'AYYAPPA ENTERPRISES',
    gstin: '33AABFA2949R1Z5',
    address: 'NO 308A CTH ROAD, THIRUNINDRAVUR, Tamil Nadu',
    phone: '9841055999',
    payment_terms: 'CREDIT',
    is_active: true,
    created_at: '2026-08-08T00:00:00.000Z',
    updated_at: '2026-08-08T00:00:00.000Z'
  }
];

export const DEFAULT_17_PRODUCTS: Product[] = [
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    supplier_item_name: 'CI Ice Burst 10M 10BE',
    nickname: 'Ice Burst 10M',
    hsn: '24022090',
    uom: 'PAC',
    current_purchase_ref_price: 215.78,
    current_selling_price: 240.00,
    min_stock_level: 5,
    is_active: true,
    created_at: '2026-08-08T00:00:00.000Z',
    updated_at: '2026-08-08T00:00:00.000Z'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    supplier_item_name: 'CI Ice Burst 20BE',
    nickname: 'Ice Burst 20BE',
    hsn: '24022090',
    uom: 'PAC',
    current_purchase_ref_price: 431.56,
    current_selling_price: 480.00,
    min_stock_level: 5,
    is_active: true,
    created_at: '2026-08-08T00:00:00.000Z',
    updated_at: '2026-08-08T00:00:00.000Z'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000003',
    supplier_item_name: 'NC DLX FT 10BE (MD+NPCT)-FF',
    nickname: 'Navy Cut DLX FT 10',
    hsn: '24022090',
    uom: 'PAC',
    current_purchase_ref_price: 114.09,
    current_selling_price: 125.00,
    min_stock_level: 5,
    is_active: true,
    created_at: '2026-08-08T00:00:00.000Z',
    updated_at: '2026-08-08T00:00:00.000Z'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000004',
    supplier_item_name: 'GFK RED NBUNDLE+NPCT1 10R',
    nickname: 'Gold Flake Red 10R',
    hsn: '24022090',
    uom: 'PAC',
    current_purchase_ref_price: 220.24,
    current_selling_price: 240.00,
    min_stock_level: 5,
    is_active: true,
    created_at: '2026-08-08T00:00:00.000Z',
    updated_at: '2026-08-08T00:00:00.000Z'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000005',
    supplier_item_name: 'GFK RED NBUNDLE+NPCT 120R',
    nickname: 'Gold Flake Red 20R',
    hsn: '24022090',
    uom: 'PAC',
    current_purchase_ref_price: 430.56,
    current_selling_price: 480.00,
    min_stock_level: 5,
    is_active: true,
    created_at: '2026-08-08T00:00:00.000Z',
    updated_at: '2026-08-08T00:00:00.000Z'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000006',
    supplier_item_name: 'GFK BLUE NBUNDLE+NPCT 10R',
    nickname: 'Gold Flake Blue 10R',
    hsn: '24022090',
    uom: 'PAC',
    current_purchase_ref_price: 220.24,
    current_selling_price: 240.00,
    min_stock_level: 5,
    is_active: true,
    created_at: '2026-08-08T00:00:00.000Z',
    updated_at: '2026-08-08T00:00:00.000Z'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000007',
    supplier_item_name: 'GOLD FL FT-10BE MD+NPCT-FF',
    nickname: 'Gold Flake Lights 10s',
    hsn: '24022090',
    uom: 'PAC',
    current_purchase_ref_price: 116.57,
    current_selling_price: 127.00,
    min_stock_level: 5,
    is_active: true,
    created_at: '2026-08-08T00:00:00.000Z',
    updated_at: '2026-08-08T00:00:00.000Z'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000008',
    supplier_item_name: 'SCISSORS FT 10BE-NB-MD1-NP',
    nickname: 'Scissors Filter 10s',
    hsn: '24022090',
    uom: 'PAC',
    current_purchase_ref_price: 99.70,
    current_selling_price: 109.00,
    min_stock_level: 5,
    is_active: true,
    created_at: '2026-08-08T00:00:00.000Z',
    updated_at: '2026-08-08T00:00:00.000Z'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000009',
    supplier_item_name: 'FLAKE GOLD CREST 10HL 70',
    nickname: 'Flake Gold Crest 70',
    hsn: '24022090',
    uom: 'PAC',
    current_purchase_ref_price: 63.99,
    current_selling_price: 70.00,
    min_stock_level: 5,
    is_active: true,
    created_at: '2026-08-08T00:00:00.000Z',
    updated_at: '2026-08-08T00:00:00.000Z'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000010',
    supplier_item_name: 'GFT MINI 10BE 70',
    nickname: 'Gold Flake Mini 70',
    hsn: '24022090',
    uom: 'PAC',
    current_purchase_ref_price: 81.35,
    current_selling_price: 89.00,
    min_stock_level: 5,
    is_active: true,
    created_at: '2026-08-08T00:00:00.000Z',
    updated_at: '2026-08-08T00:00:00.000Z'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000011',
    supplier_item_name: 'Indie Mint 10BE 115',
    nickname: 'Indie Mint 10s',
    hsn: '24022090',
    uom: 'PAC',
    current_purchase_ref_price: 114.09,
    current_selling_price: 125.00,
    min_stock_level: 5,
    is_active: true,
    created_at: '2026-08-08T00:00:00.000Z',
    updated_at: '2026-08-08T00:00:00.000Z'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000012',
    supplier_item_name: 'WAVE COOL MINT 10R C 96',
    nickname: 'Wave Cool Mint 10R',
    hsn: '24022090',
    uom: 'PAC',
    current_purchase_ref_price: 87.00,
    current_selling_price: 96.00,
    min_stock_level: 5,
    is_active: true,
    created_at: '2026-08-08T00:00:00.000Z',
    updated_at: '2026-08-08T00:00:00.000Z'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000013',
    supplier_item_name: 'CI Double Burst FS-BDG-ND 20BE',
    nickname: 'Capstan Double Burst 20',
    hsn: '24022090',
    uom: 'PAC',
    current_purchase_ref_price: 431.56,
    current_selling_price: 480.00,
    min_stock_level: 5,
    is_active: true,
    created_at: '2026-08-08T00:00:00.000Z',
    updated_at: '2026-08-08T00:00:00.000Z'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000014',
    supplier_item_name: 'AM CLUBNY COOL SLEEKSFTK',
    nickname: 'American Club Cool Sleeks',
    hsn: '24022090',
    uom: 'PAC',
    current_purchase_ref_price: 321.43,
    current_selling_price: 360.00,
    min_stock_level: 5,
    is_active: true,
    created_at: '2026-08-08T00:00:00.000Z',
    updated_at: '2026-08-08T00:00:00.000Z'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000015',
    supplier_item_name: 'WAVE COOL MINT DLX FT 10BE',
    nickname: 'Wave Cool Mint DLX 10',
    hsn: '24022090',
    uom: 'PAC',
    current_purchase_ref_price: 53.00,
    current_selling_price: 60.00,
    min_stock_level: 5,
    is_active: true,
    created_at: '2026-08-08T00:00:00.000Z',
    updated_at: '2026-08-08T00:00:00.000Z'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000016',
    supplier_item_name: 'WAVEBOSS REFINED TASTE DS',
    nickname: 'Waveboss Refined Taste',
    hsn: '24022090',
    uom: 'PAC',
    current_purchase_ref_price: 53.00,
    current_selling_price: 60.00,
    min_stock_level: 5,
    is_active: true,
    created_at: '2026-08-08T00:00:00.000Z',
    updated_at: '2026-08-08T00:00:00.000Z'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000017',
    supplier_item_name: 'GFK MIXPOD MD+NPCT FT 10BE',
    nickname: 'Gold Flake Mixpod 10s',
    hsn: '24022090',
    uom: 'PAC',
    current_purchase_ref_price: 220.24,
    current_selling_price: 240.00,
    min_stock_level: 5,
    is_active: true,
    created_at: '2026-08-08T00:00:00.000Z',
    updated_at: '2026-08-08T00:00:00.000Z'
  }
];

const LOCAL_STORAGE_KEY_PRODUCTS = 'ramachandran_products_v1';
const LOCAL_STORAGE_KEY_SUPPLIERS = 'ramachandran_suppliers_v1';
const LOCAL_STORAGE_KEY_INVOICES = 'ramachandran_invoices_v1';
const LOCAL_STORAGE_KEY_AUDIT = 'ramachandran_audit_v1';
const LOCAL_STORAGE_KEY_PRICE_HISTORY = 'ramachandran_price_history_v1';

const getLocalData = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return (Array.isArray(parsed) && parsed.length > 0) ? (parsed as unknown as T) : fallback;
  } catch {
    return fallback;
  }
};

const setLocalData = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Ignore quota errors
  }
};

export const dbService = {
  // Clear all data directly from Supabase and Local Storage
  clearAllData: async (): Promise<void> => {
    localStorage.removeItem(LOCAL_STORAGE_KEY_PRODUCTS);
    localStorage.removeItem(LOCAL_STORAGE_KEY_SUPPLIERS);
    localStorage.removeItem(LOCAL_STORAGE_KEY_INVOICES);
    localStorage.removeItem(LOCAL_STORAGE_KEY_AUDIT);
    localStorage.removeItem(LOCAL_STORAGE_KEY_PRICE_HISTORY);

    try {
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
      console.warn('Supabase remote clear note:', e);
    }
  },

  // --- SUPPLIERS ---
  getSuppliers: async (): Promise<Supplier[]> => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');
      if (!error && data && data.length > 0) {
        setLocalData(LOCAL_STORAGE_KEY_SUPPLIERS, data);
        return data as Supplier[];
      }
    } catch (e) {
      console.warn('Supabase suppliers fetch note:', e);
    }
    return getLocalData<Supplier[]>(LOCAL_STORAGE_KEY_SUPPLIERS, DEFAULT_SUPPLIERS);
  },

  getSupplierById: async (id: string): Promise<Supplier | null> => {
    const suppliers = await dbService.getSuppliers();
    return suppliers.find(s => s.id === id) || null;
  },

  saveSupplier: async (supplier: Partial<Supplier>): Promise<Supplier> => {
    const now = new Date().toISOString();
    const id = supplier.id || `sup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newRecord: Supplier = {
      id,
      name: supplier.name || 'Vendor',
      gstin: supplier.gstin || '',
      address: supplier.address || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      payment_terms: supplier.payment_terms || 'CREDIT',
      notes: supplier.notes || '',
      is_active: supplier.is_active ?? true,
      created_at: supplier.created_at || now,
      updated_at: now
    };

    // Update local cache
    const current = await dbService.getSuppliers();
    const idx = current.findIndex(s => s.id === id || s.name.toLowerCase() === newRecord.name.toLowerCase());
    let updatedList: Supplier[];
    if (idx >= 0) {
      updatedList = [...current];
      updatedList[idx] = { ...current[idx], ...newRecord };
    } else {
      updatedList = [...current, newRecord];
    }
    setLocalData(LOCAL_STORAGE_KEY_SUPPLIERS, updatedList);

    // Sync to Supabase in background
    supabase
      .from('suppliers')
      .upsert({
        ...newRecord,
        updated_at: now
      })
      .then(
        ({ error }) => {
          if (error) console.warn('Supabase supplier upsert note:', error.message);
        },
        () => {}
      );

    await dbService.logAudit(
      supplier.id ? 'SUPPLIER_UPDATED' : 'SUPPLIER_CREATED',
      'suppliers',
      newRecord.id,
      null,
      newRecord as unknown as Record<string, unknown>,
      `Saved supplier master record: ${newRecord.name}`
    );

    return newRecord;
  },

  // --- PRODUCTS & CATEGORIES ---
  getCategories: async (): Promise<Category[]> => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (!error && data) return data as Category[];
    } catch {
      // Fallback
    }
    return [];
  },

  getProducts: async (): Promise<Product[]> => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .order('nickname');
      if (!error && data && data.length > 0) {
        setLocalData(LOCAL_STORAGE_KEY_PRODUCTS, data);
        return data as Product[];
      }
    } catch (e) {
      console.warn('Supabase products fetch note:', e);
    }
    return getLocalData<Product[]>(LOCAL_STORAGE_KEY_PRODUCTS, DEFAULT_17_PRODUCTS);
  },

  getProductById: async (id: string): Promise<Product | null> => {
    const prods = await dbService.getProducts();
    return prods.find(p => p.id === id) || null;
  },

  saveProduct: async (product: Partial<Product>, priceChangeReason?: string): Promise<Product> => {
    const now = new Date().toISOString();
    const id = product.id || `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    let oldPrice: number | undefined;

    const currentProds = await dbService.getProducts();
    const existing = currentProds.find(p => p.id === id || p.supplier_item_name.toLowerCase() === (product.supplier_item_name || '').toLowerCase());
    if (existing) {
      oldPrice = existing.current_purchase_ref_price;
    }

    const savedProd: Product = {
      id: existing ? existing.id : id,
      supplier_item_name: product.supplier_item_name || existing?.supplier_item_name || 'Item',
      nickname: product.nickname || existing?.nickname || product.supplier_item_name || 'Item',
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

    // Update local cache
    const updatedList = currentProds.filter(p => p.id !== savedProd.id);
    updatedList.push(savedProd);
    setLocalData(LOCAL_STORAGE_KEY_PRODUCTS, updatedList);

    // Sync to Supabase
    supabase
      .from('products')
      .upsert(savedProd)
      .then(
        ({ error }) => {
          if (error) console.warn('Supabase product upsert note:', error.message);
        },
        () => {}
      );

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

    await dbService.logAudit(
      existing ? 'PRODUCT_UPDATED' : 'PRODUCT_CREATED',
      'products',
      savedProd.id,
      null,
      savedProd as unknown as Record<string, unknown>,
      priceChangeReason || `Saved product: ${savedProd.nickname}`
    );

    return savedProd;
  },

  // --- INVOICES & PURCHASES ---
  getInvoices: async (): Promise<PurchaseInvoice[]> => {
    try {
      const { data, error } = await supabase
        .from('purchase_invoices')
        .select('*, supplier:suppliers(*), items:purchase_items(*)')
        .order('invoice_date', { ascending: false });
      if (!error && data && data.length > 0) {
        setLocalData(LOCAL_STORAGE_KEY_INVOICES, data);
        return data as PurchaseInvoice[];
      }
    } catch (e) {
      console.warn('Supabase invoices fetch note:', e);
    }
    return getLocalData<PurchaseInvoice[]>(LOCAL_STORAGE_KEY_INVOICES, []);
  },

  getInvoiceById: async (id: string): Promise<PurchaseInvoice | null> => {
    const invoices = await dbService.getInvoices();
    return invoices.find(inv => inv.id === id) || null;
  },

  checkDuplicateInvoice: async (supplierId: string, invoiceNumber: string, invoiceDate?: string): Promise<PurchaseInvoice | null> => {
    const invoices = await dbService.getInvoices();
    const dup = invoices.find(inv => {
      const numMatch = inv.invoice_number.trim().toLowerCase() === invoiceNumber.trim().toLowerCase();
      const supMatch = inv.supplier_id === supplierId || inv.supplier?.id === supplierId;
      const dateMatch = invoiceDate ? inv.invoice_date === invoiceDate : true;
      return numMatch && supMatch && dateMatch;
    });
    return dup || null;
  },

  confirmAndSaveInvoice: async (extractedData: InvoiceFormData, documentPath?: string): Promise<PurchaseInvoice> => {
    const suppliers = await dbService.getSuppliers();
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
    const invoiceId = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // 1. Process and Insert Line Items & Auto-map Products
    const itemsToInsert: PurchaseItem[] = [];

    for (const itemData of extractedData.items) {
      const effectiveRate = itemData.each_pack_rate || itemData.purchase_rate || 0;
      const effectiveQty = itemData.pack_qty || itemData.quantity || itemData.qty || 1;
      const sellingPrice = itemData.mrp_rsp || Math.round(effectiveRate * 1.3);

      const savedProduct = await dbService.saveProduct({
        supplier_item_name: itemData.supplier_item_name || itemData.item_name,
        nickname: itemData.item_name || itemData.supplier_item_name,
        hsn: itemData.hsn,
        uom: itemData.uom || 'PAC',
        current_purchase_ref_price: effectiveRate,
        current_selling_price: sellingPrice,
        min_stock_level: 5,
        is_active: true
      }, `Invoice #${extractedData.invoice_number}`);

      const itemId = `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
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
        gst_rate: itemData.gst_rate || 40,
        taxable_value: itemData.taxable_value || 0,
        cgst: itemData.cgst || 0,
        sgst: itemData.sgst || 0,
        igst: itemData.igst || 0,
        total: itemData.invoice_amount || itemData.total || (effectiveRate * effectiveQty),
        created_at: now
      });
    }

    const newInvoice: PurchaseInvoice = {
      id: invoiceId,
      supplier_id: supplier.id,
      supplier: supplier,
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
      items: itemsToInsert,
      created_at: now,
      updated_at: now
    };

    // Update local cache
    const currentInvoices = await dbService.getInvoices();
    const updatedInvoices = [newInvoice, ...currentInvoices.filter(i => i.id !== invoiceId)];
    setLocalData(LOCAL_STORAGE_KEY_INVOICES, updatedInvoices);

    // Sync to Supabase
    supabase
      .from('purchase_invoices')
      .insert({
        id: invoiceId,
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
        verification_status: 'VERIFIED',
        ocr_status: 'MANUAL',
        created_at: now,
        updated_at: now
      })
      .then(async ({ error: invErr }) => {
        if (!invErr) {
          await supabase.from('purchase_items').insert(
            itemsToInsert.map(i => ({
              id: i.id,
              purchase_invoice_id: invoiceId,
              product_id: i.product_id,
              supplier_item_name_snapshot: i.supplier_item_name_snapshot,
              hsn_snapshot: i.hsn_snapshot,
              quantity: i.quantity,
              uom_snapshot: i.uom_snapshot,
              purchase_rate: i.purchase_rate,
              gst_rate: i.gst_rate,
              taxable_value: i.taxable_value,
              cgst: i.cgst,
              sgst: i.sgst,
              igst: i.igst,
              total: i.total,
              created_at: now
            }))
          );
        }
      },
      () => {}
    );

    // Audit Log
    await dbService.logAudit(
      'INVOICE_CONFIRMED',
      'purchase_invoices',
      invoiceId,
      null,
      { invoice_number: newInvoice.invoice_number, grand_total: newInvoice.grand_total, item_count: itemsToInsert.length },
      `Confirmed purchase invoice #${newInvoice.invoice_number} from ${supplier.name}`
    );

    return newInvoice;
  },

  // --- PRICE HISTORY ---
  getPriceHistory: async (): Promise<PriceHistory[]> => {
    try {
      const { data, error } = await supabase
        .from('price_history')
        .select('*, product:products(*)')
        .order('changed_at', { ascending: false });
      if (!error && data && data.length > 0) {
        setLocalData(LOCAL_STORAGE_KEY_PRICE_HISTORY, data);
        return data as PriceHistory[];
      }
    } catch {
      // Fallback
    }
    return getLocalData<PriceHistory[]>(LOCAL_STORAGE_KEY_PRICE_HISTORY, []);
  },

  addPriceHistory: async (entry: Omit<PriceHistory, 'id' | 'changed_at'>): Promise<PriceHistory> => {
    const now = new Date().toISOString();
    const id = `ph-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newEntry: PriceHistory = {
      id,
      ...entry,
      changed_at: now
    };

    const currentHistory = await dbService.getPriceHistory();
    setLocalData(LOCAL_STORAGE_KEY_PRICE_HISTORY, [newEntry, ...currentHistory]);

    supabase
      .from('price_history')
      .insert({
        ...newEntry,
        changed_at: now
      })
      .then(() => {}, () => {});

    return newEntry;
  },

  // --- AUDIT LOGS ---
  getAuditLogs: async (): Promise<AuditLog[]> => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false });
      if (!error && data && data.length > 0) {
        setLocalData(LOCAL_STORAGE_KEY_AUDIT, data);
        return data as AuditLog[];
      }
    } catch {
      // Fallback
    }
    return getLocalData<AuditLog[]>(LOCAL_STORAGE_KEY_AUDIT, []);
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
    const newLog: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_value: oldValue,
      new_value: newValue,
      reason,
      timestamp: now
    };

    const currentLogs = await dbService.getAuditLogs();
    setLocalData(LOCAL_STORAGE_KEY_AUDIT, [newLog, ...currentLogs]);

    supabase
      .from('audit_logs')
      .insert({
        action,
        entity_type: entityType,
        entity_id: entityId,
        old_value: oldValue,
        new_value: newValue,
        reason,
        timestamp: now
      })
      .then(() => {}, () => {});
  }
};
