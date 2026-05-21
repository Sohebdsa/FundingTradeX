import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BarChart2, Zap, Clock, Activity, Grid3X3, Menu, X, TrendingUp } from 'lucide-react';
import { useStore } from '../store';
import { format } from 'date-fns';

const NAV = [
  { to: '/',          label: 'Market Overview', icon: LayoutDashboard },
  { to: '/rates',     label: 'Funding Rates',   icon: TrendingUp },
  { to: '/analytics', label: 'Analytics',        icon: Grid3X3 },
  { to: '/chart',     label: 'Advanced Chart',   icon: BarChart2 },
  { to: '/signals',   label: 'Signal Feed',      icon: Zap },
  { to: '/backtest',  label: 'Backtesting',      icon: Clock, disabled: true },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { isConnected, lastUpdated, totalPairs } = useStore();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="h-[100dvh] flex flex-col bg-background text-[#f1f5f9] font-sans overflow-hidden">
      {/* Top bar */}
      <header className="flex-shrink-0 flex items-center justify-between px-3 md:px-5 py-2.5 border-b border-border bg-panel z-20">
        <div className="flex items-center gap-2 md:gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-7 h-7 rounded bg-primary flex items-center justify-center shadow-[0_0_12px_rgba(249,115,22,0.5)]">
            <Activity size={16} className="text-white" />
          </div>
          <span className="text-sm md:text-base font-bold tracking-wider">
            FUNDING<span className="text-primary">TRADEX</span>
          </span>
          <span className="text-[10px] text-text-dark uppercase tracking-widest hidden lg:inline border border-border px-2 py-0.5 rounded">
            Derivatives Intelligence Terminal
          </span>
        </div>

        <div className="flex items-center gap-2 md:gap-5 text-xs text-text-dark">
          <div className="hidden md:flex items-center gap-1.5">
            <span className="text-[#475569]">Tracking</span>
            <span className="text-[#f1f5f9] font-mono font-bold">{totalPairs.toLocaleString()}</span>
            <span className="text-[#475569]">pairs</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5">
            <span className="text-[#475569]">Updated</span>
            <span className="font-mono">{lastUpdated ? format(lastUpdated,'HH:mm:ss') : '--:--:--'}</span>
          </div>
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
            isConnected ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-success animate-pulse' : 'bg-danger'}`} />
            <span className="hidden sm:inline">{isConnected ? 'Live' : 'Offline'}</span>
          </div>

          {/* Hamburger — mobile only */}
          <button
            className="md:hidden p-1.5 rounded border border-border text-text-muted hover:text-[#f1f5f9] hover:border-text-dark transition-colors"
            onClick={() => setMobileNavOpen(v => !v)}
            aria-label="Toggle navigation"
          >
            {mobileNavOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </header>

      {/* Mobile slide-down nav */}
      {mobileNavOpen && (
        <div className="md:hidden flex-shrink-0 bg-panel border-b border-border z-10 px-3 py-2 flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, disabled }) => (
            disabled ? (
              <div key={to} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-[#374151] cursor-not-allowed select-none">
                <Icon size={16} className="flex-shrink-0" />
                <span className="text-xs font-medium">{label}</span>
                <span className="ml-auto text-[9px] uppercase tracking-wider text-[#374151] bg-border px-1.5 py-0.5 rounded">Soon</span>
              </div>
            ) : (
              <NavLink key={to} to={to} end={to === '/'} onClick={() => setMobileNavOpen(false)} className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : 'text-text-muted hover:bg-panel-hover hover:text-[#f1f5f9]'
                }`
              }>
                <Icon size={16} className="flex-shrink-0" />
                <span>{label}</span>
              </NavLink>
            )
          ))}
          <div className="flex items-center gap-3 px-3 py-2 text-[10px] text-[#475569] border-t border-border mt-1">
            <span>{totalPairs.toLocaleString()} pairs tracked</span>
            <span className="ml-auto font-mono">{lastUpdated ? format(lastUpdated,'HH:mm:ss') : '--:--:--'}</span>
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* Sidebar — desktop only */}
        <nav className="flex-shrink-0 hidden md:flex w-14 lg:w-52 flex-col border-r border-border bg-panel py-4 gap-1 px-2">
          {NAV.map(({ to, label, icon: Icon, disabled }) => (
            disabled ? (
              <div key={to} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-[#374151] cursor-not-allowed select-none">
                <Icon size={16} className="flex-shrink-0" />
                <span className="hidden lg:inline text-xs font-medium">{label}</span>
                <span className="hidden lg:inline ml-auto text-[9px] uppercase tracking-wider text-[#374151] bg-border px-1.5 py-0.5 rounded">Soon</span>
              </div>
            ) : (
              <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : 'text-text-muted hover:bg-panel-hover hover:text-[#f1f5f9]'
                }`
              }>
                <Icon size={16} className="flex-shrink-0" />
                <span className="hidden lg:inline">{label}</span>
              </NavLink>
            )
          ))}

          <div className="mt-auto px-2 hidden lg:block">
            <div className="text-[9px] uppercase tracking-widest text-[#374151] font-bold mb-2">Exchanges</div>
            <div className="flex items-center gap-2 text-[10px] text-[#475569] mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" /> Binance Perps
            </div>
            <div className="flex items-center gap-2 text-[10px] text-[#475569] mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" /> Bybit Linear
            </div>
            <div className="flex items-center gap-2 text-[10px] text-[#475569]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#06b6d4]" /> Blofin Arb
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 min-h-0 overflow-auto">
          {children}
        </main>
      </div>

      {/* Bottom nav bar — mobile only */}
      <nav className="md:hidden flex-shrink-0 border-t border-border bg-panel flex items-center justify-around py-1 z-20">
        {NAV.filter(n => !n.disabled).map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors ${
              isActive ? 'text-primary' : 'text-text-dark hover:text-text-muted'
            }`
          }>
            <Icon size={18} />
            <span className="text-[9px] uppercase tracking-wider font-bold">{label.split(' ')[0]}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
