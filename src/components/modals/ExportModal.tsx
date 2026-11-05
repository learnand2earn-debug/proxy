'use client';

import React, { useState } from 'react';
import { X, Download, FileSpreadsheet, FileJson, FileText, Lock, Globe, CheckCircle2 } from 'lucide-react';
import { POPULAR_COUNTRIES, ALL_COUNTRIES } from '@/lib/constants/countries';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const [format, setFormat] = useState<'csv' | 'json' | 'txt'>('txt');
  const [country, setCountry] = useState<string>('ALL');
  const [includeCredentials, setIncludeCredentials] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleDownload = () => {
    setIsExporting(true);
    // Strictly export ACTIVE live working proxies only (closed proxies excluded)
    let url = `/api/proxies/export?format=${format}&status=ACTIVE`;
    if (country !== 'ALL') {
      url += `&country=${country}`;
    }
    if (includeCredentials) {
      url += `&include_credentials=true`;
    }

    // Trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `live_active_proxies_${country}_${Date.now()}.${format}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setIsExporting(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#0e1628] border border-[#1e2d54] rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 text-slate-400 hover:text-white p-1 rounded-lg bg-[#172342]"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-5">
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export Live Working Proxies</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Download 100% verified working live proxies. Closed proxies are automatically excluded.
          </p>
        </div>

        <div className="space-y-4">
          {/* Format Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Export Format</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormat('txt')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  format === 'txt'
                    ? 'border-emerald-500 bg-emerald-600/20 text-white font-semibold'
                    : 'border-[#1e2d54] bg-[#131d35] text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
                <span className="text-xs">TXT List</span>
              </button>
              <button
                type="button"
                onClick={() => setFormat('csv')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  format === 'csv'
                    ? 'border-blue-500 bg-blue-600/20 text-white font-semibold'
                    : 'border-[#1e2d54] bg-[#131d35] text-slate-400 hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-5 h-5 mx-auto mb-1 text-cyan-400" />
                <span className="text-xs">CSV</span>
              </button>
              <button
                type="button"
                onClick={() => setFormat('json')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  format === 'json'
                    ? 'border-blue-500 bg-blue-600/20 text-white font-semibold'
                    : 'border-[#1e2d54] bg-[#131d35] text-slate-400 hover:text-white'
                }`}
              >
                <FileJson className="w-5 h-5 mx-auto mb-1 text-indigo-400" />
                <span className="text-xs">JSON</span>
              </button>
            </div>
          </div>

          {/* Country Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>Target Country Filter</span>
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full bg-[#131d35] border border-[#1e2d54] rounded-lg p-2.5 text-xs text-white"
            >
              <option value="ALL">🌐 All Countries (Global Genuine Pool)</option>
              <option disabled>── Popular Countries ──</option>
              {POPULAR_COUNTRIES.filter(c => c.code !== 'ALL').map(c => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.code})
                </option>
              ))}
              <option disabled>── All Countries ──</option>
              {ALL_COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* Verified Live Active Only Notice */}
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="text-xs text-emerald-300 leading-relaxed">
              <span className="font-bold">Verified Live Active Only:</span> Closed or dead proxies are permanently excluded from this export.
            </div>
          </div>

          {/* Masking / Credentials Protection Notice */}
          <div className="p-3 bg-[#131d35] rounded-xl border border-[#1e2d54]">
            <div className="flex items-center gap-2 mb-1 text-xs font-semibold text-slate-300">
              <Lock className="w-3.5 h-3.5 text-blue-400" />
              <span>Credential Masking Protection</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              By default, passwords and sensitive tokens are masked (••••••) in exported files to prevent accidental leakage.
            </p>
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#1e2d54]">
              <input
                type="checkbox"
                id="includeCreds"
                checked={includeCredentials}
                onChange={(e) => setIncludeCredentials(e.target.checked)}
                className="rounded bg-[#0e1628] border-slate-700 text-blue-500 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="includeCreds" className="text-[11px] text-amber-300 font-medium cursor-pointer">
                Include unmasked plaintext credentials (Operator authorization)
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#1e2d54]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#131d35] hover:bg-[#172342] text-xs font-semibold text-slate-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isExporting}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-glow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Generating...' : 'Download Live Active'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
