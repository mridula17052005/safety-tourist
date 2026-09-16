/*
# Add Temporary Weather Danger Zone support

1. Modified Tables
   - `danger_zones` — adds columns for temporary/weather-based danger zones:
     - `is_temporary` (boolean, default false) — marks this zone as temporary (e.g., weather-related)
     - `warning_message` (text, nullable) — a specific warning message shown to tourists (e.g., "Do not enter this area during heavy rain")
     - `expires_at` (timestamptz, nullable) — when set, the zone automatically becomes inactive after this timestamp
     - `weather_reason` (text, nullable) — the weather condition reason (e.g., "Heavy Rain", "Flooding", "Hurricane")

2. Automation
   - Adds a function `deactivate_expired_danger_zone()` that deactivates expired temporary danger zones.
   - The frontend will also check expiry client-side for immediate visual update.

3. Security
   - No RLS policy changes needed — existing policies already restrict INSERT/UPDATE/DELETE to admins
     and allow all authenticated users to SELECT.

4. Indexes
   - Adds an index on `expires_at` for efficient expiry queries.
   - Adds an index on `is_temporary` for filtering temporary zones.
*/

ALTER TABLE danger_zones
  ADD COLUMN IF NOT EXISTS is_temporary boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS warning_message text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS weather_reason text;

CREATE INDEX IF NOT EXISTS idx_danger_zones_expires_at ON danger_zones (expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_danger_zones_is_temporary ON danger_zones (is_temporary) WHERE is_temporary = true;

-- Function to deactivate expired temporary danger zones
CREATE OR REPLACE FUNCTION public.deactivate_expired_danger_zone()
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE danger_zones
  SET is_active = false,
      updated_at = now()
  WHERE is_temporary = true
    AND expires_at IS NOT NULL
    AND expires_at < now()
    AND is_active = true;
END;
$function$;
