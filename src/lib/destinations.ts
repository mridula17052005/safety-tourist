export type Season = 'summer' | 'monsoon' | 'winter' | 'normal';

export interface Destination {
  id: string;
  name: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  destination_type: string;
  summer_suitable: boolean;
  winter_suitable: boolean;
  monsoon_considerations: string;
}

export function getCurrentSeason(date: Date = new Date()): Season {
  const month = date.getMonth();
  if (month >= 3 && month <= 5) return 'summer';
  if (month >= 6 && month <= 9) return 'monsoon';
  if (month >= 10 && month <= 1) return 'winter';
  return 'normal';
}

export function seasonLabel(season: Season): string {
  switch (season) {
    case 'summer': return 'Summer';
    case 'monsoon': return 'Monsoon';
    case 'winter': return 'Winter';
    default: return 'Normal Period';
  }
}
