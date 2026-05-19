import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useStore } from '../store';
import { Countdown } from './Countdown';
import { TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';

function rateColor(rate: number) {
  if (rate >  0.07) return 'text-[#ef4444]';
  if (rate >  0.03) return 'text-[#f97316]';
  if (rate < -0.07) return 'text-[#10b981]';
  if (rate < -0.03) return 'text-[#34d399]';
  return 'text-[#64748b]';
}
function fmtVol(n: number) {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${(n / 1e3).toFixed(0)}K`;
}

// Column layout as shared CSS grid template
const GRID = 'grid-cols-[32px_120px_100px_90px_90px_90px_90px_80px_36px_32px]';

function SkeletonRow({ i }: { i: number }) {
  return (
    <div className={`grid ${GRID} items-center px-2 py-2 border-b border-[#1e2430]/40`}>
      {Array.from({ length: 9 }).map((_, j) => (
        <div key={j} className="h-3 rounded animate-pulse bg-[#1e2430]"
          style={{ opacity: 0.4 + (i % 3) * 0.15, width: j === 1 ? '70%' : j === 0 ? '16px' : '80%' }} />
      ))}
      <div />
    </div>
  );
}

function RateCell({ rate }: { rate: number }) {
  const cls = rateColor(rate);
  return (
    <div className={`flex items-center justify-end gap-1 font-mono text-xs ${cls}`}>
      {rate >  0.01 ? <TrendingDown size={10} /> : rate < -0.01 ? <TrendingUp size={10} /> : <Minus size={10} />}
      {rate !== 0 ? `${rate.toFixed(4)}%` : '—'}
    </div>
  );
}

export function FundingTable() {
  const navigate = useNavigate();
  const { filteredRates, arbitrageOpportunities, fundingRates } = useStore();
  const rows = filteredRates();
  const arbSet = new Set(arbitrageOpportunities.map(a => a.symbol));
  const isLoading = fundingRates.length === 0;

  const parentRef = useRef<HTMLDivElement>(null);
  const ROW_H = 44;

  const virtualizer = useVirtualizer({
    count: isLoading ? 20 : rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_H,
    overscan: 8,
  });

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Table header */}
      <div className="flex-shrink-0 border-b border-[#1e2430] bg-[#0a0c10]">
        <div className={`grid ${GRID} items-center px-2 py-2 text-[10px] uppercase tracking-widest text-[#374151] font-medium`}>
          <div>#</div>
          <div>Asset</div>
          <div className="text-right">Price</div>
          <div className="text-right">Binance</div>
          <div className="text-right">Bybit</div>
          <div className="text-right">Avg Rate</div>
          <div className="text-right">24h Vol</div>
          <div className="text-right">Next Fund.</div>
          <div className="text-center">Arb</div>
          <div />
        </div>
      </div>

      {/* Virtualized rows */}
      <div ref={parentRef} className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map(vRow => {
            if (isLoading) {
              return (
                <div key={vRow.key} style={{ position: 'absolute', top: vRow.start, width: '100%', height: ROW_H }}>
                  <SkeletonRow i={vRow.index} />
                </div>
              );
            }

            const d = rows[vRow.index];
            if (!d) return null;
            const price = d.binance.price || 0;
            const nextFund = d.binance.nextFunding || d.bybit.nextFunding;
            const arb = arbSet.has(d.symbol);
            const isExtreme = Math.abs(d.avgRate) > 0.07;

            return (
              <div
                key={vRow.key}
                style={{ position: 'absolute', top: vRow.start, width: '100%', height: ROW_H }}
                onClick={() => navigate(`/coin/${d.symbol}`)}
                className={`grid ${GRID} items-center px-2 border-b border-[#1e2430]/50 cursor-pointer group transition-colors hover:bg-[#161c26] ${isExtreme ? 'bg-[#1a1510]/20' : ''}`}
              >
                {/* # */}
                <div className="text-[10px] text-[#374151]">{vRow.index + 1}</div>

                {/* Asset */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className={`w-0.5 h-5 rounded-full flex-shrink-0 ${
                    d.avgRate >  0.03 ? 'bg-[#ef4444]' :
                    d.avgRate < -0.03 ? 'bg-[#10b981]' : 'bg-[#1e2430]'
                  }`} />
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-[#e2e8f0] leading-none truncate">{d.symbol.replace('USDT', '')}</div>
                    <div className="text-[9px] text-[#374151]">PERP</div>
                  </div>
                </div>

                {/* Price */}
                <div className="text-right font-mono text-[11px] text-[#cbd5e1] truncate">
                  {price > 0 ? `$${price.toLocaleString(undefined, { maximumFractionDigits: 4 })}` : '—'}
                </div>

                {/* Binance rate */}
                <div><RateCell rate={d.binance.rate} /></div>

                {/* Bybit rate */}
                <div><RateCell rate={d.bybit.rate} /></div>

                {/* Avg rate */}
                <div className={`text-right font-mono font-bold text-xs ${rateColor(d.avgRate)}`}>
                  {d.avgRate.toFixed(4)}%
                </div>

                {/* 24h Vol */}
                <div className="text-right font-mono text-[10px] text-[#475569]">
                  {d.vol24h > 0 ? fmtVol(d.vol24h) : '—'}
                </div>

                {/* Next Funding */}
                <div className="flex justify-end">
                  <div className="bg-[#161c26] border border-[#1e2430] px-1.5 py-0.5 rounded text-[#64748b]">
                    <Countdown targetTimestamp={nextFund} />
                  </div>
                </div>

                {/* Arb dot */}
                <div className="flex justify-center">
                  {arb
                    ? <span className="w-2 h-2 rounded-full bg-[#f59e0b] shadow-[0_0_5px_#f59e0b]" />
                    : <span className="w-2 h-2 rounded-full bg-[#1e2430]" />}
                </div>

                {/* Chevron */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight size={12} className="text-[#374151]" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-3 py-1.5 border-t border-[#1e2430] bg-[#0a0c10] flex items-center justify-between">
        <span className="text-[10px] text-[#374151]">
          {isLoading ? 'Loading data…' : `${rows.length} / ${fundingRates.length} pairs`}
        </span>
        <span className="text-[10px] text-[#374151]">Click any row to open coin detail</span>
      </div>
    </div>
  );
}
