import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

export type NotificationPreferences = {
  plantOffline: boolean;
  lowGeneration: boolean;
};

type ClientAppContextValue = {
  notifications: NotificationPreferences;
  setNotification: (key: keyof NotificationPreferences, enabled: boolean) => void;
};

const NOTIFICATIONS_KEY = '@onway/notification-preferences';

const initialNotifications: NotificationPreferences = {
  plantOffline: true,
  lowGeneration: true,
};

const ClientAppContext = createContext<ClientAppContextValue | null>(null);

export function ClientAppProvider({ children }: PropsWithChildren) {
  const [notifications, setNotifications] = useState(initialNotifications);

  useEffect(() => {
    AsyncStorage.getItem(NOTIFICATIONS_KEY)
      .then((savedNotifications) => {
        if (!savedNotifications) return;
        // Só relê as chaves conhecidas: dados antigos podem trazer preferências
        // já removidas (monthlyReport/serviceUpdates) — são ignoradas, e chaves
        // ausentes caem no default. Assim o formato antigo não quebra o app.
        const parsed = JSON.parse(savedNotifications) as Partial<NotificationPreferences>;
        setNotifications({
          plantOffline: parsed.plantOffline ?? initialNotifications.plantOffline,
          lowGeneration: parsed.lowGeneration ?? initialNotifications.lowGeneration,
        });
      })
      .catch(() => undefined);
  }, []);

  function setNotification(key: keyof NotificationPreferences, enabled: boolean) {
    setNotifications((current) => {
      const next = { ...current, [key]: enabled };
      AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }

  const value = useMemo<ClientAppContextValue>(() => ({
    notifications,
    setNotification,
  }), [notifications]);

  return <ClientAppContext.Provider value={value}>{children}</ClientAppContext.Provider>;
}

export function useClientApp() {
  const context = useContext(ClientAppContext);
  if (!context) throw new Error('useClientApp deve ser usado dentro de ClientAppProvider');
  return context;
}
