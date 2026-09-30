import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, ArrowLeft, Receipt, Phone, Mail, MapPin } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table } from '../components/ui/Table';
import { Supplier, PurchaseInvoice } from '../types';
import { dbService } from '../services/dbService';

export const SupplierDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadSupplierData();
  }, [id]);

  const loadSupplierData = async () => {
    setLoading(true);
    const sup = await dbService.getSupplierById(id!);
    const allInvoices = await dbService.getInvoices();
    const filtered = allInvoices.filter(inv => inv.supplier_id === id);

    setSupplier(sup);
    setInvoices(filtered);
    setLoading(false);
  };

  if (!supplier && !loading) {
    return (
      <div className="text-center py-12 text-[#6C7383]">
        Supplier record not found.
      </div>
    );
  }

  const columns = [
    {
      header: 'Invoice #',
      cell: (row: PurchaseInvoice) => (
        <span
          onClick={() => navigate(`/purchases/${row.id}`)}
          className="font-mono text-[#4B49AC] hover:underline cursor-pointer font-bold"
        >
          {row.invoice_number}
        </span>
      )
    },
    {
      header: 'Date',
      cell: (row: PurchaseInvoice) => <span className="text-[#1F1F2C] font-mono">{row.invoice_date}</span>
    },
    {
      header: 'Items',
      cell: (row: PurchaseInvoice) => <span className="text-[#6C7383]">{row.items?.length || 0} items</span>
    },
    {
      header: 'Taxable (₹)',
      cell: (row: PurchaseInvoice) => <span className="font-mono text-[#6C7383]">₹{row.taxable_amount.toFixed(2)}</span>
    },
    {
      header: 'Total Tax (₹)',
      cell: (row: PurchaseInvoice) => <span className="font-mono text-[#6C7383]">₹{row.total_tax.toFixed(2)}</span>
    },
    {
      header: 'Grand Total (₹)',
      cell: (row: PurchaseInvoice) => <span className="font-mono font-bold text-[#1F1F2C]">₹{row.grand_total.toFixed(2)}</span>
    },
    {
      header: 'Status',
      cell: (row: PurchaseInvoice) => (
        <Badge variant={row.verification_status === 'VERIFIED' ? 'success' : 'warning'}>
          {row.verification_status}
        </Badge>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" onClick={() => navigate('/suppliers')} icon={<ArrowLeft className="w-4 h-4" />}>
        Back to Suppliers List
      </Button>

      {/* Supplier Profile Banner */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-[#4B49AC] text-white shadow-skydash-primary shrink-0">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-bold text-[#1F1F2C] tracking-tight">{supplier?.name}</h1>
                <Badge variant={supplier?.is_active ? 'success' : 'default'}>
                  {supplier?.is_active ? 'Active Vendor' : 'Inactive'}
                </Badge>
              </div>
              {supplier?.gstin && (
                <p className="text-xs text-[#6C7383] font-mono mt-1">GSTIN: {supplier.gstin}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs">
            <div className="p-4 rounded-xl bg-[#F5F7FF] border border-[#ECEEF5]">
              <span className="text-[#6C7383] block uppercase font-mono text-[10px] tracking-wider font-semibold">Payment Terms</span>
              <span className="text-[#1F1F2C] font-bold text-base mt-1 block">{supplier?.payment_terms || 'NET 30'}</span>
            </div>
            <div className="p-4 rounded-xl bg-[#F5F7FF] border border-[#ECEEF5]">
              <span className="text-[#6C7383] block uppercase font-mono text-[10px] tracking-wider font-semibold">Total Invoices</span>
              <span className="text-[#1F1F2C] font-bold text-base mt-1 block">{invoices.length} Bills</span>
            </div>
            <div className="p-4 rounded-xl bg-[#F5F7FF] border border-[#ECEEF5] col-span-2 sm:col-span-1">
              <span className="text-[#6C7383] block uppercase font-mono text-[10px] tracking-wider font-semibold">Lifetime Spend</span>
              <span className="text-[#4B49AC] font-mono font-bold text-lg mt-1 block">
                ₹{invoices.reduce((sum, inv) => sum + inv.grand_total, 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Address and Contact info */}
        <div className="mt-6 pt-4 border-t border-[#ECEEF5] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-[#6C7383]">
          {supplier?.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#4B49AC]" />
              <span className="text-[#1F1F2C] font-mono">{supplier.phone}</span>
            </div>
          )}
          {supplier?.email && (
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#4B49AC]" />
              <span className="text-[#1F1F2C]">{supplier.email}</span>
            </div>
          )}
          {supplier?.address && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#4B49AC]" />
              <span className="text-[#1F1F2C]">{supplier.address}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Invoices List */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-[#1F1F2C] flex items-center gap-2">
          <Receipt className="w-5 h-5 text-[#4B49AC]" />
          Supplier Invoice Ledger ({invoices.length})
        </h3>
        <Table
          columns={columns}
          data={invoices}
          keyExtractor={(row) => row.id}
          isLoading={loading}
          emptyText="No invoices uploaded for this supplier yet."
        />
      </div>
    </div>
  );
};
