import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Package, ArrowLeft, History } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table } from '../components/ui/Table';
import { CardSkeleton } from '../components/ui/LoadingSkeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { Product, PurchaseItem, PriceHistory } from '../types';
import { dbService } from '../services/dbService';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseItem[]>([]);
  const [priceChanges, setPriceChanges] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const prod = await dbService.getProductById(id!);
      const invoices = await dbService.getInvoices();
      const history = await dbService.getPriceHistory();

      const productInvoices: PurchaseItem[] = [];
      invoices.forEach(inv => {
        inv.items?.forEach(item => {
          if (item.product_id === id) {
            productInvoices.push(item);
          }
        });
      });

      const filteredPriceChanges = history.filter(ph => ph.product_id === id);

      setProduct(prod);
      setPurchaseHistory(productInvoices);
      setPriceChanges(filteredPriceChanges);
      if (!prod) {
        setFetchError('Product not found in catalog.');
      }
    } catch (err: any) {
      setFetchError(err.message || 'Failed to load product details.');
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

  if (fetchError || !product) {
    return (
      <div className="py-12 max-w-2xl mx-auto">
        <ErrorState
          title="Product Not Found"
          message={fetchError || `Could not find product with ID: "${id}"`}
          onRetry={loadData}
          showHomeButton
        />
      </div>
    );
  }

  const columns = [
    {
      header: 'Purchase Date',
      cell: (row: PurchaseItem) => <span className="text-[#1F1F2C] font-mono text-xs">{row.created_at.split('T')[0]}</span>
    },
    {
      header: 'Supplier Item Snapshot (Original Text)',
      cell: (row: PurchaseItem) => (
        <span className="font-mono text-[#6C7383] text-xs">{row.supplier_item_name_snapshot}</span>
      )
    },
    {
      header: 'Quantity (Packs)',
      cell: (row: PurchaseItem) => (
        <span className="font-mono text-xs text-[#1F1F2C] font-bold">{row.quantity}</span>
      )
    },
    {
      header: 'Historical Purchase Rate (₹)',
      cell: (row: PurchaseItem) => (
        <span className="font-mono text-xs font-bold text-[#4B49AC]">₹{row.purchase_rate.toFixed(2)}</span>
      )
    },
    {
      header: 'Line Total (₹)',
      cell: (row: PurchaseItem) => (
        <span className="font-mono text-xs font-bold text-[#1F1F2C]">₹{row.total.toFixed(2)}</span>
      )
    }
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/products')}
          icon={<ArrowLeft className="w-4 h-4" />}
          className="text-xs"
        >
          Back to Products Catalog
        </Button>
      </div>

      {/* Header Info Banner */}
      <div className="p-6 rounded-2xl bg-white border border-[#ECEEF5] shadow-skydash space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[#ECEEF5]">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-[#F5F7FF] text-[#4B49AC] rounded-2xl border border-[#ECEEF5] shadow-xs">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[#1F1F2C]">{product.nickname}</h1>
                <Badge variant={product.is_active ? 'success' : 'default'}>
                  {product.is_active ? 'Active' : 'Archived'}
                </Badge>
              </div>
              <p className="text-xs font-mono text-[#6C7383] mt-0.5">
                Exact Invoice Text: "{product.supplier_item_name}"
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs text-[#6C7383] uppercase font-bold tracking-wider block">Current Reference Rate</span>
            <span className="text-2xl font-bold font-mono text-[#4B49AC]">
              ₹{product.current_purchase_ref_price.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-[#F5F7FF] rounded-xl border border-[#ECEEF5]">
            <span className="text-[11px] text-[#6C7383] font-bold block uppercase">HSN Code</span>
            <span className="font-mono text-sm font-bold text-[#1F1F2C] mt-0.5 block">{product.hsn || '24022090'}</span>
          </div>
          <div className="p-3 bg-[#F5F7FF] rounded-xl border border-[#ECEEF5]">
            <span className="text-[11px] text-[#6C7383] font-bold block uppercase">Selling Price / MRP</span>
            <span className="font-mono text-sm font-bold text-[#1F1F2C] mt-0.5 block">₹{product.current_selling_price.toFixed(2)}</span>
          </div>
          <div className="p-3 bg-[#F5F7FF] rounded-xl border border-[#ECEEF5]">
            <span className="text-[11px] text-[#6C7383] font-bold block uppercase">Total Procurement Invoices</span>
            <span className="font-mono text-sm font-bold text-[#7978E9] mt-0.5 block">{purchaseHistory.length} Invoices</span>
          </div>
        </div>
      </div>

      {/* Price Audit Trail */}
      {priceChanges.length > 0 && (
        <Card
          title="Price Adjustment Audit Trail"
          subtitle="Immutable record of purchase reference rate changes"
        >
          <div className="space-y-3">
            {priceChanges.map(change => (
              <div key={change.id} className="p-4 rounded-xl bg-[#F8F9FE] border border-[#ECEEF5] flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg border border-[#ECEEF5] text-[#4B49AC]">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-mono font-bold text-[#1F1F2C]">
                      ₹{change.old_value.toFixed(2)} → <span className="text-[#4B49AC] font-black">₹{change.new_value.toFixed(2)}</span>
                    </span>
                    <p className="text-[#6C7383] text-[11px] mt-0.5">"{change.reason}"</p>
                  </div>
                </div>
                <span className="font-mono text-[11px] text-[#6C7383]">
                  {new Date(change.changed_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Purchase Invoices with this Product */}
      <Card
        title={`Purchase History (${purchaseHistory.length})`}
        subtitle="Every invoice where this item was purchased"
      >
        <Table
          columns={columns}
          data={purchaseHistory}
          keyExtractor={(row) => row.id}
          isLoading={false}
          emptyText="No historical purchases found for this item."
        />
      </Card>
    </div>
  );
};
