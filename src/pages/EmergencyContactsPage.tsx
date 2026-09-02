import { useState, useEffect, useCallback } from 'react';
import {
  Users, Plus, Trash2, Phone, Mail, Star, User as UserIcon,
  Shield, Pencil, X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Card, Button, Input, Modal, EmptyState } from '@/components/ui';
import type { EmergencyContact } from '@/lib/types';

export function EmergencyContactsPage() {
  const { session } = useAuth();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EmergencyContact | null>(null);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchContacts = useCallback(async () => {
    if (!session?.user) return;
    const { data } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    setContacts((data as EmergencyContact[]) ?? []);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const openAdd = () => {
    setEditing(null);
    setName('');
    setRelationship('');
    setPhone('');
    setEmail('');
    setIsPrimary(false);
    setModalOpen(true);
  };

  const openEdit = (c: EmergencyContact) => {
    setEditing(c);
    setName(c.name);
    setRelationship(c.relationship);
    setPhone(c.phone);
    setEmail(c.email);
    setIsPrimary(c.is_primary);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!session?.user || !name || !phone) return;
    setSaving(true);
    if (isPrimary) {
      await supabase
        .from('emergency_contacts')
        .update({ is_primary: false })
        .eq('user_id', session.user.id);
    }
    if (editing) {
      await supabase
        .from('emergency_contacts')
        .update({ name, relationship, phone, email, is_primary: isPrimary })
        .eq('id', editing.id);
    } else {
      await supabase.from('emergency_contacts').insert({
        user_id: session.user.id,
        name,
        relationship,
        phone,
        email,
        is_primary: isPrimary,
      });
    }
    setSaving(false);
    setModalOpen(false);
    fetchContacts();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('emergency_contacts').delete().eq('id', id);
    fetchContacts();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Emergency Contacts</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            These people will be automatically notified when an emergency is detected
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4" />
          Add Contact
        </Button>
      </div>

      <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 flex items-start gap-3">
        <Shield className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" />
        <p className="text-sm text-teal-800 leading-relaxed">
          When the AI detects a potential emergency or you trigger SOS, your live location
          and incident details are automatically sent to these contacts. Keep them updated.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading contacts...</div>
      ) : contacts.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users className="w-7 h-7" />}
            title="No emergency contacts yet"
            description="Add at least one trusted person who should be notified in an emergency."
            action={
              <Button onClick={openAdd}>
                <Plus className="w-4 h-4" />
                Add Your First Contact
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {contacts.map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-semibold">
                    {c.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{c.name}</h3>
                      {c.is_primary && (
                        <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          Primary
                        </span>
                      )}
                    </div>
                    {c.relationship && (
                      <p className="text-sm text-slate-500">{c.relationship}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(c)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400" />
                  {c.phone}
                </div>
                {c.email && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400" />
                    {c.email}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Contact' : 'Add Emergency Contact'}
      >
        <div className="space-y-4">
          <Input
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
            icon={<UserIcon className="w-4 h-4" />}
          />
          <Input
            label="Relationship"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            placeholder="e.g. Spouse, Parent, Friend"
          />
          <Input
            label="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 555 000 1234"
            icon={<Phone className="w-4 h-4" />}
          />
          <Input
            label="Email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
            icon={<Mail className="w-4 h-4" />}
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-slate-700">Set as primary contact</span>
          </label>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              <X className="w-4 h-4" />
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving} disabled={!name || !phone}>
              {editing ? 'Update' : 'Add'} Contact
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
