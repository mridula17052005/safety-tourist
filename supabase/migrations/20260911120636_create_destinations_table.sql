/*
# Create destinations table for Destination Safety Assessment

## Overview
Adds a `destinations` table that stores tourist destinations with their
coordinates, type, and seasonal suitability metadata. This powers the
"Check Destination Safety" feature which assesses whether a place is
safe to visit on a given day based on season, weather, incidents, and
danger zones.

## New Tables
1. `destinations`
   - `id` (uuid, primary key)
   - `name` (text, not null) — destination name
   - `state` (text) — state or province
   - `country` (text, not null) — country name
   - `latitude` (double precision, not null) — center latitude
   - `longitude` (double precision, not null) — center longitude
   - `destination_type` (text) — e.g. "hill_station", "city", "beach"
   - `summer_suitable` (boolean) — is this destination suitable in summer
   - `winter_suitable` (boolean) — is this destination suitable in winter
   - `monsoon_considerations` (text) — notes about monsoon travel risks
   - `created_at` (timestamptz)

## Security
- RLS enabled on `destinations`.
- All authenticated users can read destinations (shared reference data).
- Only admins can insert/update/delete destinations.
*/

CREATE TABLE IF NOT EXISTS destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  state text DEFAULT '',
  country text NOT NULL DEFAULT 'India',
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  destination_type text NOT NULL DEFAULT 'city',
  summer_suitable boolean DEFAULT true,
  winter_suitable boolean DEFAULT true,
  monsoon_considerations text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_destinations" ON destinations;
CREATE POLICY "select_destinations" ON destinations FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_destinations" ON destinations;
CREATE POLICY "insert_destinations" ON destinations FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "update_destinations" ON destinations;
CREATE POLICY "update_destinations" ON destinations FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "delete_destinations" ON destinations;
CREATE POLICY "delete_destinations" ON destinations FOR DELETE
  TO authenticated USING (is_admin());

-- Seed initial destinations
INSERT INTO destinations (name, state, country, latitude, longitude, destination_type, summer_suitable, winter_suitable, monsoon_considerations) VALUES
('Ooty', 'Tamil Nadu', 'India', 11.4102, 76.6950, 'hill_station', true, true, 'Heavy rainfall during monsoon can cause landslides; road travel may be hazardous.'),
('Kodaikanal', 'Tamil Nadu', 'India', 10.2381, 77.4892, 'hill_station', true, true, 'Monsoon brings mist and slippery roads; visibility can be poor.'),
('Yercaud', 'Tamil Nadu', 'India', 11.7794, 78.2973, 'hill_station', true, true, 'Moderate monsoon rainfall; generally safer than higher hill stations.'),
('Valparai', 'Tamil Nadu', 'India', 10.3260, 76.9560, 'hill_station', true, true, 'Heavy monsoon rainfall; landslides possible in surrounding areas.'),
('Munnar', 'Kerala', 'India', 10.0889, 77.0595, 'hill_station', true, true, 'Monsoon can cause landslides and road closures; check conditions before travel.'),
('Wayanad', 'Kerala', 'India', 11.6854, 76.1420, 'hill_station', true, true, 'Monsoon brings heavy rain; wildlife activity increases; road conditions may deteriorate.'),
('Coorg', 'Karnataka', 'India', 12.3375, 75.8069, 'hill_station', true, true, 'Monsoon rainfall is heavy; landslides and road flooding possible.'),
('Mysuru', 'Karnataka', 'India', 12.2958, 76.6394, 'city', true, true, 'Monsoon is moderate; occasional waterlogging in low areas.'),
('Chennai', 'Tamil Nadu', 'India', 13.0827, 80.2707, 'city', false, true, 'Monsoon brings cyclonic storms and flooding; heat in summer is extreme.'),
('Madurai', 'Tamil Nadu', 'India', 9.9252, 78.1198, 'city', false, true, 'Monsoon is moderate; summer heat can be severe.'),
('Rameswaram', 'Tamil Nadu', 'India', 9.2876, 79.3129, 'city', false, true, 'Monsoon can bring strong winds; coastal flooding possible.'),
('Kanyakumari', 'Tamil Nadu', 'India', 8.0883, 77.5385, 'city', false, true, 'Monsoon brings rough seas; swimming is dangerous during this period.'),
('Pondicherry', 'Puducherry', 'India', 11.9416, 79.8083, 'city', false, true, 'Monsoon can cause coastal flooding; cyclones possible.'),
('Goa', 'Goa', 'India', 15.2993, 74.1240, 'beach', false, true, 'Monsoon brings heavy rain and rough seas; beach activities are unsafe.')
ON CONFLICT DO NOTHING;
