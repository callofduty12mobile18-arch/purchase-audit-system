import React, { useState } from 'react';
import { Settings, User, Database, Lock, Trash2, Shield, Server, CheckCircle2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useAuth } from '../hooks/useAuth';
import { dbService } from '../services/dbService';

export const SettingsPage: React.FC = () => {
  const { profile } = useAuth();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleClear = async () => {
    setClearing(true);
    await dbService.clearAllData();
    setClearing(false);
    setShowClearConfirm(false);
    window.location.reload();
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
              <dd className="font-mono text-slate-900 font-medium truncate">{profile?.email}</dd>
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
    </div>
  );
};
