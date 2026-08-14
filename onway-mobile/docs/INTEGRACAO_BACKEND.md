# Integração do app com o backend OnWay (API do cliente)

Guia para conectar o app mobile (Expo/React Native) à API `/api/v3/app/*` do
backend. Cobre configuração de rede, autenticação Bearer, endpoints e um cliente
HTTP pronto. Salve este arquivo em `docs/` do projeto do app.

---

## 1. Base URL da API

A API do app vive sob **`/api/v3/app`**. A base URL muda por ambiente:

| Ambiente | Base URL |
|---|---|
| **Produção (pública) — ATIVO** | `https://app.onwaytech.cloud` |
| ~~Teste via VPN (Tailscale)~~ — **DESLIGADO** | ~~`https://monitoramento-vps.tailec3b7b.ts.net`~~ |

> A API é pública no **mesmo host do portal web**. Borda: Cloudflare Tunnel →
> Traefik → nginx → backend. Não há porta aberta na VPS; o TLS é da Cloudflare
> (cert válido, HSTS). O proxy Tailscale antigo foi desativado (`tailscale serve`
> sem config) — a URL `*.ts.net` está morta e **não deve** ser usada.

**Configure via env do Expo** (`.env` na raiz do projeto do app):
```bash
EXPO_PUBLIC_API_URL=https://app.onwaytech.cloud
```
Vars com prefixo `EXPO_PUBLIC_` ficam acessíveis em `process.env.EXPO_PUBLIC_API_URL`.
Os perfis do `eas.json` já definem essa env nos builds. O app **recusa** URLs que
não comecem com `https://` (erro de configuração em runtime).

### Rede / pré-requisitos
- **Nenhuma VPN é necessária para a API** — ela responde publicamente. O
  Tailscale continua útil apenas para alcançar o **Metro** (bundler de dev)
  quando ele roda na VPS; veja `TESTE_VIA_TAILSCALE.md`.
- **HTTPS resolve o ATS do iOS** — cert válido da Cloudflare, sem exceção de App
  Transport Security. Não use `http://`.
- **Sem certificate pinning** — o certificado é da borda Cloudflare e rotaciona;
  pinning quebraria o app em campo.
- **CORS:** não se aplica a app nativo (fetch do RN não sofre CORS). O backend
  está com `CORS_ORIGINS` restrito de propósito — **não** teste com
  `expo start --web` contra produção, o navegador será bloqueado.
- **Limites da borda:** upload máx. **25 MB** (nginx), corpo JSON máx. **1 MB**,
  `proxy_read_timeout` de 120s (relevante para o OCR de faturas).
- **Rate limit por IP:** 300 req/15min na API geral; 10/15min em login+refresh
  (somente falhas contam); 20/15min em uploads/OCR. Trate `429` com backoff —
  nunca retry imediato em loop.

---

## 2. Autenticação (Bearer nativo)

Fluxo: **login** devolve `accessToken` (JWT curto, ~15 min) + `refreshToken`
(opaco, rotativo). O app guarda os dois de forma segura, manda
`Authorization: Bearer <accessToken>` nas chamadas, e usa o `refreshToken` para
renovar quando o access expira.

- **Guardar tokens:** use `expo-secure-store` (Keychain/Keystore). **Nunca**
  AsyncStorage/localStorage para tokens.
- **Rotação:** cada `/refresh` invalida o `refreshToken` anterior e devolve um
  novo. Reutilizar um refresh já usado **revoga a família inteira** (medida
  anti-roubo) → o app cai para a tela de login.
- **Mensagens genéricas:** senha errada e e-mail inexistente retornam o mesmo
  `401 "Credenciais inválidas"` (não revele "e-mail não existe" na UI).
- **Lockout:** 5 falhas em 15 min → `403 "Conta temporariamente bloqueada"`.
- **`mustChangePassword`:** vem no login/`/me`; quando `true`, leve o usuário a
  trocar a senha (fluxo de troca ainda a implementar no backend — Fase 5).

### Endpoints de auth

```
POST /api/v3/app/auth/login     body: { email, password }
POST /api/v3/app/auth/refresh   body: { refreshToken }
POST /api/v3/app/auth/logout    body: { refreshToken }
```

**Resposta de login/refresh** (envelope padrão):
```json
{
  "status": "success",
  "message": "login ok",
  "data": {
    "usuario": {
      "id": "uuid",
      "nome": "Luiz Gustavo de Campos (TESTE)",
      "email": "luiz.onwayenergy@gmail.com",
      "tipo": "cliente_app",
      "mustChangePassword": true
    },
    "accessToken": "eyJ...",
    "refreshToken": "base64url..."
  }
}
```

---

## 3. Endpoints de dados (todos exigem `Authorization: Bearer`)

O **escopo é resolvido no servidor** pelo token — o app **nunca** envia
`clienteId`. Usina de outro cliente responde `404`.

```
GET /api/v3/app/me
GET /api/v3/app/dashboard
GET /api/v3/app/usinas
GET /api/v3/app/usinas/:usinaId
GET /api/v3/app/usinas/:usinaId/historico?inicio=YYYY-MM-DD&fim=YYYY-MM-DD
```

### `/me`
```json
{ "status":"success", "data": {
  "usuario": { "id":"...", "nome":"...", "email":"...", "tipo":"cliente_app", "mustChangePassword":false },
  "clientes": [ { "id":"uuid", "nome":"Luiz Gustavo de Campos (TESTE)" } ]
}}
```

### `/dashboard`
```json
{ "status":"success", "data": {
  "quantidadeUsinas": 4,
  "potenciaTotalKwp": 123.45,
  "geracaoMesKwh": 6789.0,
  "usinasNormais": 3,
  "usinasComAlerta": 1,
  "ultimaAtualizacao": "2026-07-06T12:00:00.000Z"
}}
```

### `/usinas` (lista) e `/usinas/:id` (mesmo objeto)
```json
{ "status":"success", "data": [ {
  "id": "uuid",
  "nome": "IE UFV-X01",
  "cidade": "…",
  "fabricante": "Sungrow",
  "status": "…",
  "alerta": false,
  "monitoramentoAtivo": true,
  "potenciaKwp": 30.0,
  "potenciaPlacaKwp": 33.6,
  "qtdPlacas": 60,
  "geracaoAtual": 12.3,
  "geracaoAcumuladaKwh": 45678.9,
  "geracaoMesKwh": 1500.0,
  "expectativaMensalKwh": 1800.0,
  "expectativaAnualKwh": 21600.0,
  "ultimaLeitura": "2026-07-06T11:50:00.000Z",
  "fonteLeitura": "sungrow"
} ] }
```
> Nunca vêm credenciais de portal, `vendor_plant_id` ou payload bruto.

### `/usinas/:id/historico`
`inicio`/`fim` (opcionais) ativam a visão "período" (intervalo máx. 366 dias).
```json
{ "status":"success", "data": {
  "historico": {
    "dia": [/* 24 valores kWh/hora */],
    "diasHorarios": [ { "data":"2026-07-06", "label":"Hoje", "total":12.3, "horas":[/*24*/] } ],
    "semana": [/*7*/], "semanaLabels": ["01/07","…","Hoje"],
    "mes": [/*dias do mês*/], "mesLabels": [],
    "ano": [/*meses*/], "anoLabels": ["jan/26","…"],
    "custom": [], "customLabels": [],
    "ultimaLeitura": "2026-07-06T11:50:00.000Z",
    "ultimaFonte": "sungrow"
  },
  "fonte": "sungrow",        // ou "sem_dados" quando não há leitura
  "computedAt": "2026-07-06T12:00:00.000Z"
}}
```

### Códigos de erro
| Código | Quando |
|---|---|
| `400` | validação (ex.: data inválida, intervalo > 366 dias) |
| `401` | sem/token inválido/expirado, ou credenciais inválidas |
| `403` | conta bloqueada por lockout |
| `404` | usina fora do escopo do usuário |
| `429` | rate limit (login/refresh) |

Erro padrão: `{ "status":"error", "message":"…", "errors": [ … ] }`.

---

## 4. Cliente HTTP pronto (Expo)

Instale:
```bash
npx expo install expo-secure-store
```

`src/api/client.ts` (ou `.js` — remova os tipos):
```ts
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL!;
const ACCESS = 'onway.accessToken';
const REFRESH = 'onway.refreshToken';

export async function saveTokens(access: string, refresh: string) {
  await SecureStore.setItemAsync(ACCESS, access);
  await SecureStore.setItemAsync(REFRESH, refresh);
}
export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS);
  await SecureStore.deleteItemAsync(REFRESH);
}

async function raw(path: string, opts: RequestInit = {}, access?: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: {
      'content-type': 'application/json',
      ...(access ? { authorization: `Bearer ${access}` } : {}),
      ...(opts.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

// --- Auth ---
export async function login(email: string, password: string) {
  const { status, body } = await raw('/api/v3/app/auth/login', {
    method: 'POST', body: JSON.stringify({ email, password }),
  });
  if (status !== 200) throw new Error(body?.message || 'Falha no login');
  await saveTokens(body.data.accessToken, body.data.refreshToken);
  return body.data.usuario;
}

async function refresh(): Promise<string> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH);
  if (!refreshToken) throw new Error('sem sessão');
  const { status, body } = await raw('/api/v3/app/auth/refresh', {
    method: 'POST', body: JSON.stringify({ refreshToken }),
  });
  if (status !== 200) { await clearTokens(); throw new Error('sessão expirada'); }
  await saveTokens(body.data.accessToken, body.data.refreshToken);
  return body.data.accessToken;
}

export async function logout() {
  const refreshToken = await SecureStore.getItemAsync(REFRESH);
  if (refreshToken) {
    await raw('/api/v3/app/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) });
  }
  await clearTokens();
}

// --- GET autenticado com retry automático no 401 (refresh 1x) ---
export async function apiGet(path: string) {
  let access = await SecureStore.getItemAsync(ACCESS);
  let { status, body } = await raw(path, {}, access ?? undefined);
  if (status === 401) {
    access = await refresh();               // tenta renovar
    ({ status, body } = await raw(path, {}, access));
  }
  if (status >= 400) throw new Error(body?.message || `Erro ${status}`);
  return body.data;
}

// --- Helpers de tela ---
export const getMe        = () => apiGet('/api/v3/app/me');
export const getDashboard = () => apiGet('/api/v3/app/dashboard');
export const getUsinas    = () => apiGet('/api/v3/app/usinas');
export const getUsina     = (id: string) => apiGet(`/api/v3/app/usinas/${id}`);
export const getHistorico = (id: string, inicio?: string, fim?: string) =>
  apiGet(`/api/v3/app/usinas/${id}/historico${inicio && fim ? `?inicio=${inicio}&fim=${fim}` : ''}`);
```

Uso numa tela:
```ts
import { login, getUsinas, getDashboard } from '../api/client';

await login('luiz.onwayenergy@gmail.com', 'SENHA_DE_TESTE'); // senha vem por canal seguro, não commitar
const dash = await getDashboard();   // { quantidadeUsinas: 4, ... }
const usinas = await getUsinas();    // 4 usinas
```

---

## 5. Checklist para o primeiro teste

1. `EXPO_PUBLIC_API_URL=https://app.onwaytech.cloud` (sem VPN, funciona em 4G).
2. `npx expo start` → abrir no Expo Go ou dev client.
3. `login(...)` com a conta de teste → esperar **4 usinas** em `/usinas`,
   `quantidadeUsinas: 4` no dashboard, detalhe e histórico OK.
4. Tentar abrir uma usina de outro cliente (UUID aleatório) → deve dar `404`.
5. Errar a senha 5x → `403` de lockout com mensagem própria.
6. Esperar o access token expirar (~15 min) → refresh transparente, sem voltar
   ao login.

> **Segurança:** a senha de teste é entregue por canal seguro (chat), **não**
> deve ser commitada.
