import { useStore } from '../store';
import type { FilterMode } from '../store';
import { Search, Filter, TrendingUp, TrendingDown, Zap, LayoutList, Volume2, Rocket } from 'lucide-react';

const FILTERS: { mode: FilterMode; label: string; icon: React.ReactNode; color: string }[] = [
  { mode: 'all',              label: 'All',           icon: <LayoutList size={12} />,  color: '#f97316' }, // orange primary
  { mode: 'high_funding',     label: 'High Funding',  icon: <Zap size={12} />,          color: '#ea580c' }, // deep orange warning
  { mode: 'extreme_positive', label: 'Longs Trapped', icon: <TrendingDown size={12} />, color: '#ef4444' },
  { mode: 'extreme_negative', label: 'Shorts Trapped',icon: <TrendingUp size={12} />,   color: '#10b981' },
  { mode: 'arbitrage',        label: 'Arb Opps',      icon: <Filter size={12} />,       color: '#ea580c' },
  { mode: 'high_max_spread',  label: 'High Spread',   icon: <TrendingUp size={12} />,   color: '#f97316' },
  { mode: 'low_max_spread',   label: 'Low Spread',    icon: <TrendingDown size={12} />,  color: '#64748b' },
  { mode: 'meme',             label: 'Meme Coins',    icon: <Rocket size={12} />,       color: '#f97316' },
  { mode: 'volume_spike',     label: 'Vol Spikes',    icon: <Volume2 size={12} />,      color: '#ea580c' },
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
    high_max_spread:  fundingRates.filter(d => {
      const r = [d.binance.rate, d.bybit.rate]; if (d.blofin) r.push(d.blofin.rate);
      return (Math.max(...r) - Math.min(...r)) > 0.01;
    }).length,
    low_max_spread:   fundingRates.length,
  };

  return (
    <div className="flex-shrink-0 bg-panel border-b border-border">
      {/* Search row */}
      <div className="px-3 pt-2 pb-1.5">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-dark" />
          <input
            type="text" placeholder="Search pair..." value={searchQuery}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-panel-hover border border-border rounded pl-7 pr-3 py-1.5 text-xs text-[#f1f5f9] placeholder-text-dark focus:outline-none focus:border-primary/50"
          />
        </div>
      </div>

      {/* Filter chips — horizontal scroll on mobile */}
      <div className="flex gap-1.5 px-3 pb-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map(({ mode, label, icon, color }) => {
          const active = filterMode === mode;
          return (
            <button key={mode} onClick={() => setFilter(mode)}
              style={active ? { borderColor: color, color, background: `${color}15` } : {}}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider border transition-all whitespace-nowrap flex-shrink-0 ${
                active ? '' : 'border-border text-text-muted hover:text-[#f1f5f9] hover:border-text-dark'
              }`}
            >
              {icon}{label}
              {counts[mode] > 0 && (
                <span className="ml-0.5 text-[9px] px-1 rounded"
                  style={{ background: active ? `${color}20` : 'var(--color-border)', color: active ? color : 'var(--color-text-muted)' }}>
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
