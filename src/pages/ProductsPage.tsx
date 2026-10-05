import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Package, Plus, Search, AlertCircle, History, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Table } from '../components/ui/Table';
import { Product } from '../types';
import { dbService } from '../services/dbService';

export const ProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);

  // Edit / Add Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({
    supplier_item_name: '',
    nickname: '',
    sku: '',
    barcode: '',
    hsn: '',
    uom: 'PAC',
    current_purchase_ref_price: 0,
    current_selling_price: 0,
    min_stock_level: 5,
    is_active: true
  });
  const [priceReason, setPriceReason] = useState('');
  const [showReasonInput, setShowReasonInput] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setSearch(searchParams.get('search') || '');
  }, [searchParams]);

  const loadData = async () => {
    setLoading(true);
    const prods = await dbService.getProducts();
    setProducts(prods);
    setLoading(false);
  };

  const filteredProducts = products.filter(p =>
    p.nickname.toLowerCase().includes(search.toLowerCase()) ||
    p.supplier_item_name.toLowerCase().includes(search.toLowerCase()) ||
    (p.hsn && p.hsn.toLowerCase().includes(search.toLowerCase()))
  );

  const handleOpenAdd = () => {
    setEditingProduct({
      supplier_item_name: '',
      nickname: '',
      hsn: '24022090',
      uom: 'PAC',
      current_purchase_ref_price: 0,
      current_selling_price: 0,
      min_stock_level: 5,
      is_active: true
    });
    setPriceReason('');
    setShowReasonInput(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setPriceReason('');
    setShowReasonInput(false);
    setIsModalOpen(true);
  };

  const handlePriceChangeCheck = (newPrice: number) => {
    const original = products.find(p => p.id === editingProduct.id);
    if (original && original.current_purchase_ref_price !== newPrice) {
      setShowReasonInput(true);
    } else {
      setShowReasonInput(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await dbService.saveProduct(editingProduct, priceReason || 'Manual catalog price update');
    setIsModalOpen(false);
    loadData();
  };

  const columns = [
    {
      header: 'Product Alias / Nickname',
      cell: (row: Product) => (
        <div className="space-y-1">
          <span className="font-bold text-[#1F1F2C] block group-hover:text-[#4B49AC] transition-colors text-sm">
            {row.nickname}
          </span>
          <div className="flex items-center gap-2 text-[11px] text-[#6C7383]">
            <span className="font-mono px-2 py-0.5 rounded bg-[#F5F7FF] border border-[#ECEEF5]">
              Invoice Text: "{row.supplier_item_name}"
            </span>
          </div>
        </div>
      )
    },
    {
      header: 'HSN Code',
      cell: (row: Product) => (
        <span className="font-mono text-[#1F1F2C] text-xs font-semibold">
          {row.hsn || '24022090'}
        </span>
      )
    },
    {
      header: 'Purchase Ref Rate',
      cell: (row: Product) => (
        <span className="font-mono font-bold text-[#4B49AC] text-sm">
          ₹{row.current_purchase_ref_price.toFixed(2)}
        </span>
      )
    },
    {
      header: 'Selling Price',
      cell: (row: Product) => (
        <span className="font-mono font-medium text-[#1F1F2C] text-sm">
          ₹{row.current_selling_price.toFixed(2)}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">
            <Package className="w-6 h-6 text-[#4B49AC]" />
            Product Catalog & Personal Nicknames
          </h1>
          <p className="page-subtitle">
            Map complex invoice items to friendly nicknames. Updating alias prices automatically recalibrates order planning calculations.
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenAdd} icon={<Plus className="w-4 h-4" />}>
          Add Product
        </Button>
      </div>

      {/* Filter */}
      <div className="p-4 rounded-2xl bg-white border border-[#ECEEF5] shadow-skydash flex items-center gap-3">
        <div className="w-full max-w-md">
          <Input
            placeholder="Search by nickname, invoice item text, HSN code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
        <span className="text-xs text-[#6C7383] font-mono hidden sm:inline-block ml-auto">
          {filteredProducts.length} of {products.length} Products
        </span>
      </div>

      <Table
        columns={columns}
        data={filteredProducts}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => handleOpenEdit(row)}
        isLoading={loading}
        emptyText="No cataloged products found matching search."
      />

      {/* Edit / Add Product Modal Popup */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct.id ? `Product: ${editingProduct.nickname || 'Edit Product'}` : 'Create Product Catalog Entry'}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {editingProduct.id && (
            <div className="p-3 rounded-xl bg-[#F5F7FF] border border-[#ECEEF5] flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-[#1F1F2C] block">Price Audit & History</span>
                <span className="text-[11px] text-[#6C7383]">Track previous purchase rates and margins.</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsModalOpen(false);
                  navigate(`/products/${editingProduct.id}`);
                }}
                icon={<History className="w-3.5 h-3.5 text-[#4B49AC]" />}
                className="shrink-0 bg-white shadow-xs text-xs"
              >
                View History
              </Button>
            </div>
          )}

          <Input
            label="Personal Nickname (Primary UI Name) *"
            required
            value={editingProduct.nickname}
            onChange={(e) => setEditingProduct({ ...editingProduct, nickname: e.target.value })}
            helperText="e.g. 'Ice Burst 10M' or 'Gold Flake Red 10R'"
          />

          <Input
            label="Supplier Item Name (Exact Text on Invoices) *"
            required
            value={editingProduct.supplier_item_name}
            onChange={(e) => setEditingProduct({ ...editingProduct, supplier_item_name: e.target.value })}
            helperText="Exact string written on purchase bills (e.g. 'CI Ice Burst 10M 10BE')"
          />

          <Input
            label="HSN Code"
            value={editingProduct.hsn || ''}
            onChange={(e) => setEditingProduct({ ...editingProduct, hsn: e.target.value })}
            placeholder="24022090"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="Purchase Ref Rate (₹) *"
              type="number"
              step="0.01"
              required
              value={editingProduct.current_purchase_ref_price}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setEditingProduct({ ...editingProduct, current_purchase_ref_price: val });
                handlePriceChangeCheck(val);
              }}
            />
            <Input
              label="Selling Price / MRP (₹)"
              type="number"
              step="0.01"
              value={editingProduct.current_selling_price}
              onChange={(e) => setEditingProduct({ ...editingProduct, current_selling_price: parseFloat(e.target.value) || 0 })}
            />
          </div>

          {showReasonInput && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Price Modification Audit Log Triggered</span>
              </div>
              <Input
                label="Reason for Price Change *"
                required
                placeholder="e.g. Supplier price increase or seasonal discount"
                value={priceReason}
                onChange={(e) => setPriceReason(e.target.value)}
              />
            </div>
          )}

          <div className="pt-2 flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto justify-center">
              Cancel
            </Button>
            <Button variant="primary" type="submit" className="w-full sm:w-auto justify-center shadow-md shadow-[#4B49AC]/25">
              Save Product Record
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
