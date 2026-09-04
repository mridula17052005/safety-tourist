import { useState } from 'react';
import { Radio, ShieldCheck, ShieldAlert, MapPin, X, Siren } from 'lucide-react';
import { useMonitoring } from '@/lib/monitoring';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

export function RealtimeMonitor() {
  const monitoring = useMonitoring();
  const [expanded, setExpanded] = useState(false);

  const danger = monitoring.nearbyDangerZones[0];
  const statusColor = danger ? 'bg-red-600' : monitoring.isTracking ? 'bg-teal-600' : 'bg-slate-700';

  return (
    <div className="fixed bottom-16 right-4 z-[9999] w-[calc(100%-2rem)] max-w-sm">
      {expanded && (
        <div className="mb-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Live safety monitoring</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {monitoring.isTracking
                  ? 'Your location is being checked continuously for unusual movement and danger zones.'
                  : 'Start monitoring to receive automatic safety alerts and notify your emergency contacts.'}
              </p>
            </div>
            <button onClick={() => setExpanded(false)} className="text-slate-400 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>
          {danger && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <span><strong>Danger zone nearby:</strong> {danger.name}. Leave the area or contact emergency services.</span>
            </div>
          )}
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <MapPin className="h-3.5 w-3.5 text-teal-600" />
            {monitoring.currentPos ? 'Location available' : 'Location not available'}
            <span className="ml-auto">Shake phone 3 times for SOS</span>
          </div>
          <Button
            className="mt-3 w-full"
            variant={monitoring.isTracking ? 'danger' : 'primary'}
            size="sm"
            onClick={monitoring.isTracking ? monitoring.stopTracking : monitoring.startTracking}
          >
            <Radio className="h-4 w-4" />
            {monitoring.isTracking ? 'Stop Monitoring' : 'Start Monitoring'}
          </Button>
        </div>
      )}

      <button
        onClick={() => setExpanded((value) => !value)}
        className={cn(
          'ml-auto flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02]',
          statusColor,
        )}
      >
        {danger ? <Siren className="h-4 w-4 animate-pulse" /> : monitoring.isTracking ? <ShieldCheck className="h-4 w-4" /> : <Radio className="h-4 w-4" />}
        {danger ? 'Danger nearby' : monitoring.isTracking ? 'Monitoring active' : 'Monitoring off'}
        <span className={cn('h-2 w-2 rounded-full', danger || monitoring.isTracking ? 'bg-white animate-pulse' : 'bg-slate-400')} />
      </button>
    </div>
  );
}
