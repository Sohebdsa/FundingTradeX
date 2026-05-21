const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
const PORT = process.env.PORT || 5000;

// ─── State ────────────────────────────────────────────────────────────────────
let marketData = {
  fundingRates: [], arbitrageOpportunities: [], openInterestData: [],
  signals: [], topFunding: [], volumeSpikes: [], totalPairs: 0, lastUpdated: null,
};
let oiCache = {};
let lastOIUpdate = 0;

// ─── Pair Discovery ───────────────────────────────────────────────────────────
async function fetchBinancePairs() {
  try {
    const r = await axios.get('https://fapi.binance.com/fapi/v1/exchangeInfo', { timeout: 10000 });
    return r.data.symbols
      .filter(s => s.status === 'TRADING' && s.contractType === 'PERPETUAL' && s.quoteAsset === 'USDT')
      .map(s => s.symbol);
  } catch (e) { console.error('[Binance pairs]', e.message); return []; }
}

async function fetchBybitPairs() {
  try {
    const r = await axios.get('https://api.bybit.com/v5/market/instruments-info?category=linear&limit=1000', { timeout: 10000 });
    return (r.data.result?.list || []).filter(s => s.status === 'Trading' && s.quoteCoin === 'USDT').map(s => s.symbol);
  } catch (e) { console.error('[Bybit pairs]', e.message); return []; }
}

// ─── Data Fetchers ────────────────────────────────────────────────────────────
async function fetchBinanceFunding() {
  try {
    const r = await axios.get('https://fapi.binance.com/fapi/v1/premiumIndex', { timeout: 10000 });
    return r.data;
  } catch (e) { console.error('[Binance funding]', e.message); return []; }
}

async function fetchBybitTickers() {
  try {
    const r = await axios.get('https://api.bybit.com/v5/market/tickers?category=linear', { timeout: 10000 });
    return r.data.result?.list || [];
  } catch (e) { console.error('[Bybit tickers]', e.message); return []; }
}

async function fetchBinance24h() {
  try {
    const r = await axios.get('https://fapi.binance.com/fapi/v1/ticker/24hr', { timeout: 10000 });
    return r.data;
  } catch (e) { console.error('[Binance 24h]', e.message); return []; }
}

/**
 * Fetch ALL Blofin SWAP funding rates in one call — 513 pairs.
 * Returns a map: BTCUSDT -> { rate: number (%), nextFunding: number }
 * Only used for arbitrage spread comparison — does NOT affect pair list or avgRate.
 */
async function fetchBlofinFundingMap() {
  try {
    // Single call returns ALL instruments' current funding rates
    const r = await axios.get('https://openapi.blofin.com/api/v1/market/funding-rate?instType=SWAP', { timeout: 8000 });
    const list = r.data?.data || [];
    const map = {};
    for (const item of list) {
      if (!item.instId || item.fundingRate === undefined) continue;
      // Blofin uses BTC-USDT format → convert to BTCUSDT
      const sym = item.instId.replace(/-/g, '').toUpperCase();
      map[sym] = {
        rate: parseFloat(item.fundingRate) * 100,
        nextFunding: parseInt(item.fundingTime || 0),
      };
    }
    console.log(`[Blofin] Loaded ${Object.keys(map).length} funding rates`);
    return map;
  } catch (e) {
    console.error('[Blofin funding]', e.message);
    return {};
  }
}

/**
 * Given rates from up to 3 exchanges, find the pair with the largest spread.
 * Returns { longExchange, shortExchange, longRate, shortRate, spread, exchanges }
 */
function bestArbPair(rates) {
  // rates = [{ name, rate }, ...] — only include available (non-zero) exchanges
  const available = rates.filter(x => x.rate !== 0);
  if (available.length < 2) return null;

  let best = null;
  for (let i = 0; i < available.length; i++) {
    for (let j = i + 1; j < available.length; j++) {
      const spread = Math.abs(available[i].rate - available[j].rate);
      if (!best || spread > best.spread) {
        const longEx  = available[i].rate < available[j].rate ? available[i] : available[j];
        const shortEx = available[i].rate > available[j].rate ? available[i] : available[j];
        best = {
          longExchange:  longEx.name,
          shortExchange: shortEx.name,
          longRate:  longEx.rate.toFixed(4),
          shortRate: shortEx.rate.toFixed(4),
          spread,
          exchanges: available.map(x => x.name).join(','),
        };
      }
    }
  }
  return best;
}

async function updateOICache(symbols) {
  const now = Date.now();
  if (now - lastOIUpdate < 60000) return;
  const top50 = symbols.slice(0, 50);
  const chunks = [];
  for (let i = 0; i < top50.length; i += 10) chunks.push(top50.slice(i, i + 10));
  for (const chunk of chunks) {
    const fetches = chunk.map(sym =>
      axios.get(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${sym}`, { timeout: 5000 })
        .then(r => { oiCache[sym] = parseFloat(r.data.openInterest); })
        .catch(() => { })
    );
    await Promise.all(fetches);
  }
  lastOIUpdate = now;
}

// ─── Signal Engine ─────────────────────────────────────────────────────────────
function computeSignal({ symbol, bRate, byRate }) {
  const avgRate = (bRate + byRate) / 2;
  const spread = Math.abs(bRate - byRate);
  const abs = Math.abs(avgRate);

  if (avgRate < -0.05) return {
    symbol, signal: 'LONG SQUEEZE', direction: 'LONG',
    confidence: Math.round(Math.min(95, 50 + abs * 800)),
    riskLevel: avgRate < -0.1 ? 'HIGH' : 'MEDIUM',
    reason: `Deeply negative funding (${avgRate.toFixed(4)}%) — shorts overcrowded, squeeze likely`,
    avgRate: avgRate.toFixed(5), timestamp: Date.now()
  };

  if (avgRate > 0.05) return {
    symbol, signal: 'SHORT SQUEEZE', direction: 'SHORT',
    confidence: Math.round(Math.min(95, 50 + abs * 800)),
    riskLevel: avgRate > 0.1 ? 'HIGH' : 'MEDIUM',
    reason: `Deeply positive funding (${avgRate.toFixed(4)}%) — longs trapped, reversal risk`,
    avgRate: avgRate.toFixed(5), timestamp: Date.now()
  };

  if (spread > 0.03) return {
    symbol, signal: 'ARBITRAGE', direction: 'NEUTRAL',
    confidence: Math.round(Math.min(90, 60 + spread * 500)),
    riskLevel: 'LOW',
    reason: `Spread ${spread.toFixed(4)}% — cross-exchange funding imbalance`,
    avgRate: avgRate.toFixed(5), timestamp: Date.now()
  };

  return null;
}

// ─── Main Update Loop ─────────────────────────────────────────────────────────
async function updateMarketData() {
  // Fetch all 3 exchanges in parallel; Blofin only used for arb comparison
  const [binanceRaw, bybitRaw, stats24h, blofinMap] = await Promise.all([
    fetchBinanceFunding(), fetchBybitTickers(), fetchBinance24h(), fetchBlofinFundingMap()
  ]);

  // Build lookup maps
  const bMap = {}; for (const d of binanceRaw) bMap[d.symbol] = d;
  const byMap = {}; for (const d of bybitRaw) byMap[d.symbol] = d;
  const sMap = {}; for (const d of stats24h) sMap[d.symbol] = d;

  // Top by volume for OI fetching
  const topByVol = [...stats24h]
    .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
    .slice(0, 60).map(d => d.symbol);
  await updateOICache(topByVol);

  // All USDT symbols
  const allSymbols = [...new Set([...Object.keys(bMap), ...Object.keys(byMap)])].filter(s => s.endsWith('USDT'));

  const rates = [], arbs = [], signals = [], oiData = [], volSpikes = [];

  for (const sym of allSymbols) {
    const b = bMap[sym], by = byMap[sym], stat = sMap[sym];
    const bRate = b ? parseFloat(b.lastFundingRate) * 100 : 0;
    const byRate = by ? parseFloat(by.fundingRate) * 100 : 0;
    const price = b ? parseFloat(b.markPrice) : (by ? parseFloat(by.markPrice) : 0);
    const bNext = b ? parseInt(b.nextFundingTime) : 0;
    const byNext = by ? parseInt(by.nextFundingTime || 0) : 0;
    const byOI = by ? parseFloat(by.openInterest || 0) : 0;
    const binOI = oiCache[sym] || 0;
    const blofinEntry = blofinMap[sym];
    const avgRate = b && by ? (bRate + byRate) / 2 : (bRate || byRate);
    const vol24h = stat ? parseFloat(stat.quoteVolume) : 0;
    const pctChg = stat ? parseFloat(stat.priceChangePercent) : 0;

    rates.push({
      symbol: sym,
      binance: { rate: bRate, price, nextFunding: bNext, oi: binOI },
      bybit: { rate: byRate, nextFunding: byNext, oi: byOI },
      blofin: blofinEntry ? { rate: blofinEntry.rate, nextFunding: blofinEntry.nextFunding } : null,
      avgRate, vol24h, pctChg24h: pctChg,
    });

    if ((binOI + byOI) > 0 && price > 0)
      oiData.push({ symbol: sym, totalOI: binOI + byOI, binanceOI: binOI, bybitOI: byOI, price });

    // ─ Arbitrage: compare all available exchanges, pick best spread pair ─────
    {
      const blofinEntry = blofinMap[sym];
      const exchangeRates = [
        b      ? { name: 'Binance', rate: bRate }           : null,
        by     ? { name: 'Bybit',   rate: byRate }          : null,
        blofinEntry ? { name: 'Blofin', rate: blofinEntry.rate } : null,
      ].filter(Boolean);

      const best = bestArbPair(exchangeRates);
      if (best && best.spread > 0.005) {
        arbs.push({
          symbol: sym,
          spread:        best.spread.toFixed(4),
          longExchange:  best.longExchange,
          shortExchange: best.shortExchange,
          longRate:      best.longRate,
          shortRate:     best.shortRate,
          exchanges:     best.exchanges,          // e.g. "Binance,Bybit,Blofin"
          blofinRate:    blofinEntry ? blofinEntry.rate.toFixed(4) : null,
        });
      }

      // Signal engine still uses only Binance+Bybit (primary sources)
      if (b && by) {
        const sig = computeSignal({ symbol: sym, bRate, byRate });
        if (sig) signals.push(sig);
      }
    }

    // Volume spike: >$100M 24h vol AND >3% price move
    if (vol24h > 100_000_000 && Math.abs(pctChg) > 3)
      volSpikes.push({ symbol: sym, vol24h, pctChg, type: pctChg > 0 ? 'BUYING' : 'SELLING' });
  }

  arbs.sort((a, b) => parseFloat(b.spread) - parseFloat(a.spread));
  signals.sort((a, b) => b.confidence - a.confidence);
  oiData.sort((a, b) => b.totalOI * b.price - a.totalOI * a.price);
  volSpikes.sort((a, b) => Math.abs(b.pctChg) - Math.abs(a.pctChg));

  const topFunding = [...rates].sort((a, b) => Math.abs(b.avgRate) - Math.abs(a.avgRate)).slice(0, 30);

  marketData = {
    fundingRates: rates,
    arbitrageOpportunities: arbs,
    openInterestData: oiData,
    signals: signals.slice(0, 25),
    topFunding,
    volumeSpikes: volSpikes.slice(0, 20),
    totalPairs: rates.length,
    lastUpdated: Date.now(),
  };

  const blofinArbs = arbs.filter(a => a.exchanges && a.exchanges.includes('Blofin')).length;
  console.log(`[${new Date().toISOString()}] ${rates.length} pairs | ${arbs.length} arb (${blofinArbs} 3-way w/Blofin) | ${signals.length} signals`);
  io.emit('market_update', marketData);
}

setInterval(updateMarketData, 15000);
updateMarketData();

// ─── Socket & REST ────────────────────────────────────────────────────────────
io.on('connection', socket => {
  console.log('Client connected:', socket.id);
  socket.emit('market_update', marketData);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

app.get('/api/health', (_, res) => res.json({ status: 'ok', totalPairs: marketData.totalPairs }));
app.get('/api/market', (_, res) => res.json(marketData));
app.get('/api/coin/:symbol', (req, res) => {
  const coin = marketData.fundingRates.find(d => d.symbol === req.params.symbol.toUpperCase());
  coin ? res.json(coin) : res.status(404).json({ error: 'Not found' });
});

// OHLCV proxy (avoids browser CORS on some envs)
app.get('/api/klines', async (req, res) => {
  try {
    const { symbol, interval = '5m', limit = 200 } = req.query;
    const r = await axios.get(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`, { timeout: 8000 });
    res.json(r.data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

server.listen(PORT, "0.0.0.0" ,() => console.log(`Backend running on internet as well as port ${PORT}`));
