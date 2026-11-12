import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  AlertCircle,
  CheckCircle2,
  Calendar,
  User,
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Product, ProductStockInfo, CreateSaleInput } from '../../types';
import { revenueService } from '../../services/revenueService';
import { getTodayIST, formatINR } from '../../utils/dateUtils';
import { useToast } from '../../context/ToastContext';

interface AddSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  stockInfos: ProductStockInfo[];
}

export const AddSaleModal: React.FC<AddSaleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  stockInfos
}) => {
  const { success: toastSuccess, error: toastError } = useToast();

  const [productId, setProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [saleDate, setSaleDate] = useState<string>(getTodayIST());
  const [customerName, setCustomerName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [calculatingCogs, setCalculatingCogs] = useState<boolean>(false);
  const [cogsInfo, setCogsInfo] = useState<{
    unitPurchasePrice: number;
    totalCogs: number;
    availableStock: number;
    error?: string;
  } | null>(null);

  // Selected product info
  const selectedProductInfo = useMemo(() => {
    return stockInfos.find(si => si.product.id === productId) || null;
  }, [stockInfos, productId]);

  // When opening or products list changes, select first product with available stock if none selected
  useEffect(() => {
    if (isOpen) {
      setSaleDate(getTodayIST());
      setCustomerName('');
      setNotes('');
      if (!productId && stockInfos.length > 0) {
        // Prefer first product with stock
        const withStock = stockInfos.find(si => si.currentStock > 0);
        const target = withStock || stockInfos[0];
        setProductId(target.product.id);
        setSellingPrice(target.product.current_selling_price || Math.round(target.nextUnitPurchaseCost * 1.3));
        setQuantity(1);
      }
    }
  }, [isOpen, stockInfos]);

  // Whenever product changes, update selling price default and recalculate COGS
  const handleProductChange = (newProdId: string) => {
    setProductId(newProdId);
    const info = stockInfos.find(si => si.product.id === newProdId);
    if (info) {
      const defaultSell = info.product.current_selling_price > 0
        ? info.product.current_selling_price
        : Math.round(info.nextUnitPurchaseCost * 1.3);
      setSellingPrice(defaultSell);
      if (quantity <= 0) setQuantity(1);
    }
  };

  // Live FIFO calculation whenever product or quantity changes
  useEffect(() => {
    let isCancelled = false;

    if (!productId || quantity <= 0) {
      setCogsInfo(null);
      return;
    }

    const runCalc = async () => {
      setCalculatingCogs(true);
      try {
        const res = await revenueService.allocateFIFO(productId, quantity);
        if (!isCancelled) {
          setCogsInfo({
            unitPurchasePrice: res.unitPurchasePrice,
            totalCogs: res.totalCogs,
            availableStock: res.availableStock
          });
        }
      } catch (err: any) {
        if (!isCancelled) {
          const available = selectedProductInfo?.currentStock ?? 0;
          setCogsInfo({
            unitPurchasePrice: selectedProductInfo?.nextUnitPurchaseCost ?? 0,
            totalCogs: 0,
            availableStock: available,
            error: err.message
          });
        }
      } finally {
        if (!isCancelled) setCalculatingCogs(false);
      }
    };

    const timer = setTimeout(runCalc, 150);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [productId, quantity, selectedProductInfo]);

  // Calculations
  const availableStock = selectedProductInfo?.currentStock ?? 0;
  const isOutOfStock = availableStock <= 0;
  const isExceedingStock = quantity > availableStock;
  const unitCost = cogsInfo?.unitPurchasePrice ?? (selectedProductInfo?.nextUnitPurchaseCost ?? 0);
  const totalRevenue = Number((quantity * sellingPrice).toFixed(2));
  const totalCogs = cogsInfo && !cogsInfo.error ? cogsInfo.totalCogs : Number((quantity * unitCost).toFixed(2));
  const grossProfit = Number((totalRevenue - totalCogs).toFixed(2));
  const profitMargin = totalRevenue > 0 ? Number(((grossProfit / totalRevenue) * 100).toFixed(2)) : 0;
  const isProfit = grossProfit >= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      toastError('Validation error', 'Please select a product.');
      return;
    }
    if (quantity <= 0) {
      toastError('Validation error', 'Quantity sold must be greater than zero.');
      return;
    }
    if (isExceedingStock) {
      toastError(
        'Stock exceeded',
        `Cannot sell ${quantity} units. Only ${availableStock} units available in stock.`
      );
      return;
    }
    if (sellingPrice < 0) {
      toastError('Validation error', 'Selling price cannot be negative.');
      return;
    }

    setIsSubmitting(true);
    try {
      const input: CreateSaleInput = {
        product_id: productId,
        quantity,
        selling_price: sellingPrice,
        sale_date: saleDate,
        customer_name: customerName,
        notes: notes
      };

      const saved = await revenueService.createSale(input);
      toastSuccess(
        'Sale recorded',
        `Sale #${saved.sale_number} recorded successfully for ₹${formatINR(saved.total_revenue)}.`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toastError('Failed to record sale', err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const productOptions = stockInfos.map(si => ({
    value: si.product.id,
    label: `${si.product.nickname} (Stock: ${si.currentStock} ${si.product.uom})`
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Manual Sale"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Product Selection */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Select Product <span className="text-red-500">*</span>
          </label>
          <Select
            value={productId}
            onChange={(e) => handleProductChange(e.target.value)}
            options={productOptions}
          />

          {/* Product stock & cost banner */}
          {selectedProductInfo && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 mt-2 text-xs">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-slate-500" />
                <span className="text-slate-600 font-medium">
                  {selectedProductInfo.product.nickname}
                </span>
                <span className="text-slate-400 font-mono">
                  ({selectedProductInfo.product.supplier_item_name})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Available Stock:</span>
                <Badge variant={availableStock > 10 ? 'success' : availableStock > 0 ? 'warning' : 'danger'}>
                  {availableStock} {selectedProductInfo.product.uom}
                </Badge>
              </div>
            </div>
          )}

          {/* Missing purchase cost warning */}
          {selectedProductInfo?.hasMissingCost && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Notice: Purchase Cost Missing</p>
                <p className="text-amber-700">
                  No verified purchase invoice or reference cost found for this product. Cost will default to ₹0.00 until a purchase is recorded.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Quantities & Pricing Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Quantity Sold */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Quantity Sold <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              step="any"
              min="0.001"
              value={quantity || ''}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              error={
                isExceedingStock
                  ? `Exceeds stock (${availableStock} available)`
                  : quantity <= 0
                    ? 'Must be > 0'
                    : undefined
              }
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              In {selectedProductInfo?.product.uom || 'units'}
            </span>
          </div>

          {/* Unit Purchase Cost (Auto-fetched) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Purchase Cost / Unit
            </label>
            <div className="h-9 px-3 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-between text-sm font-mono text-slate-700">
              <span>₹{formatINR(unitCost)}</span>
              <span className="text-[10px] text-slate-400 uppercase font-sans font-medium">FIFO auto</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Auto-fetched from purchases
            </span>
          </div>

          {/* Selling Price per Unit (Manually entered) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Selling Price / Unit <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400 text-sm font-mono">₹</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                className="pl-7"
                value={sellingPrice || ''}
                onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Editable selling rate
            </span>
          </div>
        </div>

        {/* Live Financial Breakdown Card */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs font-semibold text-slate-600">
            <span>Instant Financial Calculation</span>
            <span className="text-slate-400 font-normal">Real-time accounting</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            {/* Sales Revenue */}
            <div className="p-2.5 rounded-lg bg-white border border-slate-200">
              <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Sales Revenue</p>
              <p className="text-base font-bold font-mono text-brand-700 mt-0.5">
                ₹{formatINR(totalRevenue)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                {quantity} × ₹{formatINR(sellingPrice)}
              </p>
            </div>

            {/* Total COGS */}
            <div className="p-2.5 rounded-lg bg-white border border-slate-200">
              <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Total Cost (COGS)</p>
              <p className="text-base font-bold font-mono text-slate-800 mt-0.5">
                ₹{formatINR(totalCogs)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                {quantity} × ₹{formatINR(unitCost)}
              </p>
            </div>

            {/* Gross Profit */}
            <div className={`p-2.5 rounded-lg border ${isProfit ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'}`}>
              <p className={`text-[11px] uppercase tracking-wider font-medium ${isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
                Gross Profit
              </p>
              <p className={`text-base font-bold font-mono mt-0.5 flex items-center justify-center gap-1 ${isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
                {isProfit ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                ₹{formatINR(grossProfit)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                Revenue − COGS
              </p>
            </div>

            {/* Gross Profit Margin */}
            <div className={`p-2.5 rounded-lg border ${isProfit ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'}`}>
              <p className={`text-[11px] uppercase tracking-wider font-medium ${isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
                Gross Margin
              </p>
              <p className={`text-base font-bold font-mono mt-0.5 ${isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
                {profitMargin.toFixed(2)}%
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                (Profit / Revenue) × 100
              </p>
            </div>
          </div>
        </div>

        {/* Sale Date & Customer Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Sale Date <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Customer Name <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. Walk-in Customer or Shop Name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Transaction Notes <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <Input
            type="text"
            placeholder="e.g. Cash sale, Counter retail, Bulk discount"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || isExceedingStock || isOutOfStock || quantity <= 0}
            icon={<CheckCircle2 className="h-4 w-4" />}
          >
            {isSubmitting ? 'Recording Sale...' : 'Record Sale'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

