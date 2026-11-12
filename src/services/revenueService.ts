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
 * - Atomically synchronizes with Supabase database and audit logs.
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

// Local storage key for persistent sales storage when table is pending migration
const LOCAL_STORAGE_KEY_SALES = 'ramachandran_sales_v1';

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

/**
 * Generate unique IST sale number: SL-YYYYMMDD-XXXX
 */
export function generateSaleNumber(dateStr: string = getTodayIST()): string {
  const compact = dateStr.replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `SL-${compact}-${randomSuffix}`;
}

export const revenueService = {
  /**
   * Fetch all sales from Supabase (with fallback to local sync cache)
   */
  getSales: async (): Promise<SaleTransaction[]> => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*, product:products(*)')
        .order('sale_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (!error && data) {
        const sales = data as SaleTransaction[];
        setLocalSales(sales);
        return sales;
      }
    } catch {
      // Table may be unmigrated yet; fall through to local cache
    }

    // Fallback: load local sales and attach products
    const local = getLocalSales();
    try {
      const prods = await dbService.getProducts();
      const prodMap = new Map(prods.map(p => [p.id, p]));
      return local.map(s => ({
        ...s,
        product: s.product || prodMap.get(s.product_id)
      })).sort((a, b) => b.sale_date.localeCompare(a.sale_date) || b.created_at.localeCompare(a.created_at));
    } catch {
      return local;
    }
  },

  /**
   * Fetch a single sale transaction by ID
   */
  getSaleById: async (id: string): Promise<SaleTransaction | null> => {
    if (!id) return null;
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*, product:products(*)')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        return data as SaleTransaction;
      }
    } catch {
      // Fallback
    }

    const local = getLocalSales();
    const found = local.find(s => s.id === id);
    if (!found) return null;
    try {
      const prod = await dbService.getProductById(found.product_id);
      return { ...found, product: prod || found.product };
    } catch {
      return found;
    }
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
    const [product, invoices, allSales] = await Promise.all([
      dbService.getProductById(productId),
      dbService.getInvoices(),
      revenueService.getSales()
    ]);

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

    // 2. Consume batches according to existing COMPLETED sales (in FIFO order)
    const productSales = allSales.filter(
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

    // If there was no unconsumed purchase invoice batch (e.g. stock added manually), fallback to catalog ref price
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
   * Create and record a new manual sale transaction
   */
  createSale: async (input: CreateSaleInput): Promise<SaleTransaction> => {
    const { product_id, quantity, selling_price, sale_date, customer_name, notes } = input;

    if (!product_id) throw new Error('Product selection is required.');
    if (quantity <= 0) throw new Error('Quantity sold must be greater than zero.');
    if (selling_price < 0) throw new Error('Selling price cannot be negative.');

    // Concurrency guard per product
    if (productSaleLocks.has(product_id)) {
      throw new Error('Another sale transaction is being processed for this product. Please wait a moment.');
    }
    productSaleLocks.add(product_id);

    try {
      // Duplicate submission guard
      const fingerprint = `${product_id}-${quantity}-${selling_price.toFixed(2)}-${sale_date || ''}`;
      const nowMs = Date.now();
      const last = recentSaleSubmissions.get(fingerprint);
      if (last && nowMs - last < DUPLICATE_WINDOW_MS) {
        throw new Error('Duplicate sale submission detected. Please do not submit multiple times.');
      }
      recentSaleSubmissions.set(fingerprint, nowMs);

      // Perform FIFO cost allocation and stock validation
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

      // 1. Persist to Supabase sales table (if migrated) or sync cache
      try {
        const { error: insertErr } = await supabase
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

        if (insertErr) {
          console.warn('Supabase sales insert warning (falling back to sync storage):', insertErr.message);
        }
      } catch (err) {
        console.warn('Supabase sales table notice:', err);
      }

      // Always maintain persistent local cache
      const currentSales = getLocalSales();
      setLocalSales([saleRecord, ...currentSales.filter(s => s.id !== saleId)]);

      // 2. Record stock movement in stock_transactions
      try {
        await supabase.from('stock_transactions').insert({
          id: generateUUID(),
          product_id,
          transaction_type: 'ADJUSTMENT', // Safe across all enum schemas
          quantity: -Number(quantity.toFixed(3)),
          reference_id: saleId,
          reference_type: 'SALE',
          notes: `Sold ${quantity} ${fifoResult.product.uom} via Sale #${saleNumber} to ${customer_name || 'Walk-in'}`,
          created_at: now
        });
      } catch (stErr) {
        console.warn('Stock transaction log notice:', stErr);
      }

      // 3. Record immutable audit log
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
        `Created Sale #${saleNumber} for ${quantity} ${fifoResult.product.uom} of ${fifoResult.product.nickname} (Revenue: ₹${totalRevenue.toLocaleString('en-IN')})`
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
    const existing = await revenueService.getSaleById(id);
    if (!existing) throw new Error(`Sale with ID ${id} not found.`);

    const productId = existing.product_id;
    const effectiveQty = input.quantity !== undefined ? input.quantity : existing.quantity;
    const effectiveSellingPrice = input.selling_price !== undefined ? input.selling_price : existing.selling_price;
    const effectiveSaleDate = input.sale_date || existing.sale_date;
    const effectiveStatus = input.status || existing.status;

    if (effectiveQty <= 0) throw new Error('Quantity sold must be greater than zero.');
    if (effectiveSellingPrice < 0) throw new Error('Selling price cannot be negative.');

    // Re-run FIFO cost allocation excluding current sale ID
    const fifoResult = await revenueService.allocateFIFO(productId, effectiveQty, id);

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
      customer_name: input.customer_name !== undefined ? (input.customer_name?.trim() || null) : existing.customer_name,
      notes: input.notes !== undefined ? (input.notes?.trim() || null) : existing.notes,
      status: effectiveStatus,
      cogs_breakdown: fifoResult.allocations,
      updated_at: now
    };

    // 1. Update in Supabase
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
          customer_name: updatedSale.customer_name,
          notes: updatedSale.notes,
          status: updatedSale.status,
          cogs_breakdown: updatedSale.cogs_breakdown,
          updated_at: updatedSale.updated_at
        })
        .eq('id', id);
    } catch (e) {
      console.warn('Supabase sales update notice:', e);
    }

    // Update local cache
    const currentSales = getLocalSales();
    setLocalSales(currentSales.map(s => s.id === id ? updatedSale : s));

    // Audit log
    await dbService.logAudit(
      'SALE_UPDATED',
      'sales',
      id,
      {
        quantity: existing.quantity,
        selling_price: existing.selling_price,
        total_revenue: existing.total_revenue,
        gross_profit: existing.gross_profit
      },
      {
        quantity: updatedSale.quantity,
        selling_price: updatedSale.selling_price,
        total_revenue: updatedSale.total_revenue,
        gross_profit: updatedSale.gross_profit
      },
      `Updated Sale #${existing.sale_number} (${fifoResult.product.nickname})`
    );

    return updatedSale;
  },

  /**
   * Delete or void a sale transaction and restore inventory stock
   */
  deleteSale: async (id: string, reason?: string): Promise<void> => {
    const existing = await revenueService.getSaleById(id);
    if (!existing) return;

    // 1. Delete from Supabase
    try {
      await supabase.from('sales').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase sales delete notice:', e);
    }

    // 2. Remove from local cache
    const currentSales = getLocalSales();
    setLocalSales(currentSales.filter(s => s.id !== id));

    // 3. Remove/revert stock transactions
    try {
      await supabase
        .from('stock_transactions')
        .delete()
        .eq('reference_id', id)
        .eq('reference_type', 'SALE');
    } catch (e) {
      console.warn('Stock transaction delete notice:', e);
    }

    // 4. Audit log
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
      `Deleted Sale #${existing.sale_number} (Restored ${existing.quantity} units to inventory). Reason: ${reason || 'User requested deletion'}`
    );
  },

  /**
   * Get complete stock info across all catalog products
   */
  getAllProductsStockInfo: async (): Promise<ProductStockInfo[]> => {
    const products = await dbService.getProducts();
    const activeProducts = products.filter(p => p.is_active);

    const stockInfos: ProductStockInfo[] = [];
    for (const p of activeProducts) {
      const fifo = await revenueService.calculateProductFIFO(p.id);
      // Stock value: remaining unconsumed batches multiplied by their purchase cost
      const stockVal = fifo.unconsumedBatches.reduce(
        (sum, b) => sum + (b.remaining_qty * b.unit_cost),
        0
      );

      stockInfos.push({
        product: p,
        totalPurchased: fifo.totalPurchased,
        totalSold: fifo.totalSold,
        currentStock: fifo.availableStock,
        stockValue: Number(stockVal.toFixed(2)),
        nextUnitPurchaseCost: fifo.nextUnitPurchaseCost,
        hasMissingCost: fifo.hasMissingCost
      });
    }

    return stockInfos.sort((a, b) => a.product.nickname.localeCompare(b.product.nickname));
  },

  /**
   * Filter sales by date filter preset or custom range
   */
  filterSalesByDate: (
    sales: SaleTransaction[],
    filter: RevenueDateFilter,
    customStart?: string,
    customEnd?: string
  ): SaleTransaction[] => {
    if (filter === 'ALL') return sales;

    const todayStr = getTodayIST();
    const today = new Date(todayStr);

    return sales.filter(s => {
      const dateStr = (s.sale_date || '').slice(0, 10);
      if (!dateStr) return false;

      if (filter === 'TODAY') {
        return dateStr === todayStr;
      }

      if (filter === 'YESTERDAY') {
        const yDate = new Date(today);
        yDate.setDate(yDate.getDate() - 1);
        const yStr = getTodayIST(yDate);
        return dateStr === yStr;
      }

      if (filter === 'THIS_WEEK') {
        // Monday-to-Sunday current week
        const curDay = today.getDay(); // 0 is Sunday
        const diffToMon = (curDay + 6) % 7;
        const mon = new Date(today);
        mon.setDate(today.getDate() - diffToMon);
        const monStr = getTodayIST(mon);
        return dateStr >= monStr && dateStr <= todayStr;
      }

      if (filter === 'THIS_MONTH') {
        return dateStr.slice(0, 7) === todayStr.slice(0, 7);
      }

      if (filter === 'LAST_MONTH') {
        const lDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lStr = getTodayIST(lDate).slice(0, 7);
        return dateStr.slice(0, 7) === lStr;
      }

      if (filter === 'THIS_YEAR') {
        return dateStr.slice(0, 4) === todayStr.slice(0, 4);
      }

      if (filter === 'CUSTOM') {
        if (customStart && customEnd) {
          return dateStr >= customStart && dateStr <= customEnd;
        }
        if (customStart) return dateStr >= customStart;
        if (customEnd) return dateStr <= customEnd;
        return true;
      }

      return true;
    });
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

    // 1. Monthly Revenue vs COGS vs Gross Profit (all-time or filtered timeline)
    const monthlyMap: Record<string, { month: string; revenue: number; cogs: number; profit: number; margin: number }> = {};
    const datasetForMonthly = completed.length > 0 ? completed : allSales.filter(s => s.status === 'COMPLETED');

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

    // 2. Daily Revenue Trend
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

    // 3. Product-wise Revenue and Profit
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

    // 4. Best-Selling Products (Ranked by quantity sold)
    const bestSelling = [...productBreakdown].sort((a, b) => b.quantitySold - a.quantitySold).slice(0, 5);

    return {
      monthlyTimeline,
      dailyTrend,
      productBreakdown,
      bestSelling
    };
  }
};
