/*
# Create contact_alerts table for emergency contact notification tracking

1. New Tables
- `contact_alerts` — tracks every notification sent to an emergency contact when an alert is triggered
  - `id` (uuid, primary key)
  - `alert_id` (uuid, references alerts, ON DELETE CASCADE) — the safety alert that triggered this
  - `contact_id` (uuid, references emergency_contacts, ON DELETE CASCADE) — which contact was notified
  - `user_id` (uuid, references profiles, ON DELETE CASCADE) — the tourist who triggered the alert
  - `delivery_method` (text) — 'sms', 'email', or 'push'
  - `delivery_status` (text) — 'pending', 'sent', 'failed', 'delivered'
  - `message_content` (text) — the message that was sent to the contact
  - `sent_at` (timestamptz) — when the notification was sent
  - `delivered_at` (timestamptz) — when delivery was confirmed
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `contact_alerts`.
- Tourists can read their own contact alerts (to see which contacts were notified).
- Tourists can insert their own contact alerts.
- Admins can read all contact alerts.
- No updates or deletes needed — these are append-only records.

3. Indexes
- Index on `alert_id` for joining with alerts
- Index on `user_id` for user-specific queries
- Index on `delivery_status` for tracking pending deliveries
*/

CREATE TABLE IF NOT EXISTS contact_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid REFERENCES alerts(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES emergency_contacts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  delivery_method text NOT NULL DEFAULT 'push' CHECK (delivery_method IN ('sms', 'email', 'push')),
  delivery_status text NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'failed', 'delivered')),
  message_content text,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE contact_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_own_contact_alerts" ON contact_alerts;
CREATE POLICY "read_own_contact_alerts"
ON contact_alerts FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "insert_own_contact_alerts" ON contact_alerts;
CREATE POLICY "insert_own_contact_alerts"
ON contact_alerts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_contact_alerts_alert_id ON contact_alerts (alert_id);
CREATE INDEX IF NOT EXISTS idx_contact_alerts_user_id ON contact_alerts (user_id);
CREATE INDEX IF NOT EXISTS idx_contact_alerts_status ON contact_alerts (delivery_status);
