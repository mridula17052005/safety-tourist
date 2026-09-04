import { useRef, useMemo, useState } from 'react';
import {
  Shield, ShieldAlert, ShieldCheck, Activity, Battery, Zap,
  AlertTriangle, MapPin, Navigation, Radio, TrendingDown, TrendingUp,
  Siren, Clock, Cpu, Eye,
} from 'lucide-react';
import { useMonitoring } from '@/lib/monitoring';
import { useAuth } from '@/lib/auth';
import { GoogleMap } from '@/components/GoogleMap';
import { Card, Button, Badge, EmptyState } from '@/components/ui';
import {
  formatSpeed, timeAgo, severityColor, alertTypeLabel, cn,
} from '@/lib/utils';

export function TouristDashboard() {
  const { profile } = useAuth();
  const tracking = useMonitoring();
  const mapRef = useRef<{ panTo: (lat: number, lng: number) => void; setMarkers: (m: any[]) => void }>(null);

  const markers = useMemo(() => {
    if (!tracking.currentPos) return [];
    const pts = [
      {
        lat: tracking.currentPos.lat,
        lng: tracking.currentPos.lng,
        title: 'Your current location',
        label: 'Y',
      },
    ];
    return pts;
  }, [tracking.currentPos]);

  const scoreColor = tracking.safetyScore >= 80 ? 'text-green-600'
    : tracking.safetyScore >= 60 ? 'text-amber-600'
    : tracking.safetyScore >= 40 ? 'text-orange-600'
    : 'text-red-600';

  const scoreBg = tracking.safetyScore >= 80 ? 'from-green-500 to-teal-500'
    : tracking.safetyScore >= 60 ? 'from-amber-400 to-yellow-500'
    : tracking.safetyScore >= 40 ? 'from-orange-400 to-red-400'
    : 'from-red-500 to-rose-600';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome, {profile?.full_name?.split(' ')[0] || 'Traveler'}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {tracking.isTracking
              ? 'Live tracking active — AI is monitoring your safety'
              : 'Turn on live tracking to enable AI safety monitoring'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tracking.isTracking ? (
            <Button variant="danger" onClick={tracking.stopTracking}>
              <Radio className="w-4 h-4" />
              Stop Tracking
            </Button>
          ) : (
            <Button onClick={tracking.startTracking}>
              <Radio className="w-4 h-4" />
              Start Live Tracking
            </Button>
          )}
        </div>
      </div>

      {tracking.error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {tracking.error}
        </div>
      )}

      {/* SOS Banner */}
      <SOSButton onTrigger={tracking.triggerSOS} disabled={!tracking.currentPos} />

      {/* Top stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Safety Score */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-500">Safety Score</span>
            {tracking.safetyScore >= 80 ? (
              <ShieldCheck className="w-5 h-5 text-green-500" />
            ) : tracking.safetyScore >= 60 ? (
              <Shield className="w-5 h-5 text-amber-500" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-red-500" />
            )}
          </div>
          <div className="flex items-end gap-2">
            <span className={cn('text-4xl font-bold', scoreColor)}>{tracking.safetyScore}</span>
            <span className="text-sm text-slate-400 mb-1">/ 100</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-500', scoreBg)}
              style={{ width: `${tracking.safetyScore}%` }}
            />
          </div>
        </Card>

        {/* Current Speed */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-500">Current Speed</span>
            <Navigation className="w-5 h-5 text-teal-500" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-slate-900">
              {tracking.speed > 0 ? Math.round(tracking.speed * 3.6) : 0}
            </span>
            <span className="text-sm text-slate-400 mb-1">km/h</span>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            {tracking.speed > 0.5 ? 'Moving' : 'Stationary'}
          </p>
        </Card>

        {/* Battery */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-500">Battery</span>
            <Battery className={cn('w-5 h-5', tracking.batteryLevel <= 15 ? 'text-red-500' : 'text-green-500')} />
          </div>
          <div className="flex items-end gap-2">
            <span className={cn(
              'text-4xl font-bold',
              tracking.batteryLevel <= 15 ? 'text-red-500' : 'text-slate-900',
            )}>
              {tracking.batteryLevel}
            </span>
            <span className="text-sm text-slate-400 mb-1">%</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                tracking.batteryLevel <= 15 ? 'bg-red-500' : tracking.batteryLevel <= 30 ? 'bg-amber-400' : 'bg-green-500',
              )}
              style={{ width: `${tracking.batteryLevel}%` }}
            />
          </div>
        </Card>

        {/* AI Status */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-500">AI Monitor</span>
            <Cpu className={cn('w-5 h-5', tracking.isTracking ? 'text-teal-500' : 'text-slate-300')} />
          </div>
          <div className="flex items-end gap-2">
            {tracking.isTracking ? (
              <>
                <span className="text-2xl font-bold text-teal-600">Active</span>
                <span className="flex items-center gap-1 text-xs text-teal-500 mb-1">
                  <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                  Scanning
                </span>
              </>
            ) : (
              <span className="text-2xl font-bold text-slate-400">Idle</span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-3">
            {tracking.isTracking ? 'Random Forest model analyzing' : 'Start tracking to activate'}
          </p>
        </Card>
      </div>

      {/* Map + AI Detection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <Card className="lg:col-span-2 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-teal-600" />
              <h2 className="font-semibold text-slate-900">Live GPS Tracking</h2>
            </div>
            {tracking.isTracking && (
              <Badge className="bg-green-100 text-green-700">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Live
              </Badge>
            )}
          </div>
          <div className="h-[400px] bg-slate-100">
            {tracking.currentPos ? (
              <GoogleMap
                ref={mapRef}
                center={tracking.currentPos}
                zoom={16}
                markers={markers}
                className="w-full h-full"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <EmptyState
                  icon={<MapPin className="w-7 h-7" />}
                  title="No location data yet"
                  description="Start live tracking to see your position on the map."
                />
              </div>
            )}
          </div>
          {tracking.currentPos && (
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-sm text-slate-600 flex items-center gap-4">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-teal-500" />
                {tracking.currentPos.lat.toFixed(4)}, {tracking.currentPos.lng.toFixed(4)}
              </span>
              <span className="flex items-center gap-1">
                <Navigation className="w-4 h-4 text-teal-500" />
                {formatSpeed(tracking.speed)}
              </span>
            </div>
          )}
        </Card>

        {/* AI Detection Panel */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-5 h-5 text-teal-600" />
            <h2 className="font-semibold text-slate-900">AI Detection</h2>
          </div>

          {tracking.detection ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-500">Risk Level</span>
                  <Badge className={severityColor(tracking.detection.severity)}>
                    {tracking.detection.severity.toUpperCase()}
                  </Badge>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      tracking.detection.riskScore >= 0.6 ? 'bg-red-500'
                        : tracking.detection.riskScore >= 0.4 ? 'bg-orange-500'
                        : tracking.detection.riskScore >= 0.2 ? 'bg-amber-400'
                        : 'bg-green-500',
                    )}
                    style={{ width: `${tracking.detection.riskScore * 100}%` }}
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 text-sm text-slate-700">
                {tracking.detection.message}
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Decision Trees</p>
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {tracking.detection.treeVotes.map((vote) => (
                    <div key={vote.tree} className="flex items-center gap-2 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{
                        backgroundColor: vote.vote > 0.3 ? '#ef4444' : vote.vote > 0.1 ? '#f59e0b' : '#10b981',
                      }} />
                      <span className="font-medium text-slate-600 w-28 shrink-0 truncate">{vote.tree}</span>
                      <span className="text-slate-400 truncate flex-1">{vote.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<Cpu className="w-7 h-7" />}
              title="AI model idle"
              description="Start tracking to activate the Random Forest safety model."
            />
          )}
        </Card>
      </div>

      {/* AI Recommendations */}
      {tracking.recommendations.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-teal-600" />
            <h2 className="font-semibold text-slate-900">AI Safety Recommendations</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tracking.recommendations.slice(0, 4).map((rec, i) => (
              <div
                key={i}
                className={cn(
                  'p-4 rounded-xl border',
                  rec.priority === 'high' ? 'border-red-200 bg-red-50'
                    : rec.priority === 'medium' ? 'border-amber-200 bg-amber-50'
                    : 'border-slate-200 bg-slate-50',
                )}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-semibold',
                    rec.priority === 'high' ? 'bg-red-200 text-red-800'
                      : rec.priority === 'medium' ? 'bg-amber-200 text-amber-800'
                      : 'bg-slate-200 text-slate-700',
                  )}>
                    {rec.priority.toUpperCase()}
                  </span>
                  <h3 className="font-semibold text-slate-800 text-sm">{rec.title}</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{rec.content}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Alerts */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Siren className="w-5 h-5 text-teal-600" />
          <h2 className="font-semibold text-slate-900">Recent Alerts</h2>
        </div>
        {tracking.recentAlerts.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck className="w-7 h-7" />}
            title="No alerts yet"
            description="You are all clear. The AI model will alert you if it detects anything unusual."
          />
        ) : (
          <div className="space-y-2">
            {tracking.recentAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <div className={cn('w-2 h-12 rounded-full', severityColor(alert.severity).split(' ')[0])} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800 text-sm">{alertTypeLabel(alert.type)}</span>
                    <Badge className={severityColor(alert.severity)}>{alert.severity}</Badge>
                  </div>
                  <p className="text-sm text-slate-500 truncate">{alert.message}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                  {timeAgo(alert.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function SOSButton({ onTrigger, disabled }: { onTrigger: () => Promise<void>; disabled: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [pressed, setPressed] = useState(false);

  const handleSOS = async () => {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    setPressed(true);
    await onTrigger();
    setPressed(false);
    setConfirming(false);
  };

  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white">
      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
        <Siren className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-lg">Emergency SOS</h3>
        <p className="text-sm text-red-100">
          {disabled
            ? 'Start live tracking first to enable SOS'
            : confirming
              ? 'Press again to confirm — this will alert your contacts and authorities'
              : pressed
                ? 'Sending alerts...'
                : 'Tap to send an instant emergency alert with your live location'}
        </p>
      </div>
      <button
        onClick={handleSOS}
        disabled={disabled || pressed}
        className={cn(
          'px-6 py-3 rounded-xl font-bold text-red-700 transition-all active:scale-95',
          confirming ? 'bg-white animate-pulse' : 'bg-white hover:bg-red-50',
          (disabled || pressed) && 'opacity-50 cursor-not-allowed',
        )}
      >
        {confirming ? 'CONFIRM SOS' : 'SOS'}
      </button>
    </div>
  );
}
