import { useStore } from '../store';
import { FilterBar } from '../components/FilterBar';
import { FundingTable } from '../components/FundingTable';

export function FundingRatesPage() {
  const { totalPairs } = useStore();

  return (
    <div className="flex flex-col h-full">
      {/* Slim header — hidden on mobile to maximise table space */}
      <div className="hidden sm:flex flex-shrink-0 bg-[#0b0b0d] border-b border-[#1d1d22] px-4 py-2 items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-[#475569] font-bold">Funding Rates</span>
        <span className="text-[10px] text-[#374151] font-mono">{totalPairs.toLocaleString()} pairs tracked</span>
      </div>

      {/* Filter bar */}
      <FilterBar />

      {/* Table — takes all remaining height */}
      <div className="flex-1 min-h-0 overflow-hidden p-1.5 sm:p-2 md:p-3">
        <div className="h-full bg-[#0d1017] border border-[#1e2430] rounded-lg overflow-hidden flex flex-col">
          <FundingTable />
        </div>
      </div>
    </div>
  );
}
