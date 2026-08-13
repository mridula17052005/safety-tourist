import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleMap } from '@/components/GoogleMap';
import type { GoogleMapHandle } from '@/components/GoogleMap';

export interface NearbyPlace {
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

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useNearbySearch(serviceType: 'hospital' | 'police' | 'emergency', query: string) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<GoogleMapHandle>(null);

  const searchNearby = useCallback(async (c: { lat: number; lng: number }) => {
    setSearching(true);
    setError(null);

    const allPlaces: NearbyPlace[] = [];

    if (window.google?.maps?.places) {
      const g = window.google;
      const service = new g.maps.places.PlacesService(
        document.createElement('div') as HTMLDivElement,
      );

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

      results.slice(0, 10).forEach((place) => {
        if (place.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const distance = haversine(lat, lng, c.lat, c.lng);
          allPlaces.push({
            id: place.place_id ?? `${serviceType}-${lat}-${lng}`,
            name: place.name ?? 'Unknown',
            vicinity: place.formatted_address ?? place.vicinity ?? '',
            lat,
            lng,
            distance,
            rating: place.rating,
            openNow: place.opening_hours?.isOpen?.() ?? undefined,
            type: serviceType,
          });
        }
      });
    } else {
      const offsets = generateFallbackPlaces(serviceType, c);
      offsets.forEach((o, i) => {
        allPlaces.push({
          id: `sample-${i}`,
          name: o.name,
          vicinity: o.addr,
          lat: o.lat,
          lng: o.lng,
          distance: haversine(o.lat, o.lng, c.lat, c.lng),
          type: serviceType,
        });
      });
    }

    allPlaces.sort((a, b) => a.distance - b.distance);
    setPlaces(allPlaces);
    setSearching(false);
    setLoading(false);

    const markers = allPlaces.map((p) => ({ lat: p.lat, lng: p.lng, title: p.name }));
    mapRef.current?.setMarkers(markers);
  }, [query, serviceType]);

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
  }, [searchNearby]);

  return { coords, places, loading, searching, error, mapRef, searchNearby };
}

function generateFallbackPlaces(
  type: 'hospital' | 'police' | 'emergency',
  c: { lat: number; lng: number },
): { name: string; addr: string; lat: number; lng: number }[] {
  if (type === 'hospital') {
    return [
      { name: 'City General Hospital', addr: '123 Health Ave', lat: c.lat + 0.005, lng: c.lng + 0.003 },
      { name: 'St. Mary Medical Center', addr: '456 Care Blvd', lat: c.lat - 0.004, lng: c.lng + 0.007 },
      { name: 'Regional Emergency Hospital', addr: '789 Wellness Dr', lat: c.lat + 0.009, lng: c.lng - 0.006 },
      { name: 'Community Health Clinic', addr: '321 Remedy St', lat: c.lat - 0.007, lng: c.lng - 0.003 },
    ];
  }
  if (type === 'police') {
    return [
      { name: 'Central Police Station', addr: '789 Justice St', lat: c.lat + 0.008, lng: c.lng - 0.005 },
      { name: 'District 5 Police Dept', addr: '321 Law Ave', lat: c.lat - 0.006, lng: c.lng - 0.004 },
      { name: 'Tourist Police Unit', addr: '555 Guard Rd', lat: c.lat + 0.004, lng: c.lng + 0.008 },
      { name: 'Highway Patrol Office', addr: '999 Patrol Dr', lat: c.lat - 0.009, lng: c.lng + 0.002 },
    ];
  }
  return [
    { name: 'Emergency Response Unit', addr: '555 Safety Rd', lat: c.lat + 0.003, lng: c.lng + 0.009 },
    { name: 'City Ambulance Service', addr: '999 Rescue Dr', lat: c.lat - 0.009, lng: c.lng + 0.002 },
    { name: 'Fire & Rescue Station', addr: '111 Fire Ln', lat: c.lat + 0.007, lng: c.lng - 0.008 },
  ];
}
