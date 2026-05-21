import { useParams, useNavigate, Link } from 'react-router-dom';
import { useStore } from '../store';
import { Countdown } from '../components/Countdown';
import { OIAnalytics } from '../components/OIAnalytics';
import { ArrowLeft, BarChart2, Activity, Zap } from 'lucide-react';

function InfoBox({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-[#0a0c10] border border-[#1e2430] rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-widest text-[#475569] mb-1">{label}</div>
      <div className="font-mono font-bold text-sm" style={{ color: color || '#f1f5f9' }}>{value}</div>
    </div>
  );
}

function rateColor(r: number) {
  if (r > 0.05) return '#ef4444';
  if (r > 0.02) return '#f97316';
  if (r < -0.05) return '#10b981';
  if (r < -0.02) return '#34d399';
  return '#94a3b8';
}

export function CoinDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const { fundingRates, arbitrageOpportunities, signals } = useStore();

  const coin   = fundingRates.find(d => d.symbol === symbol?.toUpperCase());
  const arb    = arbitrageOpportunities.find(a => a.symbol === symbol?.toUpperCase());
  const signal = signals.find(s => s.symbol === symbol?.toUpperCase());
  const base   = symbol?.replace('USDT', '') ?? '';

  if (!coin) return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <div className="text-[#374151] text-sm">Coin not found or data loading...</div>
      <button onClick={() => navigate('/')} className="text-[#2563eb] text-xs underline">Back to Overview</button>
    </div>
  );

  const price   = coin.binance.price || 0;
  const avgRate = coin.avgRate;


  // Crowd positioning logic
  let crowdLabel = 'Neutral', crowdColor = '#64748b';
  if (avgRate > 0.07) { crowdLabel = 'Extreme Longs Trapped'; crowdColor = '#ef4444'; }
  else if (avgRate > 0.03) { crowdLabel = 'Longs Dominant'; crowdColor = '#f97316'; }
  else if (avgRate < -0.07) { crowdLabel = 'Extreme Shorts Trapped'; crowdColor = '#10b981'; }
  else if (avgRate < -0.03) { crowdLabel = 'Shorts Dominant'; crowdColor = '#34d399'; }

  const sqProb = Math.min(99, Math.round(Math.abs(avgRate) * 1000));

  return (
    <div className="flex flex-col h-full overflow-auto p-3 md:p-4 gap-3 md:gap-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs flex-shrink-0 flex-wrap">
        <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-[#475569] hover:text-[#94a3b8] transition-colors">
          <ArrowLeft size={13} /> Market Overview
        </button>
        <span className="text-[#1e2430]">/</span>
        <span className="text-[#f1f5f9] font-bold">{symbol}</span>
        <Link to={`/chart/${symbol}`} className="ml-auto flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#2563eb] border border-[#2563eb]/30 bg-[#2563eb]/10 px-2.5 py-1.5 rounded hover:bg-[#2563eb]/20 transition-colors">
          <BarChart2 size={12} /> Chart
        </Link>
      </div>

      {/* Title */}
      <div className="flex items-start justify-between flex-shrink-0 gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">{base}<span className="text-[#374151]">/USDT</span></h1>
          <div className="text-[#475569] text-xs mt-0.5">Perpetual Futures · Binance & Bybit</div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-lg md:text-2xl font-bold font-mono">
            {price > 0 ? `$${price.toLocaleString(undefined,{maximumFractionDigits:4})}` : '—'}
          </div>
          <div className={`text-sm font-mono ${coin.pctChg24h >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
            {coin.pctChg24h > 0 ? '+' : ''}{coin.pctChg24h.toFixed(2)}% (24h)
          </div>
        </div>
      </div>

      {/* Core stats grid */}
      <div className="grid grid-cols-2 gap-2 flex-shrink-0">
        <InfoBox label="Binance Rate"  value={`${coin.binance.rate.toFixed(4)}%`}  color={rateColor(coin.binance.rate)} />
        <InfoBox label="Bybit Rate"    value={`${coin.bybit.rate.toFixed(4)}%`}    color={rateColor(coin.bybit.rate)} />
        <InfoBox label="Avg Rate"      value={`${avgRate.toFixed(4)}%`}            color={rateColor(avgRate)} />
        <InfoBox label="24h Volume"    value={coin.vol24h > 0 ? `$${(coin.vol24h/1e6).toFixed(1)}M` : '—'} />
      </div>

      {/* Main panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-shrink-0">

        {/* Crowd Positioning */}
        <div className="bg-[#0d1017] border border-[#1e2430] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={13} className="text-[#8b5cf6]" />
            <span className="text-xs font-bold uppercase tracking-wider">Crowd Positioning Analysis</span>
          </div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-lg font-bold" style={{ color: crowdColor }}>{crowdLabel}</div>
              <div className="text-[10px] text-[#475569] mt-0.5">Based on avg funding rate across exchanges</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold font-mono" style={{ color: crowdColor }}>{sqProb}%</div>
              <div className="text-[10px] text-[#475569]">Squeeze probability</div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] text-[#475569] uppercase tracking-wider">
              <span>Crowd Extremity</span><span>{Math.abs(avgRate).toFixed(4)}% avg rate</span>
            </div>
            <div className="h-2 bg-[#161c26] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(sqProb, 100)}%`, background: crowdColor }} />
            </div>
          </div>
          {signal && (
            <div className="mt-4 border border-[#8b5cf6]/30 bg-[#8b5cf6]/5 rounded p-3">
              <div className="text-[10px] text-[#8b5cf6] uppercase tracking-wider font-bold mb-1">{signal.signal}</div>
              <div className="text-[11px] text-[#94a3b8]">{signal.reason}</div>
              <div className="flex items-center gap-2 mt-2">
                <div className="h-1 flex-1 bg-[#161c26] rounded-full overflow-hidden">
                  <div className="h-full bg-[#8b5cf6] rounded-full" style={{ width: `${signal.confidence}%` }} />
                </div>
                <span className="text-[10px] font-mono text-[#8b5cf6]">{signal.confidence}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Exchange Comparison */}
        <div className="bg-[#0d1017] border border-[#1e2430] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={13} className="text-[#f59e0b]" />
            <span className="text-xs font-bold uppercase tracking-wider">Exchange Comparison</span>
          </div>

          <div className="space-y-3">
            {[
              { ex: 'Binance', rate: coin.binance.rate, oi: coin.binance.oi, next: coin.binance.nextFunding, color: '#f59e0b' },
              { ex: 'Bybit',   rate: coin.bybit.rate,   oi: coin.bybit.oi,   next: coin.bybit.nextFunding,  color: '#8b5cf6' },
            ].map(({ ex, rate, oi, next, color }) => (
              <div key={ex} className="bg-[#0a0c10] border border-[#1e2430] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                    <span className="text-xs font-bold">{ex}</span>
                  </div>
                  <span className="font-mono font-bold text-sm" style={{ color: rateColor(rate) }}>{rate.toFixed(4)}%</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-[#475569]">
                  <div>OI: <span className="text-[#94a3b8] font-mono">{oi > 0 ? oi.toLocaleString(undefined,{maximumFractionDigits:0}) : '—'}</span></div>
                  <div>Next: <span className="text-[#94a3b8] font-mono"><Countdown targetTimestamp={next} /></span></div>
                </div>
              </div>
            ))}

            {arb && (
              <div className="border border-[#f59e0b]/30 bg-[#f59e0b]/5 rounded-lg p-3">
                <div className="text-[10px] text-[#f59e0b] font-bold uppercase tracking-wider mb-1">Arbitrage Opportunity</div>
                <div className="text-[11px] text-[#94a3b8]">
                  Spread: <span className="text-[#f59e0b] font-mono font-bold">{arb.spread}%</span>
                  {' · '}Long {arb.longExchange} ({arb.longRate}%) · Short {arb.shortExchange} ({arb.shortRate}%)
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* OI Analytics */}
      <div className="flex-shrink-0 min-h-[300px]">
        <OIAnalytics />
      </div>

      {/* Funding Countdown */}
      <div className="bg-[#0d1017] border border-[#1e2430] rounded-lg p-4 flex-shrink-0">
        <div className="text-xs font-bold uppercase tracking-wider mb-3 text-[#475569]">Next Funding Settlement</div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { ex: 'Binance', next: coin.binance.nextFunding },
            { ex: 'Bybit',   next: coin.bybit.nextFunding },
          ].map(({ ex, next }) => (
            <div key={ex} className="text-center">
              <div className="text-[10px] text-[#475569] uppercase mb-1">{ex}</div>
              <div className="text-xl font-mono font-bold text-[#f1f5f9]">
                <Countdown targetTimestamp={next} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
