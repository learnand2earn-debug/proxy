'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Play, 
  AlertTriangle, 
  RotateCcw, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Zap, 
  Layers, 
  History,
  Activity,
  KeyRound
} from 'lucide-react';
import { ProxyRecord, CheckHistoryItem, StatusTransition } from '@/types';
import { maskEndpoint } from '@/lib/validation/parser';

interface ProxyDetailModalProps {
  proxy: ProxyRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const ProxyDetailModal: React.FC<ProxyDetailModalProps> = ({
  proxy,
  isOpen,
  onClose,
  onRefresh
}) => {
  const [history, setHistory] = useState<CheckHistoryItem[]>([]);
  const [transitions, setTransitions] = useState<StatusTransition[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckMessage, setLastCheckMessage] = useState<string | null>(null);

  useEffect(() => {
    if (proxy && isOpen) {
      fetch(`/api/proxies/${proxy.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.check_history) setHistory(data.check_history);
          if (data.transitions) setTransitions(data.transitions);
        })
        .catch(console.error);
    }
  }, [proxy, isOpen]);

  if (!isOpen || !proxy) return null;

  const handleRunCheck = async () => {
    setIsChecking(true);
    setLastCheckMessage(null);
    try {
      const res = await fetch(`/api/proxies/${proxy.id}/check`, { method: 'POST' });
      const data = await res.json();
      if (data.checkResult) {
        setLastCheckMessage(`Check finished: ${data.checkResult.status} (${data.checkResult.latency_ms}ms)`);
      }
      onRefresh();
    } catch (err: any) {
      setLastCheckMessage(`Check failed: ${err.message}`);
    } finally {
      setIsChecking(false);
    }
  };

  const handleToggleQuarantine = async () => {
    try {
      await fetch(`/api/proxies/${proxy.id}/quarantine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: proxy.is_quarantined ? 'restore' : 'quarantine',
          reason: proxy.is_quarantined ? 'Restored by user' : 'Manual quarantine from details view'
        })
      });
      onRefresh();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#0e1628] border border-[#1e2d54] rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 text-slate-400 hover:text-white p-1 rounded-lg bg-[#172342]"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="mb-5 pr-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/40">
              {proxy.protocol}
            </span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
              proxy.current_status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
              proxy.current_status === 'INACTIVE' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
              'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            }`}>
              {proxy.is_quarantined ? 'QUARANTINED' : proxy.current_status}
            </span>
          </div>
          <h2 className="text-base font-bold text-white font-mono tracking-tight break-all">
            {maskEndpoint(proxy.normalized_endpoint)}
          </h2>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-[#131d35] rounded-xl border border-[#1e2d54]">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Last Latency</span>
              <span className="text-base font-bold font-mono text-emerald-400">
                {proxy.last_latency_ms ? `${proxy.last_latency_ms} ms` : 'N/A'}
              </span>
            </div>
            <div className="p-3 bg-[#131d35] rounded-xl border border-[#1e2d54]">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Recoveries</span>
              <span className="text-base font-bold text-cyan-400">
                {proxy.recovery_count} cycles
              </span>
            </div>
            <div className="p-3 bg-[#131d35] rounded-xl border border-[#1e2d54]">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Failures</span>
              <span className="text-base font-bold text-rose-400">
                {proxy.consecutive_failures} consecutive
              </span>
            </div>
            <div className="p-3 bg-[#131d35] rounded-xl border border-[#1e2d54]">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Source</span>
              <span className="text-xs font-semibold text-slate-200 truncate block">
                {proxy.source_name || 'Direct'}
              </span>
            </div>
          </div>

          {/* Diagnostic Failure Box if any */}
          {(proxy.last_failure_reason || proxy.quarantine_reason) && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl">
              <span className="text-xs font-semibold text-rose-400 flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-4 h-4" />
                Latest Diagnostic Failure Reason
              </span>
              <p className="text-xs text-rose-200/90 leading-relaxed font-mono">
                {proxy.quarantine_reason || proxy.last_failure_reason}
              </p>
            </div>
          )}

          {/* Details Table */}
          <div className="bg-[#131d35] rounded-xl border border-[#1e2d54] p-4 text-xs space-y-2">
            <div className="flex justify-between py-1 border-b border-[#1e2d54]">
              <span className="text-slate-400">Host / IP:</span>
              <span className="text-white font-mono font-medium">{proxy.host}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#1e2d54]">
              <span className="text-slate-400">Port:</span>
              <span className="text-white font-mono font-medium">{proxy.port}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#1e2d54]">
              <span className="text-slate-400">Authentication Required:</span>
              <span className="text-white font-medium">{proxy.auth_required ? 'Yes (Credentials Saved)' : 'None'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#1e2d54]">
              <span className="text-slate-400">Next Scheduled Check:</span>
              <span className="text-blue-300 font-mono">
                {new Date(proxy.next_scheduled_check_at).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Created:</span>
              <span className="text-slate-300 font-mono">
                {new Date(proxy.created_at).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Status Transitions Timeline */}
          {transitions.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5 mb-2">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>Status Transitions Timeline</span>
              </h3>
              <div className="space-y-2">
                {transitions.map((t) => (
                  <div key={t.id} className="p-2.5 bg-[#131d35] rounded-lg border border-[#1e2d54] text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-white">
                        {t.from_status} → <span className="text-emerald-400 font-bold">{t.to_status}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(t.transitioned_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">{t.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Check Logs */}
          {history.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5 mb-2">
                <History className="w-3.5 h-3.5 text-blue-400" />
                <span>Recent Diagnostic Probes</span>
              </h3>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {history.map((h) => (
                  <div key={h.id} className="p-2 bg-[#131d35] rounded-lg border border-[#1e2d54] text-[11px] flex items-center justify-between font-mono">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${h.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      <span className="text-white font-semibold">{h.status}</span>
                      {h.latency_ms && <span className="text-slate-400">{h.latency_ms}ms</span>}
                    </div>
                    <span className="text-slate-500">{new Date(h.check_timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Controls Footer */}
        <div className="pt-4 border-t border-[#1e2d54] mt-4 flex items-center justify-between">
          <div className="text-xs text-emerald-400 font-medium">
            {lastCheckMessage && <span>{lastCheckMessage}</span>}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleQuarantine}
              className="px-3 py-1.5 rounded-lg border border-amber-500/40 text-amber-300 hover:bg-amber-500/20 text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              {proxy.is_quarantined ? <RotateCcw className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              <span>{proxy.is_quarantined ? 'Restore from Quarantine' : 'Quarantine'}</span>
            </button>

            <button
              onClick={handleRunCheck}
              disabled={isChecking}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-glow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Probing...' : 'Run Live Diagnostic'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
