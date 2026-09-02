import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { extractFeatures, predict, computeSafetyScore, type SafetyFeatures, type DetectionResult } from '@/lib/safetyModel';
import { generateRecommendations } from '@/lib/safetyTips';
import { predictWithData, predictFromHistory, type PredictionResponse } from '@/lib/api';
import type { LocationUpdate, Alert, EmergencyContact, DangerZone } from '@/lib/types';
import { haversineDistance, formatSpeed, timeAgo, cn } from '@/lib/utils';

interface LocationPoint {
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  timestamp: number;
}

interface UseLocationTrackingResult {
  currentPos: { lat: number; lng: number } | null;
  isTracking: boolean;
  error: string | null;
  startTracking: () => void;
  stopTracking: () => void;
  triggerSOS: () => Promise<void>;
  safetyScore: number;
  detection: DetectionResult | null;
  recommendations: ReturnType<typeof generateRecommendations>;
  recentAlerts: Alert[];
  locationHistory: LocationPoint[];
  speed: number;
  batteryLevel: number;
  nearbyDangerZones: DangerZone[];
}

const TRACKING_INTERVAL_MS = 15000;
const HISTORY_LIMIT = 20;

export function useLocationTracking(): UseLocationTrackingResult {
  const { session } = useAuth();
  const watchIdRef = useRef<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null);
  const [locationHistory, setLocationHistory] = useState<LocationPoint[]>([]);
  const [speed, setSpeed] = useState(0);
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [safetyScore, setSafetyScore] = useState(100);
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [recommendations, setRecommendations] = useState<ReturnType<typeof generateRecommendations>>([]);
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
  const [sosTriggered, setSosTriggered] = useState(false);
  const [dangerZones, setDangerZones] = useState<DangerZone[]>([]);
  const [nearbyDangerZones, setNearbyDangerZones] = useState<DangerZone[]>([]);
  const lastZoneAlertRef = useRef<number>(0);

  const lastApiCallRef = useRef<number>(0);
  const lastAlertTimeRef = useRef<number>(0);
  const lastDbWriteRef = useRef<number>(0);
  const historyRef = useRef<LocationPoint[]>([]);

  const fetchRecentAlerts = useCallback(async () => {
    if (!session?.user) return;
    const { data } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    setRecentAlerts((data as Alert[]) ?? []);
  }, [session]);

  const getEmergencyContacts = useCallback(async () => {
    if (!session?.user) return [];
    const { data } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', session.user.id);
    return (data as EmergencyContact[]) ?? [];
  }, [session]);

  const createNotification = useCallback(
    async (userId: string, title: string, message: string, type: string) => {
      await supabase.from('notifications').insert({ user_id: userId, title, message, type });
    },
    [],
  );

  const handleDetection = useCallback(
    async (features: SafetyFeatures, pos: { lat: number; lng: number }) => {
      const result = predict(features);
      setDetection(result);
      setSafetyScore(computeSafetyScore(features));
      setRecommendations(generateRecommendations(features));

      const now = Date.now();
      const cooldownMs = 60000;
      const apiCooldownMs = 30000;

      if (now - lastApiCallRef.current > apiCooldownMs) {
        lastApiCallRef.current = now;
        predictWithData({
          speed: features.speed,
          avg_speed: features.avgSpeed,
          heading_variance: features.totalHeadingVariance,
          is_moving: features.isMoving,
          battery_level: features.batteryLevel,
          accuracy: features.accuracy,
          hour_of_day: features.hourOfDay,
          distance_from_last: features.distanceFromLast,
          time_since_last_update: features.timeSinceLastUpdate,
          acceleration: features.acceleration,
          latitude: pos.lat,
          longitude: pos.lng,
          auto_alert: true,
        }).then((apiResult: PredictionResponse | null) => {
          if (apiResult?.prediction.is_emergency) {
            fetchRecentAlerts();
          }
        }).catch(() => {});
      }

      if (result.riskScore >= 0.4 && now - lastAlertTimeRef.current > cooldownMs) {
        lastAlertTimeRef.current = now;
        fetchRecentAlerts();
      }
    },
    [session, getEmergencyContacts, fetchRecentAlerts],
  );

  const onPositionUpdate = useCallback(
    (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const spd = pos.coords.speed ?? 0;
      const heading = pos.coords.heading ?? 0;
      const accuracy = pos.coords.accuracy ?? 0;
      const ts = pos.timestamp;

      setCurrentPos({ lat, lng });
      setSpeed(Math.max(0, spd));

      const point: LocationPoint = { latitude: lat, longitude: lng, speed: spd, heading, timestamp: ts };
      const newHistory = [...historyRef.current, point].slice(-HISTORY_LIMIT);
      historyRef.current = newHistory;
      setLocationHistory(newHistory);

      const battery = batteryLevel;
      const isMoving = spd > 0.5;
      const features = extractFeatures(
        { latitude: lat, longitude: lng, speed: spd, heading, accuracy, batteryLevel: battery, isMoving, timestamp: ts },
        newHistory.slice(0, -1),
      );

      handleDetection(features, { lat, lng });

      if (session?.user) {
        const now = Date.now();
        if (now - lastDbWriteRef.current > TRACKING_INTERVAL_MS) {
          lastDbWriteRef.current = now;
          supabase.from('location_updates').insert({
            user_id: session.user.id,
            latitude: lat,
            longitude: lng,
            speed: Math.max(0, spd),
            heading,
            accuracy,
            altitude: pos.coords.altitude ?? 0,
            battery_level: battery,
            is_moving: isMoving,
          }).then(({ error: dbError }) => {
            if (dbError) console.error('Location write error:', dbError.message);
          });
        }
      }
    },
    [session, batteryLevel, handleDetection],
  );

  const onPositionError = useCallback((err: GeolocationPositionError) => {
    setError(err.message || 'Unable to retrieve location');
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }
    setError(null);
    setIsTracking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      onPositionUpdate,
      onPositionError,
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    );

    if ('getBattery' in navigator) {
      (navigator as Navigator & { getBattery: () => Promise<{ level: number }> })
        .getBattery()
        .then((battery) => {
          setBatteryLevel(Math.round(battery.level * 100));
        })
        .catch(() => {});
    }
  }, [onPositionUpdate, onPositionError]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  const triggerSOS = useCallback(async () => {
    if (!session?.user || !currentPos) return;
    setSosTriggered(true);

    const { data: alertData } = await supabase
      .from('alerts')
      .insert({
        user_id: session.user.id,
        type: 'manual_sos',
        severity: 'critical',
        confidence_score: 1.0,
        latitude: currentPos.lat,
        longitude: currentPos.lng,
        features: { manual: true, source: 'sos_button' },
        message: 'MANUAL SOS triggered by tourist — immediate assistance required',
        status: 'active',
      })
      .select('*')
      .maybeSingle();

    await createNotification(
      session.user.id,
      'SOS Alert Sent',
      'Your live location and emergency details have been sent to your contacts and authorities.',
      'emergency',
    );

    const contacts = await getEmergencyContacts();
    for (const contact of contacts) {
      await supabase.from('emergency_responses').insert({
        alert_id: (alertData as Alert)?.id,
        responder_type: 'emergency_contact',
        responder_name: contact.name,
        status: 'dispatched',
        notes: `SOS notification sent to: ${contact.phone}${contact.email ? `, ${contact.email}` : ''}`,
      });
    }

    fetchRecentAlerts();
    setTimeout(() => setSosTriggered(false), 5000);
  }, [session, currentPos, createNotification, getEmergencyContacts, fetchRecentAlerts]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Fetch danger zones on mount
  useEffect(() => {
    const fetchZones = async () => {
      const { data } = await supabase
        .from('danger_zones')
        .select('*')
        .eq('is_active', true);
      if (data) setDangerZones(data as DangerZone[]);
    };
    fetchZones();
  }, []);

  // Check proximity to danger zones whenever position updates
  useEffect(() => {
    if (!currentPos || dangerZones.length === 0) {
      setNearbyDangerZones([]);
      return;
    }
    const nearby = dangerZones.filter((z) =>
      haversineDistance(currentPos.lat, currentPos.lng, z.latitude, z.longitude) <= z.radius_meters + 300,
    );
    setNearbyDangerZones(nearby);

    // Auto-notify if entering a critical/high zone and cooldown passed
    if (nearby.length > 0 && session?.user) {
      const now = Date.now();
      const cooldownMs = 120000; // 2 minutes
      if (now - lastZoneAlertRef.current > cooldownMs) {
        lastZoneAlertRef.current = now;
        const worst = nearby.reduce((prev, cur) =>
          cur.severity === 'critical' || (cur.severity === 'high' && prev.severity !== 'critical') ? cur : prev,
        );
        supabase.from('notifications').insert({
          user_id: session.user.id,
          title: `Danger Zone Warning: ${worst.name}`,
          message: `You are near a ${worst.severity} risk area. ${worst.description}`,
          type: 'emergency',
        }).then(() => fetchRecentAlerts());
      }
    }
  }, [currentPos, dangerZones, session, fetchRecentAlerts]);

  useEffect(() => {
    fetchRecentAlerts();
  }, [fetchRecentAlerts]);

  return {
    currentPos,
    isTracking,
    error,
    startTracking,
    stopTracking,
    triggerSOS,
    safetyScore,
    detection,
    recommendations,
    recentAlerts,
    locationHistory,
    speed,
    batteryLevel,
    nearbyDangerZones,
  };
}
