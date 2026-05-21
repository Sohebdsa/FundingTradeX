import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useStore } from './store';
import { Layout } from './components/Layout';
import { MarketOverview } from './pages/MarketOverview';
import { FundingRatesPage } from './pages/FundingRatesPage';
import { CoinDetail } from './pages/CoinDetail';
import { ChartPage } from './pages/ChartPage';
import { SignalsPage } from './pages/SignalsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';

function AppContent() {
  const { connect, disconnect } = useStore();
  useEffect(() => { connect(); return () => disconnect(); }, [connect, disconnect]);

  return (
    <Layout>
      <Routes>
        <Route path="/"              element={<MarketOverview />} />
        <Route path="/rates"          element={<FundingRatesPage />} />
        <Route path="/analytics"     element={<AnalyticsPage />} />
        <Route path="/coin/:symbol"  element={<CoinDetail />} />
        <Route path="/chart"         element={<ChartPage />} />
        <Route path="/chart/:symbol" element={<ChartPage />} />
        <Route path="/signals"       element={<SignalsPage />} />
        <Route path="/backtest"      element={
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
            <div className="w-16 h-16 rounded-full bg-[#1e2430] flex items-center justify-center text-2xl">📊</div>
            <h2 className="text-xl font-bold">Backtesting Module</h2>
            <p className="text-[#475569] text-sm max-w-md">Historical funding event analysis and arbitrage profitability backtesting. Coming in Phase 4.</p>
            <div className="text-[10px] uppercase tracking-widest text-[#2563eb] px-3 py-1.5 rounded border border-[#2563eb]/30 bg-[#2563eb]/10 font-bold">Phase 4 — Not Implemented</div>
          </div>
        } />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
