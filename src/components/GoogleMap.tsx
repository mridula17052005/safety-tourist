import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

interface MapMarkerData {
  lat: number;
  lng: number;
  title?: string;
  icon?: string;
  label?: string;
}

export interface GoogleMapHandle {
  panTo: (lat: number, lng: number) => void;
  setMarkers: (markers: MapMarkerData[]) => void;
}

interface GoogleMapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: MapMarkerData[];
  className?: string;
  onMapClick?: (lat: number, lng: number) => void;
}



let mapLoaderPromise: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  if (window.google?.maps) return Promise.resolve();
  if (mapLoaderPromise) return mapLoaderPromise;

  mapLoaderPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
    const src = apiKey
      ? `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
      : `https://maps.googleapis.com/maps/api/js?libraries=places`;
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });

  return mapLoaderPromise;
}

export const GoogleMap = forwardRef<GoogleMapHandle, GoogleMapProps>(function GoogleMap(
  { center, zoom = 14, markers = [], className, onMapClick },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMapsMap | null>(null);
  const markersRef = useRef<GoogleMapsMarker[]>([]);

  useImperativeHandle(ref, () => ({
    panTo(lat, lng) {
      if (mapRef.current) mapRef.current.panTo({ lat, lng });
    },
    setMarkers(newMarkers: MapMarkerData[]) {
      if (!mapRef.current || !window.google) return;
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];

      newMarkers.forEach((m) => {
        const g = window.google!;
        const marker = new g.maps.Marker({
          position: { lat: m.lat, lng: m.lng },
          map: mapRef.current!,
          title: m.title,
          label: m.label,
        });
        markersRef.current.push(marker);
      });
    },
  }));

  useEffect(() => {
    let cancelled = false;

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google) return;

        const g = window.google!;
        mapRef.current = new g.maps.Map(containerRef.current, {
          center: { lat: center.lat, lng: center.lng },
          zoom,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          styles: [
            { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'simplified' }] },
          ],
        });

        if (onMapClick) {
          g.maps.event.addListener(mapRef.current, 'click', (e) => {
            if (e.latLng) onMapClick(e.latLng.lat(), e.latLng.lng());
          });
        }

        markers.forEach((m) => {
          const marker = new g.maps.Marker({
            position: { lat: m.lat, lng: m.lng },
            map: mapRef.current!,
            title: m.title,
            label: m.label,
          });
          markersRef.current.push(marker);
        });
      })
      .catch((err) => {
        console.error('Google Maps load error:', err);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mapRef.current && window.google) {
      mapRef.current.setCenter({ lat: center.lat, lng: center.lng });
    }
  }, [center.lat, center.lng]);

  useEffect(() => {
    if (mapRef.current && window.google) {
      mapRef.current.setZoom(zoom);
    }
  }, [zoom]);

  return <div ref={containerRef} className={className ?? 'w-full h-full min-h-[300px]'} />;
});
