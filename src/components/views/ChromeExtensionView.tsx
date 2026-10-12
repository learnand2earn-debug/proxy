'use client';

import React, { useState, useEffect } from 'react';
import { 
  Chrome, 
  Key, 
  Copy, 
  Check, 
  CheckCircle2, 
  ShieldCheck, 
  Download, 
  ExternalLink,
  Laptop,
  AlertCircle
} from 'lucide-react';
import { BrowserConnection } from '@/types';

export const ChromeExtensionView: React.FC = () => {
  const [connections, setConnections] = useState<BrowserConnection[]>([]);
  const [pairingSecret, setPairingSecret] = useState('dev-chrome-extension-pairing-token-321');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/chrome/sync')
      .then(r => r.json())
      .then(d => {
        if (d.connections) setConnections(d.connections);
        if (d.pairingSecret) setPairingSecret(d.pairingSecret);
      })
      .catch(console.error);
  }, []);

  const handleCopySecret = () => {
    navigator.clipboard.writeText(pairingSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950/40 via-[#0e1628] to-[#0a0f1d] border border-blue-500/30">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-glow-sm shrink-0">
            <Chrome className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white mb-1">
              AI Proxy Companion — Chrome Extension
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              The companion extension reads your currently active Chrome proxy settings (`chrome.proxy.settings.get`) with explicit user consent and synchronizes the proxy record into your platform inventory.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <ShieldCheck className="w-4 h-4" />
                Zero Browsing History Collected
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300">
                Manifest V3 Compliant
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300">
                Local Folder: <code className="text-blue-300 bg-blue-900/30 px-1 py-0.5 rounded">extension/</code>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pairing Token Card */}
      <div className="p-5 rounded-xl bg-[#0d1424] border border-[#1a2540]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-blue-400" />
            <span>Companion Pairing Secret Token</span>
          </span>
          <span className="text-[11px] text-slate-400">Authenticates extension sync requests</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-[#131d35] border border-[#1e2d54] rounded-lg p-2.5 font-mono text-xs text-blue-300 select-all truncate">
            {pairingSecret}
          </div>
          <button
            onClick={handleCopySecret}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-glow-sm transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Token'}</span>
          </button>
        </div>
      </div>

      {/* Step by Step Setup Instructions */}
      <div className="p-5 rounded-xl bg-[#0d1424] border border-[#1a2540] space-y-4 text-xs">
        <h3 className="text-sm font-bold text-white">How to Install in Google Chrome</h3>

        <div className="space-y-3 text-slate-300">
          <div className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-[11px] shrink-0">
              1
            </span>
            <p>
              Open Google Chrome and navigate to <code className="text-blue-300 bg-[#131d35] px-1.5 py-0.5 rounded font-mono">chrome://extensions/</code> in your address bar.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-[11px] shrink-0">
              2
            </span>
            <p>
              Enable <strong className="text-white">Developer mode</strong> using the toggle switch in the top right corner.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-[11px] shrink-0">
              3
            </span>
            <p>
              Click <strong className="text-white">"Load unpacked"</strong> and select the <code className="text-blue-300 bg-[#131d35] px-1.5 py-0.5 rounded font-mono">extension</code> folder located inside this project directory.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-[11px] shrink-0">
              4
            </span>
            <p>
              Open the extension popup from your toolbar, verify your Platform API URL (<code className="text-blue-300 font-mono">http://localhost:3000</code>), paste the Pairing Secret Token, and click <strong className="text-white">"Sync Proxy to Platform"</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Connected Devices */}
      <div className="p-5 rounded-xl bg-[#0d1424] border border-[#1a2540]">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Laptop className="w-4 h-4 text-emerald-400" />
          <span>Connected Browser Companion Sessions</span>
        </h3>

        {connections.length === 0 ? (
          <p className="text-xs text-slate-400">No browser extensions currently paired.</p>
        ) : (
          <div className="space-y-2">
            {connections.map((c) => (
              <div key={c.id} className="p-3 bg-[#131d35] border border-[#1e2d54] rounded-lg flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  <div>
                    <span className="font-semibold text-white block">{c.device_name}</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Proxy Mode: {c.detected_proxy_type || 'fixed_servers'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block">
                    Last sync: {c.last_synced_at ? new Date(c.last_synced_at).toLocaleTimeString() : 'Recent'}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold uppercase">Authorized</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
