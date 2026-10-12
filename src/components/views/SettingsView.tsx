'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Shield, Bell, Save, CheckCircle2, Lock, AlertTriangle } from 'lucide-react';
import { ApplicationSettings } from '@/types';

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<ApplicationSettings | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        if (d.settings) setSettings(d.settings);
      })
      .catch(console.error);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setLoading(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!settings) return <div className="p-8 text-xs text-slate-400">Loading platform settings...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-400" />
          <span>Platform & Security Configuration</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure security sandboxes, target diagnostic endpoints, quarantine policies, and webhook integrations.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5 text-xs">
        {/* Security & SSRF */}
        <div className="p-5 rounded-xl bg-[#0d1424] border border-[#1a2540] space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-[#1a2540] pb-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>SSRF Sandbox & Target Protection</span>
          </div>

          <div className="flex items-center justify-between py-1">
            <div>
              <span className="font-semibold text-white block">Restrict Private Network Probing</span>
              <span className="text-slate-400 text-[11px]">
                Enforce strict RFC 1918 (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) and cloud metadata IP blocks.
              </span>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold text-[10px] border border-emerald-500/30">
              STRICT ENFORCEMENT
            </span>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Max Connection Timeout (ms)</label>
            <input
              type="number"
              min={1000}
              max={30000}
              value={settings.max_check_timeout_ms}
              onChange={e => setSettings({ ...settings, max_check_timeout_ms: parseInt(e.target.value, 10) })}
              className="w-full bg-[#131d35] border border-[#1e2d54] rounded-lg p-2.5 text-white font-mono"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Sockets timing out beyond this window will be categorized as INACTIVE.
            </span>
          </div>
        </div>

        {/* Quarantine Rules */}
        <div className="p-5 rounded-xl bg-[#0d1424] border border-[#1a2540] space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-[#1a2540] pb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Automated Quarantine Policy</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-white block">Enable Automatic Quarantine</span>
              <span className="text-slate-400 text-[11px]">
                Automatically isolate proxies that demonstrably fail consecutive validation checks.
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.auto_quarantine_enabled}
              onChange={e => setSettings({ ...settings, auto_quarantine_enabled: e.target.checked })}
              className="rounded bg-[#131d35] border-[#1e2d54] text-blue-500 focus:ring-0 cursor-pointer w-4 h-4"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Consecutive Failure Threshold for Quarantine
            </label>
            <input
              type="number"
              min={2}
              max={20}
              value={settings.quarantine_threshold_failures}
              onChange={e => setSettings({ ...settings, quarantine_threshold_failures: parseInt(e.target.value, 10) })}
              className="w-full bg-[#131d35] border border-[#1e2d54] rounded-lg p-2.5 text-white font-mono"
            />
          </div>
        </div>

        {/* Notifications & Discord */}
        <div className="p-5 rounded-xl bg-[#0d1424] border border-[#1a2540] space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-[#1a2540] pb-2">
            <Bell className="w-4 h-4 text-cyan-400" />
            <span>Alert Webhooks & Notification Providers</span>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Discord Webhook URL</label>
            <input
              type="url"
              value={settings.discord_webhook_url}
              onChange={e => setSettings({ ...settings, discord_webhook_url: e.target.value })}
              placeholder="https://discord.com/api/webhooks/..."
              className="w-full bg-[#131d35] border border-[#1e2d54] rounded-lg p-2.5 text-white font-mono"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Live alerts will be dispatched with embedded status cards whenever a proxy recovers.
            </span>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Alert Email Address</label>
            <input
              type="email"
              value={settings.alert_email_address}
              onChange={e => setSettings({ ...settings, alert_email_address: e.target.value })}
              className="w-full bg-[#131d35] border border-[#1e2d54] rounded-lg p-2.5 text-white"
            />
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between pt-2">
          {isSaved ? (
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Settings saved successfully
            </span>
          ) : <span></span>}

          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-glow-sm transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
