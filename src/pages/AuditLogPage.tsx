import React, { useEffect, useState } from 'react';
import { ClipboardList, Search, ShieldCheck, ChevronDown, ChevronRight, FileCode2 } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Table } from '../components/ui/Table';
import { AuditLog } from '../types';
import { dbService } from '../services/dbService';
import { useToast } from '../context/ToastContext';

export const AuditLogPage: React.FC = () => {
  const { error: toastError } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await dbService.getAuditLogs();
      setLogs(data);
    } catch (err: any) {
      const msg = err.message || 'Failed to load audit security logs.';
      setFetchError(msg);
      toastError('Audit Logs Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(l =>
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.entity_type.toLowerCase().includes(search.toLowerCase()) ||
    (l.reason && l.reason.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const columns = [
    {
      header: 'Timestamp',
      cell: (row: AuditLog) => (
        <span className="font-mono text-xs text-[#6C7383]">{row.timestamp.replace('T', ' ').slice(0, 19)}</span>
      )
    },
    {
      header: 'Action',
      cell: (row: AuditLog) => (
        <Badge variant={row.action.includes('CREATED') || row.action.includes('CONFIRMED') ? 'success' : 'purple'}>
          {row.action}
        </Badge>
      )
    },
    {
      header: 'Entity Type',
      cell: (row: AuditLog) => (
        <span className="font-mono text-xs text-[#1F1F2C] font-semibold uppercase tracking-wider">{row.entity_type}</span>
      )
    },
    {
      header: 'Audit Note / Reason',
      cell: (row: AuditLog) => <span className="text-xs text-[#1F1F2C]">{row.reason || '-'}</span>
    },
    {
      header: 'Details',
      cell: (row: AuditLog) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleExpand(row.id);
          }}
          className="flex items-center gap-1 text-xs text-[#4B49AC] hover:underline font-semibold"
        >
          {expandedId === row.id ? (
            <>
              <ChevronDown className="w-3.5 h-3.5" /> Hide State
            </>
          ) : (
            <>
              <ChevronRight className="w-3.5 h-3.5" /> View Diff
            </>
          )}
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="page-title flex items-center gap-2.5">
          <ShieldCheck className="w-6 h-6 text-[#4B49AC]" />
          System Audit Trail & Security Logs
        </h1>
        <p className="page-subtitle">
          Append-only cryptographic event logs recording all invoice approvals, price calibrations, and database changes.
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-white border border-[#ECEEF5] shadow-skydash flex items-center gap-3">
        <div className="w-full max-w-md">
          <Input
            placeholder="Search by action, entity type, or justification..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
        {!loading && (
          <span className="text-xs text-[#6C7383] font-mono hidden sm:inline-block ml-auto">
            {filteredLogs.length} Security Events
          </span>
        )}
      </div>

      <div className="space-y-4">
        <Table
          columns={columns}
          data={filteredLogs}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => toggleExpand(row.id)}
          isLoading={loading}
          isError={fetchError}
          onRetry={loadLogs}
          searchQuery={search}
          onClearSearch={() => setSearch('')}
          emptyTitle="No Audit Events Recorded"
          emptyText="Audit trails will log system events automatically when invoices or products are modified."
          skeletonRows={5}
        />

        {/* Expanded Audit Payload Box */}
        {expandedId && (
          <div className="p-5 rounded-2xl bg-[#F8F9FE] border border-[#ECEEF5] space-y-3 animate-in fade-in duration-200 shadow-skydash">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#1F1F2C] flex items-center gap-2 uppercase tracking-wider">
                <FileCode2 className="w-4 h-4 text-[#4B49AC]" />
                Event Metadata Payload #{expandedId.slice(0, 8)}
              </h4>
              <button
                onClick={() => setExpandedId(null)}
                className="text-xs text-[#6C7383] hover:text-[#1F1F2C]"
              >
                Close
              </button>
            </div>
            {(() => {
              const selectedLog = logs.find(l => l.id === expandedId);
              if (!selectedLog) return null;
              return (
                <pre className="p-3.5 bg-slate-900 text-emerald-400 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800">
                  {JSON.stringify(
                    {
                      id: selectedLog.id,
                      timestamp: selectedLog.timestamp,
                      action: selectedLog.action,
                      entity_type: selectedLog.entity_type,
                      entity_id: selectedLog.entity_id,
                      user_id: selectedLog.user_id,
                      user_email: selectedLog.user_email,
                      reason: selectedLog.reason,
                      old_value: selectedLog.old_value,
                      new_value: selectedLog.new_value,
                    },
                    null,
                    2
                  )}
                </pre>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};
