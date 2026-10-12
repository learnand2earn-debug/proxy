'use client';

import React from 'react';
import { UserCheck, Key, Shield, Smartphone, Lock } from 'lucide-react';
import { DEFAULT_OWNER_ID } from '@/types';

export const ProfileView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-blue-400" />
          <span>Operator Profile & Credentials</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Manage your operator identity, API access tokens, and browser permission scopes.
        </p>
      </div>

      <div className="p-5 rounded-xl bg-[#0d1424] border border-[#1a2540] space-y-4 text-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white text-base">
            OP
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Enterprise System Operator</h3>
            <p className="text-slate-400 text-[11px] font-mono">admin@proxyintel.ai</p>
            <span className="inline-block mt-1 text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-semibold">
              Superadmin Access
            </span>
          </div>
        </div>

        <div className="pt-4 border-t border-[#1a2540] space-y-3">
          <div className="flex justify-between py-1.5 border-b border-[#1a2540]">
            <span className="text-slate-400">Account Owner ID:</span>
            <span className="text-blue-300 font-mono">{DEFAULT_OWNER_ID}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-[#1a2540]">
            <span className="text-slate-400">Role-Based Access:</span>
            <span className="text-white font-medium">Administrator (Full Policy Access)</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-[#1a2540]">
            <span className="text-slate-400">Session Security:</span>
            <span className="text-emerald-400 font-medium">Encrypted JWT / TLS 1.3</span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-slate-400">Browser Extension Permission Scope:</span>
            <span className="text-slate-300 font-medium">Read Chrome Proxy Settings Only</span>
          </div>
        </div>
      </div>
    </div>
  );
};
