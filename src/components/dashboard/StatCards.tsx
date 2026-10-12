'use client';

import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  KeyRound, 
  Activity, 
  RotateCcw, 
  Zap, 
  Radio, 
  Server,
  Layers
} from 'lucide-react';
import { DashboardStats } from '@/types';

interface StatCardsProps {
  stats: DashboardStats;
  onFilterClick?: (status: string) => void;
}

export const StatCards: React.FC<StatCardsProps> = ({ stats, onFilterClick }) => {
  const cards = [
    {
      label: 'Active Proxies',
      value: stats.active_count,
      sub: `${stats.uptime_percentage}% inventory uptime`,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40',
      glow: 'shadow-glow-emerald',
      filter: 'ACTIVE'
    },
    {
      label: 'Inactive Proxies',
      value: stats.inactive_count,
      sub: 'Monitored with exponential backoff',
      icon: Clock,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10 border-rose-500/20 hover:border-rose-500/40',
      glow: 'shadow-glow-rose',
      filter: 'INACTIVE'
    },
    {
      label: 'Recovered Recently',
      value: stats.recovered_recently_count,
      sub: 'Automatic transition to active',
      icon: RotateCcw,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10 border-cyan-500/20 hover:border-cyan-500/40',
      glow: 'shadow-glow-sm',
      filter: 'ACTIVE'
    },
    {
      label: 'Quarantined / Invalid',
      value: stats.quarantined_count,
      sub: 'Safe recoverable quarantine',
      icon: AlertTriangle,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40',
      glow: '',
      filter: 'INVALID'
    },
    {
      label: 'Average Latency',
      value: `${stats.average_latency_ms} ms`,
      sub: 'Full TCP & handshake response',
      icon: Zap,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40',
      glow: 'shadow-glow-sm'
    },
    {
      label: 'Checks Today',
      value: stats.checks_completed_today,
      sub: 'Continuous background verification',
      icon: Activity,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10 border-indigo-500/20 hover:border-indigo-500/40',
      glow: ''
    },
    {
      label: 'Total Discovered',
      value: stats.total_discovered,
      sub: `${stats.configured_sources_count} active ingest sources`,
      icon: Layers,
      color: 'text-slate-200',
      bgColor: 'bg-slate-800/40 border-slate-700/50 hover:border-slate-600',
      glow: ''
    },
    {
      label: 'Auth Required',
      value: stats.auth_required_count,
      sub: 'Credentials needed or rejected',
      icon: KeyRound,
      color: 'text-violet-400',
      bgColor: 'bg-violet-500/10 border-violet-500/20 hover:border-violet-500/40',
      glow: '',
      filter: 'AUTH_REQUIRED'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            onClick={() => card.filter && onFilterClick && onFilterClick(card.filter)}
            className={`p-4 rounded-xl border backdrop-blur-md transition-all cursor-pointer ${card.bgColor} ${card.glow || ''}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-300 tracking-wide uppercase">
                {card.label}
              </span>
              <Icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight mb-1">
              {card.value}
            </div>
            <div className="text-[11px] text-slate-300 font-medium">
              {card.sub}
            </div>
          </div>
        );
      })}
    </div>
  );
};
