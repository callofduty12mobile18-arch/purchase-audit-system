import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, History } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table, TableColumn } from '../components/ui/Table';
import { CardSkeleton } from '../components/ui/LoadingSkeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { Product, PurchaseItem, PriceHistory } from '../types';
import { dbService } from '../services/dbService';
import { formatISTTimestamp, formatDisplayDate, formatINR } from '../utils/dateUtils';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseItem[]>([]);
  const [priceChanges, setPriceChanges] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => { if (id) load(); }, [id]);

  const load = async () => {
    setLoading(true); setFetchError(null);
    try {
      const [prod, invoices, history] = await Promise.all([
        dbService.getProductById(id!),
        dbService.getInvoices(),
        dbService.getPriceHistory(),
      ]);
      const items: PurchaseItem[] = [];
      invoices.forEach((inv) => inv.items?.forEach((it) => { if (it.product_id === id) items.push(it); }));
      setProduct(prod);
      setPurchaseHistory(items);
      setPriceChanges(history.filter((ph) => ph.product_id === id));
      if (!prod) setFetchError('Product not found.');
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load product.');
    } finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="skeleton h-9 w-40 rounded-md" />
        <CardSkeleton /><CardSkeleton />
      </div>
    );
  }

  if (fetchError || !product) {
    return <ErrorState title="Product not found" message={fetchError ?? `No product with ID "${id}"`} onRetry={load} showHomeButton />;
  }

  const columns: TableColumn<PurchaseItem>[] = [
    { header: 'Date', cell: (row) => <span className="text-sm font-mono text-slate-600">{formatDisplayDate(row.created_at)}</span> },
    { header: 'Invoice text', cell: (row) => <span className="text-xs font-mono text-slate-500">{row.supplier_item_name_snapshot}</span> },
    {
      header: 'Qty (packs)',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (row) => <span className="text-sm font-mono font-semibold text-slate-900 tabular-nums">{row.quantity}</span>,
    },
    {
      header: 'Purchase rate',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (row) => <span className="text-sm font-mono font-semibold text-brand-700 tabular-nums">₹{formatINR(row.purchase_rate)}</span>,
    },
    {
      header: 'Line total',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (row) => <span className="text-sm font-mono font-semibold text-slate-900 tabular-nums">₹{formatINR(row.total)}</span>,
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Button variant="outline" size="sm" onClick={() => navigate('/products')} icon={<ArrowLeft className="h-4 w-4" />}>
        Back to catalog
      </Button>

      {/* Banner */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
              <Package className="h-5 w-5 text-brand-600" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-semibold text-slate-900">{product.nickname}</h1>
                <Badge variant={product.is_active ? 'success' : 'default'}>
                  {product.is_active ? 'Active' : 'Archived'}
                </Badge>
              </div>
              <p className="text-xs font-mono text-slate-500 mt-0.5">
                Invoice text: "{product.supplier_item_name}"
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Current ref rate</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-brand-700 mt-1">
              ₹{formatINR(product.current_purchase_ref_price)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">HSN code</p>
            <p className="text-sm font-mono font-semibold text-slate-900 mt-0.5">{product.hsn || '24022090'}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Selling price / MRP</p>
            <p className="text-sm font-mono font-semibold text-slate-900 mt-0.5">₹{formatINR(product.current_selling_price)}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Purchase records</p>
            <p className="text-sm font-mono font-semibold text-violet-700 mt-0.5">{purchaseHistory.length} invoices</p>
          </div>
        </div>
      </div>

      {/* Price audit trail */}
      {priceChanges.length > 0 && (
        <Card title="Price adjustment trail" subtitle="Immutable record of reference rate changes">
          <div className="space-y-2">
            {priceChanges.map((change) => (
              <div key={change.id} className="flex items-center justify-between gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
                    <History className="h-4 w-4 text-violet-600" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-mono font-semibold text-slate-900">
                      ₹{formatINR(change.old_value)}{' '}
                      <span className="text-slate-400">→</span>{' '}
                      <span className="text-brand-700">₹{formatINR(change.new_value)}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">"{change.reason}"</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-slate-400 shrink-0">
                  {formatISTTimestamp(change.changed_at)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Purchase history */}
      <Card title={`Purchase history (${purchaseHistory.length})`} subtitle="Every invoice where this product was ordered">
        <Table
          columns={columns}
          data={purchaseHistory}
          keyExtractor={(row) => row.id}
          isLoading={false}
          emptyText="No purchase records found for this product."
        />
      </Card>
    </div>
  );
};
