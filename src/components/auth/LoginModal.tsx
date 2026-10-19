'use client';

import React, { useState } from 'react';
import { 
  Key, 
  ShieldCheck, 
  Lock, 
  User, 
  AlertTriangle, 
  ArrowRight, 
  Globe, 
  Radio, 
  CheckCircle2, 
  Sparkles,
  Copy,
  Check
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';

export const LoginModal: React.FC = () => {
  const { isLoginModalOpen, login, isAuthenticated } = useAuth();
  const [loginMethod, setLoginMethod] = useState<'credentials' | 'key'>('credentials');

  // Input states (pre-filled with admin credentials by default for convenience)
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [licenseKey, setLicenseKey] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [copiedAdmin, setCopiedAdmin] = useState(false);

  // If already authenticated and modal is not forced open, don't show
  if (isAuthenticated && !isLoginModalOpen) {
    return null;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setIsLocked(false);

    let identifier = '';
    let pass: string | undefined = undefined;

    if (loginMethod === 'key') {
      identifier = licenseKey.trim();
    } else {
      identifier = username.trim();
      pass = password;
    }

    if (!identifier) {
      setErrorMsg(loginMethod === 'key' ? 'Please enter license key' : 'Please enter username and password');
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

  const handleAutoFillAdmin = () => {
    setLoginMethod('credentials');
    setUsername('admin');
    setPassword('admin123');
    setErrorMsg(null);
    setIsLocked(false);
    setCopiedAdmin(true);
    setTimeout(() => setCopiedAdmin(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050814]/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="relative w-full max-w-md rounded-2xl bg-[#0a0f1d] border border-cyan-500/30 shadow-2xl overflow-hidden shadow-cyan-950/50">
        {/* Glow ambient top border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500"></div>

        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-[#1a2540] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-glow-sm">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span>ProxyIntel.AI Authentication</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                  DRM ACTIVE
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Sign in with Administrator or Licensed User credentials
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Admin Credentials Card */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/40 via-[#0e172e] to-cyan-950/30 border border-blue-500/40 text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-blue-300 font-bold">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Master Admin Credentials</span>
              </div>
              <button
                type="button"
                onClick={handleAutoFillAdmin}
                className="text-[11px] text-cyan-300 hover:text-cyan-200 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all"
              >
                {copiedAdmin ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Filled!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    <span>Auto-Fill</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono text-[11px] mt-2 pt-2 border-t border-blue-500/20">
              <div className="bg-[#080d1b] px-2.5 py-1.5 rounded-lg border border-[#1a2540]">
                <span className="text-slate-400 block text-[10px]">USERNAME</span>
                <span className="text-white font-bold">admin</span>
              </div>
              <div className="bg-[#080d1b] px-2.5 py-1.5 rounded-lg border border-[#1a2540]">
                <span className="text-slate-400 block text-[10px]">PASSWORD</span>
                <span className="text-cyan-300 font-bold">admin123</span>
              </div>
            </div>
          </div>

          {/* Toggle Username/Password vs License Key */}
          <div className="grid grid-cols-2 p-1 bg-[#131d35] rounded-xl border border-[#1e2d54] text-xs">
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
            <button
              type="button"
              onClick={() => setLoginMethod('key')}
              className={`py-1.5 rounded-lg font-medium transition-all ${
                loginMethod === 'key'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Direct License Key
            </button>
          </div>

          <form onSubmit={handleSignIn} className="space-y-3.5">
            {loginMethod === 'credentials' ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Username
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="admin"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#0f172a] border border-[#1e2d54] focus:border-cyan-400 rounded-xl text-white text-xs outline-none transition-all font-mono"
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
                      placeholder="admin123"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#0f172a] border border-[#1e2d54] focus:border-cyan-400 rounded-xl text-white text-xs outline-none transition-all font-mono"
                      required
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  License Key
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="WSP-MONTHLY-XXXX-XXXX"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0f172a] border border-[#1e2d54] focus:border-cyan-400 rounded-xl text-white font-mono text-xs outline-none transition-all"
                    required
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Paste commercial license key to unlock this domain origin.
                </span>
              </div>
            )}

            {/* Error or DRM Lock Alert */}
            {errorMsg && (
              <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in duration-200 ${
                isLocked 
                  ? 'bg-rose-950/60 border-rose-500/60 text-rose-200' 
                  : 'bg-amber-950/50 border-amber-500/50 text-amber-200'
              }`}>
                <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${isLocked ? 'text-rose-400' : 'text-amber-400'}`} />
                <div className="space-y-0.5">
                  <div className="font-semibold">
                    {isLocked ? 'Single-Site DRM Conflict' : 'Authentication Error'}
                  </div>
                  <div className="text-[11px] leading-relaxed opacity-90">
                    {errorMsg}
                  </div>
                </div>
              </div>
            )}

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-950/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Radio className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Authenticating...</span>
                </span>
              ) : (
                <>
                  <span>Sign In & Enter Platform</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
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
