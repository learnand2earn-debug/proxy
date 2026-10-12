'use client';

import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  Radio, 
  CheckCircle2, 
  AlertCircle, 
  Loader2 
} from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'bulk' | 'single' | 'file' | 'feed'>('bulk');
  const [singleEndpoint, setSingleEndpoint] = useState('');
  const [singleProtocol, setSingleProtocol] = useState('socks5');
  const [bulkText, setBulkText] = useState('');
  const [feedUrl, setFeedUrl] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [immediateCheck, setImmediateCheck] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ isSuccess: boolean; msg: string } | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setFileContent(event.target?.result as string || '');
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFeedback(null);

    let payload = '';
    let type = 'bulk_paste';

    if (activeTab === 'single') {
      type = 'manual';
      payload = singleEndpoint.trim();
    } else if (activeTab === 'bulk') {
      type = 'bulk_paste';
      payload = bulkText.trim();
    } else if (activeTab === 'file') {
      type = 'file_upload';
      payload = fileContent.trim();
    } else if (activeTab === 'feed') {
      type = 'public_feed';
      payload = feedUrl.trim();
    }

    try {
      const res = await fetch('/api/proxies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          payload,
          immediate_check: immediateCheck
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to import proxies');
      }

      setFeedback({
        isSuccess: true,
        msg: `Import complete! Ingested ${data.insertedCount} new, ${data.duplicateCount} duplicates, ${data.invalidCount} malformed/quarantined.`
      });

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setFeedback({
        isSuccess: false,
        msg: err.message || 'Import failed'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#0e1628] border border-[#1e2d54] rounded-2xl w-full max-w-xl p-6 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 text-slate-400 hover:text-white p-1 rounded-lg bg-[#172342]"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Title */}
        <div className="mb-5">
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Upload className="w-4 h-4 text-blue-400" />
            <span>Discover & Ingest Proxies</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Import proxies from manual strings, text lists, CSV/JSON files, or authorized feeds.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#1e2d54] mb-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('bulk')}
            className={`pb-2.5 px-3 border-b-2 transition-all ${
              activeTab === 'bulk'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Bulk Paste
          </button>
          <button
            onClick={() => setActiveTab('single')}
            className={`pb-2.5 px-3 border-b-2 transition-all ${
              activeTab === 'single'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Single Entry
          </button>
          <button
            onClick={() => setActiveTab('file')}
            className={`pb-2.5 px-3 border-b-2 transition-all ${
              activeTab === 'file'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            CSV / TXT / JSON
          </button>
          <button
            onClick={() => setActiveTab('feed')}
            className={`pb-2.5 px-3 border-b-2 transition-all ${
              activeTab === 'feed'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Public Feed URL
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Bulk Paste */}
          {activeTab === 'bulk' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Paste Endpoints (one per line)
              </label>
              <textarea
                rows={6}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="198.51.100.25:1080&#10;socks5://user:pass@198.51.100.26:1080&#10;http://198.51.100.27:8080"
                className="w-full bg-[#131d35] border border-[#1e2d54] rounded-lg p-3 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                required
              />
              <span className="text-[11px] text-slate-300 mt-1 block">
                Supports: <code className="text-blue-300">host:port</code>, <code className="text-blue-300">protocol://host:port</code>, <code className="text-blue-300">host:port:user:pass</code>.
              </span>
            </div>
          )}

          {/* Single Entry */}
          {activeTab === 'single' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Default Protocol
                </label>
                <select
                  value={singleProtocol}
                  onChange={(e) => setSingleProtocol(e.target.value)}
                  className="w-full bg-[#131d35] border border-[#1e2d54] rounded-lg p-2 text-xs text-white"
                >
                  <option value="socks5">SOCKS5</option>
                  <option value="https">HTTPS</option>
                  <option value="http">HTTP</option>
                  <option value="socks4">SOCKS4</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Endpoint String
                </label>
                <input
                  type="text"
                  value={singleEndpoint}
                  onChange={(e) => setSingleEndpoint(e.target.value)}
                  placeholder="e.g. socks5://198.51.100.12:1080 or 198.51.100.12:1080"
                  className="w-full bg-[#131d35] border border-[#1e2d54] rounded-lg p-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>
          )}

          {/* File Upload */}
          {activeTab === 'file' && (
            <div className="border-2 border-dashed border-[#1e2d54] rounded-xl p-6 text-center hover:border-blue-500/50 transition-colors">
              <FileText className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <div className="text-xs font-semibold text-white mb-1">
                {fileName ? fileName : 'Select or drop proxy dataset'}
              </div>
              <p className="text-[11px] text-slate-300 mb-3">
                Accepted extensions: .txt, .csv, .json (max 5MB)
              </p>
              <label className="inline-block px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg cursor-pointer transition-all">
                Choose File
                <input
                  type="file"
                  accept=".txt,.csv,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Feed URL */}
          {activeTab === 'feed' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Authorized Public Feed URL
              </label>
              <input
                type="url"
                value={feedUrl}
                onChange={(e) => setFeedUrl(e.target.value)}
                placeholder="https://raw.githubusercontent.com/user/proxy-repo/main/list.txt"
                className="w-full bg-[#131d35] border border-[#1e2d54] rounded-lg p-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                required
              />
              <span className="text-[11px] text-slate-300 mt-1 block">
                Feed will be fetched using SSRF-sanitized HTTP clients adhering to domain restrictions.
              </span>
            </div>
          )}

          {/* Immediate Check Checkbox */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="immediateCheck"
              checked={immediateCheck}
              onChange={(e) => setImmediateCheck(e.target.checked)}
              className="rounded bg-[#131d35] border-[#1e2d54] text-blue-500 focus:ring-0 cursor-pointer"
            />
            <label htmlFor="immediateCheck" className="text-xs text-slate-300 cursor-pointer">
              Run real-time diagnostic connectivity check immediately after ingestion
            </label>
          </div>

          {/* Feedback banner */}
          {feedback && (
            <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
              feedback.isSuccess 
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
            }`}>
              {feedback.isSuccess ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{feedback.msg}</span>
            </div>
          )}

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#1e2d54]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#131d35] hover:bg-[#172342] text-xs font-semibold text-slate-300 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-glow-sm transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isLoading ? 'Ingesting...' : 'Ingest & Verify'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
