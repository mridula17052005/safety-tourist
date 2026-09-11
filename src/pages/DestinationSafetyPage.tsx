import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  MapPin, Search, Cloud, Sun, CloudRain, AlertTriangle, Shield,
  ShieldCheck, ShieldAlert, Loader2, ChevronDown, Navigation,
  Info, CheckCircle, AlertOctagon, Lightbulb,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { GoogleMap } from '@/components/GoogleMap';
import { Card, Button, Badge, Input, Select, EmptyState } from '@/components/ui';
import { cn, haversineDistance, formatDistance, timeAgo, dangerZoneSeverityColor } from '@/lib/utils';
import type { DangerZone, Incident } from '@/lib/types';
import { getCurrentSeason, seasonLabel, type Destination, type Season } from '@/lib/destinations';
import {
  assessDestinationSafety, findNearbyDangerZones, findNearbyIncidents,
  type DestinationAssessment, type WeatherInfo,
} from '@/lib/destinationModel';
import type { GoogleMapHandle } from '@/components/GoogleMap';

export function DestinationSafetyPage() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDest, setSelectedDest] = useState<Destination | null>(null);
  const [assessment, setAssessment] = useState<DestinationAssessment | null>(null);
  const [assessing, setAssessing] = useState(false);
  const [dangerZones, setDangerZones] = useState<DangerZone[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<GoogleMapHandle>(null);

  const season = useMemo(() => getCurrentSeason(), []);

  useEffect(() => {
    fetchDestinations();
    fetchDangerZones();
    fetchIncidents();
  }, []);

  const fetchDestinations = async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('destinations')
      .select('*')
      .order('name', { ascending: true });
    if (!err && data) {
      setDestinations(data as Destination[]);
    }
    setLoading(false);
  };

  const fetchDangerZones = async () => {
    const { data } = await supabase
      .from('danger_zones')
      .select('*')
      .eq('is_active', true);
    if (data) setDangerZones(data as DangerZone[]);
  };

  const fetchIncidents = async () => {
    const { data } = await supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setIncidents(data as Incident[]);
  };

  const fetchWeather = useCallback(async (dest: Destination) => {
    setWeatherLoading(true);
    setWeather(null);
    try {
      const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY as string | undefined;
      if (!apiKey) {
        setWeatherLoading(false);
        return;
      }
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${dest.latitude}&lon=${dest.longitude}&appid=${apiKey}&units=metric`,
      );
      if (!res.ok) {
        setWeatherLoading(false);
        return;
      }
      const data = await res.json();
      const condition = data.weather?.[0]?.main ?? 'Unknown';
      const temperature = Math.round(data.main?.temp ?? 0);
      const rainfall = data.rain?.['1h'] ?? 0;
      const alerts: string[] = [];
      setWeather({ condition, temperature, rainfall, alerts });
    } catch {
      setWeather(null);
    }
    setWeatherLoading(false);
  }, []);

  const handleSelectDestination = async (dest: Destination) => {
    setSelectedDest(dest);
    setAssessment(null);
    setError(null);
    setWeather(null);
    await fetchWeather(dest);
    runAssessment(dest);
  };

  const runAssessment = useCallback(
    async (dest: Destination) => {
      setAssessing(true);
      setError(null);
      try {
        const nearbyZones = findNearbyDangerZones(dest.latitude, dest.longitude, dangerZones);
        const nearbyIncidents = findNearbyIncidents(dest.latitude, dest.longitude, incidents);
        const result = assessDestinationSafety({
          destination: {
            name: dest.name,
            latitude: dest.latitude,
            longitude: dest.longitude,
            summer_suitable: dest.summer_suitable,
            winter_suitable: dest.winter_suitable,
            monsoon_considerations: dest.monsoon_considerations,
          },
          season,
          weather,
          dangerZones: nearbyZones,
          incidents: nearbyIncidents,
        });
        setAssessment(result);
      } catch {
        setError('Safety assessment unavailable because current data could not be retrieved.');
      }
      setAssessing(false);
    },
    [dangerZones, incidents, season, weather],
  );

  useEffect(() => {
    if (selectedDest && !assessing && assessment) {
      runAssessment(selectedDest);
    }
  }, [weather, selectedDest, runAssessment, assessing, assessment]);

  const filteredDestinations = useMemo(() => {
    if (!search) return destinations;
    const q = search.toLowerCase();
    return destinations.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.state.toLowerCase().includes(q) ||
        d.destination_type.toLowerCase().includes(q),
    );
  }, [destinations, search]);

  const nearbyZones = useMemo(() => {
    if (!selectedDest) return [];
    return findNearbyDangerZones(selectedDest.latitude, selectedDest.longitude, dangerZones);
  }, [selectedDest, dangerZones]);

  const mapMarkers = useMemo(() => {
    if (!selectedDest) return [];
    const markers: { lat: number; lng: number; title: string; label: string }[] = [
      { lat: selectedDest.latitude, lng: selectedDest.longitude, title: selectedDest.name, label: 'D' },
    ];
    nearbyZones.forEach((z) => {
      markers.push({
        lat: z.latitude,
        lng: z.longitude,
        title: z.name,
        label: z.severity === 'critical' ? '!' : z.severity === 'high' ? 'H' : z.severity === 'medium' ? 'M' : 'L',
      });
    });
    return markers;
  }, [selectedDest, nearbyZones]);

  const scoreColor = assessment
    ? assessment.score >= 80
      ? 'text-green-600'
      : assessment.score >= 60
        ? 'text-amber-600'
        : assessment.score >= 40
          ? 'text-orange-600'
          : 'text-red-600'
    : 'text-slate-400';

  const scoreBg = assessment
    ? assessment.score >= 80
      ? 'from-green-500 to-teal-500'
      : assessment.score >= 60
        ? 'from-amber-400 to-yellow-500'
        : assessment.score >= 40
          ? 'from-orange-400 to-red-400'
          : 'from-red-500 to-rose-600'
    : 'from-slate-300 to-slate-400';

  const riskIcon = assessment
    ? assessment.score >= 80
      ? <ShieldCheck className="w-6 h-6 text-green-500" />
      : assessment.score >= 60
        ? <Shield className="w-6 h-6 text-amber-500" />
        : assessment.score >= 40
          ? <ShieldAlert className="w-6 h-6 text-orange-500" />
          : <ShieldAlert className="w-6 h-6 text-red-500" />
    : null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Check Destination Safety</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Search for a tourist destination and get a current safety assessment based on available data.
        </p>
      </div>

      <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200">
        <Info className="w-4 h-4 text-blue-600 shrink-0" />
        <p className="text-xs text-blue-700">
          Assessments are based on available data and are not a guarantee of safety. Always check official local advisories.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search destinations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search className="w-4 h-4" />}
          className="flex-1"
        />
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-100 text-sm text-slate-600 shrink-0">
          <Cloud className="w-4 h-4 text-teal-600" />
          Current season: <span className="font-semibold">{seasonLabel(season)}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredDestinations.map((dest) => (
            <button
              key={dest.id}
              onClick={() => handleSelectDestination(dest)}
              className={cn(
                'p-3 rounded-xl border text-left transition-all hover:shadow-md hover:border-teal-400',
                selectedDest?.id === dest.id
                  ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-200'
                  : 'border-slate-200 bg-white',
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
                <span className="font-semibold text-slate-800 text-sm truncate">{dest.name}</span>
              </div>
              <p className="text-xs text-slate-500 truncate">{dest.state}</p>
              <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                {dest.destination_type.replace('_', ' ')}
              </span>
            </button>
          ))}
        </div>
      )}

      {selectedDest && (
        <>
          {error && (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {assessing && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
              <span className="ml-2 text-sm text-slate-500">Assessing safety conditions...</span>
            </div>
          )}

          {assessment && !assessing && (
            <>
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {riskIcon}
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">{selectedDest.name}</h2>
                      <p className="text-xs text-slate-500">
                        {selectedDest.state}, {selectedDest.country}
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={cn(
                      'text-sm',
                      assessment.riskLevel === 'LOW RISK' && 'bg-green-100 text-green-700',
                      assessment.riskLevel === 'MODERATE RISK' && 'bg-amber-100 text-amber-700',
                      assessment.riskLevel === 'HIGH RISK' && 'bg-orange-100 text-orange-700',
                      assessment.riskLevel === 'VERY HIGH RISK' && 'bg-red-100 text-red-700',
                    )}
                  >
                    {assessment.riskLevel}
                  </Badge>
                </div>

                <div className="flex items-end gap-2 mb-3">
                  <span className={cn('text-5xl font-bold', scoreColor)}>{assessment.score}</span>
                  <span className="text-sm text-slate-400 mb-2">/ 100</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100 overflow-hidden mb-6">
                  <div
                    className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-700', scoreBg)}
                    style={{ width: `${assessment.score}%` }}
                  />
                </div>

                <div className="space-y-2 mb-6">
                  {assessment.factors.map((factor, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border',
                        factor.status === 'good' && 'bg-green-50 border-green-200',
                        factor.status === 'warning' && 'bg-amber-50 border-amber-200',
                        factor.status === 'danger' && 'bg-red-50 border-red-200',
                      )}
                    >
                      {factor.status === 'good' ? (
                        <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <span className="text-sm font-medium text-slate-800">{factor.label}</span>
                        <p className="text-xs text-slate-600 mt-0.5">{factor.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-teal-600" />
                    <h3 className="text-sm font-semibold text-slate-800">Today's Safety Recommendation</h3>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{assessment.recommendation}</p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-2">Precautions</h3>
                  <ul className="space-y-1.5">
                    {assessment.precautions.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0 mt-1.5" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Assessment Details (Decision Trees)</p>
                  <div className="space-y-1.5">
                    {assessment.treeVotes.map((vote, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{
                          backgroundColor: vote.vote > 0.3 ? '#ef4444' : vote.vote > 0.1 ? '#f59e0b' : '#10b981',
                        }} />
                        <span className="font-medium text-slate-600 w-36 shrink-0 truncate">{vote.tree}</span>
                        <span className="text-slate-400 truncate flex-1">{vote.reason}</span>
                        <span className="w-8 text-right text-slate-400">{Math.round(vote.vote * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-teal-600" />
                    <h2 className="font-semibold text-slate-900">Destination Map</h2>
                  </div>
                  <div className="h-[350px] bg-slate-100">
                    <GoogleMap
                      ref={mapRef}
                      center={{ lat: selectedDest.latitude, lng: selectedDest.longitude }}
                      zoom={10}
                      markers={mapMarkers}
                      className="w-full h-full"
                    />
                  </div>
                </Card>

                <div className="space-y-3">
                  <Card className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Cloud className="w-5 h-5 text-teal-600" />
                      <h3 className="font-semibold text-slate-900 text-sm">Current Weather</h3>
                    </div>
                    {weatherLoading ? (
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading weather...
                      </div>
                    ) : weather ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          {weather.condition.includes('Rain') || weather.condition.includes('Storm') ? (
                            <CloudRain className="w-8 h-8 text-blue-500" />
                          ) : (
                            <Sun className="w-8 h-8 text-amber-500" />
                          )}
                          <div>
                            <span className="text-2xl font-bold text-slate-900">{weather.temperature}°C</span>
                            <p className="text-sm text-slate-500">{weather.condition}</p>
                          </div>
                        </div>
                        {weather.rainfall > 0 && (
                          <p className="text-xs text-slate-500">Rainfall: {weather.rainfall} mm</p>
                        )}
                        {weather.alerts.length > 0 && (
                          <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-700">{weather.alerts.join(', ')}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-amber-700 font-medium">Weather data unavailable</p>
                          <p className="text-xs text-amber-600 mt-0.5">
                            To enable live weather, add a VITE_OPENWEATHER_API_KEY to your environment.
                            The assessment still uses season, incidents, and danger zone data.
                          </p>
                        </div>
                      </div>
                    )}
                  </Card>

                  {nearbyZones.length > 0 && (
                    <Card className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertOctagon className="w-5 h-5 text-red-600" />
                        <h3 className="font-semibold text-slate-900 text-sm">
                          Nearby Danger Zones ({nearbyZones.length})
                        </h3>
                      </div>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {nearbyZones.map((zone) => (
                          <div key={zone.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                            <Badge className={dangerZoneSeverityColor(zone.severity)}>
                              {zone.severity.toUpperCase()}
                            </Badge>
                            <span className="text-sm text-slate-700 truncate flex-1">{zone.name}</span>
                            <span className="text-xs text-slate-400 shrink-0">
                              {formatDistance(haversineDistance(selectedDest.latitude, selectedDest.longitude, zone.latitude, zone.longitude))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {!selectedDest && !loading && (
        <Card className="p-6">
          <EmptyState
            icon={<MapPin className="w-7 h-7" />}
            title="Select a destination"
            description="Choose a destination above to see its current safety assessment."
          />
        </Card>
      )}
    </div>
  );
}
