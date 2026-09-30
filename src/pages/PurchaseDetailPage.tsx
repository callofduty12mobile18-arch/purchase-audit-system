import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Receipt, ArrowLeft, Building2, Calendar, ShieldCheck, Printer } from 'lucide-react';
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

  const handlePrint = () => {
    const originalTitle = document.title;
    const invNum = invoice?.invoice_number ? invoice.invoice_number.replace(/[^a-zA-Z0-9]/g, '_') : 'Invoice';
    document.title = `ITC_Purchase_Invoice_${invNum}_${invoice?.invoice_date || ''}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1200);
  };

  if (!invoice && !loading) {
    return <div className="text-center py-12 text-[#6C7383]">Invoice not found.</div>;
  }

  const columns = [
    {
      header: 'Line #',
      cell: (_row: PurchaseItem, idx: number) => <span className="font-mono text-xs text-[#6C7383]">#{idx + 1}</span>
    },
    {
      header: 'Supplier Item Snapshot',
      cell: (row: PurchaseItem) => (
        <div>
          <span className="font-mono text-xs font-semibold text-[#1F1F2C] block">{row.supplier_item_name_snapshot}</span>
          {row.product && (
            <span className="text-[11px] text-[#6C7383]">Mapped Alias: "{row.product.nickname}"</span>
          )}
        </div>
      )
    },
    {
      header: 'HSN',
      cell: (row: PurchaseItem) => <span className="font-mono text-xs text-[#6C7383]">{row.hsn_snapshot || '-'}</span>
    },
    {
      header: 'Qty & UOM',
      cell: (row: PurchaseItem) => <span className="font-mono text-xs text-[#1F1F2C] font-medium">{row.quantity} {row.uom_snapshot}</span>
    },
    {
      header: 'Rate (₹)',
      cell: (row: PurchaseItem) => <span className="font-mono text-xs text-[#4B49AC] font-bold">₹{row.purchase_rate.toFixed(2)}</span>
    },
    {
      header: 'GST %',
      cell: (row: PurchaseItem) => <Badge variant="purple">{row.gst_rate}%</Badge>
    },
    {
      header: 'Taxable (₹)',
      cell: (row: PurchaseItem) => <span className="font-mono text-xs text-[#6C7383]">₹{row.taxable_value.toFixed(2)}</span>
    },
    {
      header: 'Line Total (₹)',
      cell: (row: PurchaseItem) => <span className="font-mono text-xs font-bold text-[#1F1F2C]">₹{row.total.toFixed(2)}</span>
    }
  ];

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate('/purchases')} icon={<ArrowLeft className="w-4 h-4" />}>
          Back to Invoices Ledger
        </Button>
        <Button variant="primary" size="sm" onClick={handlePrint} icon={<Printer className="w-4 h-4" />}>
          Print / Export PDF
        </Button>
      </div>

      {/* Main App View (Hidden during print) */}
      <div className="no-print space-y-6">
        {/* Invoice Banner */}
        <Card>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-bold text-[#1F1F2C] flex items-center gap-2.5 tracking-tight font-mono">
                  <Receipt className="w-6 h-6 text-[#4B49AC]" />
                  Invoice #{invoice?.invoice_number}
                </h1>
                <Badge variant={invoice?.verification_status === 'VERIFIED' ? 'success' : 'warning'}>
                  {invoice?.verification_status}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-[#6C7383] mt-2 flex flex-wrap items-center gap-2">
                <Building2 className="w-4 h-4 text-[#4B49AC]" />
                <span>Supplier: <strong className="text-[#1F1F2C]">{invoice?.supplier?.name}</strong></span>
                <span className="text-[#ECEEF5]">•</span>
                <Calendar className="w-4 h-4 text-[#4B49AC]" />
                <span>Invoice Date: <strong className="text-[#1F1F2C] font-mono">{invoice?.invoice_date}</strong></span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F5F7FF] text-[#4B49AC] border border-[#ECEEF5] text-xs font-mono font-medium shadow-sm">
                <ShieldCheck className="w-4 h-4 text-[#4B49AC]" />
                Immutable Audit Record
              </span>
            </div>
          </div>
        </Card>

        {/* Split Details & Tax Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-base font-bold text-[#1F1F2C] tracking-tight">Line Items Snapshot ({invoice?.items?.length})</h3>
            <Table
              columns={columns}
              data={invoice?.items || []}
              keyExtractor={(row) => row.id}
              isLoading={loading}
            />
          </div>

          <div>
            <Card title="Financial Summary" subtitle="Exact audited invoice amounts">
              <div className="space-y-3.5 text-xs">
                <div className="flex justify-between text-[#6C7383] py-1.5 border-b border-[#ECEEF5]">
                  <span>Taxable Subtotal:</span>
                  <span className="font-mono text-[#1F1F2C] font-semibold text-sm">₹{invoice?.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#6C7383] py-1.5 border-b border-[#ECEEF5]">
                  <span>CGST Tax:</span>
                  <span className="font-mono text-[#1F1F2C]">₹{invoice?.cgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#6C7383] py-1.5 border-b border-[#ECEEF5]">
                  <span>SGST Tax:</span>
                  <span className="font-mono text-[#1F1F2C]">₹{invoice?.sgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#6C7383] py-1.5 border-b border-[#ECEEF5]">
                  <span>Total Tax Amount:</span>
                  <span className="font-mono text-[#4B49AC] font-semibold">₹{invoice?.total_tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#6C7383] py-1.5 border-b border-[#ECEEF5]">
                  <span>Round Off:</span>
                  <span className="font-mono text-[#6C7383]">₹{invoice?.round_off.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-[#1F1F2C] pt-3 border-t border-[#ECEEF5]">
                  <span>Grand Total Paid:</span>
                  <span className="font-mono text-[#4B49AC] text-xl font-bold">₹{invoice?.grand_total.toFixed(2)}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* ULTRA-CLEAN A4 PRINT / PDF EXPORT SHEET */}
      <div className="printable-container hidden print:block">
        <div className="printable-document max-w-4xl mx-auto bg-white text-black rounded-none p-6 sm:p-8 space-y-6 shadow-none border border-black">
          
          {/* Header */}
          <div className="flex justify-between items-center border-b-2 border-black pb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-black text-lg">
                AP
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-black uppercase">
                  PURCHASE AUDIT INVOICE
                </h1>
                <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase block">
                  Verified Purchase Record • System Snapshot
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="px-3 py-1 bg-black text-white rounded-none font-mono text-xs font-bold uppercase">
                VERIFIED INVOICE
              </span>
              <p className="text-xs font-mono text-black font-bold mt-1">Inv #: {invoice?.invoice_number}</p>
              <p className="text-xs font-mono text-zinc-600">Date: {invoice?.invoice_date}</p>
            </div>
          </div>

          {/* Supplier & Purchaser Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 bg-zinc-50 border border-zinc-300 text-xs">
            <div>
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider block mb-1">
                SUPPLIER VENDOR
              </span>
              <h2 className="text-sm font-bold text-black">{invoice?.supplier?.name}</h2>
              {invoice?.supplier?.gstin && (
                <p className="font-mono text-zinc-800 mt-0.5">GSTIN: <strong>{invoice.supplier.gstin}</strong></p>
              )}
              <p className="text-zinc-700 mt-0.5">{invoice?.supplier?.address}</p>
            </div>

            <div className="sm:text-right">
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider block mb-1">
                BILLED TO (PURCHASER)
              </span>
              <h2 className="text-sm font-bold text-black">BERRY QUEQ (RAMACHANDRAN)</h2>
              <p className="text-zinc-700 mt-0.5">Veppampattu, Chennai, Tamil Nadu</p>
              <p className="font-mono text-zinc-800 mt-0.5">Payment Status: <strong>{invoice?.payment_status} ({invoice?.payment_mode})</strong></p>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-100 border-b-2 border-black text-black uppercase text-[10px] font-bold">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Supplier Item Text</th>
                  <th className="py-2.5 px-3">HSN</th>
                  <th className="py-2.5 px-3 text-right">Pack Qty</th>
                  <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                  <th className="py-2.5 px-3 text-right">GST %</th>
                  <th className="py-2.5 px-3 text-right">Line Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {invoice?.items?.map((item, idx) => (
                  <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50'}>
                    <td className="py-2.5 px-3 font-mono text-zinc-600">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-black block">{item.supplier_item_name_snapshot}</span>
                      {item.product && (
                        <span className="text-[11px] font-mono text-zinc-600">Alias: "{item.product.nickname}"</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-zinc-700">{item.hsn_snapshot}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-black">
                      {item.quantity} {item.uom_snapshot}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-black">
                      ₹{item.purchase_rate.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-black">
                      {item.gst_rate}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-black">
                      ₹{item.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tax Breakdown & Grand Total */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-4 border-t border-black">
            <div className="p-3 bg-zinc-50 border border-zinc-300 rounded-none text-xs max-w-sm">
              <span className="font-bold text-black block mb-1">GST Tax Compliance & Audit</span>
              <p className="text-[11px] text-zinc-700 leading-relaxed">
                CGST (20%) + SGST (20%) verified snapshot item entries. Immutable record stored in system.
              </p>
            </div>

            <div className="w-full sm:w-72 space-y-1.5 text-xs">
              <div className="flex justify-between text-zinc-700">
                <span>Taxable Subtotal:</span>
                <span className="font-mono text-black">₹{invoice?.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-700">
                <span>CGST Tax (20%):</span>
                <span className="font-mono text-black">₹{invoice?.cgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-700">
                <span>SGST Tax (20%):</span>
                <span className="font-mono text-black">₹{invoice?.sgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-700">
                <span>Round Off:</span>
                <span className="font-mono text-black">₹{invoice?.round_off.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-black pt-2 border-t-2 border-black">
                <span>GRAND TOTAL:</span>
                <span className="font-mono text-black text-base">₹{invoice?.grand_total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer Signature */}
          <div className="pt-8 flex justify-between items-end text-[11px] text-zinc-600 border-t border-zinc-300">
            <div>
              <p>System Verified Purchase Snapshot</p>
              <p className="font-mono text-[10px]">Verified: {invoice?.created_at}</p>
            </div>
            <div className="text-right">
              <div className="h-10 border-b border-black w-48 mb-1"></div>
              <p className="font-bold text-black">Authorized Signature</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
