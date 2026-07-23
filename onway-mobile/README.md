# OnWay Mobile

Fundação mobile em React Native, Expo e TypeScript.

## Escopo atual

- `apps/client`: aplicativo do cliente em desenvolvimento;
- aplicativo do técnico: em standby, ainda não criado;
- autenticação Bearer e dados reais pela API `/api/v3/app`;
- tokens armazenados com `expo-secure-store`;
- dashboard, usinas e histórico conectados ao backend;
- alertas, recuperação de senha e gestão de dispositivos aguardam endpoints próprios.

## Executar

```bash
cd apps/client
npm run ios
```

Também é possível validar no navegador com `npm run web`.

Crie `apps/client/.env.local` com a URL do ambiente e use uma conta provisionada
pelo backend. O ambiente de teste atual exige que o aparelho esteja conectado ao
mesmo tailnet da VPS.
