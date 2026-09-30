import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Package, ArrowLeft, Receipt, History } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table } from '../components/ui/Table';
import { Product, PurchaseItem, PriceHistory } from '../types';
import { dbService } from '../services/dbService';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseItem[]>([]);
  const [priceChanges, setPriceChanges] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
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
    setLoading(false);
  };

  if (!product && !loading) {
    return <div className="text-center py-12 text-[#6C7383]">Product not found</div>;
  }

  const columns = [
    {
      header: 'Purchase Date',
      cell: (row: PurchaseItem) => <span className="text-[#1F1F2C] font-mono">{row.created_at.split('T')[0]}</span>
    },
    {
      header: 'Supplier Item Snapshot (Original Text)',
      cell: (row: PurchaseItem) => (
        <span className="font-mono text-[#6C7383] text-xs">{row.supplier_item_name_snapshot}</span>
      )
    },
    {
      header: 'Qty & UOM',
      cell: (row: PurchaseItem) => <span className="text-[#1F1F2C] font-mono font-medium">{row.quantity} {row.uom_snapshot}</span>
    },
    {
      header: 'Purchase Rate (₹)',
      cell: (row: PurchaseItem) => <span className="font-mono font-bold text-[#4B49AC]">₹{row.purchase_rate.toFixed(2)}</span>
    },
    {
      header: 'GST %',
      cell: (row: PurchaseItem) => <Badge variant="purple">{row.gst_rate}%</Badge>
    },
    {
      header: 'Total Paid (₹)',
      cell: (row: PurchaseItem) => <span className="font-mono font-bold text-[#1F1F2C]">₹{row.total.toFixed(2)}</span>
    }
  ];

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" onClick={() => navigate('/products')} icon={<ArrowLeft className="w-4 h-4" />}>
        Back to Products Catalog
      </Button>

      {/* Product Summary Banner */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-[#4B49AC] text-white shadow-skydash-primary shrink-0">
              <Package className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-bold text-[#1F1F2C] tracking-tight">{product?.nickname}</h1>
                <Badge variant="purple">{product?.uom}</Badge>
              </div>
              <p className="text-xs text-[#6C7383] font-mono mt-1">
                Supplier Exact Item Text: "{product?.supplier_item_name}"
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs">
            <div className="p-4 rounded-xl bg-[#F5F7FF] border border-[#ECEEF5]">
              <span className="text-[#6C7383] block uppercase font-mono text-[10px] tracking-wider font-semibold">Reference Rate</span>
              <span className="text-[#4B49AC] font-mono font-bold text-lg mt-1 block">
                ₹{product?.current_purchase_ref_price.toFixed(2)}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-[#F5F7FF] border border-[#ECEEF5]">
              <span className="text-[#6C7383] block uppercase font-mono text-[10px] tracking-wider font-semibold">Selling Price</span>
              <span className="text-[#1F1F2C] font-mono font-bold text-lg mt-1 block">
                ₹{product?.current_selling_price.toFixed(2)}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-[#F5F7FF] border border-[#ECEEF5] col-span-2 sm:col-span-1">
              <span className="text-[#6C7383] block uppercase font-mono text-[10px] tracking-wider font-semibold">Total Purchases</span>
              <span className="text-[#1F1F2C] font-semibold text-lg mt-1 block">
                {purchaseHistory.length} Invoices
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Historical Purchases Table */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-[#1F1F2C] flex items-center gap-2">
          <Receipt className="w-5 h-5 text-[#4B49AC]" />
          Historical Purchases Snapshot ({purchaseHistory.length})
        </h3>
        <Table
          columns={columns}
          data={purchaseHistory}
          keyExtractor={(row) => row.id}
          isLoading={loading}
          emptyText="No historical purchases recorded for this item yet."
        />
      </div>

      {/* Price Change Log */}
      {priceChanges.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-[#1F1F2C] flex items-center gap-2">
            <History className="w-5 h-5 text-[#4B49AC]" />
            Price History Audit Trail
          </h3>
          <div className="space-y-2.5">
            {priceChanges.map((ph) => (
              <div key={ph.id} className="p-4 rounded-xl bg-white border border-[#ECEEF5] flex items-center justify-between text-xs shadow-skydash">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-[#1F1F2C] font-mono">
                      ₹{ph.old_value.toFixed(2)} → <span className="underline text-[#4B49AC]">₹{ph.new_value.toFixed(2)}</span>
                    </span>
                    <Badge variant="purple">{ph.price_type}</Badge>
                  </div>
                  <p className="text-[#6C7383] mt-1">Reason: {ph.reason}</p>
                </div>
                <span className="text-[#6C7383] font-mono text-[11px]">{ph.changed_at.split('T')[0]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
