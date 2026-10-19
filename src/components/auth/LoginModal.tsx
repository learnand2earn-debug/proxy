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
  Server,
  UserPlus,
  LogIn
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';

export const LoginModal: React.FC = () => {
  const { isLoginModalOpen, login, register, isAuthenticated } = useAuth();
  const [tab, setTab] = useState<'signin' | 'register' | 'admin'>('signin');
  const [loginMethod, setLoginMethod] = useState<'key' | 'credentials'>('key');

  // Sign In inputs
  const [licenseKey, setLicenseKey] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Register inputs
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPlan, setRegPlan] = useState<'monthly' | 'annual' | 'lifetime'>('monthly');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [registeredSuccessMsg, setRegisteredSuccessMsg] = useState<string | null>(null);

  // If already authenticated and modal is not forced open, don't show
  if (isAuthenticated && !isLoginModalOpen) {
    return null;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setIsLocked(false);
    setRegisteredSuccessMsg(null);

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setIsLocked(false);

    if (!regName.trim() || !regUsername.trim() || !regPassword.trim()) {
      setErrorMsg('Please complete all required fields.');
      setLoading(false);
      return;
    }

    const res = await register(regName.trim(), regUsername.trim(), regPassword.trim(), regPlan);
    if (!res.success) {
      setErrorMsg(res.error || 'Registration failed');
    } else {
      setRegisteredSuccessMsg('Account created and authenticated successfully!');
    }
    setLoading(false);
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
                  DRM ACTIVE
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Single-Site Origin Binding & Real-Time Licensed Operator Access
              </p>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="px-6 pt-3 flex gap-2 border-b border-[#1a2540] text-xs">
          <button
            type="button"
            onClick={() => { setTab('signin'); setErrorMsg(null); }}
            className={`pb-2.5 font-semibold border-b-2 flex items-center gap-1.5 transition-all ${
              tab === 'signin'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => { setTab('register'); setErrorMsg(null); }}
            className={`pb-2.5 font-semibold border-b-2 flex items-center gap-1.5 transition-all ${
              tab === 'register'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Real Account</span>
          </button>

          <button
            type="button"
            onClick={() => { setTab('admin'); setErrorMsg(null); }}
            className={`pb-2.5 font-semibold border-b-2 flex items-center gap-1.5 transition-all ${
              tab === 'admin'
                ? 'border-blue-400 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>System Admin</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* TAB 1: SIGN IN */}
          {tab === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
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
                  License Key
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
                      placeholder="e.g. WSP-MONTHLY-XXXX-XXXX"
                      value={licenseKey}
                      onChange={(e) => setLicenseKey(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#0f172a] border border-[#1e2d54] focus:border-cyan-400 rounded-xl text-white font-mono text-xs outline-none transition-all"
                      required
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Authentic commercial key will bind to this origin automatically.
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Username
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Your registered username"
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-950/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Radio className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Verifying Origin & Session...</span>
                  </span>
                ) : (
                  <>
                    <span>Authenticate & Access Platform</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: REGISTER REAL ACCOUNT */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Full Name / Organization *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g. John Doe / My Operations"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0f172a] border border-[#1e2d54] focus:border-cyan-400 rounded-xl text-white outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Desired Username *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. operator_one"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#0f172a] border border-[#1e2d54] focus:border-cyan-400 rounded-xl text-white outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    placeholder="Min 6 characters"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#0f172a] border border-[#1e2d54] focus:border-cyan-400 rounded-xl text-white outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Select License Tier
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRegPlan('monthly')}
                    className={`py-2 px-1.5 rounded-xl border text-center transition-all ${
                      regPlan === 'monthly'
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                        : 'bg-[#0f172a] border-[#1e2d54] text-slate-400'
                    }`}
                  >
                    <div className="text-[11px]">Monthly</div>
                    <div className="text-[10px] text-slate-400">30 Days</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegPlan('annual')}
                    className={`py-2 px-1.5 rounded-xl border text-center transition-all ${
                      regPlan === 'annual'
                        ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300 font-bold'
                        : 'bg-[#0f172a] border-[#1e2d54] text-slate-400'
                    }`}
                  >
                    <div className="text-[11px]">Annual</div>
                    <div className="text-[10px] text-slate-400">365 Days</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegPlan('lifetime')}
                    className={`py-2 px-1.5 rounded-xl border text-center transition-all ${
                      regPlan === 'lifetime'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                        : 'bg-[#0f172a] border-[#1e2d54] text-slate-400'
                    }`}
                  >
                    <div className="text-[11px]">Lifetime</div>
                    <div className="text-[10px] text-slate-400">Permanent</div>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-950/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-1"
              >
                {loading ? (
                  <Radio className="w-4 h-4 animate-spin text-slate-950" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create Real Account & Get License</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 3: SYSTEM ADMIN */}
          {tab === 'admin' && (
            <form onSubmit={handleSignIn} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Master Administrator Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-blue-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0f172a] border border-[#1e2d54] focus:border-blue-400 rounded-xl text-white outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Master Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-blue-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    placeholder="admin123"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0f172a] border border-[#1e2d54] focus:border-blue-400 rounded-xl text-white outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => { setUsername('admin'); setPassword('admin123'); }}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 underline font-mono"
                >
                  Quick Fill Master Admin
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-950/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <Radio className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Enter Master Admin Panel</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Success Notification */}
          {registeredSuccessMsg && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{registeredSuccessMsg}</span>
            </div>
          )}

          {/* DRM Warning / Error banner */}
          {errorMsg && (
            <div className={`mt-4 p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in duration-200 ${
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
        </div>

        {/* Footer Origin Information */}
        <div className="px-6 py-2.5 bg-[#050814] border-t border-[#131d35] flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>DRM Bound Origin:</span>
          </span>
          <span className="text-cyan-300 font-bold">
            {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}
          </span>
        </div>
      </div>
    </div>
  );
};
