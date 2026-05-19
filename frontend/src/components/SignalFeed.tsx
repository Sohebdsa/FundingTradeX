import { useStore } from '../store';
import type { Signal } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Brain } from 'lucide-react';

const DIRECTION_STYLES = {
  LONG: { bg: 'bg-[#10b981]/10', border: 'border-[#10b981]/30', badge: 'bg-[#10b981]/20 text-[#10b981]', icon: <TrendingUp size={13} className="text-[#10b981]" /> },
  SHORT: { bg: 'bg-[#ef4444]/10', border: 'border-[#ef4444]/30', badge: 'bg-[#ef4444]/20 text-[#ef4444]', icon: <TrendingDown size={13} className="text-[#ef4444]" /> },
  NEUTRAL: { bg: 'bg-[#f59e0b]/10', border: 'border-[#f59e0b]/30', badge: 'bg-[#f59e0b]/20 text-[#f59e0b]', icon: <Minus size={13} className="text-[#f59e0b]" /> },
};

const RISK_COLOR = { LOW: 'text-[#10b981]', MEDIUM: 'text-[#f59e0b]', HIGH: 'text-[#ef4444]' };

function SignalCard({ sig }: { sig: Signal }) {
  const style = DIRECTION_STYLES[sig.direction];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      layout
      className={`rounded-lg border p-3 ${style.bg} ${style.border}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {style.icon}
          <span className="font-bold text-[#f8fafc] tracking-wide">{sig.symbol.replace('USDT', '')}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${style.badge}`}>
            {sig.direction}
          </span>
        </div>
        <div className="flex-shrink-0">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${RISK_COLOR[sig.riskLevel]}`}>
            {sig.riskLevel} RISK
          </span>
        </div>
      </div>

      <div className="text-[11px] text-[#94a3b8] leading-relaxed mb-2">{sig.reason}</div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#64748b] uppercase tracking-wider">{sig.signal}</span>
        {/* Confidence bar */}
        <div className="flex items-center gap-2">
          <div className="w-20 h-1 bg-[#2b2f3a] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${sig.confidence}%`,
                background: sig.direction === 'LONG' ? '#10b981' : sig.direction === 'SHORT' ? '#ef4444' : '#f59e0b'
              }}
            />
          </div>
          <span className="text-[10px] font-mono text-[#94a3b8]">{sig.confidence}%</span>
        </div>
      </div>
    </motion.div>
  );
}

export function SignalFeed() {
  const { signals } = useStore();

  return (
    <div className="glass-panel rounded-lg overflow-hidden flex flex-col h-full">
      <div className="px-5 py-4 border-b border-[#2b2f3a] bg-[#1a1d24] flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#f8fafc] flex items-center gap-2">
          <Brain size={14} className="text-[#8b5cf6]" />
          Signal Engine
        </h2>
        <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
          signals.length > 0 ? 'bg-[#8b5cf6]/20 text-[#8b5cf6]' : 'bg-[#2b2f3a] text-[#64748b]'
        }`}>
          {signals.length} Active
        </span>
      </div>

      <div className="p-3 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-2">
          <AnimatePresence>
            {signals.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="py-10 text-center text-[#64748b] text-sm"
              >
                <Brain size={28} className="mx-auto mb-3 opacity-30" />
                No active signals. Waiting for extreme funding conditions...
              </motion.div>
            ) : (
              signals.map(sig => <SignalCard key={sig.symbol + sig.signal} sig={sig} />)
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
