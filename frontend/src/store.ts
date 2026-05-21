import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

export interface FundingData {
  symbol: string;
  binance:  { rate: number; price: number; nextFunding: number; oi: number };
  bybit:    { rate: number; nextFunding: number; oi: number };
  blofin?:  { rate: number; nextFunding: number };
  avgRate:  number;
  vol24h:   number;
  pctChg24h: number;
}
export interface ArbitrageOpportunity {
  symbol: string; spread: string;
  longExchange: string; shortExchange: string;
  longRate: string; shortRate: string;
  // Blofin is an optional 3rd exchange in arb detection
  blofinRate?: string | null;
  exchanges?: string; // e.g. "Binance,Bybit,Blofin"
}
export interface OIDataPoint {
  symbol: string; totalOI: number; binanceOI: number; bybitOI: number; price: number;
}
export interface Signal {
  symbol: string; signal: string;
  direction: 'LONG' | 'SHORT' | 'NEUTRAL';
  confidence: number; riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  reason: string; avgRate: string; timestamp: number;
}
export interface VolumeSpike {
  symbol: string; vol24h: number; pctChg: number; type: 'BUYING' | 'SELLING';
}
export type FilterMode = 'all' | 'high_funding' | 'arbitrage' | 'extreme_positive' | 'extreme_negative' | 'meme' | 'volume_spike' | 'high_max_spread' | 'low_max_spread';

const MEME_TOKENS = new Set(['DOGE','SHIB','PEPE','FLOKI','BONK','WIF','MEME','BOME','DOGS','NEIRO','POPCAT','COW','TURBO','BRETT']);

interface MarketState {
  fundingRates: FundingData[];
  arbitrageOpportunities: ArbitrageOpportunity[];
  openInterestData: OIDataPoint[];
  signals: Signal[];
  topFunding: FundingData[];
  volumeSpikes: VolumeSpike[];
  totalPairs: number;
  lastUpdated: number | null;
  isConnected: boolean;
  socket: Socket | null;
  filterMode: FilterMode;
  searchQuery: string;
  setFilter: (mode: FilterMode) => void;
  setSearch: (q: string) => void;
  filteredRates: () => FundingData[];
  connect: () => void;
  disconnect: () => void;
}

export const useStore = create<MarketState>((set, get) => ({
  fundingRates: [], arbitrageOpportunities: [], openInterestData: [],
  signals: [], topFunding: [], volumeSpikes: [],
  totalPairs: 0, lastUpdated: null, isConnected: false, socket: null,
  filterMode: 'all', searchQuery: '',

  setFilter: (mode) => set({ filterMode: mode }),
  setSearch:  (q)    => set({ searchQuery: q }),

  filteredRates: () => {
    const { fundingRates, filterMode, searchQuery, arbitrageOpportunities, volumeSpikes } = get();
    let list = fundingRates;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toUpperCase();
      list = list.filter(d => d.symbol.includes(q));
    }
    const arbSet   = new Set(arbitrageOpportunities.map(a => a.symbol));
    const spikeSet = new Set(volumeSpikes.map(v => v.symbol));
    switch (filterMode) {
      case 'high_funding':     list = list.filter(d => Math.abs(d.avgRate) > 0.04).sort((a,b) => Math.abs(b.avgRate)-Math.abs(a.avgRate)); break;
      case 'extreme_positive': list = list.filter(d => d.avgRate > 0.03).sort((a,b) => b.avgRate-a.avgRate); break;
      case 'extreme_negative': list = list.filter(d => d.avgRate < -0.03).sort((a,b) => a.avgRate-b.avgRate); break;
      case 'arbitrage':        list = list.filter(d => arbSet.has(d.symbol)).sort((a,b)=>parseFloat((arbitrageOpportunities.find(x=>x.symbol===b.symbol)?.spread??'0'))-parseFloat((arbitrageOpportunities.find(x=>x.symbol===a.symbol)?.spread??'0'))); break;
      case 'meme':             list = list.filter(d => MEME_TOKENS.has(d.symbol.replace('USDT',''))).sort((a,b)=>Math.abs(b.avgRate)-Math.abs(a.avgRate)); break;
      case 'volume_spike':     list = list.filter(d => spikeSet.has(d.symbol)).sort((a,b)=>b.vol24h-a.vol24h); break;
      case 'high_max_spread':
        list = list.sort((a, b) => {
          const rA = [a.binance.rate, a.bybit.rate]; if (a.blofin) rA.push(a.blofin.rate);
          const rB = [b.binance.rate, b.bybit.rate]; if (b.blofin) rB.push(b.blofin.rate);
          return (Math.max(...rB) - Math.min(...rB)) - (Math.max(...rA) - Math.min(...rA));
        });
        break;
      case 'low_max_spread':
        list = list.sort((a, b) => {
          const rA = [a.binance.rate, a.bybit.rate]; if (a.blofin) rA.push(a.blofin.rate);
          const rB = [b.binance.rate, b.bybit.rate]; if (b.blofin) rB.push(b.blofin.rate);
          return (Math.max(...rA) - Math.min(...rA)) - (Math.max(...rB) - Math.min(...rB));
        });
        break;
      default:                 list = list.sort((a,b)=>Math.abs(b.avgRate)-Math.abs(a.avgRate));
    }
    return list;
  },

  connect: () => {
    if (get().socket) return;
    const socket = io('http://localhost:5000');
    socket.on('connect',          () => set({ isConnected: true, socket }));
    socket.on('disconnect',       () => set({ isConnected: false }));
    socket.on('market_update', data  => set({
      fundingRates: data.fundingRates ?? [],
      arbitrageOpportunities: data.arbitrageOpportunities ?? [],
      openInterestData: data.openInterestData ?? [],
      signals: data.signals ?? [],
      topFunding: data.topFunding ?? [],
      volumeSpikes: data.volumeSpikes ?? [],
      totalPairs: data.totalPairs ?? 0,
      lastUpdated: data.lastUpdated,
    }));
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) { socket.disconnect(); set({ socket: null, isConnected: false }); }
  },
}));
