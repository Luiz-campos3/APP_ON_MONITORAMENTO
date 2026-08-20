import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'onway.accessToken';
const REFRESH_TOKEN_KEY = 'onway.refreshToken';
const REQUEST_TIMEOUT_MS = 15_000;
// O OCR passa por IA e o nginx da borda espera até 120s (proxy_read_timeout).
const OCR_TIMEOUT_MS = 120_000;
// Upload de foto do chamado (≤10 MB): mais folga que os 15s padrão, sem o
// exagero do OCR.
const UPLOAD_TIMEOUT_MS = 60_000;
// client_max_body_size do nginx de produção.
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const RATE_LIMIT_MAX_RETRIES = 2;

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

// Mesma forma de arquivo para upload de foto de chamado.
export type UploadFile = InvoiceUpload;

// Shape REAL do OCR confirmado no aceite A2 (19/08/2026): os campos extraídos
// vêm aninhados em `campos` com nomes snake_case — NÃO no nível raiz nem em
// camelCase. Ver `toOcrExtraction` em domain/contract.ts.
export type ApiOcrFields = {
  mes_ano?: string | null;
  consumo_kwh?: number | null;
  injetado_kwh?: number | null;
  valor_pago?: number | null;
  preco_unitario?: number | null;
  concessionaria?: string | null;
  [key: string]: unknown;
};

export type ApiOcrResponse = {
  // Presente apenas se o backend já gravar a fatura (hoje devolve p/ confirmação).
  id?: string;
  campos?: ApiOcrFields;
  avisos?: unknown[];
  titularidade?: { status?: string; motivo?: string; [key: string]: unknown };
  ocr_ref?: string;
  [key: string]: unknown;
};

// Chamados (contrato v1.6.0). Objeto sempre camelCase; timeline só no detalhe.
export type ApiTicketEvent = {
  em: string; // ISO 8601
  titulo: string;
};

export type ApiTicket = {
  id: string;
  numero: string; // protocolo público, ex.: "CH-0043"
  status: string; // bruto (novo, em_triagem, …)
  statusLabel: string; // PT-BR pronto para exibir
  encerrado: boolean;
  categoria: string | null;
  subcategoria: string | null;
  natureza: string | null;
  urgencia: string | null;
  descricaoProblema: string;
  usinaId: string;
  usinaNome: string | null;
  canalOrigem: string; // "app" para os abertos pelo app
  dataCriacao: string | null; // AAAA-MM-DD
  dataFechamento: string | null; // AAAA-MM-DD ou null
  temAnexo: boolean;
  criadoEm: string; // ISO 8601
  timeline?: ApiTicketEvent[]; // presente no detalhe
};

export type TicketsResponse = {
  data: ApiTicket[];
  paginacao: {
    page: number;
    limit: number;
    total: number;
  };
};

// Campos aceitos na criação. Só descricaoProblema é obrigatório (mín. 5 chars).
export type CreateTicketPayload = {
  descricaoProblema: string;
  categoria?: string | null;
  subcategoria?: string | null;
  natureza?: string | null;
  urgencia?: string | null;
};

type ApiEnvelope<T> = {
  status: 'success';
  message?: string;
  data: T;
};

type ApiErrorEnvelope = {
  status?: 'error';
  message?: string;
  // A API aninha o código em `errors.code` (objeto) — confirmado no aceite A2
  // (ex.: PASSWORD_CHANGE_REQUIRED, SENHA_ATUAL_INVALIDA). `code` de raiz não é
  // usado hoje; fica como fallback caso o backend passe a emiti-lo também.
  code?: string;
  errors?: { code?: string; details?: unknown } | unknown[];
};

type RawResponse<T> = {
  status: number;
  ok: boolean;
  body: ApiEnvelope<T> | ApiErrorEnvelope | null;
  retryAfterMs: number | null;
};

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

type RawOptions = {
  method?: HttpMethod;
  body?: unknown;
  accessToken?: string;
  timeoutMs?: number;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
    readonly code?: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Extrai o código do erro do envelope: prioriza `errors.code` (formato real da
// API), com fallback para um eventual `code` de raiz. Retorna undefined quando
// `errors` vier como array (formato legado/defensivo) ou ausente.
export function readErrorCode(body: ApiErrorEnvelope | null | undefined): string | undefined {
  const errors = body?.errors;
  if (errors && !Array.isArray(errors) && typeof errors.code === 'string') {
    return errors.code;
  }
  return typeof body?.code === 'string' ? body.code : undefined;
}

function apiBaseUrl() {
  const value = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');
  if (!value) {
    throw new ApiError('A URL da API não foi configurada.', 0, 'API_URL_MISSING');
  }
  // Tokens Bearer nunca podem trafegar em claro; http:// aqui é erro de configuração.
  if (!value.startsWith('https://')) {
    throw new ApiError(
      'Configuração inválida: EXPO_PUBLIC_API_URL precisa começar com https://.',
      0,
      'API_URL_INSECURE',
    );
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

    const retryAfterSeconds = Number(response.headers.get('retry-after'));
    return {
      status: response.status,
      ok: response.ok,
      body: (await parseJson(response)) as RawResponse<T>['body'],
      retryAfterMs: Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
        ? retryAfterSeconds * 1000
        : null,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('A API demorou para responder. Tente novamente.', 408, 'REQUEST_TIMEOUT');
    }
    throw new ApiError(
      'Não foi possível conectar à API. Verifique sua conexão com a internet.',
      0,
      'NETWORK_ERROR',
    );
  } finally {
    clearTimeout(timeout);
  }
}

function fallbackErrorMessage(status: number) {
  if (status === 429) {
    return 'Muitas solicitações no momento. Aguarde alguns instantes e tente novamente.';
  }
  if (status === 403) {
    return 'Acesso bloqueado temporariamente. Tente novamente mais tarde.';
  }
  return `A API respondeu com erro ${status}.`;
}

function unwrap<T>(response: RawResponse<T>): T {
  if (response.ok && response.body && 'data' in response.body) {
    return response.body.data as T;
  }

  const error = response.body && !('data' in response.body) ? response.body : null;
  throw new ApiError(
    error?.message || fallbackErrorMessage(response.status),
    response.status,
    readErrorCode(error),
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
let passwordChangeRequiredHandler: (() => void) | null = null;

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Backoff exponencial com jitter; respeita o Retry-After quando a borda enviar.
function rateLimitDelayMs(attempt: number, retryAfterMs: number | null) {
  const base = retryAfterMs ?? 1_500 * 2 ** attempt;
  const jitter = Math.random() * 400;
  return Math.min(base + jitter, 20_000);
}

type AuthenticatedOptions = {
  method?: HttpMethod;
  // FormData não pode ser reaproveitado entre tentativas; passe uma factory.
  body?: unknown | (() => unknown);
  timeoutMs?: number;
};

async function requestWithAuth<T>(path: string, options: AuthenticatedOptions = {}): Promise<RawResponse<T>> {
  const resolveBody = () =>
    typeof options.body === 'function' ? (options.body as () => unknown)() : options.body;

  let accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  if (!accessToken) accessToken = await refreshAccessToken();

  let response = await raw<T>(path, {
    method: options.method,
    body: resolveBody(),
    timeoutMs: options.timeoutMs,
    accessToken,
  });
  if (response.status === 401) {
    const latestAccessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    accessToken = latestAccessToken && latestAccessToken !== accessToken
      ? latestAccessToken
      : await refreshAccessToken();
    response = await raw<T>(path, {
      method: options.method,
      body: resolveBody(),
      timeoutMs: options.timeoutMs,
      accessToken,
    });
  }
  if (response.status === 401) {
    await clearTokens();
    sessionExpiredHandler?.();
  }
  // Contrato real confirmado (backend v1.6.0): o 403 de troca obrigatória traz
  // `errors.code === 'PASSWORD_CHANGE_REQUIRED'` (aninhado em `errors`, objeto).
  const errorBody = response.body && !('data' in response.body) ? response.body : null;
  if (response.status === 403 && readErrorCode(errorBody) === 'PASSWORD_CHANGE_REQUIRED') {
    passwordChangeRequiredHandler?.();
  }
  return response;
}

async function authenticatedGet<T>(path: string) {
  for (let attempt = 0; ; attempt += 1) {
    const response = await requestWithAuth<T>(path);
    if (response.status === 429 && attempt < RATE_LIMIT_MAX_RETRIES) {
      await sleep(rateLimitDelayMs(attempt, response.retryAfterMs));
      continue;
    }
    return unwrap(response);
  }
}

// Mutações não são reexecutadas em 429: os limites de login/refresh/upload são
// estreitos e retry silencioso só prolonga o bloqueio do IP.
async function authenticatedSend<T>(
  path: string,
  body: unknown | (() => unknown),
  timeoutMs?: number,
  method: Exclude<HttpMethod, 'GET'> = 'POST',
) {
  const response = await requestWithAuth<T>(path, { method, body, timeoutMs });
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

function withTicketQuery(path: string, page?: number, limit?: number, usinaId?: string) {
  const params = new URLSearchParams();
  if (typeof page === 'number') params.set('page', String(page));
  if (typeof limit === 'number') params.set('limit', String(limit));
  if (usinaId) params.set('usinaId', usinaId);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export const mobileApi = {
  setSessionExpiredHandler(handler: (() => void) | null) {
    sessionExpiredHandler = handler;
  },

  // Chamado quando qualquer rota de dados responde 403 PASSWORD_CHANGE_REQUIRED
  // (mustChangePassword ativo no servidor; apenas /me e a troca de senha passam).
  setPasswordChangeRequiredHandler(handler: (() => void) | null) {
    passwordChangeRequiredHandler = handler;
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

  async changePassword(currentPassword: string, newPassword: string) {
    let accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    if (!accessToken) accessToken = await refreshAccessToken();

    let response = await raw<Partial<AuthResponse>>('/api/v3/app/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
      accessToken,
    });
    if (response.status === 401) {
      // Pode ser só o access token expirado: renova uma vez e repete.
      accessToken = await refreshAccessToken();
      response = await raw<Partial<AuthResponse>>('/api/v3/app/auth/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword },
        accessToken,
      });
    }
    if (response.status === 401) {
      // Contrato real (backend v1.6.0): senha atual errada responde 403
      // `errors.code=SENHA_ATUAL_INVALIDA`, tratado no unwrap abaixo. Um 401
      // aqui, após o refresh, é sessão inválida de fato — mensagem defensiva.
      const body = response.body && !('data' in response.body) ? response.body : null;
      throw new ApiError(body?.message || 'Sua sessão expirou. Entre novamente.', 401, 'SESSION_INVALID');
    }

    const data = unwrap(response);
    // Alguns backends rotacionam a sessão na troca de senha.
    if (data && typeof data.accessToken === 'string' && typeof data.refreshToken === 'string') {
      await saveTokens(data.accessToken, data.refreshToken);
    }
    return data;
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

  getDashboard: () => authenticatedGet<DashboardResponse>('/api/v3/app/dashboard'),
  getPlants: () => authenticatedGet<ApiPlant[]>('/api/v3/app/usinas'),
  getPlant: (id: string) => authenticatedGet<ApiPlant>(`/api/v3/app/usinas/${encodeURIComponent(id)}`),
  getPlantHistory: (id: string, inicio?: string, fim?: string) =>
    authenticatedGet<PlantHistoryResponse>(
      withDateRange(`/api/v3/app/usinas/${encodeURIComponent(id)}/historico`, inicio, fim),
    ),

  getPlantContract: (id: string) =>
    authenticatedGet<ApiContract>(`/api/v3/app/usinas/${encodeURIComponent(id)}/contrato`),
  getPlantInvoices: (id: string, page?: number, limit?: number) =>
    authenticatedGet<InvoicesResponse>(
      withPagination(`/api/v3/app/usinas/${encodeURIComponent(id)}/faturas`, page, limit),
    ),
  getInvoice: (id: string) => authenticatedGet<ApiInvoice>(`/api/v3/app/faturas/${encodeURIComponent(id)}`),
  createInvoice: (usinaId: string, payload: CreateInvoicePayload) =>
    authenticatedSend<ApiInvoice>(`/api/v3/app/usinas/${encodeURIComponent(usinaId)}/faturas`, payload),
  // OCR de PDF/imagem: multipart no campo `arquivo`. Pode retornar campos
  // extraídos (sem id) para confirmação, ou uma fatura já gravada (com id).
  ocrInvoice: (usinaId: string, file: InvoiceUpload) =>
    authenticatedSend<ApiOcrResponse>(
      `/api/v3/app/usinas/${encodeURIComponent(usinaId)}/faturas/ocr`,
      () => {
        const form = new FormData();
        form.append('arquivo', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
        return form;
      },
      OCR_TIMEOUT_MS,
    ),

  // Chamados. Leitura cai no rate limit global; a criação tem limite próprio
  // (20/15min por IP) — sem retry automático em POST.
  listTickets: (page?: number, limit?: number, usinaId?: string) =>
    authenticatedGet<TicketsResponse>(withTicketQuery('/api/v3/app/chamados', page, limit, usinaId)),
  getTicket: (id: string) =>
    authenticatedGet<ApiTicket>(`/api/v3/app/chamados/${encodeURIComponent(id)}`),
  createTicket: (usinaId: string, payload: CreateTicketPayload, photo?: UploadFile) => {
    const path = `/api/v3/app/usinas/${encodeURIComponent(usinaId)}/chamados`;
    // Sem foto: JSON simples. Com foto: multipart no campo `foto` (uma só).
    if (!photo) return authenticatedSend<ApiTicket>(path, payload);
    return authenticatedSend<ApiTicket>(
      path,
      () => {
        const form = new FormData();
        form.append('descricaoProblema', payload.descricaoProblema);
        if (payload.categoria) form.append('categoria', payload.categoria);
        if (payload.subcategoria) form.append('subcategoria', payload.subcategoria);
        if (payload.natureza) form.append('natureza', payload.natureza);
        if (payload.urgencia) form.append('urgencia', payload.urgencia);
        form.append('foto', { uri: photo.uri, name: photo.name, type: photo.mimeType } as unknown as Blob);
        return form;
      },
      UPLOAD_TIMEOUT_MS,
    );
  },
};

export function apiErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return 'Ocorreu um erro inesperado. Tente novamente.';
}
