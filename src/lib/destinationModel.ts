import type { Season } from './destinations';
import { haversineDistance } from './utils';
import type { DangerZone } from './types';
import type { Incident } from './types';

export interface DestinationAssessmentInput {
  destination: {
    name: string;
    latitude: number;
    longitude: number;
    summer_suitable: boolean;
    winter_suitable: boolean;
    monsoon_considerations: string;
  };
  season: Season;
  weather: WeatherInfo | null;
  dangerZones: DangerZone[];
  incidents: Incident[];
}

export interface WeatherInfo {
  condition: string;
  temperature: number;
  rainfall: number;
  alerts: string[];
}

export interface AssessmentFactor {
  label: string;
  status: 'good' | 'warning' | 'danger';
  detail: string;
}

export interface DestinationAssessment {
  score: number;
  riskLevel: 'LOW RISK' | 'MODERATE RISK' | 'HIGH RISK' | 'VERY HIGH RISK';
  factors: AssessmentFactor[];
  recommendation: string;
  precautions: string[];
  treeVotes: { tree: string; vote: number; reason: string }[];
}

interface DecisionNode {
  evaluate(input: DestinationAssessmentInput): { vote: number; reason: string };
}

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

const seasonTree: DecisionNode = {
  evaluate(input) {
    const { season, destination } = input;
    let vote = 0;
    let reason = 'Season conditions are suitable';

    if (season === 'summer' && !destination.summer_suitable) {
      vote += 0.35;
      reason = 'Summer is not ideal for this destination';
    } else if (season === 'winter' && !destination.winter_suitable) {
      vote += 0.2;
      reason = 'Winter is not optimal for this destination';
    } else if (season === 'monsoon') {
      vote += 0.25;
      reason = 'Monsoon season — weather-related risks increase';
    }

    return { vote: Math.min(vote, 1), reason };
  },
};

const weatherTree: DecisionNode = {
  evaluate(input) {
    const weather = input.weather;
    if (!weather) return { vote: 0.1, reason: 'Weather data unavailable — uncertainty adds slight risk' };

    let vote = 0;
    let reason = 'Weather conditions are favorable';

    if (weather.condition === 'Thunderstorm' || weather.condition === 'Storm') {
      vote += 0.4;
      reason = 'Storm conditions detected — travel hazardous';
    } else if (weather.condition === 'Heavy Rain' || weather.rainfall > 50) {
      vote += 0.3;
      reason = 'Heavy rainfall — flooding and road hazards likely';
    } else if (weather.condition === 'Rain' || weather.rainfall > 10) {
      vote += 0.15;
      reason = 'Moderate rainfall — exercise caution outdoors';
    }

    if (weather.temperature > 40) {
      vote += 0.2;
      reason = 'Extreme heat — health risk for outdoor activities';
    } else if (weather.temperature < 5) {
      vote += 0.15;
      reason = 'Very cold temperatures — frostbite/hypothermia risk';
    }

    if (weather.alerts.length > 0) {
      vote += 0.2;
      reason = `${weather.alerts.length} active weather alert(s)`;
    }

    return { vote: Math.min(vote, 1), reason };
  },
};

const incidentTree: DecisionNode = {
  evaluate(input) {
    const incidents = input.incidents;
    let vote = 0;
    let reason = 'No recent incidents reported';

    if (incidents.length === 0) return { vote: 0, reason };

    const recentCount = incidents.length;
    const severe = incidents.filter(
      (i) => i.type === 'assault' || i.type === 'theft' || i.type === 'harassment',
    ).length;

    if (recentCount >= 5) {
      vote += 0.35;
      reason = `${recentCount} recent incidents reported — elevated risk area`;
    } else if (recentCount >= 2) {
      vote += 0.2;
      reason = `${recentCount} recent incidents reported`;
    } else {
      vote += 0.08;
      reason = `${recentCount} recent incident reported`;
    }

    if (severe >= 3) {
      vote += 0.15;
      reason = `${severe} serious incidents (theft, assault, harassment)`;
    }

    return { vote: Math.min(vote, 1), reason };
  },
};

const dangerZoneTree: DecisionNode = {
  evaluate(input) {
    const { dangerZones, destination } = input;
    let vote = 0;
    let reason = 'No nearby danger zones';

    if (dangerZones.length === 0) return { vote: 0, reason };

    const critical = dangerZones.filter((z) => z.severity === 'critical').length;
    const high = dangerZones.filter((z) => z.severity === 'high').length;

    if (critical > 0) {
      vote += 0.4;
      reason = `${critical} critical danger zone(s) near ${destination.name}`;
    } else if (high > 0) {
      vote += 0.25;
      reason = `${high} high-risk danger zone(s) nearby`;
    } else if (dangerZones.length >= 3) {
      vote += 0.15;
      reason = `${dangerZones.length} moderate/low danger zones nearby`;
    } else {
      vote += 0.08;
      reason = `${dangerZones.length} low-risk zone(s) in the area`;
    }

    return { vote: Math.min(vote, 1), reason };
  },
};

const monsoonConsiderationTree: DecisionNode = {
  evaluate(input) {
    const { season, destination } = input;
    if (season !== 'monsoon' || !destination.monsoon_considerations) {
      return { vote: 0, reason: 'No seasonal advisory' };
    }
    let vote = 0.15;
    let reason = destination.monsoon_considerations;

    if (destination.monsoon_considerations.toLowerCase().includes('landslide')) {
      vote = 0.3;
      reason = 'Monsoon landslide risk noted for this destination';
    } else if (destination.monsoon_considerations.toLowerCase().includes('flooding')) {
      vote = 0.25;
      reason = 'Monsoon flooding risk noted for this destination';
    }

    return { vote: Math.min(vote, 1), reason };
  },
};

const trees: { name: string; tree: DecisionNode }[] = [
  { name: 'Seasonal Suitability', tree: seasonTree },
  { name: 'Weather Conditions', tree: weatherTree },
  { name: 'Recent Incidents', tree: incidentTree },
  { name: 'Danger Zone Proximity', tree: dangerZoneTree },
  { name: 'Monsoon Advisory', tree: monsoonConsiderationTree },
];

export function assessDestinationSafety(input: DestinationAssessmentInput): DestinationAssessment {
  const treeVotes: { tree: string; vote: number; reason: string }[] = [];
  let totalVote = 0;

  for (const { name, tree } of trees) {
    const { vote, reason } = tree.evaluate(input);
    treeVotes.push({ tree: name, vote, reason });
    totalVote += vote;
  }

  const avgVote = totalVote / trees.length;
  const score = Math.round((1 - avgVote) * 100);

  let riskLevel: DestinationAssessment['riskLevel'] = 'LOW RISK';
  if (score < 40) riskLevel = 'VERY HIGH RISK';
  else if (score < 60) riskLevel = 'HIGH RISK';
  else if (score < 80) riskLevel = 'MODERATE RISK';

  const factors: AssessmentFactor[] = [];

  if (input.weather) {
    if (input.weather.condition === 'Thunderstorm' || input.weather.condition === 'Storm' || input.weather.rainfall > 50) {
      factors.push({ label: 'Weather', status: 'danger', detail: `${input.weather.condition}, ${input.weather.rainfall}mm rain` });
    } else if (input.weather.condition === 'Rain' || input.weather.rainfall > 10) {
      factors.push({ label: 'Weather', status: 'warning', detail: `${input.weather.condition}, ${input.weather.rainfall}mm rain` });
    } else {
      factors.push({ label: 'Weather', status: 'good', detail: `${input.weather.condition}, ${input.weather.temperature}°C` });
    }
  } else {
    factors.push({ label: 'Weather', status: 'warning', detail: 'Weather data unavailable' });
  }

  const seasonSuitable =
    (input.season === 'summer' && input.destination.summer_suitable) ||
    (input.season === 'winter' && input.destination.winter_suitable) ||
    (input.season === 'monsoon') ||
    input.season === 'normal';

  if (seasonSuitable && input.season !== 'monsoon') {
    factors.push({ label: 'Season', status: 'good', detail: `Suitable for ${input.season} travel` });
  } else if (input.season === 'monsoon') {
    factors.push({ label: 'Season', status: 'warning', detail: 'Monsoon season — extra caution needed' });
  } else {
    factors.push({ label: 'Season', status: 'warning', detail: `Not ideal for ${input.season} travel` });
  }

  if (input.incidents.length === 0) {
    factors.push({ label: 'Incidents', status: 'good', detail: 'No recent incidents reported' });
  } else {
    const severe = input.incidents.filter(
      (i) => i.type === 'assault' || i.type === 'theft' || i.type === 'harassment',
    ).length;
    factors.push({
      label: 'Incidents',
      status: severe >= 3 ? 'danger' : 'warning',
      detail: `${input.incidents.length} recent incident(s)${severe > 0 ? `, ${severe} serious` : ''}`,
    });
  }

  if (input.dangerZones.length === 0) {
    factors.push({ label: 'Danger Zones', status: 'good', detail: 'No nearby danger zones' });
  } else {
    const critical = input.dangerZones.filter((z) => z.severity === 'critical').length;
    factors.push({
      label: 'Danger Zones',
      status: critical > 0 ? 'danger' : 'warning',
      detail: `${input.dangerZones.length} danger zone(s) nearby${critical > 0 ? `, ${critical} critical` : ''}`,
    });
  }

  if (input.season === 'monsoon' && input.destination.monsoon_considerations) {
    factors.push({ label: 'Monsoon Advisory', status: 'warning', detail: input.destination.monsoon_considerations });
  }

  let recommendation = '';
  if (score >= 80) {
    recommendation = 'Conditions appear relatively favorable based on available data. Continue to follow local safety advisories and stay alert.';
  } else if (score >= 60) {
    recommendation = 'Moderate caution is recommended because of current weather and/or recent incident activity. Check local advisories before heading out.';
  } else if (score >= 40) {
    recommendation = 'High caution is recommended. Check official local advisories, avoid identified danger zones, and consider postponing non-essential travel.';
  } else {
    recommendation = 'Very high caution is advised. Conditions suggest significant risks. Avoid non-essential travel to this destination until conditions improve.';
  }

  const precautions: string[] = [];
  if (input.season === 'monsoon') {
    precautions.push('Carry rain gear and avoid low-lying areas prone to flooding.');
    precautions.push('Check road conditions before travel — landslides may block routes.');
  }
  if (input.weather && input.weather.temperature > 40) {
    precautions.push('Stay hydrated, avoid midday sun, and carry sunscreen.');
  }
  if (input.dangerZones.length > 0) {
    precautions.push(`Avoid ${input.dangerZones.map((z) => z.name).slice(0, 3).join(', ')}${input.dangerZones.length > 3 ? ' and other flagged areas' : ''}.`);
  }
  if (input.incidents.length >= 3) {
    precautions.push('Stay in well-populated tourist areas and avoid traveling alone at night.');
  }
  precautions.push('Keep your live tracking on and SOS feature ready.');
  precautions.push('Save local emergency numbers before exploring.');

  return { score, riskLevel, factors, recommendation, precautions, treeVotes };
}

export function findNearbyDangerZones(
  destLat: number,
  destLng: number,
  zones: DangerZone[],
  radiusKm: number = 50,
): DangerZone[] {
  return zones
    .filter((z) => z.is_active)
    .filter((z) => haversineDistance(destLat, destLng, z.latitude, z.longitude) <= radiusKm * 1000)
    .sort((a, b) => haversineDistance(destLat, destLng, a.latitude, a.longitude) - haversineDistance(destLat, destLng, b.latitude, b.longitude));
}

export function findNearbyIncidents(
  destLat: number,
  destLng: number,
  incidents: Incident[],
  radiusKm: number = 50,
): Incident[] {
  return incidents
    .filter((i) => i.latitude != null && i.longitude != null)
    .filter((i) => haversineDistance(destLat, destLng, i.latitude!, i.longitude!) <= radiusKm * 1000)
    .sort((a, b) => haversineDistance(destLat, destLng, a.latitude!, a.longitude!) - haversineDistance(destLat, destLng, b.latitude!, b.longitude!));
}
