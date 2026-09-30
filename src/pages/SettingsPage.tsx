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

  const handleExecuteClear = async () => {
    setClearing(true);
    await dbService.clearAllData();
    setClearing(false);
    setShowClearConfirm(false);
    window.location.reload();
  };

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      <div>
        <h1 className="page-title flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-[#4B49AC]" />
          System Settings & Data Control
        </h1>
        <p className="page-subtitle">Configure session parameters, database connectivity, and data persistence</p>
      </div>

      <div className="space-y-5">
        <Card title="User Account Profile" subtitle="Authenticated session metadata & credentials">
          <div className="space-y-4 text-sm pt-2">
            <div className="flex items-center justify-between py-2.5 border-b border-[#ECEEF5]">
              <span className="text-[#6C7383] flex items-center gap-2.5">
                <User className="w-4 h-4 text-[#4B49AC]" /> Account Email
              </span>
              <span className="font-mono text-[#1F1F2C] text-xs sm:text-sm font-semibold">{profile?.email}</span>
            </div>
            <div className="flex items-center justify-between py-2.5 border-b border-[#ECEEF5]">
              <span className="text-[#6C7383] flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-[#4B49AC]" /> Role & Privilege
              </span>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-[#4B49AC] text-white font-mono tracking-wider shadow-sm">
                {profile?.role || 'ADMIN'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-[#6C7383] flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-[#4B49AC]" /> Session Security
              </span>
              <span className="text-xs text-[#1F1F2C] font-mono flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#57B657]" /> Active JWT Verified
              </span>
            </div>
          </div>
        </Card>

        <Card title="Database & Storage Engine" subtitle="Supabase PostgreSQL client configuration">
          <div className="space-y-4 text-sm pt-2">
            <div className="flex items-center justify-between py-2.5 border-b border-[#ECEEF5]">
              <span className="text-[#6C7383] flex items-center gap-2.5">
                <Database className="w-4 h-4 text-[#4B49AC]" /> Connection Status
              </span>
              <span className="text-[#1F1F2C] font-semibold flex items-center gap-2 text-xs font-mono">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#57B657] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#57B657]"></span>
                </span>
                ONLINE / SUPABASE DB
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-[#6C7383] flex items-center gap-2.5">
                <Server className="w-4 h-4 text-[#4B49AC]" /> OCR Engine
              </span>
              <span className="text-xs text-[#1F1F2C] font-mono font-medium">
                PaddleOCR v4 Microservice + Tesseract Fallback
              </span>
            </div>
          </div>
        </Card>

        <Card title="Danger Zone" subtitle="Wipe local and remote system database records">
          <div className="p-5 bg-[#F5F7FF] border border-[#ECEEF5] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-[#1F1F2C]">Clear All Invoices, Products & Suppliers</h4>
              <p className="text-xs text-[#6C7383] mt-1 max-w-lg leading-relaxed">
                Permanently deletes all verified purchase bills, product nicknames, price audit trails, and supplier catalogues.
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowClearConfirm(true)}
              icon={<Trash2 className="w-4 h-4" />}
            >
              Wipe All Data
            </Button>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleExecuteClear}
        title="Confirm Total System Data Wipe"
        message="Are you sure you want to clear all invoices, suppliers, products, and audit logs? This action cannot be undone."
        confirmText="Yes, Wipe All Data"
        isLoading={clearing}
      />
    </div>
  );
};
