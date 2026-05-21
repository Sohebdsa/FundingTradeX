import { useStore } from '../store';
import { FilterBar } from '../components/FilterBar';
import { FundingTable } from '../components/FundingTable';
import { BarChart2, Activity } from 'lucide-react';

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-[#0d1017] border border-[#1e2430] rounded-lg px-4 py-3 flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-widest text-[#475569] font-medium">{label}</span>
      <span className="text-xl font-bold font-mono" style={{ color: color || '#f1f5f9' }}>{value}</span>
      {sub && <span className="text-[10px] text-[#374151]">{sub}</span>}
    </div>
  );
}

function FundingHeatmap() {
  const { topFunding } = useStore();
  if (topFunding.length === 0) return (
    <div className="h-full flex items-center justify-center text-[#374151] text-xs">Loading heatmap...</div>
  );

  const maxAbs = Math.max(...topFunding.map(d => Math.abs(d.avgRate)), 0.001);

  return (
    <div className="grid grid-cols-5 gap-1 p-1">
      {topFunding.slice(0, 20).map(d => {
        const intensity = Math.min(Math.abs(d.avgRate) / maxAbs, 1);
        const isPos = d.avgRate > 0;
        const bg = isPos
          ? `rgba(239,68,68,${0.1 + intensity * 0.7})`
          : `rgba(16,185,129,${0.1 + intensity * 0.7})`;
        return (
          <div key={d.symbol} title={`${d.symbol}: ${d.avgRate.toFixed(4)}%`}
            className="rounded p-2 flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-transform"
            style={{ background: bg, border: `1px solid ${isPos ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}` }}>
            <span className="text-[10px] font-bold text-white leading-none">{d.symbol.replace('USDT', '')}</span>
            <span className="text-[8px] font-mono mt-0.5" style={{ color: isPos ? '#fca5a5' : '#6ee7b7' }}>
              {d.avgRate > 0 ? '+' : ''}{d.avgRate.toFixed(3)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function MarketOverview() {
  const { fundingRates, arbitrageOpportunities, signals, volumeSpikes, totalPairs } = useStore();

  const extreme = fundingRates.filter(d => Math.abs(d.avgRate) > 0.05).length;
  const topPos = fundingRates.filter(d => d.avgRate > 0).sort((a, b) => b.avgRate - a.avgRate)[0];
  const topNeg = fundingRates.filter(d => d.avgRate < 0).sort((a, b) => a.avgRate - b.avgRate)[0];

  return (
    <div className="flex flex-col h-full">
      <FilterBar />

      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto md:overflow-hidden p-2 md:p-3 gap-2 md:gap-3">
        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-1.5 md:gap-2 flex-shrink-0">
          <StatCard label="Tracked Pairs" value={totalPairs} sub="All USDT Perps" />
          <StatCard label="Arb Opps" value={arbitrageOpportunities.length} sub="Cross-exchange spread" color="#f59e0b" />
          <StatCard label="Signals" value={signals.length} sub="Crowd positioning" color="#8b5cf6" />
          <StatCard label="Extreme" value={extreme} sub="Abs rate > 0.05%" color="#ef4444" />
          <StatCard label="Top Long" value={topPos ? `${topPos.avgRate.toFixed(3)}%` : '—'} sub={topPos?.symbol.replace('USDT', '')} color="#ef4444" />
          <StatCard label="Top Short" value={topNeg ? `${topNeg.avgRate.toFixed(3)}%` : '—'} sub={topNeg?.symbol.replace('USDT', '')} color="#10b981" />
        </div>

        {/* Main grid — vertical on mobile, side-by-side on xl */}
        <div className="flex-1 flex flex-col xl:grid xl:grid-cols-[1fr_320px] gap-2 md:gap-3 min-h-0">

          {/* Table — fixed height on mobile, flex on desktop */}
          <div className="bg-[#0d1017] border border-[#1e2430] rounded-lg overflow-hidden flex flex-col h-[55vh] md:h-auto md:min-h-0 xl:min-h-0">
            <FundingTable />
          </div>

          {/* Heatmap + Volume Spikes — stacked below on mobile */}
          <div className="flex flex-col gap-2 md:gap-3 flex-shrink-0 xl:flex-shrink xl:min-h-0">
            {/* Funding Heatmap */}
            <div className="bg-[#0d1017] border border-[#1e2430] rounded-lg">
              <div className="px-4 py-3 border-b border-[#1e2430] flex items-center gap-2">
                <Activity size={13} className="text-[#f59e0b]" />
                <span className="text-xs font-bold uppercase tracking-wider">Funding Heatmap</span>
                <span className="ml-auto text-[9px] text-[#475569]">Top 20 by rate</span>
              </div>
              <div className="p-2">
                <FundingHeatmap />
              </div>
            </div>

            {/* Volume Spikes */}
            {volumeSpikes.length > 0 && (
              <div className="bg-[#0d1017] border border-[#1e2430] rounded-lg">
                <div className="px-4 py-3 border-b border-[#1e2430] flex items-center gap-2">
                  <BarChart2 size={13} className="text-[#06b6d4]" />
                  <span className="text-xs font-bold uppercase tracking-wider">Volume Spikes</span>
                </div>
                <div className="p-2 flex flex-col gap-1 max-h-48 md:max-h-36 overflow-y-auto">
                  {volumeSpikes.slice(0, 8).map(v => (
                    <div key={v.symbol} className="flex items-center justify-between px-2 py-1 rounded bg-[#0a0c10] hover:bg-[#161c26]">
                      <span className="font-bold text-[11px]">{v.symbol.replace('USDT', '')}</span>
                      <span className={`text-[10px] font-mono ${v.type === 'BUYING' ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                        {v.pctChg > 0 ? '+' : ''}{v.pctChg.toFixed(2)}%
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${v.type === 'BUYING' ? 'bg-[#10b981]/10 text-[#10b981]' : 'bg-[#ef4444]/10 text-[#ef4444]'
                        }`}>{v.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
