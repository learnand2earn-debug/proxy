'use client';

import React, { useState, useEffect } from 'react';
import { History, Zap, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { CheckHistoryItem } from '@/types';

export const HistoryView: React.FC = () => {
  const [history, setHistory] = useState<CheckHistoryItem[]>([]);

  useEffect(() => {
    fetch('/api/proxies')
      .then(r => r.json())
      .then(() => {
        // Fetch raw check history from proxy detail or store
        // Let's fetch history via repository or endpoint
      });
  }, []);

  useEffect(() => {
    // We can load history directly from recent proxies
    fetch('/api/proxies?limit=20')
      .then(r => r.json())
      .then(async (d) => {
        if (d.data && d.data.length > 0) {
          const allHist: CheckHistoryItem[] = [];
          for (const p of d.data.slice(0, 10)) {
            try {
              const res = await fetch(`/api/proxies/${p.id}`);
              const resData = await res.json();
              if (resData.check_history) {
                allHist.push(...resData.check_history);
              }
            } catch (e) {}
          }
          allHist.sort((a, b) => new Date(b.check_timestamp).getTime() - new Date(a.check_timestamp).getTime());
          setHistory(allHist);
        }
      })
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <History className="w-5 h-5 text-blue-400" />
          <span>Diagnostic Health Check History</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Detailed diagnostic records including latency, protocol handshake status, and error codes.
        </p>
      </div>

      <div className="bg-[#0d1424] border border-[#1a2540] rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0a0f1d] text-slate-400 uppercase tracking-wider font-semibold border-b border-[#1a2540]">
            <tr>
              <th className="p-3">Timestamp</th>
              <th className="p-3">Outcome</th>
              <th className="p-3">Measured Latency</th>
              <th className="p-3">Handshake</th>
              <th className="p-3">Error Category</th>
              <th className="p-3">Diagnostic Target</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a2540]">
            {history.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  No diagnostic check history recorded yet. Run a check to populate results.
                </td>
              </tr>
            ) : (
              history.map((h, i) => (
                <tr key={i} className="hover:bg-[#131d35]/50 transition-colors">
                  <td className="p-3 font-mono text-slate-300">
                    {new Date(h.check_timestamp).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      h.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300' :
                      h.status === 'INACTIVE' ? 'bg-rose-500/20 text-rose-300' :
                      'bg-amber-500/20 text-amber-300'
                    }`}>
                      {h.status}
                    </span>
                  </td>
                  <td className="p-3 font-mono font-semibold text-white">
                    {h.latency_ms !== undefined ? `${h.latency_ms} ms` : '-'}
                  </td>
                  <td className="p-3 text-slate-300">
                    {h.handshake_success ? 'Success' : 'Failed'}
                  </td>
                  <td className="p-3 font-mono text-slate-400">
                    {h.error_category || 'NONE'}
                  </td>
                  <td className="p-3 font-mono text-[11px] text-blue-300 truncate max-w-xs">
                    {h.diagnostic_target || '/api/health/diagnostic'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
