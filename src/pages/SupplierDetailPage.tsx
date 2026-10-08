import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, ArrowLeft, Receipt, Phone, Mail, MapPin } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table } from '../components/ui/Table';
import { CardSkeleton } from '../components/ui/LoadingSkeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { Supplier, PurchaseInvoice } from '../types';
import { dbService } from '../services/dbService';
import { formatDisplayDate, formatINR } from '../utils/dateUtils';

export const SupplierDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (id) loadSupplierData();
  }, [id]);

  const loadSupplierData = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const sup = await dbService.getSupplierById(id!);
      const allInvoices = await dbService.getInvoices();
      const filtered = allInvoices.filter(inv => inv.supplier_id === id);

      setSupplier(sup);
      setInvoices(filtered);
      if (!sup) {
        setFetchError('Supplier profile not found.');
      }
    } catch (err: any) {
      setFetchError(err.message || 'Failed to load supplier details.');
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

  if (fetchError || !supplier) {
    return (
      <div className="py-12 max-w-2xl mx-auto">
        <ErrorState
          title="Supplier Not Found"
          message={fetchError || `Could not find supplier with ID: "${id}"`}
          onRetry={loadSupplierData}
          showHomeButton
        />
      </div>
    );
  }

  const columns = [
    {
      header: 'Invoice #',
      cell: (row: PurchaseInvoice) => (
        <span
          onClick={() => navigate(`/purchases/${row.id}`)}
          className="font-mono text-[#4B49AC] hover:underline cursor-pointer font-bold flex items-center gap-1.5"
        >
          <Receipt className="w-3.5 h-3.5 text-[#7DA0FA]" />
          {row.invoice_number}
        </span>
      )
    },
    {
      header: 'Date',
      cell: (row: PurchaseInvoice) => <span className="text-[#1F1F2C] font-mono text-xs">{formatDisplayDate(row.invoice_date)}</span>
    },
    {
      header: 'Items & Packs',
      cell: (row: PurchaseInvoice) => {
        const totalPacks = row.items?.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) || 0;
        return (
          <div className="space-y-0.5">
            <span className="px-2.5 py-0.5 rounded-full bg-[#F5F7FF] border border-[#D5DCED] text-[#4B49AC] font-mono text-xs font-semibold inline-block">
              {row.items?.length || 0} items
            </span>
            {totalPacks > 0 && (
              <span className="text-[11px] font-mono text-[#6C7383] block">
                {totalPacks} packs
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Payment Status',
      cell: (row: PurchaseInvoice) => (
        <Badge variant={row.payment_status === 'PAID' ? 'success' : 'warning'}>
          {row.payment_status}
        </Badge>
      )
    },
    {
      header: 'Grand Total',
      cell: (row: PurchaseInvoice) => (
        <span className="font-mono font-bold text-[#1F1F2C] text-sm">₹{row.grand_total.toFixed(2)}</span>
      )
    }
  ];

  const totalSpend = invoices.reduce((sum, i) => sum + i.grand_total, 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/suppliers')}
          icon={<ArrowLeft className="w-4 h-4" />}
          className="text-xs"
        >
          Back to Suppliers
        </Button>
      </div>

      {/* Supplier Profile Banner */}
      <div className="p-6 rounded-2xl bg-white border border-[#ECEEF5] shadow-skydash space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[#ECEEF5]">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-[#F5F7FF] text-[#4B49AC] rounded-2xl border border-[#ECEEF5] shadow-xs">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[#1F1F2C]">{supplier.name}</h1>
                <Badge variant={supplier.is_active ? 'success' : 'default'}>
                  {supplier.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              {supplier.gstin && (
                <p className="text-xs font-mono text-[#6C7383] mt-0.5">GSTIN: {supplier.gstin}</p>
              )}
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs text-[#6C7383] uppercase font-bold tracking-wider block">Total Billed Spend</span>
            <span className="text-2xl font-bold font-mono text-[#4B49AC]">
              ₹{formatINR(totalSpend)}
            </span>
          </div>
        </div>

        {/* Contact Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-[#1F1F2C]">
          {supplier.phone && (
            <div className="flex items-center gap-2 p-3 bg-[#F5F7FF] rounded-xl border border-[#ECEEF5]">
              <Phone className="w-4 h-4 text-[#6C7383]" />
              <span className="font-mono">{supplier.phone}</span>
            </div>
          )}
          {supplier.email && (
            <div className="flex items-center gap-2 p-3 bg-[#F5F7FF] rounded-xl border border-[#ECEEF5]">
              <Mail className="w-4 h-4 text-[#6C7383]" />
              <span>{supplier.email}</span>
            </div>
          )}
          {supplier.address && (
            <div className="flex items-center gap-2 p-3 bg-[#F5F7FF] rounded-xl border border-[#ECEEF5]">
              <MapPin className="w-4 h-4 text-[#6C7383]" />
              <span className="truncate">{supplier.address}</span>
            </div>
          )}
        </div>
      </div>

      {/* Associated Invoices */}
      <Card
        title={`Purchase Invoices (${invoices.length})`}
        subtitle="Invoices billed by this supplier"
      >
        <Table
          columns={columns}
          data={invoices}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => navigate(`/purchases/${row.id}`)}
          isLoading={false}
          emptyVariant="invoices"
          emptyTitle="No Invoices from this Supplier"
          emptyText="No bills have been recorded under this supplier yet."
          emptyActionLabel="Enter Bill for Supplier"
          onEmptyAction={() => navigate('/purchases/import')}
        />
      </Card>
    </div>
  );
};
