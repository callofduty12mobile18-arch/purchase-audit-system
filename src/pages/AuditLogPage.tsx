import React, { useEffect, useState } from 'react';
import { ShieldCheck, Search, Download, RefreshCw, Eye, Calendar, FileCode2, Copy, Check, ArrowRight, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Table, TableColumn } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { AuditLog } from '../types';
import { dbService } from '../services/dbService';
import { useToast } from '../context/ToastContext';
import { getTodayIST, formatINR } from '../utils/dateUtils';

type FilterCategory = 'ALL' | 'INVOICES' | 'PRODUCTS' | 'SUPPLIERS';

export const AuditLogPage: React.FC = () => {
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<FilterCategory>('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const loadLogs = async (manual = false) => {
    if (manual) setRefreshing(true); else setLoading(true);
    setFetchError(null);
    try {
      setLogs(await dbService.getAuditLogs());
      if (manual) toastSuccess('Logs refreshed', 'Latest audit trail synchronized.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load audit logs.';
      setFetchError(msg); toastError('Load error', msg);
    } finally { if (manual) setRefreshing(false); else setLoading(false); }
  };

  useEffect(() => { loadLogs(); }, []);

  const fmtTs = (ts?: string) => {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
      });
    } catch { return ts; }
  };

  const badgeForAction = (action: string): 'success' | 'info' | 'default' | 'warning' | 'danger' | 'purple' => {
    const a = action.toUpperCase();
    if (a.includes('CONFIRMED') || a.includes('VERIFIED')) return 'success';
    if (a.includes('CREATED')) return 'info';
    if (a.includes('UPDATED')) return 'default';
    if (a.includes('PRICE') || a.includes('RATE')) return 'warning';
    if (a.includes('DELETE')) return 'danger';
    return 'default';
  };

  const invoiceCount = logs.filter((l) => l.entity_type.toLowerCase().includes('invoice') || l.action.toLowerCase().includes('invoice')).length;
  const productCount = logs.filter((l) => l.entity_type.toLowerCase().includes('product') || l.action.toLowerCase().includes('product') || l.action.toLowerCase().includes('price')).length;
  const supplierCount = logs.filter((l) => l.entity_type.toLowerCase().includes('supplier') || l.action.toLowerCase().includes('supplier')).length;

  const filtered = logs.filter((l) => {
    const matchCat = category === 'ALL' ? true
      : category === 'INVOICES' ? (l.entity_type.toLowerCase().includes('invoice') || l.action.toLowerCase().includes('invoice'))
      : category === 'PRODUCTS' ? (l.entity_type.toLowerCase().includes('product') || l.action.toLowerCase().includes('product') || l.action.toLowerCase().includes('price'))
      : (l.entity_type.toLowerCase().includes('supplier') || l.action.toLowerCase().includes('supplier'));
    if (!matchCat) return false;
    const q = search.trim().toLowerCase();
    return !q || l.action.toLowerCase().includes(q) || l.entity_type.toLowerCase().includes(q) || (l.reason?.toLowerCase().includes(q)) || (l.entity_id?.toLowerCase().includes(q)) || (l.user_email?.toLowerCase().includes(q));
  });

  const exportJSON = () => {
    try {
      const a = document.createElement('a');
      a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
      a.download = `audit_trail_${getTodayIST()}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      toastSuccess('Export ready', 'Audit log exported to JSON.');
    } catch (err: unknown) { toastError('Export failed', err instanceof Error ? err.message : ''); }
  };

  const copyPayload = () => {
    if (!selectedLog) return;
    navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2));
    setCopied(true); toastSuccess('Copied', 'Audit event payload copied.');
    setTimeout(() => setCopied(false), 2000);
  };

  const extractDetails = (log: AuditLog) => {
    const n = (log.new_value || {}) as Record<string, any>;
    const o = (log.old_value || {}) as Record<string, any>;
    let invoiceNumber = n.invoice_number || o.invoice_number;
    if (!invoiceNumber && log.reason) { const m = log.reason.match(/#([A-Za-z0-9\-_/]+)/); if (m) invoiceNumber = m[1]; }
    let supplier = n.supplier_name || o.supplier_name || (log.entity_type === 'suppliers' ? (n.name || o.name) : null);
    if (!supplier && log.reason) { const m = log.reason.match(/from\s+([A-Za-z0-9\s&._-]+?)(?:\s*\(|$)/i); if (m) supplier = m[1].trim(); }
    let amount: number | undefined;
    if (typeof n.grand_total === 'number') amount = n.grand_total;
    else if (typeof o.grand_total === 'number') amount = o.grand_total;
    else if (typeof n.current_purchase_ref_price === 'number') amount = n.current_purchase_ref_price;
    let itemCount: number | undefined;
    if (typeof n.item_count === 'number') itemCount = n.item_count;
    else if (typeof o.item_count === 'number') itemCount = o.item_count;
    return { invoiceNumber, supplier, amount, itemCount, by: log.user_email || 'Administrator', desc: log.reason || 'System event' };
  };

  const renderDiff = (log: AuditLog) => {
    const hasOld = log.old_value && Object.keys(log.old_value).length > 0;
    const hasNew = log.new_value && Object.keys(log.new_value).length > 0;
    if (hasOld && hasNew) {
      const keys = Array.from(new Set([...Object.keys(log.old_value!), ...Object.keys(log.new_value!)]));
      return (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">Field</th>
                <th scope="col" className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">Before</th>
                <th scope="col" className="px-3 py-2 text-center w-8" aria-hidden="true" />
                <th scope="col" className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">After</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {keys.map((key) => {
                const oldV = (log.old_value as any)?.[key];
                const newV = (log.new_value as any)?.[key];
                const changed = JSON.stringify(oldV) !== JSON.stringify(newV);
                return (
                  <tr key={key} className={changed ? 'bg-amber-50/60' : ''}>
                    <td className="px-3 py-2 font-mono text-slate-700">{key.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-2 font-mono text-slate-500">
                      {oldV != null ? (
                        <span className={changed ? 'line-through text-red-500' : ''}>
                          {typeof oldV === 'object' ? JSON.stringify(oldV) : String(oldV)}
                        </span>
                      ) : <span className="text-slate-300 italic">null</span>}
                    </td>
                    <td className="px-2 py-2 text-center text-slate-300">
                      {changed ? <ArrowRight className="h-3.5 w-3.5 text-brand-500 inline" /> : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono font-semibold">
                      {newV != null ? (
                        <span className={changed ? 'text-green-700 bg-green-50 px-1.5 py-0.5 rounded' : 'text-slate-700'}>
                          {typeof newV === 'object' ? JSON.stringify(newV) : String(newV)}
                        </span>
                      ) : <span className="text-slate-300 italic">null</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }
    if (hasNew) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Object.entries(log.new_value!).map(([k, v]) => (
            <div key={k} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-xs text-slate-500 uppercase tracking-wide">{k.replace(/_/g, ' ')}</p>
              <p className="text-sm font-mono font-semibold text-slate-900 break-all mt-0.5">
                {typeof v === 'object' ? JSON.stringify(v) : String(v)}
              </p>
            </div>
          ))}
        </div>
      );
    }
    return <p className="text-sm text-slate-400 text-center py-4">No state payload for this event.</p>;
  };

  const columns: TableColumn<AuditLog>[] = [
    {
      header: 'Timestamp',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500">
          <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
          {fmtTs(row.timestamp)}
        </div>
      ),
    },
    { header: 'Action', cell: (row) => <Badge variant={badgeForAction(row.action)}>{row.action}</Badge> },
    { header: 'Entity', cell: (row) => <span className="text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider">{row.entity_type}</span> },
    {
      header: 'Note',
      cell: (row) => (
        <span className="text-sm text-slate-600 truncate max-w-xs block" title={row.reason || ''}>
          {row.reason || '—'}
        </span>
      ),
    },
    {
      header: 'Details',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => { e.stopPropagation(); setSelectedLog(row); setShowAdvanced(false); }}
          icon={<Eye className="h-3.5 w-3.5" />}
        >
          View diff
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Audit trail</h1>
          <p className="page-subtitle">Append-only event log of all system actions.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => loadLogs(true)} isLoading={refreshing} icon={<RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />}>
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportJSON} disabled={logs.length === 0} icon={<Download className="h-3.5 w-3.5" />}>
            Export JSON
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total events', value: logs.length, color: 'text-slate-900' },
          { label: 'Invoice events', value: invoiceCount, color: 'text-green-700' },
          { label: 'Product changes', value: productCount, color: 'text-violet-700' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg border border-slate-200 shadow-card p-4">
            <p className="text-xs font-medium text-slate-500">{stat.label}</p>
            <p className={`text-xl font-bold font-mono mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['ALL', 'INVOICES', 'PRODUCTS', 'SUPPLIERS'] as FilterCategory[]).map((cat) => {
              const count = cat === 'ALL' ? logs.length : cat === 'INVOICES' ? invoiceCount : cat === 'PRODUCTS' ? productCount : supplierCount;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  aria-pressed={category === cat}
                  className={[
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5',
                    category === cat
                      ? 'bg-brand-700 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  ].join(' ')}
                >
                  {cat === 'ALL' ? 'All' : cat === 'INVOICES' ? 'Invoices' : cat === 'PRODUCTS' ? 'Products & Prices' : 'Suppliers'}
                  <span className={`text-xs font-mono px-1.5 py-0 rounded-full ${category === cat ? 'bg-white/20' : 'bg-slate-200 text-slate-500'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="w-full sm:w-72">
            <Input
              placeholder="Search action, reason, entity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="h-4 w-4" />}
            />
          </div>
        </div>
      </div>

      <Table
        columns={columns}
        data={filtered}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => { setSelectedLog(row); setShowAdvanced(false); }}
        isLoading={loading}
        isError={fetchError}
        onRetry={() => loadLogs()}
        searchQuery={search}
        onClearSearch={() => setSearch('')}
        emptyTitle="No audit events"
        emptyText="System events will appear here automatically."
        skeletonRows={6}
      />

      {/* Audit detail modal */}
      {selectedLog && (() => {
        const details = extractDetails(selectedLog);
        const isInvoice = selectedLog.entity_type === 'purchase_invoices' || selectedLog.action.toLowerCase().includes('invoice');
        const isDeleted = selectedLog.action.includes('DELETE');

        return (
          <Modal
            isOpen
            onClose={() => setSelectedLog(null)}
            title="Audit event details"
            subtitle={`Recorded ${fmtTs(selectedLog.timestamp)}`}
            size="lg"
            footer={
              <div className="flex items-center justify-end gap-2 w-full">
                {isInvoice && !isDeleted && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const tid = selectedLog.entity_id;
                      setSelectedLog(null);
                      navigate(tid?.length === 36 ? `/purchases/${tid}` : '/purchases');
                    }}
                    icon={<ExternalLink className="h-3.5 w-3.5" />}
                  >
                    View invoice
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>Close</Button>
              </div>
            }
          >
            <div className="space-y-4">
              {/* Status + description */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-slate-500">Action</p>
                  <Badge variant={badgeForAction(selectedLog.action)}>
                    {selectedLog.action.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div className="border-t border-slate-200 pt-3">
                  <p className="text-xs text-slate-500 mb-0.5">Description</p>
                  <p className="text-sm text-slate-900">{details.desc}</p>
                </div>
              </div>

              {/* Key details grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-500">Reference</p>
                  <p className="text-sm font-mono font-semibold text-slate-900 mt-0.5 truncate">
                    {details.invoiceNumber ? `#${details.invoiceNumber}` : (details.supplier || '—')}
                  </p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-500">Amount</p>
                  <p className="text-sm font-mono font-semibold text-slate-900 mt-0.5">
                    {details.amount !== undefined ? `₹${formatINR(details.amount)}` : '—'}
                  </p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-500">Item count</p>
                  <p className="text-sm font-mono font-semibold text-slate-900 mt-0.5">
                    {details.itemCount !== undefined ? `${details.itemCount} items` : '—'}
                  </p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-500">Performed by</p>
                  <p className="text-sm font-mono text-slate-600 mt-0.5 truncate">{details.by}</p>
                </div>
              </div>

              {/* Advanced toggle */}
              <div className="border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-600 transition-colors border border-slate-200"
                >
                  <span className="flex items-center gap-2">
                    <FileCode2 className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
                    Technical diff view
                  </span>
                  <span className="text-slate-400">{showAdvanced ? '▲ Hide' : '▼ Show'}</span>
                </button>

                {showAdvanced && (
                  <div className="mt-3 space-y-3">
                    <div className="text-xs font-mono text-slate-500 space-y-0.5 bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <div><span className="text-slate-400">Event ID:</span> {selectedLog.id}</div>
                      <div><span className="text-slate-400">Entity ID:</span> {selectedLog.entity_id || '—'}</div>
                    </div>
                    {renderDiff(selectedLog)}
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Raw JSON</p>
                      <button
                        type="button"
                        onClick={copyPayload}
                        className="text-xs text-brand-600 hover:underline flex items-center gap-1"
                      >
                        {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre className="p-3 bg-slate-900 text-green-400 rounded-lg font-mono text-xs overflow-x-auto max-h-40 border border-slate-800">
                      {JSON.stringify(selectedLog, null, 2)}
                    </pre>
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
