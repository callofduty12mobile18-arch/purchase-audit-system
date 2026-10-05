import React, { useEffect, useState } from 'react';
import { ClipboardList, Search, ShieldCheck, ChevronDown, ChevronRight, FileCode2 } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Table } from '../components/ui/Table';
import { AuditLog } from '../types';
import { dbService } from '../services/dbService';

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    const data = await dbService.getAuditLogs();
    setLogs(data);
    setLoading(false);
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
      header: 'Auditor User',
      cell: (row: AuditLog) => <span className="text-xs text-[#6C7383] font-mono">{row.user_email || 'admin@audit.local'}</span>
    },
    {
      header: 'Details',
      cell: (row: AuditLog) => (
        <button
          onClick={() => toggleExpand(row.id)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#4B49AC] bg-[#F5F7FF] border border-[#ECEEF5] hover:bg-[#ECEEF5] transition-all cursor-pointer shadow-sm"
        >
          {expandedId === row.id ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          JSON Diff
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            <ClipboardList className="w-6 h-6 text-[#4B49AC]" />
            System Audit Stream
          </h1>
          <p className="page-subtitle">
            Immutable append-only record of all supplier edits, product nickname changes, invoice confirmations & price adjustments
          </p>
        </div>

        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F5F7FF] text-[#4B49AC] border border-[#ECEEF5] text-xs font-mono font-medium shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4B49AC] animate-pulse" />
          <ShieldCheck className="w-4 h-4 text-[#4B49AC]" />
          Tamper-Proof Audit
        </span>
      </div>

      <div className="p-4 rounded-2xl bg-white border border-[#ECEEF5] shadow-skydash flex items-center gap-3">
        <div className="w-full max-w-md">
          <Input
            placeholder="Filter logs by action, entity, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
        <span className="text-xs text-[#6C7383] font-mono hidden sm:inline-block ml-auto">
          {filteredLogs.length} Events Logged
        </span>
      </div>

      <div className="space-y-4">
        <Table
          columns={columns}
          data={filteredLogs}
          keyExtractor={(row) => row.id}
          isLoading={loading}
          emptyText="No audit logs recorded yet."
        />

        {/* JSON Diff Drawer Modal / Expanded Container */}
        {expandedId && (
          <div className="p-5 bg-white border border-[#ECEEF5] rounded-2xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#ECEEF5] pb-3">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-[#4B49AC]" />
                <span className="text-xs font-semibold font-mono text-[#1F1F2C]">Audit Payload Delta — ID: {expandedId}</span>
              </div>
              <button
                onClick={() => setExpandedId(null)}
                className="text-xs text-[#6C7383] hover:text-[#1F1F2C] px-2 py-1 rounded-md hover:bg-[#F5F7FF] transition-colors"
              >
                Close Panel
              </button>
            </div>
            {(() => {
              const log = logs.find(l => l.id === expandedId);
              return log ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[#6C7383] font-mono text-[11px] block mb-1.5 font-medium">Previous State (JSONB)</span>
                    <pre className="p-4 bg-[#F5F7FF] border border-[#ECEEF5] rounded-xl font-mono text-[#1F1F2C] overflow-x-auto text-[11px] leading-relaxed">
                      {JSON.stringify(log.old_value || null, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <span className="text-[#4B49AC] font-mono text-[11px] block mb-1.5 font-bold">New Audited State (JSONB)</span>
                    <pre className="p-4 bg-[#F5F7FF] border border-[#ECEEF5] rounded-xl font-mono text-[#1F1F2C] overflow-x-auto text-[11px] leading-relaxed">
                      {JSON.stringify(log.new_value || null, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : null;
            })()}
          </div>
        )}
      </div>
    </div>
  );
};
