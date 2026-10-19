'use client';

import React from 'react';
import { 
  LayoutDashboard, 
  Layers, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  KeyRound, 
  Radio, 
  Chrome, 
  CalendarClock, 
  Bell, 
  History, 
  ShieldCheck, 
  Settings, 
  UserCheck, 
  SlidersHorizontal,
  Bot,
  Zap,
  Globe,
  Key
} from 'lucide-react';
import { DashboardStats } from '@/types';

export type PageView = 
  | 'overview'
  | 'country_harvester'
  | 'live_stream'
  | 'all_proxies'
  | 'active'
  | 'inactive'
  | 'quarantined'
  | 'auth_required'
  | 'sources'
  | 'extension'
  | 'schedules'
  | 'notifications'
  | 'history'
  | 'audit'
  | 'settings'
  | 'profile'
  | 'licenses'
  | 'admin';

interface SidebarProps {
  currentView: PageView;
  onSelectView: (view: PageView) => void;
  stats?: DashboardStats | null;
  unreadNotificationsCount?: number;
  onOpenAI: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  stats,
  unreadNotificationsCount = 0,
  onOpenAI
}) => {
  const navItems: Array<{
    id: PageView;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
    badgeColor?: string;
  }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'country_harvester', label: '🌍 Country Harvester', icon: Globe, badge: 'GEO', badgeColor: 'bg-cyan-500 text-slate-950 font-bold' },
    { id: 'live_stream', label: '⚡ Live Radar Stream', icon: Zap, badge: 'LIVE', badgeColor: 'bg-emerald-500 text-slate-950 font-extrabold animate-pulse' },
    { id: 'all_proxies', label: 'All Proxies', icon: Layers, badge: stats?.total_discovered },
    { id: 'active', label: 'Active Proxies', icon: CheckCircle2, badge: stats?.active_count, badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
    { id: 'inactive', label: 'Inactive Proxies', icon: Clock, badge: stats?.inactive_count, badgeColor: 'bg-rose-500/20 text-rose-400 border border-rose-500/30' },
    { id: 'quarantined', label: 'Quarantined / Invalid', icon: AlertTriangle, badge: stats?.quarantined_count, badgeColor: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' },
    { id: 'auth_required', label: 'Auth Required', icon: KeyRound, badge: stats?.auth_required_count },
    { id: 'sources', label: 'Discovery Sources', icon: Radio, badge: stats?.configured_sources_count },
    { id: 'extension', label: 'Chrome Extension', icon: Chrome },
    { id: 'schedules', label: 'Monitoring Schedules', icon: CalendarClock },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined, badgeColor: 'bg-blue-500 text-white font-bold' },
    { id: 'history', label: 'Test History', icon: History },
    { id: 'audit', label: 'Audit Logs', icon: ShieldCheck },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'profile', label: 'Profile & Security', icon: UserCheck },
    { id: 'licenses', label: '🔑 License DRM Control', icon: Key, badge: 'DRM', badgeColor: 'bg-cyan-500 text-slate-950 font-bold' },
    { id: 'admin', label: 'Admin Panel', icon: SlidersHorizontal },
  ];

  return (
    <aside className="w-64 bg-[#0a0f1d] border-r border-[#1a2540] flex flex-col h-screen fixed left-0 top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-[#1a2540] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-glow-sm">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-wide text-white">ProxyIntel.AI</div>
            <div className="text-[10px] text-slate-400 font-medium">Enterprise Monitoring</div>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
          Main Dashboard
        </div>
        {navItems.slice(0, 8).map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#131d35]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${item.badgeColor || 'bg-[#172342] text-slate-300'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="px-3 pt-4 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
          Discovery & Automation
        </div>
        {navItems.slice(8, 12).map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#131d35]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${item.badgeColor || 'bg-[#172342] text-slate-300'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="px-3 pt-4 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
          Operations & System
        </div>
        {navItems.slice(12).map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#131d35]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${item.badgeColor || 'bg-[#172342] text-slate-300'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* AI Assistant Button in Sidebar */}
      <div className="p-3 border-t border-[#1a2540]">
        <button
          onClick={onOpenAI}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-500/40 text-blue-300 hover:text-white hover:border-blue-400 transition-all shadow-glow-sm group"
        >
          <div className="flex items-center gap-2.5">
            <Bot className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold">AI Assistant</span>
          </div>
          <span className="text-[10px] bg-blue-600/60 px-1.5 py-0.5 rounded text-blue-100 font-mono">
            ⌘K
          </span>
        </button>
      </div>
    </aside>
  );
};
