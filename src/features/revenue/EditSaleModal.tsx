import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Package
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { SaleTransaction, ProductStockInfo, UpdateSaleInput } from '../../types';
import { revenueService } from '../../services/revenueService';
import { formatINR } from '../../utils/dateUtils';
import { useToast } from '../../context/ToastContext';

interface EditSaleModalProps {
  sale: SaleTransaction | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  stockInfos: ProductStockInfo[];
}

export const EditSaleModal: React.FC<EditSaleModalProps> = ({
  sale,
  isOpen,
  onClose,
  onSuccess,
  stockInfos
}) => {
  const { success: toastSuccess, error: toastError } = useToast();

  const [quantity, setQuantity] = useState<number>(1);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [calculatingCogs, setCalculatingCogs] = useState<boolean>(false);
  const [availableStockExcludingCurrent, setAvailableStockExcludingCurrent] = useState<number>(0);
  const [cogsInfo, setCogsInfo] = useState<{
    unitPurchasePrice: number;
    totalCogs: number;
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (sale && isOpen) {
      setQuantity(sale.quantity);
      setSellingPrice(sale.selling_price);
    }
  }, [sale, isOpen]);

  // Recalculate FIFO available stock and COGS excluding the current sale ID
  useEffect(() => {
    if (!sale || !isOpen) return;

    let isCancelled = false;
    const runCalc = async () => {
      setCalculatingCogs(true);
      try {
        const fifo = await revenueService.calculateProductFIFO(sale.product_id, sale.id);
        if (!isCancelled) {
          setAvailableStockExcludingCurrent(fifo.availableStock);
        }

        if (quantity > 0) {
          const alloc = await revenueService.allocateFIFO(sale.product_id, quantity, sale.id);
          if (!isCancelled) {
            setCogsInfo({
              unitPurchasePrice: alloc.unitPurchasePrice,
              totalCogs: alloc.totalCogs
            });
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          setCogsInfo({
            unitPurchasePrice: sale.purchase_price,
            totalCogs: Number((quantity * sale.purchase_price).toFixed(2)),
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
  }, [sale, isOpen, quantity]);

  if (!sale) return null;

  const isExceedingStock = quantity > availableStockExcludingCurrent;
  const unitCost = cogsInfo?.unitPurchasePrice ?? sale.purchase_price;
  const totalRevenue = Number((quantity * sellingPrice).toFixed(2));
  const totalCogs = cogsInfo && !cogsInfo.error ? cogsInfo.totalCogs : Number((quantity * unitCost).toFixed(2));
  const grossProfit = Number((totalRevenue - totalCogs).toFixed(2));
  const profitMargin = totalRevenue > 0 ? Number(((grossProfit / totalRevenue) * 100).toFixed(2)) : 0;
  const isProfit = grossProfit >= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      toastError('Validation error', 'Quantity sold must be greater than zero.');
      return;
    }
    if (isExceedingStock) {
      toastError(
        'Stock exceeded',
        `Quantity (${quantity}) exceeds available stock (${availableStockExcludingCurrent}).`
      );
      return;
    }
    if (sellingPrice < 0) {
      toastError('Validation error', 'Selling price cannot be negative.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updateData: UpdateSaleInput = {
        quantity,
        selling_price: sellingPrice
      };

      await revenueService.updateSale(sale.id, updateData);
      toastSuccess('Sale updated', `Selling price for #${sale.sale_number} has been updated.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toastError('Update failed', err.message || 'Could not update sale.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Enter Selling Price: #${sale.sale_number}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product static info */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-slate-500" />
            <span className="font-semibold text-slate-900">
              {sale.product?.nickname || 'Product Item'}
            </span>
            <span className="text-slate-400 font-mono text-[11px] truncate max-w-[120px]">
              ({sale.product?.supplier_item_name})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Available:</span>
            <Badge variant="blue">
              {availableStockExcludingCurrent} {sale.product?.uom || 'units'}
            </Badge>
          </div>
        </div>

        {/* Quantities & Pricing Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
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
                  ? `Exceeds stock (${availableStockExcludingCurrent})`
                  : quantity <= 0
                    ? 'Must be > 0'
                    : undefined
              }
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Unit Purchase Cost
            </label>
            <div className="h-9 px-3 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-between text-sm font-mono text-slate-700">
              <span>₹{formatINR(unitCost)}</span>
              <span className="text-[10px] text-slate-400 uppercase font-sans font-medium">FIFO</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
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
                autoFocus
              />
            </div>
          </div>
        </div>

        {/* Financial calculation card */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
            <div className="p-2 rounded-lg bg-white border border-slate-200">
              <p className="text-[10px] text-slate-500 uppercase font-medium">Revenue</p>
              <p className="text-sm font-bold font-mono text-brand-700 mt-0.5">₹{formatINR(totalRevenue)}</p>
            </div>
            <div className="p-2 rounded-lg bg-white border border-slate-200">
              <p className="text-[10px] text-slate-500 uppercase font-medium">COGS</p>
              <p className="text-sm font-bold font-mono text-slate-800 mt-0.5">₹{formatINR(totalCogs)}</p>
            </div>
            <div className={`p-2 rounded-lg border ${isProfit ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'}`}>
              <p className={`text-[10px] uppercase font-medium ${isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>Gross Profit</p>
              <p className={`text-sm font-bold font-mono mt-0.5 ${isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
                ₹{formatINR(grossProfit)}
              </p>
            </div>
            <div className={`p-2 rounded-lg border ${isProfit ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'}`}>
              <p className={`text-[10px] uppercase font-medium ${isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>Margin</p>
              <p className={`text-sm font-bold font-mono mt-0.5 ${isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
                {profitMargin.toFixed(1)}%
              </p>
            </div>
          </div>
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
            disabled={isSubmitting || isExceedingStock || quantity <= 0}
            icon={<CheckCircle2 className="h-4 w-4" />}
          >
            {isSubmitting ? 'Saving...' : 'Save Selling Price'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
