import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Crosshair, Play, Square, Siren, Navigation, Gauge,
  Battery, AlertTriangle, Activity, ChevronLeft, Maximize2,
} from 'lucide-react';
import { useMonitoring } from '@/lib/monitoring';
import { GoogleMap } from '@/components/GoogleMap';
import { Card, Button, Badge } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { GoogleMapHandle } from '@/components/GoogleMap';

export function LiveLocationPage() {
  const navigate = useNavigate();
  const mapRef = useRef<GoogleMapHandle>(null);
  const {
    currentPos, isTracking, error, startTracking, stopTracking, triggerSOS,
    safetyScore, detection, speed, batteryLevel, recentAlerts,
  } = useMonitoring();

  const severityColor = (s: string) => {
    switch (s) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-amber-500 text-white';
      default: return 'bg-green-500 text-white';
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app')}
            className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Live Location</h1>
            <p className="text-xs text-slate-500">Real-time GPS tracking with AI safety monitoring</p>
          </div>
        </div>
        <div className={cn(
          'px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5',
          isTracking ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500',
        )}>
          <span className={cn('w-1.5 h-1.5 rounded-full', isTracking ? 'bg-green-500 animate-pulse' : 'bg-slate-400')} />
          {isTracking ? 'Tracking' : 'Stopped'}
        </div>
      </div>

      {/* Full-screen map */}
      <Card className="overflow-hidden p-0">
        <div className="relative h-[400px] sm:h-[500px]">
          {currentPos ? (
            <GoogleMap
              ref={mapRef}
              center={currentPos}
              zoom={16}
              markers={[{ lat: currentPos.lat, lng: currentPos.lng, title: 'Your Location', label: '●' }]}
              className="w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400">
              <Crosshair className="w-12 h-12 mb-2" />
              <p className="text-sm">Start tracking to see your live location</p>
            </div>
          )}

          {/* Overlay controls */}
          <div className="absolute top-3 right-3 flex flex-col gap-2">
            <button
              onClick={() => currentPos && mapRef.current?.panTo(currentPos.lat, currentPos.lng)}
              className="w-10 h-10 rounded-lg bg-white shadow-lg flex items-center justify-center hover:bg-slate-50 transition-colors"
              title="Recenter"
            >
              <Crosshair className="w-5 h-5 text-teal-600" />
            </button>
          </div>

          {/* SOS button overlay */}
          {isTracking && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <button
                onClick={triggerSOS}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-red-600 text-white font-bold shadow-2xl hover:bg-red-700 active:scale-95 transition-all animate-pulse"
              >
                <Siren className="w-5 h-5" />
                SOS
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* Tracking controls */}
      <div className="flex gap-3">
        {!isTracking ? (
          <Button onClick={startTracking} className="flex-1 flex items-center justify-center gap-2">
            <Play className="w-4 h-4" /> Start Tracking
          </Button>
        ) : (
          <Button onClick={stopTracking} variant="outline" className="flex-1 flex items-center justify-center gap-2">
            <Square className="w-4 h-4" /> Stop Tracking
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Live stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<Gauge className="w-4 h-4" />} label="Safety Score" value={`${safetyScore}`} suffix="/100" color={safetyScore >= 70 ? 'green' : safetyScore >= 40 ? 'amber' : 'red'} />
        <StatCard icon={<Navigation className="w-4 h-4" />} label="Speed" value={`${(speed * 3.6).toFixed(1)}`} suffix=" km/h" color="teal" />
        <StatCard icon={<Battery className="w-4 h-4" />} label="Battery" value={`${batteryLevel}`} suffix="%" color={batteryLevel > 20 ? 'green' : 'red'} />
        <StatCard icon={<Activity className="w-4 h-4" />} label="AI Status" value={detection ? detection.severity.toUpperCase() : 'IDLE'} color={detection?.severity === 'critical' ? 'red' : detection?.severity === 'high' ? 'amber' : 'green'} />
      </div>

      {/* AI Detection panel */}
      {detection && (
        <Card className="overflow-hidden">
          <div className={cn('px-5 py-3 flex items-center justify-between', severityColor(detection.severity))}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-semibold text-sm">AI Detection — {detection.severity.toUpperCase()}</span>
            </div>
            <span className="text-xs opacity-90">Risk: {Math.round(detection.riskScore * 100)}%</span>
          </div>
          <div className="p-5 space-y-3">
            <p className="text-sm text-slate-700">{detection.message}</p>
            <div className="space-y-1.5">
              {detection.treeVotes.map((vote, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-28 text-slate-500 shrink-0">{vote.tree}</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className={cn('h-full rounded-full', vote.vote > 0.3 ? 'bg-red-400' : vote.vote > 0.15 ? 'bg-amber-400' : 'bg-green-400')} style={{ width: `${vote.vote * 100}%` }} />
                  </div>
                  <span className="w-8 text-right text-slate-400">{Math.round(vote.vote * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Recent alerts */}
      {recentAlerts.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold text-slate-800 mb-3 text-sm">Recent Alerts</h3>
          <div className="space-y-2">
            {recentAlerts.slice(0, 4).map((alert) => (
              <div key={alert.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50">
                <div className={cn('w-2 h-2 rounded-full shrink-0', alert.severity === 'critical' ? 'bg-red-500' : alert.severity === 'high' ? 'bg-orange-500' : 'bg-amber-500')} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{alert.message}</p>
                  <p className="text-xs text-slate-400">{new Date(alert.created_at).toLocaleString()}</p>
                </div>
                <Badge className="text-xs capitalize">{alert.severity}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, suffix, color }: { icon: React.ReactNode; label: string; value: string; suffix?: string; color: string }) {
  const colorMap: Record<string, string> = {
    green: 'text-green-600 bg-green-50',
    amber: 'text-amber-600 bg-amber-50',
    red: 'text-red-600 bg-red-50',
    teal: 'text-teal-600 bg-teal-50',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <div className={cn('w-6 h-6 rounded-md flex items-center justify-center', colorMap[color])}>
          {icon}
        </div>
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <div className="flex items-baseline gap-0.5">
        <span className="text-lg font-bold text-slate-900">{value}</span>
        {suffix && <span className="text-xs text-slate-400">{suffix}</span>}
      </div>
    </div>
  );
}
