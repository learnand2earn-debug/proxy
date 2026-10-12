'use client';

import React, { useState } from 'react';
import { DashboardStats, ProxyProtocol, ProxyStatus } from '@/types';
import { TrendingUp, PieChart, ShieldAlert, Zap } from 'lucide-react';

interface ChartsProps {
  stats: DashboardStats;
}

export const Charts: React.FC<ChartsProps> = ({ stats }) => {
  const [activeTab, setActiveTab] = useState<'trends' | 'distribution'>('trends');

  const dates = stats.trends.dates;
  const activeSeries = stats.trends.active;
  const inactiveSeries = stats.trends.inactive;
  const recoveredSeries = stats.trends.recovered;

  const maxVal = Math.max(...activeSeries, ...inactiveSeries, 10);
  const chartHeight = 160;
  const chartWidth = 500;

  // Generate SVG path for area/line
  const makePoints = (series: number[]) => {
    return series.map((val, idx) => {
      const x = (idx / (series.length - 1)) * chartWidth;
      const y = chartHeight - (val / maxVal) * (chartHeight - 20) - 10;
      return { x, y, val };
    });
  };

  const activePoints = makePoints(activeSeries);
  const inactivePoints = makePoints(inactiveSeries);

  const activePath = `M ${activePoints[0].x} ${activePoints[0].y} ` +
    activePoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');

  const activeArea = `${activePath} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

  const inactivePath = `M ${inactivePoints[0].x} ${inactivePoints[0].y} ` +
    inactivePoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');

  // Protocol distribution bars
  const totalProtocols = Object.values(stats.protocol_distribution).reduce((a, b) => a + b, 0) || 1;
  const protocols: Array<{ name: ProxyProtocol; count: number; color: string }> = [
    { name: 'socks5', count: stats.protocol_distribution.socks5 || 0, color: 'bg-blue-500' },
    { name: 'https', count: stats.protocol_distribution.https || 0, color: 'bg-emerald-500' },
    { name: 'http', count: stats.protocol_distribution.http || 0, color: 'bg-cyan-500' },
    { name: 'socks4', count: stats.protocol_distribution.socks4 || 0, color: 'bg-indigo-500' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      {/* Real Trend Chart */}
      <div className="lg:col-span-2 bg-[#0d1424] border border-[#1a2540] rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span>Health & Inactive Recovery Trends</span>
            </h3>
            <p className="text-[11px] text-slate-300">
              Live status transitions and recovery events over the past 7 days
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-400/80"></span>
              <span className="text-slate-300">Active</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-400/80"></span>
              <span className="text-slate-300">Inactive</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-cyan-400"></span>
              <span className="text-slate-300">Recoveries</span>
            </div>
          </div>
        </div>

        {/* SVG Graphic */}
        <div className="relative w-full h-[180px] pt-2">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="none"
            className="w-full h-full overflow-visible"
          >
            <defs>
              <linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="inactiveGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            <line x1="0" y1={chartHeight * 0.25} x2={chartWidth} y2={chartHeight * 0.25} stroke="#172342" strokeDasharray="3 3" />
            <line x1="0" y1={chartHeight * 0.5} x2={chartWidth} y2={chartHeight * 0.5} stroke="#172342" strokeDasharray="3 3" />
            <line x1="0" y1={chartHeight * 0.75} x2={chartWidth} y2={chartHeight * 0.75} stroke="#172342" strokeDasharray="3 3" />

            {/* Active Area & Path */}
            <path d={activeArea} fill="url(#activeGrad)" />
            <path d={activePath} fill="none" stroke="#10b981" strokeWidth="2.5" />

            {/* Inactive Path */}
            <path d={inactivePath} fill="none" stroke="#f43f5e" strokeWidth="2" strokeDasharray="4 3" />

            {/* Points */}
            {activePoints.map((p, idx) => (
              <circle
                key={`a-${idx}`}
                cx={p.x}
                cy={p.y}
                r="3.5"
                fill="#10b981"
                className="hover:r-5 transition-all cursor-pointer"
              >
                <title>{`${dates[idx]}: ${p.val} active`}</title>
              </circle>
            ))}

            {inactivePoints.map((p, idx) => (
              <circle
                key={`i-${idx}`}
                cx={p.x}
                cy={p.y}
                r="3"
                fill="#f43f5e"
                className="hover:r-5 transition-all cursor-pointer"
              >
                <title>{`${dates[idx]}: ${p.val} inactive`}</title>
              </circle>
            ))}
          </svg>

          {/* Dates footer */}
          <div className="flex justify-between text-[10px] text-slate-300 font-mono mt-1">
            {dates.map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Protocol & Classification Distribution */}
      <div className="bg-[#0d1424] border border-[#1a2540] rounded-xl p-5 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-cyan-400" />
              <span>Protocol Breakdown</span>
            </h3>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
              {stats.total_discovered} Total
            </span>
          </div>

          {/* Multi-segment Progress Bar */}
          <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex mb-5">
            {protocols.map((p, idx) => {
              const pct = (p.count / totalProtocols) * 100;
              if (pct === 0) return null;
              return (
                <div
                  key={idx}
                  style={{ width: `${pct}%` }}
                  className={`h-full ${p.color}`}
                  title={`${p.name.toUpperCase()}: ${p.count} (${pct.toFixed(1)}%)`}
                />
              );
            })}
          </div>

          {/* Protocol details list */}
          <div className="space-y-2.5">
            {protocols.map((p, idx) => {
              const pct = Math.round((p.count / totalProtocols) * 100);
              return (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${p.color}`}></span>
                    <span className="font-semibold text-slate-200 uppercase">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-slate-400">{p.count}</span>
                    <span className="font-mono text-slate-300 text-[11px] w-8 text-right">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Diagnostic Security Footer */}
        <div className="pt-4 border-t border-[#1a2540] mt-4 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <Zap className="w-3.5 h-3.5" />
            SSRF Sandbox Enabled
          </span>
          <span className="font-mono text-slate-300">Port 1-65535 Verified</span>
        </div>
      </div>
    </div>
  );
};
