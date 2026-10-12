'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Activity, FileText } from 'lucide-react';
import { AuditLogItem } from '@/types';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);

  useEffect(() => {
    fetch('/api/audit-logs')
      .then(r => r.json())
      .then(d => {
        if (d.logs) setLogs(d.logs);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span>Security & System Audit Trails</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Immutable event logs recording quarantine actions, configuration modifications, and destructive operations.
        </p>
      </div>

      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.id} className="p-3.5 rounded-xl bg-[#0d1424] border border-[#1a2540] text-xs flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-bold text-white">{log.action}</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    {log.entity_type}
                  </span>
                </div>
                <div className="text-slate-300 font-mono text-[11px]">
                  {JSON.stringify(log.details)}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[11px] text-slate-400 font-mono block">
                {new Date(log.created_at).toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                IP: {log.ip_address || '127.0.0.1'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
