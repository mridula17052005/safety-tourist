import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Profile } from '@/lib/types';

export interface TripGroup {
  id: string;
  name: string;
  description: string;
  join_code: string;
  created_by: string;
  created_at: string;
}

export interface GroupMember extends Profile {
  member_id: string;
  group_id: string;
  group_role: 'creator' | 'member';
  last_lat: number | null;
  last_lng: number | null;
  last_seen: string | null;
  is_online: boolean;
  joined_at: string;
}

export function useBuddyGroups() {
  const { session } = useAuth();
  const [groups, setGroups] = useState<TripGroup[]>([]);
  const [activeGroup, setActiveGroup] = useState<TripGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchGroups = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    setError(null);

    const { data: memberRows, error: memberErr } = await supabase
      .from('trip_group_members')
      .select('group_id')
      .eq('user_id', session.user.id);

    if (memberErr) {
      setError(memberErr.message);
      setLoading(false);
      return;
    }

    const groupIds = (memberRows ?? []).map((r: { group_id: string }) => r.group_id);
    if (groupIds.length === 0) {
      setGroups([]);
      setLoading(false);
      return;
    }

    const { data: groupRows, error: groupErr } = await supabase
      .from('trip_groups')
      .select('*')
      .in('id', groupIds)
      .order('created_at', { ascending: false });

    if (groupErr) {
      setError(groupErr.message);
    } else {
      setGroups((groupRows as TripGroup[]) ?? []);
    }
    setLoading(false);
  }, [session]);

  const fetchMembers = useCallback(async (groupId: string) => {
    const { data, error: err } = await supabase
      .from('trip_group_members')
      .select(`
        id, group_id, user_id, role, last_lat, last_lng, last_seen, is_online, joined_at
      `)
      .eq('group_id', groupId);

    if (err || !data) {
      setMembers([]);
      return;
    }

    const memberRows = data as Array<{
      id: string;
      group_id: string;
      user_id: string;
      role: string;
      last_lat: number | null;
      last_lng: number | null;
      last_seen: string | null;
      is_online: boolean;
      joined_at: string;
    }>;

    const userIds = memberRows.map((r) => r.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds);

    const profileMap = new Map<string, Profile>();
    (profiles as Profile[] | null)?.forEach((p) => profileMap.set(p.id, p));

    const enriched: GroupMember[] = memberRows.map((r) => ({
      ...profileMap.get(r.user_id)!,
      member_id: r.id,
      group_id: r.group_id,
      group_role: r.role as 'creator' | 'member',
      last_lat: r.last_lat,
      last_lng: r.last_lng,
      last_seen: r.last_seen,
      is_online: r.is_online,
      joined_at: r.joined_at,
    })).filter((m) => m.id);

    setMembers(enriched);
  }, []);

  const selectGroup = useCallback((group: TripGroup | null) => {
    setActiveGroup(group);
    if (group) {
      fetchMembers(group.id);
    } else {
      setMembers([]);
    }
  }, [fetchMembers]);

  const createGroup = useCallback(async (name: string, description: string): Promise<TripGroup | null> => {
    if (!session?.user) return null;
    const { data, error: err } = await supabase
      .from('trip_groups')
      .insert({ name, description, created_by: session.user.id })
      .select('*')
      .single();

    if (err || !data) {
      setError(err?.message ?? 'Failed to create group');
      return null;
    }

    const group = data as TripGroup;

    await supabase.from('trip_group_members').insert({
      group_id: group.id,
      user_id: session.user.id,
      role: 'creator',
    });

    await fetchGroups();
    return group;
  }, [session, fetchGroups]);

  const joinGroup = useCallback(async (joinCode: string): Promise<TripGroup | null> => {
    if (!session?.user) return null;
    const { data: groupData, error: findErr } = await supabase
      .from('trip_groups')
      .select('*')
      .eq('join_code', joinCode.toUpperCase().trim())
      .maybeSingle();

    if (findErr || !groupData) {
      setError('Invalid join code');
      return null;
    }

    const group = groupData as TripGroup;

    const { error: memberErr } = await supabase
      .from('trip_group_members')
      .insert({
        group_id: group.id,
        user_id: session.user.id,
        role: 'member',
      });

    if (memberErr) {
      if (memberErr.code === '23505') {
        setError('You are already a member of this group');
      } else {
        setError(memberErr.message);
      }
      return null;
    }

    await fetchGroups();
    return group;
  }, [session, fetchGroups]);

  const leaveGroup = useCallback(async (groupId: string) => {
    if (!session?.user) return;
    await supabase
      .from('trip_group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', session.user.id);
    await fetchGroups();
    if (activeGroup?.id === groupId) {
      selectGroup(null);
    }
  }, [session, fetchGroups, activeGroup, selectGroup]);

  const updateMyLocation = useCallback(async (lat: number, lng: number) => {
    if (!session?.user || !activeGroup) return;
    await supabase
      .from('trip_group_members')
      .update({
        last_lat: lat,
        last_lng: lng,
        last_seen: new Date().toISOString(),
        is_online: true,
      })
      .eq('group_id', activeGroup.id)
      .eq('user_id', session.user.id);
  }, [session, activeGroup]);

  const removeMember = useCallback(async (memberId: string) => {
    if (!session?.user || !activeGroup) return;
    await supabase
      .from('trip_group_members')
      .delete()
      .eq('id', memberId);
    await fetchMembers(activeGroup.id);
  }, [session, activeGroup, fetchMembers]);

  // Real-time subscription for member location updates
  useEffect(() => {
    if (!activeGroup) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const channel = supabase
      .channel(`group-${activeGroup.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_group_members',
          filter: `group_id=eq.${activeGroup.id}`,
        },
        () => fetchMembers(activeGroup.id),
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [activeGroup, fetchMembers]);

  // Mark offline on unmount
  useEffect(() => {
    return () => {
      if (session?.user && activeGroup) {
        supabase
          .from('trip_group_members')
          .update({ is_online: false, last_seen: new Date().toISOString() })
          .eq('group_id', activeGroup.id)
          .eq('user_id', session.user.id)
          .then(() => {});
      }
    };
  }, [session, activeGroup]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return {
    groups,
    activeGroup,
    members,
    loading,
    error,
    selectGroup,
    createGroup,
    joinGroup,
    leaveGroup,
    updateMyLocation,
    removeMember,
    setError,
  };
}
