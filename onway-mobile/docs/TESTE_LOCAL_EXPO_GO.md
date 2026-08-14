# Testar o OnWay Cliente no celular com Expo Go (rede local)

Fluxo validado em 13/08/2026 num iPhone físico contra a API pública
(`https://app.onwaytech.cloud`). Não exige conta Expo, build ou VPN.

## Passo a passo

1. Instale o **Expo Go** no celular (App Store / Play Store).
2. Celular e Mac na **mesma rede**. Se o roteador tiver isolamento de clientes
   (timeout ao conectar), use o truque do hotspot: ative o **roteador pessoal
   do celular** e conecte o **Mac** nele — elimina o roteador do caminho.
3. No Mac:

   ```bash
   cd onway-mobile/apps/client
   npx expo start --offline
   ```

   > `--offline` evita os prompts de conta Expo (sem ele, a CLI da SDK 54 pode
   > exigir login ao servir o manifesto e o celular recebe **erro 500**).

4. Escaneie o QR Code do terminal:
   - **iPhone**: Câmera nativa → banner "Abrir no Expo Go";
   - **Android**: Expo Go → "Scan QR code".
   - Sem QR à mão, digite `exp://IP_DO_MAC:8081` no Expo Go ("Enter URL
     manually") ou no Safari. Descubra o IP com `ipconfig getifaddr en0`
     (no hotspot do iPhone costuma ser `172.20.10.x`).
5. Primeira compilação: 30–60 s. O app abre na tela de login.

As chamadas de API vão do celular direto para `https://app.onwaytech.cloud`
(4G ou Wi-Fi — não passam pelo Mac).

## Problemas conhecidos e soluções

| Sintoma | Causa | Solução |
|---|---|---|
| "request timed out" ao abrir o QR | Celular não alcança o Mac (outra rede ou isolamento do roteador) | Mesma rede + dados móveis desligados; persiste → hotspot do celular |
| Erro 500 "Input is required… non-interactive" | CLI pedindo login de conta Expo | Rodar com `--offline` |
| Falha ao instalar `@expo/ngrok` (código 243) ao usar `--tunnel` | npm global sem permissão | `npm install --no-save @expo/ngrok` no projeto — ou evite o túnel: ele **exige conta Expo** |
| Teste rápido de conectividade | — | Navegador do celular em `http://IP_DO_MAC:8081/status` → deve responder `packager-status:running` |

## Limites deste fluxo

- **Push notifications não funcionam no Expo Go** — exigem dev build (EAS).
- `npm run web` não valida contra produção: o backend restringe CORS de
  propósito e o navegador é bloqueado (app nativo não sofre CORS).
- Login de verdade depende de usuário `cliente_app` provisionado pelo operador
  no backend, com senha temporária (`mustChangePassword`) — não há cadastro
  público nem redefinição self-service.
