/*
# SafeTour AI — Core Database Schema

## Overview
Creates the complete schema for SafeTour AI, a tourist safety platform with
AI-powered emergency detection, live GPS tracking, incident reporting, and
an admin dashboard.

## New Tables
1. profiles — extends auth.users with role (tourist/admin), full name, phone, nationality, avatar.
2. emergency_contacts — people a tourist designates for emergency notification. Owner-scoped.
3. location_updates — live GPS pings (lat, lng, speed, heading, accuracy, altitude, battery, is_moving).
4. incidents — tourist-submitted incident reports with type, description, image, coordinates, status.
5. alerts — emergencies detected by the AI model or manual SOS. Stores severity, confidence, features (JSONB).
6. emergency_responses — admin/authority responses to alerts. Linked to alerts.
7. notifications — real-time in-app notifications per user. Owner-scoped.
8. safety_tips — AI-generated safety tips and travel recommendations.

## Security
- RLS enabled on every table.
- is_admin() SECURITY DEFINER function avoids RLS recursion.
- Tourist tables are owner-scoped with admin override.
- Storage bucket "incidents" for image uploads with owner-scoped policies.
- Auto-create profile on signup via trigger.
*/

-- ============================================================
-- 1. PROFILES (table first, policies after is_admin() exists)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'tourist' CHECK (role IN ('tourist', 'admin')),
  full_name text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  nationality text DEFAULT '',
  home_country text DEFAULT '',
  avatar_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTION: is_admin() — SECURITY DEFINER
-- Must exist before any policy references it.
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  );
$$;

-- Now safe to create policies that call is_admin()
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR is_admin());

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id OR is_admin())
  WITH CHECK (auth.uid() = id OR is_admin());

-- ============================================================
-- 2. EMERGENCY_CONTACTS
-- ============================================================
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  relationship text DEFAULT '',
  phone text NOT NULL,
  email text DEFAULT '',
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_contacts" ON emergency_contacts;
CREATE POLICY "select_own_contacts" ON emergency_contacts FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "insert_own_contacts" ON emergency_contacts;
CREATE POLICY "insert_own_contacts" ON emergency_contacts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_contacts" ON emergency_contacts;
CREATE POLICY "update_own_contacts" ON emergency_contacts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_contacts" ON emergency_contacts;
CREATE POLICY "delete_own_contacts" ON emergency_contacts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 3. LOCATION_UPDATES
-- ============================================================
CREATE TABLE IF NOT EXISTS location_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  speed double precision DEFAULT 0,
  heading double precision DEFAULT 0,
  accuracy double precision DEFAULT 0,
  altitude double precision DEFAULT 0,
  battery_level integer DEFAULT 100,
  is_moving boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE location_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_locations" ON location_updates;
CREATE POLICY "select_own_locations" ON location_updates FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "insert_own_locations" ON location_updates;
CREATE POLICY "insert_own_locations" ON location_updates FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_locations" ON location_updates;
CREATE POLICY "delete_own_locations" ON location_updates FOR DELETE
  TO authenticated USING (auth.uid() = user_id OR is_admin());

CREATE INDEX IF NOT EXISTS idx_location_updates_user_created
  ON location_updates(user_id, created_at DESC);

-- ============================================================
-- 4. INCIDENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('theft','assault','harassment','accident','medical','unsafe_area','lost','other')),
  description text DEFAULT '',
  latitude double precision,
  longitude double precision,
  image_url text DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewing','resolved','dismissed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_incidents" ON incidents;
CREATE POLICY "select_own_incidents" ON incidents FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "insert_own_incidents" ON incidents;
CREATE POLICY "insert_own_incidents" ON incidents FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_incidents" ON incidents;
CREATE POLICY "update_own_incidents" ON incidents FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR is_admin())
  WITH CHECK (auth.uid() = user_id OR is_admin());

CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents(created_at DESC);

-- ============================================================
-- 5. ALERTS
-- ============================================================
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('auto_detected','manual_sos','speed_anomaly','location_anomaly','low_battery','no_movement','erratic_movement')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  confidence_score double precision DEFAULT 0,
  latitude double precision,
  longitude double precision,
  features jsonb DEFAULT '{}',
  message text DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','acknowledged','resolved','dismissed')),
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_alerts" ON alerts;
CREATE POLICY "select_own_alerts" ON alerts FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "insert_own_alerts" ON alerts;
CREATE POLICY "insert_own_alerts" ON alerts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "update_own_alerts" ON alerts;
CREATE POLICY "update_own_alerts" ON alerts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR is_admin())
  WITH CHECK (auth.uid() = user_id OR is_admin());

CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at DESC);

-- ============================================================
-- 6. EMERGENCY_RESPONSES
-- ============================================================
CREATE TABLE IF NOT EXISTS emergency_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  responder_type text NOT NULL CHECK (responder_type IN ('admin','police','hospital','emergency_contact','other')),
  responder_name text DEFAULT '',
  status text NOT NULL DEFAULT 'dispatched' CHECK (status IN ('dispatched','en_route','on_scene','resolved')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE emergency_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_responses" ON emergency_responses;
CREATE POLICY "select_responses" ON emergency_responses FOR SELECT
  TO authenticated USING (
    is_admin() OR
    EXISTS (SELECT 1 FROM alerts WHERE alerts.id = emergency_responses.alert_id AND alerts.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_responses" ON emergency_responses;
CREATE POLICY "insert_responses" ON emergency_responses FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "update_responses" ON emergency_responses;
CREATE POLICY "update_responses" ON emergency_responses FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================
-- 7. NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info','alert','warning','success','emergency')),
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR is_admin())
  WITH CHECK (auth.uid() = user_id OR is_admin());

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read, created_at DESC);

-- ============================================================
-- 8. SAFETY_TIPS
-- ============================================================
CREATE TABLE IF NOT EXISTS safety_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('general','transportation','health','crime','culture','emergency','nightlife','outdoor','women_safety','digital')),
  title text NOT NULL,
  content text NOT NULL,
  location_context text DEFAULT '',
  priority integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE safety_tips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_safety_tips" ON safety_tips;
CREATE POLICY "select_safety_tips" ON safety_tips FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_safety_tips" ON safety_tips;
CREATE POLICY "insert_safety_tips" ON safety_tips FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "update_safety_tips" ON safety_tips;
CREATE POLICY "update_safety_tips" ON safety_tips FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "delete_safety_tips" ON safety_tips;
CREATE POLICY "delete_safety_tips" ON safety_tips FOR DELETE
  TO authenticated USING (is_admin());

-- ============================================================
-- STORAGE: incidents bucket for image uploads
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('incidents', 'incidents', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "incident_images_read" ON storage.objects;
CREATE POLICY "incident_images_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'incidents');

DROP POLICY IF EXISTS "incident_images_insert" ON storage.objects;
CREATE POLICY "incident_images_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'incidents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "incident_images_update" ON storage.objects;
CREATE POLICY "incident_images_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'incidents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'incidents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "incident_images_delete" ON storage.objects;
CREATE POLICY "incident_images_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'incidents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- SEED SAFETY TIPS
-- ============================================================
INSERT INTO safety_tips (category, title, content, location_context, priority) VALUES
('general', 'Share Your Itinerary', 'Always share your travel itinerary with family or friends back home. Include flight details, hotel addresses, and planned activities so someone knows where you should be at all times.', '', 10),
('general', 'Keep Digital Copies of Documents', 'Store scanned copies of your passport, visa, insurance, and emergency contacts in a secure cloud service. If your physical documents are lost or stolen, you will have backups available immediately.', '', 9),
('transportation', 'Use Licensed Transportation Only', 'Only use officially licensed taxis or reputable ride-sharing apps. Avoid unmarked vehicles offering rides, especially at airports or tourist sites. Check that the vehicle matches the app description before getting in.', '', 8),
('transportation', 'Sit Near the Driver on Public Transit', 'When using buses or trains, especially at night, sit closer to the driver or in well-lit cars with other passengers. Avoid empty compartments.', '', 7),
('health', 'Carry a Basic First Aid Kit', 'Pack a small first aid kit with bandages, antiseptic wipes, pain relievers, and any prescription medications you need. Know the local emergency number for medical assistance.', '', 8),
('health', 'Drink Bottled Water in Unknown Regions', 'When traveling to areas where water safety is uncertain, stick to sealed bottled water. Avoid ice cubes in drinks and raw foods washed in tap water.', '', 7),
('crime', 'Be Aware of Common Tourist Scams', 'Research common scams at your destination before arriving. Common tactics include fake police officers, distraction theft, and overcharging. Stay calm and walk away from suspicious situations.', '', 9),
('crime', 'Use Anti-Theft Bags', 'Invest in anti-theft bags with lockable zippers and slash-proof material. Wear crossbody and keep the bag in front of you in crowded areas. Never leave bags unattended.', '', 8),
('culture', 'Research Local Customs and Laws', 'Before traveling, research local customs, dress codes, and laws. What is acceptable in your country may be illegal elsewhere. Respect religious sites and cultural norms to avoid confrontation.', '', 8),
('culture', 'Learn Basic Emergency Phrases', 'Learn how to say help, police, hospital, and emergency in the local language. Save these phrases on your phone or carry a phrase card.', '', 7),
('emergency', 'Know Local Emergency Numbers', 'Emergency numbers vary by country. Save the local police, ambulance, and fire numbers on your phone before arriving. The SafeTour AI app can automatically alert authorities in supported regions.', '', 10),
('emergency', 'Memorize Your Hotel Address', 'Keep a card with your hotel name and address in the local language. If you get lost or need help, showing this card to a taxi driver or local can get you back safely.', '', 7),
('nightlife', 'Never Leave Drinks Unattended', 'Keep your drink in sight at all times. If you set it down, buy a new one. Drink spiking is a risk in tourist nightlife areas. Stay with trusted companions.', '', 9),
('nightlife', 'Stay in Well-Lit Areas at Night', 'Avoid walking alone in dark or unfamiliar areas at night. Stick to main streets with foot traffic. Use SafeTour AI live tracking when walking at night so someone knows your location.', '', 8),
('outdoor', 'Check Weather and Trail Conditions', 'Before hiking or outdoor activities, check weather forecasts and trail conditions. Carry extra water, a charged phone, and a portable charger. Share your planned route with someone.', '', 8),
('outdoor', 'Tell Someone Before You Go Off-Grid', 'If you plan to visit remote areas, inform your hotel, a friend, or use SafeTour AI tracking. Set a check-in time so someone raises the alarm if you do not return.', '', 9),
('women_safety', 'Trust Your Instincts', 'If a situation or person feels unsafe, leave immediately. Do not worry about being polite. Your safety comes first. Use SafeTour AI SOS if you feel threatened.', '', 10),
('women_safety', 'Dress to Blend In', 'Research local dress norms and aim to blend in. Looking like a local rather than a tourist reduces unwanted attention. Cover up in conservative regions.', '', 7),
('digital', 'Use a VPN on Public Wi-Fi', 'Public Wi-Fi networks in cafes, airports, and hotels are often unsecured. Use a VPN to protect your data. Avoid accessing banking or sensitive accounts on public networks.', '', 8),
('digital', 'Enable Two-Factor Authentication', 'Turn on two-factor authentication for your email, banking, and travel accounts before leaving. If your phone is stolen, this adds a layer of protection against identity theft.', '', 7)
ON CONFLICT DO NOTHING;
