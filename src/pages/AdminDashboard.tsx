import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LayoutDashboard, Users, Siren, AlertTriangle, Activity,
  MapPin, Shield, Clock, TrendingUp, CheckCircle, XCircle,
  Phone, Navigation, Eye, RefreshCw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { GoogleMap } from '@/components/GoogleMap';
import { Card, Badge, Button, Modal, Select, Textarea, EmptyState } from '@/components/ui';
import {
  severityColor, statusColor, alertTypeLabel, incidentTypeLabel,
  timeAgo, formatDateTime, cn,
} from '@/lib/utils';
import type { Alert, Incident, EmergencyResponse, Profile } from '@/lib/types';

interface TouristWithLocation extends Profile {
  latest_lat?: number;
  latest_lng?: number;
  latest_speed?: number;
  latest_battery?: number;
  latest_moving?: boolean;
  latest_time?: string;
}

type Tab = 'overview' | 'tourists' | 'incidents' | 'alerts';

export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState({
    totalTourists: 0,
    activeTracking: 0,
    activeAlerts: 0,
    pendingIncidents: 0,
    totalIncidents: 0,
    resolvedAlerts: 0,
  });
  const [tourists, setTourists] = useState<TouristWithLocation[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [responses, setResponses] = useState<EmergencyResponse[]>([]);
  const [responseModal, setResponseModal] = useState(false);
  const [responderType, setResponderType] = useState<EmergencyResponse['responder_type']>('police');
  const [responderName, setResponderName] = useState('');
  const [responseNotes, setResponseNotes] = useState('');
  const [responseStatus, setResponseStatus] = useState<EmergencyResponse['status']>('dispatched');
  const mapRef = useRef<{ panTo: (lat: number, lng: number) => void; setMarkers: (m: any[]) => void }>(null);

  const fetchAll = useCallback(async () => {
    const [profilesRes, alertsRes, incidentsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'tourist'),
      supabase.from('alerts').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('incidents').select('*').order('created_at', { ascending: false }).limit(50),
    ]);

    const profiles = (profilesRes.data as Profile[]) ?? [];
    const alertsData = (alertsRes.data as Alert[]) ?? [];
    const incidentsData = (incidentsRes.data as Incident[]) ?? [];

    // Fetch latest location for each tourist
    const touristsWithLoc: TouristWithLocation[] = await Promise.all(
      profiles.map(async (p) => {
        const { data: loc } = await supabase
          .from('location_updates')
          .select('*')
          .eq('user_id', p.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        return {
          ...p,
          latest_lat: loc?.latitude,
          latest_lng: loc?.longitude,
          latest_speed: loc?.speed,
          latest_battery: loc?.battery_level,
          latest_moving: loc?.is_moving,
          latest_time: loc?.created_at,
        };
      }),
    );

    setTourists(touristsWithLoc);
    setAlerts(alertsData);
    setIncidents(incidentsData);

    const now = Date.now();
    const activeTracking = touristsWithLoc.filter(
      (t) => t.latest_time && now - new Date(t.latest_time).getTime() < 120000,
    ).length;

    setStats({
      totalTourists: profiles.length,
      activeTracking,
      activeAlerts: alertsData.filter((a) => a.status === 'active').length,
      pendingIncidents: incidentsData.filter((i) => i.status === 'pending').length,
      totalIncidents: incidentsData.length,
      resolvedAlerts: alertsData.filter((a) => a.status === 'resolved').length,
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // Real-time alert subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts' },
        () => fetchAll(),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'incidents' },
        () => fetchAll(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const openAlert = async (alert: Alert) => {
    setSelectedAlert(alert);
    const { data } = await supabase
      .from('emergency_responses')
      .select('*')
      .eq('alert_id', alert.id)
      .order('created_at', { ascending: false });
    setResponses((data as EmergencyResponse[]) ?? []);
  };

  const handleAddResponse = async () => {
    if (!selectedAlert) return;
    await supabase.from('emergency_responses').insert({
      alert_id: selectedAlert.id,
      responder_type: responderType,
      responder_name: responderName,
      status: responseStatus,
      notes: responseNotes,
    });
    setResponseModal(false);
    setResponderName('');
    setResponseNotes('');
    setResponseStatus('dispatched');
    setResponderType('police');
    const { data } = await supabase
      .from('emergency_responses')
      .select('*')
      .eq('alert_id', selectedAlert.id)
      .order('created_at', { ascending: false });
    setResponses((data as EmergencyResponse[]) ?? []);
  };

  const handleResolveAlert = async (alertId: string) => {
    await supabase
      .from('alerts')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', alertId);
    fetchAll();
    setSelectedAlert(null);
  };

  const handleUpdateIncident = async (id: string, status: Incident['status']) => {
    await supabase
      .from('incidents')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    fetchAll();
  };

  const touristMarkers = tourists
    .filter((t) => t.latest_lat && t.latest_lng)
    .map((t) => ({
      lat: t.latest_lat!,
      lng: t.latest_lng!,
      title: t.full_name || 'Tourist',
      label: 'T',
    }));

  const alertMarkers = alerts
    .filter((a) => a.status === 'active' && a.latitude && a.longitude)
    .map((a) => ({
      lat: a.latitude!,
      lng: a.longitude!,
      title: alertTypeLabel(a.type),
      label: '!',
    }));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Monitor tourists, incidents, alerts, and emergency responses in real time
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll} loading={loading}>
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard icon={<Users className="w-5 h-5" />} label="Tourists" value={stats.totalTourists} color="text-teal-600 bg-teal-100" />
        <StatCard icon={<Activity className="w-5 h-5" />} label="Active Tracking" value={stats.activeTracking} color="text-green-600 bg-green-100" />
        <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="Active Alerts" value={stats.activeAlerts} color="text-red-600 bg-red-100" />
        <StatCard icon={<Siren className="w-5 h-5" />} label="Pending Incidents" value={stats.pendingIncidents} color="text-amber-600 bg-amber-100" />
        <StatCard icon={<Shield className="w-5 h-5" />} label="Total Incidents" value={stats.totalIncidents} color="text-blue-600 bg-blue-100" />
        <StatCard icon={<CheckCircle className="w-5 h-5" />} label="Resolved Alerts" value={stats.resolvedAlerts} color="text-green-600 bg-green-100" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {(['overview', 'tourists', 'incidents', 'alerts'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
              tab === t
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700',
            )}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-teal-600" />
              <h2 className="font-semibold text-slate-900">Live Tourist Map</h2>
            </div>
            <div className="h-[400px] bg-slate-100">
              <GoogleMap
                ref={mapRef}
                center={{ lat: 0, lng: 0 }}
                zoom={2}
                markers={[...touristMarkers, ...alertMarkers]}
                className="w-full h-full"
              />
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h2 className="font-semibold text-slate-900">Active Alerts</h2>
            </div>
            {alerts.filter((a) => a.status === 'active').length === 0 ? (
              <EmptyState
                icon={<Shield className="w-7 h-7" />}
                title="No active alerts"
                description="All clear — no active emergencies detected."
              />
            ) : (
              <div className="space-y-2 max-h-[350px] overflow-y-auto">
                {alerts.filter((a) => a.status === 'active').slice(0, 10).map((a) => (
                  <div
                    key={a.id}
                    onClick={() => openAlert(a)}
                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className={cn('w-2 h-10 rounded-full', severityColor(a.severity).split(' ')[0])} />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-slate-800 text-sm">{alertTypeLabel(a.type)}</span>
                      <p className="text-xs text-slate-500 truncate">{a.message}</p>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">{timeAgo(a.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tourists Tab */}
      {tab === 'tourists' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold text-slate-600">Tourist</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-600">Phone</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-600">Status</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-600">Last Location</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-600">Last Seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tourists.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                      No tourists registered yet.
                    </td>
                  </tr>
                ) : (
                  tourists.map((t) => {
                    const isActive = t.latest_time && Date.now() - new Date(t.latest_time).getTime() < 120000;
                    return (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-semibold text-xs">
                              {(t.full_name?.[0] || 'U').toUpperCase()}
                            </div>
                            <span className="font-medium text-slate-800">{t.full_name || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-slate-600">{t.phone || '—'}</td>
                        <td className="px-5 py-3">
                          {isActive ? (
                            <Badge className="bg-green-100 text-green-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                              Tracking
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-500">Offline</Badge>
                          )}
                        </td>
                        <td className="px-5 py-3 text-slate-500 text-xs">
                          {t.latest_lat ? `${t.latest_lat.toFixed(3)}, ${t.latest_lng?.toFixed(3)}` : 'No data'}
                          {t.latest_speed !== undefined && t.latest_speed > 0 && (
                            <span className="ml-1">({Math.round(t.latest_speed * 3.6)} km/h)</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-slate-500 text-xs">
                          {t.latest_time ? timeAgo(t.latest_time) : 'Never'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Incidents Tab */}
      {tab === 'incidents' && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Siren className="w-5 h-5 text-teal-600" />
            <h2 className="font-semibold text-slate-900">Incident Reports</h2>
          </div>
          {incidents.length === 0 ? (
            <EmptyState
              icon={<Siren className="w-7 h-7" />}
              title="No incidents reported"
              description="Incident reports from tourists will appear here."
            />
          ) : (
            <div className="space-y-3">
              {incidents.map((inc) => (
                <div key={inc.id} className="p-4 rounded-xl border border-slate-200">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{incidentTypeLabel(inc.type)}</span>
                      <Badge className={statusColor(inc.status)}>{inc.status}</Badge>
                    </div>
                    <span className="text-xs text-slate-400">{formatDateTime(inc.created_at)}</span>
                  </div>
                  {inc.description && (
                    <p className="text-sm text-slate-600 mb-2">{inc.description}</p>
                  )}
                  {inc.image_url && (
                    <img src={inc.image_url} alt="Evidence" className="w-full max-w-xs h-32 object-cover rounded-lg mb-2" />
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <MapPin className="w-3.5 h-3.5" />
                      {inc.latitude ? `${inc.latitude.toFixed(3)}, ${inc.longitude?.toFixed(3)}` : 'No location'}
                    </div>
                    <Select
                      value={inc.status}
                      onChange={(e) => handleUpdateIncident(inc.id, e.target.value as Incident['status'])}
                      className="text-xs py-1 px-2 w-auto"
                    >
                      <option value="pending">Pending</option>
                      <option value="reviewing">Reviewing</option>
                      <option value="resolved">Resolved</option>
                      <option value="dismissed">Dismissed</option>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Alerts Tab */}
      {tab === 'alerts' && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h2 className="font-semibold text-slate-900">All Alerts</h2>
          </div>
          {alerts.length === 0 ? (
            <EmptyState
              icon={<Shield className="w-7 h-7" />}
              title="No alerts"
              description="AI-detected and manual SOS alerts will appear here."
            />
          ) : (
            <div className="space-y-2">
              {alerts.map((a) => (
                <div
                  key={a.id}
                  onClick={() => openAlert(a)}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className={cn('w-2 h-12 rounded-full', severityColor(a.severity).split(' ')[0])} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800 text-sm">{alertTypeLabel(a.type)}</span>
                      <Badge className={severityColor(a.severity)}>{a.severity}</Badge>
                      <Badge className={statusColor(a.status)}>{a.status}</Badge>
                    </div>
                    <p className="text-sm text-slate-500 truncate">{a.message}</p>
                    {a.latitude && (
                      <span className="text-xs text-slate-400">
                        {a.latitude.toFixed(3)}, {a.longitude?.toFixed(3)}
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-slate-400">{timeAgo(a.created_at)}</div>
                    <div className="text-xs font-medium text-teal-600 mt-1">
                      {Math.round(a.confidence_score * 100)}% confidence
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Alert Detail Modal */}
      <Modal
        open={!!selectedAlert}
        onClose={() => setSelectedAlert(null)}
        title="Alert Details"
        className="max-w-2xl"
      >
        {selectedAlert && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge className={severityColor(selectedAlert.severity)}>
                {selectedAlert.severity.toUpperCase()}
              </Badge>
              <Badge className={statusColor(selectedAlert.status)}>{selectedAlert.status}</Badge>
              <span className="text-sm text-slate-500">{alertTypeLabel(selectedAlert.type)}</span>
            </div>

            <p className="text-sm text-slate-700">{selectedAlert.message}</p>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-400">Confidence:</span>
                <span className="font-medium text-slate-700 ml-1">
                  {Math.round(selectedAlert.confidence_score * 100)}%
                </span>
              </div>
              <div>
                <span className="text-slate-400">Time:</span>
                <span className="font-medium text-slate-700 ml-1">{formatDateTime(selectedAlert.created_at)}</span>
              </div>
              {selectedAlert.latitude && (
                <div className="col-span-2">
                  <span className="text-slate-400">Location:</span>
                  <span className="font-medium text-slate-700 ml-1">
                    {selectedAlert.latitude.toFixed(4)}, {selectedAlert.longitude?.toFixed(4)}
                  </span>
                </div>
              )}
            </div>

            {/* AI Features */}
            {Object.keys(selectedAlert.features).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">AI Features Detected</p>
                <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-slate-50 text-xs">
                  {Object.entries(selectedAlert.features).map(([key, val]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-slate-500">{key.replace(/_/g, ' ')}:</span>
                      <span className="font-medium text-slate-700">
                        {typeof val === 'number' ? val.toFixed(2) : String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Responses */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-500 uppercase">Emergency Responses</p>
                <Button size="sm" onClick={() => setResponseModal(true)}>
                  Add Response
                </Button>
              </div>
              {responses.length === 0 ? (
                <p className="text-sm text-slate-400 p-3 rounded-lg bg-slate-50 text-center">
                  No responses dispatched yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {responses.map((r) => (
                    <div key={r.id} className="p-3 rounded-lg border border-slate-200 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-800">{r.responder_name || r.responder_type}</span>
                        <Badge className={statusColor(r.status)}>{r.status}</Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{r.notes}</p>
                      <span className="text-xs text-slate-400">{formatDateTime(r.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedAlert.status === 'active' && (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => handleResolveAlert(selectedAlert.id)}
              >
                <CheckCircle className="w-4 h-4" />
                Mark as Resolved
              </Button>
            )}
          </div>
        )}
      </Modal>

      {/* Add Response Modal */}
      <Modal
        open={responseModal}
        onClose={() => setResponseModal(false)}
        title="Dispatch Emergency Response"
      >
        <div className="space-y-4">
          <Select
            label="Responder Type"
            value={responderType}
            onChange={(e) => setResponderType(e.target.value as EmergencyResponse['responder_type'])}
          >
            <option value="police">Police</option>
            <option value="hospital">Hospital / Ambulance</option>
            <option value="admin">Admin / Coordinator</option>
            <option value="emergency_contact">Emergency Contact</option>
            <option value="other">Other</option>
          </Select>
          <Select
            label="Status"
            value={responseStatus}
            onChange={(e) => setResponseStatus(e.target.value as EmergencyResponse['status'])}
          >
            <option value="dispatched">Dispatched</option>
            <option value="en_route">En Route</option>
            <option value="on_scene">On Scene</option>
            <option value="resolved">Resolved</option>
          </Select>
          <input
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
            placeholder="Responder name / unit"
            value={responderName}
            onChange={(e) => setResponderName(e.target.value)}
          />
          <Textarea
            label="Notes"
            value={responseNotes}
            onChange={(e) => setResponseNotes(e.target.value)}
            placeholder="Response details..."
            rows={3}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setResponseModal(false)}>Cancel</Button>
            <Button onClick={handleAddResponse}>Dispatch Response</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function StatCard({
  icon, label, value, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Card className="p-4">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-2', color)}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </Card>
  );
}
