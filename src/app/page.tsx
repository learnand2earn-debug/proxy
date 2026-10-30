'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, PageView } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { StatCards } from '@/components/dashboard/StatCards';
import { Charts } from '@/components/dashboard/Charts';
import { ProxyTable } from '@/components/proxies/ProxyTable';
import { ImportModal } from '@/components/modals/ImportModal';
import { ExportModal } from '@/components/modals/ExportModal';
import { ProxyDetailModal } from '@/components/modals/ProxyDetailModal';
import { AIAssistantDrawer } from '@/components/ai/AIAssistantDrawer';

import { SourcesView } from '@/components/views/SourcesView';
import { ChromeExtensionView } from '@/components/views/ChromeExtensionView';
import { MonitoringSchedulesView } from '@/components/views/MonitoringSchedulesView';
import { NotificationsView } from '@/components/views/NotificationsView';
import { HistoryView } from '@/components/views/HistoryView';
import { AuditLogsView } from '@/components/views/AuditLogsView';
import { SettingsView } from '@/components/views/SettingsView';
import { ProfileView } from '@/components/views/ProfileView';
import { AdminView } from '@/components/views/AdminView';
import { LiveStreamRadarView } from '@/components/views/LiveStreamRadarView';
import { CountryHarvesterView } from '@/components/views/CountryHarvesterView';
import { LicenseManagerView } from '@/components/views/LicenseManagerView';

import { AuthProvider, useAuth } from '@/lib/auth/AuthContext';
import { LoginModal } from '@/components/auth/LoginModal';

import { DashboardStats, ProxyRecord } from '@/types';

function DashboardContent() {
  const { session, isAuthenticated, loading } = useAuth();
  const [currentView, setCurrentView] = useState<PageView>('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [proxies, setProxies] = useState<ProxyRecord[]>([]);
  const [totalProxies, setTotalProxies] = useState(0);
  const [page, setPage] = useState(1);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Modals & Drawers
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [inspectProxy, setInspectProxy] = useState<ProxyRecord | null>(null);

  // Role-based portal navigation:
  // When Admin logs in, land directly on Admin Panel ('admin').
  // When regular licensed client logs in, ensure they stay on client portal ('overview') and cannot access admin/licenses views.
  useEffect(() => {
    if (session) {
      if (session.role === 'admin') {
        setCurrentView('admin');
      } else {
        if (currentView === 'admin' || currentView === 'licenses') {
          setCurrentView('overview');
        }
      }
    }
  }, [session?.user_id, session?.role]);

  // Fetch telemetry & data - ONLY when user is authenticated
  const fetchData = useCallback(() => {
    if (!isAuthenticated) return;

    // 1. Stats
    fetch('/api/stats')
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(console.error);

    // 2. Notifications count
    fetch('/api/notifications')
      .then(r => r.json())
      .then(d => {
        if (d.unreadCount !== undefined) setUnreadNotifications(d.unreadCount);
      })
      .catch(console.error);

    // 3. Proxies for table
    let url = `/api/proxies?page=${page}&limit=50`;
    if (currentView === 'active') url += '&status=ACTIVE';
    if (currentView === 'inactive') url += '&status=INACTIVE';
    if (currentView === 'quarantined') url += '&status=INVALID&is_quarantined=true';
    if (currentView === 'auth_required') url += '&status=AUTH_REQUIRED';

    fetch(url)
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          setProxies(d.data);
          setTotalProxies(d.total);
        }
      })
      .catch(console.error);
  }, [page, currentView, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [fetchData, isAuthenticated]);

  // Keyboard shortcut for AI Copilot (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsAIOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 1. If verifying session, show clean loading gateway screen
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050814] flex flex-col items-center justify-center text-slate-300">
        <div className="relative w-14 h-14 flex items-center justify-center mb-4">
          <div className="absolute inset-0 rounded-2xl bg-cyan-500/20 animate-ping"></div>
          <div className="w-10 h-10 rounded-2xl border-2 border-t-cyan-400 border-r-cyan-400 border-b-transparent border-l-transparent animate-spin"></div>
        </div>
        <p className="text-xs font-mono text-cyan-400 font-semibold tracking-wider">VERIFYING SECURITY GATEWAY...</p>
      </div>
    );
  }

  // 2. If NOT authenticated, STRICTLY render Login Screen (Dashboard is completely inaccessible)
  if (!isAuthenticated || !session) {
    return (
      <LoginModal 
        onLoginSuccess={(role) => {
          if (role === 'admin') {
            setCurrentView('admin');
          } else {
            setCurrentView('overview');
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex">
      {/* Fixed Left Navigation Sidebar */}
      <Sidebar
        currentView={currentView}
        onSelectView={(v) => {
          if ((v === 'admin' || v === 'licenses') && session?.role !== 'admin') {
            setCurrentView('overview');
            return;
          }
          setCurrentView(v);
          setPage(1);
        }}
        stats={stats}
        unreadNotificationsCount={unreadNotifications}
        onOpenAI={() => setIsAIOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Sticky Top Header */}
        <Header
          currentView={currentView}
          onOpenImport={() => setIsImportOpen(true)}
          onOpenExport={() => setIsExportOpen(true)}
          onOpenAI={() => setIsAIOpen(true)}
          onRefreshData={fetchData}
          unreadCount={unreadNotifications}
          onOpenNotifications={() => setCurrentView('notifications')}
        />

        {/* View Content Container */}
        <main className="flex-1 p-6 overflow-y-auto">
          {/* VIEW: COUNTRY PROXY HARVESTER (Targeted Country Finder) */}
          {currentView === 'country_harvester' && (
            <CountryHarvesterView
              onProxyIngested={fetchData}
            />
          )}

          {/* VIEW: LIVE STREAM RADAR (Kept mounted so switching sections does not reset counter or stream) */}
          <div className={currentView === 'live_stream' ? 'block' : 'hidden'}>
            <LiveStreamRadarView
              onProxyIngested={fetchData}
              onSelectProxyForInspect={setInspectProxy}
            />
          </div>

          {/* VIEW: OVERVIEW */}
          {currentView === 'overview' && (
            <>
              {/* Real-time Ticker Banner with Country Harvester CTA */}
              <div className="mb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  onClick={() => setCurrentView('country_harvester')}
                  className="p-3.5 px-5 bg-gradient-to-r from-cyan-950/60 via-slate-900/80 to-blue-950/60 border border-cyan-500/40 rounded-xl shadow-lg cursor-pointer hover:border-cyan-400 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🇵🇰 🇮🇳 🇺🇸</span>
                    <div>
                      <div className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                        🌍 TARGETED COUNTRY PROXY HARVESTER
                      </div>
                      <div className="text-xs text-slate-300 mt-0.5">
                        Select Pakistan, India, USA, etc. to scrape proxies for that specific country.
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 group-hover:text-cyan-300 shrink-0">
                    <span>Open Harvester</span>
                    <span className="text-base group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>

                <div 
                  onClick={() => setCurrentView('live_stream')}
                  className="p-3.5 px-5 bg-gradient-to-r from-blue-900/40 via-cyan-900/30 to-slate-900/60 border border-blue-500/40 rounded-xl shadow-lg cursor-pointer hover:border-blue-400 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <div>
                      <div className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                        LIVE RADAR PIPELINE ACTIVE
                      </div>
                      <div className="text-xs text-slate-300 mt-0.5">
                        Continuous live proxy conveyor with country & protocol filters.
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 group-hover:text-emerald-300 shrink-0">
                    <span>Live Radar</span>
                    <span className="text-base group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>
              </div>

              {stats && (
                <>
                  <StatCards
                    stats={stats}
                    onFilterClick={(status) => {
                      if (status === 'ACTIVE') setCurrentView('active');
                      else if (status === 'INACTIVE') setCurrentView('inactive');
                      else if (status === 'INVALID') setCurrentView('quarantined');
                      else if (status === 'AUTH_REQUIRED') setCurrentView('auth_required');
                    }}
                  />
                  <Charts stats={stats} />
                </>
              )}
              <div className="mt-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Recent Proxy Inventory
                  </h3>
                  <button
                    onClick={() => setCurrentView('all_proxies')}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                  >
                    View Complete Inventory →
                  </button>
                </div>
                <ProxyTable
                  proxies={proxies}
                  total={totalProxies}
                  page={page}
                  limit={50}
                  onPageChange={setPage}
                  onRefresh={fetchData}
                  onSelectProxy={setInspectProxy}
                />
              </div>
            </>
          )}

          {/* VIEW: ALL PROXIES */}
          {currentView === 'all_proxies' && (
            <div className="space-y-4">
              <ProxyTable
                proxies={proxies}
                total={totalProxies}
                page={page}
                limit={50}
                onPageChange={setPage}
                onRefresh={fetchData}
                onSelectProxy={setInspectProxy}
              />
            </div>
          )}

          {/* VIEW: ACTIVE PROXIES */}
          {currentView === 'active' && (
            <div className="space-y-4">
              <ProxyTable
                proxies={proxies}
                total={totalProxies}
                page={page}
                limit={50}
                onPageChange={setPage}
                onRefresh={fetchData}
                onSelectProxy={setInspectProxy}
                initialStatusFilter="ACTIVE"
              />
            </div>
          )}

          {/* VIEW: INACTIVE PROXIES */}
          {currentView === 'inactive' && (
            <div className="space-y-4">
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-center justify-between">
                <span>
                  All inactive proxies are continually monitored by the background daemon with bounded exponential backoff.
                </span>
                <span className="font-mono text-[11px] text-rose-200">
                  {stats?.inactive_count || 0} Endpoints Monitored
                </span>
              </div>
              <ProxyTable
                proxies={proxies}
                total={totalProxies}
                page={page}
                limit={50}
                onPageChange={setPage}
                onRefresh={fetchData}
                onSelectProxy={setInspectProxy}
                initialStatusFilter="INACTIVE"
              />
            </div>
          )}

          {/* VIEW: QUARANTINED / INVALID */}
          {currentView === 'quarantined' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-center justify-between">
                <span>
                  Quarantined records are isolated from active rotation. You can inspect validation errors and restore them at any time.
                </span>
                <span className="font-mono text-[11px] text-amber-200">
                  {stats?.quarantined_count || 0} In Quarantine
                </span>
              </div>
              <ProxyTable
                proxies={proxies}
                total={totalProxies}
                page={page}
                limit={50}
                onPageChange={setPage}
                onRefresh={fetchData}
                onSelectProxy={setInspectProxy}
                isQuarantinedView={true}
              />
            </div>
          )}

          {/* VIEW: AUTH REQUIRED */}
          {currentView === 'auth_required' && (
            <div className="space-y-4">
              <ProxyTable
                proxies={proxies}
                total={totalProxies}
                page={page}
                limit={50}
                onPageChange={setPage}
                onRefresh={fetchData}
                onSelectProxy={setInspectProxy}
                initialStatusFilter="AUTH_REQUIRED"
              />
            </div>
          )}

          {/* OTHER PAGE VIEWS */}
          {currentView === 'sources' && <SourcesView />}
          {currentView === 'extension' && <ChromeExtensionView />}
          {currentView === 'schedules' && <MonitoringSchedulesView />}
          {currentView === 'notifications' && <NotificationsView />}
          {currentView === 'history' && <HistoryView />}
          {currentView === 'audit' && <AuditLogsView />}
          {currentView === 'settings' && <SettingsView />}
          {currentView === 'profile' && <ProfileView />}
          {currentView === 'licenses' && (
            session?.role === 'admin' ? (
              <AdminView stats={stats} onRefreshData={fetchData} defaultTab="licenses" />
            ) : (
              <div className="p-8 text-center bg-rose-950/20 border border-rose-500/30 rounded-2xl max-w-lg mx-auto mt-10">
                <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-3 text-rose-400 font-bold">
                  🛡️
                </div>
                <h3 className="text-base font-bold text-white">Administrator Access Required</h3>
                <p className="text-xs text-slate-400 mt-1">This section is restricted to Master System Administrators only.</p>
              </div>
            )
          )}
          {currentView === 'admin' && (
            session?.role === 'admin' ? (
              <AdminView stats={stats} onRefreshData={fetchData} defaultTab="licenses" />
            ) : (
              <div className="p-8 text-center bg-rose-950/20 border border-rose-500/30 rounded-2xl max-w-lg mx-auto mt-10">
                <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-3 text-rose-400 font-bold">
                  🛡️
                </div>
                <h3 className="text-base font-bold text-white">Administrator Access Required</h3>
                <p className="text-xs text-slate-400 mt-1">This section is restricted to Master System Administrators only.</p>
              </div>
            )
          )}
        </main>
      </div>

      {/* MODALS & DRAWERS */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={fetchData}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />

      <ProxyDetailModal
        proxy={inspectProxy}
        isOpen={!!inspectProxy}
        onClose={() => setInspectProxy(null)}
        onRefresh={fetchData}
      />

      <AIAssistantDrawer
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
        onRefreshData={fetchData}
      />

      {/* DRM AUTHENTICATION GATE MODAL */}
      <LoginModal 
        onLoginSuccess={(role) => {
          if (role === 'admin') {
            setCurrentView('admin');
          } else {
            setCurrentView('overview');
          }
        }}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}
