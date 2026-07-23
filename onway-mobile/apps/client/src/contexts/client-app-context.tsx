import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { useClientData } from '@/contexts/client-data-context';
import { toPlantAlerts } from '@/domain/client';

export type NotificationPreferences = {
  plantOffline: boolean;
  lowGeneration: boolean;
  monthlyReport: boolean;
  serviceUpdates: boolean;
};

type ClientAppContextValue = {
  notifications: NotificationPreferences;
  setNotification: (key: keyof NotificationPreferences, enabled: boolean) => void;
  unreadAlertCount: number;
};

const NOTIFICATIONS_KEY = '@onway/notification-preferences';

const initialNotifications: NotificationPreferences = {
  plantOffline: true,
  lowGeneration: true,
  monthlyReport: true,
  serviceUpdates: true,
};

const ClientAppContext = createContext<ClientAppContextValue | null>(null);

export function ClientAppProvider({ children }: PropsWithChildren) {
  const { plants } = useClientData();
  const [notifications, setNotifications] = useState(initialNotifications);
  const alerts = useMemo(() => toPlantAlerts(plants), [plants]);

  useEffect(() => {
    AsyncStorage.getItem(NOTIFICATIONS_KEY)
      .then((savedNotifications) => {
        if (savedNotifications) setNotifications(JSON.parse(savedNotifications));
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
    unreadAlertCount: alerts.filter((alert) => notifications[alert.category]).length,
  }), [alerts, notifications]);

  return <ClientAppContext.Provider value={value}>{children}</ClientAppContext.Provider>;
}

export function useClientApp() {
  const context = useContext(ClientAppContext);
  if (!context) throw new Error('useClientApp deve ser usado dentro de ClientAppProvider');
  return context;
}
