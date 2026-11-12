/**
 * Revenue and Sales Analytics Service
 * ---------------------------------------------------------------------------
 * Provides core financial accounting, FIFO inventory costing, sales management,
 * stock validation, and analytics calculation.
 *
 * Rules:
 * - Sales Revenue = selling_price * quantity
 * - COGS = Sum of purchase cost allocated to sold quantities using FIFO
 * - Gross Profit = Sales Revenue - COGS
 * - Profit Margin = (Gross Profit / Sales Revenue) * 100
 * - Automatically loads all purchased items from invoices into the sales history.
 * - Allows users to manually enter/edit selling prices per item.
 */

import { supabase } from '../integrations/supabase/client';
import { dbService, generateUUID } from './dbService';
import {
  Product,
  PurchaseInvoice,
  SaleTransaction,
  CreateSaleInput,
  UpdateSaleInput,
  ProductStockInfo,
  RevenueMetrics,
  RevenueDateFilter,
  CogsBatchAllocation
} from '../types';
import { getTodayIST } from '../utils/dateUtils';

// Local storage keys for persistent sales & selling price overrides
const LOCAL_STORAGE_KEY_SALES = 'ramachandran_sales_v1';
const LOCAL_STORAGE_KEY_SELLING_OVERRIDES = 'ramachandran_selling_price_overrides_v1';

// In-memory caching to eliminate sequential database request thrashing
let cachedInvoices: { data: PurchaseInvoice[]; timestamp: number } | null = null;
let cachedProducts: { data: Product[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 30000; // 30s in-memory cache

export function invalidateRevenueCache() {
  cachedInvoices = null;
  cachedProducts = null;
}

// Mutex locks to serialize concurrent sales creation per product
const productSaleLocks = new Set<string>();

// Duplicate submission tracker
const recentSaleSubmissions = new Map<string, number>();
const DUPLICATE_WINDOW_MS = 2500;

interface PurchaseBatch {
  purchase_item_id: string;
  invoice_id: string;
  invoice_number: string;
  invoice_date: string;
  original_qty: number;
  remaining_qty: number;
  unit_cost: number;
}

function getLocalSales(): SaleTransaction[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_SALES);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function setLocalSales(sales: SaleTransaction[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_SALES, JSON.stringify(sales));
  } catch {
    // Ignore storage quota errors
  }
}

function getSellingPriceOverrides(): Record<string, number> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_SELLING_OVERRIDES);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function setSellingPriceOverrides(overrides: Record<string, number>): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_SELLING_OVERRIDES, JSON.stringify(overrides));
  } catch {
    // Ignore
  }
}

/**
 * Generate unique IST sale number: SL-YYYYMMDD-XXXX
 */
export function generateSaleNumber(dateStr: string = getTodayIST()): string {
  const compact = dateStr.replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `SL-${compact}-${randomSuffix}`;
}

/**
 * Check if a given date string (YYYY-MM-DD) falls within the selected date filter
 */
export function isDateInFilter(
  dateStr: string,
  filter: RevenueDateFilter,
  customStart?: string,
  customEnd?: string
): boolean {
  if (filter === 'ALL') return true;
  if (!dateStr) return false;

  const s = dateStr.slice(0, 10);
  const todayStr = getTodayIST();
  const today = new Date(todayStr);

  if (filter === 'TODAY') {
    return s === todayStr;
  }

  if (filter === 'YESTERDAY') {
    const yDate = new Date(today);
    yDate.setDate(yDate.getDate() - 1);
    const yStr = getTodayIST(yDate);
    return s === yStr;
  }

  if (filter === 'THIS_WEEK') {
    const curDay = today.getDay();
    const diffToMon = (curDay + 6) % 7;
    const mon = new Date(today);
    mon.setDate(today.getDate() - diffToMon);
    const monStr = getTodayIST(mon);
    return s >= monStr && s <= todayStr;
  }

  if (filter === 'THIS_MONTH') {
    return s.slice(0, 7) === todayStr.slice(0, 7);
  }

  if (filter === 'LAST_MONTH') {
    const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
    return s.slice(0, 7) === prevMonthStr;
  }

  if (filter === 'THIS_YEAR') {
    return s.slice(0, 4) === todayStr.slice(0, 4);
  }

  if (filter === 'CUSTOM') {
    if (customStart && customEnd) {
      return s >= customStart && s <= customEnd;
    }
    if (customStart) return s >= customStart;
    if (customEnd) return s <= customEnd;
    return true;
  }

  return true;
}

export const revenueService = {
  /**
   * Cached invoices retrieval
   */
  getCachedInvoices: async (forceRefresh = false): Promise<PurchaseInvoice[]> => {
    const now = Date.now();
    if (!forceRefresh && cachedInvoices && (now - cachedInvoices.timestamp < CACHE_TTL_MS)) {
      return cachedInvoices.data;
    }
    try {
      const invoices = await dbService.getInvoices();
      cachedInvoices = { data: invoices, timestamp: now };
      return invoices;
    } catch (e) {
      console.warn('Could not load invoices for revenue calculation:', e);
      return cachedInvoices?.data || [];
    }
  },

  /**
   * Cached products retrieval
   */
  getCachedProducts: async (forceRefresh = false): Promise<Product[]> => {
    const now = Date.now();
    if (!forceRefresh && cachedProducts && (now - cachedProducts.timestamp < CACHE_TTL_MS)) {
      return cachedProducts.data;
    }
    try {
      const products = await dbService.getProducts();
      cachedProducts = { data: products, timestamp: now };
      return products;
    } catch (e) {
      console.warn('Could not load products for revenue calculation:', e);
      return cachedProducts?.data || [];
    }
  },

  /**
   * Fetch manual sales directly from DB (or fallback to local cache)
   */
  getManualSales: async (): Promise<SaleTransaction[]> => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*, product:products(*)')
        .order('sale_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (!error && data) {
        const manual = data as SaleTransaction[];
        setLocalSales(manual);
        return manual;
      }
    } catch {
      // Fallback
    }
    return getLocalSales();
  },

  /**
   * Fast in-memory synthesis of sales per Product Catalog Item in alphabetical order (A to Z)
   * Aggregates total purchase amount and quantity across all invoices per catalog product item.
   */
  synthesizeProductCatalogSales: (
    products: Product[],
    invoices: PurchaseInvoice[],
    _manualSales: SaleTransaction[] = []
  ): SaleTransaction[] => {
    const overrides = getSellingPriceOverrides();

    // 1. Pre-group invoice purchase items by product_id and normalized supplier_item_name
    const itemsByProductId = new Map<string, {
      totalQty: number;
      totalCost: number;
      latestDate: string;
      items: Array<{
        purchase_item_id: string;
        invoice_id: string;
        invoice_number: string;
        invoice_date: string;
        quantity: number;
        unit_cost: number;
        total_cost: number;
      }>;
    }>();

    const itemsByName = new Map<string, {
      totalQty: number;
      totalCost: number;
      latestDate: string;
      items: Array<{
        purchase_item_id: string;
        invoice_id: string;
        invoice_number: string;
        invoice_date: string;
        quantity: number;
        unit_cost: number;
        total_cost: number;
      }>;
    }>();

    for (const inv of invoices) {
      if (!inv.items) continue;
      for (const item of inv.items) {
        const qty = Number(item.quantity) || 0;
        if (qty <= 0) continue;

        const unitCost = Number(item.purchase_rate) || item.product?.current_purchase_ref_price || 0;
        const totalCost = Number((item.total || (qty * unitCost)).toFixed(2));
        const invDate = inv.invoice_date || item.created_at?.slice(0, 10) || getTodayIST();

        const record = {
          purchase_item_id: item.id,
          invoice_id: inv.id,
          invoice_number: inv.invoice_number,
          invoice_date: inv.invoice_date,
          quantity: qty,
          unit_cost: unitCost,
          total_cost: totalCost
        };

        if (item.product_id) {
          if (!itemsByProductId.has(item.product_id)) {
            itemsByProductId.set(item.product_id, { totalQty: 0, totalCost: 0, latestDate: invDate, items: [] });
          }
          const group = itemsByProductId.get(item.product_id)!;
          group.totalQty += qty;
          group.totalCost += totalCost;
          if (invDate > group.latestDate) group.latestDate = invDate;
          group.items.push(record);
        }

        if (item.supplier_item_name_snapshot) {
          const key = item.supplier_item_name_snapshot.trim().toLowerCase();
          if (!itemsByName.has(key)) {
            itemsByName.set(key, { totalQty: 0, totalCost: 0, latestDate: invDate, items: [] });
          }
          const group = itemsByName.get(key)!;
          group.totalQty += qty;
          group.totalCost += totalCost;
          if (invDate > group.latestDate) group.latestDate = invDate;
          group.items.push(record);
        }
      }
    }

    // 2. Sort all catalog products alphabetically (A to Z) by nickname or name
    const sortedProducts = [...products].sort((a, b) =>
      (a.nickname || a.supplier_item_name || '').localeCompare(b.nickname || b.supplier_item_name || '')
    );

    const catalogSales: SaleTransaction[] = [];

    for (const p of sortedProducts) {
      // Find matching purchases
      let pData = itemsByProductId.get(p.id);
      if (!pData && p.supplier_item_name) {
        pData = itemsByName.get(p.supplier_item_name.trim().toLowerCase());
      }

      const totalQty = pData ? Number(pData.totalQty.toFixed(3)) : 0;
      const totalPurchaseAmount = pData ? Number(pData.totalCost.toFixed(2)) : 0;
      const unitCost = totalQty > 0
        ? Number((totalPurchaseAmount / totalQty).toFixed(2))
        : (p.current_purchase_ref_price || 0);

      // Determine selling price: check override first, then product selling price, else 25% markup
      let sellPrice = 0;
      if (overrides[p.id] !== undefined) {
        sellPrice = overrides[p.id];
      } else if (p.current_selling_price > 0) {
        sellPrice = p.current_selling_price;
      } else if (unitCost > 0) {
        sellPrice = Math.round(unitCost * 1.25);
      }

      const totalRevenue = Number((totalQty * sellPrice).toFixed(2));
      const grossProfit = Number((totalRevenue - totalPurchaseAmount).toFixed(2));
      const profitMargin = totalRevenue > 0
        ? Number(((grossProfit / totalRevenue) * 100).toFixed(2))
        : 0;

      const cleanCode = `PRD-${(p.nickname || 'ITEM').slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '')}-${p.id.slice(0, 4).toUpperCase()}`;

      catalogSales.push({
        id: p.id,
        sale_number: cleanCode,
        product_id: p.id,
        product: p,
        quantity: totalQty,
        purchase_price: unitCost,
        selling_price: sellPrice,
        total_revenue: totalRevenue,
        total_cogs: totalPurchaseAmount,
        gross_profit: grossProfit,
        profit_margin: profitMargin,
        sale_date: pData?.latestDate || p.created_at?.slice(0, 10) || getTodayIST(),
        customer_name: null,
        notes: pData ? `${pData.items.length} invoice purchase(s)` : 'No purchase invoices yet',
        status: 'COMPLETED',
        costing_method: 'FIFO',
        cogs_breakdown: pData?.items || [],
        created_at: p.created_at || new Date().toISOString(),
        updated_at: p.updated_at || new Date().toISOString()
      });
    }

    return catalogSales;
  },

  /**
   * Fast in-memory synthesis of sales (kept for backward compatibility)
   */
  synthesizeSales: (manualSales: SaleTransaction[], invoices: PurchaseInvoice[]): SaleTransaction[] => {
    return revenueService.synthesizeProductCatalogSales(
      cachedProducts?.data || [],
      invoices,
      manualSales
    );
  },

  /**
   * Fast in-memory stock & FIFO calculation across all products (O(N) with 0 network roundtrips)
   */
  computeAllProductsStock: (
    products: Product[],
    invoices: PurchaseInvoice[],
    manualSales: SaleTransaction[]
  ): ProductStockInfo[] => {
    const activeProducts = products.filter(p => p.is_active);

    // Sort invoices chronologically once
    const sortedInvoices = [...invoices].sort(
      (a, b) => a.invoice_date.localeCompare(b.invoice_date) || a.created_at.localeCompare(b.created_at)
    );

    // Group purchase batches by product id & name
    const batchesByProductId = new Map<string, PurchaseBatch[]>();
    const batchesByName = new Map<string, PurchaseBatch[]>();

    for (const inv of sortedInvoices) {
      if (!inv.items) continue;
      for (const item of inv.items) {
        const qty = Number(item.quantity) || 0;
        if (qty <= 0) continue;
        const unitCost = Number(item.purchase_rate) || item.product?.current_purchase_ref_price || 0;

        const batch: PurchaseBatch = {
          purchase_item_id: item.id,
          invoice_id: inv.id,
          invoice_number: inv.invoice_number,
          invoice_date: inv.invoice_date,
          original_qty: qty,
          remaining_qty: qty,
          unit_cost: Number(unitCost.toFixed(2))
        };

        if (item.product_id) {
          if (!batchesByProductId.has(item.product_id)) {
            batchesByProductId.set(item.product_id, []);
          }
          batchesByProductId.get(item.product_id)!.push({ ...batch });
        }
        if (item.supplier_item_name_snapshot) {
          const key = item.supplier_item_name_snapshot.trim().toLowerCase();
          if (!batchesByName.has(key)) {
            batchesByName.set(key, []);
          }
          batchesByName.get(key)!.push({ ...batch });
        }
      }
    }

    // Group manual sales by product
    const manualSalesByProduct = new Map<string, SaleTransaction[]>();
    for (const s of manualSales) {
      if (s.status === 'COMPLETED') {
        if (!manualSalesByProduct.has(s.product_id)) {
          manualSalesByProduct.set(s.product_id, []);
        }
        manualSalesByProduct.get(s.product_id)!.push(s);
      }
    }

    const stockInfos: ProductStockInfo[] = [];

    for (const p of activeProducts) {
      let pBatches = batchesByProductId.get(p.id);
      if (!pBatches && p.supplier_item_name) {
        pBatches = batchesByName.get(p.supplier_item_name.trim().toLowerCase());
      }
      const batches: PurchaseBatch[] = pBatches ? pBatches.map(b => ({ ...b })) : [];

      const totalPurchased = batches.reduce((sum, b) => sum + b.original_qty, 0);

      // Consume with manual sales
      const pSales = manualSalesByProduct.get(p.id) || [];
      const sortedSales = [...pSales].sort((a, b) => a.sale_date.localeCompare(b.sale_date) || a.created_at.localeCompare(b.created_at));

      let totalSold = 0;
      for (const sale of sortedSales) {
        let needed = Number(sale.quantity) || 0;
        totalSold += needed;

        for (const batch of batches) {
          if (needed <= 0) break;
          if (batch.remaining_qty <= 0) continue;

          const take = Math.min(batch.remaining_qty, needed);
          batch.remaining_qty = Number((batch.remaining_qty - take).toFixed(3));
          needed = Number((needed - take).toFixed(3));
        }
      }

      const unconsumed = batches.filter(b => b.remaining_qty > 0.0001);
      const availableStock = Number(unconsumed.reduce((sum, b) => sum + b.remaining_qty, 0).toFixed(3));
      const stockVal = unconsumed.reduce((sum, b) => sum + (b.remaining_qty * b.unit_cost), 0);

      let nextUnitPurchaseCost = 0;
      if (unconsumed.length > 0) {
        nextUnitPurchaseCost = unconsumed[0].unit_cost;
      } else if (p.current_purchase_ref_price > 0) {
        nextUnitPurchaseCost = p.current_purchase_ref_price;
      }

      stockInfos.push({
        product: p,
        totalPurchased: Number(totalPurchased.toFixed(3)),
        totalSold: Number(totalSold.toFixed(3)),
        currentStock: availableStock,
        stockValue: Number(stockVal.toFixed(2)),
        nextUnitPurchaseCost: Number(nextUnitPurchaseCost.toFixed(2)),
        hasMissingCost: nextUnitPurchaseCost <= 0
      });
    }

    return stockInfos.sort((a, b) => a.product.nickname.localeCompare(b.product.nickname));
  },

  /**
   * Fast unified loader for Revenue Page: fetches everything in parallel in 1 roundtrip
   */
  getRevenuePageData: async (forceRefresh = false): Promise<{
    sales: SaleTransaction[];
    stockInfos: ProductStockInfo[];
  }> => {
    const [invoices, products, manualSales] = await Promise.all([
      revenueService.getCachedInvoices(forceRefresh),
      revenueService.getCachedProducts(forceRefresh),
      revenueService.getManualSales()
    ]);

    const sales = revenueService.synthesizeProductCatalogSales(products, invoices, manualSales);
    const stockInfos = revenueService.computeAllProductsStock(products, invoices, manualSales);

    return { sales, stockInfos };
  },

  /**
   * Fetch all sales as product catalog items in alphabetical order with total purchase amount & quantity
   */
  getSales: async (forceRefresh = false): Promise<SaleTransaction[]> => {
    const [products, invoices, manualSales] = await Promise.all([
      revenueService.getCachedProducts(forceRefresh),
      revenueService.getCachedInvoices(forceRefresh),
      revenueService.getManualSales()
    ]);
    return revenueService.synthesizeProductCatalogSales(products, invoices, manualSales);
  },

  /**
   * Fetch a single sale transaction by ID
   */
  getSaleById: async (id: string): Promise<SaleTransaction | null> => {
    if (!id) return null;
    const all = await revenueService.getSales();
    return all.find(s => s.id === id) || null;
  },

  /**
   * Manually update the selling price for a transaction (either a purchased item or manual sale)
   */
  updateSellingPrice: async (id: string, newSellingPrice: number): Promise<SaleTransaction> => {
    if (newSellingPrice < 0) {
      throw new Error('Selling price cannot be negative.');
    }

    // Check if this ID is a manual sale
    const manualSales = getLocalSales();
    const isManualSale = manualSales.some(s => s.id === id);

    if (isManualSale) {
      return await revenueService.updateSale(id, { selling_price: newSellingPrice });
    }

    // Otherwise it's a catalog product item: persist in overrides map & database
    const overrides = getSellingPriceOverrides();
    overrides[id] = Number(newSellingPrice.toFixed(2));
    setSellingPriceOverrides(overrides);
    invalidateRevenueCache();

    try {
      await supabase.from('products').update({
        current_selling_price: Number(newSellingPrice.toFixed(2)),
        updated_at: new Date().toISOString()
      }).eq('id', id);
    } catch {
      // Non-blocking
    }

    // Fetch the updated synthesized sale
    const updated = await revenueService.getSaleById(id);
    if (!updated) {
      throw new Error('Transaction not found.');
    }

    // Record audit log
    await dbService.logAudit(
      'SALE_UPDATED',
      'sales',
      id,
      { selling_price: updated.selling_price },
      { selling_price: newSellingPrice, total_revenue: updated.total_revenue, gross_profit: updated.gross_profit },
      `Manually updated selling price for ${updated.product?.nickname || 'Item'} to ₹${newSellingPrice.toFixed(2)}`
    );

    return updated;
  },

  /**
   * Build FIFO purchase batches for a product and compute available stock & allocations
   */
  calculateProductFIFO: async (
    productId: string,
    excludeSaleId?: string
  ): Promise<{
    product: Product | null;
    totalPurchased: number;
    totalSold: number;
    availableStock: number;
    unconsumedBatches: PurchaseBatch[];
    nextUnitPurchaseCost: number;
    hasMissingCost: boolean;
  }> => {
    const [products, invoices, manualSales] = await Promise.all([
      revenueService.getCachedProducts(),
      revenueService.getCachedInvoices(),
      revenueService.getManualSales()
    ]);

    const product = products.find(p => p.id === productId) || await dbService.getProductById(productId);

    if (!product) {
      return {
        product: null,
        totalPurchased: 0,
        totalSold: 0,
        availableStock: 0,
        unconsumedBatches: [],
        nextUnitPurchaseCost: 0,
        hasMissingCost: true
      };
    }

    // 1. Gather all purchase items for this product from verified invoices
    const batches: PurchaseBatch[] = [];
    const sortedInvoices = [...invoices].sort(
      (a, b) => a.invoice_date.localeCompare(b.invoice_date) || a.created_at.localeCompare(b.created_at)
    );

    for (const inv of sortedInvoices) {
      if (!inv.items) continue;
      for (const item of inv.items) {
        const matchesProduct =
          item.product_id === productId ||
          item.supplier_item_name_snapshot?.trim().toLowerCase() === product.supplier_item_name?.trim().toLowerCase();

        if (matchesProduct) {
          const qty = Number(item.quantity) || 0;
          if (qty <= 0) continue;
          const unitCost = Number(item.purchase_rate) || product.current_purchase_ref_price || 0;

          batches.push({
            purchase_item_id: item.id,
            invoice_id: inv.id,
            invoice_number: inv.invoice_number,
            invoice_date: inv.invoice_date,
            original_qty: qty,
            remaining_qty: qty,
            unit_cost: Number(unitCost.toFixed(2))
          });
        }
      }
    }

    const totalPurchased = batches.reduce((sum, b) => sum + b.original_qty, 0);

    // Filter to manual sales only for stock reduction calculation
    const productSales = manualSales.filter(
      s => s.product_id === productId && s.status === 'COMPLETED' && s.id !== excludeSaleId
    ).sort((a, b) => a.sale_date.localeCompare(b.sale_date) || a.created_at.localeCompare(b.created_at));

    let totalSold = 0;
    for (const sale of productSales) {
      let needed = Number(sale.quantity) || 0;
      totalSold += needed;

      for (const batch of batches) {
        if (needed <= 0) break;
        if (batch.remaining_qty <= 0) continue;

        const take = Math.min(batch.remaining_qty, needed);
        batch.remaining_qty = Number((batch.remaining_qty - take).toFixed(3));
        needed = Number((needed - take).toFixed(3));
      }
    }

    // Available stock across unconsumed batches
    const unconsumedBatches = batches.filter(b => b.remaining_qty > 0.0001);
    const availableStock = Number(unconsumedBatches.reduce((sum, b) => sum + b.remaining_qty, 0).toFixed(3));

    // Determine the next unit purchase cost
    let nextUnitPurchaseCost = 0;
    if (unconsumedBatches.length > 0) {
      nextUnitPurchaseCost = unconsumedBatches[0].unit_cost;
    } else if (product.current_purchase_ref_price > 0) {
      nextUnitPurchaseCost = product.current_purchase_ref_price;
    }

    const hasMissingCost = nextUnitPurchaseCost <= 0;

    return {
      product,
      totalPurchased: Number(totalPurchased.toFixed(3)),
      totalSold: Number(totalSold.toFixed(3)),
      availableStock,
      unconsumedBatches,
      nextUnitPurchaseCost: Number(nextUnitPurchaseCost.toFixed(2)),
      hasMissingCost
    };
  },

  /**
   * Allocate purchase cost using FIFO for a sale of quantityToSell
   */
  allocateFIFO: async (
    productId: string,
    quantityToSell: number,
    excludeSaleId?: string
  ): Promise<{
    totalCogs: number;
    unitPurchasePrice: number;
    allocations: CogsBatchAllocation[];
    availableStock: number;
    product: Product;
  }> => {
    if (quantityToSell <= 0) {
      throw new Error('Quantity sold must be greater than zero.');
    }

    const fifoState = await revenueService.calculateProductFIFO(productId, excludeSaleId);
    if (!fifoState.product) {
      throw new Error('Selected product not found in database.');
    }

    // Check available stock
    if (quantityToSell > fifoState.availableStock + 0.0001) {
      throw new Error(
        `Quantity sold (${quantityToSell}) exceeds available stock (${fifoState.availableStock}). Please reduce quantity or record a purchase invoice first.`
      );
    }

    const allocations: CogsBatchAllocation[] = [];
    let remainingNeeded = quantityToSell;
    let totalCogs = 0;

    for (const batch of fifoState.unconsumedBatches) {
      if (remainingNeeded <= 0.0001) break;
      const take = Math.min(batch.remaining_qty, remainingNeeded);
      const costForSlice = Number((take * batch.unit_cost).toFixed(2));

      allocations.push({
        purchase_item_id: batch.purchase_item_id,
        invoice_id: batch.invoice_id,
        invoice_number: batch.invoice_number,
        invoice_date: batch.invoice_date,
        quantity: Number(take.toFixed(3)),
        unit_cost: batch.unit_cost,
        total_cost: costForSlice
      });

      totalCogs += costForSlice;
      remainingNeeded = Number((remainingNeeded - take).toFixed(3));
    }

    if (remainingNeeded > 0.0001) {
      const fallbackRate = fifoState.product.current_purchase_ref_price || 0;
      const costForSlice = Number((remainingNeeded * fallbackRate).toFixed(2));
      allocations.push({
        quantity: Number(remainingNeeded.toFixed(3)),
        unit_cost: fallbackRate,
        total_cost: costForSlice
      });
      totalCogs += costForSlice;
    }

    const finalCogs = Number(totalCogs.toFixed(2));
    const unitPurchasePrice = Number((finalCogs / quantityToSell).toFixed(2));

    return {
      totalCogs: finalCogs,
      unitPurchasePrice,
      allocations,
      availableStock: fifoState.availableStock,
      product: fifoState.product
    };
  },

  /**
   * Create and record a new manual sale transaction (without requiring customer name, date, notes)
   */
  createSale: async (input: CreateSaleInput): Promise<SaleTransaction> => {
    const { product_id, quantity, selling_price, sale_date, customer_name, notes } = input;

    if (!product_id) throw new Error('Product selection is required.');
    if (quantity <= 0) throw new Error('Quantity sold must be greater than zero.');
    if (selling_price < 0) throw new Error('Selling price cannot be negative.');

    if (productSaleLocks.has(product_id)) {
      throw new Error('Another sale transaction is being processed for this product. Please wait a moment.');
    }
    productSaleLocks.add(product_id);

    try {
      const fingerprint = `${product_id}-${quantity}-${selling_price.toFixed(2)}`;
      const nowMs = Date.now();
      const last = recentSaleSubmissions.get(fingerprint);
      if (last && nowMs - last < DUPLICATE_WINDOW_MS) {
        throw new Error('Duplicate sale submission detected. Please do not submit multiple times.');
      }
      recentSaleSubmissions.set(fingerprint, nowMs);

      const fifoResult = await revenueService.allocateFIFO(product_id, quantity);

      const saleId = generateUUID();
      const now = new Date().toISOString();
      const effectiveSaleDate = sale_date || getTodayIST();
      const saleNumber = generateSaleNumber(effectiveSaleDate);

      const totalRevenue = Number((quantity * selling_price).toFixed(2));
      const totalCogs = fifoResult.totalCogs;
      const grossProfit = Number((totalRevenue - totalCogs).toFixed(2));
      const profitMargin = totalRevenue > 0
        ? Number(((grossProfit / totalRevenue) * 100).toFixed(2))
        : 0;

      const saleRecord: SaleTransaction = {
        id: saleId,
        sale_number: saleNumber,
        product_id,
        product: fifoResult.product,
        quantity: Number(quantity.toFixed(3)),
        purchase_price: fifoResult.unitPurchasePrice,
        selling_price: Number(selling_price.toFixed(2)),
        total_revenue: totalRevenue,
        total_cogs: totalCogs,
        gross_profit: grossProfit,
        profit_margin: profitMargin,
        sale_date: effectiveSaleDate,
        customer_name: customer_name?.trim() || null,
        notes: notes?.trim() || null,
        status: 'COMPLETED',
        costing_method: 'FIFO',
        cogs_breakdown: fifoResult.allocations,
        created_at: now,
        updated_at: now
      };

      try {
        await supabase
          .from('sales')
          .insert({
            id: saleRecord.id,
            sale_number: saleRecord.sale_number,
            product_id: saleRecord.product_id,
            quantity: saleRecord.quantity,
            purchase_price: saleRecord.purchase_price,
            selling_price: saleRecord.selling_price,
            total_revenue: saleRecord.total_revenue,
            total_cogs: saleRecord.total_cogs,
            gross_profit: saleRecord.gross_profit,
            profit_margin: saleRecord.profit_margin,
            sale_date: saleRecord.sale_date,
            customer_name: saleRecord.customer_name,
            notes: saleRecord.notes,
            status: saleRecord.status,
            costing_method: saleRecord.costing_method,
            cogs_breakdown: saleRecord.cogs_breakdown,
            created_at: saleRecord.created_at,
            updated_at: saleRecord.updated_at
          });
      } catch (err) {
        console.warn('Supabase sales insert notice:', err);
      }

      const currentSales = getLocalSales();
      setLocalSales([saleRecord, ...currentSales.filter(s => s.id !== saleId)]);
      invalidateRevenueCache();

      try {
        await supabase.from('stock_transactions').insert({
          id: generateUUID(),
          product_id,
          transaction_type: 'ADJUSTMENT',
          quantity: -Number(quantity.toFixed(3)),
          reference_id: saleId,
          reference_type: 'SALE',
          notes: `Sold ${quantity} ${fifoResult.product.uom} via Sale #${saleNumber}`,
          created_at: now
        });
      } catch (stErr) {
        console.warn('Stock transaction log notice:', stErr);
      }

      await dbService.logAudit(
        'SALE_CREATED',
        'sales',
        saleId,
        null,
        {
          sale_number: saleRecord.sale_number,
          product: fifoResult.product.nickname,
          quantity: saleRecord.quantity,
          selling_price: saleRecord.selling_price,
          total_revenue: saleRecord.total_revenue,
          gross_profit: saleRecord.gross_profit
        },
        `Created Sale #${saleNumber} for ${quantity} ${fifoResult.product.uom} of ${fifoResult.product.nickname}`
      );

      return saleRecord;
    } finally {
      productSaleLocks.delete(product_id);
    }
  },

  /**
   * Update an existing sale transaction
   */
  updateSale: async (id: string, input: UpdateSaleInput): Promise<SaleTransaction> => {
    // Check if this is a purchased item
    const overrides = getSellingPriceOverrides();
    const manualSales = getLocalSales();
    const isManualSale = manualSales.some(s => s.id === id);

    if (!isManualSale) {
      if (input.selling_price !== undefined) {
        return await revenueService.updateSellingPrice(id, input.selling_price);
      }
    }

    const existing = await revenueService.getSaleById(id);
    if (!existing) throw new Error(`Sale with ID ${id} not found.`);

    const productId = existing.product_id;
    const effectiveQty = input.quantity !== undefined ? input.quantity : existing.quantity;
    const effectiveSellingPrice = input.selling_price !== undefined ? input.selling_price : existing.selling_price;
    const effectiveSaleDate = input.sale_date || existing.sale_date;
    const effectiveStatus = input.status || existing.status;

    if (effectiveQty <= 0) throw new Error('Quantity sold must be greater than zero.');
    if (effectiveSellingPrice < 0) throw new Error('Selling price cannot be negative.');

    let fifoResult = {
      product: existing.product!,
      unitPurchasePrice: existing.purchase_price,
      totalCogs: Number((effectiveQty * existing.purchase_price).toFixed(2)),
      allocations: existing.cogs_breakdown || []
    };

    if (isManualSale) {
      const res = await revenueService.allocateFIFO(productId, effectiveQty, id);
      fifoResult = {
        product: res.product,
        unitPurchasePrice: res.unitPurchasePrice,
        totalCogs: res.totalCogs,
        allocations: res.allocations
      };
    }

    const now = new Date().toISOString();
    const totalRevenue = Number((effectiveQty * effectiveSellingPrice).toFixed(2));
    const totalCogs = fifoResult.totalCogs;
    const grossProfit = Number((totalRevenue - totalCogs).toFixed(2));
    const profitMargin = totalRevenue > 0
      ? Number(((grossProfit / totalRevenue) * 100).toFixed(2))
      : 0;

    const updatedSale: SaleTransaction = {
      ...existing,
      product: fifoResult.product,
      quantity: Number(effectiveQty.toFixed(3)),
      purchase_price: fifoResult.unitPurchasePrice,
      selling_price: Number(effectiveSellingPrice.toFixed(2)),
      total_revenue: totalRevenue,
      total_cogs: totalCogs,
      gross_profit: grossProfit,
      profit_margin: profitMargin,
      sale_date: effectiveSaleDate,
      customer_name: null,
      notes: null,
      status: effectiveStatus,
      cogs_breakdown: fifoResult.allocations,
      updated_at: now
    };

    if (isManualSale) {
      try {
        await supabase
          .from('sales')
          .update({
            quantity: updatedSale.quantity,
            purchase_price: updatedSale.purchase_price,
            selling_price: updatedSale.selling_price,
            total_revenue: updatedSale.total_revenue,
            total_cogs: updatedSale.total_cogs,
            gross_profit: updatedSale.gross_profit,
            profit_margin: updatedSale.profit_margin,
            sale_date: updatedSale.sale_date,
            status: updatedSale.status,
            cogs_breakdown: updatedSale.cogs_breakdown,
            updated_at: updatedSale.updated_at
          })
          .eq('id', id);
      } catch (e) {
        console.warn('Supabase sales update notice:', e);
      }

      const currentSales = getLocalSales();
      setLocalSales(currentSales.map(s => s.id === id ? updatedSale : s));
      invalidateRevenueCache();
    } else {
      overrides[id] = Number(effectiveSellingPrice.toFixed(2));
      setSellingPriceOverrides(overrides);
      invalidateRevenueCache();
    }

    await dbService.logAudit(
      'SALE_UPDATED',
      'sales',
      id,
      {
        selling_price: existing.selling_price,
        total_revenue: existing.total_revenue
      },
      {
        selling_price: updatedSale.selling_price,
        total_revenue: updatedSale.total_revenue,
        gross_profit: updatedSale.gross_profit
      },
      `Updated selling price for Sale #${existing.sale_number} to ₹${effectiveSellingPrice.toFixed(2)}`
    );

    return updatedSale;
  },

  /**
   * Delete or void a sale transaction
   */
  deleteSale: async (id: string, reason?: string): Promise<void> => {
    const existing = await revenueService.getSaleById(id);
    if (!existing) return;

    const manualSales = getLocalSales();
    const isManualSale = manualSales.some(s => s.id === id);

    if (isManualSale) {
      try {
        await supabase.from('sales').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase sales delete notice:', e);
      }

      setLocalSales(manualSales.filter(s => s.id !== id));

      try {
        await supabase
          .from('stock_transactions')
          .delete()
          .eq('reference_id', id)
          .eq('reference_type', 'SALE');
      } catch (e) {
        console.warn('Stock transaction delete notice:', e);
      }
    } else {
      // If purchased item, reset its override
      const overrides = getSellingPriceOverrides();
      delete overrides[id];
      setSellingPriceOverrides(overrides);
    }
    invalidateRevenueCache();

    await dbService.logAudit(
      'SALE_DELETED',
      'sales',
      id,
      {
        sale_number: existing.sale_number,
        product_id: existing.product_id,
        quantity: existing.quantity,
        total_revenue: existing.total_revenue
      },
      null,
      `Removed Sale #${existing.sale_number}. Reason: ${reason || 'User requested reset'}`
    );
  },

  /**
   * Get complete stock info across all catalog products
   */
  getAllProductsStockInfo: async (forceRefresh = false): Promise<ProductStockInfo[]> => {
    const [invoices, products, manualSales] = await Promise.all([
      revenueService.getCachedInvoices(forceRefresh),
      revenueService.getCachedProducts(forceRefresh),
      revenueService.getManualSales()
    ]);
    return revenueService.computeAllProductsStock(products, invoices, manualSales);
  },

  /**
   * Filter sales by date filter preset or custom range
   * When filter is NOT 'ALL', re-aggregates each product's purchases/revenue to strictly include
   * ONLY the activity from that selected period, excluding products with zero activity in that period.
   */
  filterSalesByDate: (
    sales: SaleTransaction[],
    filter: RevenueDateFilter,
    customStart?: string,
    customEnd?: string
  ): SaleTransaction[] => {
    if (filter === 'ALL') return sales;

    const filtered: SaleTransaction[] = [];

    for (const s of sales) {
      // If this transaction has purchase batches in cogs_breakdown (e.g. catalog product item)
      if (s.cogs_breakdown && s.cogs_breakdown.length > 0) {
        const matchingBatches = s.cogs_breakdown.filter(b =>
          isDateInFilter(b.invoice_date || s.sale_date, filter, customStart, customEnd)
        );

        // If no purchases/invoices occurred in this date period, skip this product
        if (matchingBatches.length === 0) {
          continue;
        }

        const periodQty = Number(matchingBatches.reduce((sum, b) => sum + b.quantity, 0).toFixed(3));
        const periodCost = Number(matchingBatches.reduce((sum, b) => sum + b.total_cost, 0).toFixed(2));
        const unitCost = periodQty > 0 ? Number((periodCost / periodQty).toFixed(2)) : s.purchase_price;
        const sellPrice = s.selling_price;
        const totalRevenue = Number((periodQty * sellPrice).toFixed(2));
        const grossProfit = Number((totalRevenue - periodCost).toFixed(2));
        const profitMargin = totalRevenue > 0
          ? Number(((grossProfit / totalRevenue) * 100).toFixed(2))
          : 0;

        // Find latest invoice date in this period
        const initialDate = matchingBatches[0]?.invoice_date || s.sale_date;
        const latestMatchingDate: string = matchingBatches.reduce<string>(
          (latest, b) => ((b.invoice_date && b.invoice_date > latest) ? b.invoice_date : latest),
          initialDate
        );

        filtered.push({
          ...s,
          quantity: periodQty,
          purchase_price: unitCost,
          total_revenue: totalRevenue,
          total_cogs: periodCost,
          gross_profit: grossProfit,
          profit_margin: profitMargin,
          sale_date: latestMatchingDate,
          cogs_breakdown: matchingBatches,
          notes: `${matchingBatches.length} invoice purchase(s) in selected period`
        });
      } else {
        // Individual manual sale transaction
        if (isDateInFilter(s.sale_date, filter, customStart, customEnd)) {
          filtered.push(s);
        }
      }
    }

    return filtered;
  },

  /**
   * Compute aggregate KPI summary metrics
   */
  getRevenueMetrics: (
    filteredSales: SaleTransaction[],
    stockInfos: ProductStockInfo[]
  ): RevenueMetrics => {
    const completedSales = filteredSales.filter(s => s.status === 'COMPLETED');

    const totalRevenue = completedSales.reduce((sum, s) => sum + s.total_revenue, 0);
    const totalCogs = completedSales.reduce((sum, s) => sum + s.total_cogs, 0);
    const grossProfit = Number((totalRevenue - totalCogs).toFixed(2));
    const grossProfitMargin = totalRevenue > 0
      ? Number(((grossProfit / totalRevenue) * 100).toFixed(2))
      : 0;

    const totalItemsSold = completedSales.reduce((sum, s) => sum + s.quantity, 0);
    const currentStockValue = stockInfos.reduce((sum, si) => sum + si.stockValue, 0);

    return {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalCogs: Number(totalCogs.toFixed(2)),
      grossProfit,
      grossProfitMargin,
      totalItemsSold: Number(totalItemsSold.toFixed(3)),
      totalTransactions: completedSales.length,
      currentStockValue: Number(currentStockValue.toFixed(2))
    };
  },

  /**
   * Compute chart-ready analytics data
   */
  getRevenueAnalytics: (
    filteredSales: SaleTransaction[],
    allSales: SaleTransaction[]
  ) => {
    const completed = filteredSales.filter(s => s.status === 'COMPLETED');
    const datasetForMonthly = completed.length > 0 ? completed : allSales.filter(s => s.status === 'COMPLETED');

    const monthlyMap: Record<string, { month: string; revenue: number; cogs: number; profit: number; margin: number }> = {};

    datasetForMonthly.forEach(s => {
      const monthKey = s.sale_date.slice(0, 7);
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { month: monthKey, revenue: 0, cogs: 0, profit: 0, margin: 0 };
      }
      monthlyMap[monthKey].revenue += s.total_revenue;
      monthlyMap[monthKey].cogs += s.total_cogs;
      monthlyMap[monthKey].profit += s.gross_profit;
    });

    const monthlyTimeline = Object.values(monthlyMap)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(m => ({
        ...m,
        revenue: Number(m.revenue.toFixed(2)),
        cogs: Number(m.cogs.toFixed(2)),
        profit: Number(m.profit.toFixed(2)),
        margin: m.revenue > 0 ? Number(((m.profit / m.revenue) * 100).toFixed(1)) : 0
      }));

    const dailyMap: Record<string, { date: string; revenue: number; profit: number; count: number }> = {};
    completed.forEach(s => {
      const dateKey = s.sale_date;
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { date: dateKey, revenue: 0, profit: 0, count: 0 };
      }
      dailyMap[dateKey].revenue += s.total_revenue;
      dailyMap[dateKey].profit += s.gross_profit;
      dailyMap[dateKey].count += 1;
    });

    const dailyTrend = Object.values(dailyMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({
        ...d,
        revenue: Number(d.revenue.toFixed(2)),
        profit: Number(d.profit.toFixed(2))
      }));

    const productStatsMap: Record<string, {
      product_id: string;
      name: string;
      revenue: number;
      cogs: number;
      profit: number;
      quantitySold: number;
      margin: number;
    }> = {};

    completed.forEach(s => {
      const pName = s.product?.nickname || 'Unknown Item';
      const pid = s.product_id;
      if (!productStatsMap[pid]) {
        productStatsMap[pid] = {
          product_id: pid,
          name: pName,
          revenue: 0,
          cogs: 0,
          profit: 0,
          quantitySold: 0,
          margin: 0
        };
      }
      productStatsMap[pid].revenue += s.total_revenue;
      productStatsMap[pid].cogs += s.total_cogs;
      productStatsMap[pid].profit += s.gross_profit;
      productStatsMap[pid].quantitySold += s.quantity;
    });

    const productBreakdown = Object.values(productStatsMap)
      .map(p => ({
        ...p,
        revenue: Number(p.revenue.toFixed(2)),
        cogs: Number(p.cogs.toFixed(2)),
        profit: Number(p.profit.toFixed(2)),
        quantitySold: Number(p.quantitySold.toFixed(3)),
        margin: p.revenue > 0 ? Number(((p.profit / p.revenue) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const bestSelling = [...productBreakdown].sort((a, b) => b.quantitySold - a.quantitySold).slice(0, 5);

    return {
      monthlyTimeline,
      dailyTrend,
      productBreakdown,
      bestSelling
    };
  }
};
