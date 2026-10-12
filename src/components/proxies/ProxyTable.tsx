'use client';

import React, { useState } from 'react';
import { 
  ProxyRecord, 
  ProxyStatus, 
  ProxyProtocol 
} from '@/types';
import { 
  Play, 
  AlertTriangle, 
  RotateCcw, 
  Trash2, 
  Copy, 
  Check, 
  ExternalLink, 
  Search, 
  Filter, 
  ArrowUpDown, 
  ShieldAlert, 
  KeyRound,
  CheckCircle2,
  Clock,
  HelpCircle,
  MoreVertical,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { maskEndpoint } from '@/lib/validation/parser';

interface ProxyTableProps {
  proxies: ProxyRecord[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (newPage: number) => void;
  onRefresh: () => void;
  onSelectProxy: (proxy: ProxyRecord) => void;
  initialStatusFilter?: ProxyStatus;
  isQuarantinedView?: boolean;
}

export const ProxyTable: React.FC<ProxyTableProps> = ({
  proxies,
  total,
  page,
  limit,
  onPageChange,
  onRefresh,
  onSelectProxy,
  initialStatusFilter,
  isQuarantinedView
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter || 'ALL');
  const [protocolFilter, setProtocolFilter] = useState<string>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [checkingIds, setCheckingIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Status badge styling
  const renderStatusBadge = (status: ProxyStatus, quarantined: boolean) => {
    if (quarantined) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
          <AlertTriangle className="w-3 h-3" />
          QUARANTINED
        </span>
      );
    }

    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            ACTIVE
          </span>
        );
      case 'INACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <Clock className="w-3 h-3 text-rose-400" />
            INACTIVE
          </span>
        );
      case 'AUTH_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/40">
            <KeyRound className="w-3 h-3 text-violet-400" />
            AUTH REQ
          </span>
        );
      case 'INVALID':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <AlertTriangle className="w-3 h-3" />
            INVALID
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-700/50 text-slate-300 border border-slate-600">
            <HelpCircle className="w-3 h-3" />
            {status}
          </span>
        );
    }
  };

  // Protocol styling
  const renderProtocolTag = (proto: ProxyProtocol) => {
    const colors: Record<ProxyProtocol, string> = {
      socks5: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      https: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      http: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
      socks4: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${colors[proto] || 'text-slate-300 bg-slate-800'}`}>
        {proto}
      </span>
    );
  };

  // Immediate Single Check
  const handleCheckSingle = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setCheckingIds(prev => ({ ...prev, [id]: true }));
    try {
      await fetch(`/api/proxies/${id}/check`, { method: 'POST' });
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingIds(prev => ({ ...prev, [id]: false }));
    }
  };

  // Quarantine / Restore
  const handleToggleQuarantine = async (e: React.MouseEvent, proxy: ProxyRecord) => {
    e.stopPropagation();
    try {
      await fetch(`/api/proxies/${proxy.id}/quarantine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: proxy.is_quarantined ? 'restore' : 'quarantine',
          reason: proxy.is_quarantined ? 'Restored by user' : 'Manual quarantine from table'
        })
      });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  // Delete
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Permanently remove this proxy endpoint from inventory?')) return;
    try {
      await fetch(`/api/proxies/${id}`, { method: 'DELETE' });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  // Copy
  const handleCopy = (e: React.MouseEvent, text: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Bulk Selection Handlers
  const handleToggleSelectAll = () => {
    if (selectedIds.length === proxies.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(proxies.map(p => p.id));
    }
  };

  const handleToggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Bulk Operations
  const handleBulkAction = async (action: 'recheck' | 'quarantine' | 'restore' | 'delete') => {
    if (selectedIds.length === 0) return;
    if (action === 'delete' && !confirm(`Delete ${selectedIds.length} selected proxies permanently?`)) return;

    setBulkActionLoading(true);
    try {
      await fetch('/api/proxies/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          ids: selectedIds
        })
      });
      setSelectedIds([]);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Client filtering
  const filteredList = proxies.filter(p => {
    if (statusFilter !== 'ALL' && p.current_status !== statusFilter) return false;
    if (protocolFilter !== 'ALL' && p.protocol !== protocolFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        p.normalized_endpoint.toLowerCase().includes(q) ||
        p.host.toLowerCase().includes(q) ||
        p.port.toString().includes(q) ||
        (p.source_name && p.source_name.toLowerCase().includes(q)) ||
        (p.last_failure_reason && p.last_failure_reason.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="bg-[#0d1424] border border-[#1a2540] rounded-xl shadow-sm overflow-hidden flex flex-col">
      {/* Controls Bar */}
      <div className="p-4 border-b border-[#1a2540] flex flex-wrap items-center justify-between gap-3 bg-[#0a0f1d]/50">
        <div className="flex items-center gap-2.5 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by host, port, protocol, source, or error..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#131d35] border border-[#1e2d54] rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Filter dropdowns */}
        <div className="flex items-center gap-2">
          {!initialStatusFilter && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#131d35] border border-[#1e2d54] rounded-lg text-xs text-slate-300 px-3 py-1.5 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="AUTH_REQUIRED">AUTH_REQUIRED</option>
              <option value="INVALID">INVALID</option>
              <option value="UNKNOWN">UNKNOWN</option>
            </select>
          )}

          <select
            value={protocolFilter}
            onChange={(e) => setProtocolFilter(e.target.value)}
            className="bg-[#131d35] border border-[#1e2d54] rounded-lg text-xs text-slate-300 px-3 py-1.5 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Protocols</option>
            <option value="socks5">SOCKS5</option>
            <option value="https">HTTPS</option>
            <option value="http">HTTP</option>
            <option value="socks4">SOCKS4</option>
          </select>
        </div>
      </div>

      {/* Bulk Action Bar (when rows selected) */}
      {selectedIds.length > 0 && (
        <div className="px-4 py-2 bg-blue-950/40 border-b border-blue-500/30 flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2 text-blue-200">
            <span className="font-semibold">{selectedIds.length}</span> proxies selected
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkAction('recheck')}
              disabled={bulkActionLoading}
              className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-1 transition-all"
            >
              <Play className="w-3 h-3" />
              Recheck Selected
            </button>
            <button
              onClick={() => handleBulkAction(isQuarantinedView ? 'restore' : 'quarantine')}
              disabled={bulkActionLoading}
              className="px-2.5 py-1 rounded bg-[#172342] hover:bg-[#1e2d54] text-amber-300 font-medium flex items-center gap-1 transition-all border border-amber-500/30"
            >
              {isQuarantinedView ? <RotateCcw className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
              {isQuarantinedView ? 'Restore Selected' : 'Quarantine Selected'}
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              disabled={bulkActionLoading}
              className="px-2.5 py-1 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 font-medium flex items-center gap-1 transition-all border border-rose-500/30"
            >
              <Trash2 className="w-3 h-3" />
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Table Element */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0a0f1d] text-slate-300 uppercase tracking-wider font-semibold border-b border-[#1a2540]">
            <tr>
              <th className="p-3 w-8">
                <input
                  type="checkbox"
                  checked={selectedIds.length === proxies.length && proxies.length > 0}
                  onChange={handleToggleSelectAll}
                  className="rounded bg-[#131d35] border-slate-700 text-blue-500 focus:ring-0 cursor-pointer"
                />
              </th>
              <th className="p-3">Protocol</th>
              <th className="p-3">Normalized Endpoint (Masked)</th>
              <th className="p-3">Status</th>
              <th className="p-3">Latency</th>
              <th className="p-3">Source</th>
              <th className="p-3">Last Checked</th>
              <th className="p-3">Diagnostic Failure / Reason</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a2540]/60">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Filter className="w-6 h-6 text-slate-400" />
                    <span>No proxy endpoints match the current filter criteria</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredList.map((p) => {
                const isChecking = checkingIds[p.id];
                const isSelected = selectedIds.includes(p.id);

                return (
                  <tr
                    key={p.id}
                    onClick={() => onSelectProxy(p)}
                    className={`table-row-hover transition-colors cursor-pointer ${
                      isSelected ? 'bg-blue-900/10' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="p-3" onClick={(e) => handleToggleSelect(e, p.id)}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded bg-[#131d35] border-slate-700 text-blue-500 focus:ring-0 cursor-pointer"
                      />
                    </td>

                    {/* Protocol */}
                    <td className="p-3">
                      {renderProtocolTag(p.protocol)}
                    </td>

                    {/* Endpoint */}
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 font-mono text-slate-200">
                        <span className="font-semibold">{maskEndpoint(p.normalized_endpoint)}</span>
                        <button
                          onClick={(e) => handleCopy(e, p.normalized_endpoint, p.id)}
                          title="Copy endpoint"
                          className="text-slate-400 hover:text-white p-0.5"
                        >
                          {copiedId === p.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans mt-0.5 flex items-center gap-2">
                        <span>{p.country_code || 'XX'}</span>
                        <span>•</span>
                        <span className="capitalize">{p.anonymity || 'standard'}</span>
                        {p.recovery_count > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-cyan-400 font-semibold">{p.recovery_count} Recoveries</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-3">
                      {renderStatusBadge(p.current_status, p.is_quarantined)}
                    </td>

                    {/* Latency */}
                    <td className="p-3">
                      {p.last_latency_ms !== undefined ? (
                        <span className={`font-mono font-semibold ${
                          p.last_latency_ms < 200 ? 'text-emerald-400' :
                          p.last_latency_ms < 600 ? 'text-blue-400' :
                          p.last_latency_ms < 1500 ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                          {p.last_latency_ms} ms
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono">-</span>
                      )}
                    </td>

                    {/* Source */}
                    <td className="p-3 text-slate-300">
                      {p.source_name || 'Direct'}
                    </td>

                    {/* Last Checked */}
                    <td className="p-3 text-slate-400 font-mono text-[11px]">
                      {p.last_checked_at ? new Date(p.last_checked_at).toLocaleTimeString() : 'Pending'}
                    </td>

                    {/* Failure / Diagnostic Details */}
                    <td className="p-3 max-w-[220px] truncate">
                      {p.is_quarantined ? (
                        <span className="text-amber-400 text-[11px]" title={p.quarantine_reason}>
                          {p.quarantine_reason || 'Quarantined'}
                        </span>
                      ) : p.last_failure_reason ? (
                        <span className="text-rose-400 text-[11px]" title={p.last_failure_reason}>
                          {p.last_failure_reason}
                        </span>
                      ) : p.current_status === 'ACTIVE' ? (
                        <span className="text-emerald-400/80 text-[11px]">Healthy Handshake</span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {/* Instant Check Button */}
                        <button
                          onClick={(e) => handleCheckSingle(e, p.id)}
                          disabled={isChecking}
                          title="Run immediate diagnostic health check"
                          className="p-1.5 rounded-lg bg-[#131d35] hover:bg-blue-600/30 text-blue-400 border border-[#1e2d54] transition-all disabled:opacity-50"
                        >
                          <Play className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                        </button>

                        {/* Quarantine or Restore */}
                        <button
                          onClick={(e) => handleToggleQuarantine(e, p)}
                          title={p.is_quarantined ? 'Restore from quarantine' : 'Quarantine this record'}
                          className={`p-1.5 rounded-lg border transition-all ${
                            p.is_quarantined
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                              : 'bg-[#131d35] hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 border-[#1e2d54]'
                          }`}
                        >
                          {p.is_quarantined ? (
                            <RotateCcw className="w-3.5 h-3.5" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={(e) => handleDelete(e, p.id)}
                          title="Permanently remove"
                          className="p-1.5 rounded-lg bg-[#131d35] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border-[#1e2d54] transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-[#1a2540] flex items-center justify-between text-xs text-slate-400 bg-[#0a0f1d]/50">
        <div>
          Showing <span className="text-white font-medium">{filteredList.length}</span> of{' '}
          <span className="text-white font-medium">{total}</span> records
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="p-1.5 rounded-lg bg-[#131d35] border border-[#1e2d54] text-slate-300 hover:text-white disabled:opacity-40 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono text-slate-300">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg bg-[#131d35] border border-[#1e2d54] text-slate-300 hover:text-white disabled:opacity-40 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
