'use client';

import React, { useState } from 'react';
import { 
  Play, 
  Plus, 
  Download, 
  RefreshCw, 
  Bell, 
  Bot, 
  Activity, 
  CheckCircle2, 
  AlertCircle
} from 'lucide-react';
import { PageView } from './Sidebar';

interface HeaderProps {
  currentView: PageView;
  onOpenImport: () => void;
  onOpenExport: () => void;
  onOpenAI: () => void;
  onRefreshData: () => void;
  unreadCount?: number;
  onOpenNotifications: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onOpenImport,
  onOpenExport,
  onOpenAI,
  onRefreshData,
  unreadCount = 0,
  onOpenNotifications
}) => {
  const [isRunningCycle, setIsRunningCycle] = useState(false);
  const [cycleMsg, setCycleMsg] = useState<string | null>(null);

  const viewTitles: Record<PageView, { title: string; subtitle: string }> = {
    overview: { title: 'Executive Overview', subtitle: 'Live telemetry, latency performance, and inventory health' },
    live_stream: { title: '⚡ Autonomous Real-Time Ingestion Radar', subtitle: 'Continuous live stream pipeline with nanosecond verification and zero fake data' },
    all_proxies: { title: 'Proxy Inventory', subtitle: 'Complete registry of all discovered and configured endpoints' },
    active: { title: 'Active Endpoints', subtitle: 'Verified high-uptime proxies passing diagnostic probes' },
    inactive: { title: 'Inactive Monitoring', subtitle: 'Endpoints currently offline, retrying with bounded backoff' },
    quarantined: { title: 'Quarantined & Invalid', subtitle: 'Malformed or persistently failing records held in quarantine' },
    auth_required: { title: 'Authentication Required', subtitle: 'Endpoints requiring HTTP 407 or SOCKS5 credentials' },
    sources: { title: 'Discovery Sources', subtitle: 'Configured manual, feed, API, and extension ingest adapters' },
    extension: { title: 'Chrome Extension Sync', subtitle: 'Browser companion integration and real-time settings detection' },
    schedules: { title: 'Monitoring Schedules', subtitle: 'Interval timers, backoff curves, jitter factors, and concurrency' },
    notifications: { title: 'Notification Alerts', subtitle: 'In-app, Discord webhook, and email recovery alert logs' },
    history: { title: 'Diagnostic Test History', subtitle: 'Immutable log of every individual handshake and latency probe' },
    audit: { title: 'Audit Trails', subtitle: 'Security actions, quarantine events, deletions, and operator changes' },
    settings: { title: 'Platform Settings', subtitle: 'SSRF sandbox restrictions, target endpoints, and thresholds' },
    profile: { title: 'Profile & Security', subtitle: 'Operator credentials, pairing tokens, and consent preferences' },
    admin: { title: 'System Administration', subtitle: 'Worker process status, memory footprint, and maintenance queues' },
  };

  const currentInfo = viewTitles[currentView] || { title: 'Dashboard', subtitle: '' };

  const handleRunMonitoringNow = async () => {
    setIsRunningCycle(true);
    setCycleMsg(null);
    try {
      const res = await fetch('/api/worker/run-now', { method: 'POST' });
      const data = await res.json();
      setCycleMsg(data.message || 'Cycle finished');
      onRefreshData();
      setTimeout(() => setCycleMsg(null), 5000);
    } catch (err: any) {
      setCycleMsg('Worker cycle trigger failed');
      setTimeout(() => setCycleMsg(null), 5000);
    } finally {
      setIsRunningCycle(false);
    }
  };

  return (
    <header className="h-16 bg-[#0a0f1d]/90 backdrop-blur-md border-b border-[#1a2540] flex items-center justify-between px-6 sticky top-0 z-20">
      {/* Title & Subtitle */}
      <div>
        <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          {currentInfo.title}
        </h1>
        <p className="text-[11px] text-slate-300 font-normal">
          {currentInfo.subtitle}
        </p>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2.5">
        {/* Worker Status Badge */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#131d35] border border-[#1e2d54] text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-slate-300 font-medium">Monitoring Worker:</span>
          <span className="text-emerald-400 font-semibold">Active (Every 10s)</span>
        </div>

        {/* Trigger Cycle Now Button */}
        <button
          onClick={handleRunMonitoringNow}
          disabled={isRunningCycle}
          title="Trigger an immediate diagnostic health check cycle across eligible proxies"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#172342] hover:bg-[#1e2d54] border border-blue-500/30 text-blue-300 hover:text-white text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
        >
          <Play className={`w-3.5 h-3.5 ${isRunningCycle ? 'animate-spin' : ''}`} />
          <span>{isRunningCycle ? 'Running...' : 'Run Cycle Now'}</span>
        </button>

        {/* Refresh Data */}
        <button
          onClick={onRefreshData}
          title="Refresh table & stats"
          className="p-2 rounded-lg bg-[#131d35] hover:bg-[#172342] text-slate-400 hover:text-slate-200 border border-[#1e2d54] transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {/* Export Data */}
        <button
          onClick={onOpenExport}
          title="Export CSV, JSON, or TXT lists"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#131d35] hover:bg-[#172342] border border-[#1e2d54] text-slate-300 hover:text-white text-xs font-semibold transition-all"
        >
          <Download className="w-3.5 h-3.5 text-slate-400" />
          <span>Export</span>
        </button>

        {/* Ingest / Add Proxies */}
        <button
          onClick={onOpenImport}
          title="Import proxies via manual entry, bulk paste, file, or feeds"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-glow-sm transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Import Proxies</span>
        </button>

        {/* Notifications */}
        <button
          onClick={onOpenNotifications}
          title="View notifications"
          className="p-2 rounded-lg bg-[#131d35] hover:bg-[#172342] text-slate-400 hover:text-slate-200 border border-[#1e2d54] relative transition-all"
        >
          <Bell className="w-3.5 h-3.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500 text-[9px] font-bold text-white flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        {/* AI Assistant Quick Trigger */}
        <button
          onClick={onOpenAI}
          title="Ask AI Proxy Assistant"
          className="p-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-glow-sm hover:opacity-95 transition-all"
        >
          <Bot className="w-4 h-4" />
        </button>
      </div>

      {/* Cycle Banner Toast */}
      {cycleMsg && (
        <div className="absolute right-6 top-18 bg-[#172342] border border-blue-500/50 text-blue-200 px-4 py-2 rounded-lg text-xs shadow-lg flex items-center gap-2 z-50 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{cycleMsg}</span>
        </div>
      )}
    </header>
  );
};
