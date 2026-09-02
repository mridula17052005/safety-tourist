/**
 * AI Safety Tips & Travel Recommendations Engine
 *
 * Generates contextual safety recommendations based on the tourist's current
 * situation: time of day, location, movement patterns, battery, and history.
 */

import type { SafetyTip } from './types';
import type { SafetyFeatures } from './safetyModel';

export interface Recommendation {
  title: string;
  content: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
}

export function generateRecommendations(features: SafetyFeatures): Recommendation[] {
  const recs: Recommendation[] = [];

  const hour = features.hourOfDay;
  const isNight = hour >= 22 || hour < 5;
  const isEvening = hour >= 19 && hour < 22;

  if (isNight) {
    recs.push({
      title: 'Avoid Walking Alone at Night',
      content:
        'It is late at night in your area. If possible, use a licensed taxi or ride-sharing service instead of walking. If you must walk, stay on well-lit main streets and share your live location with a trusted contact via SafeTour AI.',
      category: 'nightlife',
      priority: 'high',
      icon: 'Moon',
    });
  } else if (isEvening) {
    recs.push({
      title: 'Plan Your Return Route',
      content:
        'Evening is approaching. Plan your route back to your accommodation now while public transit is still running frequently. Save your hotel address in the local language.',
      category: 'nightlife',
      priority: 'medium',
      icon: 'Moon',
    });
  }

  if (features.batteryLevel <= 15) {
    recs.push({
      title: 'Conserve Battery — Charge Now',
      content:
        'Your battery is critically low. Find a charging point immediately. Enable low-power mode and close unnecessary apps. Your phone is your lifeline in an emergency.',
      category: 'digital',
      priority: 'high',
      icon: 'BatteryLow',
    });
  }

  if (features.speed > 7) {
    recs.push({
      title: 'Fast Movement Detected',
      content:
        'You are moving quickly. If you are in a vehicle, verify it matches your ride-sharing app. If you are running, ensure you are heading toward a safe, populated area.',
      category: 'transportation',
      priority: 'medium',
      icon: 'Car',
    });
  }

  if (!features.isMoving && features.timeSinceLastUpdate > 300) {
    recs.push({
      title: 'Extended Stop Detected',
      content:
        'You have been stationary for a while. If this is unexpected, send a check-in message to your emergency contacts. If you feel unsafe, use the SOS button.',
      category: 'emergency',
      priority: 'medium',
      icon: 'MapPin',
    });
  }

  if (features.totalHeadingVariance > 500) {
    recs.push({
      title: 'Irregular Movement Pattern',
      content:
        'Your movement pattern shows frequent direction changes. If you are lost, find a safe, populated spot and check your map. If you feel you are being followed, head to a public place and call local emergency services.',
      category: 'crime',
      priority: 'high',
      icon: 'ShieldAlert',
    });
  }

  if (features.accuracy > 50) {
    recs.push({
      title: 'GPS Signal Weak',
      content:
        'Your GPS accuracy is low, possibly due to being indoors or in an obstructed area. If you are in an unfamiliar indoor location, note the address and nearest landmark.',
      category: 'general',
      priority: 'low',
      icon: 'MapPin',
    });
  }

  // Always include a general tip
  if (recs.length === 0) {
    recs.push({
      title: 'Stay Alert and Aware',
      content:
        'Your activity looks normal. Keep your live tracking on, stay aware of your surroundings, and trust your instincts. If anything feels wrong, do not hesitate to use the SOS feature.',
      category: 'general',
      priority: 'low',
      icon: 'Shield',
    });
  }

  recs.push({
    title: 'Keep Emergency Contacts Updated',
    content:
      'Make sure your emergency contacts are current and know your travel plans. SafeTour AI will automatically notify them if an emergency is detected.',
    category: 'emergency',
    priority: 'low',
    icon: 'Users',
  });

  return recs;
}

export function rankTipsByContext(
  tips: SafetyTip[],
  features: SafetyFeatures,
): SafetyTip[] {
  const hour = features.hourOfDay;
  const isNight = hour >= 22 || hour < 5;
  const isEvening = hour >= 19 && hour < 22;

  const priorityBoost: Record<string, number> = {};
  if (isNight || isEvening) {
    priorityBoost['nightlife'] = 5;
    priorityBoost['crime'] = 3;
    priorityBoost['transportation'] = 2;
  }
  if (features.batteryLevel <= 15) {
    priorityBoost['digital'] = 4;
  }
  if (!features.isMoving && features.timeSinceLastUpdate > 300) {
    priorityBoost['emergency'] = 3;
  }
  if (features.speed > 5) {
    priorityBoost['transportation'] = 3;
  }

  return [...tips].sort((a, b) => {
    const aBoost = priorityBoost[a.category] ?? 0;
    const bBoost = priorityBoost[b.category] ?? 0;
    const aScore = a.priority + aBoost;
    const bScore = b.priority + bBoost;
    return bScore - aScore;
  });
}
