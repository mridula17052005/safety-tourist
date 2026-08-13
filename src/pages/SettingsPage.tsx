import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon, Bell, MapPin, Shield, Moon, Globe,
  Smartphone, Vibrate, Volume2, Trash2, Download, Info, LogOut,
  ChevronRight, Wifi, Navigation,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Badge } from '@/components/ui';
import { cn } from '@/lib/utils';

interface SettingsState {
  locationTracking: boolean;
  pushNotifications: boolean;
  autoDetect: boolean;
  darkMode: boolean;
  shareLocation: boolean;
  vibrateOnAlert: boolean;
  soundOnAlert: boolean;
  highAccuracyGps: boolean;
}

const DEFAULT_SETTINGS: SettingsState = {
  locationTracking: true,
  pushNotifications: true,
  autoDetect: true,
  darkMode: false,
  shareLocation: true,
  vibrateOnAlert: true,
  soundOnAlert: true,
  highAccuracyGps: true,
};

const STORAGE_KEY = 'safetour_settings';

export function SettingsPage() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      } catch {
        // use defaults
      }
    }
  }, []);

  const updateSetting = (key: keyof SettingsState, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));

    if (key === 'vibrateOnAlert' && value && 'vibrate' in navigator) {
      navigator.vibrate(200);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleClearCache = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Configure your safety preferences and app behavior
        </p>
      </div>

      {/* Safety Settings */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Shield className="w-5 h-5 text-teal-600" />
          <h2 className="font-semibold text-slate-900">Safety & Detection</h2>
        </div>
        <div className="divide-y divide-slate-100">
          <ToggleRow
            icon={<MapPin className="w-4.5 h-4.5 text-teal-600" />}
            title="Live Location Tracking"
            subtitle="Continuously share your GPS location for safety monitoring"
            value={settings.locationTracking}
            onChange={(v) => updateSetting('locationTracking', v)}
          />
          <ToggleRow
            icon={<Shield className="w-4.5 h-4.5 text-teal-600" />}
            title="AI Auto-Detection"
            subtitle="Use Random Forest model to automatically detect emergencies"
            value={settings.autoDetect}
            onChange={(v) => updateSetting('autoDetect', v)}
          />
          <ToggleRow
            icon={<Navigation className="w-4.5 h-4.5 text-teal-600" />}
            title="High Accuracy GPS"
            subtitle="Use high-accuracy GPS mode (uses more battery)"
            value={settings.highAccuracyGps}
            onChange={(v) => updateSetting('highAccuracyGps', v)}
          />
          <ToggleRow
            icon={<Globe className="w-4.5 h-4.5 text-teal-600" />}
            title="Share Location with Contacts"
            subtitle="Allow emergency contacts to see your live location"
            value={settings.shareLocation}
            onChange={(v) => updateSetting('shareLocation', v)}
          />
        </div>
      </Card>

      {/* Notifications */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Bell className="w-5 h-5 text-teal-600" />
          <h2 className="font-semibold text-slate-900">Notifications & Alerts</h2>
        </div>
        <div className="divide-y divide-slate-100">
          <ToggleRow
            icon={<Bell className="w-4.5 h-4.5 text-teal-600" />}
            title="Push Notifications"
            subtitle="Receive alerts about safety events and incidents"
            value={settings.pushNotifications}
            onChange={(v) => updateSetting('pushNotifications', v)}
          />
          <ToggleRow
            icon={<Vibrate className="w-4.5 h-4.5 text-teal-600" />}
            title="Vibrate on Alert"
            subtitle="Vibrate your device when an emergency alert is triggered"
            value={settings.vibrateOnAlert}
            onChange={(v) => updateSetting('vibrateOnAlert', v)}
          />
          <ToggleRow
            icon={<Volume2 className="w-4.5 h-4.5 text-teal-600" />}
            title="Sound on Alert"
            subtitle="Play a sound when an emergency is detected"
            value={settings.soundOnAlert}
            onChange={(v) => updateSetting('soundOnAlert', v)}
          />
        </div>
      </Card>

      {/* App Preferences */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-teal-600" />
          <h2 className="font-semibold text-slate-900">App Preferences</h2>
        </div>
        <div className="divide-y divide-slate-100">
          <ToggleRow
            icon={<Moon className="w-4.5 h-4.5 text-teal-600" />}
            title="Dark Mode"
            subtitle="Use a darker color scheme (coming soon)"
            value={settings.darkMode}
            onChange={(v) => updateSetting('darkMode', v)}
          />
          <InfoRow
            icon={<Info className="w-4.5 h-4.5 text-slate-400" />}
            title="App Version"
            value="1.0.0"
          />
          <InfoRow
            icon={<Wifi className="w-4.5 h-4.5 text-slate-400" />}
            title="Connection"
            value="Online"
          />
        </div>
      </Card>

      {/* Data & Privacy */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-slate-500" />
          <h2 className="font-semibold text-slate-900">Data & Privacy</h2>
        </div>
        <div className="divide-y divide-slate-100">
          <ActionRow
            icon={<Trash2 className="w-4.5 h-4.5 text-slate-500" />}
            title="Clear App Cache"
            subtitle="Remove cached data and reset settings to defaults"
            onClick={handleClearCache}
          />
          <ActionRow
            icon={<Download className="w-4.5 h-4.5 text-slate-500" />}
            title="Download My Data"
            subtitle="Export your incident reports and location history"
            onClick={() => {}}
          />
        </div>
      </Card>

      {/* Account */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-teal-600" />
          <h2 className="font-semibold text-slate-900">Account</h2>
        </div>
        <div className="divide-y divide-slate-100">
          <InfoRow
            icon={<SettingsIcon className="w-4.5 h-4.5 text-slate-400" />}
            title="Account Type"
            value={profile?.role === 'admin' ? 'Administrator' : 'Tourist'}
          />
          <ActionRow
            icon={<LogOut className="w-4.5 h-4.5 text-red-500" />}
            title="Sign Out"
            subtitle="Sign out of your SafeTour AI account"
            onClick={handleSignOut}
            danger
          />
        </div>
      </Card>

      <p className="text-center text-xs text-slate-400 pb-4">
        SafeTour AI v1.0.0 · Built with Capacitor for Android
      </p>
    </div>
  );
}

function ToggleRow({
  icon, title, subtitle, value, onChange,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-slate-800">{title}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors shrink-0',
          value ? 'bg-teal-600' : 'bg-slate-300',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform',
            value ? 'translate-x-5' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}

function InfoRow({
  icon, title, value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-slate-800">{title}</h3>
      </div>
      <span className="text-sm text-slate-500 font-medium">{value}</span>
    </div>
  );
}

function ActionRow({
  icon, title, subtitle, onClick, danger,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors text-left"
    >
      <div className={cn(
        'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
        danger ? 'bg-red-50' : 'bg-slate-100',
      )}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className={cn('text-sm font-medium', danger ? 'text-red-600' : 'text-slate-800')}>
          {title}
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
    </button>
  );
}
