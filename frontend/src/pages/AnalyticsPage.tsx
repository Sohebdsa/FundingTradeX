import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { ArbitrageOpportunities } from '../components/ArbitrageOpportunities';
import { SignalFeed } from '../components/SignalFeed';
import { Grid3X3, BarChart2, Activity, Volume2, Zap, ExternalLink, TrendingUp } from 'lucide-react';

// ─── Funding Heatmap ──────────────────────────────────────────────────────────
function FundingHeatmap() {
  const { fundingRates } = useStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const sorted = [...fundingRates]
    .filter(d => !search || d.symbol.includes(search.toUpperCase()))
    .sort((a, b) => Math.abs(b.avgRate) - Math.abs(a.avgRate))
    .slice(0, 120);

  const maxAbs = Math.max(...sorted.map(d => Math.abs(d.avgRate)), 0.001);

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center gap-3 flex-shrink-0">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Filter symbol…"
          className="bg-[#161c26] border border-[#1e2430] rounded px-3 py-1.5 text-xs text-[#f1f5f9] placeholder-[#475569] focus:outline-none focus:border-[#2563eb]/50 w-36"
        />
        <span className="text-[10px] text-[#475569]">{sorted.length} pairs · color = avg funding rate</span>
        <div className="ml-auto flex items-center gap-4 text-[10px]">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#10b981]" /> Neg (shorts pay)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#ef4444]" /> Pos (longs pay)</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }}>
          {sorted.map(d => {
            const r = d.avgRate, isPos = r > 0;
            const intensity = Math.min(Math.abs(r) / maxAbs, 1);
            const bg = isPos
              ? `rgba(239,68,68,${0.08 + intensity * 0.72})`
              : `rgba(16,185,129,${0.08 + intensity * 0.72})`;
            const border = isPos ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)';
            return (
              <div
                key={d.symbol}
                onClick={() => navigate(`/coin/${d.symbol}`)}
                title={`${d.symbol} | Binance: ${d.binance.rate.toFixed(4)}% Bybit: ${d.bybit.rate.toFixed(4)}% Avg: ${d.avgRate.toFixed(4)}%`}
                className="rounded p-2 flex flex-col items-center cursor-pointer hover:scale-105 transition-transform select-none"
                style={{ background: bg, border: `1px solid ${border}` }}
              >
                <span className="text-[10px] font-bold text-white leading-none">{d.symbol.replace('USDT', '')}</span>
                <span className="text-[8px] font-mono mt-0.5" style={{ color: isPos ? '#fca5a5' : '#6ee7b7' }}>
                  {r > 0 ? '+' : ''}{r.toFixed(3)}%
                </span>
                {d.vol24h > 1e8 && <span className="text-[7px] text-[#94a3b8] mt-0.5">🔥 High Vol</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── OI Bar Chart ─────────────────────────────────────────────────────────────
function OIChart() {
  const { openInterestData } = useStore();
  const top = openInterestData.slice(0, 20);
  if (!top.length) return <div className="flex items-center justify-center h-full text-[#374151] text-xs">Loading OI data…</div>;
  const maxOI = Math.max(...top.map(d => d.totalOI * d.price));

  return (
    <div className="flex flex-col gap-1.5 overflow-auto h-full pr-1">
      {top.map(d => {
        const total = d.totalOI * d.price;
        const bPct = d.binanceOI / (d.totalOI || 1) * 100;
        const byPct = d.bybitOI / (d.totalOI || 1) * 100;
        const barW = (total / maxOI) * 100;
        const fmt = (v: number) => v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : `$${(v / 1e6).toFixed(0)}M`;
        return (
          <div key={d.symbol} className="flex-shrink-0">
            <div className="flex justify-between text-[10px] mb-0.5">
              <span className="font-bold text-[#e2e8f0]">{d.symbol.replace('USDT', '')}</span>
              <span className="text-[#475569] font-mono">{fmt(total)}</span>
            </div>
            <div className="h-3 rounded overflow-hidden bg-[#0a0c10] flex" style={{ width: `${barW}%` }}>
              <div className="h-full bg-[#f59e0b]" style={{ width: `${bPct}%` }} title={`Binance ${bPct.toFixed(0)}%`} />
              <div className="h-full bg-[#8b5cf6]" style={{ width: `${byPct}%` }} title={`Bybit ${byPct.toFixed(0)}%`} />
            </div>
          </div>
        );
      })}
      <div className="flex items-center gap-4 text-[10px] text-[#475569] mt-2 flex-shrink-0">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-[#f59e0b] rounded" /> Binance</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-[#8b5cf6] rounded" /> Bybit</span>
      </div>
    </div>
  );
}

// ─── Footprint Table ──────────────────────────────────────────────────────────
function FootprintPanel() {
  const { fundingRates } = useStore();
  const navigate = useNavigate();
  const [sym, setSym] = useState('BTCUSDT');
  const [candles, setCandles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:5000/api/klines?symbol=${sym}&interval=15m&limit=30`)
      .then(r => r.json())
      .then(raw => {
        setCandles(raw.map((k: number[]) => ({ time: k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5] })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sym]);

  const avgVol = candles.length ? candles.reduce((s, c) => s + c.volume, 0) / candles.length : 1;

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center gap-2 flex-shrink-0">
        <select value={sym} onChange={e => setSym(e.target.value)}
          className="bg-[#161c26] border border-[#1e2430] rounded px-2 py-1.5 text-xs text-[#f1f5f9] focus:outline-none">
          {fundingRates.slice(0, 50).map(d => <option key={d.symbol} value={d.symbol}>{d.symbol}</option>)}
        </select>
        <span className="text-[10px] text-[#475569]">Footprint · 15m · last 30 candles</span>
        <button onClick={() => navigate(`/chart/${sym}`)} className="ml-auto flex items-center gap-1 text-[10px] text-[#2563eb] hover:text-[#60a5fa]">
          <ExternalLink size={11} /> Full Chart
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-1">
            {[...candles].reverse().map((c, i) => {
              const bull = c.close >= c.open;
              const range = c.high - c.low || 0.0001;
              const buyFrac = bull ? (c.close - c.low) / range : (c.high - c.close) / range;
              const buyVol = c.volume * buyFrac;
              const sellVol = c.volume - buyVol;
              const spike = c.volume / avgVol;
              const maxSide = Math.max(buyVol, sellVol);
              return (
                <div key={i} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-[#161c26]">
                  <span className="text-[9px] text-[#374151] font-mono w-10 flex-shrink-0">
                    {new Date(c.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className={`text-[10px] font-mono w-6 flex-shrink-0 ${bull ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                    {bull ? '▲' : '▼'}
                  </span>
                  {/* Sell bar (left) */}
                  <div className="flex-1 flex justify-end">
                    <div className="h-3 rounded-l bg-[#ef4444]/60 transition-all"
                      style={{ width: `${(sellVol / maxSide) * 100}%` }} />
                  </div>
                  {/* Center divider */}
                  <div className="w-px h-3 bg-[#374151] flex-shrink-0" />
                  {/* Buy bar (right) */}
                  <div className="flex-1">
                    <div className="h-3 rounded-r bg-[#10b981]/60 transition-all"
                      style={{ width: `${(buyVol / maxSide) * 100}%` }} />
                  </div>
                  {spike > 2 && <span className="text-[8px] text-[#f59e0b] font-mono flex-shrink-0">{spike.toFixed(1)}x</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 text-[9px] text-[#475569] flex-shrink-0 border-t border-[#1e2430] pt-2">
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-[#ef4444]/60" /> Sell Vol</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-[#10b981]/60" /> Buy Vol</span>
        <span className="text-[#f59e0b]">Nx = volume spike</span>
      </div>
    </div>
  );
}

// ─── Volume Spikes ─────────────────────────────────────────────────────────────
function VolumeSpikePanel() {
  const { volumeSpikes, fundingRates } = useStore();
  const navigate = useNavigate();
  if (!volumeSpikes.length) return (
    <div className="flex items-center justify-center h-full text-[#374151] text-xs">No major volume spikes detected.</div>
  );
  return (
    <div className="flex flex-col gap-1.5 overflow-auto h-full">
      {volumeSpikes.map(v => {
        const coin = fundingRates.find(d => d.symbol === v.symbol);
        return (
          <div key={v.symbol} onClick={() => navigate(`/coin/${v.symbol}`)}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-[#1e2430] bg-[#0a0c10] hover:bg-[#161c26] cursor-pointer transition-colors">
            <div className="flex items-center gap-2.5">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${v.type === 'BUYING' ? 'bg-[#10b981] shadow-[0_0_5px_#10b981]' : 'bg-[#ef4444] shadow-[0_0_5px_#ef4444]'}`} />
              <div>
                <div className="font-bold text-xs text-[#f1f5f9]">{v.symbol.replace('USDT', '')}</div>
                <div className="text-[9px] text-[#475569]">{v.vol24h > 1e9 ? `$${(v.vol24h / 1e9).toFixed(2)}B` : `$${(v.vol24h / 1e6).toFixed(0)}M`} vol</div>
              </div>
            </div>
            <div className="text-right">
              <div className={`font-mono font-bold text-sm ${v.pctChg >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                {v.pctChg > 0 ? '+' : ''}{v.pctChg.toFixed(2)}%
              </div>
              <div className={`text-[9px] font-bold uppercase ${v.type === 'BUYING' ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>{v.type}</div>
            </div>
            {coin && (
              <div className="text-right ml-3">
                <div className="text-[9px] text-[#475569]">Avg Rate</div>
                <div className={`font-mono text-[10px] font-bold ${coin.avgRate < 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>{coin.avgRate.toFixed(4)}%</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'heatmap',   label: 'Funding Heatmap',   icon: Grid3X3,   color: '#3b82f6' },
  { id: 'oi',        label: 'Open Interest',      icon: BarChart2, color: '#f59e0b' },
  { id: 'footprint', label: 'Footprint',          icon: Activity,  color: '#10b981' },
  { id: 'volume',    label: 'Volume Spikes',      icon: Volume2,   color: '#06b6d4' },
  { id: 'signals',   label: 'Signals',            icon: Zap,       color: '#8b5cf6' },
  { id: 'arb',       label: 'Arbitrage',          icon: TrendingUp, color: '#f59e0b' },
] as const;
type TabId = typeof TABS[number]['id'];

export function AnalyticsPage() {
  const [tab, setTab] = useState<TabId>('heatmap');
  const { fundingRates, signals, volumeSpikes, arbitrageOpportunities } = useStore();
  const counts: Record<TabId, number> = {
    heatmap:   fundingRates.length,
    oi:        0,
    footprint: 0,
    volume:    volumeSpikes.length,
    signals:   signals.length,
    arb:       arbitrageOpportunities.length,
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab bar */}
      <div className="flex-shrink-0 bg-[#0d1017] border-b border-[#1e2430] px-4 pt-3 flex items-end gap-1 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon, color }) => {
          const active = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-t text-[10px] font-bold uppercase tracking-wider border-t border-l border-r transition-colors whitespace-nowrap ${
                active ? 'border-[#1e2430] bg-[#0a0c10] text-[#f1f5f9]' : 'border-transparent text-[#475569] hover:text-[#94a3b8]'
              }`}
              style={active ? { borderBottomColor: color, borderBottomWidth: 2 } : {}}>
              <Icon size={11} style={{ color: active ? color : undefined }} />
              {label}
              {counts[id] > 0 && (
                <span className="ml-0.5 text-[8px] px-1 rounded" style={{ background: active ? `${color}20` : '#1e2430', color: active ? color : '#475569' }}>
                  {counts[id]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden p-4">
        {tab === 'heatmap'   && <FundingHeatmap />}
        {tab === 'oi'        && <OIChart />}
        {tab === 'footprint' && <FootprintPanel />}
        {tab === 'volume'    && <VolumeSpikePanel />}
        {tab === 'signals'   && <SignalFeed />}
        {tab === 'arb'       && <ArbitrageOpportunities />}
      </div>
    </div>
  );
}
