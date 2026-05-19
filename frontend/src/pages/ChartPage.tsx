import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { ArrowLeft, RefreshCw, Volume2, Zap, ZoomIn, ZoomOut, Footprints } from 'lucide-react';

interface Candle { time: number; open: number; high: number; low: number; close: number; volume: number; }
const INTERVALS = ['1m','5m','15m','1h','4h','1d'];

async function fetchCandles(sym: string, iv: string, limit = 300): Promise<Candle[]> {
  const r = await fetch(`http://localhost:5000/api/klines?symbol=${sym}&interval=${iv}&limit=${limit}`);
  const raw: number[][] = await r.json();
  return raw.map(k => ({ time: k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5] }));
}

function drawChart(
  canvas: HTMLCanvasElement,
  candles: Candle[],
  vStart: number, vCount: number,
  opts: { bubbles: boolean; signals: boolean; footprint: boolean },
  tipIdx: number | null
) {
  const ctx = canvas.getContext('2d'); if (!ctx || !candles.length) return;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.width / dpr, H = canvas.height / dpr;
  const P = { t: 24, r: 76, b: 72, l: 6 };
  const VOL_H = 64, CH = H - P.t - P.b - VOL_H - 6, CW = W - P.l - P.r;
  const vis = candles.slice(vStart, Math.min(vStart + vCount, candles.length));
  if (!vis.length) return;
  const prices = vis.flatMap(c => [c.high, c.low]);
  const minP = Math.min(...prices), maxP = Math.max(...prices);
  const pRange = maxP - minP || minP * 0.001;
  const maxVol = Math.max(...vis.map(c => c.volume));
  const avgVol = vis.reduce((s, c) => s + c.volume, 0) / vis.length;
  const cw = CW / vis.length, bw = Math.max(1, cw * 0.65);
  const px = (i: number) => P.l + i * cw + cw / 2;
  const py = (p: number) => P.t + CH - ((p - minP) / pRange) * CH;

  ctx.save(); ctx.scale(dpr, dpr);
  ctx.fillStyle = '#0a0c10'; ctx.fillRect(0, 0, W, H);

  // separator
  ctx.strokeStyle = '#1e2430'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(P.l, H - P.b - VOL_H); ctx.lineTo(W - P.r, H - P.b - VOL_H); ctx.stroke();

  // grid
  ctx.setLineDash([3, 6]);
  for (let i = 0; i <= 5; i++) {
    const p = minP + (pRange / 5) * i, y = py(p);
    ctx.strokeStyle = '#1e2430'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(P.l, y); ctx.lineTo(W - P.r, y); ctx.stroke();
    ctx.fillStyle = '#475569'; ctx.font = '9px monospace'; ctx.textAlign = 'left';
    ctx.fillText(p > 1000 ? p.toFixed(0) : p.toFixed(4), W - P.r + 4, y + 3);
  }
  ctx.setLineDash([]);

  // last price dashed line
  const last = vis[vis.length - 1], isBullLast = last.close >= last.open;
  const lastY = py(last.close);
  ctx.strokeStyle = isBullLast ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)';
  ctx.lineWidth = 0.8; ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(P.l, lastY); ctx.lineTo(W - P.r, lastY); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = isBullLast ? '#10b981' : '#ef4444';
  ctx.fillRect(W - P.r, lastY - 8, P.r - 1, 16);
  ctx.fillStyle = '#0a0c10'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
  ctx.fillText(last.close > 1000 ? last.close.toFixed(1) : last.close.toFixed(5), W - P.r + P.r / 2, lastY + 3);

  // candles
  const labelEvery = Math.max(1, Math.floor(vis.length / 8));
  vis.forEach((c, i) => {
    const bull = c.close >= c.open, col = bull ? '#10b981' : '#ef4444';
    const x = px(i), hY = py(c.high), lY = py(c.low);
    const oY = py(c.open), cY = py(c.close);
    const bTop = Math.min(oY, cY), bH = Math.max(1, Math.abs(oY - cY));

    // vol bar
    const vH = Math.max(1, (c.volume / maxVol) * VOL_H);
    ctx.fillStyle = bull ? 'rgba(16,185,129,0.28)' : 'rgba(239,68,68,0.28)';
    ctx.fillRect(x - bw / 2, H - P.b - vH, bw, vH);

    // footprint
    if (opts.footprint) {
      const range = c.high - c.low || 0.0001;
      const buyF = bull ? (c.close - c.low) / range : (c.high - c.close) / range;
      const buyV = c.volume * buyF, sellV = c.volume - buyV;
      const maxS = Math.max(buyV, sellV), midY = (hY + lY) / 2, maxB = Math.max(bw * 3, 14);
      if (maxS > 0) {
        ctx.fillStyle = 'rgba(16,185,129,0.5)';
        ctx.fillRect(x, midY - 4, (buyV / maxS) * maxB * 0.5, 8);
        ctx.fillStyle = 'rgba(239,68,68,0.5)';
        ctx.fillRect(x - (sellV / maxS) * maxB * 0.5, midY - 4, (sellV / maxS) * maxB * 0.5, 8);
      }
    }

    // wick
    ctx.strokeStyle = col; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(x, hY); ctx.lineTo(x, lY); ctx.stroke();

    // body
    ctx.fillStyle = col; ctx.globalAlpha = 0.85;
    ctx.fillRect(x - bw / 2, bTop, bw, bH); ctx.globalAlpha = 1;

    // vol bubble
    if (opts.bubbles && c.volume / avgVol > 1.8) {
      const spike = c.volume / avgVol, r = Math.min(22, Math.max(5, spike * 4));
      const bY = bull ? hY - r - 4 : lY + r + 4;
      ctx.beginPath(); ctx.arc(x, bY, r, 0, Math.PI * 2);
      ctx.fillStyle = bull ? 'rgba(16,185,129,0.13)' : 'rgba(239,68,68,0.13)';
      ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = col; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
      ctx.fillText(`${spike.toFixed(1)}x`, x, bY + 2.5);
    }

    // signal marker on high-volume candles
    if (opts.signals && c.volume / avgVol > 2.2) {
      const sy = bull ? hY - 18 : lY + 18;
      ctx.fillStyle = bull ? '#10b981' : '#ef4444';
      ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
      ctx.fillText(bull ? '▲' : '▼', x, sy);
    }

    // crosshair on hovered candle
    if (tipIdx === i) {
      ctx.strokeStyle = 'rgba(148,163,184,0.25)'; ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.moveTo(x, P.t); ctx.lineTo(x, H - P.b); ctx.stroke();
      ctx.setLineDash([]);
    }

    // x label
    if (i % labelEvery === 0) {
      const t = new Date(c.time);
      ctx.fillStyle = '#374151'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
      ctx.fillText(`${t.getHours().toString().padStart(2,'0')}:${t.getMinutes().toString().padStart(2,'0')}`, x, H - P.b + 14);
    }
  });

  ctx.restore();
}

export function ChartPage() {
  const { symbol: paramSym } = useParams<{ symbol?: string }>();
  const navigate = useNavigate();
  const { fundingRates, signals: storeSignals } = useStore();

  const [symbol, setSymbol] = useState(paramSym?.toUpperCase() || 'BTCUSDT');
  const [inputSym, setInputSym] = useState(symbol);
  const [interval, setInterval] = useState('15m');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(false);
  const [opts, setOpts] = useState({ bubbles: true, signals: true, footprint: false });
  const [tooltip, setTooltip] = useState<Candle | null>(null);
  const [tipIdx, setTipIdx] = useState<number | null>(null);

  // View window: start index + count of visible candles
  const [vStart, setVStart] = useState(0);
  const [vCount, setVCount] = useState(120);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ active: boolean; startX: number; startVStart: number }>({ active: false, startX: 0, startVStart: 0 });

  const load = useCallback(async (sym: string, iv: string) => {
    setLoading(true);
    try {
      const data = await fetchCandles(sym, iv, 300);
      setCandles(data);
      setVStart(Math.max(0, data.length - 120));
      setVCount(120);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(symbol, interval); }, [symbol, interval, load]);

  // Resize canvas and redraw
  const redraw = useCallback(() => {
    const canvas = canvasRef.current, container = containerRef.current;
    if (!canvas || !container || !candles.length) return;
    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth, h = container.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    }
    drawChart(canvas, candles, vStart, vCount, opts, tipIdx);
  }, [candles, vStart, vCount, opts, tipIdx]);

  useEffect(() => { redraw(); }, [redraw]);

  useEffect(() => {
    const ro = new ResizeObserver(redraw);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [redraw]);

  // Zoom with mouse wheel
  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.15 : 0.87;
    setVCount(prev => {
      const next = Math.round(prev * factor);
      const clamped = Math.max(20, Math.min(candles.length, next));
      setVStart(vs => Math.max(0, Math.min(candles.length - clamped, vs)));
      return clamped;
    });
  }, [candles.length]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  // Drag to pan
  const onMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { active: true, startX: e.clientX, startVStart: vStart };
  };
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current || !candles.length) return;
    const cw = containerRef.current.clientWidth / vCount;
    const relX = e.nativeEvent.offsetX;
    const idx = Math.max(0, Math.min(vCount - 1, Math.floor(relX / cw)));
    const absIdx = vStart + idx;
    if (candles[absIdx]) { setTooltip(candles[absIdx]); setTipIdx(idx); }

    if (dragRef.current.active) {
      const delta = e.clientX - dragRef.current.startX;
      const shift = Math.round(-delta / cw);
      const next = Math.max(0, Math.min(candles.length - vCount, dragRef.current.startVStart + shift));
      setVStart(next);
    }
  }, [candles, vStart, vCount]);
  const onMouseUp = () => { dragRef.current.active = false; };
  const onMouseLeave = () => { setTooltip(null); setTipIdx(null); dragRef.current.active = false; };

  const coin = fundingRates.find(d => d.symbol === symbol);
  const signal = storeSignals.find(s => s.symbol === symbol);
  const toggle = (k: keyof typeof opts) => setOpts(p => ({ ...p, [k]: !p[k] }));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex-shrink-0 bg-[#0d1017] border-b border-[#1e2430] px-4 py-2 flex items-center gap-2 flex-wrap">
        <button onClick={() => navigate(-1)} className="text-[#475569] hover:text-[#94a3b8] flex items-center gap-1 text-xs">
          <ArrowLeft size={13} /> Back
        </button>

        <form onSubmit={e => { e.preventDefault(); setSymbol(inputSym.toUpperCase()); }} className="flex items-center gap-1">
          <input value={inputSym} onChange={e => setInputSym(e.target.value.toUpperCase())}
            className="bg-[#161c26] border border-[#1e2430] rounded px-2.5 py-1.5 text-xs font-mono font-bold text-[#f1f5f9] w-28 focus:outline-none focus:border-[#2563eb]/50" />
          <button type="submit" className="bg-[#2563eb]/20 border border-[#2563eb]/30 text-[#60a5fa] px-2 py-1.5 rounded text-[10px] font-bold uppercase hover:bg-[#2563eb]/30">GO</button>
        </form>

        <div className="flex gap-1">
          {INTERVALS.map(iv => (
            <button key={iv} onClick={() => setInterval(iv)}
              className={`px-2.5 py-1.5 rounded text-[10px] font-bold uppercase border transition-colors ${interval === iv ? 'bg-[#2563eb]/20 border-[#2563eb]/30 text-[#60a5fa]' : 'border-[#1e2430] text-[#475569] hover:text-[#94a3b8]'}`}>
              {iv}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 ml-auto items-center">
          {/* Zoom buttons */}
          <button onClick={() => { const n = Math.max(20, Math.round(vCount * 0.8)); setVStart(vs => Math.max(0, Math.min(candles.length - n, vs))); setVCount(n); }}
            className="border border-[#1e2430] text-[#475569] hover:text-[#94a3b8] p-1.5 rounded transition-colors"><ZoomIn size={13} /></button>
          <button onClick={() => { const n = Math.min(candles.length, Math.round(vCount * 1.25)); setVStart(vs => Math.max(0, Math.min(candles.length - n, vs))); setVCount(n); }}
            className="border border-[#1e2430] text-[#475569] hover:text-[#94a3b8] p-1.5 rounded transition-colors"><ZoomOut size={13} /></button>

          {/* Overlay toggles */}
          {([
            { k: 'bubbles'   as const, icon: <Volume2 size={11}/>, col: '#06b6d4', lbl: 'Bubbles'   },
            { k: 'signals'   as const, icon: <Zap     size={11}/>, col: '#8b5cf6', lbl: 'Signals'   },
            { k: 'footprint' as const, icon: <Footprints size={11}/>, col: '#f59e0b', lbl: 'Footprint' },
          ]).map(({ k, icon, col, lbl }) => (
            <button key={k} onClick={() => toggle(k)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-bold uppercase border transition-colors"
              style={opts[k] ? { borderColor: `${col}50`, color: col, background: `${col}15` } : { borderColor: '#1e2430', color: '#475569' }}>
              {icon}{lbl}
            </button>
          ))}

          <button onClick={() => load(symbol, interval)}
            className={`border border-[#1e2430] text-[#475569] hover:text-[#94a3b8] p-1.5 rounded ${loading ? 'animate-pulse' : ''}`}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Funding bar */}
      {coin && (
        <div className="flex-shrink-0 bg-[#0d1017] border-b border-[#1e2430] px-4 py-1.5 flex items-center gap-4 text-xs">
          <span className="font-bold text-[#f1f5f9]">{symbol}</span>
          <span className="text-[#475569]">Binance <span className={`font-mono font-bold ${coin.binance.rate < 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>{coin.binance.rate.toFixed(4)}%</span></span>
          <span className="text-[#475569]">Bybit <span className={`font-mono font-bold ${coin.bybit.rate < 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>{coin.bybit.rate.toFixed(4)}%</span></span>
          {signal && <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20">{signal.signal}</span>}
          <span className="ml-auto text-[#374151] text-[10px] font-mono">
            {vStart + 1}–{Math.min(vStart + vCount, candles.length)} / {candles.length} · Wheel=zoom · Drag=pan
          </span>
        </div>
      )}

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Chart */}
        <div
          ref={containerRef}
          className="flex-1 relative bg-[#0a0c10] cursor-crosshair select-none min-w-0"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0a0c10]/80 z-10">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
                <span className="text-[#475569] text-xs">Loading {symbol}…</span>
              </div>
            </div>
          )}
          <canvas ref={canvasRef} className="block" />
        </div>

        {/* Sidebar */}
        <div className="flex-shrink-0 w-48 border-l border-[#1e2430] bg-[#0d1017] p-3 flex flex-col gap-3 overflow-y-auto">
          {/* Tooltip OHLCV */}
          {tooltip ? (
            <div className="bg-[#0a0c10] border border-[#1e2430] rounded p-2.5 text-[10px]">
              <div className="text-[#f1f5f9] font-bold mb-1.5">{new Date(tooltip.time).toLocaleTimeString()}</div>
              {[['O', tooltip.open], ['H', tooltip.high], ['L', tooltip.low], ['C', tooltip.close]].map(([l, v]) => (
                <div key={l} className="flex justify-between gap-2">
                  <span className="text-[#475569]">{l}</span>
                  <span className="font-mono text-[#f1f5f9]">{(v as number).toFixed(4)}</span>
                </div>
              ))}
              <div className="flex justify-between gap-2 mt-1 pt-1 border-t border-[#1e2430]">
                <span className="text-[#475569]">Vol</span>
                <span className="font-mono text-[#94a3b8]">{(tooltip.volume / 1000).toFixed(1)}K</span>
              </div>
            </div>
          ) : (
            <div className="text-[9px] text-[#374151] text-center py-2">Hover chart for OHLCV</div>
          )}

          {/* Stats */}
          {candles.length > 0 && (() => {
            const vis = candles.slice(vStart, vStart + vCount);
            const avg = vis.reduce((s, c) => s + c.volume, 0) / vis.length;
            const spikes = vis.filter(c => c.volume / avg > 2).length;
            const bullish = vis.filter(c => c.close >= c.open).length;
            return (
              <div className="space-y-1.5">
                {[['Candles', vis.length], ['Vol Spikes', spikes], ['Bull %', `${Math.round(bullish / vis.length * 100)}%`]].map(([l, v]) => (
                  <div key={l} className="bg-[#0a0c10] border border-[#1e2430] rounded p-2">
                    <div className="text-[9px] text-[#374151] uppercase tracking-wider">{l}</div>
                    <div className="font-mono font-bold text-xs text-[#f1f5f9]">{v}</div>
                  </div>
                ))}
              </div>
            );
          })()}

          {signal && (
            <div className="border border-[#8b5cf6]/30 bg-[#8b5cf6]/5 rounded p-2.5 text-[10px]">
              <div className="text-[#8b5cf6] font-bold mb-1">{signal.signal}</div>
              <div className="text-[#64748b] mb-2 leading-relaxed">{signal.reason}</div>
              <div className="h-1 bg-[#161c26] rounded-full overflow-hidden">
                <div className="h-full bg-[#8b5cf6]" style={{ width: `${signal.confidence}%` }} />
              </div>
              <div className="text-right text-[9px] text-[#8b5cf6] mt-0.5">{signal.confidence}%</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
