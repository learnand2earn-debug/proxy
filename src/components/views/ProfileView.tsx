'use client';

import React, { useState } from 'react';
import { 
  UserCheck, 
  Key, 
  Shield, 
  Globe, 
  Lock, 
  Clock, 
  Copy, 
  Check, 
  LogOut, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { DEFAULT_OWNER_ID } from '@/types';

export const ProfileView: React.FC = () => {
  const { session, logout, isAuthenticated, setIsLoginModalOpen } = useAuth();
  const [copiedKey, setCopiedKey] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  if (!isAuthenticated || !session) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-cyan-400" />
            <span>Profile & DRM License Session</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            You are currently not authenticated with a customer license or administrative credentials.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#0d1424] border border-[#1a2540] text-center space-y-4">
          <Key className="w-10 h-10 text-cyan-400 mx-auto" />
          <div>
            <h3 className="font-bold text-white text-sm">Authentication Required</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Please authenticate using your licensed customer credentials or administrator pass to bind this domain.
            </p>
          </div>
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs transition-all shadow-md"
          >
            Authenticate License Now
          </button>
        </div>
      </div>
    );
  }

  const isAdmin = session.role === 'admin';

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-cyan-400" />
          <span>Operator Profile & DRM License Telemetry</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Active authentication identity, DRM single-site locking status, and subscription parameters.
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-[#0d1424] border border-[#1a2540] space-y-5 text-xs shadow-xl">
        {/* Profile Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-white text-lg shadow-lg ${
              isAdmin 
                ? 'bg-gradient-to-tr from-blue-600 to-indigo-600' 
                : 'bg-gradient-to-tr from-cyan-500 to-blue-600'
            }`}>
              {isAdmin ? 'AD' : session.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">{session.name}</h3>
                {session.plan_type === 'lifetime' && (
                  <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                    <Sparkles className="w-2.5 h-2.5" />
                    LIFETIME VIP
                  </span>
                )}
                {session.plan_type === 'annual' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                    ANNUAL PLAN
                  </span>
                )}
                {session.plan_type === 'monthly' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                    MONTHLY SUBSCRIBER
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-xs font-mono mt-0.5">@{session.username}</p>
              <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded font-semibold border ${
                isAdmin 
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' 
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}>
                {isAdmin ? 'Master Administrator' : 'Active Verified License'}
              </span>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 font-semibold text-xs transition-all self-start sm:self-center"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out & Unbind Site</span>
          </button>
        </div>

        {/* License & DRM Details */}
        <div className="pt-4 border-t border-[#1a2540] space-y-3">
          {session.license_key && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-[#1a2540] gap-1">
              <span className="text-slate-400">Active License Key:</span>
              <div className="flex items-center gap-2">
                <span className="text-cyan-300 font-mono font-bold bg-[#070b16] px-3 py-1 rounded-lg border border-cyan-500/30">
                  {session.license_key}
                </span>
                <button
                  onClick={() => handleCopy(session.license_key || '')}
                  className="p-1.5 rounded-lg bg-[#131d35] hover:bg-[#1a2540] text-slate-300 transition-colors"
                  title="Copy License Key"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-between py-2 border-b border-[#1a2540]">
            <span className="text-slate-400">Single-Site Concurrency Limit:</span>
            <span className="text-white font-mono font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>1 Site Locked (Current Origin)</span>
            </span>
          </div>

          <div className="flex justify-between py-2 border-b border-[#1a2540]">
            <span className="text-slate-400">Locked Domain / Origin:</span>
            <span className="text-cyan-400 font-mono font-medium">
              {session.bound_origin || (typeof window !== 'undefined' ? window.location.origin : 'Current Origin')}
            </span>
          </div>

          {session.expires_at && (
            <div className="flex justify-between py-2 border-b border-[#1a2540]">
              <span className="text-slate-400">Subscription Validity:</span>
              <span className="text-slate-200 font-medium">
                {session.plan_type === 'lifetime' 
                  ? 'Permanent / Lifetime' 
                  : new Date(session.expires_at).toLocaleDateString()}
              </span>
            </div>
          )}

          <div className="flex justify-between py-2 border-b border-[#1a2540]">
            <span className="text-slate-400">Session Token:</span>
            <span className="text-slate-400 font-mono text-[11px] truncate max-w-xs">
              {session.session_token}
            </span>
          </div>

          <div className="flex justify-between py-2">
            <span className="text-slate-400">Heartbeat Status:</span>
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Transmitting (45s pulse)</span>
            </span>
          </div>
        </div>

        {/* Security Alert Note */}
        <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-cyan-300 text-[11px] flex items-center gap-2.5">
          <Globe className="w-4 h-4 shrink-0 text-cyan-400" />
          <span>
            Signing out will release the origin lock so you can log into another domain or machine seamlessly.
          </span>
        </div>
      </div>
    </div>
  );
};
