'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Key, 
  Plus, 
  ShieldCheck, 
  Globe, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  Check, 
  RotateCcw, 
  Trash2, 
  Ban, 
  Unlock, 
  RefreshCw, 
  Search, 
  Sparkles,
  Calendar,
  Lock,
  UserCheck,
  Zap,
  Activity,
  Layers,
  Eye,
  EyeOff
} from 'lucide-react';
import { LicenseRecord, LicensePlanType, LicenseStatus, LicenseStats } from '@/types';

export const LicenseManagerView: React.FC = () => {
  const [licenses, setLicenses] = useState<LicenseRecord[]>([]);
  const [stats, setStats] = useState<LicenseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPlanType, setNewPlanType] = useState<LicensePlanType>('monthly');
  const [newNotes, setNewNotes] = useState('');
  const [createdResult, setCreatedResult] = useState<LicenseRecord | null>(null);

  // UI helpers
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const fetchLicenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (planFilter !== 'ALL') params.set('plan_type', planFilter);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/licenses?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLicenses(data.data || []);
        setStats(data.stats || null);
      }
    } catch (err) {
      console.error('Failed to load licenses:', err);
    } finally {
      setLoading(false);
    }
  }, [planFilter, statusFilter, search]);

  useEffect(() => {
    fetchLicenses();
  }, [fetchLicenses]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTogglePassword = (id: string) => {
    setRevealedPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) return;

    try {
      const res = await fetch('/api/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: newCustomerName.trim(),
          customer_username: newUsername.trim() || undefined,
          password: newPassword.trim() || undefined,
          plan_type: newPlanType,
          notes: newNotes.trim() || undefined
        })
      });

      const data = await res.json();
      if (data.success && data.license) {
        setCreatedResult(data.license);
        fetchLicenses();
        setNewCustomerName('');
        setNewUsername('');
        setNewPassword('');
        setNewNotes('');
      }
    } catch (err) {
      console.error('Error creating license:', err);
    }
  };

  const handleUnbind = async (id: string, customerName: string) => {
    if (!confirm(`Are you sure you want to unbind the active origin from ${customerName}'s license? This will free the license to bind to a new site.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/licenses/${id}/unbind`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setActionMsg(`Origin unbound for ${customerName}`);
        fetchLicenses();
        setTimeout(() => setActionMsg(null), 4000);
      }
    } catch (err) {
      console.error('Failed to unbind:', err);
    }
  };

  const handleToggleRevoke = async (id: string, currentStatus: LicenseStatus, customerName: string) => {
    const willRevoke = currentStatus !== 'REVOKED';
    const actionLabel = willRevoke ? 'revoke' : 'reinstate';
    if (!confirm(`Confirm: ${actionLabel.toUpperCase()} license for ${customerName}?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/licenses/${id}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revoke: willRevoke })
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg(`License ${willRevoke ? 'REVOKED' : 'REINSTATED'} for ${customerName}`);
        fetchLicenses();
        setTimeout(() => setActionMsg(null), 4000);
      }
    } catch (err) {
      console.error('Failed to toggle revoke:', err);
    }
  };

  const handleExtend = async (id: string, days: number, customerName: string) => {
    try {
      const res = await fetch(`/api/licenses/${id}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days })
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg(`Extended ${customerName}'s license by ${days} days`);
        fetchLicenses();
        setTimeout(() => setActionMsg(null), 4000);
      }
    } catch (err) {
      console.error('Failed to extend license:', err);
    }
  };

  const handleDelete = async (id: string, customerName: string) => {
    if (!confirm(`Permanently delete license for ${customerName}? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/licenses/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setActionMsg(`Deleted license for ${customerName}`);
        fetchLicenses();
        setTimeout(() => setActionMsg(null), 4000);
      }
    } catch (err) {
      console.error('Failed to delete license:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-cyan-400" />
            <span>DRM License & Single-Site Concurrency Control</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Issue customer keys, enforce strict 1-site domain binding, monitor real-time heartbeats, and control activations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchLicenses()}
            className="p-2 rounded-xl bg-[#0d1424] hover:bg-[#131d35] border border-[#1a2540] text-slate-400 hover:text-white transition-all"
            title="Refresh License Registry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => { setIsCreateOpen(true); setCreatedResult(null); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-950/40 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Issue New License</span>
          </button>
        </div>
      </div>

      {/* Action Toast */}
      {actionMsg && (
        <div className="p-3.5 bg-[#131d35] border border-cyan-500/50 rounded-xl text-xs text-cyan-200 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0d1424] border border-[#1a2540] flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Issued</div>
            <div className="text-2xl font-bold font-mono text-white mt-1">{stats?.total || 0}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Commercial DRM licenses</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0d1424] border border-[#1a2540] flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active DRM Seats</div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{stats?.active || 0}</div>
            <div className="text-[11px] text-emerald-400/80 mt-0.5">Valid & unexpired</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0d1424] border border-[#1a2540] flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bound Live Sites</div>
            <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">{stats?.bound_sessions || 0}</div>
            <div className="text-[11px] text-cyan-400/80 mt-0.5">1-Site Locked Origins</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Globe className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0d1424] border border-[#1a2540] flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Expired / Revoked</div>
            <div className="text-2xl font-bold font-mono text-rose-400 mt-1">{(stats?.expired || 0) + (stats?.revoked || 0)}</div>
            <div className="text-[11px] text-rose-400/80 mt-0.5">Require renewal / banned</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <Ban className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-[#0d1424] border border-[#1a2540] flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer, username, key, or origin..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#090d19] border border-[#1a2540] rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Plan Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Plan:</span>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#090d19] border border-[#1a2540] rounded-xl text-xs text-slate-200 outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Plans ({stats?.total || 0})</option>
              <option value="monthly">Monthly ({stats?.by_plan?.monthly || 0})</option>
              <option value="annual">Annual ({stats?.by_plan?.annual || 0})</option>
              <option value="lifetime">Lifetime ({stats?.by_plan?.lifetime || 0})</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#090d19] border border-[#1a2540] rounded-xl text-xs text-slate-200 outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="EXPIRED">Expired</option>
              <option value="REVOKED">Revoked</option>
            </select>
          </div>
        </div>
      </div>

      {/* Licenses Table */}
      <div className="rounded-xl bg-[#0d1424] border border-[#1a2540] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#090d19] text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-[#1a2540]">
              <tr>
                <th className="py-3 px-4">Customer / Username</th>
                <th className="py-3 px-4">License Key</th>
                <th className="py-3 px-4">Password</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">DRM Bound Origin</th>
                <th className="py-3 px-4">Validity / Expiry</th>
                <th className="py-3 px-4">Logins</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a2540]/60">
              {licenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Key className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-medium">No licenses found matching your filters</p>
                    <p className="text-[11px] text-slate-500 mt-1">Issue a new license or clear search queries.</p>
                  </td>
                </tr>
              ) : (
                licenses.map((lic) => {
                  const isBound = !!lic.active_origin && !!lic.active_session_token;
                  const isExp = lic.status === 'EXPIRED';
                  const isRev = lic.status === 'REVOKED';

                  return (
                    <tr key={lic.id} className="hover:bg-[#131d35]/40 transition-colors">
                      {/* Customer / Username */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{lic.customer_name}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-cyan-400" />
                          <span>@{lic.customer_username}</span>
                        </div>
                      </td>

                      {/* License Key */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="text-cyan-300 font-semibold bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
                            {lic.license_key}
                          </span>
                          <button
                            onClick={() => handleCopy(lic.license_key, lic.id)}
                            className="p-1 text-slate-400 hover:text-white rounded transition-colors"
                            title="Copy License Key"
                          >
                            {copiedKey === lic.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Password */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <span>
                            {revealedPasswords[lic.id] ? lic.password : '••••••••'}
                          </span>
                          <button
                            onClick={() => handleTogglePassword(lic.id)}
                            className="p-1 text-slate-400 hover:text-slate-200"
                            title="Reveal Password"
                          >
                            {revealedPasswords[lic.id] ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Plan Type */}
                      <td className="py-3.5 px-4">
                        {lic.plan_type === 'lifetime' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <Sparkles className="w-2.5 h-2.5" />
                            LIFETIME
                          </span>
                        )}
                        {lic.plan_type === 'annual' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            <Calendar className="w-2.5 h-2.5" />
                            ANNUAL (365d)
                          </span>
                        )}
                        {lic.plan_type === 'monthly' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            <Clock className="w-2.5 h-2.5" />
                            MONTHLY (30d)
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {lic.status === 'ACTIVE' && (
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            ACTIVE
                          </span>
                        )}
                        {lic.status === 'EXPIRED' && (
                          <span className="inline-flex items-center gap-1 text-amber-400 text-[11px] font-semibold">
                            <AlertTriangle className="w-3 h-3" />
                            EXPIRED
                          </span>
                        )}
                        {lic.status === 'REVOKED' && (
                          <span className="inline-flex items-center gap-1 text-rose-400 text-[11px] font-bold">
                            <Ban className="w-3 h-3" />
                            REVOKED
                          </span>
                        )}
                      </td>

                      {/* DRM Bound Origin */}
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        {isBound ? (
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                            <span className="text-slate-200 truncate max-w-[140px]" title={lic.active_origin}>
                              {lic.active_origin}
                            </span>
                            <button
                              onClick={() => handleUnbind(lic.id, lic.customer_name)}
                              className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[10px] font-semibold flex items-center gap-1 transition-all"
                              title="Unbind active domain lock"
                            >
                              <Unlock className="w-2.5 h-2.5" />
                              <span>Unbind</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                            <span>Unbound (1-Seat Available)</span>
                          </span>
                        )}
                      </td>

                      {/* Validity / Expiry */}
                      <td className="py-3.5 px-4 text-[11px] text-slate-300">
                        {lic.plan_type === 'lifetime' ? (
                          <span className="text-amber-300 font-semibold">Permanent Access</span>
                        ) : (
                          <div>
                            <div className="font-mono text-white">
                              {new Date(lic.expires_at).toLocaleDateString()}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {isExp ? 'Expired' : `${Math.ceil((new Date(lic.expires_at).getTime() - Date.now()) / 86400000)} days remaining`}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Total Logins */}
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {lic.total_logins || 0}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Extend validity */}
                          {lic.plan_type !== 'lifetime' && (
                            <button
                              onClick={() => handleExtend(lic.id, 30, lic.customer_name)}
                              className="p-1.5 rounded-lg bg-[#172342] hover:bg-[#1e2d54] text-cyan-300 hover:text-white border border-cyan-500/20 transition-all"
                              title="Extend subscription by +30 Days"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Revoke / Unrevoke */}
                          <button
                            onClick={() => handleToggleRevoke(lic.id, lic.status, lic.customer_name)}
                            className={`p-1.5 rounded-lg border transition-all ${
                              isRev
                                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30'
                                : 'bg-amber-500/20 border-amber-500/30 text-amber-300 hover:bg-amber-500/30'
                            }`}
                            title={isRev ? 'Un-revoke and activate license' : 'Revoke license access'}
                          >
                            {isRev ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(lic.id, lic.customer_name)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all"
                            title="Delete license permanently"
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
      </div>

      {/* CREATE NEW LICENSE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-[#0a0f1d] border border-cyan-500/30 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[#1a2540] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white text-sm">Issue New DRM License</h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕ Close
              </button>
            </div>

            {createdResult ? (
              <div className="p-6 space-y-4">
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>License Successfully Created & DRM Enforced!</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Share the credentials below with the customer. The license will automatically lock to their origin on first login.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#0d1424] border border-[#1a2540] space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center py-1 border-b border-[#1a2540]">
                    <span className="text-slate-400">License Key:</span>
                    <span className="text-cyan-300 font-bold">{createdResult.license_key}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-[#1a2540]">
                    <span className="text-slate-400">Customer:</span>
                    <span className="text-white">{createdResult.customer_name}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-[#1a2540]">
                    <span className="text-slate-400">Username:</span>
                    <span className="text-white">{createdResult.customer_username}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-[#1a2540]">
                    <span className="text-slate-400">Password:</span>
                    <span className="text-white">{createdResult.password}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400">Plan:</span>
                    <span className="text-amber-400 uppercase font-bold">{createdResult.plan_type}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const summary = `ProxyIntel.AI License Details:\nCustomer: ${createdResult.customer_name}\nLicense Key: ${createdResult.license_key}\nUsername: ${createdResult.customer_username}\nPassword: ${createdResult.password}\nPlan: ${createdResult.plan_type.toUpperCase()}\nExpires: ${new Date(createdResult.expires_at).toLocaleDateString()}`;
                      navigator.clipboard.writeText(summary);
                      alert('License credentials copied to clipboard!');
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Full Credentials</span>
                  </button>
                  <button
                    onClick={() => { setCreatedResult(null); setIsCreateOpen(false); }}
                    className="px-4 py-2.5 rounded-xl bg-[#131d35] hover:bg-[#1a2540] text-slate-200 text-xs font-semibold transition-all"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateLicense} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Customer / Business Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Scraping Operations"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#090d19] border border-[#1a2540] rounded-xl text-white outline-none focus:border-cyan-400"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Username (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Auto-generated if empty"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="w-full px-3 py-2 bg-[#090d19] border border-[#1a2540] rounded-xl text-white outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Password (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Auto-generated if empty"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-[#090d19] border border-[#1a2540] rounded-xl text-white outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-2">
                    License Plan Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewPlanType('monthly')}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        newPlanType === 'monthly'
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                          : 'bg-[#090d19] border-[#1a2540] text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-xs">Monthly</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">30 Days</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewPlanType('annual')}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        newPlanType === 'annual'
                          ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300 font-bold'
                          : 'bg-[#090d19] border-[#1a2540] text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-xs">Annual</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">365 Days</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewPlanType('lifetime')}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        newPlanType === 'lifetime'
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                          : 'bg-[#090d19] border-[#1a2540] text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-xs">Lifetime</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Permanent</div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Internal Notes / Customer Reference
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Dedicated proxy pipeline tier 1 client..."
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-[#090d19] border border-[#1a2540] rounded-xl text-white outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="p-3 bg-cyan-950/30 border border-cyan-500/20 rounded-xl text-[11px] text-cyan-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-cyan-400" />
                  <span>Strict Single-Site Concurrency policy (max 1 active origin) will be enforced automatically.</span>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-950/50 transition-all"
                >
                  Generate License & Credentials
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
