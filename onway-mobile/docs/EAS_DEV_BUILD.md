# Dev build (EAS) — runbook

Objetivo: gerar um **development build** (dev client) do OnWay Cliente para instalar
no aparelho físico. É o pré-requisito da frente de **push** (não roda no Expo Go
desde o SDK 53) e também deixa qualquer feature testável num cliente próprio, sem as
limitações do Expo Go.

## Estado atual (o que já está pronto no repo)

- `expo-dev-client` **instalado** (`~6.0.21`, em `dependencies`) — sem ele o build
  não vira dev client.
- `eas.json` já tem o perfil **`development`** correto: `developmentClient: true`,
  `distribution: internal`, APK no Android, `EXPO_PUBLIC_API_URL` apontando para a
  API pública de produção.
- Projeto já vinculado ao EAS: `projectId f8b268f4-3832-49a0-949f-039169f4fd49`,
  `owner guilherme_campos_22`, bundle `br.com.onway.cliente`.
- Expo Go continua funcionando normalmente (o dev-client é inerte lá).

**O que falta é credencial, não código** — e isso só você pode fazer.

## Pré-requisitos (o gargalo real)

| Plataforma | Precisa | Observação |
|---|---|---|
| **Login EAS** | conta Expo `guilherme_campos_22` | `eas login` na sua máquina |
| **iOS (aparelho)** | **Apple Developer Program PAGO** ($99/ano) + UDID do iPhone registrado | build device via EAS exige provisioning ad-hoc; conta gratuita **não** basta para distribuição interna |
| **iOS push (APNs)** | chave APNs no Apple Developer | o EAS pede na hora do build quando `expo-notifications` estiver no app (etapa 2, abaixo) |
| **Android (APK)** | nada além do login EAS | o APK de development instala em qualquer Android; **caminho mais barato para validar o dev client** |

> Resumo honesto: para testar **push no seu iPhone** não há atalho — exige a conta
> Apple paga + APNs. Se quiser só validar o dev client rápido e de graça, o **APK
> Android** é o caminho; ou um build local com Xcode (`npx expo run:ios --device`,
> conta Apple gratuita, expira em 7 dias, sem push).

## Etapa 1 — dev client SEM push (fácil, já dá para testar alertas/preferências no device)

```bash
cd onway-mobile/apps/client
eas login                       # conta guilherme_campos_22
# iOS (precisa da conta Apple paga; registra o aparelho na 1ª vez):
eas device:create               # segue o link/QR no iPhone para registrar o UDID
eas build --profile development --platform ios
# — ou — Android (sem conta de loja):
eas build --profile development --platform android
```

Ao terminar, o EAS dá um link/QR: instale o dev client no aparelho. Depois, rode o
Metro com `npx expo start --dev-client` e abra pelo app instalado (não pelo Expo Go).
A partir daí, **mudanças de JS não exigem rebuild** — só recarregam.

## Etapa 2 — tornar push-ready (quando o contrato de push do backend chegar)

`expo-notifications` é módulo **nativo** → adicioná-lo exige **um novo build**. Por
isso ele **não** foi incluído agora: o 1º dev build (etapa 1) sai mais simples (sem
APNs) e já destrava o teste no device dos alertas e preferências. Quando a frente de
push começar:

```bash
npx expo install expo-notifications
# adicionar "expo-notifications" em app.json > expo.plugins
# configurar a chave APNs (iOS) / FCM (Android) — o EAS solicita no build
eas build --profile development --platform ios   # rebuild com o módulo de push
```

## Notas

- O perfil aponta para a **API de produção** (`app.onwaytech.cloud`) — o dev build
  testa contra o backend real, como o Expo Go hoje.
- `expo-dev-client` não adicionou vuln `critical` (CI passa; os 9 `high` são o
  toolchain Expo conhecido, resolvem no SDK 57).
