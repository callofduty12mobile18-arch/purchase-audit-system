import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Search, Phone, Mail } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Table } from '../components/ui/Table';
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
  const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier>>({
    name: '',
    gstin: '',
    phone: '',
    email: '',
    address: '',
    payment_terms: 'NET 30',
    notes: '',
    is_active: true
  });
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    gstin?: string;
  }>({});

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await dbService.getSuppliers();
      setSuppliers(data);
    } catch (err: any) {
      const msg = err.message || 'Failed to load suppliers from database.';
      setFetchError(msg);
      toastError('Suppliers Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.gstin && s.gstin.toLowerCase().includes(search.toLowerCase())) ||
    (s.phone && s.phone.includes(search))
  );

  const handleOpenAdd = () => {
    setEditingSupplier({
      name: '',
      gstin: '',
      phone: '',
      email: '',
      address: '',
      payment_terms: 'NET 30',
      notes: '',
      is_active: true
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sup: Supplier, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSupplier(sup);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errors: { name?: string; gstin?: string } = {};

    if (!editingSupplier.name || !editingSupplier.name.trim()) {
      errors.name = 'Supplier name is required';
    }

    if (editingSupplier.gstin && editingSupplier.gstin.trim()) {
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstinRegex.test(editingSupplier.gstin.trim().toUpperCase())) {
        errors.gstin = 'Invalid Indian GSTIN format (e.g. 33AAACS1234F1Z5)';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      await dbService.saveSupplier({
        ...editingSupplier,
        name: editingSupplier.name!.trim(),
        gstin: editingSupplier.gstin ? editingSupplier.gstin.trim().toUpperCase() : undefined
      });
      toastSuccess(
        editingSupplier.id ? 'Supplier Updated' : 'Supplier Registered',
        `Supplier "${editingSupplier.name}" saved successfully.`
      );
      setIsModalOpen(false);
      loadSuppliers();
    } catch (err: any) {
      toastError('Save Error', err.message || 'Unable to save supplier details.');
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    {
      header: 'Distributor / Vendor Name',
      cell: (row: Supplier) => (
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#F5F7FF] border border-[#ECEEF5] text-[#4B49AC] font-bold shadow-sm">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <span
              onClick={() => navigate(`/suppliers/${row.id}`)}
              className="font-bold text-[#1F1F2C] block hover:text-[#4B49AC] hover:underline transition-colors cursor-pointer text-sm"
            >
              {row.name}
            </span>
            {row.gstin && (
              <span className="text-[11px] text-[#6C7383] font-mono px-2 py-0.5 rounded bg-[#F5F7FF] border border-[#ECEEF5] mt-0.5 inline-block">
                GSTIN: {row.gstin}
              </span>
            )}
          </div>
        </div>
      )
    },
    {
      header: 'Contact Info',
      cell: (row: Supplier) => (
        <div className="space-y-1 text-xs text-[#1F1F2C]">
          {row.phone && (
            <div className="flex items-center gap-1.5 text-[#1F1F2C] font-mono">
              <Phone className="w-3.5 h-3.5 text-[#6C7383]" /> {row.phone}
            </div>
          )}
          {row.email && (
            <div className="flex items-center gap-1.5 text-[#6C7383]">
              <Mail className="w-3.5 h-3.5 text-[#6C7383]" /> {row.email}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Payment Terms',
      cell: (row: Supplier) => (
        <Badge variant="purple">{row.payment_terms || 'NET 30'}</Badge>
      )
    },
    {
      header: 'Status',
      cell: (row: Supplier) => (
        row.is_active ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge variant="default">Inactive</Badge>
        )
      )
    },
    {
      header: 'Actions',
      cell: (row: Supplier) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={(e) => handleOpenEdit(row, e)}>
            Edit
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate(`/suppliers/${row.id}`)}>
            Invoices
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">
            <Building2 className="w-6 h-6 text-[#4B49AC]" />
            Distributor & Supplier Directory
          </h1>
          <p className="page-subtitle">
            Manage vendor GSTINs, payment terms, and historical procurement records.
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenAdd} icon={<Plus className="w-4 h-4" />}>
          Register Supplier
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border border-[#ECEEF5] shadow-skydash flex items-center gap-3">
        <div className="w-full max-w-md">
          <Input
            placeholder="Search by supplier name, GSTIN, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
        {!loading && (
          <span className="text-xs text-[#6C7383] font-mono hidden sm:inline-block ml-auto">
            {filteredSuppliers.length} Vendors Registered
          </span>
        )}
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={filteredSuppliers}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => navigate(`/suppliers/${row.id}`)}
        isLoading={loading}
        isError={fetchError}
        onRetry={loadSuppliers}
        searchQuery={search}
        onClearSearch={() => setSearch('')}
        emptyVariant="suppliers"
        emptyTitle="No Suppliers Registered Yet"
        emptyText="No vendor profiles exist in your database. Register your distributor to associate purchase invoices."
        emptyActionLabel="Register First Supplier"
        onEmptyAction={handleOpenAdd}
        skeletonRows={5}
      />

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSupplier.id ? 'Edit Supplier Details' : 'Register New Supplier'}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Supplier Name"
            required
            value={editingSupplier.name || ''}
            onChange={(e) => {
              setEditingSupplier({ ...editingSupplier, name: e.target.value });
              if (formErrors.name) setFormErrors({ ...formErrors, name: undefined });
            }}
            error={formErrors.name}
            isValid={Boolean(editingSupplier.name?.trim())}
          />
          <Input
            label="GSTIN (15 Digits)"
            placeholder="e.g. 33AAACS1234F1Z5"
            value={editingSupplier.gstin || ''}
            onChange={(e) => {
              setEditingSupplier({ ...editingSupplier, gstin: e.target.value });
              if (formErrors.gstin) setFormErrors({ ...formErrors, gstin: undefined });
            }}
            error={formErrors.gstin}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              value={editingSupplier.phone || ''}
              onChange={(e) => setEditingSupplier({ ...editingSupplier, phone: e.target.value })}
            />
            <Input
              label="Email Address"
              type="email"
              value={editingSupplier.email || ''}
              onChange={(e) => setEditingSupplier({ ...editingSupplier, email: e.target.value })}
            />
          </div>
          <Input
            label="Payment Terms"
            placeholder="e.g. NET 15, CASH ON DELIVERY"
            value={editingSupplier.payment_terms || ''}
            onChange={(e) => setEditingSupplier({ ...editingSupplier, payment_terms: e.target.value })}
          />
          <Input
            label="Address"
            value={editingSupplier.address || ''}
            onChange={(e) => setEditingSupplier({ ...editingSupplier, address: e.target.value })}
          />
          <div className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSaving}>
              Save Supplier Record
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
