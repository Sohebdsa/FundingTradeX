import { useStore } from '../store';
import { FilterBar } from '../components/FilterBar';
import { FundingTable } from '../components/FundingTable';
import { Activity } from 'lucide-react';

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-[#0d1017] border border-[#1e2430] rounded-lg px-3 py-2.5 flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest text-[#475569] font-medium">{label}</span>
      <span className="text-lg font-bold font-mono" style={{ color: color || '#f1f5f9' }}>{value}</span>
      {sub && <span className="text-[10px] text-[#374151] truncate">{sub}</span>}
    </div>
  );
}

export function FundingRatesPage() {
  const { fundingRates, totalPairs } = useStore();

  const extreme = fundingRates.filter(d => Math.abs(d.avgRate) > 0.05).length;
  const topPos = fundingRates.filter(d => d.avgRate > 0).sort((a, b) => b.avgRate - a.avgRate)[0];
  const topNeg = fundingRates.filter(d => d.avgRate < 0).sort((a, b) => a.avgRate - b.avgRate)[0];

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex-shrink-0 bg-[#0b0b0d] border-b border-[#1d1d22] px-3 md:px-5 py-3 flex items-center gap-3">
        <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
          <Activity size={13} className="text-primary" />
        </div>
        <div>
          <h1 className="text-sm font-bold uppercase tracking-widest text-[#f1f5f9]">Funding Rates</h1>
          <p className="text-[10px] text-[#475569]">Real-time cross-exchange perpetual funding data</p>
        </div>
        <div className="ml-auto text-[10px] text-[#374151] font-mono hidden sm:block">
          {totalPairs.toLocaleString()} pairs tracked
        </div>
      </div>

      {/* Stat strip */}
      <div className="flex-shrink-0 px-2 md:px-3 py-2 grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-[#050505] border-b border-[#1d1d22]">
        <StatCard label="Tracked Pairs" value={totalPairs} sub="All USDT Perps" />
        <StatCard label="Extreme Funding" value={extreme} sub="Abs rate > 0.05%" color="#ef4444" />
        <StatCard label="Top Long" value={topPos ? `${topPos.avgRate.toFixed(3)}%` : '—'} sub={topPos?.symbol.replace('USDT', '')} color="#ef4444" />
        <StatCard label="Top Short" value={topNeg ? `${topNeg.avgRate.toFixed(3)}%` : '—'} sub={topNeg?.symbol.replace('USDT', '')} color="#10b981" />
      </div>

      {/* Filter bar */}
      <FilterBar />

      {/* Table — takes remaining height */}
      <div className="flex-1 min-h-0 overflow-hidden p-2 md:p-3">
        <div className="h-full bg-[#0d1017] border border-[#1e2430] rounded-lg overflow-hidden flex flex-col">
          <FundingTable />
        </div>
      </div>
    </div>
  );
}
