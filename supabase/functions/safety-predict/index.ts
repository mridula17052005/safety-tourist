import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PredictionInput {
  speed: number;
  avg_speed: number;
  heading_variance: number;
  is_moving: boolean;
  battery_level: number;
  accuracy: number;
  hour_of_day: number;
  distance_from_last: number;
  time_since_last_update: number;
  acceleration: number;
  latitude?: number;
  longitude?: number;
}

interface TreeVote {
  tree: string;
  vote: number;
  reason: string;
}

interface PredictionResult {
  risk_score: number;
  severity: "low" | "medium" | "high" | "critical";
  alert_type: string;
  confidence: number;
  message: string;
  tree_votes: TreeVote[];
  is_emergency: boolean;
  danger_zone_alert?: {
    zone_name: string;
    zone_severity: string;
    distance: number;
  };
}

// ============================================================
// Haversine distance (meters)
// ============================================================

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ============================================================
// RANDOM FOREST DECISION TREES (server-side implementation)
// ============================================================

function speedAnomalyTree(f: PredictionInput): TreeVote {
  let vote = 0;
  let reason = "Speed within normal range";
  const deviation = Math.abs(f.speed - f.avg_speed);

  if (deviation > 15) {
    vote += 0.35;
    reason = `Speed deviation high: ${deviation.toFixed(1)} m/s above average`;
  } else if (deviation > 8) {
    vote += 0.15;
    reason = `Slight speed deviation: ${deviation.toFixed(1)} m/s`;
  }

  if (f.speed > 7 && f.avg_speed < 2) {
    vote += 0.25;
    reason = "Sudden sprint detected — possible flight from danger";
  }

  if (f.acceleration > 3) {
    vote += 0.2;
    reason = "High acceleration spike detected";
  }

  return { tree: "Speed Anomaly", vote: Math.min(vote, 1), reason };
}

function timeOfDayTree(f: PredictionInput): TreeVote {
  let vote = 0;
  let reason = "Safe time of day";
  const isNight = f.hour_of_day >= 22 || f.hour_of_day < 5;
  const isEvening = f.hour_of_day >= 19 && f.hour_of_day < 22;

  if (isNight) {
    vote += 0.3;
    reason = "Late night hours — elevated risk";
    if (!f.is_moving) {
      vote += 0.15;
      reason = "Stationary during late night — high risk";
    }
  } else if (isEvening) {
    vote += 0.1;
    reason = "Evening hours — moderate risk";
  }

  return { tree: "Time of Day", vote: Math.min(vote, 1), reason };
}

function erraticMovementTree(f: PredictionInput): TreeVote {
  let vote = 0;
  let reason = "Movement pattern normal";

  if (f.heading_variance > 1000) {
    vote += 0.35;
    reason = "Erratic movement — frequent direction changes indicate distress";
  } else if (f.heading_variance > 500) {
    vote += 0.15;
    reason = "Moderate heading variance";
  }

  return { tree: "Erratic Movement", vote: Math.min(vote, 1), reason };
}

function noMovementTree(f: PredictionInput): TreeVote {
  let vote = 0;
  let reason = "Movement normal";

  if (!f.is_moving && f.time_since_last_update > 600) {
    vote += 0.4;
    reason = "No movement for 10+ minutes — possible emergency";
  } else if (!f.is_moving && f.time_since_last_update > 300) {
    vote += 0.2;
    reason = "No movement for 5+ minutes";
  }

  return { tree: "No Movement", vote: Math.min(vote, 1), reason };
}

function batteryTree(f: PredictionInput): TreeVote {
  let vote = 0;
  let reason = "Battery sufficient";

  if (f.battery_level <= 5) {
    vote += 0.3;
    reason = "Critical battery — unable to call for help soon";
  } else if (f.battery_level <= 15) {
    vote += 0.15;
    reason = "Low battery — risk of losing contact";
  }

  return { tree: "Battery Level", vote: Math.min(vote, 1), reason };
}

function accuracyTree(f: PredictionInput): TreeVote {
  let vote = 0;
  let reason = "GPS accuracy good";

  if (f.accuracy > 100) {
    vote += 0.2;
    reason = "Poor GPS accuracy — possible indoor or obstructed location";
  } else if (f.accuracy > 50) {
    vote += 0.1;
    reason = "Moderate GPS accuracy";
  }

  return { tree: "GPS Accuracy", vote: Math.min(vote, 1), reason };
}

function distanceTree(f: PredictionInput): TreeVote {
  let vote = 0;
  let reason = "Distance normal";

  if (f.distance_from_last > 500 && !f.is_moving) {
    vote += 0.25;
    reason = "Large location jump without movement — possible GPS inconsistency";
  }

  return { tree: "Distance Jump", vote: Math.min(vote, 1), reason };
}

function accelerationTree(f: PredictionInput): TreeVote {
  let vote = 0;
  let reason = "Acceleration normal";

  if (f.acceleration > 5) {
    vote += 0.3;
    reason = "Extreme acceleration — running or vehicle incident";
  } else if (f.acceleration > 2.5) {
    vote += 0.15;
    reason = "High acceleration detected";
  }

  return { tree: "Acceleration", vote: Math.min(vote, 1), reason };
}

const TREES = [
  speedAnomalyTree,
  timeOfDayTree,
  erraticMovementTree,
  noMovementTree,
  batteryTree,
  accuracyTree,
  distanceTree,
  accelerationTree,
];

function predict(f: PredictionInput): PredictionResult {
  const treeVotes = TREES.map((tree) => tree(f));
  const totalScore = treeVotes.reduce((sum, v) => sum + v.vote, 0);
  const riskScore = totalScore / TREES.length;
  const confidence = Math.min(1, riskScore * 1.5);

  let severity: PredictionResult["severity"] = "low";
  if (riskScore >= 0.6) severity = "critical";
  else if (riskScore >= 0.4) severity = "high";
  else if (riskScore >= 0.2) severity = "medium";

  let alertType = "auto_detected";
  let message = "Monitoring location data — no immediate threat detected";

  const deviation = Math.abs(f.speed - f.avg_speed);
  if (deviation > 15 || f.acceleration > 3) {
    alertType = "speed_anomaly";
    message = "Sudden speed change detected — possible emergency situation";
  } else if (f.heading_variance > 1000) {
    alertType = "erratic_movement";
    message = "Erratic movement pattern detected — possible distress";
  } else if (!f.is_moving && f.time_since_last_update > 600) {
    alertType = "no_movement";
    message = "No movement detected for extended period — checking welfare";
  } else if (f.battery_level <= 5) {
    alertType = "low_battery";
    message = "Critical battery level — tourist may lose communication";
  } else if (f.distance_from_last > 500 && !f.is_moving) {
    alertType = "location_anomaly";
    message = "Location anomaly detected — possible GPS inconsistency";
  } else if (riskScore >= 0.2) {
    alertType = "auto_detected";
    message = "AI model detected unusual activity patterns";
  }

  return {
    risk_score: riskScore,
    severity,
    alert_type: alertType,
    confidence,
    message,
    tree_votes: treeVotes,
    is_emergency: riskScore >= 0.4,
  };
}

// ============================================================
// DANGER ZONE PROXIMITY CHECK
// ============================================================

async function checkDangerZoneProximity(
  supabase: any,
  lat: number,
  lng: number,
): Promise<PredictionResult["danger_zone_alert"] | null> {
  const { data: zones } = await supabase
    .from("danger_zones")
    .select("name, severity, latitude, longitude, radius_meters")
    .eq("is_active", true);

  if (!zones || zones.length === 0) return null;

  let nearest: { name: string; severity: string; distance: number } | null = null;

  for (const zone of zones) {
    const dist = haversineDistance(lat, lng, zone.latitude, zone.longitude);
    if (dist <= zone.radius_meters + 300) {
      if (!nearest || dist < nearest.distance) {
        nearest = { name: zone.name, severity: zone.severity, distance: dist };
      }
    }
  }

  return nearest
    ? { zone_name: nearest.name, zone_severity: nearest.severity, distance: nearest.distance }
    : null;
}

// ============================================================
// NOTIFY EMERGENCY CONTACTS
// ============================================================

async function notifyEmergencyContacts(
  supabase: any,
  userId: string,
  alertId: string | null,
  alertMessage: string,
  severity: string,
  lat?: number,
  lng?: number,
  dangerZoneName?: string,
): Promise<void> {
  const { data: contacts } = await supabase
    .from("emergency_contacts")
    .select("*")
    .eq("user_id", userId);

  if (!contacts || contacts.length === 0) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();

  const touristName = profile?.full_name || "A tourist";
  const locationStr = lat && lng ? ` Location: https://maps.google.com/?q=${lat},${lng}` : "";
  const zoneStr = dangerZoneName ? ` Danger zone: ${dangerZoneName}.` : "";

  const messageContent = `EMERGENCY ALERT (${severity.toUpperCase()}): ${touristName} may be in danger. ${alertMessage}.${zoneStr}${locationStr}`;

  for (const contact of contacts) {
    // Create emergency_response record
    await supabase.from("emergency_responses").insert({
      alert_id: alertId,
      responder_type: "emergency_contact",
      responder_name: contact.name,
      status: "dispatched",
      notes: `Auto-notified: ${contact.phone}${contact.email ? `, ${contact.email}` : ""}`,
    });

    // Create contact_alert tracking record
    const method = contact.email ? "email" : "push";
    await supabase.from("contact_alerts").insert({
      alert_id: alertId,
      contact_id: contact.id,
      user_id: userId,
      delivery_method: method,
      delivery_status: "sent",
      message_content: messageContent,
      sent_at: new Date().toISOString(),
    });
  }
}

// ============================================================
// MAIN HANDLER
// ============================================================

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData.user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userId = userData.user.id;

    if (req.method === "GET") {
      const url = new URL(req.url);
      const lat = parseFloat(url.searchParams.get("lat") || "0");
      const lng = parseFloat(url.searchParams.get("lng") || "0");

      const { data: recentLocations } = await supabase
        .from("location_updates")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      const history = (recentLocations || []).reverse();
      const speeds = history.map((h: any) => h.speed || 0);
      const avgSpeed = speeds.length > 0 ? speeds.reduce((a: number, b: number) => a + b, 0) / speeds.length : 0;

      let headingVariance = 0;
      for (let i = 1; i < history.length; i++) {
        let diff = Math.abs((history[i].heading || 0) - (history[i - 1].heading || 0));
        if (diff > 180) diff = 360 - diff;
        headingVariance += diff * diff;
      }

      let acceleration = 0;
      if (history.length >= 2) {
        const dt = (new Date(history[history.length - 1].created_at).getTime() - new Date(history[history.length - 2].created_at).getTime()) / 1000;
        if (dt > 0) {
          acceleration = Math.abs((history[history.length - 1].speed || 0) - (history[history.length - 2].speed || 0)) / dt;
        }
      }

      const latest = history[history.length - 1];
      const input: PredictionInput = {
        speed: latest?.speed || 0,
        avg_speed: avgSpeed,
        heading_variance: headingVariance,
        is_moving: latest?.is_moving || false,
        battery_level: latest?.battery_level || 100,
        accuracy: latest?.accuracy || 0,
        hour_of_day: new Date().getHours(),
        distance_from_last: 0,
        time_since_last_update: latest
          ? (Date.now() - new Date(latest.created_at).getTime()) / 1000
          : 0,
        acceleration,
        latitude: lat,
        longitude: lng,
      };

      const result = predict(input);

      // Check danger zone proximity
      if (lat !== 0 && lng !== 0) {
        const zoneAlert = await checkDangerZoneProximity(supabase, lat, lng);
        if (zoneAlert) {
          result.danger_zone_alert = zoneAlert;
          if (zoneAlert.zone_severity === "critical" || zoneAlert.zone_severity === "high") {
            result.is_emergency = true;
            result.severity = zoneAlert.zone_severity as PredictionResult["severity"];
            result.message = `Tourist entered danger zone: ${zoneAlert.zone_name}. ${result.message}`;
          }
        }
      }

      if (result.is_emergency) {
        const { data: alertData } = await supabase
          .from("alerts")
          .insert({
            user_id: userId,
            type: result.alert_type,
            severity: result.severity,
            confidence_score: result.confidence,
            latitude: lat,
            longitude: lng,
            features: {
              speed: input.speed,
              avg_speed: input.avg_speed,
              heading_variance: input.heading_variance,
              battery_level: input.battery_level,
              hour_of_day: input.hour_of_day,
              acceleration: input.acceleration,
              danger_zone: result.danger_zone_alert?.zone_name || null,
            },
            message: result.message,
            status: "active",
          })
          .select("*")
          .maybeSingle();

        await supabase.from("notifications").insert({
          user_id: userId,
          title: `Safety Alert: ${result.severity.toUpperCase()}`,
          message: result.message,
          type: "emergency",
        });

        await notifyEmergencyContacts(
          supabase,
          userId,
          (alertData as any)?.id ?? null,
          result.message,
          result.severity,
          lat,
          lng,
          result.danger_zone_alert?.zone_name,
        );
      }

      return new Response(
        JSON.stringify({ prediction: result, user_id: userId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (req.method === "POST") {
      const body = await req.json();
      const input: PredictionInput = {
        speed: body.speed ?? 0,
        avg_speed: body.avg_speed ?? 0,
        heading_variance: body.heading_variance ?? 0,
        is_moving: body.is_moving ?? false,
        battery_level: body.battery_level ?? 100,
        accuracy: body.accuracy ?? 0,
        hour_of_day: body.hour_of_day ?? new Date().getHours(),
        distance_from_last: body.distance_from_last ?? 0,
        time_since_last_update: body.time_since_last_update ?? 0,
        acceleration: body.acceleration ?? 0,
        latitude: body.latitude,
        longitude: body.longitude,
      };

      const result = predict(input);

      // Check danger zone proximity if coordinates provided
      if (input.latitude != null && input.longitude != null) {
        const zoneAlert = await checkDangerZoneProximity(supabase, input.latitude, input.longitude);
        if (zoneAlert) {
          result.danger_zone_alert = zoneAlert;
          if (zoneAlert.zone_severity === "critical" || zoneAlert.zone_severity === "high") {
            result.is_emergency = true;
            result.severity = zoneAlert.zone_severity as PredictionResult["severity"];
            result.message = `Tourist entered danger zone: ${zoneAlert.zone_name}. ${result.message}`;
          }
        }
      }

      if (result.is_emergency && body.auto_alert !== false) {
        const { data: alertData } = await supabase
          .from("alerts")
          .insert({
            user_id: userId,
            type: result.alert_type,
            severity: result.severity,
            confidence_score: result.confidence,
            latitude: body.latitude ?? null,
            longitude: body.longitude ?? null,
            features: {
              speed: input.speed,
              avg_speed: input.avg_speed,
              heading_variance: input.heading_variance,
              battery_level: input.battery_level,
              hour_of_day: input.hour_of_day,
              acceleration: input.acceleration,
              danger_zone: result.danger_zone_alert?.zone_name || null,
            },
            message: result.message,
            status: "active",
          })
          .select("*")
          .maybeSingle();

        await supabase.from("notifications").insert({
          user_id: userId,
          title: `Safety Alert: ${result.severity.toUpperCase()}`,
          message: result.message,
          type: "emergency",
        });

        await notifyEmergencyContacts(
          supabase,
          userId,
          (alertData as any)?.id ?? null,
          result.message,
          result.severity,
          body.latitude,
          body.longitude,
          result.danger_zone_alert?.zone_name,
        );
      }

      return new Response(
        JSON.stringify({ prediction: result, user_id: userId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
