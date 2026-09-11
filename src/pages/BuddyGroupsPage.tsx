import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Users, UserPlus, LogIn, LogOut, Copy, Check, MapPin,
  Navigation, Wifi, WifiOff, Clock, X, Plus, Search,
  ChevronLeft, UserMinus, Compass,
} from 'lucide-react';
import { useBuddyGroups } from '@/lib/useBuddyGroups';
import { useMonitoring } from '@/lib/monitoring';
import { GoogleMap } from '@/components/GoogleMap';
import { Card, Button, Badge, Input, Modal, EmptyState } from '@/components/ui';
import { cn, timeAgo } from '@/lib/utils';
import type { GoogleMapHandle } from '@/components/GoogleMap';
import type { GroupMember } from '@/lib/useBuddyGroups';

export function BuddyGroupsPage() {
  const {
    groups, activeGroup, members, loading, error,
    selectGroup, createGroup, joinGroup, leaveGroup,
    updateMyLocation, removeMember, setError,
  } = useBuddyGroups();
  const { currentPos, isTracking } = useMonitoring();
  const mapRef = useRef<GoogleMapHandle>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<GroupMember | null>(null);

  // Update my location in the active group when tracking
  useEffect(() => {
    if (currentPos && activeGroup) {
      updateMyLocation(currentPos.lat, currentPos.lng);
    }
  }, [currentPos, activeGroup, updateMyLocation]);

  // Periodic location update while in a group
  useEffect(() => {
    if (!activeGroup || !currentPos) return;
    const interval = setInterval(() => {
      updateMyLocation(currentPos.lat, currentPos.lng);
    }, 15000);
    return () => clearInterval(interval);
  }, [activeGroup, currentPos, updateMyLocation]);

  const memberMarkers = useMemo(() => {
    return members
      .filter((m) => m.last_lat != null && m.last_lng != null)
      .map((m) => ({
        lat: m.last_lat!,
        lng: m.last_lng!,
        title: m.full_name || 'Member',
        label: (m.full_name?.[0] || 'M').toUpperCase(),
      }));
  }, [members]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const group = await createGroup(newName.trim(), newDesc.trim());
    if (group) {
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      selectGroup(group);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    const group = await joinGroup(joinCode);
    if (group) {
      setShowJoin(false);
      setJoinCode('');
      selectGroup(group);
    }
  };

  const handleCopyCode = () => {
    if (activeGroup) {
      navigator.clipboard.writeText(activeGroup.join_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleRemoveMember = async () => {
    if (!removeTarget) return;
    await removeMember(removeTarget.member_id);
    setRemoveTarget(null);
  };

  const isCreator = members.some((m) => m.group_role === 'creator' && m.id === (activeGroup?.created_by ?? ''));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Buddy Groups</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Travel together — share live locations with your group
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowJoin(true)}>
            <LogIn className="w-4 h-4" />
            Join Group
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" />
            Create Group
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <X className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {activeGroup ? (
        <>
          {/* Active Group View */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => selectGroup(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{activeGroup.name}</h2>
                  {activeGroup.description && (
                    <p className="text-xs text-slate-500">{activeGroup.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100">
                  <span className="text-xs font-mono font-semibold text-slate-700">
                    {activeGroup.join_code}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="text-slate-400 hover:text-teal-600 transition-colors"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <Button variant="ghost" size="sm" onClick={() => leaveGroup(activeGroup.id)}>
                  <LogOut className="w-4 h-4" />
                  Leave
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 mb-4">
              <Compass className="w-4 h-4 text-blue-600 shrink-0" />
              <p className="text-xs text-blue-700">
                {isTracking
                  ? 'Your live location is being shared with group members.'
                  : 'Start live tracking on the dashboard to share your location with the group.'}
              </p>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Map */}
            <Card className="overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-teal-600" />
                <h3 className="font-semibold text-slate-900">Group Members Map</h3>
              </div>
              <div className="h-[350px] bg-slate-100">
                {memberMarkers.length > 0 ? (
                  <GoogleMap
                    ref={mapRef}
                    center={{ lat: memberMarkers[0].lat, lng: memberMarkers[0].lng }}
                    zoom={12}
                    markers={memberMarkers}
                    className="w-full h-full"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <EmptyState
                      icon={<MapPin className="w-7 h-7" />}
                      title="No locations yet"
                      description="Group members need to start live tracking to share their location."
                    />
                  </div>
                )}
              </div>
            </Card>

            {/* Members List */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-teal-600" />
                <h3 className="font-semibold text-slate-900">
                  Members ({members.length})
                </h3>
              </div>
              {members.length === 0 ? (
                <EmptyState
                  icon={<Users className="w-7 h-7" />}
                  title="No members yet"
                  description="Share the join code with friends to add them to this group."
                />
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {members.map((m) => (
                    <div
                      key={m.member_id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-semibold text-sm shrink-0">
                        {(m.full_name?.[0] || 'U').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800 text-sm truncate">
                            {m.full_name || 'Unknown'}
                          </span>
                          {m.group_role === 'creator' && (
                            <Badge className="bg-teal-100 text-teal-700">CREATOR</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                          <span className="flex items-center gap-1">
                            {m.is_online ? (
                              <span className="flex items-center gap-1"><Wifi className="w-3 h-3 text-green-500" /> Online</span>
                            ) : (
                              <span className="flex items-center gap-1"><WifiOff className="w-3 h-3 text-slate-400" /> Offline</span>
                            )}
                          </span>
                          {m.last_seen && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {timeAgo(m.last_seen)}
                            </span>
                          )}
                        </div>
                      </div>
                      {m.last_lat != null && m.last_lng != null && (
                        <a
                          href={`https://www.google.com/maps?q=${m.last_lat},${m.last_lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg hover:bg-teal-50 text-teal-600 transition-colors"
                          title="View location"
                        >
                          <Navigation className="w-4 h-4" />
                        </a>
                      )}
                      {isCreator && m.group_role !== 'creator' && (
                        <button
                          onClick={() => setRemoveTarget(m)}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-400 transition-colors"
                          title="Remove member"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      ) : (
        <>
          {/* Group List */}
          {groups.length === 0 ? (
            <Card className="p-6">
              <EmptyState
                icon={<Users className="w-7 h-7" />}
                title="No buddy groups yet"
                description="Create a group or join one with a code to start sharing locations with your travel companions."
                action={
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowJoin(true)}>
                      <LogIn className="w-4 h-4" />
                      Join Group
                    </Button>
                    <Button size="sm" onClick={() => setShowCreate(true)}>
                      <Plus className="w-4 h-4" />
                      Create Group
                    </Button>
                  </div>
                }
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {groups.map((g) => (
                <Card
                  key={g.id}
                  className="p-5 cursor-pointer hover:shadow-md hover:border-teal-400 transition-all"
                  onClick={() => selectGroup(g)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">{g.name}</h3>
                      <p className="text-xs text-slate-400">
                        Created {timeAgo(g.created_at)}
                      </p>
                    </div>
                  </div>
                  {g.description && (
                    <p className="text-sm text-slate-500 line-clamp-2 mb-3">{g.description}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-slate-600">
                      Code: {g.join_code}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create Group Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Buddy Group">
        <div className="space-y-4">
          <Input
            label="Group Name"
            placeholder="e.g. Goa Trip 2026"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Input
            label="Description (optional)"
            placeholder="e.g. 4 friends exploring Goa"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>
              <Plus className="w-4 h-4" />
              Create
            </Button>
          </div>
        </div>
      </Modal>

      {/* Join Group Modal */}
      <Modal open={showJoin} onClose={() => setShowJoin(false)} title="Join Buddy Group">
        <div className="space-y-4">
          <Input
            label="Join Code"
            placeholder="Enter 6-character code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
            className="font-mono"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowJoin(false)}>Cancel</Button>
            <Button onClick={handleJoin} disabled={joinCode.trim().length < 6}>
              <LogIn className="w-4 h-4" />
              Join
            </Button>
          </div>
        </div>
      </Modal>

      {/* Remove Member Confirmation */}
      <Modal open={!!removeTarget} onClose={() => setRemoveTarget(null)} title="Remove Member">
        <p className="text-sm text-slate-600 mb-4">
          Are you sure you want to remove{' '}
          <span className="font-semibold text-slate-800">
            {removeTarget?.full_name || 'this member'}
          </span>{' '}
          from the group?
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setRemoveTarget(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleRemoveMember}>
            <UserMinus className="w-4 h-4" />
            Remove
          </Button>
        </div>
      </Modal>
    </div>
  );
}
