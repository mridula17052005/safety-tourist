/**
 * API Service Layer
 *
 * Abstracts all backend REST API calls. The Random Forest prediction model
 * runs as a server-side edge function (safety-predict) that authenticates
 * the user, reads their location history from the database, runs the model,
 * and optionally creates alerts + notifies emergency contacts.
 *
 * This layer provides a clean interface so the frontend doesn't need to know
 * about the underlying transport (edge function / REST endpoint).
 */

import { supabase } from './supabase';

export interface PredictionResponse {
  prediction: {
    risk_score: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    alert_type: string;
    confidence: number;
    message: string;
    tree_votes: { tree: string; vote: number; reason: string }[];
    is_emergency: boolean;
  };
  user_id: string;
}

export interface PredictInput {
  speed?: number;
  avg_speed?: number;
  heading_variance?: number;
  is_moving?: boolean;
  battery_level?: number;
  accuracy?: number;
  hour_of_day?: number;
  distance_from_last?: number;
  time_since_last_update?: number;
  acceleration?: number;
  latitude?: number;
  longitude?: number;
  auto_alert?: boolean;
}

function getFunctionUrl(): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  return `${supabaseUrl}/functions/v1/safety-predict`;
}

async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function predictFromHistory(lat: number, lng: number): Promise<PredictionResponse | null> {
  const token = await getAuthToken();
  if (!token) return null;

  const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const response = await fetch(`${getFunctionUrl()}?lat=${lat}&lng=${lng}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Client-Info': 'safetour-web',
      apikey: apiKey,
    },
  });

  if (!response.ok) {
    console.error('Prediction API error:', response.status);
    return null;
  }

  return (await response.json()) as PredictionResponse;
}

export async function predictWithData(input: PredictInput): Promise<PredictionResponse | null> {
  const token = await getAuthToken();
  if (!token) return null;

  const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const response = await fetch(getFunctionUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Client-Info': 'safetour-web',
      apikey: apiKey,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    console.error('Prediction API error:', response.status);
    return null;
  }

  return (await response.json()) as PredictionResponse;
}
