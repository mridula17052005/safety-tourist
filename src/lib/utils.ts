import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatSpeed(speedMs: number): string {
  return `${Math.round(speedMs * 3.6)} km/h`;
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function severityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'bg-red-500 text-white';
    case 'high': return 'bg-orange-500 text-white';
    case 'medium': return 'bg-amber-400 text-amber-950';
    case 'low': return 'bg-blue-400 text-blue-950';
    default: return 'bg-gray-400 text-white';
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case 'active': return 'bg-red-100 text-red-700';
    case 'acknowledged': return 'bg-amber-100 text-amber-700';
    case 'resolved': return 'bg-green-100 text-green-700';
    case 'dismissed': return 'bg-gray-100 text-gray-600';
    case 'pending': return 'bg-amber-100 text-amber-700';
    case 'reviewing': return 'bg-blue-100 text-blue-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

export function incidentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    theft: 'Theft',
    assault: 'Assault',
    harassment: 'Harassment',
    accident: 'Accident',
    medical: 'Medical',
    unsafe_area: 'Unsafe Area',
    lost: 'Lost',
    other: 'Other',
  };
  return labels[type] ?? type;
}

export function alertTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    auto_detected: 'AI Auto-Detected',
    manual_sos: 'Manual SOS',
    speed_anomaly: 'Speed Anomaly',
    location_anomaly: 'Location Anomaly',
    low_battery: 'Low Battery',
    no_movement: 'No Movement',
    erratic_movement: 'Erratic Movement',
  };
  return labels[type] ?? type;
}

export function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    general: 'General Safety',
    transportation: 'Transportation',
    health: 'Health & Medical',
    crime: 'Crime Prevention',
    culture: 'Culture & Customs',
    emergency: 'Emergency Preparedness',
    nightlife: 'Nightlife Safety',
    outdoor: 'Outdoor & Adventure',
    women_safety: 'Women Safety',
    digital: 'Digital Security',
  };
  return labels[category] ?? category;
}

export function categoryIcon(category: string): string {
  const icons: Record<string, string> = {
    general: 'Shield',
    transportation: 'Car',
    health: 'HeartPulse',
    crime: 'ShieldAlert',
    culture: 'Globe',
    emergency: 'Siren',
    nightlife: 'Moon',
    outdoor: 'Mountain',
    women_safety: 'UserCheck',
    digital: 'Smartphone',
  };
  return icons[category] ?? 'Shield';
}

export function dangerZoneTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    general: 'General Risk',
    crime: 'Crime Area',
    nightlife: 'Nightlife Risk',
    scam: 'Tourist Scam',
    natural_hazard: 'Natural Hazard',
    civil_unrest: 'Civil Unrest',
  };
  return labels[type] ?? type;
}

export function dangerZoneSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'bg-red-500 text-white';
    case 'high': return 'bg-orange-500 text-white';
    case 'medium': return 'bg-amber-400 text-amber-950';
    case 'low': return 'bg-blue-400 text-blue-950';
    default: return 'bg-gray-400 text-white';
  }
}

export function dangerZoneSeverityBg(severity: string): string {
  switch (severity) {
    case 'critical': return 'bg-red-50 border-red-200';
    case 'high': return 'bg-orange-50 border-orange-200';
    case 'medium': return 'bg-amber-50 border-amber-200';
    case 'low': return 'bg-blue-50 border-blue-200';
    default: return 'bg-slate-50 border-slate-200';
  }
}

export function downloadFile(data: Blob, filename: string) {
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
