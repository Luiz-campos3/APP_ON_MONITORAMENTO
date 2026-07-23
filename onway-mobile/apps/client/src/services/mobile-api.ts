import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'onway.accessToken';
const REFRESH_TOKEN_KEY = 'onway.refreshToken';
const REQUEST_TIMEOUT_MS = 15_000;

export type ApiUser = {
  id: string;
  nome: string;
  email: string;
  tipo: string;
  mustChangePassword: boolean;
};

export type ApiCustomer = {
  id: string;
  nome: string;
};

export type AuthResponse = {
  usuario: ApiUser;
  accessToken: string;
  refreshToken: string;
};

export type MeResponse = {
  usuario: ApiUser;
  clientes: ApiCustomer[];
};

export type DashboardResponse = {
  quantidadeUsinas: number;
  potenciaTotalKwp: number;
  geracaoMesKwh: number;
  usinasNormais: number;
  usinasComAlerta: number;
  ultimaAtualizacao: string | null;
};

export type ApiPlant = {
  id: string;
  nome: string;
  cidade: string | null;
  fabricante: string | null;
  status: string | null;
  alerta: boolean;
  monitoramentoAtivo: boolean;
  potenciaKwp: number | null;
  potenciaPlacaKwp: number | null;
  qtdPlacas: number | null;
  geracaoAtual: number | null;
  geracaoHoje?: number | null;
  geracaoHojeKwh?: number | null;
  geracaoDiaKwh?: number | null;
  geracaoDiariaKwh?: number | null;
  geracaoAcumuladaKwh: number | null;
  geracaoMesKwh: number | null;
  expectativaMensalKwh: number | null;
  expectativaAnualKwh: number | null;
  ultimaLeitura: string | null;
  fonteLeitura: string | null;
};

export type PlantHistory = {
  dia: number[];
  diasHorarios: {
    data: string;
    label: string;
    total: number;
    horas: number[];
  }[];
  semana: number[];
  semanaLabels: string[];
  mes: number[];
  mesLabels: string[];
  ano: number[];
  anoLabels: string[];
  custom: number[];
  customLabels: string[];
  ultimaLeitura: string | null;
  ultimaFonte: string | null;
};

export type PlantHistoryResponse = {
  historico: PlantHistory;
  fonte: string;
  computedAt: string;
};

export type ApiContractService = {
  descricao: string;
  unidade: string | null;
  quantidadePrevista: number | null;
  quantidadeConsumida: number | null;
  recorrente: boolean;
  beneficio: boolean;
};

export type ApiContractPlant = {
  id: string;
  nome: string;
  cidade: string | null;
};

export type ApiContractBenefits = {
  inversorBackup: boolean;
  garantiaGeracao: number | null;
  garantiaInstalacaoMeses: number | null;
};

export type ApiContract = {
  id: string;
  titulo: string | null;
  contratoTipo: string | null;
  planoNome: string | null;
  dataAtivacao: string | null;
  valorMensal: number | null;
  kwp: number | null;
  nivelCobertura: string | null;
  servicosInclusos: string | null;
  beneficios: ApiContractBenefits | null;
  servicosContratados: ApiContractService[] | null;
  usinas: ApiContractPlant[] | null;
};

// Shape real confirmado pela API (GET/POST /usinas/:id/faturas). `mesAno` chega
// como "YYYY-MM" (origem app) ou "MM/YYYY" (origem ocr).
export type ApiInvoice = {
  id: string;
  usinaId: string;
  usinaNome: string | null;
  mesAno: string;
  concessionaria: string | null;
  consumoKwh: number | null;
  injetadoKwh: number | null;
  precoUnitario: number | null;
  valorPago: number | null;
  valorSemSolar: number | null;
  economiaReais: number | null;
  status: string;
  origem: string;
  temAnexo: boolean;
  criadaEm: string;
};

export type InvoicesResponse = {
  data: ApiInvoice[];
  resumo: {
    quantidade: number;
    economiaAcumuladaReais: number;
  };
  paginacao: {
    page: number;
    limit: number;
    total: number;
  };
};

// Campos aceitos na criação manual. Backend exige os quatro primeiros.
export type CreateInvoicePayload = {
  mesAno: string;
  consumoKwh: number;
  injetadoKwh: number;
  valorPago: number;
  concessionaria?: string | null;
  precoUnitario?: number | null;
  valorSemSolar?: number | null;
};

export type InvoiceUpload = {
  uri: string;
  name: string;
  mimeType: string;
};

type ApiEnvelope<T> = {
  status: 'success';
  message?: string;
  data: T;
};

type ApiErrorEnvelope = {
  status?: 'error';
  message?: string;
  code?: string;
  errors?: unknown[];
};

type RawResponse<T> = {
  status: number;
  ok: boolean;
  body: ApiEnvelope<T> | ApiErrorEnvelope | null;
};

type RawOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  accessToken?: string;
  timeoutMs?: number;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
    readonly code?: string,
    readonly details?: unknown[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function apiBaseUrl() {
  const value = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');
  if (!value) {
    throw new ApiError('A URL da API não foi configurada.', 0, 'API_URL_MISSING');
  }
  return value;
}

async function parseJson(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as ApiEnvelope<unknown> | ApiErrorEnvelope;
  } catch {
    return null;
  }
}

async function raw<T>(path: string, options: RawOptions = {}): Promise<RawResponse<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? REQUEST_TIMEOUT_MS);

  const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;

  try {
    const response = await fetch(`${apiBaseUrl()}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        accept: 'application/json',
        // Para FormData, deixamos o runtime definir o content-type com boundary.
        ...(options.body !== undefined && !isForm ? { 'content-type': 'application/json' } : {}),
        ...(options.accessToken ? { authorization: `Bearer ${options.accessToken}` } : {}),
      },
      body: options.body === undefined ? undefined : isForm ? (options.body as FormData) : JSON.stringify(options.body),
      signal: controller.signal,
    });

    return {
      status: response.status,
      ok: response.ok,
      body: (await parseJson(response)) as RawResponse<T>['body'],
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('A API demorou para responder. Tente novamente.', 408, 'REQUEST_TIMEOUT');
    }
    throw new ApiError(
      'Não foi possível conectar à API. Verifique o Tailscale e sua internet.',
      0,
      'NETWORK_ERROR',
    );
  } finally {
    clearTimeout(timeout);
  }
}

function unwrap<T>(response: RawResponse<T>): T {
  if (response.ok && response.body && 'data' in response.body) {
    return response.body.data as T;
  }

  const error = response.body && !('data' in response.body) ? response.body : null;
  throw new ApiError(
    error?.message || `A API respondeu com erro ${response.status}.`,
    response.status,
    error?.code,
    error?.errors,
  );
}

async function saveTokens(accessToken: string, refreshToken: string) {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
  ]);
}

async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}

let refreshInFlight: Promise<string> | null = null;
let sessionExpiredHandler: (() => void) | null = null;

async function performRefresh() {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    sessionExpiredHandler?.();
    throw new ApiError('Sua sessão expirou. Entre novamente.', 401, 'SESSION_MISSING');
  }

  const response = await raw<AuthResponse>('/api/v3/app/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
  });

  try {
    const data = unwrap(response);
    await saveTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch (error) {
    if (error instanceof ApiError && error.httpStatus >= 400 && error.httpStatus < 500) {
      await clearTokens();
      sessionExpiredHandler?.();
    }
    throw error;
  }
}

function refreshAccessToken() {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function authenticatedGet<T>(path: string) {
  let accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  if (!accessToken) accessToken = await refreshAccessToken();

  let response = await raw<T>(path, { accessToken });
  if (response.status === 401) {
    const latestAccessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    accessToken = latestAccessToken && latestAccessToken !== accessToken
      ? latestAccessToken
      : await refreshAccessToken();
    response = await raw<T>(path, { accessToken });
  }
  if (response.status === 401) {
    await clearTokens();
    sessionExpiredHandler?.();
  }
  return unwrap(response);
}

async function authenticatedSend<T>(path: string, body: unknown, timeoutMs?: number) {
  let accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  if (!accessToken) accessToken = await refreshAccessToken();

  let response = await raw<T>(path, { method: 'POST', body, accessToken, timeoutMs });
  if (response.status === 401) {
    const latestAccessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    accessToken = latestAccessToken && latestAccessToken !== accessToken
      ? latestAccessToken
      : await refreshAccessToken();
    response = await raw<T>(path, { method: 'POST', body, accessToken, timeoutMs });
  }
  if (response.status === 401) {
    await clearTokens();
    sessionExpiredHandler?.();
  }
  return unwrap(response);
}

function withDateRange(path: string, inicio?: string, fim?: string) {
  if (!inicio || !fim) return path;
  const params = new URLSearchParams({ inicio, fim });
  return `${path}?${params.toString()}`;
}

function withPagination(path: string, page?: number, limit?: number) {
  const params = new URLSearchParams();
  if (typeof page === 'number') params.set('page', String(page));
  if (typeof limit === 'number') params.set('limit', String(limit));
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export const mobileApi = {
  setSessionExpiredHandler(handler: (() => void) | null) {
    sessionExpiredHandler = handler;
  },

  async login(email: string, password: string) {
    const response = await raw<AuthResponse>('/api/v3/app/auth/login', {
      method: 'POST',
      body: { email: email.trim(), password },
    });
    const data = unwrap(response);
    await saveTokens(data.accessToken, data.refreshToken);
    return data.usuario;
  },

  async restoreSession() {
    const [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
    ]);
    if (!accessToken && !refreshToken) return null;

    try {
      const me = await authenticatedGet<MeResponse>('/api/v3/app/me');
      return me.usuario;
    } catch (error) {
      if (error instanceof ApiError && error.httpStatus === 401) {
        await clearTokens();
        return null;
      }
      throw error;
    }
  },

  async logout() {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    try {
      if (refreshToken) {
        await raw('/api/v3/app/auth/logout', {
          method: 'POST',
          body: { refreshToken },
        });
      }
    } finally {
      await clearTokens();
    }
  },

  getMe: () => authenticatedGet<MeResponse>('/api/v3/app/me'),
  getDashboard: () => authenticatedGet<DashboardResponse>('/api/v3/app/dashboard'),
  getPlants: () => authenticatedGet<ApiPlant[]>('/api/v3/app/usinas'),
  getPlant: (id: string) => authenticatedGet<ApiPlant>(`/api/v3/app/usinas/${encodeURIComponent(id)}`),
  getPlantHistory: (id: string, inicio?: string, fim?: string) =>
    authenticatedGet<PlantHistoryResponse>(
      withDateRange(`/api/v3/app/usinas/${encodeURIComponent(id)}/historico`, inicio, fim),
    ),

  getContracts: () => authenticatedGet<ApiContract[]>('/api/v3/app/contratos'),
  getContract: (id: string) =>
    authenticatedGet<ApiContract>(`/api/v3/app/contratos/${encodeURIComponent(id)}`),
  getPlantContract: (id: string) =>
    authenticatedGet<ApiContract>(`/api/v3/app/usinas/${encodeURIComponent(id)}/contrato`),
  getInvoices: (page?: number, limit?: number) =>
    authenticatedGet<InvoicesResponse>(withPagination('/api/v3/app/faturas', page, limit)),
  getPlantInvoices: (id: string, page?: number, limit?: number) =>
    authenticatedGet<InvoicesResponse>(
      withPagination(`/api/v3/app/usinas/${encodeURIComponent(id)}/faturas`, page, limit),
    ),
  getInvoice: (id: string) => authenticatedGet<ApiInvoice>(`/api/v3/app/faturas/${encodeURIComponent(id)}`),
  createInvoice: (usinaId: string, payload: CreateInvoicePayload) =>
    authenticatedSend<ApiInvoice>(`/api/v3/app/usinas/${encodeURIComponent(usinaId)}/faturas`, payload),
  // OCR de PDF/imagem: multipart no campo `arquivo`. Pode retornar campos
  // extraídos (sem id) para confirmação, ou uma fatura já gravada (com id).
  ocrInvoice: (usinaId: string, file: InvoiceUpload) => {
    const form = new FormData();
    form.append('arquivo', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
    return authenticatedSend<Partial<ApiInvoice> & Record<string, unknown>>(
      `/api/v3/app/usinas/${encodeURIComponent(usinaId)}/faturas/ocr`,
      form,
      45_000,
    );
  },
};

export function apiErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return 'Ocorreu um erro inesperado. Tente novamente.';
}
