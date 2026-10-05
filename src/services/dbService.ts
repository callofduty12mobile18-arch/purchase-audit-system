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
    id: 'b0000000-0000-0000-0000-000000000014',
    supplier_item_name: 'AM CLUBNY COOL SLEEKSFTK',
    nickname: 'American Club',
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
    id: 'b0000000-0000-0000-0000-000000000019',
    supplier_item_name: 'CI CONNECT FT 20R C 390/-',
    nickname: 'Capstan Connect FT 20R',
    hsn: '24022090',
    uom: 'PAC',
    current_purchase_ref_price: 392.86,
    current_selling_price: 390.00,
    min_stock_level: 5,
    is_active: true,
    created_at: '2026-08-08T00:00:00.000Z',
    updated_at: '2026-08-08T00:00:00.000Z'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000013',
    supplier_item_name: 'CI Double Burst FS-BDG-ND 20BE',
    nickname: 'Double Burst 20s',
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
    id: 'b0000000-0000-0000-0000-000000000009',
    supplier_item_name: 'FLAKE GOLD CREST 10HL 70',
    nickname: 'Flake',
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
    id: 'b0000000-0000-0000-0000-000000000018',
    supplier_item_name: 'GOLD FLAKE FX SPECIAL 2-POD',
    nickname: 'Gold Flake FX Special 2-Pod',
    hsn: '24022090',
    uom: 'PAC',
    current_purchase_ref_price: 337.30,
    current_selling_price: 390.00,
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
    id: 'b0000000-0000-0000-0000-000000000001',
    supplier_item_name: 'CI Ice Burst 10M 10BE',
    nickname: 'Ice Burst 10s',
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
    nickname: 'Ice Burst 20s',
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
    id: 'b0000000-0000-0000-0000-000000000004',
    supplier_item_name: 'GFK RED NBUNDLE+NPCT1 10R',
    nickname: 'King',
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
    nickname: 'King 20s',
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
    nickname: 'Lights',
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
    id: 'b0000000-0000-0000-0000-000000000010',
    supplier_item_name: 'GFT MINI 10BE 70',
    nickname: 'Mini 70',
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
    id: 'b0000000-0000-0000-0000-000000000017',
    supplier_item_name: 'GFK MIXPOD MD+NPCT FT 10BE',
    nickname: 'Mixpod 10s',
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
    id: 'b0000000-0000-0000-0000-000000000008',
    supplier_item_name: 'SCISSORS FT 10BE-NB-MD1-NP',
    nickname: 'Scissors',
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
    nickname: 'Waveboss',
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
    id: 'b0000000-0000-0000-0000-000000000003',
    supplier_item_name: 'NC DLX FT 10BE (MD+NPCT)-FF',
    nickname: 'Wills',
    hsn: '24022090',
    uom: 'PAC',
    current_purchase_ref_price: 114.09,
    current_selling_price: 125.00,
    min_stock_level: 5,
    is_active: true,
    created_at: '2026-08-08T00:00:00.000Z',
    updated_at: '2026-08-08T00:00:00.000Z'
  }
];

export const DEFAULT_PRODUCTS = DEFAULT_17_PRODUCTS;

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
    const isExistingUUID = supplier.id && supplier.id.length === 36 && supplier.id.includes('-');
    const id = isExistingUUID ? supplier.id! : generateUUID();
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
    try {
      const { error } = await supabase
        .from('suppliers')
        .upsert({
          ...newRecord,
          updated_at: now
        });
      if (error) console.warn('Supabase supplier upsert note:', error.message);
    } catch (e) {
      console.warn('Supabase supplier exception:', e);
    }

    const existingSupplier = current[idx];
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
    let prods: Product[] = [];
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .order('nickname');
      if (!error && data && data.length > 0) {
        prods = data as Product[];
      }
    } catch (e) {
      console.warn('Supabase products fetch note:', e);
    }

    if (prods.length === 0) {
      prods = getLocalData<Product[]>(LOCAL_STORAGE_KEY_PRODUCTS, DEFAULT_PRODUCTS);
    }

    // Ensure all default products exist and rates are up to date
    const merged = [...prods];
    DEFAULT_PRODUCTS.forEach(dp => {
      const idx = merged.findIndex(p =>
        p.supplier_item_name.trim().toLowerCase() === dp.supplier_item_name.trim().toLowerCase()
      );
      if (idx === -1) {
        merged.push(dp);
      } else {
        // Update if existing had 0 or missing prices
        if (dp.current_purchase_ref_price && !merged[idx].current_purchase_ref_price) {
          merged[idx] = { ...merged[idx], current_purchase_ref_price: dp.current_purchase_ref_price };
        }
      }
    });

    merged.sort((a, b) => {
      const nameA = (a.nickname || a.supplier_item_name || '').trim().toLowerCase();
      const nameB = (b.nickname || b.supplier_item_name || '').trim().toLowerCase();
      return nameA.localeCompare(nameB);
    });

    setLocalData(LOCAL_STORAGE_KEY_PRODUCTS, merged);
    return merged;
  },

  getProductById: async (id: string): Promise<Product | null> => {
    const prods = await dbService.getProducts();
    return prods.find(p => p.id === id) || null;
  },

  saveProduct: async (product: Partial<Product>, priceChangeReason?: string, skipAuditLog = false): Promise<Product> => {
    const now = new Date().toISOString();
    const currentProds = await dbService.getProducts();
    const existing = currentProds.find(p =>
      (product.id && p.id === product.id) ||
      p.supplier_item_name.toLowerCase() === (product.supplier_item_name || '').toLowerCase()
    );
    const id = existing?.id || (product.id && product.id.length === 36 && product.id.includes('-') ? product.id : generateUUID());
    let oldPrice: number | undefined;
    if (existing) {
      oldPrice = existing.current_purchase_ref_price;
    }

    const savedProd: Product = {
      id,
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

    // Update local cache and maintain alphabetical sort
    const updatedList = [...currentProds.filter(p => p.id !== savedProd.id), savedProd].sort((a, b) => {
      const nameA = (a.nickname || a.supplier_item_name || '').trim().toLowerCase();
      const nameB = (b.nickname || b.supplier_item_name || '').trim().toLowerCase();
      return nameA.localeCompare(nameB);
    });
    setLocalData(LOCAL_STORAGE_KEY_PRODUCTS, updatedList);

    // Sync to Supabase
    try {
      const { error } = await supabase
        .from('products')
        .upsert(savedProd);
      if (error) {
        console.warn('Supabase product upsert note:', error.message);
      }
    } catch (e) {
      console.warn('Supabase product upsert exception:', e);
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
    const localInvoices = getLocalData<PurchaseInvoice[]>(LOCAL_STORAGE_KEY_INVOICES, []);
    let remoteInvoices: PurchaseInvoice[] = [];

    try {
      const { data, error } = await supabase
        .from('purchase_invoices')
        .select('*, supplier:suppliers(*), items:purchase_items(*, product:products(*))')
        .order('invoice_date', { ascending: false });

      if (!error && data) {
        remoteInvoices = data as PurchaseInvoice[];
      }
    } catch (e) {
      console.warn('Supabase invoices fetch note:', e);
    }

    // Merge remote and local invoices cleanly by unique ID
    const invMap = new Map<string, PurchaseInvoice>();
    remoteInvoices.forEach(inv => {
      if (inv && inv.id) {
        const local = localInvoices.find(l => l.id === inv.id);
        if ((!inv.items || inv.items.length === 0) && local?.items && local.items.length > 0) {
          inv.items = local.items;
        }
        if (!inv.invoice_name && local?.invoice_name) {
          inv.invoice_name = local.invoice_name;
        }
        invMap.set(inv.id, inv);
      }
    });

    localInvoices.forEach(inv => {
      if (inv && inv.id && !invMap.has(inv.id)) {
        invMap.set(inv.id, inv);
      }
    });

    const merged = Array.from(invMap.values()).sort(
      (a, b) => new Date(b.invoice_date || b.created_at || 0).getTime() - new Date(a.invoice_date || a.created_at || 0).getTime()
    );

    setLocalData(LOCAL_STORAGE_KEY_INVOICES, merged);
    return merged;
  },

  getInvoiceById: async (id: string): Promise<PurchaseInvoice | null> => {
    if (!id) return null;

    // 1. Check local cache first
    const localInvoices = getLocalData<PurchaseInvoice[]>(LOCAL_STORAGE_KEY_INVOICES, []);
    const localMatch = localInvoices.find(inv => inv.id === id);

    // 2. Fetch directly from Supabase for fresh data
    try {
      const { data, error } = await supabase
        .from('purchase_invoices')
        .select('*, supplier:suppliers(*), items:purchase_items(*, product:products(*))')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        const freshInvoice = data as PurchaseInvoice;
        if ((!freshInvoice.items || freshInvoice.items.length === 0) && localMatch?.items && localMatch.items.length > 0) {
          freshInvoice.items = localMatch.items;
        }
        if (!freshInvoice.invoice_name && localMatch?.invoice_name) {
          freshInvoice.invoice_name = localMatch.invoice_name;
        }
        const updated = [freshInvoice, ...localInvoices.filter(i => i.id !== id)];
        setLocalData(LOCAL_STORAGE_KEY_INVOICES, updated);
        return freshInvoice;
      }
    } catch (e) {
      console.warn('Supabase single invoice fetch note:', e);
    }

    // 3. Fallback to local cache record
    if (localMatch) {
      return localMatch;
    }

    // 4. Try refreshing full invoice list
    const allInvoices = await dbService.getInvoices();
    return allInvoices.find(inv => inv.id === id) || null;
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

  confirmAndSaveInvoice: async (extractedData: InvoiceFormData, _documentPath?: string): Promise<PurchaseInvoice> => {
    const now = new Date().toISOString();
    const suppliers = await dbService.getSuppliers();
    let supplier = suppliers.find(
      s => s.name.trim().toLowerCase() === extractedData.supplier_name.trim().toLowerCase()
    );

    if (!supplier) {
      supplier = await dbService.saveSupplier({
        name: extractedData.supplier_name,
        gstin: extractedData.supplier_gstin
      });
    } else {
      // Ensure the supplier exists in Supabase remote table to prevent FK constraint failure
      try {
        await supabase.from('suppliers').upsert({
          id: supplier.id,
          name: supplier.name,
          gstin: supplier.gstin || '',
          address: supplier.address || '',
          phone: supplier.phone || '',
          email: supplier.email || '',
          payment_terms: supplier.payment_terms || 'CREDIT',
          notes: supplier.notes || '',
          is_active: supplier.is_active ?? true,
          updated_at: now
        });
      } catch (e) {
        console.warn('Supplier remote sync note:', e);
      }
    }

    const invoiceId = generateUUID();

    // 1. Process and Insert Line Items & Auto-map Products
    const itemsToInsert: PurchaseItem[] = [];

    for (const itemData of extractedData.items) {
      const effectiveRate = Number(itemData.each_pack_rate || itemData.purchase_rate) || 0;
      const effectiveQty = Number(itemData.pack_qty || itemData.quantity || itemData.qty) || 1;
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
        taxable_value: Number(itemData.taxable_value) || 0,
        cgst: Number(itemData.cgst) || 0,
        sgst: Number(itemData.sgst) || 0,
        igst: Number(itemData.igst) || 0,
        total: Number(itemData.invoice_amount || itemData.total || (effectiveRate * effectiveQty)),
        created_at: now
      });
    }

    const invoiceNumber = extractedData.invoice_number?.trim() || `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const validPaymentModes = ['CASH', 'UPI', 'BANK_TRANSFER', 'CREDIT', 'CHEQUE', 'OTHER'];
    const safePaymentMode = (extractedData.payment_mode && validPaymentModes.includes(extractedData.payment_mode))
      ? (extractedData.payment_mode as any)
      : 'CASH';
    const safePaymentStatus = (extractedData.payment_status === 'UNPAID' || extractedData.payment_status === 'PARTIALLY_PAID')
      ? extractedData.payment_status
      : 'PAID';

    const newInvoice: PurchaseInvoice = {
      id: invoiceId,
      supplier_id: supplier.id,
      supplier: supplier,
      invoice_number: invoiceNumber,
      invoice_name: extractedData.invoice_name?.trim() || undefined,
      invoice_date: extractedData.invoice_date,
      payment_mode: safePaymentMode,
      payment_status: safePaymentStatus,
      cheque_date: extractedData.cheque_date,
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

    // Update local cache immediately
    const currentInvoices = getLocalData<PurchaseInvoice[]>(LOCAL_STORAGE_KEY_INVOICES, []);
    const updatedInvoices = [newInvoice, ...currentInvoices.filter(i => i.id !== invoiceId)];
    setLocalData(LOCAL_STORAGE_KEY_INVOICES, updatedInvoices);

    // Sync to Supabase in parallel
    try {
      const { error: invErr } = await supabase
        .from('purchase_invoices')
        .upsert({
          id: invoiceId,
          supplier_id: supplier.id,
          invoice_number: invoiceNumber,
          invoice_date: extractedData.invoice_date,
          payment_mode: safePaymentMode,
          payment_status: safePaymentStatus,
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
        });

      if (invErr) {
        console.error('Supabase purchase_invoices upsert error:', invErr);
      } else {
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
        }
      }
    } catch (err) {
      console.error('Supabase sync exception:', err);
    }

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

  deleteInvoice: async (id: string): Promise<boolean> => {
    // 1. Fetch current invoices to obtain the target invoice number
    const invoices = await dbService.getInvoices();
    const targetInvoice = invoices.find(inv => inv.id === id);

    // 2. Remove from local storage cache immediately
    const updatedInvoices = invoices.filter(inv => inv.id !== id);
    setLocalData(LOCAL_STORAGE_KEY_INVOICES, updatedInvoices);

    // 3. Remove any audit logs associated with this specific invoice from local storage cache
    const currentAudit = getLocalData<AuditLog[]>(LOCAL_STORAGE_KEY_AUDIT, []);
    const updatedAudit = currentAudit.filter(
      a => a.entity_id !== id && (!targetInvoice?.invoice_number || !a.reason?.includes(targetInvoice.invoice_number))
    );
    setLocalData(LOCAL_STORAGE_KEY_AUDIT, updatedAudit);

    // 4. Delete from Supabase remote database
    try {
      await supabase.from('purchase_items').delete().eq('purchase_invoice_id', id);
      await supabase.from('purchase_invoice_documents').delete().eq('purchase_invoice_id', id);
      await supabase.from('audit_logs').delete().eq('entity_id', id);
      if (targetInvoice?.invoice_number) {
        await supabase.from('audit_logs').delete().ilike('reason', `%${targetInvoice.invoice_number}%`);
      }
      const { error } = await supabase.from('purchase_invoices').delete().eq('id', id);
      if (error) {
        console.warn('Supabase delete invoice note:', error.message);
      }
    } catch (e) {
      console.warn('Supabase delete invoice exception:', e);
    }

    return true;
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
    const id = generateUUID();
    const newEntry: PriceHistory = {
      id,
      ...entry,
      changed_at: now
    };

    const currentHistory = await dbService.getPriceHistory();
    setLocalData(LOCAL_STORAGE_KEY_PRICE_HISTORY, [newEntry, ...currentHistory]);

    try {
      await supabase
        .from('price_history')
        .insert({
          ...newEntry,
          changed_at: now
        });
    } catch (e) {
      console.warn('Price history sync note:', e);
    }

    return newEntry;
  },

  // --- AUDIT LOGS ---
  getAuditLogs: async (): Promise<AuditLog[]> => {
    // 1. Read existing local audit logs
    const localLogs = getLocalData<AuditLog[]>(LOCAL_STORAGE_KEY_AUDIT, []);

    // 2. Fetch remote logs and active invoices in parallel
    let remoteLogs: AuditLog[] = [];
    let remoteInvoices: { id: string; invoice_number?: string }[] = [];

    try {
      const [logsRes, invsRes] = await Promise.all([
        supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }),
        supabase.from('purchase_invoices').select('id, invoice_number')
      ]);

      if (!logsRes.error && logsRes.data) {
        remoteLogs = logsRes.data as AuditLog[];
      }
      if (!invsRes.error && invsRes.data) {
        remoteInvoices = invsRes.data;
      }
    } catch (e) {
      console.warn('Supabase audit logs fetch error:', e);
    }

    // Combine remote active invoices with local active invoices so local invoices are never treated as orphans
    const localInvoices = getLocalData<PurchaseInvoice[]>(LOCAL_STORAGE_KEY_INVOICES, []);
    const allActiveInvoicesMap = new Map<string, { id: string; invoice_number?: string }>();
    remoteInvoices.forEach(inv => { if (inv?.id) allActiveInvoicesMap.set(inv.id, inv); });
    localInvoices.forEach(inv => { if (inv?.id) allActiveInvoicesMap.set(inv.id, inv); });
    const allActiveInvoices = Array.from(allActiveInvoicesMap.values());

    // 3. Merge local and remote logs cleanly by unique ID (preserving all product/supplier/system updates)
    const mergedMap = new Map<string, AuditLog>();

    // Remote logs first
    remoteLogs.forEach(l => {
      if (l && l.id) mergedMap.set(l.id, l);
    });

    // Local logs next (if not already present or preserves local state)
    localLogs.forEach(l => {
      if (l && l.id) {
        if (!mergedMap.has(l.id)) {
          mergedMap.set(l.id, l);
        }
      }
    });

    let allLogs = Array.from(mergedMap.values());

    // 4. Prune only orphan INVOICE logs (e.g., invoices that were explicitly deleted)
    // IMPORTANT: NEVER prune product logs, supplier logs, price logs, or other non-invoice events!
    const activeInvoiceIds = new Set(allActiveInvoices.map(i => i.id));
    const activeInvoiceNumbers = new Set(
      allActiveInvoices.map(i => (i.invoice_number || '').trim().toLowerCase()).filter(Boolean)
    );

    const isInvoiceLog = (l: AuditLog) =>
      l.entity_type === 'purchase_invoices' ||
      l.action === 'INVOICE_CONFIRMED' ||
      l.action === 'INVOICE_CREATED' ||
      l.action === 'INVOICE_DELETED' ||
      l.entity_type?.toLowerCase().includes('invoice');

    const orphanLogIds: string[] = [];

    allLogs = allLogs.filter(l => {
      // Clean up auto-generated redundant invoice product logs
      if (l.action === 'PRODUCT_UPDATED' && (l.reason?.startsWith('Invoice #') || l.reason?.toLowerCase().includes('invoice #'))) {
        orphanLogIds.push(l.id);
        return false;
      }

      if (isInvoiceLog(l)) {
        // If there are zero active invoices across both remote and local, prune old invoice logs
        if (allActiveInvoices.length === 0) {
          orphanLogIds.push(l.id);
          return false;
        }
        const matchesId = l.entity_id && activeInvoiceIds.has(l.entity_id);
        const matchesNumber = l.reason && Array.from(activeInvoiceNumbers).some(num => num && l.reason?.toLowerCase().includes(num));
        if (!matchesId && !matchesNumber) {
          orphanLogIds.push(l.id);
          return false;
        }
      }
      return true;
    });

    // Sort chronologically descending
    allLogs.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Save cleaned, merged logs to localStorage
    setLocalData(LOCAL_STORAGE_KEY_AUDIT, allLogs);

    // Background clean up of remote orphan logs if any
    if (orphanLogIds.length > 0) {
      (async () => {
        try {
          await supabase.from('audit_logs').delete().in('id', orphanLogIds);
        } catch (err) {
          console.warn('Orphan audit log cleanup note:', err);
        }
      })();
    }

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

    let userEmail = 'admin@audit.local';
    let userId: string | undefined = undefined;
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        userEmail = data.session.user.email || userEmail;
        userId = data.session.user.id;
      }
    } catch {}

    const newLog: AuditLog = {
      id,
      user_id: userId,
      user_email: userEmail,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_value: oldValue,
      new_value: newValue,
      reason,
      timestamp: now
    };

    // Synchronous local state write to prevent concurrent race conditions
    const currentLogs = getLocalData<AuditLog[]>(LOCAL_STORAGE_KEY_AUDIT, []);
    const updatedLogs = [newLog, ...currentLogs.filter(l => l.id !== id)];
    setLocalData(LOCAL_STORAGE_KEY_AUDIT, updatedLogs);

    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          id,
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
    } catch (e) {
      console.warn('Audit log sync note:', e);
    }
  }
};
