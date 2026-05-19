```text
PROJECT TITLE:
Funding Arbitrage & Crowd Positioning Intelligence Platform

PROJECT OVERVIEW:
Build a professional-grade real-time crypto derivatives intelligence platform that detects funding arbitrage opportunities, crowded market positioning, liquidation risks, and pre-funding scalp setups across multiple exchanges.

The platform should analyze:
- funding rates
- open interest
- order flow behavior
- volume imbalance
- crowd positioning
- liquidity inefficiencies
- cross-exchange spread discrepancies

to identify high-probability trading opportunities caused by leveraged trader behavior and market psychology.

This is NOT a simple trading dashboard.

The core objective is to build a crypto market microstructure analytics engine similar to a lightweight institutional trading intelligence terminal.

--------------------------------------------------

CORE PLATFORM OBJECTIVES:

The system should:
- detect crowded trades
- identify trapped longs/shorts
- monitor funding imbalance
- identify squeeze probability
- detect pre-funding positioning behavior
- monitor cross-exchange arbitrage inefficiencies
- visualize market psychology in realtime

--------------------------------------------------

MVP PHASE 1 GOALS:

1. Multi-exchange funding tracking
2. Funding spread arbitrage detection
3. Open interest tracking
4. Volume imbalance detection
5. Pre-funding scalp opportunity detection
6. Crowd positioning analytics
7. Realtime dashboard
8. WebSocket live updates
9. Funding countdown timers
10. Basic signal generation engine

--------------------------------------------------

TARGET EXCHANGES:

INITIAL MVP:
- Binance
- Bybit

FUTURE:
- OKX
- Hyperliquid
- Blofin
- Bitget

--------------------------------------------------

EXCHANGE APIS:

BINANCE:
REST:
https://api.binance.com/api/v3/funding?symbol=BTCUSDT
GET /dapi/v1/premiumIndex?symbol=BTCUSD_PERP

WEBSOCKET:
wss://ws-api.binance.com:443/ws-api/v3

BYBIT:
REST:
https://api.bybit.com/v2/public/tickers?symbol=BTCUSDT
GET /v2/public/funding/prev-funding-rate?symbol=BTCUSD

BLOFIN:
https://www.blofin.com/api/v1/market/perps/funding

OKX:
https://www.okx.com/docs/en/#futures-and-earn/public-api/tickers/get-funding-rate

HYPERLIQUID:
https://api.hyperliquid.xyz/rest/fundingRate

BITGET:
https://www.bitget.com/api/mix/v1/market/tickers

--------------------------------------------------

IMPORTANT DATA ARCHITECTURE RULES:

DO NOT rely entirely on CCXT for realtime data.

Use:
- native exchange websocket APIs for realtime streaming
- CCXT only for fallback REST calls and exchange normalization

Architecture priority:
WebSockets → primary realtime source
REST APIs → fallback / initialization source

--------------------------------------------------

RECOMMENDED SYSTEM ARCHITECTURE:

Exchange APIs
      ↓
Exchange Adapters
      ↓
Normalization Layer
      ↓
Realtime Data Collector
      ↓
Signal Engine
      ↓
Analytics Layer
      ↓
WebSocket Server
      ↓
React Dashboard

--------------------------------------------------

NORMALIZATION LAYER REQUIREMENTS:

Different exchanges use different:
- symbol formats
- timestamps
- funding formats
- OI structures

Create a normalization layer to standardize:
- symbols
- funding values
- timestamps
- mark prices
- OI values
- exchange metadata

Example:
BTCUSDT
BTC-USD-SWAP
XBTUSDT

should normalize into:
BTCUSDT

--------------------------------------------------

CORE FEATURES:

# 1. FUNDING RATE MONITOR

Track funding rates in realtime for:
- BTC
- ETH
- SOL
- Meme coins
- user-selected pairs

Display:
- current funding
- predicted funding
- next funding timestamp
- funding trend
- funding delta
- funding history

--------------------------------------------------

# 2. FUNDING SPREAD ARBITRAGE DETECTOR

Detect large funding discrepancies between exchanges.

Example:

Binance BTC Funding: -0.9%
Bybit BTC Funding: -0.1%

Spread:
0.8%

Potential Strategy:
- Long Binance perp
- Short Bybit perp

The system should:
- calculate funding spread %
- rank opportunities
- estimate theoretical profitability
- account for trading fees
- account for slippage
- account for spread risk

--------------------------------------------------

# 3. PRE-FUNDING FLOW ANALYSIS

Analyze behavior before funding settlement.

Goal:
Detect if traders are:
- closing shorts before paying funding
- closing longs before paying funding
- hedging positions
- reducing exposure

Detect:
- sudden volume decline
- OI reduction
- volatility compression
- spread expansion
- price stagnation

Generate alerts for:
- possible pre-funding pump
- possible pre-funding dump
- squeeze setups

--------------------------------------------------

# 4. OPEN INTEREST ANALYSIS

Track:
- OI growth
- OI collapse
- OI divergence

Bullish Example:
- negative funding
- rising OI
- price stable

Bearish Example:
- positive funding
- rising OI
- weak price continuation

Goal:
Detect trapped traders before liquidation cascades.

--------------------------------------------------

# 5. CROWD POSITIONING ENGINE

Core concept:
Funding reveals crowd positioning.

The engine should classify:
- overcrowded longs
- overcrowded shorts
- trapped traders
- squeeze probability
- trend exhaustion

Generate:
- confidence score
- squeeze probability
- signal quality score
- trend exhaustion alerts

--------------------------------------------------

# 6. SIGNAL ENGINE

Generate trading signals using weighted scoring logic.

Example LONG SIGNAL:

IF:
- funding deeply negative
- OI rising
- price stable
- short volume weakening
- funding in <10 mins

THEN:
- potential short squeeze

Signal Output:
- direction
- confidence score
- setup type
- risk level
- invalidation level
- supporting metrics

--------------------------------------------------

WEIGHTED SIGNAL SCORING:

Example:

Extreme funding: 30
OI increase: 25
Volume weakening: 20
Price compression: 15
Volatility decline: 10

Final Score:
82/100

--------------------------------------------------

# 7. REALTIME DASHBOARD

UI Style:
- TradingView inspired
- Bloomberg terminal inspired
- dark professional UI
- realtime animations
- glowing alerts
- dense but readable analytics

Dashboard should include:
- live funding table
- exchange comparison
- funding heatmap
- OI charts
- funding countdown timers
- signal feed
- arbitrage opportunities
- crowd positioning panel

--------------------------------------------------

# 8. ALERT SYSTEM

Send alerts via:
- Telegram
- Email

Alert examples:
- extreme funding detected
- funding spread spike
- squeeze probability high
- OI divergence detected
- pre-funding scalp opportunity

--------------------------------------------------

# 9. BACKTESTING MODULE

DO NOT IMPLEMENT YET.

Only create:
- placeholder page
- “Coming Soon” section

Future purpose:
- historical funding analysis
- funding squeeze effectiveness
- arbitrage profitability
- liquidation cascade analysis

--------------------------------------------------

# 10. MARKET REGIME ENGINE

Classify market conditions:
- trending
- ranging
- high volatility
- low liquidity
- panic selling

Signals should adapt based on regime.

--------------------------------------------------

CORE DATA TO TRACK:

- funding rate
- predicted funding
- mark price
- open interest
- volume delta
- spread difference
- funding countdown
- volatility
- order flow imbalance
- websocket latency
- exchange update delay

--------------------------------------------------

SYMBOL FILTERING RULES:

Ignore illiquid pairs.

Minimum requirements:
- minimum volume threshold
- minimum OI threshold
- maximum spread threshold

--------------------------------------------------

TECH STACK:

FRONTEND:
- React
- TailwindCSS
- Recharts
- Zustand
- Framer Motion

BACKEND:
- Node.js
- Express

REALTIME:
- Native exchange WebSockets
- Socket.io

EXCHANGE DATA:
- CCXT (fallback only)
- Native exchange websocket APIs

DATABASE:
- PostgreSQL
- Redis

DEPLOYMENT:
DO NOT DEPLOY UNTIL EXPLICIT PERMISSION IS GIVEN.

Future deployment:
- AWS

--------------------------------------------------

NON-FUNCTIONAL REQUIREMENTS:

- low latency realtime updates
- scalable websocket architecture
- fault-tolerant reconnect logic
- modular signal engine
- exchange abstraction layer
- resilient data pipeline

--------------------------------------------------

SECURITY REQUIREMENTS:

- secure environment variable management
- API key protection
- websocket reconnect protection
- rate limit handling
- retry logic
- exponential backoff strategy

--------------------------------------------------

PERFORMANCE TARGETS:

- sub-second websocket updates
- signal generation under 2 seconds
- support for 100+ trading pairs
- efficient memory usage
- low CPU overhead

--------------------------------------------------

IMPORTANT MARKET LOGIC:

The platform must understand:
- funding itself is NOT the signal
- crowd positioning IS the signal
- trapped traders create opportunities
- liquidation cascades drive volatility
- pre-funding behavior creates temporary inefficiencies

The platform should focus on:
- identifying crowded trades
- spotting squeeze setups
- detecting liquidity imbalance
- visualizing trader psychology

--------------------------------------------------

MVP DEVELOPMENT PRIORITY:

PHASE 1:
- funding tracker
- spread detector
- realtime dashboard

PHASE 2:
- OI analytics
- signal engine
- funding countdowns

PHASE 3:
- alerts
- advanced analytics
- crowd positioning engine

PHASE 4:
- liquidation heatmaps
- AI scoring
- auto execution
- advanced backtesting

--------------------------------------------------

DO NOT IMPLEMENT YET:

- auto trading execution
- liquidation heatmap engine
- AI prediction engine
- advanced ML models
- strategy automation

--------------------------------------------------

RISK DISCLAIMER PAGE:

Add disclaimer:
- educational analytics platform
- not financial advice
- users trade at their own risk

--------------------------------------------------

GOAL OF THE PROJECT:

Create a professional crypto derivatives intelligence platform capable of helping traders identify:
- funding inefficiencies
- crowd traps
- squeeze setups
- cross-exchange arbitrage
- pre-funding scalp opportunities

using realtime market microstructure analysis and crowd positioning intelligence.
```
