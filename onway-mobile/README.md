# OnWay Mobile

Fundação mobile em React Native, Expo e TypeScript.

## Escopo atual

- `apps/client`: aplicativo do cliente em desenvolvimento;
- aplicativo do técnico: em standby, ainda não criado;
- autenticação Bearer e dados reais pela API pública `https://app.onwaytech.cloud/api/v3/app`;
- tokens armazenados com `expo-secure-store`;
- dashboard, usinas, histórico, contratos, faturas e troca de senha conectados ao backend;
- alertas, push e gestão de dispositivos aguardam endpoints próprios;
- recuperação de senha é feita pela equipe OnWay (sem fluxo self-service, por decisão de segurança).

## Executar

```bash
cd apps/client
npm run ios
```

A URL da API já vem configurada em `apps/client/.env` e nos perfis do
`eas.json`; use uma conta provisionada pelo backend. A API é pública — não é
preciso VPN. Não valide contra produção com `npm run web`: o backend restringe
CORS de propósito e o navegador será bloqueado. O Tailscale só é necessário se o
Metro (bundler de dev) rodar na VPS — veja `docs/TESTE_VIA_TAILSCALE.md`.
