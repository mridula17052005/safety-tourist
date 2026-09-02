import { useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  Shield, LayoutDashboard, Users, MapPin, Siren, Lightbulb,
  Bell, User as UserIcon, Menu, X, LogOut, AlertTriangle, Settings as SettingsIcon,
  Navigation, Building2, Crosshair, AlertOctagon,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useNotifications } from '@/lib/notifications';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
}

const touristNav: NavItem[] = [
  { label: 'Dashboard', path: '/app', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'Live Location', path: '/app/live', icon: <Crosshair className="w-5 h-5" /> },
  { label: 'Profile', path: '/app/profile', icon: <UserIcon className="w-5 h-5" /> },
  { label: 'Emergency Contacts', path: '/app/contacts', icon: <Users className="w-5 h-5" /> },
  { label: 'Report Incident', path: '/app/incidents', icon: <Siren className="w-5 h-5" /> },
  { label: 'Hospitals', path: '/app/hospitals', icon: <Building2 className="w-5 h-5" /> },
  { label: 'Police Stations', path: '/app/police', icon: <Shield className="w-5 h-5" /> },
  { label: 'Nearby Services', path: '/app/nearby', icon: <MapPin className="w-5 h-5" /> },
  { label: 'Danger Zones', path: '/app/danger-zones', icon: <AlertOctagon className="w-5 h-5" /> },
  { label: 'Safety Tips', path: '/app/tips', icon: <Lightbulb className="w-5 h-5" /> },
  { label: 'Notifications', path: '/app/notifications', icon: <Bell className="w-5 h-5" /> },
  { label: 'Settings', path: '/app/settings', icon: <SettingsIcon className="w-5 h-5" /> },
];

const adminNav: NavItem[] = [
  { label: 'Admin Dashboard', path: '/admin', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'Danger Zones', path: '/admin/danger-zones', icon: <AlertOctagon className="w-5 h-5" /> },
  { label: 'Notifications', path: '/admin/notifications', icon: <Bell className="w-5 h-5" /> },
];

export function AppLayout() {
  const { profile, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = profile?.role === 'admin';
  const navItems = isAdmin ? adminNav : touristNav;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path: string) => {
    if (path === '/app' || path === '/admin') return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex w-64 flex-col bg-white border-r border-slate-200 fixed inset-y-0 left-0 z-30">
        <SidebarContent
          isAdmin={isAdmin}
          navItems={navItems}
          isActive={isActive}
          unreadCount={unreadCount}
          onSignOut={handleSignOut}
          profileName={profile?.full_name || 'User'}
        />
      </aside>

      {/* Sidebar — mobile */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white flex flex-col animate-in slide-in-from-left duration-200">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent
              isAdmin={isAdmin}
              navItems={navItems}
              isActive={isActive}
              unreadCount={unreadCount}
              onSignOut={handleSignOut}
              profileName={profile?.full_name || 'User'}
            />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-slate-600 hover:text-slate-900"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-slate-900 hidden sm:block">SafeTour AI</span>
              {isAdmin && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                  ADMIN
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={isAdmin ? '/admin/notifications' : '/app/notifications'}
              className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <Bell className="w-5 h-5 text-slate-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-semibold text-sm">
                {(profile?.full_name?.[0] || 'U').toUpperCase()}
              </div>
              <span className="text-sm font-medium text-slate-700 max-w-[120px] truncate">
                {profile?.full_name || 'User'}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  isAdmin,
  navItems,
  isActive,
  unreadCount,
  onSignOut,
  profileName,
}: {
  isAdmin: boolean;
  navItems: NavItem[];
  isActive: (path: string) => boolean;
  unreadCount: number;
  onSignOut: () => void;
  profileName: string;
}) {
  return (
    <>
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-200">
        <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-slate-900 text-sm">SafeTour AI</h1>
          <p className="text-xs text-slate-500">{isAdmin ? 'Admin Panel' : 'Tourist Safety'}</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
              isActive(item.path)
                ? 'bg-teal-50 text-teal-700'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
            )}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.label === 'Notifications' && unreadCount > 0 && (
              <span className="ml-auto w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {!isAdmin && (
        <div className="px-3 pb-2">
          <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-semibold text-amber-800">Emergency Ready</span>
            </div>
            <p className="text-xs text-amber-700 leading-relaxed">
              Keep your live tracking on. The AI model monitors your safety 24/7.
            </p>
          </div>
        </div>
      )}

      <div className="p-3 border-t border-slate-200">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-semibold text-sm">
            {(profileName[0] || 'U').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">{profileName}</p>
            <p className="text-xs text-slate-400">{isAdmin ? 'Administrator' : 'Tourist'}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onSignOut} className="w-full justify-start">
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </>
  );
}
