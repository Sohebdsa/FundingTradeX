import { useStore } from '../store';
import { SignalFeed } from '../components/SignalFeed';

export function SignalsPage() {
  const { fundingRates } = useStore();

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      <div className="flex-shrink-0">
        <h2 className="text-lg font-bold">Signal Engine</h2>
        <p className="text-xs text-[#475569] mt-0.5">
          Real-time crowd positioning signals across {fundingRates.length} perpetual futures pairs
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <SignalFeed />
      </div>
    </div>
  );
}
