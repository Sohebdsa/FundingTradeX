import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BarChart2, Zap, Clock, Activity, Grid3X3 } from 'lucide-react';
import { useStore } from '../store';
import { format } from 'date-fns';

const NAV = [
  { to: '/',          label: 'Market Overview', icon: LayoutDashboard },
  { to: '/analytics', label: 'Analytics',        icon: Grid3X3 },
  { to: '/chart',     label: 'Advanced Chart',   icon: BarChart2 },
  { to: '/signals',   label: 'Signal Feed',      icon: Zap },
  { to: '/backtest',  label: 'Backtesting',      icon: Clock, disabled: true },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { isConnected, lastUpdated, totalPairs } = useStore();
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col bg-[#0a0c10] text-[#f1f5f9] font-sans overflow-hidden">
      {/* Top bar */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 py-2.5 border-b border-[#1e2430] bg-[#0d1017] z-20">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-7 h-7 rounded bg-[#2563eb] flex items-center justify-center shadow-[0_0_12px_rgba(37,99,235,0.6)]">
            <Activity size={16} className="text-white" />
          </div>
          <span className="text-base font-bold tracking-wider">
            FUNDING<span className="text-[#2563eb]">TRADEX</span>
          </span>
          <span className="text-[10px] text-[#64748b] uppercase tracking-widest hidden sm:inline border border-[#1e2430] px-2 py-0.5 rounded">
            Derivatives Intelligence Terminal
          </span>
        </div>

        <div className="flex items-center gap-5 text-xs text-[#64748b]">
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
            isConnected ? 'bg-[#10b981]/10 text-[#10b981]' : 'bg-[#ef4444]/10 text-[#ef4444]'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-[#10b981] animate-pulse' : 'bg-[#ef4444]'}`} />
            {isConnected ? 'Live' : 'Offline'}
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <nav className="flex-shrink-0 w-14 md:w-52 flex flex-col border-r border-[#1e2430] bg-[#0d1017] py-4 gap-1 px-2">
          {NAV.map(({ to, label, icon: Icon, disabled }) => (
            disabled ? (
              <div key={to} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-[#374151] cursor-not-allowed select-none">
                <Icon size={16} className="flex-shrink-0" />
                <span className="hidden md:inline text-xs font-medium">{label}</span>
                <span className="hidden md:inline ml-auto text-[9px] uppercase tracking-wider text-[#374151] bg-[#1e2430] px-1.5 py-0.5 rounded">Soon</span>
              </div>
            ) : (
              <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[#1e3a5f] text-[#60a5fa] border border-[#2563eb]/30'
                    : 'text-[#94a3b8] hover:bg-[#161c26] hover:text-[#f1f5f9]'
                }`
              }>
                <Icon size={16} className="flex-shrink-0" />
                <span className="hidden md:inline">{label}</span>
              </NavLink>
            )
          ))}

          <div className="mt-auto px-2 hidden md:block">
            <div className="text-[9px] uppercase tracking-widest text-[#374151] font-bold mb-2">Exchanges</div>
            <div className="flex items-center gap-2 text-[10px] text-[#475569] mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" /> Binance Perps
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
    </div>
  );
}
