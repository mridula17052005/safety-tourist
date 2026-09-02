import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  AlertTriangle, Plus, Edit2, Trash2, MapPin, Search,
  RefreshCw, ShieldAlert, X, Loader2, Eye, EyeOff,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { GoogleMap } from '@/components/GoogleMap';
import { Card, Badge, Button, Input, Select, Textarea, Modal, EmptyState } from '@/components/ui';
import {
  cn, haversineDistance, formatDistance, timeAgo,
  dangerZoneTypeLabel, dangerZoneSeverityColor,
} from '@/lib/utils';
import type { DangerZone, DangerZoneSeverity, DangerZoneType } from '@/lib/types';

const SEVERITY_ORDER: Record<DangerZoneSeverity, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};

interface ZoneForm {
  name: string;
  description: string;
  latitude: string;
  longitude: string;
  radius_meters: string;
  severity: DangerZoneSeverity;
  zone_type: DangerZoneType;
  country: string;
  city: string;
}

const EMPTY_FORM: ZoneForm = {
  name: '',
  description: '',
  latitude: '',
  longitude: '',
  radius_meters: '500',
  severity: 'medium',
  zone_type: 'general',
  country: '',
  city: '',
};

export function AdminDangerZonesPage() {
  const { profile } = useAuth();
  const [zones, setZones] = useState<DangerZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DangerZone | null>(null);
  const [form, setForm] = useState<ZoneForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [mapClickMode, setMapClickMode] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const mapRef = useRef<{ panTo: (lat: number, lng: number) => void; setMarkers: (m: any[]) => void }>(null);

  const fetchZones = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('danger_zones')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setZones(data as DangerZone[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  const filteredZones = useMemo(() => {
    return zones
      .filter((z) => {
        if (filterSeverity !== 'all' && z.severity !== filterSeverity) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            z.name.toLowerCase().includes(q) ||
            z.city?.toLowerCase().includes(q) ||
            z.country?.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  }, [zones, search, filterSeverity]);

  const markers = useMemo(() => {
    return filteredZones.map((z) => ({
      lat: z.latitude,
      lng: z.longitude,
      title: z.name,
      label: z.severity === 'critical' ? '!' : z.severity === 'high' ? 'H' : z.severity === 'medium' ? 'M' : 'L',
    }));
  }, [filteredZones]);

  const openAddModal = () => {
    setEditingZone(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (zone: DangerZone) => {
    setEditingZone(zone);
    setForm({
      name: zone.name,
      description: zone.description || '',
      latitude: String(zone.latitude),
      longitude: String(zone.longitude),
      radius_meters: String(zone.radius_meters),
      severity: zone.severity,
      zone_type: zone.zone_type,
      country: zone.country || '',
      city: zone.city || '',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (!mapClickMode) return;
    setForm((f) => ({ ...f, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }));
    setMapClickMode(false);
  };

  const handleSave = async () => {
    setFormError(null);

    if (!form.name.trim()) {
      setFormError('Name is required');
      return;
    }
    if (!form.latitude || !form.longitude) {
      setFormError('Location coordinates are required. Click on the map or enter manually.');
      return;
    }

    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    const radius = parseInt(form.radius_meters) || 500;

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setFormError('Invalid latitude (must be -90 to 90)');
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setFormError('Invalid longitude (must be -180 to 180)');
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      latitude: lat,
      longitude: lng,
      radius_meters: radius,
      severity: form.severity,
      zone_type: form.zone_type,
      country: form.country.trim() || null,
      city: form.city.trim() || null,
      reported_by: profile?.id || null,
    };

    if (editingZone) {
      const { error } = await supabase
        .from('danger_zones')
        .update(payload)
        .eq('id', editingZone.id);
      if (error) setFormError(error.message);
    } else {
      const { error } = await supabase
        .from('danger_zones')
        .insert(payload);
      if (error) setFormError(error.message);
    }

    setSaving(false);
    if (!formError) {
      setModalOpen(false);
      fetchZones();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('danger_zones').delete().eq('id', deleteId);
    setDeleteId(null);
    fetchZones();
  };

  const toggleActive = async (zone: DangerZone) => {
    await supabase
      .from('danger_zones')
      .update({ is_active: !zone.is_active })
      .eq('id', zone.id);
    fetchZones();
  };

  const stats = useMemo(() => ({
    total: zones.length,
    active: zones.filter((z) => z.is_active).length,
    critical: zones.filter((z) => z.severity === 'critical' && z.is_active).length,
    high: zones.filter((z) => z.severity === 'high' && z.is_active).length,
  }), [zones]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Danger Zone Management</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Add, edit, and manage known dangerous areas visible to all tourists.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchZones} loading={loading}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button size="sm" onClick={openAddModal}>
            <Plus className="w-4 h-4" />
            Add Zone
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-medium text-slate-500">Total Zones</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-4 h-4 text-green-500" />
            <span className="text-xs font-medium text-slate-500">Active</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            <span className="text-xs font-medium text-slate-500">Critical</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-medium text-slate-500">High Risk</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">{stats.high}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search zones..."
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
      </div>

      {/* Map + List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-teal-600" />
            <h2 className="font-semibold text-slate-900">Zone Map</h2>
          </div>
          <div className="h-[400px] bg-slate-100">
            <GoogleMap
              ref={mapRef}
              center={filteredZones[0] ? { lat: filteredZones[0].latitude, lng: filteredZones[0].longitude } : { lat: 20, lng: 0 }}
              zoom={2}
              markers={markers}
              className="w-full h-full"
              onMapClick={handleMapClick}
            />
          </div>
          {mapClickMode && (
            <div className="px-5 py-3 bg-amber-50 border-t border-amber-200 flex items-center gap-2 text-sm text-amber-700">
              <MapPin className="w-4 h-4 animate-pulse" />
              Click on the map to set the zone location...
              <button onClick={() => setMapClickMode(false)} className="ml-auto text-amber-600 hover:text-amber-800">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </Card>

        <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
            </div>
          ) : filteredZones.length === 0 ? (
            <Card className="p-6">
              <EmptyState
                icon={<AlertTriangle className="w-7 h-7" />}
                title="No danger zones"
                description="Add a zone to get started."
                action={<Button size="sm" onClick={openAddModal}><Plus className="w-4 h-4" />Add Zone</Button>}
              />
            </Card>
          ) : (
            filteredZones.map((zone) => (
              <Card key={zone.id} className={cn('p-4', !zone.is_active && 'opacity-60')}>
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
                      {!zone.is_active && <Badge className="bg-slate-200 text-slate-600">INACTIVE</Badge>}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {dangerZoneTypeLabel(zone.zone_type)}
                      {zone.city && ` · ${zone.city}`}
                      {zone.country && `, ${zone.country}`}
                    </p>
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">{zone.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() => openEditModal(zone)}
                        className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium"
                      >
                        <Edit2 className="w-3 h-3" />Edit
                      </button>
                      <button
                        onClick={() => toggleActive(zone)}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-medium"
                      >
                        {zone.is_active ? <><EyeOff className="w-3 h-3" />Deactivate</> : <><Eye className="w-3 h-3" />Activate</>}
                      </button>
                      <button
                        onClick={() => setDeleteId(zone.id)}
                        className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium"
                      >
                        <Trash2 className="w-3 h-3" />Delete
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingZone ? 'Edit Danger Zone' : 'Add Danger Zone'}
        className="max-w-xl"
      >
        <div className="space-y-4">
          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {formError}
            </div>
          )}

          <Input
            label="Zone Name"
            placeholder="e.g., Downtown Theft District"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <Textarea
            label="Description"
            placeholder="Describe what makes this area dangerous..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Latitude"
              placeholder="-22.9886"
              type="text"
              value={form.latitude}
              onChange={(e) => setForm({ ...form, latitude: e.target.value })}
            />
            <Input
              label="Longitude"
              placeholder="-43.2436"
              type="text"
              value={form.longitude}
              onChange={(e) => setForm({ ...form, longitude: e.target.value })}
            />
          </div>

          <Button
            variant={mapClickMode ? 'danger' : 'outline'}
            size="sm"
            onClick={() => setMapClickMode(!mapClickMode)}
            className="w-full"
          >
            <MapPin className="w-4 h-4" />
            {mapClickMode ? 'Click on the map to set location...' : 'Pick Location on Map'}
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Radius (meters)"
              type="number"
              value={form.radius_meters}
              onChange={(e) => setForm({ ...form, radius_meters: e.target.value })}
            />
            <Select
              label="Severity"
              value={form.severity}
              onChange={(e) => setForm({ ...form, severity: e.target.value as DangerZoneSeverity })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </Select>
          </div>

          <Select
            label="Zone Type"
            value={form.zone_type}
            onChange={(e) => setForm({ ...form, zone_type: e.target.value as DangerZoneType })}
          >
            <option value="general">General Risk</option>
            <option value="crime">Crime Area</option>
            <option value="nightlife">Nightlife Risk</option>
            <option value="scam">Tourist Scam</option>
            <option value="civil_unrest">Civil Unrest</option>
            <option value="natural_hazard">Natural Hazard</option>
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="City"
              placeholder="Rio de Janeiro"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
            <Input
              label="Country"
              placeholder="Brazil"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">
              {editingZone ? 'Save Changes' : 'Create Zone'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Danger Zone"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete this danger zone? This action cannot be undone.
            Tourists will no longer see warnings for this area.
          </p>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1">
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} className="flex-1">
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
