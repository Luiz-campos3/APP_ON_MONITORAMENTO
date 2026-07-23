import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import {
  suggestedDateInWeek,
  type NewTicketDraft,
  type SupportTicket,
} from '@/domain/support';

type SupportContextValue = {
  tickets: SupportTicket[];
  ready: boolean;
  createTicket: (draft: NewTicketDraft) => SupportTicket;
  getTicket: (id: string) => SupportTicket | undefined;
  cancelTicket: (id: string) => void;
  /** Simulação (mock): confirma a data com o cliente, como aconteceria até 48h antes. */
  simulateConfirmation: (id: string) => void;
  /** Simulação (mock): marca o serviço como concluído. */
  markCompleted: (id: string) => void;
};

const STORAGE_KEY = '@onway/support-tickets';

const SupportContext = createContext<SupportContextValue | null>(null);

// Sem Math.random/crypto disponível de forma garantida no RN; id monotônico simples.
let idCounter = 0;
function nextTicketId() {
  idCounter += 1;
  return `${Date.now().toString(36)}${idCounter.toString(36).padStart(2, '0')}`;
}

export function SupportProvider({ children }: PropsWithChildren) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved) setTickets(JSON.parse(saved) as SupportTicket[]);
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  function persist(next: SupportTicket[]) {
    setTickets(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  }

  function createTicket(draft: NewTicketDraft): SupportTicket {
    const now = new Date().toISOString();
    const ticket: SupportTicket = {
      id: nextTicketId(),
      kind: draft.kind,
      plantId: draft.plantId,
      plantName: draft.plantName,
      description: draft.description.trim(),
      preferredWeekStart: draft.preferredWeekStart,
      scheduledDate: null,
      status: draft.preferredWeekStart ? 'agendado' : 'aberto',
      createdAt: now,
      updatedAt: now,
    };
    persist([ticket, ...tickets]);
    return ticket;
  }

  function updateTicket(id: string, patch: Partial<SupportTicket>) {
    persist(
      tickets.map((ticket) =>
        ticket.id === id ? { ...ticket, ...patch, updatedAt: new Date().toISOString() } : ticket,
      ),
    );
  }

  function cancelTicket(id: string) {
    updateTicket(id, { status: 'cancelado' });
  }

  function simulateConfirmation(id: string) {
    const ticket = tickets.find((item) => item.id === id);
    if (!ticket) return;
    const date = ticket.preferredWeekStart ? suggestedDateInWeek(ticket.preferredWeekStart) : null;
    updateTicket(id, { status: 'confirmado', scheduledDate: date });
  }

  function markCompleted(id: string) {
    updateTicket(id, { status: 'concluido' });
  }

  const value = useMemo<SupportContextValue>(
    () => ({
      tickets,
      ready,
      createTicket,
      getTicket: (id: string) => tickets.find((ticket) => ticket.id === id),
      cancelTicket,
      simulateConfirmation,
      markCompleted,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tickets, ready],
  );

  return <SupportContext.Provider value={value}>{children}</SupportContext.Provider>;
}

export function useSupport() {
  const context = useContext(SupportContext);
  if (!context) throw new Error('useSupport deve ser usado dentro de SupportProvider');
  return context;
}
