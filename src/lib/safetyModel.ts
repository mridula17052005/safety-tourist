/**
 * Random Forest-inspired Safety Detection Model
 *
 * This module implements an ensemble of decision trees that analyze real-time
 * GPS and movement data to detect potential emergencies or unsafe situations.
 *
 * Each "tree" is a hand-crafted decision function that evaluates a specific
 * feature dimension (speed, time-of-day, movement consistency, battery, etc.).
 * The forest aggregates all tree votes into a single risk score and classifies
 * the situation into a severity level and alert type.
 *
 * Features analyzed:
 *  - Current speed (m/s) and deviation from historical average
 *  - Time of day (night hours are riskier)
 *  - Movement consistency (erratic heading changes indicate panic/distress)
 *  - No-movement duration (sudden stops can indicate danger)
 *  - Battery level (low battery = unable to call for help)
 *  - Location accuracy degradation (GPS spoofing or indoor distress)
 *  - Distance from last known safe zone
 *  - Acceleration spikes (running from a threat)
 */

import type { AlertType, AlertSeverity } from './types';
import { haversineDistance } from './utils';

export interface SafetyFeatures {
  speed: number;
  avgSpeed: number;
  speedDeviation: number;
  headingChanges: number[];
  isMoving: boolean;
  batteryLevel: number;
  accuracy: number;
  hourOfDay: number;
  distanceFromLast: number;
  timeSinceLastUpdate: number;
  acceleration: number;
  totalHeadingVariance: number;
}

export interface DetectionResult {
  riskScore: number;
  severity: AlertSeverity;
  alertType: AlertType;
  confidence: number;
  message: string;
  features: Record<string, number | string | boolean>;
  treeVotes: { tree: string; vote: number; reason: string }[];
}

interface DecisionNode {
  evaluate(features: SafetyFeatures): { vote: number; reason: string };
}

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

// ============================================================
// DECISION TREES
// ============================================================

const speedAnomalyTree: DecisionNode = {
  evaluate(f) {
    let vote = 0;
    let reason = 'Speed within normal range';

    if (f.speedDeviation > 15) {
      vote += 0.35;
      reason = `Speed deviation high: ${f.speedDeviation.toFixed(1)} m/s above average`;
    } else if (f.speedDeviation > 8) {
      vote += 0.15;
      reason = `Slight speed deviation: ${f.speedDeviation.toFixed(1)} m/s`;
    }

    if (f.speed > 7 && f.avgSpeed < 2) {
      vote += 0.25;
      reason = 'Sudden sprint detected — possible flight from danger';
    }

    if (f.acceleration > 3) {
      vote += 0.2;
      reason = 'High acceleration spike detected';
    }

    return { vote: Math.min(vote, 1), reason };
  },
};

const timeOfDayTree: DecisionNode = {
  evaluate(f) {
    let vote = 0;
    let reason = 'Safe time of day';

    const isNight = f.hourOfDay >= 22 || f.hourOfDay < 5;
    const isEvening = f.hourOfDay >= 19 && f.hourOfDay < 22;

    if (isNight) {
      vote += 0.3;
      reason = 'Late night hours — elevated risk';
      if (!f.isMoving) {
        vote += 0.15;
        reason = 'Stationary during late night — high risk';
      }
    } else if (isEvening) {
      vote += 0.1;
      reason = 'Evening hours — moderate risk';
    }

    return { vote: Math.min(vote, 1), reason };
  },
};

const erraticMovementTree: DecisionNode = {
  evaluate(f) {
    let vote = 0;
    let reason = 'Movement pattern normal';

    if (f.totalHeadingVariance > 1000) {
      vote += 0.35;
      reason = 'Erratic movement — frequent direction changes indicate distress';
    } else if (f.totalHeadingVariance > 500) {
      vote += 0.15;
      reason = 'Moderate heading variance';
    }

    if (f.headingChanges.length > 5) {
      const sharp = f.headingChanges.filter((h) => h > 90).length;
      if (sharp > 3) {
        vote += 0.2;
        reason = `${sharp} sharp turns detected — possible evasive action`;
      }
    }

    return { vote: Math.min(vote, 1), reason };
  },
};

const noMovementTree: DecisionNode = {
  evaluate(f) {
    let vote = 0;
    let reason = 'Movement normal';

    if (!f.isMoving && f.timeSinceLastUpdate > 600) {
      vote += 0.4;
      reason = 'No movement for 10+ minutes — possible emergency';
    } else if (!f.isMoving && f.timeSinceLastUpdate > 300) {
      vote += 0.2;
      reason = 'No movement for 5+ minutes';
    }

    return { vote: Math.min(vote, 1), reason };
  },
};

const batteryTree: DecisionNode = {
  evaluate(f) {
    let vote = 0;
    let reason = 'Battery sufficient';

    if (f.batteryLevel <= 5) {
      vote += 0.3;
      reason = 'Critical battery — unable to call for help soon';
    } else if (f.batteryLevel <= 15) {
      vote += 0.15;
      reason = 'Low battery — risk of losing contact';
    }

    return { vote: Math.min(vote, 1), reason };
  },
};

const accuracyTree: DecisionNode = {
  evaluate(f) {
    let vote = 0;
    let reason = 'GPS accuracy good';

    if (f.accuracy > 100) {
      vote += 0.2;
      reason = 'Poor GPS accuracy — possible indoor or obstructed location';
    } else if (f.accuracy > 50) {
      vote += 0.1;
      reason = 'Moderate GPS accuracy';
    }

    return { vote: Math.min(vote, 1), reason };
  },
};

const distanceTree: DecisionNode = {
  evaluate(f) {
    let vote = 0;
    let reason = 'Distance normal';

    if (f.distanceFromLast > 500 && !f.isMoving) {
      vote += 0.25;
      reason = 'Large location jump without movement — possible GPS spoofing or teleport';
    }

    return { vote: Math.min(vote, 1), reason };
  },
};

const accelerationTree: DecisionNode = {
  evaluate(f) {
    let vote = 0;
    let reason = 'Acceleration normal';

    if (f.acceleration > 5) {
      vote += 0.3;
      reason = 'Extreme acceleration — running or vehicle incident';
    } else if (f.acceleration > 2.5) {
      vote += 0.15;
      reason = 'High acceleration detected';
    }

    return { vote: Math.min(vote, 1), reason };
  },
};

const trees: { name: string; tree: DecisionNode }[] = [
  { name: 'Speed Anomaly', tree: speedAnomalyTree },
  { name: 'Time of Day', tree: timeOfDayTree },
  { name: 'Erratic Movement', tree: erraticMovementTree },
  { name: 'No Movement', tree: noMovementTree },
  { name: 'Battery Level', tree: batteryTree },
  { name: 'GPS Accuracy', tree: accuracyTree },
  { name: 'Distance Jump', tree: distanceTree },
  { name: 'Acceleration', tree: accelerationTree },
];

// ============================================================
// FEATURE EXTRACTION
// ============================================================

export function extractFeatures(
  current: {
    latitude: number;
    longitude: number;
    speed: number;
    heading: number;
    accuracy: number;
    batteryLevel: number;
    isMoving: boolean;
    timestamp: number;
  },
  history: {
    latitude: number;
    longitude: number;
    speed: number;
    heading: number;
    timestamp: number;
  }[],
): SafetyFeatures {
  const speeds = history.map((h) => h.speed);
  const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
  const speedDeviation = Math.abs(current.speed - avgSpeed);

  const headingChanges: number[] = [];
  for (let i = 1; i < history.length; i++) {
    let diff = Math.abs(history[i].heading - history[i - 1].heading);
    if (diff > 180) diff = 360 - diff;
    headingChanges.push(diff);
  }

  let totalHeadingVariance = 0;
  for (const change of headingChanges) {
    totalHeadingVariance += change * change;
  }

  const now = Date.now();
  const timeSinceLastUpdate =
    history.length > 0
      ? (now - history[history.length - 1].timestamp) / 1000
      : 0;

  let distanceFromLast = 0;
  if (history.length > 0) {
    const last = history[history.length - 1];
    distanceFromLast = haversineDistance(
      current.latitude,
      current.longitude,
      last.latitude,
      last.longitude,
    );
  }

  let acceleration = 0;
  if (history.length >= 2) {
    const prev = history[history.length - 2];
    const last = history[history.length - 1];
    const dt = (last.timestamp - prev.timestamp) / 1000;
    if (dt > 0) {
      acceleration = Math.abs(last.speed - prev.speed) / dt;
    }
  }

  const hourOfDay = new Date(current.timestamp).getHours();

  return {
    speed: current.speed,
    avgSpeed,
    speedDeviation,
    headingChanges,
    isMoving: current.isMoving,
    batteryLevel: current.batteryLevel,
    accuracy: current.accuracy,
    hourOfDay,
    distanceFromLast,
    timeSinceLastUpdate,
    acceleration,
    totalHeadingVariance,
  };
}

// ============================================================
// FOREST PREDICTION
// ============================================================

export function predict(features: SafetyFeatures): DetectionResult {
  const treeVotes: { tree: string; vote: number; reason: string }[] = [];
  let totalScore = 0;

  for (const { name, tree } of trees) {
    const { vote, reason } = tree.evaluate(features);
    treeVotes.push({ tree: name, vote, reason });
    totalScore += vote;
  }

  const riskScore = totalScore / trees.length;
  const confidence = Math.min(1, riskScore * 1.5);

  let severity: AlertSeverity = 'low';
  if (riskScore >= 0.6) severity = 'critical';
  else if (riskScore >= 0.4) severity = 'high';
  else if (riskScore >= 0.2) severity = 'medium';

  let alertType: AlertType = 'auto_detected';
  let message = 'Monitoring location data — no immediate threat detected';

  if (features.speedDeviation > 15 || features.acceleration > 3) {
    alertType = 'speed_anomaly';
    message = 'Sudden speed change detected — possible emergency situation';
  } else if (features.totalHeadingVariance > 1000) {
    alertType = 'erratic_movement';
    message = 'Erratic movement pattern detected — possible distress';
  } else if (!features.isMoving && features.timeSinceLastUpdate > 600) {
    alertType = 'no_movement';
    message = 'No movement detected for extended period — checking welfare';
  } else if (features.batteryLevel <= 5) {
    alertType = 'low_battery';
    message = 'Critical battery level — tourist may lose communication';
  } else if (features.distanceFromLast > 500 && !features.isMoving) {
    alertType = 'location_anomaly';
    message = 'Location anomaly detected — possible GPS inconsistency';
  } else if (riskScore >= 0.2) {
    alertType = 'auto_detected';
    message = 'AI model detected unusual activity patterns';
  }

  const featuresRecord: Record<string, number | string | boolean> = {
    speed: features.speed,
    avg_speed: features.avgSpeed,
    speed_deviation: features.speedDeviation,
    is_moving: features.isMoving,
    battery_level: features.batteryLevel,
    accuracy: features.accuracy,
    hour_of_day: features.hourOfDay,
    distance_from_last: features.distanceFromLast,
    time_since_last_update: features.timeSinceLastUpdate,
    acceleration: features.acceleration,
    heading_variance: features.totalHeadingVariance,
  };

  return {
    riskScore,
    severity,
    alertType,
    confidence,
    message,
    features: featuresRecord,
    treeVotes,
  };
}

// ============================================================
// SAFETY SCORE (for dashboard display)
// ============================================================

export function computeSafetyScore(features: SafetyFeatures): number {
  const result = predict(features);
  return Math.round((1 - result.riskScore) * 100);
}
