import React, { useEffect, useState } from 'react';
import {
  Search,
  ShieldCheck,
  FileCode2,
  Copy,
  Check,
  Download,
  RefreshCw,
  Eye,
  Calendar,
  Layers,
  FileText,
  Package,
  Building2,
  ExternalLink,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { AuditLog } from '../types';
import { dbService } from '../services/dbService';
import { useToast } from '../context/ToastContext';
import { getTodayIST } from '../utils/dateUtils';

type FilterCategory = 'ALL' | 'INVOICES' | 'PRODUCTS' | 'SUPPLIERS';

export const AuditLogPage: React.FC = () => {
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setFetchError(null);
    try {
      const data = await dbService.getAuditLogs();
      setLogs(data);
      if (isManualRefresh) {
        toastSuccess('Audit Logs Updated', 'Latest security event trail synchronized.');
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to load audit security logs.';
      setFetchError(msg);
      toastError('Audit Logs Error', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const copyPayload = (log: AuditLog) => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    setCopied(true);
    toastSuccess('Payload Copied', 'Audit event metadata copied to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  const exportAuditLogs = () => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `audit_trail_export_${getTodayIST()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toastSuccess('Export Ready', 'Audit log dump successfully exported to JSON.');
    } catch (e: any) {
      toastError('Export Failed', e?.message || 'Could not export audit logs.');
    }
  };

  const formatTimestamp = (ts?: string) => {
    if (!ts) return '-';
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      return d.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch {
      return ts;
    }
  };

  const getActionBadgeVariant = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('CONFIRMED') || act.includes('VERIFIED')) return 'success';
    if (act.includes('CREATED')) return 'purple';
    if (act.includes('UPDATED')) return 'default';
    if (act.includes('PRICE') || act.includes('RATE')) return 'warning';
    if (act.includes('DELETE') || act.includes('VOID') || act.includes('DENIED')) return 'danger';
    return 'default';
  };

  const filteredLogs = logs.filter(l => {
    // 1. Category Filter
    if (selectedCategory === 'INVOICES' && !l.entity_type.toLowerCase().includes('invoice') && !l.action.toLowerCase().includes('invoice')) {
      return false;
    }
    if (selectedCategory === 'PRODUCTS' && !l.entity_type.toLowerCase().includes('product') && !l.action.toLowerCase().includes('product') && !l.action.toLowerCase().includes('price')) {
      return false;
    }
    if (selectedCategory === 'SUPPLIERS' && !l.entity_type.toLowerCase().includes('supplier') && !l.action.toLowerCase().includes('supplier')) {
      return false;
    }

    // 2. Search Filter
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      l.entity_type.toLowerCase().includes(q) ||
      (l.reason && l.reason.toLowerCase().includes(q)) ||
      (l.entity_id && l.entity_id.toLowerCase().includes(q)) ||
      (l.user_email && l.user_email.toLowerCase().includes(q))
    );
  });

  const invoiceCount = logs.filter(l => l.entity_type.toLowerCase().includes('invoice') || l.action.toLowerCase().includes('invoice')).length;
  const productCount = logs.filter(l => l.entity_type.toLowerCase().includes('product') || l.action.toLowerCase().includes('product')).length;
  const supplierCount = logs.filter(l => l.entity_type.toLowerCase().includes('supplier') || l.action.toLowerCase().includes('supplier')).length;

  const columns = [
    {
      header: 'Timestamp',
      cell: (row: AuditLog) => (
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-[#8F93A0] shrink-0" />
          <span className="font-mono text-xs text-[#6C7383]">
            {formatTimestamp(row.timestamp)}
          </span>
        </div>
      )
    },
    {
      header: 'Action',
      cell: (row: AuditLog) => (
        <Badge variant={getActionBadgeVariant(row.action)}>
          {row.action}
        </Badge>
      )
    },
    {
      header: 'Entity Type',
      cell: (row: AuditLog) => (
        <span className="font-mono text-xs text-[#1F1F2C] font-bold uppercase tracking-wider">
          {row.entity_type}
        </span>
      )
    },
    {
      header: 'Audit Note / Reason',
      cell: (row: AuditLog) => (
        <div className="max-w-md truncate text-xs text-[#1F1F2C] font-medium" title={row.reason || ''}>
          {row.reason || '-'}
        </div>
      )
    },
    {
      header: 'Details',
      className: 'text-right',
      cell: (row: AuditLog) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedLog(row);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F5F7FF] text-[#4B49AC] hover:bg-[#4B49AC] hover:text-white transition-all shadow-xs border border-[#ECEEF5] group"
        >
          <Eye className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
          <span>View Diff</span>
        </button>
      )
    }
  ];

  const renderDiffView = (log: AuditLog) => {
    const hasOld = log.old_value && typeof log.old_value === 'object' && Object.keys(log.old_value).length > 0;
    const hasNew = log.new_value && typeof log.new_value === 'object' && Object.keys(log.new_value).length > 0;

    if (hasOld && hasNew) {
      const allKeys = Array.from(new Set([...Object.keys(log.old_value || {}), ...Object.keys(log.new_value || {})]));
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold uppercase tracking-wider text-[#6C7383]">
              Field Modification Comparison
            </h5>
            <span className="text-[11px] text-[#8F93A0] font-mono">Side-by-side State Diff</span>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#ECEEF5] bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F7FF] text-[11px] font-bold text-[#6C7383] uppercase tracking-wider border-b border-[#ECEEF5]">
                <tr>
                  <th className="px-3.5 py-2.5">Field</th>
                  <th className="px-3.5 py-2.5">Previous Value (Before)</th>
                  <th className="px-3.5 py-2.5"></th>
                  <th className="px-3.5 py-2.5">Updated Value (After)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEEF5]">
                {allKeys.map((key) => {
                  const oldVal = (log.old_value as any)?.[key];
                  const newVal = (log.new_value as any)?.[key];
                  const isModified = JSON.stringify(oldVal) !== JSON.stringify(newVal);

                  return (
                    <tr key={key} className={isModified ? 'bg-amber-50/40' : ''}>
                      <td className="px-3.5 py-2.5 font-mono font-semibold text-[#1F1F2C]">
                        {key.replace(/_/g, ' ')}
                      </td>
                      <td className="px-3.5 py-2.5 text-[#6C7383] font-mono">
                        {oldVal !== undefined && oldVal !== null ? (
                          <span className={isModified ? 'text-rose-600 line-through' : ''}>
                            {typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal)}
                          </span>
                        ) : (
                          <span className="text-[#8F93A0] italic">null</span>
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-center text-[#8F93A0]">
                        {isModified ? <ArrowRight className="w-3.5 h-3.5 text-[#4B49AC] inline" /> : '—'}
                      </td>
                      <td className="px-3.5 py-2.5 text-[#1F1F2C] font-mono font-semibold">
                        {newVal !== undefined && newVal !== null ? (
                          <span className={isModified ? 'text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200' : ''}>
                            {typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal)}
                          </span>
                        ) : (
                          <span className="text-[#8F93A0] italic">null</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (hasNew) {
      return (
        <div className="space-y-3">
          <h5 className="text-xs font-bold uppercase tracking-wider text-[#6C7383]">
            Recorded Entity Snapshot
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {Object.entries(log.new_value || {}).map(([key, val]) => (
              <div key={key} className="p-3 rounded-xl bg-white border border-[#ECEEF5] space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-[#8F93A0] font-bold">
                  {key.replace(/_/g, ' ')}
                </span>
                <p className="text-xs font-mono font-bold text-[#1F1F2C] break-all">
                  {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                </p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 rounded-xl bg-[#F8F9FE] border border-[#ECEEF5] text-xs text-[#6C7383] text-center">
        No state payload attached to this security event.
      </div>
    );
  };

  const extractLogBusinessDetails = (log: AuditLog) => {
    const rawNew = (log.new_value || {}) as Record<string, any>;
    const rawOld = (log.old_value || {}) as Record<string, any>;

    // Invoice Number
    let invoiceNumber = rawNew.invoice_number || rawOld.invoice_number;
    if (!invoiceNumber && log.reason) {
      const match = log.reason.match(/#([A-Za-z0-9\-_/]+)/);
      if (match) invoiceNumber = match[1];
    }

    // Supplier
    let supplier = rawNew.supplier_name || rawOld.supplier_name;
    if (!supplier && log.entity_type === 'suppliers') {
      supplier = rawNew.name || rawOld.name;
    }
    if (!supplier && log.reason) {
      const match = log.reason.match(/from\s+([A-Za-z0-9\s&._-]+?)(?:\s*\(|$)/i);
      if (match) supplier = match[1].trim();
    }

    // Product Name (if product event)
    let productName = rawNew.nickname || rawNew.supplier_item_name || rawOld.nickname || rawOld.supplier_item_name;
    if (!productName && log.entity_type === 'products' && log.reason) {
      const match = log.reason.match(/(?:product|update):\s*([A-Za-z0-9\s&._-]+?)(?:\s*\(|$)/i);
      if (match) productName = match[1].trim();
    }

    // Amount
    let amount: number | undefined = undefined;
    if (typeof rawNew.grand_total === 'number') amount = rawNew.grand_total;
    else if (typeof rawOld.grand_total === 'number') amount = rawOld.grand_total;
    else if (typeof rawNew.current_purchase_ref_price === 'number') amount = rawNew.current_purchase_ref_price;
    else if (typeof rawOld.current_purchase_ref_price === 'number') amount = rawOld.current_purchase_ref_price;
    else if (log.reason) {
      const match = log.reason.match(/₹([0-9,]+(?:\.[0-9]{2})?)/);
      if (match) amount = parseFloat(match[1].replace(/,/g, ''));
    }

    // Item Count
    let itemCount: number | undefined = undefined;
    if (typeof rawNew.item_count === 'number') itemCount = rawNew.item_count;
    else if (typeof rawOld.item_count === 'number') itemCount = rawOld.item_count;
    else if (Array.isArray(rawNew.items)) itemCount = rawNew.items.length;
    else if (Array.isArray(rawOld.items)) itemCount = rawOld.items.length;

    return {
      invoiceNumber,
      supplier,
      productName,
      amount,
      itemCount,
      performedBy: log.user_email || 'Administrator',
      description: log.reason || 'System record audit event'
    };
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-[#4B49AC]" />
            System Audit Trail & Security Logs
          </h1>
          <p className="page-subtitle">
            Append-only event logs recording all invoice confirmations, price updates, and database actions.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadLogs(true)}
            isLoading={refreshing}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportAuditLogs}
            disabled={logs.length === 0}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export JSON
          </Button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-[#ECEEF5] shadow-skydash space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#6C7383] font-semibold">Total Audit Events</span>
            <Layers className="w-4 h-4 text-[#4B49AC]" />
          </div>
          <p className="text-xl font-extrabold text-[#1F1F2C]">{logs.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-[#ECEEF5] shadow-skydash space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#6C7383] font-semibold">Invoice Logs</span>
            <FileText className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-extrabold text-emerald-600">{invoiceCount}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-[#ECEEF5] shadow-skydash space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#6C7383] font-semibold">Product Changes</span>
            <Package className="w-4 h-4 text-[#7978E9]" />
          </div>
          <p className="text-xl font-extrabold text-[#7978E9]">{productCount}</p>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="p-4 rounded-2xl bg-white border border-[#ECEEF5] shadow-skydash space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {(
              [
                { id: 'ALL', label: 'All Events', count: logs.length },
                { id: 'INVOICES', label: 'Invoices', count: invoiceCount },
                { id: 'PRODUCTS', label: 'Products & Prices', count: productCount },
                { id: 'SUPPLIERS', label: 'Suppliers', count: supplierCount }
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  selectedCategory === tab.id
                    ? 'bg-[#4B49AC] text-white shadow-sm shadow-[#4B49AC]/20'
                    : 'bg-[#F5F7FF] text-[#6C7383] hover:text-[#4B49AC] hover:bg-[#EEF2FF]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    selectedCategory === tab.id ? 'bg-white/20 text-white' : 'bg-[#ECEEF5] text-[#6C7383]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="w-full md:w-80">
            <Input
              placeholder="Search action, reason, entity, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="space-y-4">
        <Table
          columns={columns}
          data={filteredLogs}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => {
            setSelectedLog(row);
            setShowAdvanced(false);
          }}
          isLoading={loading}
          isError={fetchError}
          onRetry={() => loadLogs()}
          searchQuery={search}
          onClearSearch={() => setSearch('')}
          emptyTitle="No Audit Events Recorded"
          emptyText="Audit trails will log system events automatically when invoices, suppliers, or products are modified."
          skeletonRows={6}
        />
      </div>

      {/* Simplified Business Audit Detail Modal */}
      {selectedLog && (() => {
        const details = extractLogBusinessDetails(selectedLog);
        const isInvoice = selectedLog.entity_type === 'purchase_invoices' || selectedLog.action.toLowerCase().includes('invoice');
        const isDeleted = selectedLog.action.includes('DELETE') || selectedLog.action.includes('VOID');

        return (
          <Modal
            isOpen={!!selectedLog}
            onClose={() => setSelectedLog(null)}
            title="Audit Log Details"
            subtitle={`Recorded on ${formatTimestamp(selectedLog.timestamp)}`}
            size="md"
            footer={
              <div className="w-full flex items-center justify-end gap-2.5">
                {isInvoice && !isDeleted && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const targetId = selectedLog.entity_id;
                      setSelectedLog(null);
                      if (targetId && targetId.length === 36 && targetId.includes('-')) {
                        navigate(`/purchases/${targetId}`);
                      } else {
                        navigate('/purchases');
                      }
                    }}
                    icon={<ExternalLink className="w-3.5 h-3.5" />}
                  >
                    View Invoice
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>
                  Close
                </Button>
              </div>
            }
          >
            <div className="space-y-4">
              {/* Status Badge & Description Banner */}
              <div className="p-4 rounded-2xl bg-[#F5F7FF] border border-[#ECEEF5] space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-semibold text-[#6C7383]">Action / Status</span>
                  <Badge variant={getActionBadgeVariant(selectedLog.action)}>
                    {selectedLog.action.replace(/_/g, ' ')}
                  </Badge>
                </div>

                <div className="pt-2 border-t border-[#ECEEF5]/80">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#8F93A0] block mb-0.5">
                    Description
                  </span>
                  <p className="text-xs sm:text-sm font-semibold text-[#1F1F2C] leading-relaxed">
                    {details.description}
                  </p>
                </div>
              </div>

              {/* Essential Business Details Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* 1. Invoice Number (or Entity Name) */}
                <div className="p-3 rounded-xl bg-white border border-[#ECEEF5] space-y-0.5 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-[#8F93A0] tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#4B49AC]" />
                    {isInvoice ? 'Invoice #' : 'Reference'}
                  </span>
                  <p className="text-xs font-bold text-[#1F1F2C] truncate font-mono">
                    {details.invoiceNumber ? `#${details.invoiceNumber}` : (details.productName || details.supplier || 'N/A')}
                  </p>
                </div>

                {/* 2. Supplier / Target Entity */}
                <div className="p-3 rounded-xl bg-white border border-[#ECEEF5] space-y-0.5 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-[#8F93A0] tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#4B49AC]" />
                    Supplier
                  </span>
                  <p className="text-xs font-bold text-[#1F1F2C] truncate">
                    {details.supplier || 'AYYAPPA ENTERPRISES'}
                  </p>
                </div>

                {/* 3. Amount */}
                <div className="p-3 rounded-xl bg-white border border-[#ECEEF5] space-y-0.5 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-[#8F93A0] tracking-wider flex items-center gap-1.5">
                    <span className="font-sans font-bold text-[#57B657] text-xs">₹</span>
                    Amount
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-[#1F1F2C]">
                    {details.amount !== undefined ? `₹${details.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                  </p>
                </div>

                {/* 4. Item Count */}
                <div className="p-3 rounded-xl bg-white border border-[#ECEEF5] space-y-0.5 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-[#8F93A0] tracking-wider flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-[#4B49AC]" />
                    Item Count
                  </span>
                  <p className="text-xs font-bold text-[#1F1F2C]">
                    {details.itemCount !== undefined ? `${details.itemCount} Items` : '—'}
                  </p>
                </div>

                {/* 5. Date & Time */}
                <div className="p-3 rounded-xl bg-white border border-[#ECEEF5] space-y-0.5 shadow-xs col-span-2 sm:col-span-1">
                  <span className="text-[10px] uppercase font-bold text-[#8F93A0] tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#4B49AC]" />
                    Date & Time
                  </span>
                  <p className="text-xs font-mono font-medium text-[#1F1F2C]">
                    {formatTimestamp(selectedLog.timestamp)}
                  </p>
                </div>

                {/* 6. Performed By */}
                <div className="p-3 rounded-xl bg-white border border-[#ECEEF5] space-y-0.5 shadow-xs col-span-2 sm:col-span-1">
                  <span className="text-[10px] uppercase font-bold text-[#8F93A0] tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#4B49AC]" />
                    Performed By
                  </span>
                  <p className="text-xs font-mono text-[#6C7383] truncate font-medium">
                    {details.performedBy}
                  </p>
                </div>
              </div>

              {/* Collapsible Advanced Technical Details (Admin) */}
              <div className="pt-2 border-t border-[#ECEEF5]">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#F8F9FE] hover:bg-[#EEF2FF] text-[#6C7383] hover:text-[#4B49AC] transition-all text-xs font-semibold border border-[#ECEEF5]"
                >
                  <span className="flex items-center gap-2">
                    <FileCode2 className="w-3.5 h-3.5 text-[#4B49AC]" />
                    Advanced Details (Admin)
                  </span>
                  <span className="text-[11px] font-mono text-[#8F93A0]">
                    {showAdvanced ? '▲ Hide' : '▼ View Technical Logs'}
                  </span>
                </button>

                {showAdvanced && (
                  <div className="mt-3 space-y-3 p-3.5 bg-[#F8F9FE] rounded-xl border border-[#ECEEF5] animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="text-[#6C7383]">
                        <span className="font-semibold text-[#1F1F2C]">Event ID: </span>
                        <span className="font-mono text-[10px] break-all">{selectedLog.id}</span>
                      </div>
                      <div className="text-[#6C7383]">
                        <span className="font-semibold text-[#1F1F2C]">Entity UUID: </span>
                        <span className="font-mono text-[10px] break-all">{selectedLog.entity_id || 'N/A'}</span>
                      </div>
                    </div>

                    {renderDiffView(selectedLog)}

                    <div className="space-y-1.5 pt-2 border-t border-[#ECEEF5]">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8F93A0]">Raw JSON Payload</span>
                        <button
                          type="button"
                          onClick={() => copyPayload(selectedLog)}
                          className="text-xs text-[#4B49AC] hover:underline font-semibold flex items-center gap-1"
                        >
                          {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          {copied ? 'Copied' : 'Copy JSON'}
                        </button>
                      </div>
                      <pre className="p-2.5 bg-slate-900 text-emerald-400 rounded-lg font-mono text-[10px] overflow-x-auto border border-slate-800 max-h-40 leading-normal">
                        {JSON.stringify(selectedLog, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};
