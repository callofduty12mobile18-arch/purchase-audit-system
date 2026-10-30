import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Search, Phone, Mail } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Table, TableColumn } from '../components/ui/Table';
import { Supplier } from '../types';
import { dbService } from '../services/dbService';
import { useToast } from '../context/ToastContext';

export const SuppliersPage: React.FC = () => {
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editing, setEditing] = useState<Partial<Supplier>>({
    name: '', gstin: '', phone: '', email: '', address: '', payment_terms: 'NET 30', notes: '', is_active: true,
  });
  const [formErrors, setFormErrors] = useState<{ name?: string; gstin?: string }>({});

  const loadSuppliers = async () => {
    setLoading(true); setFetchError(null);
    try { setSuppliers(await dbService.getSuppliers()); }
    catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load suppliers.';
      setFetchError(msg); toastError('Load error', msg);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadSuppliers(); }, []);

  const filtered = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.gstin?.toLowerCase().includes(search.toLowerCase())) ||
    (s.phone?.includes(search))
  );

  const openAdd = () => {
    setEditing({ name: '', gstin: '', phone: '', email: '', address: '', payment_terms: 'NET 30', notes: '', is_active: true });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEdit = (s: Supplier, e: React.MouseEvent) => {
    e.stopPropagation(); setEditing(s); setFormErrors({}); setIsModalOpen(true);
  };

  const validate = () => {
    const errors: { name?: string; gstin?: string } = {};
    if (!editing.name?.trim()) errors.name = 'Supplier name is required';
    if (editing.gstin?.trim()) {
      if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(editing.gstin.trim().toUpperCase()))
        errors.gstin = 'Invalid GSTIN format (e.g. 33AAACS1234F1Z5)';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSaving(true);
    try {
      await dbService.saveSupplier({ ...editing, name: editing.name!.trim(), gstin: editing.gstin?.trim().toUpperCase() });
      toastSuccess(editing.id ? 'Supplier updated' : 'Supplier added', `"${editing.name}" saved.`);
      setIsModalOpen(false);
      loadSuppliers();
    } catch (err: unknown) {
      toastError('Save failed', err instanceof Error ? err.message : 'Could not save.');
    } finally { setIsSaving(false); }
  };

  const columns: TableColumn<Supplier>[] = [
    {
      header: 'Supplier',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
            <Building2 className="h-4 w-4 text-brand-600" aria-hidden="true" />
          </div>
          <div>
            <button
              type="button"
              onClick={() => navigate(`/suppliers/${row.id}`)}
              className="text-sm font-semibold text-slate-900 hover:text-brand-700 hover:underline transition-colors text-left"
            >
              {row.name}
            </button>
            {row.gstin && (
              <p className="text-xs font-mono text-slate-500 mt-0.5">GSTIN: {row.gstin}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Contact',
      cell: (row) => (
        <div className="space-y-0.5 text-xs text-slate-600">
          {row.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="h-3 w-3 text-slate-400" aria-hidden="true" />
              <span className="font-mono">{row.phone}</span>
            </div>
          )}
          {row.email && (
            <div className="flex items-center gap-1.5">
              <Mail className="h-3 w-3 text-slate-400" aria-hidden="true" />
              <span className="truncate max-w-[180px]">{row.email}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Payment terms',
      cell: (row) => <Badge variant="default">{row.payment_terms || 'NET 30'}</Badge>,
    },
    {
      header: 'Status',
      cell: (row) => (
        <Badge variant={row.is_active ? 'success' : 'default'}>
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (row) => (
        <div className="flex items-center gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={(e) => openEdit(row, e)}>Edit</Button>
          <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/suppliers/${row.id}`); }}>
            Invoices
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Suppliers</h1>
          <p className="page-subtitle">Manage vendor GSTINs, payment terms, and procurement history.</p>
        </div>
        <Button variant="primary" onClick={openAdd} icon={<Plus className="h-4 w-4" />}>
          Add supplier
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-card p-4 flex items-center gap-3">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search by name, GSTIN or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        {!loading && (
          <span className="text-xs text-slate-500 hidden sm:inline ml-auto font-mono">
            {filtered.length} vendors
          </span>
        )}
      </div>

      <Table
        columns={columns}
        data={filtered}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => navigate(`/suppliers/${row.id}`)}
        isLoading={loading}
        isError={fetchError}
        onRetry={loadSuppliers}
        searchQuery={search}
        onClearSearch={() => setSearch('')}
        emptyTitle="No suppliers registered"
        emptyText="Register your distributor to associate purchase invoices."
        emptyActionLabel="Add supplier"
        onEmptyAction={openAdd}
        skeletonRows={4}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing.id ? 'Edit supplier' : 'Add supplier'}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Supplier name" required value={editing.name || ''} onChange={(e) => { setEditing({ ...editing, name: e.target.value }); if (formErrors.name) setFormErrors({ ...formErrors, name: undefined }); }} error={formErrors.name} isValid={!!editing.name?.trim()} />
          <Input label="GSTIN" placeholder="33AAACS1234F1Z5" value={editing.gstin || ''} onChange={(e) => { setEditing({ ...editing, gstin: e.target.value }); if (formErrors.gstin) setFormErrors({ ...formErrors, gstin: undefined }); }} error={formErrors.gstin} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Phone" value={editing.phone || ''} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
            <Input label="Email" type="email" value={editing.email || ''} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
          </div>
          <Input label="Payment terms" placeholder="NET 15, CASH, etc." value={editing.payment_terms || ''} onChange={(e) => setEditing({ ...editing, payment_terms: e.target.value })} />
          <Input label="Address" value={editing.address || ''} onChange={(e) => setEditing({ ...editing, address: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSaving}>Save supplier</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
