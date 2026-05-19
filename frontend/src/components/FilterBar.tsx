import { useStore } from '../store';
import type { FilterMode } from '../store';
import { Search, Filter, TrendingUp, TrendingDown, Zap, LayoutList, Volume2, Rocket } from 'lucide-react';

const FILTERS: { mode: FilterMode; label: string; icon: React.ReactNode; color: string }[] = [
  { mode: 'all',              label: 'All',           icon: <LayoutList size={12} />,  color: '#3b82f6' },
  { mode: 'high_funding',     label: 'High Funding',  icon: <Zap size={12} />,          color: '#f59e0b' },
  { mode: 'extreme_positive', label: 'Longs Trapped', icon: <TrendingDown size={12} />, color: '#ef4444' },
  { mode: 'extreme_negative', label: 'Shorts Trapped',icon: <TrendingUp size={12} />,   color: '#10b981' },
  { mode: 'arbitrage',        label: 'Arb Opps',      icon: <Filter size={12} />,       color: '#8b5cf6' },
  { mode: 'meme',             label: 'Meme Coins',    icon: <Rocket size={12} />,       color: '#ec4899' },
  { mode: 'volume_spike',     label: 'Vol Spikes',    icon: <Volume2 size={12} />,      color: '#06b6d4' },
];

export function FilterBar() {
  const { filterMode, setFilter, setSearch, searchQuery,
          fundingRates, arbitrageOpportunities, volumeSpikes } = useStore();

  const MEME = new Set(['DOGE','SHIB','PEPE','FLOKI','BONK','WIF','MEME','BOME','DOGS','NEIRO','POPCAT','COW','TURBO','BRETT']);
  const spikeSet = new Set(volumeSpikes.map(v => v.symbol));

  const counts: Record<FilterMode, number> = {
    all:              fundingRates.length,
    high_funding:     fundingRates.filter(d => Math.abs(d.avgRate) > 0.04).length,
    extreme_positive: fundingRates.filter(d => d.avgRate > 0.03).length,
    extreme_negative: fundingRates.filter(d => d.avgRate < -0.03).length,
    arbitrage:        arbitrageOpportunities.length,
    meme:             fundingRates.filter(d => MEME.has(d.symbol.replace('USDT',''))).length,
    volume_spike:     fundingRates.filter(d => spikeSet.has(d.symbol)).length,
  };

  return (
    <div className="flex-shrink-0 bg-[#0d1017] border-b border-[#1e2430] px-4 py-2.5 flex items-center gap-3 flex-wrap">
      <div className="relative w-44">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#475569]" />
        <input
          type="text" placeholder="Search pair..." value={searchQuery}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#161c26] border border-[#1e2430] rounded pl-7 pr-3 py-1.5 text-xs text-[#f1f5f9] placeholder-[#475569] focus:outline-none focus:border-[#2563eb]/50"
        />
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map(({ mode, label, icon, color }) => {
          const active = filterMode === mode;
          return (
            <button key={mode} onClick={() => setFilter(mode)}
              style={active ? { borderColor: color, color, background: `${color}15` } : {}}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider border transition-all ${
                active ? '' : 'border-[#1e2430] text-[#64748b] hover:text-[#94a3b8] hover:border-[#2e3846]'
              }`}
            >
              {icon}{label}
              {counts[mode] > 0 && (
                <span className="ml-0.5 text-[9px] px-1 rounded"
                  style={{ background: active ? `${color}20` : '#1e2430', color: active ? color : '#64748b' }}>
                  {counts[mode]}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
