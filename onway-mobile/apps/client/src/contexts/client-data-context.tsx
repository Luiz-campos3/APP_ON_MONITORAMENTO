import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { toPlant, type Plant } from '@/domain/client';
import { apiErrorMessage, mobileApi, type DashboardResponse } from '@/services/mobile-api';

type ClientDataContextValue = {
  dashboard: DashboardResponse | null;
  plants: Plant[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const ClientDataContext = createContext<ClientDataContextValue | null>(null);

export function ClientDataProvider({ children }: PropsWithChildren) {
  const { status, user } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  const load = useCallback(async (refresh = false) => {
    const version = ++requestVersion.current;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [nextDashboard, apiPlants] = await Promise.all([
        mobileApi.getDashboard(),
        mobileApi.getPlants(),
      ]);
      if (version !== requestVersion.current) return;
      setDashboard(nextDashboard);
      setPlants(apiPlants.map(toPlant));
    } catch (loadError) {
      if (version !== requestVersion.current) return;
      setError(apiErrorMessage(loadError));
    } finally {
      if (version === requestVersion.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && user) {
      load().catch(() => undefined);
      return;
    }

    requestVersion.current += 1;
    setDashboard(null);
    setPlants([]);
    setLoading(false);
    setRefreshing(false);
    setError(null);
  }, [load, status, user]);

  const value = useMemo<ClientDataContextValue>(() => ({
    dashboard,
    plants,
    loading,
    refreshing,
    error,
    reload: () => load(true),
  }), [dashboard, error, load, loading, plants, refreshing]);

  return <ClientDataContext.Provider value={value}>{children}</ClientDataContext.Provider>;
}

export function useClientData() {
  const context = useContext(ClientDataContext);
  if (!context) throw new Error('useClientData deve ser usado dentro de ClientDataProvider');
  return context;
}
