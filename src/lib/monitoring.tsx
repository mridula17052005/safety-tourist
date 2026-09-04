import { createContext, useContext, type ReactNode } from 'react';
import { useLocationTrackingBase } from '@/lib/useLocationTracking';

type MonitoringState = ReturnType<typeof useLocationTrackingBase>;

const MonitoringContext = createContext<MonitoringState | null>(null);

export function MonitoringProvider({ children }: { children: ReactNode }) {
  const monitoring = useLocationTrackingBase();
  return <MonitoringContext.Provider value={monitoring}>{children}</MonitoringContext.Provider>;
}

export function useMonitoring(): MonitoringState {
  const context = useContext(MonitoringContext);
  if (!context) throw new Error('useMonitoring must be used within MonitoringProvider');
  return context;
}
