import { useStore } from '../store';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Database } from 'lucide-react';

function formatOI(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-[#16181d] border border-[#2b2f3a] rounded-lg p-3 shadow-xl text-xs">
        <div className="font-bold text-[#f8fafc] mb-2">{d.symbol.replace('USDT', '')}</div>
        <div className="space-y-1 text-[#94a3b8]">
          <div className="flex justify-between gap-4">
            <span>Total OI</span>
            <span className="font-mono text-[#f8fafc]">{formatOI(d.totalOI * d.price)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Binance OI</span>
            <span className="font-mono text-[#3b82f6]">{d.binanceOI.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Bybit OI</span>
            <span className="font-mono text-[#8b5cf6]">{d.bybitOI.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function OIAnalytics() {
  const { openInterestData } = useStore();
  const top = openInterestData.slice(0, 12);

  const chartData = top.map(d => ({
    ...d,
    name: d.symbol.replace('USDT', ''),
    // normalise to USD notional
    binanceUSD: d.binanceOI * d.price,
    bybitUSD: d.bybitOI * d.price,
    totalUSD: d.totalOI * d.price,
  }));

  return (
    <div className="glass-panel rounded-lg overflow-hidden flex flex-col h-full">
      <div className="px-5 py-4 border-b border-[#2b2f3a] bg-[#1a1d24] flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#f8fafc] flex items-center gap-2">
          <Database size={14} className="text-[#3b82f6]" />
          Open Interest Analytics
        </h2>
        <div className="flex items-center gap-3 text-[10px] text-[#64748b] uppercase tracking-wider">
          <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-sm bg-[#3b82f6]"></span>Binance</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-sm bg-[#8b5cf6]"></span>Bybit</span>
        </div>
      </div>

      <div className="p-4 flex-1 min-h-0">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[#64748b] text-sm">
            Loading OI data...
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barCategoryGap="25%" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={v => formatOI(v)}
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#2b2f3a40' }} />
                <Bar dataKey="binanceUSD" stackId="a" radius={[0, 0, 0, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill="#3b82f6" fillOpacity={0.8} />)}
                </Bar>
                <Bar dataKey="bybitUSD" stackId="a" radius={[3, 3, 0, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill="#8b5cf6" fillOpacity={0.8} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Table below chart */}
            <div className="mt-3 overflow-y-auto max-h-[160px]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[#64748b] uppercase tracking-widest text-[10px] border-b border-[#2b2f3a]">
                    <th className="pb-1.5 text-left font-medium">Coin</th>
                    <th className="pb-1.5 text-right font-medium">Binance OI</th>
                    <th className="pb-1.5 text-right font-medium">Bybit OI</th>
                    <th className="pb-1.5 text-right font-medium">Total (USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2b2f3a]/40">
                  {top.map(d => (
                    <tr key={d.symbol} className="hover:bg-[#1e2128]">
                      <td className="py-1.5 font-bold text-[#e2e8f0]">{d.symbol.replace('USDT', '')}</td>
                      <td className="py-1.5 text-right font-mono text-[#3b82f6]">{d.binanceOI.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className="py-1.5 text-right font-mono text-[#8b5cf6]">{d.bybitOI.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className="py-1.5 text-right font-mono text-[#94a3b8]">{formatOI(d.totalOI * d.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
