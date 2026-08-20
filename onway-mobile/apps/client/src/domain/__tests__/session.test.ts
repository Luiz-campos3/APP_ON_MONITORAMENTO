import { toSession, toSessions } from '@/domain/session';
import type { ApiSession, SessionsResponse } from '@/services/mobile-api';

const NOW = new Date('2026-08-20T12:00:00.000Z').getTime();

function apiSession(overrides: Partial<ApiSession> = {}): ApiSession {
  return {
    familyId: 'fam-1',
    dispositivo: 'onway-app/1.0 iPhone14',
    iniciadaEm: '2026-08-18T09:00:00.000Z',
    ultimoUso: '2026-08-20T10:00:00.000Z',
    expiraEm: '2026-08-27T10:00:00.000Z',
    isCurrent: true,
    ...overrides,
  };
}

describe('toSession', () => {
  it('mapeia dispositivo, data de início e uso relativo', () => {
    const session = toSession(apiSession(), NOW);
    expect(session.device).toBe('onway-app/1.0 iPhone14');
    expect(session.startedAtLabel).toBe('18/08/2026');
    expect(session.lastUsedLabel).toBe('há 2 h');
    expect(session.isCurrent).toBe(true);
  });

  it('usa fallback para dispositivo vazio', () => {
    expect(toSession(apiSession({ dispositivo: null }), NOW).device).toBe('Dispositivo desconhecido');
    expect(toSession(apiSession({ dispositivo: '  ' }), NOW).device).toBe('Dispositivo desconhecido');
  });

  it('formata a expiração por duração, sem ambiguidade de calendário', () => {
    expect(toSession(apiSession({ expiraEm: '2026-08-27T10:00:00.000Z' }), NOW).expiresLabel).toBe('expira em 6 dias');
    expect(toSession(apiSession({ expiraEm: '2026-08-21T20:00:00.000Z' }), NOW).expiresLabel).toBe('expira em 1 dia');
    expect(toSession(apiSession({ expiraEm: '2026-08-20T20:00:00.000Z' }), NOW).expiresLabel).toBe('expira em menos de 1 dia');
    expect(toSession(apiSession({ expiraEm: '2026-08-19T10:00:00.000Z' }), NOW).expiresLabel).toBe('expirada');
  });

  it('formata uso recente como "agora" e minutos', () => {
    expect(toSession(apiSession({ ultimoUso: '2026-08-20T11:59:40.000Z' }), NOW).lastUsedLabel).toBe('agora');
    expect(toSession(apiSession({ ultimoUso: '2026-08-20T11:30:00.000Z' }), NOW).lastUsedLabel).toBe('há 30 min');
  });
});

describe('toSessions', () => {
  it('coloca a sessão atual em primeiro', () => {
    const response: SessionsResponse = {
      data: [
        apiSession({ familyId: 'b', isCurrent: false }),
        apiSession({ familyId: 'a', isCurrent: false }),
        apiSession({ familyId: 'c', isCurrent: true }),
      ],
      total: 3,
    };
    const sessions = toSessions(response, NOW);
    expect(sessions[0].familyId).toBe('c');
    expect(sessions[0].isCurrent).toBe(true);
    // as demais em ordem estável por familyId
    expect(sessions.slice(1).map((s) => s.familyId)).toEqual(['a', 'b']);
  });

  it('não quebra com lista vazia', () => {
    expect(toSessions({ data: [], total: 0 }, NOW)).toEqual([]);
  });
});
