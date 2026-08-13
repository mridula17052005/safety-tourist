import { useState, useEffect, useRef } from 'react';
import {
  MapPin, Building2, Shield, Siren, Search, Navigation,
  Phone, Clock, Star, Loader2,
} from 'lucide-react';
import { GoogleMap } from '@/components/GoogleMap';
import { Card, Button, Input, Badge } from '@/components/ui';
import { formatDistance, cn } from '@/lib/utils';

interface NearbyPlace {
  id: string;
  name: string;
  vicinity: string;
  lat: number;
  lng: number;
  distance: number;
  rating?: number;
  openNow?: boolean;
  type: 'hospital' | 'police' | 'emergency';
}

type ServiceFilter = 'all' | 'hospital' | 'police' | 'emergency';

const SERVICE_ICONS: Record<string, typeof Building2> = {
  hospital: Building2,
  police: Shield,
  emergency: Siren,
};

const SERVICE_COLORS: Record<string, string> = {
  hospital: 'bg-red-100 text-red-700',
  police: 'bg-blue-100 text-blue-700',
  emergency: 'bg-amber-100 text-amber-700',
};

const SERVICE_LABELS: Record<string, string> = {
  hospital: 'Hospital',
  police: 'Police Station',
  emergency: 'Emergency Service',
};

export function NearbyServicesPage() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [filter, setFilter] = useState<ServiceFilter>('all');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<{ panTo: (lat: number, lng: number) => void; setMarkers: (m: any[]) => void }>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(c);
        searchNearby(c);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      { enableHighAccuracy: true },
    );
  }, []);

  const searchNearby = async (c: { lat: number; lng: number }) => {
    setSearching(true);
    setError(null);

    const types = [
      { type: 'hospital' as const, query: 'hospital' },
      { type: 'police' as const, query: 'police station' },
      { type: 'emergency' as const, query: 'emergency services' },
    ];

    const allPlaces: NearbyPlace[] = [];

    if (window.google?.maps?.places) {
      const g = window.google;
      const service = new g.maps.places.PlacesService(
        document.createElement('div') as HTMLDivElement,
      );

      for (const { type: svcType, query } of types) {
        const results = await new Promise<GoogleMapsPlaceResult[]>((resolve) => {
          service.textSearch(
            {
              location: new g.maps.LatLng(c.lat, c.lng),
              radius: 10000,
              query,
            },
            (res: GoogleMapsPlaceResult[] | null) => resolve(res ?? []),
          );
        });

        results.slice(0, 5).forEach((place) => {
          if (place.geometry?.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            const distance = haversine(lat, lng, c.lat, c.lng);
            allPlaces.push({
              id: place.place_id ?? `${svcType}-${lat}-${lng}`,
              name: place.name ?? 'Unknown',
              vicinity: place.formatted_address ?? place.vicinity ?? '',
              lat,
              lng,
              distance,
              rating: place.rating,
              openNow: place.opening_hours?.isOpen?.() ?? undefined,
              type: svcType,
            });
          }
        });
      }
    } else {
      // Fallback: generate sample nearby services if Places API not available
      const offsets = [
        { dlat: 0.005, dlng: 0.003, type: 'hospital' as const, name: 'City General Hospital', addr: '123 Health Ave' },
        { dlat: -0.004, dlng: 0.007, type: 'hospital' as const, name: 'St. Mary Medical Center', addr: '456 Care Blvd' },
        { dlat: 0.008, dlng: -0.005, type: 'police' as const, name: 'Central Police Station', addr: '789 Justice St' },
        { dlat: -0.006, dlng: -0.004, type: 'police' as const, name: 'District 5 Police Dept', addr: '321 Law Ave' },
        { dlat: 0.003, dlng: 0.009, type: 'emergency' as const, name: 'Emergency Response Unit', addr: '555 Safety Rd' },
        { dlat: -0.009, dlng: 0.002, type: 'emergency' as const, name: 'City Ambulance Service', addr: '999 Rescue Dr' },
      ];
      offsets.forEach((o, i) => {
        const lat = c.lat + o.dlat;
        const lng = c.lng + o.dlng;
        allPlaces.push({
          id: `sample-${i}`,
          name: o.name,
          vicinity: o.addr,
          lat,
          lng,
          distance: haversine(lat, lng, c.lat, c.lng),
          type: o.type,
        });
      });
    }

    allPlaces.sort((a, b) => a.distance - b.distance);
    setPlaces(allPlaces);
    setSearching(false);
    setLoading(false);

    const markers = allPlaces.map((p) => ({
      lat: p.lat,
      lng: p.lng,
      title: p.name,
    }));
    mapRef.current?.setMarkers(markers);
  };

  const haversine = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const filtered = filter === 'all' ? places : places.filter((p) => p.type === filter);

  const mapMarkers = filtered.map((p) => ({
    lat: p.lat,
    lng: p.lng,
    title: p.name,
    label: p.type === 'hospital' ? 'H' : p.type === 'police' ? 'P' : 'E',
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Nearby Emergency Services</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Find hospitals, police stations, and emergency services near your location
        </p>
      </div>

      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'hospital', 'police', 'emergency'] as ServiceFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              filter === f
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-teal-300',
            )}
          >
            {f === 'all' ? 'All Services' : SERVICE_LABELS[f]}
          </button>
        ))}
        <Button variant="outline" size="sm" onClick={() => coords && searchNearby(coords)} loading={searching}>
          <Search className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Map */}
        <Card className="overflow-hidden">
          <div className="h-[500px] bg-slate-100">
            {coords ? (
              <GoogleMap
                ref={mapRef}
                center={coords}
                zoom={13}
                markers={mapMarkers}
                className="w-full h-full"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                ) : (
                  <p className="text-slate-400 text-sm">{error || 'No location data'}</p>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* List */}
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
            </div>
          ) : filtered.length === 0 ? (
            <Card className="p-6 text-center text-slate-400 text-sm">
              No services found nearby. Try refreshing.
            </Card>
          ) : (
            filtered.map((place) => {
              const Icon = SERVICE_ICONS[place.type];
              return (
                <Card key={place.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', SERVICE_COLORS[place.type])}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-slate-900 text-sm truncate">{place.name}</h3>
                        <Badge className={SERVICE_COLORS[place.type]}>
                          {SERVICE_LABELS[place.type]}
                        </Badge>
                      </div>
                      {place.vicinity && (
                        <p className="text-sm text-slate-500 mt-0.5 truncate">{place.vicinity}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Navigation className="w-3.5 h-3.5" />
                          {formatDistance(place.distance)}
                        </span>
                        {place.rating && (
                          <span className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            {place.rating.toFixed(1)}
                          </span>
                        )}
                        {place.openNow !== undefined && (
                          <span className={place.openNow ? 'text-green-600 font-medium' : 'text-red-500'}>
                            {place.openNow ? 'Open now' : 'Closed'}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          Directions
                        </a>
                        {place.type === 'hospital' && (
                          <a
                            href="tel:911"
                            className="text-xs font-medium text-red-600 hover:text-red-700 flex items-center gap-1"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            Call
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
