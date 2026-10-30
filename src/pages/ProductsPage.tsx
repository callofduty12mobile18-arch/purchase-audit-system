import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Package, Plus, Search, AlertCircle, History } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table, TableColumn } from '../components/ui/Table';
import { Product } from '../types';
import { dbService } from '../services/dbService';
import { useToast } from '../context/ToastContext';
import { formatINR } from '../utils/dateUtils';

export const ProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { success: toastSuccess, error: toastError } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editing, setEditing] = useState<Partial<Product>>({
    supplier_item_name: '', nickname: '', hsn: '24022090', uom: 'PAC',
    current_purchase_ref_price: 0, current_selling_price: 0, min_stock_level: 5, is_active: true,
  });
  const [priceReason, setPriceReason] = useState('');
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    nickname?: string; supplier_item_name?: string;
    current_purchase_ref_price?: string; priceReason?: string;
  }>({});

  const loadData = async () => {
    setLoading(true); setFetchError(null);
    try { setProducts(await dbService.getProducts()); }
    catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load products.';
      setFetchError(msg); toastError('Load error', msg);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { setSearch(searchParams.get('search') || ''); }, [searchParams]);

  const filtered = products
    .filter((p) =>
      p.nickname.toLowerCase().includes(search.toLowerCase()) ||
      p.supplier_item_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.hsn?.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => (a.nickname || a.supplier_item_name).localeCompare(b.nickname || b.supplier_item_name));

  const openAdd = () => {
    setEditing({ supplier_item_name: '', nickname: '', hsn: '24022090', uom: 'PAC', current_purchase_ref_price: 0, current_selling_price: 0, min_stock_level: 5, is_active: true });
    setPriceReason(''); setShowReasonInput(false); setFormErrors({}); setIsModalOpen(true);
  };
  const openEdit = (p: Product) => { setEditing(p); setPriceReason(''); setShowReasonInput(false); setFormErrors({}); setIsModalOpen(true); };

  const checkPriceChange = (v: number) => {
    const orig = products.find((p) => p.id === editing.id);
    setShowReasonInput(!!orig && orig.current_purchase_ref_price !== v);
  };

  const validate = () => {
    const errs: typeof formErrors = {};
    if (!editing.nickname?.trim()) errs.nickname = 'Nickname is required';
    if (!editing.supplier_item_name?.trim()) errs.supplier_item_name = 'Supplier item name is required';
    if (editing.current_purchase_ref_price === undefined || editing.current_purchase_ref_price < 0)
      errs.current_purchase_ref_price = 'Valid purchase rate required';
    if (showReasonInput && !priceReason.trim()) errs.priceReason = 'Reason is required for price changes';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSaving(true);
    try {
      await dbService.saveProduct(editing, priceReason || 'Manual catalog update');
      toastSuccess(editing.id ? 'Product updated' : 'Product added', `"${editing.nickname}" saved.`);
      setIsModalOpen(false); loadData();
    } catch (err: unknown) {
      toastError('Save failed', err instanceof Error ? err.message : 'Could not save.');
    } finally { setIsSaving(false); }
  };

  const columns: TableColumn<Product>[] = [
    {
      header: 'Product alias',
      cell: (row) => (
        <div>
          <p className="text-sm font-semibold text-slate-900">{row.nickname}</p>
          <p className="text-xs font-mono text-slate-400 mt-0.5">"{row.supplier_item_name}"</p>
        </div>
      ),
    },
    {
      header: 'HSN',
      cell: (row) => <span className="text-xs font-mono text-slate-600">{row.hsn || '24022090'}</span>,
    },
    {
      header: 'Purchase ref rate',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (row) => (
        <span className="font-mono font-semibold text-brand-700 tabular-nums">₹{formatINR(row.current_purchase_ref_price)}</span>
      ),
    },
    {
      header: 'Selling price',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (row) => (
        <span className="font-mono text-slate-700 tabular-nums">₹{formatINR(row.current_selling_price)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Product catalog</h1>
          <p className="page-subtitle">Map invoice item text to friendly nicknames. Price updates are audit-logged.</p>
        </div>
        <Button variant="primary" onClick={openAdd} icon={<Plus className="h-4 w-4" />}>
          Add product
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-card p-4 flex items-center gap-3">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search by nickname, invoice text or HSN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        {!loading && (
          <span className="text-xs text-slate-500 hidden sm:inline ml-auto font-mono">
            {filtered.length} / {products.length} products
          </span>
        )}
      </div>

      <Table
        columns={columns}
        data={filtered}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => openEdit(row)}
        isLoading={loading}
        isError={fetchError}
        onRetry={loadData}
        searchQuery={search}
        onClearSearch={() => setSearch('')}
        emptyTitle="No products in catalog"
        emptyText="Add products to auto-fill rates during invoice entry."
        emptyActionLabel="Add product"
        onEmptyAction={openAdd}
        skeletonRows={5}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing.id ? `Edit: ${editing.nickname || 'Product'}` : 'Add product'}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {/* View history link */}
          {editing.id && (
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <p className="text-sm font-medium text-slate-700">Price audit history</p>
                <p className="text-xs text-slate-500">View previous purchase rates.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { setIsModalOpen(false); navigate(`/products/${editing.id}`); }}
                icon={<History className="h-3.5 w-3.5" />}
              >
                View
              </Button>
            </div>
          )}

          <Input
            label="Nickname (primary display name)"
            required
            value={editing.nickname || ''}
            onChange={(e) => { setEditing({ ...editing, nickname: e.target.value }); if (formErrors.nickname) setFormErrors({ ...formErrors, nickname: undefined }); }}
            error={formErrors.nickname}
            isValid={!!editing.nickname?.trim()}
            helperText="e.g. 'Ice Burst 10s' or 'Gold Flake King 10R'"
          />

          <Input
            label="Supplier item name (exact invoice text)"
            required
            value={editing.supplier_item_name || ''}
            onChange={(e) => { setEditing({ ...editing, supplier_item_name: e.target.value }); if (formErrors.supplier_item_name) setFormErrors({ ...formErrors, supplier_item_name: undefined }); }}
            error={formErrors.supplier_item_name}
            isValid={!!editing.supplier_item_name?.trim()}
            helperText="Exact text as printed on purchase bills"
          />

          <Input
            label="HSN code"
            value={editing.hsn || ''}
            onChange={(e) => setEditing({ ...editing, hsn: e.target.value })}
            placeholder="24022090"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Purchase ref rate (₹)"
              type="number"
              step="0.01"
              required
              value={editing.current_purchase_ref_price ?? ''}
              onChange={(e) => {
                const v = parseFloat(e.target.value) || 0;
                setEditing({ ...editing, current_purchase_ref_price: v });
                checkPriceChange(v);
                if (formErrors.current_purchase_ref_price) setFormErrors({ ...formErrors, current_purchase_ref_price: undefined });
              }}
              error={formErrors.current_purchase_ref_price}
            />
            <Input
              label="Selling price / MRP (₹)"
              type="number"
              step="0.01"
              value={editing.current_selling_price ?? ''}
              onChange={(e) => setEditing({ ...editing, current_selling_price: parseFloat(e.target.value) || 0 })}
            />
          </div>

          {showReasonInput && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
              <p className="text-xs font-semibold text-amber-800 flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                Price change requires audit justification
              </p>
              <Input
                label="Reason for price change"
                required
                placeholder="e.g. Supplier rate increase — Oct 2026"
                value={priceReason}
                onChange={(e) => { setPriceReason(e.target.value); if (formErrors.priceReason) setFormErrors({ ...formErrors, priceReason: undefined }); }}
                error={formErrors.priceReason}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSaving}>Save product</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
