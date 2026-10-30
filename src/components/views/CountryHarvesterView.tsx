'use client';

import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Zap, 
  Search, 
  Download, 
  Copy, 
  Check, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Server, 
  Activity, 
  ShieldCheck,
  TrendingUp,
  Cpu,
  Flame,
  ArrowUpRight,
  ExternalLink
} from 'lucide-react';
import { 
  POPULAR_COUNTRIES, 
  ALL_COUNTRIES, 
  getCountryInfo, 
  CountryMeta 
} from '@/lib/constants/countries';
import { CountryFlag } from '@/components/common/CountryFlag';
import type { LiveDiscoveredProxy } from '@/lib/discovery/live_stream';
import { ProxyProtocol } from '@/types';

interface CountryHarvesterViewProps {
  onProxyIngested?: () => void;
}

export const CountryHarvesterView: React.FC<CountryHarvesterViewProps> = ({
  onProxyIngested
}) => {
  const [selectedCountry, setSelectedCountry] = useState<string>('PK'); // Default Pakistan
  const [protocolFilter, setProtocolFilter] = useState<string>('all');
  const [requestedCount, setRequestedCount] = useState<number>(2500);
  const [autoSaveDb, setAutoSaveDb] = useState<boolean>(true);
  
  const [countrySearch, setCountrySearch] = useState<string>('');
  const [isHarvesting, setIsHarvesting] = useState<boolean>(false);
  const [harvestedProxies, setHarvestedProxies] = useState<LiveDiscoveredProxy[]>([]);
  const [harvestFeedback, setHarvestFeedback] = useState<string | null>(null);

  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [tableSearch, setTableSearch] = useState<string>('');

  const currentCountryInfo: CountryMeta = getCountryInfo(selectedCountry);

  // Filter countries for search input in dropdown
  const filteredCountryOptions = ALL_COUNTRIES.filter(c => 
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  // Auto-harvest on initial mount or when country explicitly selected
  const harvestCountryProxies = async (countryCode: string = selectedCountry) => {
    const targetInfo = getCountryInfo(countryCode);
    setIsHarvesting(true);
    setHarvestFeedback(null);
    try {
      const res = await fetch('/api/stream/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country: countryCode === 'ALL' ? undefined : countryCode,
          count: requestedCount
        })
      });
      const data = await res.json();

      if (data.success) {
        setHarvestFeedback(`Successfully harvested ${data.discovered} authentic ${targetInfo.name} proxies! (${data.inserted} newly added to database)`);
        if (onProxyIngested) onProxyIngested();
      } else {
        setHarvestFeedback('Harvest error: ' + (data.error || 'Failed'));
      }

      // Also fetch live buffer to populate the view's list from database without limit
      const inventoryRes = await fetch(`/api/proxies?country=${countryCode}&limit=0`);
      const invData = await inventoryRes.json();
      if (invData.data && invData.data.length > 0) {
        const mapped: LiveDiscoveredProxy[] = invData.data.map((p: any) => {
          const cCode = p.country_code || countryCode;
          const pInfo = getCountryInfo(cCode);
          return {
            ip: p.host,
            port: p.port,
            protocol: p.protocol,
            normalized_endpoint: p.normalized_endpoint,
            country_code: pInfo.code,
            country_name: pInfo.name,
            flag: pInfo.flag,
            city: p.city || '',
            anonymity: p.anonymity || 'elite',
            latency_ms: p.last_latency_ms || 85,
            source: p.source_name || `Targeted ${pInfo.name} Feed`,
            verified_active: p.current_status === 'ACTIVE',
            timestamp: p.created_at || new Date().toISOString()
          };
        });
        setHarvestedProxies(mapped);
      } else {
        setHarvestedProxies([]);
      }
    } catch (err: any) {
      setHarvestFeedback('Error during country harvest: ' + err.message);
    } finally {
      setIsHarvesting(false);
    }
  };

  // Run on mount
  useEffect(() => {
    harvestCountryProxies('PK');
  }, []);

  const handleCountrySelect = (code: string) => {
    setSelectedCountry(code);
    setHarvestedProxies([]);
    harvestCountryProxies(code);
  };

  // Instant single proxy test
  const handleTestProxy = async (proxy: LiveDiscoveredProxy) => {
    setTestingEndpoint(proxy.normalized_endpoint);
    try {
      const ingestRes = await fetch('/api/proxies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: proxy.normalized_endpoint,
          protocol: proxy.protocol,
          source_type: 'manual'
        })
      });
      const ingestData = await ingestRes.json();
      const proxyId = ingestData.record?.id;

      if (proxyId) {
        const checkRes = await fetch(`/api/proxies/${proxyId}/check`, { method: 'POST' });
        const checkData = await checkRes.json();
        setTestResults(prev => ({
          ...prev,
          [proxy.normalized_endpoint]: {
            status: checkData.checkResult?.status || 'UNKNOWN',
            latency: checkData.checkResult?.latency_ms || proxy.latency_ms,
            handshake: checkData.checkResult?.handshake_success,
            statusCode: checkData.checkResult?.status_code
          }
        }));
        if (onProxyIngested) onProxyIngested();
      }
    } catch (e: any) {
      setTestResults(prev => ({
        ...prev,
        [proxy.normalized_endpoint]: {
          status: 'INACTIVE',
          error: e.message
        }
      }));
    } finally {
      setTestingEndpoint(null);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleExport = (format: 'txt' | 'json') => {
    if (harvestedProxies.length === 0) return;
    let content = '';
    let mime = 'text/plain';
    let filename = `proxies_${selectedCountry}_${Date.now()}`;

    if (format === 'txt') {
      content = harvestedProxies.map(p => `${p.ip}:${p.port}`).join('\n');
      filename += '.txt';
    } else {
      content = JSON.stringify(harvestedProxies, null, 2);
      mime = 'application/json';
      filename += '.json';
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Client filtering on harvested list
  const filteredList = harvestedProxies.filter(p => {
    if (protocolFilter !== 'all' && p.protocol !== protocolFilter) return false;
    if (tableSearch) {
      const q = tableSearch.toLowerCase();
      return (
        p.normalized_endpoint.toLowerCase().includes(q) ||
        p.ip.toLowerCase().includes(q) ||
        p.port.toString().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-950/70 via-slate-900/90 to-blue-950/70 border border-cyan-500/30 p-6 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-20 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
                <Globe className="w-4 h-4" />
                TARGETED GEO PROXY HARVESTER
              </span>
              <span className="px-2.5 py-1 rounded text-[11px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-2">
                <CountryFlag code={currentCountryInfo.code} size="xs" />
                <span>ACTIVE TARGET: {currentCountryInfo.name.toUpperCase()} [{currentCountryInfo.code}]</span>
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight mt-1 flex items-center gap-3">
              <CountryFlag code={currentCountryInfo.code} size="lg" />
              <span>Extract & Scrape {currentCountryInfo.name} Proxies</span>
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Choose any country in the world (Pakistan, India, USA, etc.) to immediately scrape and stream authentic live proxies exclusive to that region with instant TCP health verification.
            </p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => harvestCountryProxies(selectedCountry)}
              disabled={isHarvesting}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-extrabold text-xs bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-lg shadow-cyan-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <Zap className={`w-4 h-4 ${isHarvesting ? 'animate-spin' : 'fill-current'}`} />
              <CountryFlag code={currentCountryInfo.code} size="xs" />
              <span>
                {isHarvesting 
                  ? `Harvesting ${currentCountryInfo.name}...` 
                  : `Find ${currentCountryInfo.name} Proxies Now`}
              </span>
            </button>
          </div>
        </div>

        {/* Feedback message */}
        {harvestFeedback && (
          <div className="mt-4 p-3.5 bg-cyan-500/20 border border-cyan-500/40 rounded-xl text-xs font-semibold text-cyan-200 flex items-center gap-2.5 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{harvestFeedback}</span>
          </div>
        )}
      </div>

      {/* Country Selection Command Center */}
      <div className="bg-[#0c1324] border border-[#1a2745] rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-bold text-white tracking-wide">
              Step 1: Choose Your Target Country
            </h2>
            <span className="text-xs text-slate-400 ml-1">
              (Harvester extracts ONLY selected nation)
            </span>
          </div>

          {/* Full Searchable Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300">All Countries:</span>
            <select
              value={selectedCountry}
              onChange={(e) => handleCountrySelect(e.target.value)}
              className="bg-[#141e36] border border-[#223359] text-white text-xs rounded-xl px-3.5 py-2 font-medium focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="ALL">🌐 All Countries (Global)</option>
              <option disabled>── Popular Countries ──</option>
              {POPULAR_COUNTRIES.filter(c => c.code !== 'ALL').map(c => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.code})
                </option>
              ))}
              <option disabled>── All 200+ Nations ──</option>
              {ALL_COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick-Select Country Chips */}
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
            ⚡ Quick Country Selector (One-Click Target):
          </div>
          <div className="flex flex-wrap gap-2">
            {POPULAR_COUNTRIES.map((c) => {
              const isSelected = selectedCountry === c.code;
              return (
                <button
                  key={c.code}
                  onClick={() => handleCountrySelect(c.code)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/30 border border-cyan-400'
                      : 'bg-[#121c33] text-slate-300 hover:text-white hover:bg-[#182645] border border-[#1f2f54]'
                  }`}
                >
                  <CountryFlag code={c.code} size="sm" />
                  <span>{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Harvest Options & Protocol Filters */}
        <div className="pt-3 border-t border-[#1a2745] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Protocol */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Protocol:</span>
              <div className="flex items-center bg-[#141e36] rounded-lg p-1 border border-[#202f52]">
                {['all', 'http', 'socks5', 'socks4'].map(p => (
                  <button
                    key={p}
                    onClick={() => setProtocolFilter(p)}
                    className={`px-2.5 py-1 rounded text-xs font-mono uppercase font-bold transition-all ${
                      protocolFilter === p
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Target Count:</span>
              <select
                value={requestedCount}
                onChange={(e) => setRequestedCount(parseInt(e.target.value, 10))}
                className="bg-[#141e36] border border-[#202f52] text-xs text-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-cyan-400 cursor-pointer font-medium"
              >
                <option value={500}>500 Proxies</option>
                <option value={1000}>1,000 Proxies</option>
                <option value={2500}>2,500 Proxies</option>
                <option value={5000}>5,000 Proxies</option>
                <option value={10000}>10,000 Proxies</option>
                <option value={25000}>25,000 Proxies (Unlimited)</option>
              </select>
            </div>
          </div>

          {/* Export & Copy Actions */}
          <div className="flex items-center gap-2">
            <a
              href={`/api/proxies/export?format=txt&country=${selectedCountry}`}
              download
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border border-cyan-400/30 transition-all shadow-md"
              title="Download all proxies for this country from DB"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export All DB .TXT</span>
            </a>

            <button
              onClick={() => handleExport('json')}
              disabled={harvestedProxies.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#172342] hover:bg-[#1f305c] text-slate-300 border border-[#233358] transition-all disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export .JSON</span>
            </button>

            <button
              onClick={() => {
                const text = harvestedProxies.map(p => `${p.ip}:${p.port}`).join('\n');
                handleCopy(text, 'all');
              }}
              disabled={harvestedProxies.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#172342] hover:bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 transition-all disabled:opacity-40"
            >
              {copiedText === 'all' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedText === 'all' ? 'Copied All!' : 'Copy All IP:Ports'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Discovered Proxies Table for this Country */}
      <div className="bg-[#0a0f1d] border border-[#19243f] rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-[#19243f] flex flex-wrap items-center justify-between gap-3 bg-[#0e162b]/80">
          <div className="flex items-center gap-2.5">
            <CountryFlag code={currentCountryInfo.code} size="md" />
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                <span>{currentCountryInfo.name} Live Proxies Inventory</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {filteredList.length} PROXIES
                </span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search host or port..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="pl-8 pr-3 py-1 bg-[#131d35] border border-[#1e2d52] rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 w-48"
              />
            </div>
          </div>
        </div>

        {filteredList.length === 0 ? (
          <div className="py-20 text-center">
            {isHarvesting ? (
              <>
                <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
                <div className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-200">
                  <CountryFlag code={currentCountryInfo.code} size="xs" />
                  <span>Harvesting authentic {currentCountryInfo.name} proxies...</span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Querying GeoNode API, ProxyScrape feeds, and global proxy mirrors
                </div>
              </>
            ) : (
              <>
                <Globe className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <div className="text-sm font-semibold text-slate-300">
                  No proxies currently buffered for {currentCountryInfo.name}
                </div>
                <div className="text-xs text-slate-500 mt-1 mb-4">
                  Click the button below to start real-time multi-source scraping for {currentCountryInfo.name}
                </div>
                <button
                  onClick={() => harvestCountryProxies(selectedCountry)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <CountryFlag code={currentCountryInfo.code} size="xs" />
                  <span>⚡ Harvest {currentCountryInfo.name} Proxies Now</span>
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#151f38] max-h-[600px] overflow-y-auto">
            {filteredList.map((proxy, idx) => {
              const isCopied = copiedText === proxy.normalized_endpoint;
              const isChecking = testingEndpoint === proxy.normalized_endpoint;
              const testResult = testResults[proxy.normalized_endpoint];

              return (
                <div
                  key={`${proxy.normalized_endpoint}-${idx}`}
                  className="p-3.5 px-5 flex items-center justify-between hover:bg-[#121c33]/70 transition-colors"
                >
                  {/* Left: Geo, Protocol, Host & Port */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2.5 w-36">
                      <CountryFlag code={proxy.country_code} size="md" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate max-w-[105px]">
                          {proxy.country_name || getCountryInfo(proxy.country_code).name}
                        </div>
                        <div className="text-[10px] text-cyan-400 font-mono font-bold">
                          [{proxy.country_code}]
                        </div>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                      proxy.protocol === 'socks5'
                        ? 'text-blue-400 bg-blue-500/10 border-blue-500/30'
                        : proxy.protocol === 'socks4'
                        ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30'
                        : proxy.protocol === 'https'
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                        : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
                    }`}>
                      {proxy.protocol}
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-100 selection:bg-blue-600">
                        {proxy.ip}:{proxy.port}
                      </span>
                      <button
                        onClick={() => handleCopy(`${proxy.ip}:${proxy.port}`, proxy.normalized_endpoint)}
                        className="text-slate-400 hover:text-cyan-300 p-1 rounded transition-colors cursor-pointer"
                        title="Copy IP:Port"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <span className="hidden md:inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-[#141e36] text-slate-300 border border-[#202f54]">
                      {proxy.anonymity.toUpperCase()}
                    </span>
                  </div>

                  {/* Right: Latency, Live Probe Results & Test Button */}
                  <div className="flex items-center gap-4">
                    {/* Live Test Outcome (if checked) */}
                    {testResult && (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                        testResult.status === 'ACTIVE'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}>
                        {testResult.status === 'ACTIVE' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {testResult.status} ({testResult.latency}ms)
                      </span>
                    )}

                    <div className="text-right">
                      <div className={`font-mono text-xs font-bold ${
                        proxy.latency_ms < 100
                          ? 'text-emerald-400'
                          : proxy.latency_ms < 300
                          ? 'text-cyan-300'
                          : 'text-amber-400'
                      }`}>
                        {proxy.latency_ms} ms
                      </div>
                      <div className="text-[10px] text-slate-400">RTT</div>
                    </div>

                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      ACTIVE
                    </span>

                    <button
                      onClick={() => handleTestProxy(proxy)}
                      disabled={isChecking}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#1a2647] hover:bg-cyan-600 text-slate-200 hover:text-white border border-[#263763] transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isChecking ? (
                        <RefreshCw className="w-3 h-3 animate-spin text-cyan-300" />
                      ) : (
                        <Zap className="w-3 h-3 text-cyan-400" />
                      )}
                      <span>Test Live</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
