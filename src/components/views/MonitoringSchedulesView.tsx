'use client';

import React, { useState, useEffect } from 'react';
import { 
  CalendarClock, 
  Clock, 
  Sliders, 
  CheckCircle2, 
  Zap, 
  ShieldCheck,
  Save,
  Loader2
} from 'lucide-react';
import { MonitoringSchedule } from '@/types';

export const MonitoringSchedulesView: React.FC = () => {
  const [schedules, setSchedules] = useState<MonitoringSchedule[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadSchedules = () => {
    fetch('/api/schedules')
      .then(r => r.json())
      .then(d => {
        if (d.schedules) setSchedules(d.schedules);
      })
      .catch(console.error);
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const handleUpdateInterval = async (id: string, newSeconds: number) => {
    setSavingId(id);
    try {
      await fetch('/api/schedules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          interval_seconds: newSeconds
        })
      });
      loadSchedules();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleActive = async (id: string, currentState: boolean) => {
    setSavingId(id);
    try {
      await fetch('/api/schedules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          is_active: !currentState
        })
      });
      loadSchedules();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-blue-400" />
          <span>Automatic Inactive Monitoring Schedules</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure recurring health checks with bounded exponential backoff and jitter to protect endpoint stability while tracking recovery events.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {schedules.map((sch) => {
          const isSaving = savingId === sch.id;
          return (
            <div key={sch.id} className="p-5 rounded-xl bg-[#0d1424] border border-[#1a2540] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">
                    {sch.backoff_strategy.replace('_', ' ')}
                  </span>
                  <button
                    onClick={() => handleToggleActive(sch.id, sch.is_active)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                      sch.is_active
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {sch.is_active ? 'ACTIVE' : 'PAUSED'}
                  </button>
                </div>

                <h3 className="text-sm font-bold text-white mb-2">{sch.name}</h3>
                
                <div className="space-y-3 mb-4 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Check Interval:</label>
                    <select
                      value={sch.interval_seconds}
                      onChange={(e) => handleUpdateInterval(sch.id, parseInt(e.target.value, 10))}
                      className="w-full bg-[#131d35] border border-[#1e2d54] rounded-lg p-2 text-white"
                    >
                      <option value={300}>Every 5 minutes</option>
                      <option value={900}>Every 15 minutes</option>
                      <option value={1800}>Every 30 minutes</option>
                      <option value={3600}>Every 1 hour</option>
                      <option value={21600}>Every 6 hours</option>
                      <option value={86400}>Every 24 hours</option>
                    </select>
                  </div>

                  <div className="text-[11px] text-slate-400">
                    <span className="block font-medium text-slate-300 mb-0.5">Target Status Scope:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {sch.target_status.map((st, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-[#131d35] border border-[#1e2d54] text-[10px] font-mono text-blue-300">
                          {st}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400">
                    <span>Jitter Randomization: </span>
                    <strong className="text-white font-mono">{Math.round(sch.jitter_factor * 100)}% (±)</strong>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#1a2540] flex items-center justify-between text-[11px] text-slate-500">
                <span>Max Backoff: 24h</span>
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
