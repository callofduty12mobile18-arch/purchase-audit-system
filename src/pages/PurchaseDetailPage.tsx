import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Receipt, ArrowLeft, Building2, Calendar, Package2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table } from '../components/ui/Table';
import { PurchaseInvoice, PurchaseItem } from '../types';
import { dbService } from '../services/dbService';

export const PurchaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<PurchaseInvoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadInvoice();
  }, [id]);

  const loadInvoice = async () => {
    setLoading(true);
    const data = await dbService.getInvoiceById(id!);
    setInvoice(data);
    setLoading(false);
  };

  if (!invoice && !loading) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-[#6C7383] text-sm">Invoice not found.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/purchases')}>
          Back to Invoices
        </Button>
      </div>
    );
  }

  const totalPacks = invoice?.items?.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) || 0;

  const columns = [
    {
      header: 'Line #',
      cell: (_row: PurchaseItem, idx: number) => (
        <span className="font-mono text-xs text-[#6C7383]">#{idx + 1}</span>
      )
    },
    {
      header: 'Product Item',
      cell: (row: PurchaseItem) => (
        <div className="space-y-0.5">
          <span className="font-bold text-xs text-[#1F1F2C] block">
            {row.product?.nickname || row.supplier_item_name_snapshot}
          </span>
          <span className="text-[11px] font-mono text-[#6C7383]">
            {row.supplier_item_name_snapshot}
          </span>
        </div>
      )
    },
    {
      header: 'HSN',
      cell: (row: PurchaseItem) => (
        <span className="font-mono text-xs text-[#6C7383]">{row.hsn_snapshot || '24022090'}</span>
      )
    },
    {
      header: 'Packs',
      cell: (row: PurchaseItem) => (
        <span className="font-mono text-xs text-[#1F1F2C] font-bold">
          {row.quantity} {row.uom_snapshot || 'PAC'}
        </span>
      )
    },
    {
      header: 'Purchase Rate (₹)',
      cell: (row: PurchaseItem) => (
        <span className="font-mono text-xs text-[#4B49AC] font-bold">
          ₹{row.purchase_rate.toFixed(2)}
        </span>
      )
    },
    {
      header: 'Line Total (₹)',
      cell: (row: PurchaseItem) => (
        <span className="font-mono text-xs font-bold text-[#1F1F2C]">
          ₹{row.total.toFixed(2)}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Nav */}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/purchases')}
          icon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Invoices Ledger
        </Button>
      </div>

      {/* Invoice Banner */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-[#1F1F2C] flex items-center gap-2.5 tracking-tight font-mono">
                <Receipt className="w-6 h-6 text-[#4B49AC]" />
                Invoice #{invoice?.invoice_number}
              </h1>
            </div>
            <div className="text-xs sm:text-sm text-[#6C7383] flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#4B49AC]" />
                <span>Supplier: <strong className="text-[#1F1F2C]">{invoice?.supplier?.name}</strong></span>
              </div>
              <span className="text-[#ECEEF5]">•</span>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#4B49AC]" />
                <span>Invoice Date: <strong className="text-[#1F1F2C] font-mono">{invoice?.invoice_date}</strong></span>
              </div>
              <span className="text-[#ECEEF5]">•</span>
              <div className="flex items-center gap-1.5">
                <Package2 className="w-4 h-4 text-[#4B49AC]" />
                <span>Total Packs: <strong className="text-[#1F1F2C] font-mono">{totalPacks}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Badge variant="purple" className="font-mono text-xs px-3 py-1">
              Payment: {invoice?.payment_mode} • {invoice?.payment_status}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Line Items & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1F1F2C] uppercase tracking-wider flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#4B49AC]" />
              Line Items ({invoice?.items?.length || 0})
            </h3>
            <span className="text-xs font-mono text-[#6C7383]">
              Total: {totalPacks} Packs
            </span>
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block">
            <Table
              columns={columns}
              data={invoice?.items || []}
              keyExtractor={(row) => row.id}
              isLoading={loading}
            />
          </div>

          {/* Mobile Cards View */}
          <div className="sm:hidden space-y-3">
            {invoice?.items?.map((item, idx) => (
              <div key={item.id || idx} className="p-4 rounded-xl bg-white border border-[#ECEEF5] space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#6C7383]">#{idx + 1}</span>
                  <span className="font-mono text-xs font-bold text-[#4B49AC]">
                    ₹{item.total.toFixed(2)}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#1F1F2C]">
                    {item.product?.nickname || item.supplier_item_name_snapshot}
                  </h4>
                  <p className="text-[11px] font-mono text-[#6C7383]">
                    {item.supplier_item_name_snapshot}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#ECEEF5] text-xs">
                  <div>
                    <span className="text-[10px] text-[#6C7383] uppercase block">Packs</span>
                    <span className="font-mono font-bold text-[#1F1F2C]">{item.quantity} {item.uom_snapshot}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#6C7383] uppercase block">Purchase Rate</span>
                    <span className="font-mono font-bold text-[#4B49AC]">₹{item.purchase_rate.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Invoice Summary Card */}
        <div>
          <Card title="Invoice Summary" subtitle="Audited purchase totals">
            <div className="space-y-4 text-xs">
              <div className="flex justify-between text-[#6C7383] py-2 border-b border-[#ECEEF5]">
                <span>Total Items:</span>
                <span className="font-mono text-[#1F1F2C] font-semibold text-sm">
                  {invoice?.items?.length || 0} Products
                </span>
              </div>
              <div className="flex justify-between text-[#6C7383] py-2 border-b border-[#ECEEF5]">
                <span>Total Packs:</span>
                <span className="font-mono text-[#1F1F2C] font-semibold text-sm">
                  {totalPacks} Packs
                </span>
              </div>
              <div className="flex justify-between text-[#6C7383] py-2 border-b border-[#ECEEF5]">
                <span>Payment Mode:</span>
                <span className="font-mono text-[#1F1F2C] font-semibold">
                  {invoice?.payment_mode}
                </span>
              </div>
              <div className="flex justify-between text-[#6C7383] py-2 border-b border-[#ECEEF5]">
                <span>Payment Status:</span>
                <Badge variant={invoice?.payment_status === 'PAID' ? 'success' : 'warning'}>
                  {invoice?.payment_status}
                </Badge>
              </div>
              {invoice?.cheque_date && (
                <div className="flex justify-between text-[#6C7383] py-2 border-b border-[#ECEEF5]">
                  <span>Cheque Clearance Date:</span>
                  <span className="font-mono text-[#1F1F2C] font-semibold">
                    {invoice.cheque_date}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-[#1F1F2C] pt-3 border-t border-[#ECEEF5]">
                <span>Invoice Total:</span>
                <span className="font-mono text-[#4B49AC] text-xl font-bold">
                  ₹{invoice?.grand_total.toFixed(2)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
