import { useStore } from '../store';
import { Activity, Wifi, WifiOff, Clock } from 'lucide-react';
import { format } from 'date-fns';

export function Header() {
  const { isConnected, lastUpdated } = useStore();

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-[#2b2f3a] bg-[#16181d]">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-[#3b82f6] flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
          <Activity size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-wider text-white">FUNDING<span className="text-[#3b82f6]">TRADEX</span></h1>
          <p className="text-xs text-[#94a3b8] uppercase tracking-widest mt-0.5">Microstructure Analytics</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[#64748b]">Last Update:</span>
            <span className="font-mono text-[#f8fafc]">
              {lastUpdated ? format(lastUpdated, 'HH:mm:ss') : '--:--:--'}
            </span>
            <Clock size={14} className="text-[#64748b]" />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-[#64748b] uppercase tracking-wider">Status</span>
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider ${
              isConnected ? 'bg-[#10b981]/15 text-[#10b981]' : 'bg-[#ef4444]/15 text-[#ef4444]'
            }`}>
              {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
