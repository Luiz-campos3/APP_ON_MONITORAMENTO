import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { toTicket, type NewTicketDraft, type SupportTicket } from '@/domain/support';
import { apiErrorMessage, mobileApi, type UploadFile } from '@/services/mobile-api';

type SupportContextValue = {
  tickets: SupportTicket[];
  ready: boolean;
  refreshing: boolean;
  error: string | null;
  reload: () => Promise<void>;
  createTicket: (draft: NewTicketDraft, photo?: UploadFile) => Promise<SupportTicket>;
  fetchTicket: (id: string) => Promise<SupportTicket>;
  /** Aviso único: chamados de demonstração (mock antigo) foram descartados. */
  migratedNotice: boolean;
  dismissMigrationNotice: () => void;
};

// Cache offline só de leitura da lista (sem timeline). Chave nova para não
// colidir com o formato antigo do mock.
const CACHE_KEY = '@onway/chamados-cache';
// Chave do mock antigo (AsyncStorage): sua presença dispara o aviso de descarte.
const LEGACY_KEY = '@onway/support-tickets';
// Teto rígido da API; um cliente raramente passa disso.
const PAGE_LIMIT = 50;

const SupportContext = createContext<SupportContextValue | null>(null);

export function SupportProvider({ children }: PropsWithChildren) {
  const { status, user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [migratedNotice, setMigratedNotice] = useState(false);
  const requestVersion = useRef(0);

  const persistCache = useCallback((next: SupportTicket[]) => {
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  const load = useCallback(async (refresh = false) => {
    const version = ++requestVersion.current;
    if (refresh) setRefreshing(true);
    setError(null);
    try {
      const response = await mobileApi.listTickets(1, PAGE_LIMIT);
      if (version !== requestVersion.current) return;
      const next = response.data.map(toTicket);
      setTickets(next);
      persistCache(next);
    } catch (loadError) {
      if (version !== requestVersion.current) return;
      // Mantém o cache já exibido; só sinaliza o erro.
      setError(apiErrorMessage(loadError));
    } finally {
      if (version === requestVersion.current) {
        setRefreshing(false);
        setReady(true);
      }
    }
  }, [persistCache]);

  // Descarte único dos tickets de demonstração do mock antigo.
  useEffect(() => {
    AsyncStorage.getItem(LEGACY_KEY)
      .then((legacy) => {
        if (legacy) {
          setMigratedNotice(true);
          return AsyncStorage.removeItem(LEGACY_KEY);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && user) {
      // Mostra o cache imediatamente e revalida na rede.
      AsyncStorage.getItem(CACHE_KEY)
        .then((cached) => {
          if (cached) setTickets(JSON.parse(cached) as SupportTicket[]);
        })
        .catch(() => undefined)
        .finally(() => load().catch(() => undefined));
      return;
    }

    requestVersion.current += 1;
    setTickets([]);
    setReady(false);
    setRefreshing(false);
    setError(null);
  }, [load, status, user]);

  const createTicket = useCallback(
    async (draft: NewTicketDraft, photo?: UploadFile) => {
      const api = await mobileApi.createTicket(
        draft.usinaId,
        {
          descricaoProblema: draft.description.trim(),
          categoria: draft.categoria,
          urgencia: draft.urgencia,
        },
        photo,
      );
      const ticket = toTicket(api);
      setTickets((current) => {
        const next = [ticket, ...current.filter((item) => item.id !== ticket.id)];
        persistCache(next);
        return next;
      });
      return ticket;
    },
    [persistCache],
  );

  const fetchTicket = useCallback(async (id: string) => {
    const ticket = toTicket(await mobileApi.getTicket(id));
    // Atualiza a entrada na lista (mantém a timeline no consumidor).
    setTickets((current) => current.map((item) => (item.id === ticket.id ? { ...item, ...ticket, timeline: item.timeline } : item)));
    return ticket;
  }, []);

  const value = useMemo<SupportContextValue>(
    () => ({
      tickets,
      ready,
      refreshing,
      error,
      reload: () => load(true),
      createTicket,
      fetchTicket,
      migratedNotice,
      dismissMigrationNotice: () => setMigratedNotice(false),
    }),
    [tickets, ready, refreshing, error, load, createTicket, fetchTicket, migratedNotice],
  );

  return <SupportContext.Provider value={value}>{children}</SupportContext.Provider>;
}

export function useSupport() {
  const context = useContext(SupportContext);
  if (!context) throw new Error('useSupport deve ser usado dentro de SupportProvider');
  return context;
}
