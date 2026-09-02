/*
# Create danger_zones table

1. New Tables
- `danger_zones` — stores known dangerous geographic areas (red zones) that tourists should be warned about
  - `id` (uuid, primary key)
  - `name` (text, not null) — zone name/title
  - `description` (text) — what makes this area dangerous
  - `latitude` (numeric, not null) — center latitude
  - `longitude` (numeric, not null) — center longitude
  - `radius_meters` (integer, not null, default 500) — radius of the danger zone in meters
  - `severity` (text, not null, default 'medium') — danger level: low, medium, high, critical
  - `zone_type` (text, not null, default 'general') — category: general, crime, nightlife, scam, natural_hazard, civil_unrest
  - `country` (text) — country where the zone is located
  - `city` (text) — city where the zone is located
  - `is_active` (boolean, default true) — whether the zone is currently active
  - `reported_by` (uuid, references profiles) — admin who created/last edited the zone
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

2. Security
- Enable RLS on `danger_zones`.
- All authenticated users (tourists) can READ danger zones — they need to see danger areas to avoid them.
- Only admin users can INSERT, UPDATE, DELETE danger zones.
- Uses the existing `is_admin()` SECURITY DEFINER function for admin checks.

3. Indexes
- Index on `is_active` for fast filtering
- Index on `country` and `city` for location-based queries

4. Seed Data
- Inserts 12 well-known dangerous areas around the world as examples.
*/

-- Create updated_at trigger function in public schema if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE TABLE IF NOT EXISTS danger_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  latitude numeric(10, 7) NOT NULL,
  longitude numeric(10, 7) NOT NULL,
  radius_meters integer NOT NULL DEFAULT 500,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  zone_type text NOT NULL DEFAULT 'general' CHECK (zone_type IN ('general', 'crime', 'nightlife', 'scam', 'natural_hazard', 'civil_unrest')),
  country text,
  city text,
  is_active boolean NOT NULL DEFAULT true,
  reported_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE danger_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_danger_zones" ON danger_zones;
CREATE POLICY "read_danger_zones"
ON danger_zones FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "insert_danger_zones_admin" ON danger_zones;
CREATE POLICY "insert_danger_zones_admin"
ON danger_zones FOR INSERT
TO authenticated
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "update_danger_zones_admin" ON danger_zones;
CREATE POLICY "update_danger_zones_admin"
ON danger_zones FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "delete_danger_zones_admin" ON danger_zones;
CREATE POLICY "delete_danger_zones_admin"
ON danger_zones FOR DELETE
TO authenticated
USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_danger_zones_active ON danger_zones (is_active);
CREATE INDEX IF NOT EXISTS idx_danger_zones_country ON danger_zones (country);
CREATE INDEX IF NOT EXISTS idx_danger_zones_city ON danger_zones (city);

DROP TRIGGER IF EXISTS update_danger_zones_updated_at ON danger_zones;
CREATE TRIGGER update_danger_zones_updated_at
BEFORE UPDATE ON danger_zones
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO danger_zones (name, description, latitude, longitude, radius_meters, severity, zone_type, country, city) VALUES
('Rocinha Favela', 'One of Rio''s largest favelas. High crime rates, drug trafficking activity. Tourists should not enter without a licensed local guide.', -22.9886, -43.2436, 800, 'high', 'crime', 'Brazil', 'Rio de Janeiro'),
('Wenceslas Square Night Zone', 'Pickpocketing and overcharging scams are common at night, especially around bars and clubs.', 50.0815, 14.4267, 400, 'medium', 'nightlife', 'Czech Republic', 'Prague'),
('La Linea Border Crossing', 'High-risk area for drug-related crime and smuggling. Avoid walking or lingering near the border.', 36.1716, -5.3486, 600, 'high', 'crime', 'Spain', 'La Linea'),
('Tahrir Square', 'Site of frequent political protests and civil unrest. Avoid during demonstrations.', 30.0444, 31.2357, 500, 'medium', 'civil_unrest', 'Egypt', 'Cairo'),
('Johannesburg CBD', 'High incidence of muggings and petty crime, especially after dark. Tourists should avoid walking in the central business district.', -26.2041, 28.0473, 1000, 'high', 'crime', 'South Africa', 'Johannesburg'),
('Scampia District', 'Known for organized crime (Camorra). Run-down housing estates with high drug activity. Avoid entirely.', 40.8989, 14.2444, 700, 'critical', 'crime', 'Italy', 'Naples'),
('Tijuana Red Light District', 'High crime area with drug cartel activity. Extremely dangerous for tourists, especially at night.', 32.5149, -117.0382, 500, 'critical', 'crime', 'Mexico', 'Tijuana'),
('Ermita Tourist Scam Zone', 'Known for tourist scams, overcharging, and pickpocketing targeting foreigners.', 14.5826, 120.9787, 400, 'medium', 'scam', 'Philippines', 'Manila'),
('Marseille Northern Districts', 'Drug-related crime in northern neighborhoods. Avoid areas like Castellane and Bricarde.', 43.3146, 5.3933, 800, 'high', 'crime', 'France', 'Marseille'),
('Omonia Square', 'Pickpocketing and drug activity reported. Exercise caution, especially at night.', 38.0238, 23.7285, 350, 'medium', 'crime', 'Greece', 'Athens'),
('Pattaya Walking Street', 'Scams, pickpocketing, and overcharging targeting tourists, especially at night.', 12.9236, 100.8825, 500, 'medium', 'nightlife', 'Thailand', 'Pattaya'),
('Kibera Slum', 'One of Africa''s largest slums. High crime risk. Do not enter without a trusted local guide.', -1.3134, 36.7820, 900, 'high', 'crime', 'Kenya', 'Nairobi')
ON CONFLICT DO NOTHING;
