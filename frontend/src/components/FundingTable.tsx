import { useRef, useState, useEffect } from 'react';
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
  return 'text-text-dark';
}

function fmtVol(n: number) {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${(n / 1e3).toFixed(0)}K`;
}

// Responsive grid: fewer columns on smaller containers
// We drive this off a container-width class applied to the wrapper div
const GRID_FULL  = 'grid-cols-[28px_1.5fr_1fr_1.1fr_1.3fr_1.3fr_1.3fr_1fr_0.9fr_28px]'; // ≥900px
const GRID_MED   = 'grid-cols-[24px_1.5fr_1fr_1.3fr_1.3fr_1.3fr_1fr_24px]';              // 600–900px (no vol, no blofin)
const GRID_SMALL = 'grid-cols-[24px_1.5fr_1.1fr_1.3fr_1.3fr_24px]';                      // <600px (rank, asset, spread, binance, bybit)

function SkeletonRow({ i, isMobile }: { i: number; isMobile: boolean }) {
  if (isMobile) {
    return (
      <div className="flex items-center justify-between px-3 py-3 border-b border-border/40 gap-2">
        <div className="flex items-center gap-2 flex-1">
          <div className="h-3 w-4 rounded animate-pulse bg-border opacity-50" />
          <div className="h-3 w-16 rounded animate-pulse bg-border opacity-50" />
        </div>
        <div className="h-3 w-14 rounded animate-pulse bg-border opacity-40" />
        <div className="h-3 w-12 rounded animate-pulse bg-border opacity-40" />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40">
      {Array.from({ length: 5 }).map((_, j) => (
        <div key={j} className="h-3 rounded animate-pulse bg-border flex-1"
          style={{ opacity: 0.4 + (i % 3) * 0.15 }} />
      ))}
    </div>
  );
}

function RateCell({ rate, nextFunding }: { rate: number; nextFunding?: number }) {
  const cls = rateColor(rate);
  return (
    <div className="flex flex-col items-end gap-0.5 select-none">
      <div className={`flex items-center gap-1 font-mono text-xs ${cls}`}>
        {rate > 0.01 ? <TrendingDown size={10} /> : rate < -0.01 ? <TrendingUp size={10} /> : <Minus size={10} />}
        {rate !== 0 ? `${rate.toFixed(4)}%` : '—'}
      </div>
      {rate !== 0 && nextFunding ? (
        <div className="text-[9px] text-text-dark font-mono">
          <Countdown targetTimestamp={nextFunding} />
        </div>
      ) : (
        <div className="text-[9px] text-[#272d37] font-mono">—:—:—</div>
      )}
    </div>
  );
}

// Mobile card row — compact single-line layout
function MobileRow({ d, index, onClick }: { d: any; index: number; onClick: () => void }) {
  const price = d.binance.price || 0;
  const rates = [d.binance.rate, d.bybit.rate];
  if (d.blofin) rates.push(d.blofin.rate);
  const maxSpread = Math.max(...rates) - Math.min(...rates);
  const spreadColor = maxSpread > 0.05 ? 'text-primary font-bold' : maxSpread > 0.01 ? 'text-text-muted' : 'text-text-dark';
  const isExtreme = Math.abs(d.avgRate) > 0.07;

  return (
    <div
      onClick={onClick}
      className={`flex items-center px-3 py-2.5 border-b border-border/50 cursor-pointer active:bg-panel-hover gap-2 ${isExtreme ? 'bg-[#291910]/20' : ''}`}
    >
      <div className="text-[10px] text-text-dark w-5 flex-shrink-0">{index + 1}</div>

      <div className={`w-0.5 h-4 rounded-full flex-shrink-0 ${
        d.avgRate > 0.03 ? 'bg-danger' : d.avgRate < -0.03 ? 'bg-success' : 'bg-border'
      }`} />

      <div className="flex-1 min-w-0">
        <div className="font-bold text-xs text-[#e2e8f0] leading-none truncate">
          {d.symbol.replace('USDT', '')}
        </div>
        <div className="text-[9px] text-text-dark mt-0.5 font-mono truncate">
          {price > 0 ? `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}
        </div>
      </div>

      <div className={`font-mono font-bold text-xs flex-shrink-0 ${rateColor(d.avgRate)}`}>
        {d.avgRate.toFixed(3)}%
      </div>

      <div className={`font-mono text-[10px] flex-shrink-0 ${spreadColor}`}>
        {maxSpread > 0 ? `Δ${maxSpread.toFixed(3)}%` : '—'}
      </div>

      <ChevronRight size={12} className="text-text-dark flex-shrink-0" />
    </div>
  );
}

// Responsive desktop row — shows different columns depending on containerWidth
function DesktopRow({
  d, index, onClick, containerWidth,
}: { d: any; index: number; onClick: () => void; containerWidth: number }) {
  const price = d.binance.price || 0;
  const isExtreme = Math.abs(d.avgRate) > 0.07;
  const rates = [d.binance.rate, d.bybit.rate];
  if (d.blofin) rates.push(d.blofin.rate);
  const maxSpread = Math.max(...rates) - Math.min(...rates);
  const spreadColor = maxSpread > 0.05
    ? 'text-primary font-bold'
    : maxSpread > 0.01
    ? 'text-text-muted'
    : 'text-text-dark';

  const isFull  = containerWidth >= 900;
  const isMed   = containerWidth >= 600 && containerWidth < 900;
  const isSmall = containerWidth < 600;
  const grid = isFull ? GRID_FULL : isMed ? GRID_MED : GRID_SMALL;

  return (
    <div
      onClick={onClick}
      className={`grid ${grid} items-center px-3 border-b border-border/50 cursor-pointer group transition-colors hover:bg-panel-hover ${
        isExtreme ? 'bg-[#291910]/20' : ''
      }`}
      style={{ height: 44 }}
    >
      {/* Rank */}
      <div className="text-[10px] text-text-dark">{index + 1}</div>

      {/* Asset */}
      <div className="flex items-center gap-1.5 min-w-0">
        <div className={`w-0.5 h-5 rounded-full flex-shrink-0 ${
          d.avgRate > 0.03 ? 'bg-danger' : d.avgRate < -0.03 ? 'bg-success' : 'bg-border'
        }`} />
        <div className="min-w-0">
          <div className="font-bold text-xs text-[#e2e8f0] leading-none truncate">
            {d.symbol.replace('USDT', '')}
          </div>
          <div className="text-[9px] text-text-dark mt-0.5">PERP</div>
        </div>
      </div>

      {/* Price — full only */}
      {isFull && (
        <div className="text-right font-mono text-[11px] text-text-muted truncate pr-3">
          {price > 0 ? `$${price.toLocaleString(undefined, { maximumFractionDigits: 4 })}` : '—'}
        </div>
      )}

      {/* Max Spread */}
      <div className={`text-right font-mono text-[11px] pr-3 ${spreadColor}`}>
        {maxSpread > 0 ? `${maxSpread.toFixed(3)}%` : '—'}
      </div>

      {/* Binance */}
      <div className="pr-2 flex justify-end">
        <RateCell rate={d.binance.rate} nextFunding={d.binance.nextFunding} />
      </div>

      {/* Bybit */}
      <div className="pr-2 flex justify-end">
        <RateCell rate={d.bybit.rate} nextFunding={d.bybit.nextFunding} />
      </div>

      {/* Blofin — full + med */}
      {(isFull || isMed) && (
        <div className="pr-2 flex justify-end">
          <RateCell rate={d.blofin?.rate ?? 0} nextFunding={d.blofin?.nextFunding} />
        </div>
      )}

      {/* Avg rate — full + med */}
      {(isFull || isMed) && (
        <div className={`text-right font-mono font-bold text-xs pr-3 ${rateColor(d.avgRate)}`}>
          {d.avgRate.toFixed(4)}%
        </div>
      )}

      {/* 24h Vol — full only */}
      {isFull && (
        <div className="text-right font-mono text-[10px] text-text-dark pr-3">
          {d.vol24h > 0 ? fmtVol(d.vol24h) : '—'}
        </div>
      )}

      {/* Chevron */}
      <div className="flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight size={12} className="text-text-dark" />
      </div>
    </div>
  );
}

// Responsive desktop header — matches DesktopRow columns
function DesktopHeader({ containerWidth }: { containerWidth: number }) {
  const isFull  = containerWidth >= 900;
  const isMed   = containerWidth >= 600 && containerWidth < 900;
  const grid = isFull ? GRID_FULL : isMed ? GRID_MED : GRID_SMALL;

  return (
    <div className={`grid ${grid} items-center px-3 py-2 text-[9px] uppercase tracking-widest text-text-dark font-bold border-b border-border bg-[#030304] select-none`}>
      <div>#</div>
      <div className="pl-2">Asset</div>
      {isFull && <div className="text-right pr-3">Price</div>}
      <div className="text-right pr-3 text-primary">Spread</div>
      <div className="text-right pr-2">
        <div>Binance</div>
        <div className="text-[8px] font-normal lowercase tracking-normal mt-0.5 text-text-dark/60">rate / next</div>
      </div>
      <div className="text-right pr-2">
        <div>Bybit</div>
        <div className="text-[8px] font-normal lowercase tracking-normal mt-0.5 text-text-dark/60">rate / next</div>
      </div>
      {(isFull || isMed) && (
        <div className="text-right pr-2">
          <div>Blofin</div>
          <div className="text-[8px] font-normal lowercase tracking-normal mt-0.5 text-text-dark/60">rate / next</div>
        </div>
      )}
      {(isFull || isMed) && <div className="text-right pr-3">Avg Rate</div>}
      {isFull && <div className="text-right pr-3">24h Vol</div>}
      <div />
    </div>
  );
}

export function FundingTable() {
  const navigate = useNavigate();
  const { filteredRates, fundingRates } = useStore();
  const rows = filteredRates();
  const isLoading = fundingRates.length === 0;

  // Auto-detect view based on window width; re-check on resize
  const getView = () =>
    typeof window !== 'undefined' && window.innerWidth < 640 ? 'mobile' : 'desktop';

  const [view, setView] = useState<'desktop' | 'mobile'>(getView);
  const [containerWidth, setContainerWidth] = useState(0);
  const parentRef = useRef<HTMLDivElement>(null);

  // Track container width for responsive desktop columns
  useEffect(() => {
    const el = parentRef.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Sync view with window resize (mobile ↔ desktop auto-switch)
  useEffect(() => {
    const handler = () => setView(getView());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const ROW_H = view === 'mobile' ? 52 : 44;

  const virtualizer = useVirtualizer({
    count: isLoading ? 20 : rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_H,
    overscan: 8,
  });

  return (
    <div className="flex flex-col h-full min-h-0 bg-panel rounded-lg overflow-hidden">
      {/* Top bar: title + view toggle (toggle hidden on mobile — auto-switches) */}
      <div className="flex-shrink-0 flex items-center justify-between border-b border-border bg-[#030304] px-3 py-1.5">
        <div className="text-[9px] uppercase tracking-widest text-text-dark font-bold">Funding Rates</div>
        <div className="hidden sm:flex gap-1">
          <button
            onClick={() => setView('mobile')}
            className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border transition-colors ${view === 'mobile' ? 'border-primary/40 text-primary bg-primary/10' : 'border-border text-text-dark'}`}
          >
            Cards
          </button>
          <button
            onClick={() => setView('desktop')}
            className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border transition-colors ${view === 'desktop' ? 'border-primary/40 text-primary bg-primary/10' : 'border-border text-text-dark'}`}
          >
            Table
          </button>
        </div>
      </div>

      {/* Responsive desktop header — no horizontal scroll */}
      {view === 'desktop' && containerWidth > 0 && (
        <DesktopHeader containerWidth={containerWidth} />
      )}

      {/* Mobile header */}
      {view === 'mobile' && (
        <div className="flex-shrink-0 border-b border-border bg-[#030304] select-none">
          <div className="flex items-center px-3 py-2 text-[9px] uppercase tracking-widest text-text-dark font-bold gap-2">
            <div className="w-5">#</div>
            <div className="w-0.5" />
            <div className="flex-1">Asset</div>
            <div className="flex-shrink-0">Avg Rate</div>
            <div className="flex-shrink-0">Spread</div>
            <div className="w-3" />
          </div>
        </div>
      )}

      {/* Virtualized rows — no overflow-x */}
      <div ref={parentRef} className="flex-1 overflow-y-auto min-h-0">
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map((vRow) => {
            if (isLoading) {
              return (
                <div
                  key={vRow.key}
                  style={{ position: 'absolute', top: vRow.start, width: '100%', height: ROW_H }}
                >
                  <SkeletonRow i={vRow.index} isMobile={view === 'mobile'} />
                </div>
              );
            }

            const d = rows[vRow.index];
            if (!d) return null;

            if (view === 'mobile') {
              return (
                <div
                  key={vRow.key}
                  style={{ position: 'absolute', top: vRow.start, width: '100%', height: ROW_H }}
                >
                  <MobileRow d={d} index={vRow.index} onClick={() => navigate(`/coin/${d.symbol}`)} />
                </div>
              );
            }

            return (
              <div
                key={vRow.key}
                style={{ position: 'absolute', top: vRow.start, width: '100%', height: ROW_H }}
              >
                <DesktopRow
                  d={d}
                  index={vRow.index}
                  onClick={() => navigate(`/coin/${d.symbol}`)}
                  containerWidth={containerWidth}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-3 py-1.5 border-t border-border bg-[#030304] flex items-center justify-between">
        <span className="text-[10px] text-text-dark">
          {isLoading ? 'Loading data…' : `${rows.length} / ${fundingRates.length} pairs`}
        </span>
        <span className="hidden sm:inline text-[10px] text-text-dark">Tap row to open coin detail</span>
      </div>
    </div>
  );
}
