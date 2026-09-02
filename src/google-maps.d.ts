// Google Maps JavaScript API type declarations
// Minimal ambient types for the features used in this app

interface GoogleMapsMapOptions {
  center: { lat: number; lng: number };
  zoom: number;
  mapTypeControl?: boolean;
  streetViewControl?: boolean;
  fullscreenControl?: boolean;
  styles?: GoogleMapsMapStyle[];
}

interface GoogleMapsMap {
  setCenter(latLng: { lat: number; lng: number }): void;
  setZoom(zoom: number): void;
  panTo(latLng: { lat: number; lng: number }): void;
}

interface GoogleMapsMarkerOptions {
  position: { lat: number; lng: number };
  map: GoogleMapsMap | null;
  title?: string;
  label?: string | GoogleMapsMarkerLabel;
}

interface GoogleMapsMarkerLabel {
  text: string;
  color?: string;
  fontWeight?: string;
  fontSize?: string;
}

interface GoogleMapsMarker {
  setMap(map: GoogleMapsMap | null): void;
}

interface GoogleMapsLatLng {
  lat(): number;
  lng(): number;
}

interface GoogleMapsMapMouseEvent {
  latLng: GoogleMapsLatLng | null;
}

interface GoogleMapsMapStyle {
  featureType?: string;
  elementType?: string;
  stylers: Record<string, string>[];
}

interface GoogleMapsTextSearchRequest {
  location: GoogleMapsLatLng;
  radius: number;
  query: string;
}

interface GoogleMapsPlaceResult {
  place_id?: string;
  name?: string;
  formatted_address?: string;
  vicinity?: string;
  rating?: number;
  geometry?: {
    location: GoogleMapsLatLng;
  };
  opening_hours?: {
    isOpen?: () => boolean;
  };
}

interface GoogleMapsPlacesService {
  textSearch(
    request: GoogleMapsTextSearchRequest,
    callback: (results: GoogleMapsPlaceResult[] | null, status: string) => void,
  ): void;
}

interface GoogleMapsPlaces {
  PlacesService: new (el: HTMLElement) => GoogleMapsPlacesService;
}

interface GoogleMapsEvent {
  addListener(
    instance: unknown,
    event: string,
    handler: (e: GoogleMapsMapMouseEvent) => void,
  ): void;
}

interface GoogleMapsMaps {
  Map: new (element: HTMLElement, opts: GoogleMapsMapOptions) => GoogleMapsMap;
  Marker: new (opts: GoogleMapsMarkerOptions) => GoogleMapsMarker;
  LatLng: new (lat: number, lng: number) => GoogleMapsLatLng;
  places: GoogleMapsPlaces;
  event: GoogleMapsEvent;
}

interface GoogleMapsNamespace {
  maps: GoogleMapsMaps;
}

interface Window {
  google?: GoogleMapsNamespace;
}
