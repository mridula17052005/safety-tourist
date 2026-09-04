import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/auth';
import { NotificationProvider } from '@/lib/notifications';
import { AuthPage } from '@/pages/AuthPage';
import { SplashPage } from '@/pages/SplashPage';
import { LiveLocationPage } from '@/pages/LiveLocationPage';
import { HospitalsPage } from '@/pages/HospitalsPage';
import { PoliceStationsPage } from '@/pages/PoliceStationsPage';
import { AppLayout } from '@/components/AppLayout';
import { TouristDashboard } from '@/pages/TouristDashboard';
import { ProfilePage } from '@/pages/ProfilePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { EmergencyContactsPage } from '@/pages/EmergencyContactsPage';
import { IncidentReportPage } from '@/pages/IncidentReportPage';
import { NearbyServicesPage } from '@/pages/NearbyServicesPage';
import { SafetyTipsPage } from '@/pages/SafetyTipsPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { DangerZonesPage } from '@/pages/DangerZonesPage';
import { AdminDangerZonesPage } from '@/pages/AdminDangerZonesPage';
import { AdminDashboard } from '@/pages/AdminDashboard';
import { Spinner } from '@/components/ui';
import { MonitoringProvider } from '@/lib/monitoring';
import type { UserRole } from '@/lib/types';

function ProtectedRoute({ allowRole }: { allowRole?: UserRole }) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (!session) return <Navigate to="/" replace />;
  if (allowRole && profile?.role !== allowRole) {
    return <Navigate to={profile?.role === 'admin' ? '/admin' : '/app'} replace />;
  }

  return <Outlet />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/splash" element={<SplashPage />} />
          <Route path="/" element={<AuthGate />} />
          <Route
            element={
              <ProtectedRoute />
            }
          >
            <Route
              element={
                <NotificationProvider>
                  <MonitoringProvider>
                    <AppLayout />
                  </MonitoringProvider>
                </NotificationProvider>
              }
            >
              <Route path="/app" element={<TouristDashboard />} />
              <Route path="/app/profile" element={<ProfilePage />} />
              <Route path="/app/settings" element={<SettingsPage />} />
              <Route path="/app/contacts" element={<EmergencyContactsPage />} />
              <Route path="/app/incidents" element={<IncidentReportPage />} />
              <Route path="/app/nearby" element={<NearbyServicesPage />} />
              <Route path="/app/live" element={<LiveLocationPage />} />
              <Route path="/app/hospitals" element={<HospitalsPage />} />
              <Route path="/app/police" element={<PoliceStationsPage />} />
              <Route path="/app/tips" element={<SafetyTipsPage />} />
              <Route path="/app/danger-zones" element={<DangerZonesPage />} />
              <Route path="/app/notifications" element={<NotificationsPage />} />
            </Route>
          </Route>
          <Route
            element={
              <ProtectedRoute allowRole="admin" />
            }
          >
            <Route
              element={
                <NotificationProvider>
                  <MonitoringProvider>
                    <AppLayout />
                  </MonitoringProvider>
                </NotificationProvider>
              }
            >
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/danger-zones" element={<AdminDangerZonesPage />} />
              <Route path="/admin/notifications" element={<NotificationsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

function AuthGate() {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }
  if (session) return <Navigate to="/app" replace />;
  return <AuthPage />;
}
