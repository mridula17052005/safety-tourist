/*
# Trip Groups for Buddy Group Tracking
Creates trip_groups and trip_group_members tables with RLS.
*/

CREATE TABLE IF NOT EXISTS trip_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  join_code text NOT NULL DEFAULT upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6)),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trip_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES trip_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('creator', 'member')),
  last_lat double precision,
  last_lng double precision,
  last_seen timestamptz,
  is_online boolean DEFAULT false,
  joined_at timestamptz DEFAULT now(),
  UNIQUE (group_id, user_id)
);

ALTER TABLE trip_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_group_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_trip_group_members_group ON trip_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_trip_group_members_user ON trip_group_members(user_id);

DROP POLICY IF EXISTS "select_own_groups" ON trip_groups;
CREATE POLICY "select_own_groups" ON trip_groups FOR SELECT
  TO authenticated USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM trip_group_members
      WHERE trip_group_members.group_id = trip_groups.id
      AND trip_group_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_groups" ON trip_groups;
CREATE POLICY "insert_own_groups" ON trip_groups FOR INSERT
  TO authenticated WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "delete_own_groups" ON trip_groups;
CREATE POLICY "delete_own_groups" ON trip_groups FOR DELETE
  TO authenticated USING (created_by = auth.uid());

DROP POLICY IF EXISTS "select_group_members" ON trip_group_members;
CREATE POLICY "select_group_members" ON trip_group_members FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM trip_group_members m2
      WHERE m2.group_id = trip_group_members.group_id
      AND m2.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_self_member" ON trip_group_members;
CREATE POLICY "insert_self_member" ON trip_group_members FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "update_self_member" ON trip_group_members;
CREATE POLICY "update_self_member" ON trip_group_members FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "delete_creator_or_self" ON trip_group_members;
CREATE POLICY "delete_creator_or_self" ON trip_group_members FOR DELETE
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM trip_groups
      WHERE trip_groups.id = trip_group_members.group_id
      AND trip_groups.created_by = auth.uid()
    )
  );
