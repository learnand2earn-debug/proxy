'use client';

import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Plus, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ExternalLink,
  ShieldCheck,
  Zap,
  Trash2
} from 'lucide-react';
import { ProxySource } from '@/types';

export const SourcesView: React.FC = () => {
  const [sources, setSources] = useState<ProxySource[]>([]);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceType, setNewSourceType] = useState('public_feed');
  const [newSourceUrl, setNewSourceUrl] = useState('');

  const loadSources = () => {
    fetch('/api/sources')
      .then(r => r.json())
      .then(d => {
        if (d.sources) setSources(d.sources);
      })
      .catch(console.error);
  };

  useEffect(() => {
    loadSources();
  }, []);

  const handleSyncSource = async (id: string) => {
    setSyncingId(id);
    try {
      await fetch(`/api/sources/${id}/sync`, { method: 'POST' });
      loadSources();
    } catch (e) {
      console.error(e);
    } finally {
      setSyncingId(null);
    }
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSourceName,
          type: newSourceType,
          config: { url: newSourceUrl }
        })
      });
      setShowAddModal(false);
      setNewSourceName('');
      setNewSourceUrl('');
      loadSources();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-blue-400" />
            <span>Configured Ingest Adapters & Sources</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage authorized proxy ingestion sources. Unavailable providers will fail isolated without halting other pipelines.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-glow-sm transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Ingest Source</span>
        </button>
      </div>

      {/* Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sources.map((src) => {
          const isSyncing = syncingId === src.id;
          return (
            <div key={src.id} className="p-4 rounded-xl bg-[#0d1424] border border-[#1a2540] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/40">
                    {src.type}
                  </span>
                  <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Active
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white mb-1">{src.name}</h3>
                <p className="text-xs text-slate-400 mb-3 break-all">
                  {src.config?.url ? src.config.url : src.config?.note || 'Standard ingest pipeline'}
                </p>
              </div>

              <div className="pt-3 border-t border-[#1a2540] flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono text-[11px]">
                  Rate: {src.rate_limit_per_minute}/min
                </span>
                <button
                  onClick={() => handleSyncSource(src.id)}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#131d35] hover:bg-[#172342] border border-[#1e2d54] text-slate-200 text-xs font-medium disabled:opacity-50 transition-all"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Source Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0e1628] border border-[#1e2d54] rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Add Discovery Source</h3>
            <p className="text-xs text-slate-400 mb-4">Register a new authorized feed or provider pipeline.</p>
            <form onSubmit={handleAddSource} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Source Name</label>
                <input
                  type="text"
                  required
                  value={newSourceName}
                  onChange={e => setNewSourceName(e.target.value)}
                  placeholder="e.g. Verified European Proxies Feed"
                  className="w-full bg-[#131d35] border border-[#1e2d54] rounded-lg p-2.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Source Type</label>
                <select
                  value={newSourceType}
                  onChange={e => setNewSourceType(e.target.value)}
                  className="w-full bg-[#131d35] border border-[#1e2d54] rounded-lg p-2.5 text-white"
                >
                  <option value="public_feed">Authorized Public Feed</option>
                  <option value="provider_api">Authorized Provider API</option>
                  <option value="internal_inventory">Internal Network Inventory</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Target Endpoint / URL</label>
                <input
                  type="url"
                  required
                  value={newSourceUrl}
                  onChange={e => setNewSourceUrl(e.target.value)}
                  placeholder="https://example.com/proxies.txt"
                  className="w-full bg-[#131d35] border border-[#1e2d54] rounded-lg p-2.5 text-white font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[#1e2d54]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#131d35] text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-glow-sm"
                >
                  Create Source
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
