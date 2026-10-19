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
  X,
  Shield
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';

interface LoginModalProps {
  onLoginSuccess?: (role: 'admin' | 'user') => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const { isLoginModalOpen, setIsLoginModalOpen, login, isAuthenticated } = useAuth();
  
  // Default to Commercial License Key tab (clean client portal access)
  const [loginMethod, setLoginMethod] = useState<'key' | 'credentials'>('key');

  // Input states start completely empty - no hardcoded credentials exposed
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [licenseKey, setLicenseKey] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  // If already authenticated and modal is not explicitly triggered, don't show
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
      setErrorMsg(
        loginMethod === 'key' 
          ? 'Please enter your commercial license key to continue.' 
          : 'Please enter administrator username and password.'
      );
      setLoading(false);
      return;
    }

    const res = await login(identifier, pass);
    if (!res.success) {
      setErrorMsg(res.error || 'Authentication rejected');
      if (res.is_concurrent_locked) {
        setIsLocked(true);
      }
    } else {
      // Invoke role-based success handler
      const userRole = res.session?.role || (loginMethod === 'credentials' && identifier.toLowerCase() === 'admin' ? 'admin' : 'user');
      onLoginSuccess?.(userRole);
    }
    setLoading(false);
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
                {loginMethod === 'key' 
                  ? 'Enter commercial license key to unlock your platform'
                  : 'Master Administrator Secure Terminal Access'}
              </p>
            </div>
          </div>

          {isAuthenticated && (
            <button
              onClick={() => setIsLoginModalOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#131d35] transition-all"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Method Selection Tabs */}
          <div className="grid grid-cols-2 p-1 bg-[#131d35] rounded-xl border border-[#1e2d54] text-xs">
            <button
              type="button"
              onClick={() => {
                setLoginMethod('key');
                setErrorMsg(null);
                setIsLocked(false);
              }}
              className={`py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
                loginMethod === 'key'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Customer License</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMethod('credentials');
                setErrorMsg(null);
                setIsLocked(false);
              }}
              className={`py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
                loginMethod === 'credentials'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>System Admin</span>
            </button>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4">
            {loginMethod === 'key' ? (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Commercial License Key
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Enter key (e.g. WSP-MONTHLY-XXXX-XXXX)"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0f172a] border border-[#1e2d54] focus:border-cyan-400 rounded-xl text-white font-mono text-xs outline-none transition-all placeholder:text-slate-500"
                    required
                    autoFocus
                  />
                </div>
                <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Single-Site DRM binds this key strictly to your domain origin.</span>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Administrator Username
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-blue-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Enter administrator username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#0f172a] border border-[#1e2d54] focus:border-blue-400 rounded-xl text-white text-xs outline-none transition-all font-mono placeholder:text-slate-500"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Administrator Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-blue-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#0f172a] border border-[#1e2d54] focus:border-blue-400 rounded-xl text-white text-xs outline-none transition-all font-mono placeholder:text-slate-500"
                      required
                    />
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Administrator session unlocks the Master DRM Management Portal.</span>
                </div>
              </>
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
              className={`w-full py-3 rounded-xl font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2 ${
                loginMethod === 'key'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-950/50'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-indigo-950/50'
              }`}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Radio className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </span>
              ) : (
                <>
                  <span>{loginMethod === 'key' ? 'Authenticate License & Enter' : 'Sign In as Administrator'}</span>
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
