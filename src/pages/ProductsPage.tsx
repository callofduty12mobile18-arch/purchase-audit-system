import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Package, Plus, Search, History } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table, TableColumn } from '../components/ui/Table';
import { Product } from '../types';
import { dbService } from '../services/dbService';
import { useToast } from '../context/ToastContext';
import { formatINR } from '../utils/dateUtils';

type EditingProductState = Omit<Partial<Product>, 'current_purchase_ref_price' | 'current_selling_price'> & {
  current_purchase_ref_price?: number | string;
  current_selling_price?: number | string;
};

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
  const [editing, setEditing] = useState<EditingProductState>({
    supplier_item_name: '', nickname: '', hsn: '24022090', uom: 'PAC',
    current_purchase_ref_price: '', current_selling_price: '', min_stock_level: 5, is_active: true,
  });
  const [formErrors, setFormErrors] = useState<{
    nickname?: string; supplier_item_name?: string;
    current_purchase_ref_price?: string;
  }>({});

  const handleCloseModal = React.useCallback(() => {
    setIsModalOpen(false);
  }, []);

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
    setEditing({
      supplier_item_name: '',
      nickname: '',
      hsn: '24022090',
      uom: 'PAC',
      current_purchase_ref_price: '',
      current_selling_price: '',
      min_stock_level: 5,
      is_active: true
    });
    setFormErrors({});
    setIsModalOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditing({
      ...p,
      current_purchase_ref_price: p.current_purchase_ref_price ?? '',
      current_selling_price: p.current_selling_price ?? '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validate = () => {
    const errs: typeof formErrors = {};
    if (!editing.nickname?.trim()) errs.nickname = 'Nickname is required';
    if (!editing.supplier_item_name?.trim()) errs.supplier_item_name = 'Supplier item name is required';
    const rawRate = editing.current_purchase_ref_price;
    const parsedRate = typeof rawRate === 'number' ? rawRate : parseFloat(String(rawRate ?? '').trim());
    if (rawRate === '' || rawRate === undefined || isNaN(parsedRate) || parsedRate < 0) {
      errs.current_purchase_ref_price = 'Valid purchase rate required';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSaving(true);
    try {
      const parsedPurchase = typeof editing.current_purchase_ref_price === 'number'
        ? editing.current_purchase_ref_price
        : parseFloat(String(editing.current_purchase_ref_price || '0').trim()) || 0;
      const parsedSelling = typeof editing.current_selling_price === 'number'
        ? editing.current_selling_price
        : parseFloat(String(editing.current_selling_price || '0').trim()) || 0;

      const payload: Partial<Product> = {
        ...editing,
        current_purchase_ref_price: parsedPurchase,
        current_selling_price: parsedSelling,
      };

      await dbService.saveProduct(payload, 'Manual catalog update');
      toastSuccess(editing.id ? 'Product updated' : 'Product added', `"${editing.nickname}" saved.`);
      setIsModalOpen(false);
      loadData();
    } catch (err: unknown) {
      toastError('Save failed', err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setIsSaving(false);
    }
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
      headerClassName: 'hidden sm:table-cell',
      className: 'hidden sm:table-cell',
      cell: (row) => <span className="text-xs font-mono text-slate-600">{row.hsn || '24022090'}</span>,
    },
    {
      header: 'Purchase rate',
      headerClassName: 'text-right whitespace-nowrap',
      className: 'text-right whitespace-nowrap font-mono font-semibold text-brand-700 tabular-nums',
      cell: (row) => `₹${formatINR(row.current_purchase_ref_price)}`,
    },
    {
      header: 'Selling price',
      headerClassName: 'text-right whitespace-nowrap hidden sm:table-cell',
      className: 'text-right whitespace-nowrap hidden sm:table-cell font-mono text-slate-700 tabular-nums',
      cell: (row) => `₹${formatINR(row.current_selling_price)}`,
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
        onClose={handleCloseModal}
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
            onChange={(e) => {
              const val = e.target.value;
              setEditing((prev) => ({ ...prev, nickname: val }));
              if (formErrors.nickname) setFormErrors((prev) => ({ ...prev, nickname: undefined }));
            }}
            error={formErrors.nickname}
            isValid={!!editing.nickname?.trim()}
            helperText="e.g. 'Ice Burst 10s' or 'Gold Flake King 10R'"
          />

          <Input
            label="Supplier item name (exact invoice text)"
            required
            value={editing.supplier_item_name || ''}
            onChange={(e) => {
              const val = e.target.value;
              setEditing((prev) => ({ ...prev, supplier_item_name: val }));
              if (formErrors.supplier_item_name) setFormErrors((prev) => ({ ...prev, supplier_item_name: undefined }));
            }}
            error={formErrors.supplier_item_name}
            isValid={!!editing.supplier_item_name?.trim()}
            helperText="Exact text as printed on purchase bills"
          />

          <Input
            label="HSN code"
            value={editing.hsn || ''}
            onChange={(e) => {
              const val = e.target.value;
              setEditing((prev) => ({ ...prev, hsn: val }));
            }}
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
                const val = e.target.value;
                setEditing((prev) => ({ ...prev, current_purchase_ref_price: val }));
                if (formErrors.current_purchase_ref_price) {
                  setFormErrors((prev) => ({ ...prev, current_purchase_ref_price: undefined }));
                }
              }}
              error={formErrors.current_purchase_ref_price}
            />
            <Input
              label="Selling price / MRP (₹)"
              type="number"
              step="0.01"
              value={editing.current_selling_price ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                setEditing((prev) => ({ ...prev, current_selling_price: val }));
              }}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={handleCloseModal}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSaving}>Save product</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
