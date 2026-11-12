import React, { useState, useRef } from 'react';
import {
  Settings,
  User,
  Database,
  Lock,
  Trash2,
  Shield,
  Server,
  CheckCircle2,
  Download,
  Upload,
  FileSpreadsheet,
  FileJson,
  Edit2,
  Check,
  X,
  AlertCircle,
  Archive
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useAuth } from '../hooks/useAuth';
import { dbService } from '../services/dbService';
import { backupService, FullBackupPayload } from '../services/backupService';
import { useToast } from '../context/ToastContext';

export const SettingsPage: React.FC = () => {
  const { profile, updateEmail } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const currentEmail = profile?.email || 'polonium84r@gmail.com';
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState(currentEmail);

  // Clear data dialog state
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Backup and Export state
  const [backingUp, setBackingUp] = useState(false);
  const [exportingType, setExportingType] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [pendingRestoreData, setPendingRestoreData] = useState<FullBackupPayload | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveEmail = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      toastError('Invalid email', 'Please provide a valid email address.');
      return;
    }
    updateEmail(trimmed);
    setIsEditingEmail(false);
    toastSuccess('Email updated', `Account email set to ${trimmed}`);
  };

  const handleClear = async () => {
    setClearing(true);
    await dbService.clearAllData();
    setClearing(false);
    setShowClearConfirm(false);
    window.location.reload();
  };

  // ── Backup Handlers ──────────────────────────────────────────────────────────
  const handleDownloadBackup = async () => {
    setBackingUp(true);
    try {
      const backup = await backupService.downloadFullBackupJson(currentEmail);
      toastSuccess(
        'Backup downloaded',
        `Full JSON backup saved with ${backup.stats.total_invoices} invoices and ${backup.stats.total_products} products.`
      );
    } catch (err: unknown) {
      toastError('Backup failed', err instanceof Error ? err.message : 'Failed to generate backup.');
    } finally {
      setBackingUp(false);
    }
  };

  const handleExportInvoices = async () => {
    setExportingType('invoices');
    try {
      const count = await backupService.exportInvoicesCsv();
      toastSuccess('Export completed', `Exported ${count} invoices to CSV.`);
    } catch (err: unknown) {
      toastError('Export failed', err instanceof Error ? err.message : 'Failed to export invoices.');
    } finally {
      setExportingType(null);
    }
  };

  const handleExportProducts = async () => {
    setExportingType('products');
    try {
      const count = await backupService.exportProductsCsv();
      toastSuccess('Export completed', `Exported ${count} products to CSV.`);
    } catch (err: unknown) {
      toastError('Export failed', err instanceof Error ? err.message : 'Failed to export products.');
    } finally {
      setExportingType(null);
    }
  };

  const handleExportSuppliers = async () => {
    setExportingType('suppliers');
    try {
      const count = await backupService.exportSuppliersCsv();
      toastSuccess('Export completed', `Exported ${count} suppliers to CSV.`);
    } catch (err: unknown) {
      toastError('Export failed', err instanceof Error ? err.message : 'Failed to export suppliers.');
    } finally {
      setExportingType(null);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rawJson = event.target?.result as string;
        const parsed = JSON.parse(rawJson) as FullBackupPayload;
        if (!parsed?.data?.invoices && !parsed?.data?.products) {
          throw new Error('Unrecognized backup structure.');
        }
        setPendingRestoreData(parsed);
        setShowRestoreConfirm(true);
      } catch (err) {
        toastError('Invalid file', 'The selected file is not a valid JSON backup file.');
      }
    };
    reader.readAsText(file);
    // Reset file input so selecting the same file again triggers change
    e.target.value = '';
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestoreData) return;
    setRestoring(true);
    try {
      const res = await backupService.restoreBackup(pendingRestoreData);
      toastSuccess(
        'Data restored',
        `Successfully restored ${res.invoicesRestored} invoices and ${res.productsRestored} products.`
      );
      setShowRestoreConfirm(false);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: unknown) {
      toastError('Restore error', err instanceof Error ? err.message : 'Failed to restore data.');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">System configuration and data management.</p>
      </div>

      <div className="space-y-5">
        {/* User account */}
        <Card title="User account" subtitle="Authenticated session metadata">
          <dl className="divide-y divide-slate-100 text-sm">
            <div className="flex items-center justify-between py-3 gap-3">
              <dt className="flex items-center gap-2 text-slate-500">
                <User className="h-4 w-4 text-brand-600 shrink-0" aria-hidden="true" /> Email
              </dt>
              <dd className="font-mono text-slate-900 font-medium">
                {isEditingEmail ? (
                  <form onSubmit={handleSaveEmail} className="flex items-center gap-2">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="h-8 px-2.5 rounded border border-slate-300 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600"
                      autoFocus
                    />
                    <Button type="submit" variant="primary" size="sm" icon={<Check className="h-3 w-3" />}>
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEmailInput(currentEmail);
                        setIsEditingEmail(false);
                      }}
                      icon={<X className="h-3 w-3" />}
                    >
                      Cancel
                    </Button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="truncate">{currentEmail}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEmailInput(currentEmail);
                        setIsEditingEmail(true);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-brand-600 hover:bg-slate-100 transition-colors"
                      title="Edit email address"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between py-3 gap-3">
              <dt className="flex items-center gap-2 text-slate-500">
                <Lock className="h-4 w-4 text-brand-600 shrink-0" aria-hidden="true" /> Role
              </dt>
              <dd>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-600/20">
                  {profile?.role || 'ADMIN'}
                </span>
              </dd>
            </div>
            <div className="flex items-center justify-between py-3 gap-3">
              <dt className="flex items-center gap-2 text-slate-500">
                <Shield className="h-4 w-4 text-brand-600 shrink-0" aria-hidden="true" /> Session
              </dt>
              <dd className="flex items-center gap-1.5 text-sm font-medium text-green-700">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Active
              </dd>
            </div>
          </dl>
        </Card>

        {/* Database */}
        <Card title="Database" subtitle="Supabase PostgreSQL connection">
          <dl className="divide-y divide-slate-100 text-sm">
            <div className="flex items-center justify-between py-3 gap-3">
              <dt className="flex items-center gap-2 text-slate-500">
                <Database className="h-4 w-4 text-brand-600 shrink-0" aria-hidden="true" /> Status
              </dt>
              <dd className="flex items-center gap-2 font-medium text-green-700">
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                Connected
              </dd>
            </div>
            <div className="flex items-center justify-between py-3 gap-3">
              <dt className="flex items-center gap-2 text-slate-500">
                <Server className="h-4 w-4 text-brand-600 shrink-0" aria-hidden="true" /> Processing
              </dt>
              <dd className="text-slate-700 font-medium">Manual entry + audit trail</dd>
            </div>
          </dl>
        </Card>

        {/* Backup and export */}
        <Card title="Backup & data export" subtitle="Full database backup, spreadsheet export, and disaster recovery">
          <div className="space-y-4">
            {/* Full JSON Backup */}
            <div className="p-4 rounded-lg border border-brand-200 bg-brand-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <FileJson className="h-4 w-4 text-brand-700" />
                  <h4 className="text-sm font-semibold text-slate-900">Complete system backup (JSON)</h4>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Exports all invoices, line items, product catalog, suppliers, payment ledger, and audit logs into a single structured file.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDownloadBackup}
                isLoading={backingUp}
                icon={<Download className="h-4 w-4" />}
                className="shrink-0"
              >
                Download backup
              </Button>
            </div>

            {/* CSV / Spreadsheet exports */}
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <h4 className="text-sm font-semibold text-slate-900">Export spreadsheets (CSV)</h4>
              </div>
              <p className="text-xs text-slate-500">
                Download tabular spreadsheet files ready for Microsoft Excel, Google Sheets, or accounting tools.
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportInvoices}
                  isLoading={exportingType === 'invoices'}
                  icon={<Download className="h-3.5 w-3.5" />}
                >
                  Export Invoices CSV
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportProducts}
                  isLoading={exportingType === 'products'}
                  icon={<Download className="h-3.5 w-3.5" />}
                >
                  Export Products CSV
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportSuppliers}
                  isLoading={exportingType === 'suppliers'}
                  icon={<Download className="h-3.5 w-3.5" />}
                >
                  Export Suppliers CSV
                </Button>
              </div>
            </div>

            {/* Restore Backup */}
            <div className="p-4 rounded-lg border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-slate-700" />
                  <h4 className="text-sm font-semibold text-slate-900">Restore from backup</h4>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Restore all records from a previously downloaded JSON backup file.
                </p>
              </div>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  className="hidden"
                  onChange={handleFileSelected}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  isLoading={restoring}
                  icon={<Upload className="h-4 w-4" />}
                  className="shrink-0"
                >
                  Upload & restore
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Danger zone */}
        <Card title="Danger zone" subtitle="Destructive data operations">
          <div className="rounded-lg border border-red-200 bg-red-50 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Clear all data</p>
                <p className="text-xs text-slate-500 mt-0.5 max-w-sm">
                  Permanently deletes all invoices, products, suppliers, price history, and audit logs.
                  This cannot be undone.
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowClearConfirm(true)}
                icon={<Trash2 className="h-4 w-4" />}
              >
                Wipe all data
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Clear Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClear}
        title="Wipe all data?"
        message="This will permanently delete all invoices, suppliers, products, and audit logs from both local storage and the database. This action cannot be undone."
        confirmText="Yes, wipe everything"
        variant="danger"
        isLoading={clearing}
      />

      {/* Restore Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showRestoreConfirm}
        onClose={() => {
          setShowRestoreConfirm(false);
          setPendingRestoreData(null);
        }}
        onConfirm={handleConfirmRestore}
        title="Restore system backup?"
        message={`This backup contains ${pendingRestoreData?.stats?.total_invoices || pendingRestoreData?.data?.invoices?.length || 0} invoices, ${pendingRestoreData?.stats?.total_products || pendingRestoreData?.data?.products?.length || 0} products, and ${pendingRestoreData?.stats?.total_suppliers || pendingRestoreData?.data?.suppliers?.length || 0} suppliers. Restoring will merge and update your local and database records. Continue?`}
        confirmText="Yes, restore data"
        variant="default"
        isLoading={restoring}
      />
    </div>
  );
};
