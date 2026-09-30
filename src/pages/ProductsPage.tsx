import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Package, Plus, Search, Edit3, AlertCircle } from 'lucide-react';
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
    uom: 'PCS',
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
    (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
    (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase()))
  );

  const handleOpenAdd = () => {
    setEditingProduct({
      supplier_item_name: '',
      nickname: '',
      sku: `SKU-${Math.floor(100000 + Math.random() * 900000)}`,
      barcode: '',
      hsn: '',
      uom: 'PCS',
      current_purchase_ref_price: 0,
      current_selling_price: 0,
      min_stock_level: 5,
      is_active: true
    });
    setPriceReason('');
    setShowReasonInput(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product, e: React.MouseEvent) => {
    e.stopPropagation();
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
          <span
            onClick={() => navigate(`/products/${row.id}`)}
            className="font-bold text-[#1F1F2C] block hover:text-[#4B49AC] hover:underline transition-colors cursor-pointer text-sm"
          >
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
      header: 'HSN & SKU',
      cell: (row: Product) => (
        <div className="space-y-0.5 text-xs">
          {row.hsn && <span className="font-mono text-[#1F1F2C] block font-semibold">HSN: {row.hsn}</span>}
          {row.sku && <span className="font-mono text-[#6C7383] block text-[11px]">{row.sku}</span>}
        </div>
      )
    },
    {
      header: 'UOM',
      cell: (row: Product) => <Badge variant="outline">{row.uom}</Badge>
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
    },
    {
      header: 'Actions',
      cell: (row: Product) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={(e) => handleOpenEdit(row, e)}>
            Edit Alias / Rate
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/products/${row.id}`)}>
            History
          </Button>
        </div>
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
          Add Product SKU
        </Button>
      </div>

      {/* Filter */}
      <div className="p-4 rounded-2xl bg-white border border-[#ECEEF5] shadow-skydash flex items-center gap-3">
        <div className="w-full max-w-md">
          <Input
            placeholder="Search by nickname, invoice item text, SKU, barcode..."
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
        isLoading={loading}
        emptyText="No cataloged products found matching search."
      />

      {/* Edit / Add Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct.id ? 'Edit Product & Personal Alias' : 'Create Product Catalog Entry'}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Personal Nickname (Primary UI Name) *"
            required
            value={editingProduct.nickname}
            onChange={(e) => setEditingProduct({ ...editingProduct, nickname: e.target.value })}
            helperText="e.g. 'Gold Flake Red Pack' or 'Amul Butter 500g'"
          />

          <Input
            label="Supplier Item Name (Exact Text on Invoices) *"
            required
            value={editingProduct.supplier_item_name}
            onChange={(e) => setEditingProduct({ ...editingProduct, supplier_item_name: e.target.value })}
            helperText="Exact string extracted by OCR from bills (e.g. 'GFK RED NBUNDLE')"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="HSN Code"
              value={editingProduct.hsn || ''}
              onChange={(e) => setEditingProduct({ ...editingProduct, hsn: e.target.value })}
            />
            <Input
              label="UOM (Unit of Measure)"
              value={editingProduct.uom || 'PCS'}
              onChange={(e) => setEditingProduct({ ...editingProduct, uom: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Current Purchase Ref Price (₹)"
              type="number"
              step="0.01"
              value={editingProduct.current_purchase_ref_price}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setEditingProduct({ ...editingProduct, current_purchase_ref_price: val });
                handlePriceChangeCheck(val);
              }}
            />
            <Input
              label="Current Selling Price (₹)"
              type="number"
              step="0.01"
              value={editingProduct.current_selling_price}
              onChange={(e) => setEditingProduct({ ...editingProduct, current_selling_price: parseFloat(e.target.value) || 0 })}
            />
          </div>

          {showReasonInput && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
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

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="SKU"
              value={editingProduct.sku || ''}
              onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
            />
            <Input
              label="Barcode / EAN"
              value={editingProduct.barcode || ''}
              onChange={(e) => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Product Record
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
