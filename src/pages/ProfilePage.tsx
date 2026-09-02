import { useState, useEffect } from 'react';
import { User, Mail, Phone, Globe, Save, CheckCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Card, Button, Input } from '@/components/ui';

export function ProfilePage() {
  const { profile, session, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [nationality, setNationality] = useState(profile?.nationality ?? '');
  const [homeCountry, setHomeCountry] = useState(profile?.home_country ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setPhone(profile.phone);
      setNationality(profile.nationality);
      setHomeCountry(profile.home_country);
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        phone,
        nationality,
        homeCountry,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session?.user?.id ?? '');

    setSaving(false);
    if (!error) {
      setSaved(true);
      await refreshProfile();
      setTimeout(() => setSaved(false), 3000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your personal information and travel details</p>
      </div>

      <Card className="p-6">
        {/* Avatar */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white text-2xl font-bold">
            {(fullName?.[0] || 'U').toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{fullName || 'Your Name'}</h2>
            <p className="text-sm text-slate-500">{session?.user?.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700">
              {profile?.role === 'admin' ? 'Administrator' : 'Tourist'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            icon={<User className="w-4 h-4" />}
          />
          <Input
            label="Email (read-only)"
            value={session?.user?.email ?? ''}
            readOnly
            icon={<Mail className="w-4 h-4" />}
            className="bg-slate-50"
          />
          <Input
            label="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 555 000 1234"
            icon={<Phone className="w-4 h-4" />}
          />
          <Input
            label="Nationality"
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            placeholder="e.g. American"
            icon={<Globe className="w-4 h-4" />}
          />
          <Input
            label="Home Country"
            value={homeCountry}
            onChange={(e) => setHomeCountry(e.target.value)}
            placeholder="e.g. United States"
            icon={<Globe className="w-4 h-4" />}
          />
        </div>

        <div className="mt-6 flex items-center gap-3">
          <Button onClick={handleSave} loading={saving}>
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
              <CheckCircle className="w-4 h-4" />
              Saved successfully
            </span>
          )}
        </div>
      </Card>
    </div>
  );
}
