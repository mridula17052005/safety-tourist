import { useState, useEffect, useMemo, useRef } from 'react';
import {
  AlertTriangle, MapPin, Search, Filter, ShieldAlert,
  Navigation, Info, Crosshair, Globe, Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { GoogleMap } from '@/components/GoogleMap';
import { Card, Badge, Button, Input, Select, EmptyState } from '@/components/ui';
import {
  cn, haversineDistance, formatDistance, timeAgo,
  dangerZoneTypeLabel, dangerZoneSeverityColor, dangerZoneSeverityBg,
} from '@/lib/utils';
import type { DangerZone, DangerZoneSeverity, DangerZoneType } from '@/lib/types';

const SEVERITY_ORDER: Record<DangerZoneSeverity, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};

const ZONE_TYPE_ICONS: Record<DangerZoneType, string> = {
  general: 'AlertTriangle',
  crime: 'ShieldAlert',
  nightlife: 'AlertTriangle',
  scam: 'AlertTriangle',
  natural_hazard: 'AlertTriangle',
  civil_unrest: 'AlertTriangle',
};

export function DangerZonesPage() {
  const { profile } = useAuth();
  const [zones, setZones] = useState<DangerZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [selectedZone, setSelectedZone] = useState<DangerZone | null>(null);
  const mapRef = useRef<{ panTo: (lat: number, lng: number) => void; setMarkers: (m: any[]) => void }>(null);

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('danger_zones')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setZones(data as DangerZone[]);
    }
    setLoading(false);
  };

  const detectLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const zonesWithDistance = useMemo(() => {
    return zones
      .map((z) => ({
        ...z,
        distance: currentPos
          ? haversineDistance(currentPos.lat, currentPos.lng, z.latitude, z.longitude)
          : null,
        isNear: currentPos
          ? haversineDistance(currentPos.lat, currentPos.lng, z.latitude, z.longitude) <= z.radius_meters + 300
          : false,
      }))
      .filter((z) => {
        if (filterSeverity !== 'all' && z.severity !== filterSeverity) return false;
        if (filterType !== 'all' && z.zone_type !== filterType) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            z.name.toLowerCase().includes(q) ||
            z.city?.toLowerCase().includes(q) ||
            z.country?.toLowerCase().includes(q) ||
            z.description?.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (a.distance != null && b.distance != null) return a.distance - b.distance;
        return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      });
  }, [zones, currentPos, search, filterSeverity, filterType]);

  const nearbyZones = zonesWithDistance.filter((z) => z.isNear);

  const markers = useMemo(() => {
    const zoneMarkers = zonesWithDistance.map((z) => ({
      lat: z.latitude,
      lng: z.longitude,
      title: z.name,
      label: z.severity === 'critical' ? '!' : z.severity === 'high' ? 'H' : z.severity === 'medium' ? 'M' : 'L',
    }));
    if (currentPos) {
      zoneMarkers.push({
        lat: currentPos.lat,
        lng: currentPos.lng,
        title: 'Your location',
        label: 'Y',
      });
    }
    return zoneMarkers;
  }, [zonesWithDistance, currentPos]);

  const mapCenter = currentPos ?? (zonesWithDistance[0] ? { lat: zonesWithDistance[0].latitude, lng: zonesWithDistance[0].longitude } : { lat: 20, lng: 0 });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Danger Zones</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Known high-risk areas around the world. Stay informed before you travel.
          </p>
        </div>
        <Button
          variant={currentPos ? 'primary' : 'outline'}
          size="sm"
          onClick={detectLocation}
          loading={locating}
        >
          <Crosshair className="w-4 h-4" />
          {currentPos ? 'Location Detected' : 'Detect My Location'}
        </Button>
      </div>

      {/* Proximity Warning Banner */}
      {nearbyZones.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
          <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-800 text-sm">
              You are near {nearbyZones.length} danger zone{nearbyZones.length > 1 ? 's' : ''}!
            </h3>
            <p className="text-sm text-red-700 mt-1">
              {nearbyZones.map((z) => z.name).join(', ')} — exercise extreme caution or leave the area.
            </p>
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-blue-800 text-sm">About Danger Zones</h3>
          <p className="text-sm text-blue-700 mt-1">
            These zones are identified based on crime reports, civil unrest, and tourist safety data.
            Unlike paid government SOS services, this information is free and accessible to all tourists.
            Always exercise caution and check local advisories before traveling.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search by name, city, or country..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search className="w-4 h-4" />}
          className="flex-1"
        />
        <Select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} className="sm:w-40">
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </Select>
        <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="sm:w-44">
          <option value="all">All Types</option>
          <option value="crime">Crime Area</option>
          <option value="nightlife">Nightlife Risk</option>
          <option value="scam">Tourist Scam</option>
          <option value="civil_unrest">Civil Unrest</option>
          <option value="natural_hazard">Natural Hazard</option>
          <option value="general">General Risk</option>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Map */}
        <Card className="overflow-hidden lg:col-span-1">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-teal-600" />
            <h2 className="font-semibold text-slate-900">Danger Zone Map</h2>
            {currentPos && (
              <Badge className="bg-green-100 text-green-700 ml-auto">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Your Location
              </Badge>
            )}
          </div>
          <div className="h-[450px] bg-slate-100">
            <GoogleMap
              ref={mapRef}
              center={mapCenter}
              zoom={currentPos ? 12 : 2}
              markers={markers}
              className="w-full h-full"
            />
          </div>
        </Card>

        {/* List */}
        <div className="space-y-3 max-h-[510px] overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
            </div>
          ) : zonesWithDistance.length === 0 ? (
            <Card className="p-6">
              <EmptyState
                icon={<AlertTriangle className="w-7 h-7" />}
                title="No danger zones found"
                description="Try adjusting your search or filters."
              />
            </Card>
          ) : (
            zonesWithDistance.map((zone) => (
              <Card
                key={zone.id}
                className={cn(
                  'p-4 cursor-pointer transition-all hover:shadow-md',
                  selectedZone?.id === zone.id && 'ring-2 ring-teal-500',
                  zone.isNear && 'border-red-300',
                )}
                onClick={() => {
                  setSelectedZone(zone);
                  mapRef.current?.panTo(zone.latitude, zone.longitude);
                }}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                    zone.severity === 'critical' ? 'bg-red-100'
                      : zone.severity === 'high' ? 'bg-orange-100'
                      : zone.severity === 'medium' ? 'bg-amber-100'
                      : 'bg-blue-100',
                  )}>
                    <AlertTriangle className={cn(
                      'w-5 h-5',
                      zone.severity === 'critical' ? 'text-red-600'
                        : zone.severity === 'high' ? 'text-orange-600'
                        : zone.severity === 'medium' ? 'text-amber-600'
                        : 'text-blue-600',
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 text-sm">{zone.name}</h3>
                      <Badge className={dangerZoneSeverityColor(zone.severity)}>
                        {zone.severity.toUpperCase()}
                      </Badge>
                      {zone.isNear && (
                        <Badge className="bg-red-500 text-white animate-pulse">NEARBY</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {dangerZoneTypeLabel(zone.zone_type)}
                      {zone.city && ` · ${zone.city}`}
                      {zone.country && `, ${zone.country}`}
                    </p>
                    <p className="text-sm text-slate-600 mt-2 line-clamp-2">{zone.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Navigation className="w-3 h-3" />
                        {zone.distance != null ? formatDistance(zone.distance) : 'Distance unknown'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {formatDistance(zone.radius_meters)} radius
                      </span>
                      <span>{timeAgo(zone.updated_at)}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
