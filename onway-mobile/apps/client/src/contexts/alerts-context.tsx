import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { type Alert, toAlertFeed } from '@/domain/alert';
import { apiErrorMessage, mobileApi } from '@/services/mobile-api';

type AlertsContextValue = {
  alerts: Alert[];
  /** Total de alertas abertos (o feed já vem só de abertos). */
  total: number;
  /** Não lidos — fonte do badge. */
  unread: number;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  reload: () => Promise<void>;
  /** Marca um alerta como lido (otimista; usado ao tocar no card). */
  markRead: (id: string) => void;
  /** Marca todos os abertos como lidos. */
  markAllRead: () => Promise<void>;
};

const AlertsContext = createContext<AlertsContextValue | null>(null);

export function AlertsProvider({ children }: PropsWithChildren) {
  const { status, user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
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
      const response = await mobileApi.getAlerts('aberto');
      if (version !== requestVersion.current) return;
      const feed = toAlertFeed(response, Date.now());
      setAlerts(feed.alerts);
      setTotal(feed.total);
      setUnread(feed.unread);
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
    setAlerts([]);
    setTotal(0);
    setUnread(0);
    setLoading(false);
    setRefreshing(false);
    setError(null);
  }, [load, status, user]);

  // Otimista: marca localmente e dispara a chamada sem bloquear a navegação.
  const markRead = useCallback((id: string) => {
    setAlerts((current) => current.map((alert) => (alert.id === id ? { ...alert, read: true } : alert)));
    setUnread((current) => Math.max(0, current - 1));
    mobileApi.markAlertsRead([id])
      .then((result) => setUnread(result.naoLidos))
      .catch(() => undefined);
  }, []);

  const markAllRead = useCallback(async () => {
    setAlerts((current) => current.map((alert) => ({ ...alert, read: true })));
    setUnread(0);
    try {
      const result = await mobileApi.markAlertsRead();
      setUnread(result.naoLidos);
    } catch {
      // Falha silenciosa: o badge reaparece no próximo reload se não persistiu.
    }
  }, []);

  const value = useMemo<AlertsContextValue>(() => ({
    alerts,
    total,
    unread,
    loading,
    refreshing,
    error,
    reload: () => load(true),
    markRead,
    markAllRead,
  }), [alerts, total, unread, loading, refreshing, error, load, markRead, markAllRead]);

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
}

export function useAlerts() {
  const context = useContext(AlertsContext);
  if (!context) throw new Error('useAlerts deve ser usado dentro de AlertsProvider');
  return context;
}
