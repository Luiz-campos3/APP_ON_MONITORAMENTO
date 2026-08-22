// Cobertura ISS-013: robustez da camada HTTP (src/services/mobile-api.ts).
// Foco na lógica de retry/refresh que hoje não tinha teste — o único coberto
// era `readErrorCode` (error-envelope.test.ts). Aqui mockamos `global.fetch`
// (sequência de respostas) e `expo-secure-store`, e fixamos a base URL.
//
// Todas as expectativas foram derivadas do comportamento REAL do código:
//  - authenticatedGet reexecuta em 429 (RATE_LIMIT_MAX_RETRIES = 2, backoff via sleep);
//  - o 401 dispara refresh (rotação de tokens, single-flight) e reexecuta uma vez;
//  - authenticatedSend (mutação) NÃO reexecuta em 429;
//  - 403 com errors.code=PASSWORD_CHANGE_REQUIRED aciona o handler e o unwrap lança ApiError.

import * as SecureStore from 'expo-secure-store';

import { ApiError, mobileApi } from '@/services/mobile-api';

// apiBaseUrl() lê EXPO_PUBLIC_API_URL em runtime (não inlinado pelo babel neste
// preset — verificado empiricamente), então basta fixar antes de qualquer teste.
process.env.EXPO_PUBLIC_API_URL = 'https://api.test.onway';

// jest.mock é içado pelo babel-jest acima dos imports, então o SecureStore
// importado acima já chega mockado mesmo declarado aqui embaixo.
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const getItemAsync = SecureStore.getItemAsync as jest.Mock;
const setItemAsync = SecureStore.setItemAsync as jest.Mock;
const deleteItemAsync = SecureStore.deleteItemAsync as jest.Mock;

// Chaves reais usadas pelo módulo (constantes privadas em mobile-api.ts).
const ACCESS_KEY = 'onway.accessToken';
const REFRESH_KEY = 'onway.refreshToken';
const BASE = 'https://api.test.onway';

type FakeInit = { method?: string; headers?: Record<string, string>; body?: string };

let fetchMock: jest.Mock;

// Constrói um objeto compatível com o subconjunto de `Response` que `raw` usa:
// status, ok, headers.get('retry-after') e text().
function jsonResponse(
  status: number,
  bodyObj: unknown,
  opts: { retryAfter?: number } = {},
) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'retry-after' && opts.retryAfter != null
          ? String(opts.retryAfter)
          : null,
    },
    text: async () => (bodyObj == null ? '' : JSON.stringify(bodyObj)),
  };
}

const initOf = (callIndex: number): FakeInit => fetchMock.mock.calls[callIndex][1];
const urlOf = (callIndex: number): string => fetchMock.mock.calls[callIndex][0];

beforeEach(() => {
  jest.clearAllMocks();
  setItemAsync.mockResolvedValue(undefined);
  deleteItemAsync.mockResolvedValue(undefined);
  // Default: sessão válida em cache (access token presente) → sem refresh preventivo.
  getItemAsync.mockImplementation(async (key: string) =>
    key === ACCESS_KEY ? 'access-token' : key === REFRESH_KEY ? 'refresh-token' : null,
  );
  fetchMock = jest.fn();
  (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;
  // Handlers são estado de módulo — zera para não vazar entre testes.
  mobileApi.setSessionExpiredHandler(null);
  mobileApi.setPasswordChangeRequiredHandler(null);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('mobile-api — retry em 429 (leitura/idempotente)', () => {
  it('GET responde 429 uma vez, reexecuta e devolve o data do 200', async () => {
    // Backoff usa sleep() com ~1.5s + jitter; fake timers evita espera real.
    jest.useFakeTimers();

    const dashboard = {
      quantidadeUsinas: 3,
      potenciaTotalKwp: 12.5,
      geracaoMesKwh: 400,
      usinasNormais: 3,
      usinasComAlerta: 0,
      ultimaAtualizacao: null,
    };

    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(429, { status: 'error', message: 'rate', errors: { code: 'RATE_LIMITED' } }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { status: 'success', data: dashboard }));

    const promise = mobileApi.getDashboard();
    // Roda os timers pendentes (sleep do backoff) intercalando microtasks.
    await jest.runAllTimersAsync();

    await expect(promise).resolves.toEqual(dashboard);
    // Exatamente 2 idas à rede: a que tomou 429 + a reexecução.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(urlOf(0)).toBe(`${BASE}/api/v3/app/dashboard`);
    expect(urlOf(1)).toBe(`${BASE}/api/v3/app/dashboard`);
    expect(initOf(1).method ?? 'GET').toBe('GET');
  });
});

describe('mobile-api — refresh no 401 (rotação de tokens)', () => {
  it('401 dispara refresh, salva os novos tokens e reexecuta a original → 200', async () => {
    // Access em cache está "velho"; o segundo getItemAsync devolve o mesmo valor,
    // então o código cai no refresh (latest === accessToken).
    getItemAsync.mockImplementation(async (key: string) =>
      key === ACCESS_KEY ? 'stale-access' : key === REFRESH_KEY ? 'refresh-token' : null,
    );

    const dashboard = {
      quantidadeUsinas: 1,
      potenciaTotalKwp: 5,
      geracaoMesKwh: 100,
      usinasNormais: 1,
      usinasComAlerta: 0,
      ultimaAtualizacao: null,
    };

    fetchMock
      // 1) request original → 401
      .mockResolvedValueOnce(jsonResponse(401, { status: 'error', message: 'token expirado' }))
      // 2) POST /auth/refresh → 200 com tokens rotacionados
      .mockResolvedValueOnce(
        jsonResponse(200, {
          status: 'success',
          data: {
            usuario: { id: 'u1', nome: 'Ana', email: 'a@a.com', tipo: 'cliente', mustChangePassword: false },
            accessToken: 'new-access',
            refreshToken: 'new-refresh',
          },
        }),
      )
      // 3) reexecução da original com o novo access → 200
      .mockResolvedValueOnce(jsonResponse(200, { status: 'success', data: dashboard }));

    await expect(mobileApi.getDashboard()).resolves.toEqual(dashboard);

    expect(fetchMock).toHaveBeenCalledTimes(3);

    // A 2ª ida é o endpoint de refresh, POST, com o refreshToken do cofre.
    expect(urlOf(1)).toBe(`${BASE}/api/v3/app/auth/refresh`);
    expect(initOf(1).method).toBe('POST');
    expect(JSON.parse(initOf(1).body as string)).toEqual({ refreshToken: 'refresh-token' });

    // A reexecução carrega o novo Bearer.
    expect(initOf(2).headers?.authorization).toBe('Bearer new-access');

    // Tokens rotacionados persistidos no SecureStore.
    expect(setItemAsync).toHaveBeenCalledWith(ACCESS_KEY, 'new-access');
    expect(setItemAsync).toHaveBeenCalledWith(REFRESH_KEY, 'new-refresh');
  });

  it('401 persistente após o refresh limpa os tokens e sinaliza sessão expirada', async () => {
    getItemAsync.mockImplementation(async (key: string) =>
      key === ACCESS_KEY ? 'stale-access' : key === REFRESH_KEY ? 'refresh-token' : null,
    );
    const sessionExpired = jest.fn();
    mobileApi.setSessionExpiredHandler(sessionExpired);

    fetchMock
      // original → 401
      .mockResolvedValueOnce(jsonResponse(401, { status: 'error', message: 'expirado' }))
      // refresh → 200 (rotaciona)
      .mockResolvedValueOnce(
        jsonResponse(200, {
          status: 'success',
          data: {
            usuario: { id: 'u1', nome: 'Ana', email: 'a@a.com', tipo: 'cliente', mustChangePassword: false },
            accessToken: 'new-access',
            refreshToken: 'new-refresh',
          },
        }),
      )
      // reexecução → 401 de novo (token novo também rejeitado)
      .mockResolvedValueOnce(jsonResponse(401, { status: 'error', message: 'ainda 401' }));

    const err = await mobileApi.getDashboard().catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).httpStatus).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(sessionExpired).toHaveBeenCalledTimes(1);
    // clearTokens: apaga access e refresh.
    expect(deleteItemAsync).toHaveBeenCalledWith(ACCESS_KEY);
    expect(deleteItemAsync).toHaveBeenCalledWith(REFRESH_KEY);
  });
});

describe('mobile-api — mutação não reexecuta em 429', () => {
  it('POST (createInvoice) que responde 429 NÃO é reenviado', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(429, { status: 'error', message: 'rate', errors: { code: 'RATE_LIMITED' } }),
    );

    const err = await mobileApi
      .createInvoice('u1', { mesAno: '2026-07', consumoKwh: 100, injetadoKwh: 50, valorPago: 200 })
      .catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).httpStatus).toBe(429);
    // Uma única ida à rede: mutação não reexecuta em 429.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(initOf(0).method).toBe('POST');
  });
});

describe('mobile-api — 403 PASSWORD_CHANGE_REQUIRED', () => {
  it('rota de dados com errors.code=PASSWORD_CHANGE_REQUIRED aciona o handler e lança ApiError', async () => {
    const handler = jest.fn();
    mobileApi.setPasswordChangeRequiredHandler(handler);

    fetchMock.mockResolvedValueOnce(
      jsonResponse(403, {
        status: 'error',
        message: 'Troca de senha obrigatória',
        errors: { code: 'PASSWORD_CHANGE_REQUIRED' },
      }),
    );

    const err = await mobileApi.getPlants().catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).httpStatus).toBe(403);
    expect((err as ApiError).code).toBe('PASSWORD_CHANGE_REQUIRED');
    // Handler específico do gate de troca de senha é chamado exatamente uma vez.
    expect(handler).toHaveBeenCalledTimes(1);
    // Não há reexecução: 403 é terminal aqui.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
