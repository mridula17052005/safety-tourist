export type UserRole = 'tourist' | 'admin';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string;
  nationality: string;
  home_country: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
}

export interface EmergencyContact {
  id: string;
  user_id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  is_primary: boolean;
  created_at: string;
}

export interface LocationUpdate {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  accuracy: number;
  altitude: number;
  battery_level: number;
  is_moving: boolean;
  created_at: string;
}

export type IncidentType =
  | 'theft' | 'assault' | 'harassment' | 'accident'
  | 'medical' | 'unsafe_area' | 'lost' | 'other';

export type IncidentStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed';

export interface Incident {
  id: string;
  user_id: string;
  type: IncidentType;
  description: string;
  latitude: number | null;
  longitude: number | null;
  image_url: string;
  status: IncidentStatus;
  created_at: string;
  updated_at: string;
}

export type AlertType =
  | 'auto_detected' | 'manual_sos' | 'speed_anomaly'
  | 'location_anomaly' | 'low_battery' | 'no_movement' | 'erratic_movement';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'dismissed';

export interface Alert {
  id: string;
  user_id: string;
  type: AlertType;
  severity: AlertSeverity;
  confidence_score: number;
  latitude: number | null;
  longitude: number | null;
  features: Record<string, number | string | boolean>;
  message: string;
  status: AlertStatus;
  created_at: string;
  resolved_at: string | null;
}

export type ResponderType = 'admin' | 'police' | 'hospital' | 'emergency_contact' | 'other';
export type ResponseStatus = 'dispatched' | 'en_route' | 'on_scene' | 'resolved';

export interface EmergencyResponse {
  id: string;
  alert_id: string;
  responder_type: ResponderType;
  responder_name: string;
  status: ResponseStatus;
  notes: string;
  created_at: string;
}

export type NotificationType = 'info' | 'alert' | 'warning' | 'success' | 'emergency';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  created_at: string;
}

export type SafetyTipCategory =
  | 'general' | 'transportation' | 'health' | 'crime' | 'culture'
  | 'emergency' | 'nightlife' | 'outdoor' | 'women_safety' | 'digital';

export interface SafetyTip {
  id: string;
  category: SafetyTipCategory;
  title: string;
  content: string;
  location_context: string;
  priority: number;
  created_at: string;
}

export type DangerZoneSeverity = 'low' | 'medium' | 'high' | 'critical';
export type DangerZoneType = 'general' | 'crime' | 'nightlife' | 'scam' | 'natural_hazard' | 'civil_unrest';

export interface DangerZone {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  severity: DangerZoneSeverity;
  zone_type: DangerZoneType;
  country: string;
  city: string;
  is_active: boolean;
  reported_by: string | null;
  created_at: string;
  updated_at: string;
}
