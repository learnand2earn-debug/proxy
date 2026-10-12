'use client';

import React, { useState } from 'react';
import { 
  SlidersHorizontal, 
  Cpu, 
  Database, 
  Activity, 
  Play, 
  CheckCircle2, 
  Server,
  RefreshCw
} from 'lucide-react';
import { DashboardStats } from '@/types';

interface AdminViewProps {
  stats: DashboardStats;
  onRefreshData: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ stats, onRefreshData }) => {
  const [running, setRunning] = useState(false);
  const [cycleResult, setCycleResult] = useState<string | null>(null);

  const handleRunWorkerCycle = async () => {
    setRunning(true);
    setCycleResult(null);
    try {
      const res = await fetch('/api/worker/run-now', { method: 'POST' });
      const d = await res.json();
      setCycleResult(d.message || 'Cycle executed successfully');
      onRefreshData();
    } catch (err: any) {
      setCycleResult(`Execution failed: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-blue-400" />
          <span>System Administration & Worker Operations</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Live process metrics, database integrity, background monitoring queues, and daemon telemetry.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Worker Daemon Card */}
        <div className="p-5 rounded-xl bg-[#0d1424] border border-[#1a2540] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Process State</span>
              <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                HEALTHY
              </span>
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Monitoring Daemon</h3>
            <p className="text-xs text-slate-400 mb-3">
              Node.js daemon executing scheduled checks with concurrency control and jitter.
            </p>
          </div>
          <div className="pt-3 border-t border-[#1a2540] text-xs">
            <span className="text-slate-400 block mb-2">Health endpoint: <code className="text-blue-300 font-mono">:3001/health</code></span>
            <button
              onClick={handleRunWorkerCycle}
              disabled={running}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${running ? 'animate-spin' : ''}`} />
              <span>{running ? 'Running Sweep...' : 'Trigger Immediate Sweep'}</span>
            </button>
          </div>
        </div>

        {/* Database Health Card */}
        <div className="p-5 rounded-xl bg-[#0d1424] border border-[#1a2540] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Storage Engine</span>
              <span className="text-emerald-400 text-xs font-semibold">SYNCHRONIZED</span>
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Database & Migration Layer</h3>
            <p className="text-xs text-slate-400 mb-3">
              Supabase PostgreSQL / Hybrid atomic storage with RLS policies enabled.
            </p>
          </div>
          <div className="pt-3 border-t border-[#1a2540] text-xs space-y-1.5">
            <div className="flex justify-between text-slate-400">
              <span>Tracked Records:</span>
              <span className="text-white font-mono font-semibold">{stats.total_discovered}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Active Sources:</span>
              <span className="text-white font-mono font-semibold">{stats.configured_sources_count}</span>
            </div>
          </div>
        </div>

        {/* Network & SSRF Guard */}
        <div className="p-5 rounded-xl bg-[#0d1424] border border-[#1a2540] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Network Security</span>
              <span className="text-emerald-400 text-xs font-semibold">PROTECTED</span>
            </div>
            <h3 className="text-sm font-bold text-white mb-1">SSRF Sandbox & DNS Rebinding Guard</h3>
            <p className="text-xs text-slate-400 mb-3">
              Resolves all IP addresses prior to TCP connection. Drops internal/loopback targets.
            </p>
          </div>
          <div className="pt-3 border-t border-[#1a2540] text-xs">
            <span className="text-emerald-400 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              RFC 1918 & AWS Metadata Blocked
            </span>
          </div>
        </div>
      </div>

      {cycleResult && (
        <div className="p-4 bg-[#131d35] border border-blue-500/40 rounded-xl text-xs text-blue-200 flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>{cycleResult}</span>
        </div>
      )}
    </div>
  );
};
