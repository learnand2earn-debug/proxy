'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Key, 
  ShieldCheck, 
  Lock, 
  User, 
  AlertTriangle, 
  ArrowRight, 
  Globe, 
  Radio, 
  Sparkles,
  Zap,
  X,
  Shield,
  Activity,
  Layers
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';

interface LoginModalProps {
  onLoginSuccess?: (role: 'admin' | 'user') => void;
}

// 3 Background Videos to be seamlessly looped across the entire viewport
const BG_VIDEOS = [
  '/videos/bg1.mp4',
  '/videos/bg2.mp4',
  '/videos/bg3.mp4'
];

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const { isLoginModalOpen, setIsLoginModalOpen, login, isAuthenticated } = useAuth();
  
  // Default to Commercial License Key tab (clean client portal access)
  const [loginMethod, setLoginMethod] = useState<'key' | 'credentials'>('key');

  // Input states start clean and empty
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [licenseKey, setLicenseKey] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  // Background Videos Continuous Sequential Looping
  const [activeVideoIdx, setActiveVideoIdx] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    const currentVideo = videoRefs.current[activeVideoIdx];
    if (currentVideo) {
      currentVideo.currentTime = 0;
      const playPromise = currentVideo.play();
      if (playPromise !== undefined) {
        playPromise.catch((e) => {
          console.debug('Autoplay waiting for user gesture or preloading:', e);
        });
      }
    }
  }, [activeVideoIdx]);

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
          ? 'Please enter your commercial license key to authenticate.' 
          : 'Please enter administrator username and password.'
      );
      setLoading(false);
      return;
    }

    const res = await login(identifier, pass);
    if (!res.success) {
      setErrorMsg(res.error || 'Authentication rejected by security gateway');
      if (res.is_concurrent_locked) {
        setIsLocked(true);
      }
    } else {
      const userRole = res.session?.role || (loginMethod === 'credentials' && identifier.toLowerCase() === 'admin' ? 'admin' : 'user');
      onLoginSuccess?.(userRole);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden animate-in fade-in duration-500">
      {/* FULL-SCREEN CONTINUOUS LOOPING BACKGROUND VIDEOS */}
      <div className="fixed inset-0 w-full h-full pointer-events-none -z-10 overflow-hidden bg-[#050814]">
        {BG_VIDEOS.map((src, idx) => (
          <video
            key={src}
            ref={(el) => {
              videoRefs.current[idx] = el;
            }}
            src={src}
            autoPlay={idx === 0}
            muted
            playsInline
            preload="auto"
            onEnded={() => setActiveVideoIdx((prev) => (prev + 1) % BG_VIDEOS.length)}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ${
              activeVideoIdx === idx 
                ? 'opacity-45 scale-105 filter brightness-90 contrast-125' 
                : 'opacity-0 scale-100 pointer-events-none'
            }`}
          />
        ))}

        {/* Ambient Dark-Tech Tint Overlay (Balanced so video motion clearly shines through) */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#050814]/75 via-[#050814]/50 to-[#050814]/80 backdrop-blur-[1px]"></div>

        {/* Subtle Cyber Tech Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b20_1px,transparent_1px),linear-gradient(to_bottom,#1e293b20_1px,transparent_1px)] bg-[size:28px_28px] opacity-40"></div>

        {/* Dynamic Animated Ambient Glow Lights */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-cyan-500/20 animate-spark-glow-pulse pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-blue-600/20 animate-spark-float pointer-events-none" />
      </div>

      {/* Main Glassmorphic Modal Container */}
      <div className="relative w-full max-w-md rounded-3xl bg-[#0a0f1d]/90 backdrop-blur-xl border border-cyan-500/35 shadow-[0_0_70px_-10px_rgba(6,182,212,0.4)] overflow-hidden transition-all duration-300">
        {/* Animated Flowing Top Gradient Border */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 animate-spark-border-flow"></div>

        {/* Floating Twinkle Sparkle Elements */}
        <div className="absolute top-4 right-16 pointer-events-none animate-spark-twinkle text-cyan-400/70">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="absolute bottom-12 left-6 pointer-events-none animate-spark-twinkle text-blue-400/50 delay-1000">
          <Sparkles className="w-3.5 h-3.5" />
        </div>

        {/* Modal Header with WebsiteSpark Branding */}
        <div className="p-7 pb-5 border-b border-[#1a2540] relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              {/* Animated Glowing Logo Avatar */}
              <div className="relative group">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 opacity-75 blur-sm group-hover:opacity-100 transition duration-500 animate-spark-rotate"></div>
                <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0c1427] to-[#121e3d] border border-cyan-400/40 flex items-center justify-center shadow-inner">
                  <Zap className="w-6 h-6 text-cyan-400 animate-pulse" />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent">
                    WebsiteSpark
                  </h1>
                  <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono font-bold tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                    DRM ACTIVE
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-1.5 font-medium">
                  <span>Proxy & Web Intelligence Terminal</span>
                </p>
              </div>
            </div>

            {/* Close Button if already authenticated */}
            {isAuthenticated && (
              <button
                onClick={() => setIsLoginModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#131d35] border border-transparent hover:border-[#1e2d54] transition-all"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-7 space-y-5">
          {/* Method Selection Tabs with Smooth Slider Glow */}
          <div className="grid grid-cols-2 p-1.5 bg-[#0e162a]/95 rounded-2xl border border-[#1e2d54] text-xs shadow-inner">
            <button
              type="button"
              onClick={() => {
                setLoginMethod('key');
                setErrorMsg(null);
                setIsLocked(false);
              }}
              className={`py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-200 ${
                loginMethod === 'key'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-950/60 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#131e38]'
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
              className={`py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-200 ${
                loginMethod === 'credentials'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-950/60 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#131e38]'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>System Admin</span>
            </button>
          </div>

          {/* Form Controls */}
          <form onSubmit={handleSignIn} className="space-y-4">
            {loginMethod === 'key' ? (
              <div className="space-y-1.5 animate-in fade-in duration-200">
                <label className="block text-xs font-semibold text-slate-200">
                  Commercial License Key
                </label>
                <div className="relative group">
                  <Key className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2 transition-transform group-focus-within:scale-110" />
                  <input
                    type="text"
                    placeholder="WSP-MONTHLY-XXXX-XXXX"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-[#0c1322]/90 border border-[#1e2d54] focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 rounded-xl text-white font-mono text-xs outline-none transition-all placeholder:text-slate-500 shadow-inner"
                    required
                    autoFocus
                  />
                </div>
                <div className="pt-1 text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Single-Site DRM binds this key strictly to your domain origin.</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5 animate-in fade-in duration-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    Administrator Username
                  </label>
                  <div className="relative group">
                    <User className="w-4 h-4 text-blue-400 absolute left-3.5 top-1/2 -translate-y-1/2 transition-transform group-focus-within:scale-110" />
                    <input
                      type="text"
                      placeholder="Enter admin username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-[#0c1322]/90 border border-[#1e2d54] focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-white text-xs outline-none transition-all font-mono placeholder:text-slate-500 shadow-inner"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    Administrator Password
                  </label>
                  <div className="relative group">
                    <Lock className="w-4 h-4 text-blue-400 absolute left-3.5 top-1/2 -translate-y-1/2 transition-transform group-focus-within:scale-110" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-[#0c1322]/90 border border-[#1e2d54] focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-white text-xs outline-none transition-all font-mono placeholder:text-slate-500 shadow-inner"
                      required
                    />
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Master Administrator session unlocks full DRM control & panel.</span>
                </div>
              </div>
            )}

            {/* Error or DRM Lock Alert */}
            {errorMsg && (
              <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200 ${
                isLocked 
                  ? 'bg-rose-950/80 border-rose-500/60 text-rose-200 shadow-lg shadow-rose-950/50' 
                  : 'bg-amber-950/70 border-amber-500/50 text-amber-200 shadow-lg shadow-amber-950/50'
              }`}>
                <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${isLocked ? 'text-rose-400' : 'text-amber-400'}`} />
                <div className="space-y-0.5">
                  <div className="font-bold">
                    {isLocked ? 'Single-Site DRM Concurrency Lock' : 'Security Gateway Alert'}
                  </div>
                  <div className="text-[11px] leading-relaxed opacity-90">
                    {errorMsg}
                  </div>
                </div>
              </div>
            )}

            {/* Animated Action Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-xl font-bold text-xs shadow-xl flex items-center justify-center gap-2.5 transition-all duration-300 disabled:opacity-50 mt-3 group relative overflow-hidden ${
                loginMethod === 'key'
                  ? 'bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-400 hover:brightness-110 text-slate-950 shadow-cyan-950/60 active:scale-[0.99]'
                  : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:brightness-110 text-white shadow-indigo-950/60 active:scale-[0.99]'
              }`}
            >
              {/* Shimmer light sweep animation */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

              {loading ? (
                <span className="flex items-center gap-2.5">
                  <Radio className="w-4 h-4 animate-spin" />
                  <span>Validating Cryptographic Binding...</span>
                </span>
              ) : (
                <>
                  <span className="tracking-wide">
                    {loginMethod === 'key' ? 'Authenticate License & Enter' : 'Sign In to Master Terminal'}
                  </span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Origin Information & Telemetry Status */}
        <div className="px-7 py-3 bg-[#060a16]/90 border-t border-[#131d35] flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Target DRM Origin:</span>
          </span>
          <span className="text-cyan-300 font-bold tracking-tight" suppressHydrationWarning>
            {origin || 'http://localhost:3000'}
          </span>
        </div>
      </div>
    </div>
  );
};
