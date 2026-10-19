'use client';

import React, { useState } from 'react';
import { 
  Key, 
  ShieldCheck, 
  Lock, 
  User, 
  AlertTriangle, 
  ArrowRight, 
  Sparkles, 
  Globe, 
  CheckCircle2, 
  Radio,
  Zap,
  Server
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';

export const LoginModal: React.FC = () => {
  const { isLoginModalOpen, login, isAuthenticated } = useAuth();
  const [tab, setTab] = useState<'customer' | 'admin'>('customer');
  const [loginMethod, setLoginMethod] = useState<'key' | 'credentials'>('key');

  const [licenseKey, setLicenseKey] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  // If already authenticated and modal is not forced open, don't show
  if (isAuthenticated && !isLoginModalOpen) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setIsLocked(false);

    let identifier = '';
    let pass: string | undefined = undefined;

    if (tab === 'admin') {
      identifier = username.trim() || 'admin';
      pass = password;
    } else {
      if (loginMethod === 'key') {
        identifier = licenseKey.trim();
      } else {
        identifier = username.trim();
        pass = password;
      }
    }

    if (!identifier) {
      setErrorMsg(tab === 'admin' ? 'Please enter admin username' : 'Please provide license key or username');
      setLoading(false);
      return;
    }

    const res = await login(identifier, pass);
    if (!res.success) {
      setErrorMsg(res.error || 'Authentication rejected');
      if (res.is_concurrent_locked) {
        setIsLocked(true);
      }
    }
    setLoading(false);
  };

  const handleQuickFill = (type: 'apex' | 'cyberscrape' | 'key' | 'admin') => {
    setErrorMsg(null);
    setIsLocked(false);
    if (type === 'admin') {
      setTab('admin');
      setUsername('admin');
      setPassword('admin123');
    } else if (type === 'key') {
      setTab('customer');
      setLoginMethod('key');
      setLicenseKey('WSP-LIFETIME-GOLD-7788');
    } else if (type === 'apex') {
      setTab('customer');
      setLoginMethod('credentials');
      setUsername('apex_vip');
      setPassword('ApexPassword123!');
    } else if (type === 'cyberscrape') {
      setTab('customer');
      setLoginMethod('credentials');
      setUsername('cyberscrape');
      setPassword('ScrapePass2026!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050814]/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0a0f1d] border border-cyan-500/30 shadow-2xl overflow-hidden shadow-cyan-950/50">
        {/* Glow ambient header */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500"></div>

        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-[#1a2540] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-glow-sm">
              <Key className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span>ProxyIntel.AI Authentication Gate</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                  DRM LOCKED
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Authorized Single-Site Verification & License Gate
              </p>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="px-6 pt-4 flex gap-2 border-b border-[#1a2540]">
          <button
            type="button"
            onClick={() => { setTab('customer'); setErrorMsg(null); }}
            className={`pb-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
              tab === 'customer'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Customer / License Access</span>
          </button>

          <button
            type="button"
            onClick={() => { setTab('admin'); setErrorMsg(null); }}
            className={`pb-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
              tab === 'admin'
                ? 'border-blue-400 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Master System Admin</span>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {tab === 'customer' ? (
            <>
              {/* Toggle Key vs Credentials */}
              <div className="grid grid-cols-2 p-1 bg-[#131d35] rounded-xl border border-[#1e2d54] text-xs">
                <button
                  type="button"
                  onClick={() => setLoginMethod('key')}
                  className={`py-1.5 rounded-lg font-medium transition-all ${
                    loginMethod === 'key'
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  License Key (Instant)
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod('credentials')}
                  className={`py-1.5 rounded-lg font-medium transition-all ${
                    loginMethod === 'credentials'
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Username & Password
                </button>
              </div>

              {loginMethod === 'key' ? (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Enter License Key
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. WSP-LIFETIME-GOLD-7788"
                      value={licenseKey}
                      onChange={(e) => setLicenseKey(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#0f172a] border border-[#1e2d54] focus:border-cyan-400 rounded-xl text-white font-mono text-xs outline-none transition-all"
                      required
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Format: <code className="text-cyan-300">WSP-[PLAN]-XXXX-XXXX</code>
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Customer Username
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="e.g. apex_vip"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-[#0f172a] border border-[#1e2d54] focus:border-cyan-400 rounded-xl text-white text-xs outline-none transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-[#0f172a] border border-[#1e2d54] focus:border-cyan-400 rounded-xl text-white text-xs outline-none transition-all"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Administrator Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-blue-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0f172a] border border-[#1e2d54] focus:border-blue-400 rounded-xl text-white text-xs outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Master Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-blue-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    placeholder="admin123"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0f172a] border border-[#1e2d54] focus:border-blue-400 rounded-xl text-white text-xs outline-none transition-all"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* DRM Warning / Error banner */}
          {errorMsg && (
            <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in duration-200 ${
              isLocked 
                ? 'bg-rose-950/60 border-rose-500/60 text-rose-200' 
                : 'bg-amber-950/50 border-amber-500/50 text-amber-200'
            }`}>
              <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${isLocked ? 'text-rose-400' : 'text-amber-400'}`} />
              <div className="space-y-1">
                <div className="font-semibold">
                  {isLocked ? 'DRM Concurrency Policy Violation' : 'Authentication Error'}
                </div>
                <div className="text-[11px] leading-relaxed opacity-90">
                  {errorMsg}
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-950/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Radio className="w-4 h-4 animate-spin text-slate-950" />
                <span>Verifying DRM & Origin...</span>
              </span>
            ) : (
              <>
                <span>Authenticate & Unlock Platform</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Quick-Fill Presets for Evaluation */}
        <div className="px-6 py-4 bg-[#080d1b] border-t border-[#1a2540] text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Quick-Fill Test Credentials</span>
            </span>
            <span className="text-[10px] text-cyan-400 font-mono">1 Click Fill</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('admin')}
              className="px-2.5 py-1.5 rounded-lg bg-[#11182c] hover:bg-[#1a2540] border border-[#1e2d54] text-left transition-all"
            >
              <div className="text-[11px] font-bold text-blue-300">🛡️ Master Admin</div>
              <div className="text-[10px] text-slate-400 font-mono">admin / admin123</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('key')}
              className="px-2.5 py-1.5 rounded-lg bg-[#11182c] hover:bg-[#1a2540] border border-[#1e2d54] text-left transition-all"
            >
              <div className="text-[11px] font-bold text-cyan-300">🔑 Key Only (Lifetime)</div>
              <div className="text-[10px] text-slate-400 font-mono">WSP-LIFETIME-...</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('apex')}
              className="px-2.5 py-1.5 rounded-lg bg-[#11182c] hover:bg-[#1a2540] border border-[#1e2d54] text-left transition-all"
            >
              <div className="text-[11px] font-bold text-emerald-300">👑 VIP Lifetime User</div>
              <div className="text-[10px] text-slate-400 font-mono">apex_vip / pass</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('cyberscrape')}
              className="px-2.5 py-1.5 rounded-lg bg-[#11182c] hover:bg-[#1a2540] border border-[#1e2d54] text-left transition-all"
            >
              <div className="text-[11px] font-bold text-indigo-300">⚡ Annual License</div>
              <div className="text-[10px] text-slate-400 font-mono">cyberscrape / pass</div>
            </button>
          </div>
        </div>

        {/* Footer Origin Information */}
        <div className="px-6 py-2.5 bg-[#050814] border-t border-[#131d35] flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>Target DRM Origin:</span>
          </span>
          <span className="text-cyan-300 font-bold">
            {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}
          </span>
        </div>
      </div>
    </div>
  );
};
