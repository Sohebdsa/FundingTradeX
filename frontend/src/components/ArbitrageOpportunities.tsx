import { useStore } from '../store';
import { Zap, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Exchange colour tokens
const EX_COLOR: Record<string, { text: string; bg: string; dot: string }> = {
  Binance: { text: '#f59e0b', bg: 'rgba(245,158,11,0.12)', dot: '#f59e0b' },
  Bybit:   { text: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', dot: '#8b5cf6' },
  Blofin:  { text: '#06b6d4', bg: 'rgba(6,182,212,0.12)',  dot: '#06b6d4' },
};

function ExBadge({ name }: { name: string }) {
  const c = EX_COLOR[name] ?? { text: '#94a3b8', bg: 'rgba(148,163,184,0.1)', dot: '#94a3b8' };
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
      style={{ background: c.bg, color: c.text }}>
      <span className="w-1 h-1 rounded-full" style={{ background: c.dot }} />
      {name}
    </span>
  );
}

export function ArbitrageOpportunities() {
  const { arbitrageOpportunities } = useStore();

  // Count 3-exchange opps
  const triCount = arbitrageOpportunities.filter(o => (o as any).exchanges?.includes('Blofin')).length;

  return (
    <div className="bg-[#0d1017] border border-[#1e2430] rounded-lg overflow-hidden flex flex-col h-full">
      <div className="px-4 py-3 border-b border-[#1e2430] flex items-center justify-between flex-shrink-0">
        <h2 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <Zap size={13} className="text-[#f59e0b]" fill="currentColor" />
          Spread Arbitrage
        </h2>
        <div className="flex items-center gap-2">
          {triCount > 0 && (
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#06b6d4]/10 text-[#06b6d4] border border-[#06b6d4]/20">
              {triCount} 3-ex
            </span>
          )}
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#f59e0b]/10 text-[#f59e0b]">
            {arbitrageOpportunities.length} found
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex flex-col gap-2">
          <AnimatePresence>
            {arbitrageOpportunities.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-center py-10 text-[#374151] text-xs">
                No significant arb opportunities detected.<br />
                Threshold: spread &gt; 0.005%
              </motion.div>
            ) : (
              arbitrageOpportunities.map((opp) => {
                const hasBlofin = (opp as any).blofinRate !== null && (opp as any).blofinRate !== undefined;
                const spreadNum = parseFloat(opp.spread);
                const intensity = Math.min(spreadNum / 0.1, 1); // normalize 0–0.1% → 0–1
                const glowOpacity = 0.05 + intensity * 0.25;

                return (
                  <motion.div key={opp.symbol}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="rounded-lg border transition-colors"
                    style={{
                      background: `rgba(245,158,11,${glowOpacity * 0.4})`,
                      borderColor: spreadNum > 0.05 ? 'rgba(245,158,11,0.4)' : '#1e2430',
                    }}
                  >
                    <div className="p-3">
                      {/* Header row */}
                      <div className="flex items-start justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm tracking-wide text-[#f1f5f9]">
                            {opp.symbol.replace('USDT', '')}
                          </span>
                          {hasBlofin && <ExBadge name="Blofin" />}
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-sm"
                            style={{ color: spreadNum > 0.05 ? '#f59e0b' : '#94a3b8' }}>
                            {opp.spread}%
                          </div>
                          <div className="text-[9px] text-[#475569] uppercase tracking-wider">spread</div>
                        </div>
                      </div>

                      {/* Long ↔ Short row */}
                      <div className="grid grid-cols-[1fr_16px_1fr] items-center gap-2 bg-[#0a0c10] rounded p-2.5 border border-[#1e2430]">
                        <div>
                          <div className="text-[9px] text-[#10b981] font-bold uppercase tracking-wider mb-1">Long</div>
                          <ExBadge name={opp.longExchange} />
                          <div className="font-mono text-[10px] text-[#64748b] mt-1">
                            {opp.longRate}%
                          </div>
                        </div>
                        <ArrowRight size={12} className="text-[#374151]" />
                        <div className="text-right">
                          <div className="text-[9px] text-[#ef4444] font-bold uppercase tracking-wider mb-1">Short</div>
                          <ExBadge name={opp.shortExchange} />
                          <div className="font-mono text-[10px] text-[#64748b] mt-1">
                            {opp.shortRate}%
                          </div>
                        </div>
                      </div>

                      {/* Blofin rate row (only if Blofin has data for this coin) */}
                      {hasBlofin && (
                        <div className="mt-2 flex items-center justify-between px-2 py-1.5 rounded bg-[#06b6d4]/5 border border-[#06b6d4]/15">
                          <span className="text-[9px] text-[#06b6d4] uppercase tracking-wider font-bold flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-[#06b6d4]" /> Blofin Rate
                          </span>
                          <span className="font-mono text-[10px] text-[#06b6d4]">{(opp as any).blofinRate}%</span>
                        </div>
                      )}

                      {/* Strategy hint */}
                      <div className="mt-2 text-[9px] text-[#374151] leading-relaxed">
                        Long {opp.longExchange} · Short {opp.shortExchange} to capture {opp.spread}% delta
                      </div>
                    </div>

                    {/* Spread bar */}
                    <div className="h-0.5 w-full bg-[#1e2430]">
                      <div className="h-full bg-[#f59e0b] transition-all"
                        style={{ width: `${Math.min(intensity * 100, 100)}%` }} />
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
