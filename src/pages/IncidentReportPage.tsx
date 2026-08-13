import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Siren, Camera, Upload, MapPin, FileText, CheckCircle, Loader2,
  Image as ImageIcon, X, AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { GoogleMap } from '@/components/GoogleMap';
import { Card, Button, Select, Textarea, Badge, EmptyState } from '@/components/ui';
import {
  incidentTypeLabel, statusColor, timeAgo, formatDate,
} from '@/lib/utils';
import type { Incident, IncidentType } from '@/lib/types';

const INCIDENT_TYPES: IncidentType[] = [
  'theft', 'assault', 'harassment', 'accident', 'medical', 'unsafe_area', 'lost', 'other',
];

export function IncidentReportPage() {
  const { session } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<IncidentType>('theft');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchIncidents = useCallback(async () => {
    if (!session?.user) return;
    const { data } = await supabase
      .from('incidents')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    setIncidents((data as Incident[]) ?? []);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    fetchIncidents();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true },
      );
    }
  }, [fetchIncidents]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!session?.user) return;
    setSubmitting(true);
    setSuccess(false);

    let imageUrl = '';
    if (imageFile) {
      const ext = imageFile.name.split('.').pop() ?? 'jpg';
      const path = `${session.user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('incidents')
        .upload(path, imageFile);
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('incidents').getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
    }

    await supabase.from('incidents').insert({
      user_id: session.user.id,
      type,
      description,
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
      image_url: imageUrl,
      status: 'pending',
    });

    await supabase.from('notifications').insert({
      user_id: session.user.id,
      title: 'Incident Report Submitted',
      message: `Your ${incidentTypeLabel(type)} report has been submitted and is under review.`,
      type: 'success',
    });

    setSubmitting(false);
    setSuccess(true);
    setDescription('');
    removeImage();
    fetchIncidents();
    setTimeout(() => setSuccess(false), 4000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Report an Incident</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Report safety incidents with photos and location data to help authorities respond
        </p>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm animate-in fade-in">
          <CheckCircle className="w-5 h-5 shrink-0" />
          Your incident report has been submitted successfully.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Report Form */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <Siren className="w-5 h-5 text-teal-600" />
            <h2 className="font-semibold text-slate-900">New Report</h2>
          </div>

          <div className="space-y-4">
            <Select
              label="Incident Type"
              value={type}
              onChange={(e) => setType(e.target.value as IncidentType)}
            >
              {INCIDENT_TYPES.map((t) => (
                <option key={t} value={t}>{incidentTypeLabel(t)}</option>
              ))}
            </Select>

            <Textarea
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened in detail..."
              rows={4}
            />

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Photo Evidence (optional)
              </label>
              {imagePreview ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200">
                  <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover" />
                  <button
                    onClick={removeImage}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-teal-500 hover:text-teal-500 transition-colors"
                >
                  <Camera className="w-7 h-7" />
                  <span className="text-sm font-medium">Click to upload a photo</span>
                  <span className="text-xs">Max 5MB</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Location
              </label>
              <div className="h-48 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                {coords ? (
                  <GoogleMap center={coords} zoom={15} markers={[
                    { lat: coords.lat, lng: coords.lng, label: 'I', title: 'Incident location' },
                  ]} />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                    <MapPin className="w-5 h-5 mr-1" />
                    Detecting your location...
                  </div>
                )}
              </div>
              {coords && (
                <p className="text-xs text-slate-500 mt-1.5">
                  {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                </p>
              )}
            </div>

            <Button onClick={handleSubmit} loading={submitting} size="lg" className="w-full">
              <Siren className="w-4 h-4" />
              Submit Incident Report
            </Button>
          </div>
        </Card>

        {/* Incident History */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <FileText className="w-5 h-5 text-teal-600" />
            <h2 className="font-semibold text-slate-900">Your Reports</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : incidents.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-7 h-7" />}
              title="No reports yet"
              description="Your submitted incident reports will appear here."
            />
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {incidents.map((inc) => (
                <div key={inc.id} className="p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-800 text-sm">
                      {incidentTypeLabel(inc.type)}
                    </span>
                    <Badge className={statusColor(inc.status)}>{inc.status}</Badge>
                  </div>
                  {inc.description && (
                    <p className="text-sm text-slate-600 mb-2 line-clamp-2">{inc.description}</p>
                  )}
                  {inc.image_url && (
                    <img
                      src={inc.image_url}
                      alt="Evidence"
                      className="w-full h-28 object-cover rounded-lg mb-2"
                    />
                  )}
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <MapPin className="w-3 h-3" />
                    {inc.latitude ? `${inc.latitude.toFixed(3)}, ${inc.longitude?.toFixed(3)}` : 'No location'}
                    <span className="mx-1">·</span>
                    {timeAgo(inc.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
