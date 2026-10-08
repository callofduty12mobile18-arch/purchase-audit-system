import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Receipt, ArrowLeft, Building2, Calendar, Package2, Edit3 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table } from '../components/ui/Table';
import { CardSkeleton } from '../components/ui/LoadingSkeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { PurchaseInvoice, PurchaseItem } from '../types';
import { dbService } from '../services/dbService';
import { formatDisplayDate, formatISTTimestamp } from '../utils/dateUtils';

export const PurchaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<PurchaseInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (id) loadInvoice();
  }, [id]);

  const loadInvoice = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await dbService.getInvoiceById(id!);
      setInvoice(data);
      if (!data) {
        setFetchError('Invoice not found in database.');
      }
    } catch (err: any) {
      setFetchError(err.message || 'Failed to load invoice details.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        <div className="h-9 w-40 bg-[#ECEEF5] rounded-xl animate-pulse" />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (fetchError || !invoice) {
    return (
      <div className="py-12 max-w-2xl mx-auto">
        <ErrorState
          title="Invoice Record Not Found"
          message={fetchError || `Could not find an invoice with ID: "${id}"`}
          onRetry={loadInvoice}
          showHomeButton
        />
      </div>
    );
  }

  const totalPacks = invoice.items?.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) || 0;

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
          className="text-xs"
        >
          Back to Ledger
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate(`/purchases/edit/${invoice.id}`)}
          icon={<Edit3 className="w-4 h-4" />}
          className="text-xs font-semibold"
        >
          Edit Invoice
        </Button>
      </div>

      {/* Invoice Banner */}
      <div className="p-6 rounded-2xl bg-white border border-[#ECEEF5] shadow-skydash space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[#ECEEF5]">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-[#F5F7FF] text-[#4B49AC] rounded-2xl border border-[#ECEEF5] shadow-xs">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold font-mono text-[#1F1F2C]">{invoice.invoice_number}</h1>
                <Badge variant={invoice.payment_status === 'PAID' ? 'success' : 'warning'}>
                  {invoice.payment_status}
                </Badge>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-[#F0F3FF] text-[#4B49AC] border border-[#D5DCED]">
                  🏷️ {invoice.invoice_name || 'RAMACHANDRAN'}
                </span>
              </div>
              <p className="text-xs text-[#6C7383] mt-0.5">
                Recorded on {formatISTTimestamp(invoice.created_at)}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs text-[#6C7383] uppercase font-bold tracking-wider block">Grand Total</span>
            <span className="text-2xl sm:text-3xl font-bold font-mono text-[#4B49AC]">
              ₹{invoice.grand_total.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Metadata Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#F5F7FF] border border-[#ECEEF5] space-y-1">
            <span className="text-[11px] font-bold text-[#6C7383] uppercase tracking-wider block flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#4B49AC]" /> Supplier
            </span>
            <span className="text-sm font-bold text-[#1F1F2C] block">
              {invoice.supplier?.name || 'AYYAPPA ENTERPRISES'}
            </span>
            {invoice.supplier?.gstin && (
              <span className="text-xs font-mono text-[#6C7383] block">
                GSTIN: {invoice.supplier.gstin}
              </span>
            )}
          </div>

          <div className="p-4 rounded-xl bg-[#F5F7FF] border border-[#ECEEF5] space-y-1">
            <span className="text-[11px] font-bold text-[#6C7383] uppercase tracking-wider block flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#7DA0FA]" /> Invoice & Cheque Date
            </span>
            <span className="text-sm font-mono font-bold text-[#1F1F2C] block">
              {formatDisplayDate(invoice.invoice_date)}
            </span>
            <span className="text-xs text-[#6C7383] block">
              Payment Mode: <strong className="text-[#1F1F2C]">{invoice.payment_mode}</strong>
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#F5F7FF] border border-[#ECEEF5] space-y-1">
            <span className="text-[11px] font-bold text-[#6C7383] uppercase tracking-wider block flex items-center gap-1.5">
              <Package2 className="w-3.5 h-3.5 text-[#7978E9]" /> Volume Summary
            </span>
            <span className="text-sm font-mono font-bold text-[#1F1F2C] block">
              {invoice.items?.length || 0} Distinct Items
            </span>
            <span className="text-xs font-mono text-[#6C7383] block">
              {totalPacks} Total Packs
            </span>
          </div>
        </div>
      </div>

      {/* Invoice Line Items Card */}
      <Card
        title={`Purchased Items (${invoice.items?.length || 0})`}
        subtitle="Item purchase rates and computed line totals"
      >
        <Table
          columns={columns}
          data={invoice.items || []}
          keyExtractor={(row) => row.id}
          isLoading={false}
          emptyText="No line items recorded for this invoice."
        />
      </Card>
    </div>
  );
};
