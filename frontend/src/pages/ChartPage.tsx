import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import {
  ArrowLeft, RefreshCw, Volume2, Zap, ZoomIn, ZoomOut, Footprints,
  Plus, X, Settings2, ChevronDown, ChevronUp, Layers, Sliders,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Candle { time: number; open: number; high: number; low: number; close: number; volume: number; }
const INTERVALS = ['1m','5m','15m','1h','4h','1d'];

type IndicatorType = 'sma'|'ema'|'bb'|'vwap'|'rsi'|'macd'|'stoch'|'atr'|'cci'|'obv'|'mfi';

interface IndicatorParams {
  period?: number; period2?: number; period3?: number;
  stdDev?: number; overbought?: number; oversold?: number;
  fast?: number; slow?: number; signal?: number;
  k?: number; d?: number; smooth?: number;
}

interface IndicatorConfig {
  id: string;
  type: IndicatorType;
  label: string;
  color: string;
  color2?: string;
  color3?: string;
  params: IndicatorParams;
  visible: boolean;
  panel: 'overlay' | 'sub';
}

// ─── Indicator Catalogue ──────────────────────────────────────────────────────
const INDICATOR_CATALOG: { type: IndicatorType; label: string; panel: 'overlay'|'sub'; defaultParams: IndicatorParams; defaultColor: string }[] = [
  { type: 'sma',   label: 'SMA',          panel: 'overlay', defaultParams: { period: 20 },                                   defaultColor: '#f59e0b' },
  { type: 'ema',   label: 'EMA',          panel: 'overlay', defaultParams: { period: 20 },                                   defaultColor: '#3b82f6' },
  { type: 'bb',    label: 'Bollinger Bands', panel: 'overlay', defaultParams: { period: 20, stdDev: 2 },                    defaultColor: '#8b5cf6' },
  { type: 'vwap',  label: 'VWAP',         panel: 'overlay', defaultParams: {},                                               defaultColor: '#06b6d4' },
  { type: 'rsi',   label: 'RSI',          panel: 'sub',     defaultParams: { period: 14, overbought: 70, oversold: 30 },    defaultColor: '#a78bfa' },
  { type: 'macd',  label: 'MACD',         panel: 'sub',     defaultParams: { fast: 12, slow: 26, signal: 9 },               defaultColor: '#10b981' },
  { type: 'stoch', label: 'Stochastic',   panel: 'sub',     defaultParams: { k: 14, d: 3, smooth: 3 },                      defaultColor: '#f97316' },
  { type: 'atr',   label: 'ATR',          panel: 'sub',     defaultParams: { period: 14 },                                   defaultColor: '#ef4444' },
  { type: 'cci',   label: 'CCI',          panel: 'sub',     defaultParams: { period: 20 },                                   defaultColor: '#eab308' },
  { type: 'obv',   label: 'OBV',          panel: 'sub',     defaultParams: {},                                               defaultColor: '#06b6d4' },
  { type: 'mfi',   label: 'MFI',          panel: 'sub',     defaultParams: { period: 14, overbought: 80, oversold: 20 },    defaultColor: '#ec4899' },
];

// ─── Presets ──────────────────────────────────────────────────────────────────
type Preset = { label: string; color: string; indicators: Partial<IndicatorConfig>[] };
const PRESETS: Preset[] = [
  {
    label: 'Trend', color: '#3b82f6',
    indicators: [
      { type: 'ema', label: 'EMA 9',   params: { period: 9 },   color: '#f59e0b', panel: 'overlay' },
      { type: 'ema', label: 'EMA 21',  params: { period: 21 },  color: '#3b82f6', panel: 'overlay' },
      { type: 'ema', label: 'EMA 200', params: { period: 200 }, color: '#ef4444', panel: 'overlay' },
      { type: 'macd', label: 'MACD',   params: { fast:12, slow:26, signal:9 }, color: '#10b981', panel: 'sub' },
    ],
  },
  {
    label: 'Mean Reversion', color: '#8b5cf6',
    indicators: [
      { type: 'bb',  label: 'BB(20,2)', params: { period:20, stdDev:2 }, color: '#8b5cf6', panel: 'overlay' },
      { type: 'rsi', label: 'RSI(14)',  params: { period:14, overbought:70, oversold:30 }, color: '#a78bfa', panel: 'sub' },
    ],
  },
  {
    label: 'Momentum', color: '#f97316',
    indicators: [
      { type: 'rsi',   label: 'RSI(14)',  params: { period:14, overbought:70, oversold:30 }, color: '#a78bfa', panel: 'sub' },
      { type: 'stoch', label: 'Stoch',    params: { k:14, d:3, smooth:3 }, color: '#f97316', panel: 'sub' },
      { type: 'macd',  label: 'MACD',     params: { fast:12, slow:26, signal:9 }, color: '#10b981', panel: 'sub' },
    ],
  },
  {
    label: 'Volume', color: '#06b6d4',
    indicators: [
      { type: 'vwap', label: 'VWAP', params: {}, color: '#06b6d4', panel: 'overlay' },
      { type: 'obv',  label: 'OBV',  params: {}, color: '#3b82f6', panel: 'sub' },
      { type: 'mfi',  label: 'MFI',  params: { period:14, overbought:80, oversold:20 }, color: '#ec4899', panel: 'sub' },
    ],
  },
  {
    label: 'Volatility', color: '#ef4444',
    indicators: [
      { type: 'bb',  label: 'BB(20,2)', params: { period:20, stdDev:2 }, color: '#8b5cf6', panel: 'overlay' },
      { type: 'atr', label: 'ATR(14)',  params: { period:14 }, color: '#ef4444', panel: 'sub' },
    ],
  },
  {
    label: 'Scalp', color: '#10b981',
    indicators: [
      { type: 'ema', label: 'EMA 9',  params: { period:9 },  color: '#10b981', panel: 'overlay' },
      { type: 'ema', label: 'EMA 21', params: { period:21 }, color: '#3b82f6', panel: 'overlay' },
      { type: 'rsi', label: 'RSI(7)', params: { period:7, overbought:70, oversold:30 }, color: '#a78bfa', panel: 'sub' },
    ],
  },
];

// ─── Math Helpers ─────────────────────────────────────────────────────────────
function sma(data: number[], period: number): (number|null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    return data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
  });
}

function ema(data: number[], period: number): (number|null)[] {
  const k = 2 / (period + 1);
  const result: (number|null)[] = new Array(data.length).fill(null);
  let started = false, prev = 0;
  for (let i = 0; i < data.length; i++) {
    if (!started) {
      if (i === period - 1) {
        prev = data.slice(0, period).reduce((a,b)=>a+b,0)/period;
        result[i] = prev; started = true;
      }
    } else {
      prev = data[i]*k + prev*(1-k);
      result[i] = prev;
    }
  }
  return result;
}

function calcRSI(candles: Candle[], period: number): (number|null)[] {
  const closes = candles.map(c=>c.close);
  const result: (number|null)[] = new Array(candles.length).fill(null);
  if (candles.length < period + 1) return result;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i-1];
    if (d > 0) gains += d; else losses -= d;
  }
  let ag = gains/period, al = losses/period;
  result[period] = 100 - 100/(1+ag/al);
  for (let i = period+1; i < candles.length; i++) {
    const d = closes[i] - closes[i-1];
    const g = d > 0 ? d : 0, l = d < 0 ? -d : 0;
    ag = (ag*(period-1)+g)/period; al = (al*(period-1)+l)/period;
    result[i] = al === 0 ? 100 : 100 - 100/(1+ag/al);
  }
  return result;
}

function calcMACD(candles: Candle[], fast: number, slow: number, sig: number) {
  const closes = candles.map(c=>c.close);
  const fastEma = ema(closes, fast);
  const slowEma = ema(closes, slow);
  const macdLine = fastEma.map((f,i) => f !== null && slowEma[i] !== null ? f! - slowEma[i]! : null);
  const macdVals = macdLine.map(v => v ?? 0);
  const sigLine = ema(macdVals, sig);
  const hist = macdLine.map((m,i) => m !== null && sigLine[i] !== null ? m - sigLine[i]! : null);
  return { macd: macdLine, signal: sigLine, hist };
}

function calcBB(closes: number[], period: number, stdDev: number) {
  const mid = sma(closes, period);
  const upper = mid.map((m,i) => {
    if (m === null) return null;
    const slice = closes.slice(i-period+1, i+1);
    const mean = m;
    const variance = slice.reduce((s,v)=>s+(v-mean)**2,0)/period;
    return m + stdDev * Math.sqrt(variance);
  });
  const lower = mid.map((m,i) => {
    if (m === null) return null;
    const slice = closes.slice(i-period+1, i+1);
    const mean = m;
    const variance = slice.reduce((s,v)=>s+(v-mean)**2,0)/period;
    return m - stdDev * Math.sqrt(variance);
  });
  return { upper, mid, lower };
}

function calcVWAP(candles: Candle[]): number[] {
  let cumPV = 0, cumV = 0;
  return candles.map(c => {
    const tp = (c.high+c.low+c.close)/3;
    cumPV += tp*c.volume; cumV += c.volume;
    return cumV ? cumPV/cumV : tp;
  });
}

function calcStoch(candles: Candle[], k: number, d: number, smooth: number) {
  const kRaw = candles.map((c,i) => {
    if (i < k-1) return null;
    const slice = candles.slice(i-k+1,i+1);
    const lo = Math.min(...slice.map(x=>x.low));
    const hi = Math.max(...slice.map(x=>x.high));
    return hi===lo ? 50 : (c.close-lo)/(hi-lo)*100;
  });
  const kVals = kRaw.map(v=>v??0);
  const kSmooth = ema(kVals, smooth);
  const dLine = ema(kSmooth.map(v=>v??0), d);
  return { k: kSmooth, d: dLine };
}

function calcATR(candles: Candle[], period: number): (number|null)[] {
  const tr = candles.map((c,i) => {
    if (i===0) return c.high-c.low;
    const prev=candles[i-1];
    return Math.max(c.high-c.low, Math.abs(c.high-prev.close), Math.abs(c.low-prev.close));
  });
  return sma(tr, period);
}

function calcCCI(candles: Candle[], period: number): (number|null)[] {
  return candles.map((c,i) => {
    if (i < period-1) return null;
    const slice = candles.slice(i-period+1,i+1);
    const tp = (c.high+c.low+c.close)/3;
    const tps = slice.map(x=>(x.high+x.low+x.close)/3);
    const avg = tps.reduce((a,b)=>a+b,0)/period;
    const md = tps.reduce((s,v)=>s+Math.abs(v-avg),0)/period;
    return md===0 ? 0 : (tp-avg)/(0.015*md);
  });
}

function calcOBV(candles: Candle[]): number[] {
  let obv = 0;
  return candles.map((c,i) => {
    if (i===0) return obv;
    obv += c.close > candles[i-1].close ? c.volume : c.close < candles[i-1].close ? -c.volume : 0;
    return obv;
  });
}

function calcMFI(candles: Candle[], period: number): (number|null)[] {
  const mfRaw = candles.map((c,i) => {
    const tp=(c.high+c.low+c.close)/3;
    const dir=i>0?tp>(candles[i-1].high+candles[i-1].low+candles[i-1].close)/3:true;
    return { tp, vol:c.volume, pos:dir };
  });
  return mfRaw.map((_,i) => {
    if (i<period) return null;
    const w=mfRaw.slice(i-period+1,i+1);
    const pos=w.filter(x=>x.pos).reduce((s,x)=>s+x.tp*x.vol,0);
    const neg=w.filter(x=>!x.pos).reduce((s,x)=>s+x.tp*x.vol,0);
    return neg===0?100:100-(100/(1+pos/neg));
  });
}

// ─── Compute indicator series ─────────────────────────────────────────────────
function computeIndicator(candles: Candle[], cfg: IndicatorConfig): Record<string, (number|null)[]> {
  const closes = candles.map(c=>c.close);
  const { period=14, stdDev=2, overbought=70, oversold=30,
          fast=12, slow=26, signal=9, k=14, d=3, smooth=3 } = cfg.params;
  switch (cfg.type) {
    case 'sma':  return { line: sma(closes, period) };
    case 'ema':  return { line: ema(closes, period) };
    case 'bb': { const b=calcBB(closes,period,stdDev); return { upper:b.upper, mid:b.mid, lower:b.lower }; }
    case 'vwap': return { line: calcVWAP(candles) };
    case 'rsi':  return { line: calcRSI(candles, period), ob: closes.map(()=>overbought), os: closes.map(()=>oversold) };
    case 'macd': { const m=calcMACD(candles,fast,slow,signal); return { macd:m.macd, signal:m.signal, hist:m.hist }; }
    case 'stoch':{ const s=calcStoch(candles,k,d,smooth); return { k:s.k, d:s.d }; }
    case 'atr':  return { line: calcATR(candles, period) };
    case 'cci':  return { line: calcCCI(candles, period), ob: closes.map(()=>100), os: closes.map(()=>-100) };
    case 'obv':  return { line: calcOBV(candles) };
    case 'mfi':  return { line: calcMFI(candles, period), ob: closes.map(()=>overbought), os: closes.map(()=>oversold) };
    default: return {};
  }
}

// ─── Canvas Drawing ───────────────────────────────────────────────────────────
function drawSeries(
  ctx: CanvasRenderingContext2D,
  series: (number|null)[],
  vis: Candle[], vStart: number,
  px: (i:number)=>number, py: (v:number, min:number, max:number, top:number, h:number)=>number,
  color: string, lineWidth: number,
  min: number, max: number, top: number, h: number,
  fill?: { above?: string; below?: string; midY?: number }
) {
  ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.setLineDash([]);
  ctx.beginPath();
  let started = false;
  vis.forEach((_, i) => {
    const v = series[vStart + i];
    if (v === null || isNaN(v)) { started = false; return; }
    const x = px(i), y = py(v, min, max, top, h);
    if (!started) { ctx.moveTo(x,y); started=true; } else ctx.lineTo(x,y);
  });
  ctx.stroke();
}

function drawChart(
  canvas: HTMLCanvasElement,
  candles: Candle[],
  vStart: number, vCount: number,
  opts: { bubbles: boolean; signals: boolean; footprint: boolean },
  tipIdx: number | null,
  indicators: IndicatorConfig[],
  indicatorData: Map<string, Record<string, (number|null)[]>>,
) {
  const ctx = canvas.getContext('2d'); if (!ctx || !candles.length) return;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.width / dpr, H = canvas.height / dpr;

  const vis = candles.slice(vStart, Math.min(vStart + vCount, candles.length));
  if (!vis.length) return;

  // Layout calculation
  const subIndicators = indicators.filter(ind => ind.visible && ind.panel === 'sub');
  const SUB_H = Math.min(80, Math.max(60, (H * 0.28) / Math.max(subIndicators.length, 1)));
  const totalSubH = subIndicators.length * SUB_H;
  const VOL_H = 54;
  const P = { t: 24, r: 76, b: 20, l: 6 };
  const CH = H - P.t - P.b - VOL_H - 6 - totalSubH;
  const CW = W - P.l - P.r;

  const prices = vis.flatMap(c => [c.high, c.low]);
  const minP = Math.min(...prices), maxP = Math.max(...prices);
  const pad = (maxP - minP) * 0.05;
  const priceRange = (maxP - minP + pad*2) || minP * 0.001;
  const priceMin = minP - pad;
  const maxVol = Math.max(...vis.map(c=>c.volume));
  const avgVol = vis.reduce((s,c)=>s+c.volume,0)/vis.length;
  const cw = CW / vis.length, bw = Math.max(1, cw * 0.65);

  const px = (i: number) => P.l + i * cw + cw / 2;
  const py = (p: number) => P.t + CH - ((p - priceMin) / priceRange) * CH;
  const subPy = (v: number, min: number, max: number, top: number, h: number) => {
    const range = max - min || 1;
    return top + h - ((v - min) / range) * h;
  };

  ctx.save(); ctx.scale(dpr, dpr);
  ctx.fillStyle = '#0a0c10'; ctx.fillRect(0, 0, W, H);

  // ── Grid ──────────────────────────────────────────────────────────────────
  ctx.setLineDash([3, 6]);
  for (let i = 0; i <= 5; i++) {
    const p = priceMin + (priceRange / 5) * i, y = py(p);
    ctx.strokeStyle = '#1e2430'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(P.l, y); ctx.lineTo(W - P.r, y); ctx.stroke();
    ctx.fillStyle = '#475569'; ctx.font = '9px monospace'; ctx.textAlign = 'left';
    ctx.fillText(p > 1000 ? p.toFixed(0) : p.toFixed(4), W - P.r + 4, y + 3);
  }
  ctx.setLineDash([]);

  // ── Overlay indicators (drawn before candles for proper z-order) ──────────
  const overlayInds = indicators.filter(ind => ind.visible && ind.panel === 'overlay');
  overlayInds.forEach(cfg => {
    const data = indicatorData.get(cfg.id);
    if (!data) return;
    if (cfg.type === 'bb') {
      // Upper band
      ctx.strokeStyle = cfg.color; ctx.lineWidth = 1; ctx.setLineDash([4,3]);
      ctx.globalAlpha = 0.6;
      ['upper','lower'].forEach(key => {
        ctx.beginPath(); let s=false;
        vis.forEach((_,i)=>{ const v=data[key]?.[vStart+i]; if(v==null){s=false;return;} const x=px(i),y=py(v as number); s?(ctx.lineTo(x,y)):(ctx.moveTo(x,y),s=true); });
        ctx.stroke();
      });
      // Mid band (solid)
      ctx.setLineDash([]); ctx.globalAlpha = 0.5;
      ctx.beginPath(); let s=false;
      vis.forEach((_,i)=>{ const v=data.mid?.[vStart+i]; if(v==null){s=false;return;} const x=px(i),y=py(v as number); s?(ctx.lineTo(x,y)):(ctx.moveTo(x,y),s=true); });
      ctx.stroke();
      // Fill between bands
      ctx.globalAlpha = 0.04;
      ctx.fillStyle = cfg.color;
      ctx.beginPath();
      vis.forEach((_,i)=>{ const v=data.upper?.[vStart+i]; if(v==null)return; const x=px(i),y=py(v as number); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
      vis.slice().reverse().forEach((_,ri)=>{ const i=vis.length-1-ri; const v=data.lower?.[vStart+i]; if(v==null)return; ctx.lineTo(px(i),py(v as number)); });
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1; ctx.setLineDash([]);
    } else {
      const series = data.line;
      if (!series) return;
      ctx.strokeStyle = cfg.color; ctx.lineWidth = 1.5; ctx.setLineDash([]);
      ctx.beginPath(); let started=false;
      vis.forEach((_,i)=>{ const v=series[vStart+i]; if(v==null){started=false;return;} const x=px(i),y=py(v as number); started?(ctx.lineTo(x,y)):(ctx.moveTo(x,y),started=true); });
      ctx.stroke();
    }
  });

  // ── Last price dashed line ────────────────────────────────────────────────
  const last = vis[vis.length-1], isBullLast = last.close >= last.open;
  const lastY = py(last.close);
  ctx.strokeStyle = isBullLast?'rgba(16,185,129,0.4)':'rgba(239,68,68,0.4)';
  ctx.lineWidth=0.8; ctx.setLineDash([4,4]);
  ctx.beginPath(); ctx.moveTo(P.l, lastY); ctx.lineTo(W-P.r, lastY); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle=isBullLast?'#10b981':'#ef4444';
  ctx.fillRect(W-P.r, lastY-8, P.r-1, 16);
  ctx.fillStyle='#0a0c10'; ctx.font='bold 8px monospace'; ctx.textAlign='center';
  ctx.fillText(last.close>1000?last.close.toFixed(1):last.close.toFixed(5), W-P.r+P.r/2, lastY+3);

  // ── Candles ───────────────────────────────────────────────────────────────
  const labelEvery = Math.max(1, Math.floor(vis.length/8));
  vis.forEach((c, i) => {
    const bull=c.close>=c.open, col=bull?'#10b981':'#ef4444';
    const x=px(i), hY=py(c.high), lY=py(c.low);
    const oY=py(c.open), cY=py(c.close);
    const bTop=Math.min(oY,cY), bH=Math.max(1,Math.abs(oY-cY));
    const volTop = P.t + CH + 6;
    const vH=Math.max(1,(c.volume/maxVol)*VOL_H);
    ctx.fillStyle=bull?'rgba(16,185,129,0.28)':'rgba(239,68,68,0.28)';
    ctx.fillRect(x-bw/2, volTop+VOL_H-vH, bw, vH);
    if (opts.footprint) {
      const range=c.high-c.low||0.0001;
      const buyF=bull?(c.close-c.low)/range:(c.high-c.close)/range;
      const buyV=c.volume*buyF, sellV=c.volume-buyV;
      const maxS=Math.max(buyV,sellV), midY=(hY+lY)/2, maxB=Math.max(bw*3,14);
      if (maxS>0) {
        ctx.fillStyle='rgba(16,185,129,0.5)';
        ctx.fillRect(x,midY-4,(buyV/maxS)*maxB*0.5,8);
        ctx.fillStyle='rgba(239,68,68,0.5)';
        ctx.fillRect(x-(sellV/maxS)*maxB*0.5,midY-4,(sellV/maxS)*maxB*0.5,8);
      }
    }
    ctx.strokeStyle=col; ctx.lineWidth=0.8;
    ctx.beginPath(); ctx.moveTo(x,hY); ctx.lineTo(x,lY); ctx.stroke();
    ctx.fillStyle=col; ctx.globalAlpha=0.85;
    ctx.fillRect(x-bw/2,bTop,bw,bH); ctx.globalAlpha=1;
    if (opts.bubbles && c.volume/avgVol>1.8) {
      const spike=c.volume/avgVol, r=Math.min(22,Math.max(5,spike*4));
      const bY=bull?hY-r-4:lY+r+4;
      ctx.beginPath(); ctx.arc(x,bY,r,0,Math.PI*2);
      ctx.fillStyle=bull?'rgba(16,185,129,0.13)':'rgba(239,68,68,0.13)';
      ctx.fill(); ctx.strokeStyle=col; ctx.lineWidth=1; ctx.stroke();
      ctx.fillStyle=col; ctx.font='bold 7px monospace'; ctx.textAlign='center';
      ctx.fillText(`${spike.toFixed(1)}x`,x,bY+2.5);
    }
    if (opts.signals && c.volume/avgVol>2.2) {
      const sy=bull?hY-18:lY+18;
      ctx.fillStyle=bull?'#10b981':'#ef4444';
      ctx.font='bold 10px monospace'; ctx.textAlign='center';
      ctx.fillText(bull?'▲':'▼',x,sy);
    }
    if (tipIdx===i) {
      ctx.strokeStyle='rgba(148,163,184,0.25)'; ctx.lineWidth=1; ctx.setLineDash([2,4]);
      ctx.beginPath(); ctx.moveTo(x,P.t); ctx.lineTo(x,H-P.b); ctx.stroke();
      ctx.setLineDash([]);
    }
    if (i%labelEvery===0) {
      const t=new Date(c.time);
      ctx.fillStyle='#374151'; ctx.font='9px monospace'; ctx.textAlign='center';
      ctx.fillText(`${t.getHours().toString().padStart(2,'0')}:${t.getMinutes().toString().padStart(2,'0')}`, x, H-P.b+14);
    }
  });

  // ── Vol separator ────────────────────────────────────────────────────────
  const volTop = P.t + CH + 6;
  ctx.strokeStyle='#1e2430'; ctx.lineWidth=0.8; ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(P.l, volTop); ctx.lineTo(W-P.r, volTop); ctx.stroke();
  ctx.fillStyle='#374151'; ctx.font='8px monospace'; ctx.textAlign='left';
  ctx.fillText('VOL', P.l+2, volTop+10);

  // ── Sub-panel indicators ──────────────────────────────────────────────────
  subIndicators.forEach((cfg, panelIdx) => {
    const data = indicatorData.get(cfg.id);
    if (!data) return;
    const panelTop = P.t + CH + 6 + VOL_H + 4 + panelIdx * SUB_H;
    const panelH = SUB_H - 4;

    // Panel separator + label
    ctx.strokeStyle='#1e2430'; ctx.lineWidth=0.8;
    ctx.beginPath(); ctx.moveTo(P.l,panelTop); ctx.lineTo(W-P.r,panelTop); ctx.stroke();
    ctx.fillStyle=cfg.color; ctx.font='bold 8px monospace'; ctx.textAlign='left';
    ctx.fillText(cfg.label, P.l+2, panelTop+10);

    // Get all series values for this panel
    const allVals: number[] = [];
    Object.values(data).forEach(series => {
      (series as (number|null)[]).forEach((v,i)=>{ if(v!==null&&i>=vStart&&i<vStart+vCount) allVals.push(v as number); });
    });
    if (!allVals.length) return;
    const minV=Math.min(...allVals), maxV=Math.max(...allVals);

    // Draw series
    if (cfg.type==='macd') {
      // Histogram
      vis.forEach((_,i)=>{
        const v=data.hist?.[vStart+i];
        if(v==null)return;
        const x=px(i), y=subPy(v as number,minV,maxV,panelTop+12,panelH-12);
        const base=subPy(0,minV,maxV,panelTop+12,panelH-12);
        ctx.fillStyle=(v as number)>=0?'rgba(16,185,129,0.5)':'rgba(239,68,68,0.5)';
        ctx.fillRect(x-bw/2,Math.min(y,base),bw,Math.max(1,Math.abs(y-base)));
      });
      // MACD line
      ctx.strokeStyle=cfg.color; ctx.lineWidth=1.5; ctx.setLineDash([]);
      ctx.beginPath(); let s=false;
      vis.forEach((_,i)=>{const v=data.macd?.[vStart+i];if(v==null){s=false;return;}const x=px(i),y=subPy(v as number,minV,maxV,panelTop+12,panelH-12);s?(ctx.lineTo(x,y)):(ctx.moveTo(x,y),s=true);});
      ctx.stroke();
      // Signal line
      ctx.strokeStyle='#f59e0b'; ctx.lineWidth=1; s=false;
      ctx.beginPath();
      vis.forEach((_,i)=>{const v=data.signal?.[vStart+i];if(v==null){s=false;return;}const x=px(i),y=subPy(v as number,minV,maxV,panelTop+12,panelH-12);s?(ctx.lineTo(x,y)):(ctx.moveTo(x,y),s=true);});
      ctx.stroke();
    } else if (cfg.type==='stoch') {
      // OB/OS levels
      ctx.strokeStyle='rgba(239,68,68,0.3)'; ctx.lineWidth=0.5; ctx.setLineDash([3,4]);
      const obY=subPy(80,0,100,panelTop+12,panelH-12);
      const osY=subPy(20,0,100,panelTop+12,panelH-12);
      ctx.beginPath(); ctx.moveTo(P.l,obY); ctx.lineTo(W-P.r,obY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(P.l,osY); ctx.lineTo(W-P.r,osY); ctx.stroke();
      ctx.setLineDash([]);
      // K and D lines
      [['k',cfg.color],['d','#f59e0b']].forEach(([key,col])=>{
        ctx.strokeStyle=col as string; ctx.lineWidth=1.5;
        ctx.beginPath(); let s=false;
        vis.forEach((_,i)=>{const v=(data[key as string] as (number|null)[])?.[vStart+i];if(v==null){s=false;return;}const x=px(i),y=subPy(v as number,0,100,panelTop+12,panelH-12);s?(ctx.lineTo(x,y)):(ctx.moveTo(x,y),s=true);});
        ctx.stroke();
      });
    } else {
      // OB/OS levels if present
      if (data.ob && data.os) {
        const obV=(data.ob[vStart] as number), osV=(data.os[vStart] as number);
        ctx.strokeStyle='rgba(239,68,68,0.3)'; ctx.lineWidth=0.5; ctx.setLineDash([3,4]);
        const obY=subPy(obV,minV,maxV,panelTop+12,panelH-12);
        const osY=subPy(osV,minV,maxV,panelTop+12,panelH-12);
        ctx.beginPath(); ctx.moveTo(P.l,obY); ctx.lineTo(W-P.r,obY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(P.l,osY); ctx.lineTo(W-P.r,osY); ctx.stroke();
        ctx.setLineDash([]);
      }
      // Main line — color-coded for RSI zone
      ctx.strokeStyle=cfg.color; ctx.lineWidth=1.5; ctx.setLineDash([]);
      ctx.beginPath(); let s=false;
      vis.forEach((_,i)=>{
        const v=data.line?.[vStart+i];
        if(v==null){s=false;return;}
        const x=px(i),y=subPy(v as number,minV,maxV,panelTop+12,panelH-12);
        s?(ctx.lineTo(x,y)):(ctx.moveTo(x,y),s=true);
      });
      ctx.stroke();
      // Zero line for OBV/ATR/CCI
      if (['obv','cci'].includes(cfg.type)) {
        ctx.strokeStyle='rgba(148,163,184,0.15)'; ctx.lineWidth=0.5; ctx.setLineDash([2,4]);
        const z=subPy(0,minV,maxV,panelTop+12,panelH-12);
        ctx.beginPath(); ctx.moveTo(P.l,z); ctx.lineTo(W-P.r,z); ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Right-axis label
    const lastValKey = cfg.type==='macd'?'macd':cfg.type==='stoch'?'k':'line';
    const lastVal = (data[lastValKey] as (number|null)[])?.[vStart+vCount-1] ?? (data[lastValKey] as (number|null)[])?.[candles.length-1];
    if (lastVal != null) {
      const labelY=subPy(lastVal as number,minV,maxV,panelTop+12,panelH-12);
      ctx.fillStyle=cfg.color;
      ctx.fillRect(W-P.r, labelY-7, P.r-1, 14);
      ctx.fillStyle='#050505'; ctx.font='bold 7px monospace'; ctx.textAlign='center';
      ctx.fillText((lastVal as number).toFixed(2), W-P.r+P.r/2, labelY+2.5);
    }
  });

  ctx.restore();
}

// ─── Color palette for indicator add ─────────────────────────────────────────
const COLORS = ['#f59e0b','#3b82f6','#10b981','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899','#eab308','#a78bfa','#34d399','#fb923c'];

// ─── Param Editor component ───────────────────────────────────────────────────
function ParamSlider({ label, value, min, max, step=1, onChange }:
  { label:string; value:number; min:number; max:number; step?:number; onChange:(v:number)=>void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-[#475569] w-16 flex-shrink-0">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e=>onChange(Number(e.target.value))}
        className="flex-1 h-1 accent-[#f97316] cursor-pointer" />
      <span className="text-[10px] font-mono text-[#f1f5f9] w-8 text-right">{value}</span>
    </div>
  );
}

// ─── Per-indicator settings popover ──────────────────────────────────────────
function IndicatorSettings({ cfg, onChange, onClose }:
  { cfg: IndicatorConfig; onChange:(c:IndicatorConfig)=>void; onClose:()=>void }) {
  const { params, color } = cfg;
  const set = (p: Partial<IndicatorParams>) => onChange({ ...cfg, params: { ...params, ...p } });
  const setColor = (c:string) => onChange({ ...cfg, color: c });

  return (
    <div className="absolute right-0 top-full mt-1 z-50 bg-[#111318] border border-[#1e2430] rounded-lg shadow-2xl p-3 w-52"
      onClick={e=>e.stopPropagation()}>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#f1f5f9]">{cfg.label} Settings</span>
        <button onClick={onClose} className="text-[#475569] hover:text-[#f1f5f9]"><X size={12}/></button>
      </div>
      <div className="flex flex-col gap-2">
        {/* Color picker */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] text-[#475569] w-16 flex-shrink-0">Color</span>
          <div className="flex gap-1 flex-wrap flex-1">
            {COLORS.map(c=>(
              <button key={c} onClick={()=>setColor(c)}
                className={`w-4 h-4 rounded-full border-2 transition-transform hover:scale-110 ${color===c?'border-white scale-110':'border-transparent'}`}
                style={{background:c}} />
            ))}
          </div>
        </div>
        {/* Param sliders */}
        {params.period !== undefined && <ParamSlider label="Period" value={params.period} min={2} max={200} onChange={v=>set({period:v})} />}
        {params.stdDev !== undefined && <ParamSlider label="Std Dev" value={params.stdDev} min={1} max={4} step={0.5} onChange={v=>set({stdDev:v})} />}
        {params.overbought !== undefined && <ParamSlider label="Overbought" value={params.overbought} min={60} max={90} onChange={v=>set({overbought:v})} />}
        {params.oversold !== undefined && <ParamSlider label="Oversold" value={params.oversold} min={10} max={40} onChange={v=>set({oversold:v})} />}
        {params.fast !== undefined && <ParamSlider label="Fast" value={params.fast} min={3} max={30} onChange={v=>set({fast:v})} />}
        {params.slow !== undefined && <ParamSlider label="Slow" value={params.slow} min={10} max={60} onChange={v=>set({slow:v})} />}
        {params.signal !== undefined && <ParamSlider label="Signal" value={params.signal} min={2} max={20} onChange={v=>set({signal:v})} />}
        {params.k !== undefined && <ParamSlider label="K Period" value={params.k} min={3} max={30} onChange={v=>set({k:v})} />}
        {params.d !== undefined && <ParamSlider label="D Period" value={params.d} min={1} max={10} onChange={v=>set({d:v})} />}
        {params.smooth !== undefined && <ParamSlider label="Smooth" value={params.smooth} min={1} max={10} onChange={v=>set({smooth:v})} />}
      </div>
    </div>
  );
}

// ─── Indicator Sidebar Panel ──────────────────────────────────────────────────
function IndicatorPanel({
  indicators, onAdd, onUpdate, onRemove, onClose
}: {
  indicators: IndicatorConfig[];
  onAdd: (type: IndicatorType) => void;
  onUpdate: (cfg: IndicatorConfig) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [settingsFor, setSettingsFor] = useState<string|null>(null);
  const overlays = INDICATOR_CATALOG.filter(x=>x.panel==='overlay');
  const oscillators = INDICATOR_CATALOG.filter(x=>x.panel==='sub');

  return (
    <div className="flex flex-col h-full bg-[#0d1017] border-l border-[#1e2430] w-52 flex-shrink-0 overflow-y-auto">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#1e2430] flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Layers size={12} className="text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Indicators</span>
        </div>
        <button onClick={onClose} className="text-[#475569] hover:text-[#f1f5f9] transition-colors"><X size={14}/></button>
      </div>

      {/* Active indicators */}
      <div className="flex flex-col gap-1 p-2 flex-shrink-0">
        {indicators.length === 0 && (
          <div className="text-[10px] text-[#374151] text-center py-3">No indicators active</div>
        )}
        {indicators.map(cfg => (
          <div key={cfg.id} className="relative bg-[#0a0c10] border border-[#1e2430] rounded p-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:cfg.color}} />
              <span className="text-[10px] font-bold text-[#f1f5f9] flex-1 truncate">{cfg.label}</span>
              <span className="text-[9px] text-[#374151] px-1 rounded bg-[#1e2430]">
                {cfg.panel==='overlay'?'OV':'SUB'}
              </span>
              <button onClick={()=>setSettingsFor(settingsFor===cfg.id?null:cfg.id)}
                className={`p-0.5 rounded transition-colors ${settingsFor===cfg.id?'text-primary':'text-[#475569] hover:text-[#f1f5f9]'}`}>
                <Settings2 size={11}/>
              </button>
              <button onClick={()=>onUpdate({...cfg,visible:!cfg.visible})}
                className={`text-[9px] px-1 py-0.5 rounded font-bold transition-colors ${cfg.visible?'text-success':'text-[#374151]'}`}>
                {cfg.visible?'ON':'OFF'}
              </button>
              <button onClick={()=>onRemove(cfg.id)} className="text-[#374151] hover:text-danger transition-colors"><X size={11}/></button>
            </div>
            {settingsFor===cfg.id && (
              <IndicatorSettings cfg={cfg} onChange={updated=>{onUpdate(updated);}} onClose={()=>setSettingsFor(null)} />
            )}
          </div>
        ))}
      </div>

      {/* Add indicator */}
      <div className="px-2 pb-2 flex-shrink-0">
        <button onClick={()=>setShowAdd(v=>!v)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded border border-dashed border-[#1e2430] text-[10px] text-[#475569] hover:border-primary/50 hover:text-primary transition-colors">
          <Plus size={11}/> Add Indicator {showAdd?<ChevronUp size={11}/>:<ChevronDown size={11}/>}
        </button>
        {showAdd && (
          <div className="mt-1.5 bg-[#0a0c10] border border-[#1e2430] rounded overflow-hidden">
            <div className="px-2 py-1 text-[9px] text-[#374151] uppercase tracking-wider font-bold bg-[#050505]">Overlays</div>
            {overlays.map(cat=>(
              <button key={cat.type} onClick={()=>{onAdd(cat.type);setShowAdd(false);}}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] text-[#94a3b8] hover:bg-[#161c26] hover:text-[#f1f5f9] transition-colors text-left">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:cat.defaultColor}}/>
                {cat.label}
              </button>
            ))}
            <div className="px-2 py-1 text-[9px] text-[#374151] uppercase tracking-wider font-bold bg-[#050505]">Oscillators</div>
            {oscillators.map(cat=>(
              <button key={cat.type} onClick={()=>{onAdd(cat.type);setShowAdd(false);}}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] text-[#94a3b8] hover:bg-[#161c26] hover:text-[#f1f5f9] transition-colors text-left">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:cat.defaultColor}}/>
                {cat.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
async function fetchCandles(sym: string, iv: string, limit = 300): Promise<Candle[]> {
  const r = await fetch(`http://localhost:5000/api/klines?symbol=${sym}&interval=${iv}&limit=${limit}`);
  const raw: number[][] = await r.json();
  return raw.map(k => ({ time: k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5] }));
}

let indicatorCounter = 0;
function newId() { return `ind_${++indicatorCounter}_${Date.now()}`; }

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
  const [vStart, setVStart] = useState(0);
  const [vCount, setVCount] = useState(120);
  const [showIndicatorPanel, setShowIndicatorPanel] = useState(false);
  const [indicators, setIndicators] = useState<IndicatorConfig[]>([]);
  const [indicatorData, setIndicatorData] = useState<Map<string, Record<string, (number|null)[]>>>(new Map());

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ active: boolean; startX: number; startVStart: number }>({ active: false, startX: 0, startVStart: 0 });

  // Recompute indicator data when candles or indicators change
  useEffect(() => {
    const map = new Map<string, Record<string, (number|null)[]>>();
    indicators.forEach(cfg => { if (candles.length) map.set(cfg.id, computeIndicator(candles, cfg)); });
    setIndicatorData(map);
  }, [candles, indicators]);

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

  const redraw = useCallback(() => {
    const canvas = canvasRef.current, container = containerRef.current;
    if (!canvas || !container || !candles.length) return;
    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth, h = container.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    }
    drawChart(canvas, candles, vStart, vCount, opts, tipIdx, indicators, indicatorData);
  }, [candles, vStart, vCount, opts, tipIdx, indicators, indicatorData]);

  useEffect(() => { redraw(); }, [redraw]);
  useEffect(() => {
    const ro = new ResizeObserver(redraw);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [redraw]);

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

  // Touch pan for mobile
  const touchRef = useRef<{ startX: number; startVStart: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchRef.current = { startX: e.touches[0].clientX, startVStart: vStart };
  };
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!containerRef.current || !candles.length || !touchRef.current) return;
    const cw = containerRef.current.clientWidth / vCount;
    const delta = e.touches[0].clientX - touchRef.current.startX;
    const shift = Math.round(-delta / cw);
    setVStart(Math.max(0, Math.min(candles.length - vCount, touchRef.current.startVStart + shift)));
  }, [candles.length, vCount]);
  const onTouchEnd = () => { touchRef.current = null; };

  const coin = fundingRates.find(d => d.symbol === symbol);
  const signal = storeSignals.find(s => s.symbol === symbol);
  const toggle = (k: keyof typeof opts) => setOpts(p => ({ ...p, [k]: !p[k] }));

  // Add indicator
  const addIndicator = (type: IndicatorType) => {
    const cat = INDICATOR_CATALOG.find(c => c.type === type)!;
    const colorIndex = indicators.length % COLORS.length;
    const cfg: IndicatorConfig = {
      id: newId(), type, label: cat.label, panel: cat.panel,
      color: COLORS[colorIndex], params: { ...cat.defaultParams }, visible: true,
    };
    setIndicators(prev => [...prev, cfg]);
  };

  // Apply preset
  const applyPreset = (preset: Preset) => {
    setIndicators(preset.indicators.map((p, i) => ({
      id: newId(), type: p.type!, label: p.label!, panel: p.panel!,
      color: p.color || COLORS[i % COLORS.length],
      params: { ...p.params! }, visible: true,
    })));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-[#0d1017] border-b border-[#1e2430] px-2 md:px-4 py-2 flex items-center gap-1.5 md:gap-2 flex-wrap">
        <button onClick={() => navigate(-1)} className="text-[#475569] hover:text-[#94a3b8] flex items-center gap-1 text-xs">
          <ArrowLeft size={13} /> <span className="hidden sm:inline">Back</span>
        </button>

        <form onSubmit={e => { e.preventDefault(); setSymbol(inputSym.toUpperCase()); }} className="flex items-center gap-1">
          <input value={inputSym} onChange={e => setInputSym(e.target.value.toUpperCase())}
            className="bg-[#161c26] border border-[#1e2430] rounded px-2.5 py-1.5 text-xs font-mono font-bold text-[#f1f5f9] w-24 md:w-28 focus:outline-none focus:border-[#f97316]/50" />
          <button type="submit" className="bg-primary/20 border border-primary/30 text-primary px-2 py-1.5 rounded text-[10px] font-bold uppercase hover:bg-primary/30">GO</button>
        </form>

        <div className="flex gap-0.5 md:gap-1 overflow-x-auto [scrollbar-width:none]">
          {INTERVALS.map(iv => (
            <button key={iv} onClick={() => setInterval(iv)}
              className={`px-2 py-1.5 rounded text-[10px] font-bold uppercase border transition-colors flex-shrink-0 ${interval === iv ? 'bg-primary/20 border-primary/30 text-primary' : 'border-[#1e2430] text-[#475569] hover:text-[#94a3b8]'}`}>
              {iv}
            </button>
          ))}
        </div>

        <div className="flex gap-1 ml-auto items-center flex-wrap">
          <button onClick={() => { const n = Math.max(20, Math.round(vCount * 0.8)); setVStart(vs => Math.max(0, Math.min(candles.length - n, vs))); setVCount(n); }}
            className="border border-[#1e2430] text-[#475569] hover:text-[#94a3b8] p-1.5 rounded"><ZoomIn size={13} /></button>
          <button onClick={() => { const n = Math.min(candles.length, Math.round(vCount * 1.25)); setVStart(vs => Math.max(0, Math.min(candles.length - n, vs))); setVCount(n); }}
            className="border border-[#1e2430] text-[#475569] hover:text-[#94a3b8] p-1.5 rounded"><ZoomOut size={13} /></button>

          {([
            { k: 'bubbles'   as const, icon: <Volume2 size={11}/>, col: '#06b6d4', lbl: 'Vol' },
            { k: 'signals'   as const, icon: <Zap size={11}/>,     col: '#8b5cf6', lbl: 'Sig' },
            { k: 'footprint' as const, icon: <Footprints size={11}/>, col: '#f59e0b', lbl: 'FP' },
          ]).map(({ k, icon, col, lbl }) => (
            <button key={k} onClick={() => toggle(k)}
              className="flex items-center gap-1 px-1.5 md:px-2 py-1.5 rounded text-[10px] font-bold uppercase border transition-colors"
              style={opts[k] ? { borderColor: `${col}50`, color: col, background: `${col}15` } : { borderColor: '#1e2430', color: '#475569' }}>
              {icon}<span className="hidden md:inline">{lbl}</span>
            </button>
          ))}

          <button onClick={() => setShowIndicatorPanel(v=>!v)}
            className={`flex items-center gap-1 px-2 py-1.5 rounded text-[10px] font-bold uppercase border transition-colors ${showIndicatorPanel ? 'border-primary/40 text-primary bg-primary/10' : 'border-[#1e2430] text-[#475569] hover:text-[#94a3b8]'}`}>
            <Sliders size={11}/><span className="hidden sm:inline">Indicators</span>
            {indicators.length > 0 && <span className="ml-0.5 bg-primary/20 text-primary rounded px-1 text-[9px]">{indicators.length}</span>}
          </button>

          <button onClick={() => load(symbol, interval)}
            className={`border border-[#1e2430] text-[#475569] hover:text-[#94a3b8] p-1.5 rounded ${loading ? 'animate-pulse' : ''}`}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Preset Bar ─────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-[#050505] border-b border-[#1e2430] px-2 md:px-4 py-1.5 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <span className="text-[9px] text-[#374151] uppercase tracking-widest font-bold flex-shrink-0">Presets:</span>
        {PRESETS.map(preset => (
          <button key={preset.label} onClick={() => applyPreset(preset)}
            className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase border border-[#1e2430] text-[#475569] hover:text-[#f1f5f9] hover:border-[#374151] transition-colors whitespace-nowrap">
            <div className="w-1.5 h-1.5 rounded-full" style={{background: preset.color}}/>
            {preset.label}
          </button>
        ))}
        {indicators.length > 0 && (
          <button onClick={() => setIndicators([])}
            className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border border-[#ef4444]/30 text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors ml-auto whitespace-nowrap">
            <X size={9}/> Clear All
          </button>
        )}
      </div>

      {/* ── Funding bar ────────────────────────────────────────────────── */}
      {coin && (
        <div className="flex-shrink-0 bg-[#0d1017] border-b border-[#1e2430] px-3 md:px-4 py-1.5 flex items-center gap-2 md:gap-4 text-xs overflow-x-auto [scrollbar-width:none]">
          <span className="font-bold text-[#f1f5f9] flex-shrink-0">{symbol}</span>
          <span className="text-[#475569] flex-shrink-0">Binance <span className={`font-mono font-bold ${coin.binance.rate < 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>{coin.binance.rate.toFixed(4)}%</span></span>
          <span className="text-[#475569] flex-shrink-0">Bybit <span className={`font-mono font-bold ${coin.bybit.rate < 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>{coin.bybit.rate.toFixed(4)}%</span></span>
          {signal && <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20 flex-shrink-0">{signal.signal}</span>}
          <span className="ml-auto text-[#374151] text-[10px] font-mono hidden md:inline flex-shrink-0">
            {vStart + 1}–{Math.min(vStart + vCount, candles.length)} / {candles.length} · Wheel=zoom · Drag=pan
          </span>
        </div>
      )}

      {/* ── Main area ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Canvas */}
        <div
          ref={containerRef}
          className="flex-1 relative bg-[#0a0c10] cursor-crosshair select-none min-w-0"
          onMouseDown={onMouseDown} onMouseMove={onMouseMove}
          onMouseUp={onMouseUp} onMouseLeave={onMouseLeave}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0a0c10]/80 z-10">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-[#475569] text-xs">Loading {symbol}…</span>
              </div>
            </div>
          )}
          <canvas ref={canvasRef} className="block" />

          {/* Tooltip overlay */}
          {tooltip && (
            <div className="absolute top-2 left-2 bg-[#0d1017]/90 border border-[#1e2430] rounded p-2 text-[10px] pointer-events-none z-10">
              <div className="text-[#94a3b8] font-mono mb-1">{new Date(tooltip.time).toLocaleTimeString()}</div>
              {[['O',tooltip.open],['H',tooltip.high],['L',tooltip.low],['C',tooltip.close]].map(([l,v])=>(
                <div key={l as string} className="flex gap-3">
                  <span className="text-[#475569] w-3">{l}</span>
                  <span className={`font-mono ${l==='C'?(tooltip.close>=tooltip.open?'text-[#10b981]':'text-[#ef4444]'):'text-[#f1f5f9]'}`}>{(v as number).toFixed(4)}</span>
                </div>
              ))}
              <div className="flex gap-3 mt-1 pt-1 border-t border-[#1e2430]">
                <span className="text-[#475569] w-3">V</span>
                <span className="font-mono text-[#94a3b8]">{(tooltip.volume/1000).toFixed(1)}K</span>
              </div>
            </div>
          )}
        </div>

        {/* Indicator panel */}
        {showIndicatorPanel && (
          <IndicatorPanel
            indicators={indicators}
            onAdd={addIndicator}
            onUpdate={cfg => setIndicators(prev => prev.map(x => x.id===cfg.id ? cfg : x))}
            onRemove={id => setIndicators(prev => prev.filter(x => x.id!==id))}
            onClose={() => setShowIndicatorPanel(false)}
          />
        )}

        {/* Stats sidebar — hidden on mobile */}
        {!showIndicatorPanel && (
          <div className="hidden lg:flex flex-shrink-0 w-44 border-l border-[#1e2430] bg-[#0d1017] p-3 flex-col gap-3 overflow-y-auto">
            {candles.length > 0 && (() => {
              const vis = candles.slice(vStart, vStart + vCount);
              const avg = vis.reduce((s,c)=>s+c.volume,0)/vis.length;
              const spikes = vis.filter(c=>c.volume/avg>2).length;
              const bullish = vis.filter(c=>c.close>=c.open).length;
              return (
                <div className="space-y-1.5">
                  {[['Candles',vis.length],['Vol Spikes',spikes],['Bull %',`${Math.round(bullish/vis.length*100)}%`]].map(([l,v])=>(
                    <div key={l as string} className="bg-[#0a0c10] border border-[#1e2430] rounded p-2">
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
                <div className="text-[#64748b] mb-2 leading-relaxed text-[9px]">{signal.reason}</div>
                <div className="h-1 bg-[#161c26] rounded-full overflow-hidden">
                  <div className="h-full bg-[#8b5cf6]" style={{width:`${signal.confidence}%`}} />
                </div>
                <div className="text-right text-[9px] text-[#8b5cf6] mt-0.5">{signal.confidence}%</div>
              </div>
            )}
            {/* Active indicator summary */}
            {indicators.filter(i=>i.visible).length>0 && (
              <div className="bg-[#0a0c10] border border-[#1e2430] rounded p-2">
                <div className="text-[9px] text-[#374151] uppercase tracking-wider mb-1.5">Active</div>
                {indicators.filter(i=>i.visible).map(cfg=>(
                  <div key={cfg.id} className="flex items-center gap-1.5 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background:cfg.color}}/>
                    <span className="text-[9px] text-[#94a3b8] truncate">{cfg.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
