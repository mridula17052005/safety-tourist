import { useNavigate } from 'react-router-dom';
import {
  Shield, Navigation, Phone, Star, Search, Loader2, ChevronLeft,
} from 'lucide-react';
import { GoogleMap } from '@/components/GoogleMap';
import { Card, Button, Badge } from '@/components/ui';
import { formatDistance } from '@/lib/utils';
import { useNearbySearch } from '@/lib/useNearbySearch';

export function PoliceStationsPage() {
  const navigate = useNavigate();
  const { coords, places, loading, searching, error, mapRef, searchNearby } = useNearbySearch('police', 'police station');

  const mapMarkers = places.map((p) => ({ lat: p.lat, lng: p.lng, title: p.name, label: 'P' }));

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/app')}
          className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Nearby Police Stations
          </h1>
          <p className="text-xs text-slate-500">Closest police stations and law enforcement to your location</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Badge className="bg-blue-100 text-blue-700">{places.length} stations found</Badge>
        <Button variant="outline" size="sm" onClick={() => coords && searchNearby(coords)} loading={searching}>
          <Search className="w-4 h-4" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="overflow-hidden p-0">
          <div className="h-[400px] sm:h-[500px] bg-slate-100">
            {coords ? (
              <GoogleMap ref={mapRef} center={coords} zoom={13} markers={mapMarkers} className="w-full h-full" />
            ) : (
              <div className="flex items-center justify-center h-full">
                {loading ? <Loader2 className="w-6 h-6 animate-spin text-teal-600" /> : <p className="text-slate-400 text-sm">{error || 'No location data'}</p>}
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>
          ) : places.length === 0 ? (
            <Card className="p-6 text-center text-slate-400 text-sm">No police stations found nearby. Try refreshing.</Card>
          ) : (
            places.map((place) => (
              <Card key={place.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 text-sm truncate">{place.name}</h3>
                    {place.vicinity && <p className="text-sm text-slate-500 mt-0.5 truncate">{place.vicinity}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Navigation className="w-3.5 h-3.5" />{formatDistance(place.distance)}</span>
                      {place.rating && <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />{place.rating.toFixed(1)}</span>}
                      {place.openNow !== undefined && (
                        <span className={place.openNow ? 'text-green-600 font-medium' : 'text-red-500'}>
                          {place.openNow ? 'Open 24h' : 'Limited hours'}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3 mt-3">
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1">
                        <Navigation className="w-3.5 h-3.5" /> Directions
                      </a>
                      <a href="tel:911" className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" /> Call
                      </a>
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
