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

import { DashboardStats, ProxyRecord } from '@/types';

export default function DashboardPage() {
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

  // Fetch telemetry & data
  const fetchData = useCallback(() => {
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
  }, [page, currentView]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex">
      {/* Fixed Left Navigation Sidebar */}
      <Sidebar
        currentView={currentView}
        onSelectView={(v) => {
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
          {/* VIEW: OVERVIEW */}
          {currentView === 'overview' && (
            <>
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
          {currentView === 'admin' && stats && (
            <AdminView stats={stats} onRefreshData={fetchData} />
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
    </div>
  );
}
