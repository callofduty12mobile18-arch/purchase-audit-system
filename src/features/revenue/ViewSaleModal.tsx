import React from 'react';
import {
  FileText,
  Calendar,
  User,
  Package,
  TrendingUp,
  TrendingDown,
  Layers,
  Clock,
  Hash,
  CheckCircle2,
  X
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableColumn } from '../../components/ui/Table';
import { SaleTransaction, CogsBatchAllocation } from '../../types';
import { formatINR, formatDisplayDate, formatISTTimestamp } from '../../utils/dateUtils';

interface ViewSaleModalProps {
  sale: SaleTransaction | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (sale: SaleTransaction) => void;
}

export const ViewSaleModal: React.FC<ViewSaleModalProps> = ({
  sale,
  isOpen,
  onClose,
  onEdit
}) => {
  if (!sale) return null;

  const isProfit = sale.gross_profit >= 0;

  const batchColumns: TableColumn<CogsBatchAllocation>[] = [
    {
      header: 'Invoice #',
      cell: (row) => (
        <span className="font-mono text-xs font-semibold text-slate-800">
          {row.invoice_number || 'Direct/Ref'}
        </span>
      )
    },
    {
      header: 'Invoice Date',
      cell: (row) => (
        <span className="font-mono text-xs text-slate-600">
          {formatDisplayDate(row.invoice_date)}
        </span>
      )
    },
    {
      header: 'Qty Allocated',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (row) => (
        <span className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
          {row.quantity}
        </span>
      )
    },
    {
      header: 'Batch Unit Cost',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (row) => (
        <span className="font-mono text-xs text-slate-700 tabular-nums">
          ₹{formatINR(row.unit_cost)}
        </span>
      )
    },
    {
      header: 'Subtotal Cost',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (row) => (
        <span className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
          ₹{formatINR(row.total_cost)}
        </span>
      )
    }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Sale Details: #${sale.sale_number}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Header Badges & Info */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center shrink-0">
              <Package className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {sale.product?.nickname || 'Product Item'}
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {sale.product?.supplier_item_name || 'Standard Catalog SKU'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={sale.status === 'COMPLETED' ? 'success' : 'default'}>
              {sale.status}
            </Badge>
            <Badge variant="blue">FIFO Costed</Badge>
          </div>
        </div>

        {/* Financial KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Quantity Sold
            </span>
            <span className="text-lg font-bold font-mono text-slate-900 mt-1 block">
              {sale.quantity} {sale.product?.uom || 'units'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              @ ₹{formatINR(sale.selling_price)}/unit
            </span>
          </div>

          <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Revenue
            </span>
            <span className="text-lg font-bold font-mono text-brand-700 mt-1 block">
              ₹{formatINR(sale.total_revenue)}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Gross sales income
            </span>
          </div>

          <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Cost (COGS)
            </span>
            <span className="text-lg font-bold font-mono text-slate-800 mt-1 block">
              ₹{formatINR(sale.total_cogs)}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              @ ₹{formatINR(sale.purchase_price)}/unit
            </span>
          </div>

          <div className={`p-3 rounded-lg border shadow-sm ${isProfit ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'}`}>
            <span className={`text-[11px] font-semibold uppercase tracking-wider block ${isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
              Gross Profit
            </span>
            <span className={`text-lg font-bold font-mono mt-1 flex items-center gap-1 ${isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
              {isProfit ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              ₹{formatINR(sale.gross_profit)}
            </span>
            <span className={`text-[10px] font-mono ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
              Margin: {sale.profit_margin.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Transaction Meta Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div>
            <span className="text-slate-400 uppercase tracking-wider font-semibold block">Sale Date</span>
            <span className="font-mono font-medium text-slate-800 mt-0.5 block">
              {formatDisplayDate(sale.sale_date)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 uppercase tracking-wider font-semibold block">Customer Name</span>
            <span className="font-medium text-slate-800 mt-0.5 block">
              {sale.customer_name || 'Walk-in Retail Customer'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 uppercase tracking-wider font-semibold block">Recorded At</span>
            <span className="font-mono text-slate-600 mt-0.5 block">
              {formatISTTimestamp(sale.created_at)}
            </span>
          </div>
          {sale.notes && (
            <div className="sm:col-span-3 pt-2 border-t border-slate-200">
              <span className="text-slate-400 uppercase tracking-wider font-semibold block">Notes</span>
              <p className="text-slate-700 mt-0.5 italic">{sale.notes}</p>
            </div>
          )}
        </div>

        {/* FIFO COGS Batch Breakdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-brand-600" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                FIFO Inventory Batch Allocation
              </h4>
            </div>
            <span className="text-[11px] text-slate-500">
              {sale.cogs_breakdown?.length || 0} batch{sale.cogs_breakdown?.length === 1 ? '' : 'es'} consumed
            </span>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <Table
              columns={batchColumns}
              data={sale.cogs_breakdown || []}
              keyExtractor={(row, i) => row.purchase_item_id || String(i)}
              emptyTitle="No batch breakdown recorded"
              emptyText="Cost calculated directly from product reference purchase price."
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <span className="text-xs text-slate-400 font-mono">
            ID: {sale.id}
          </span>
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onEdit(sale);
                }}
              >
                Edit Sale
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
