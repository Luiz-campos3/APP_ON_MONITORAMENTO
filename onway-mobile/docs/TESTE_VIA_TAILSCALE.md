# Testar o OnWay Cliente com o Metro na VPS (via Tailscale)

> **Escopo do Tailscale mudou:** a API do app é **pública** em
> `https://app.onwaytech.cloud` e **não** precisa de VPN — o proxy Tailscale da
> API foi desligado. O tailnet continua útil **apenas** para alcançar o **Metro**
> (bundler de desenvolvimento do Expo) quando ele roda na VPS. Se o Metro rodar
> na sua própria máquina, na mesma rede do iPhone, o Tailscale é desnecessário.

Esse fluxo é destinado ao desenvolvimento com Expo Go. Não substitui TestFlight
ou uma publicação de produção.

## Pré-requisitos

- servidor (VPS) e iPhone autenticados na mesma tailnet — só por causa do Metro;
- Expo Go instalado no iPhone;
- Node.js compatível e dependências instaladas no servidor;
- acesso TCP do iPhone ao servidor na porta `8081` permitido pela política da tailnet;
- porta `8081` não exposta na interface pública do servidor.

## No servidor

```bash
cd /caminho/onway-mobile/apps/client
npm ci
TAILSCALE_IP="$(tailscale ip -4)"
REACT_NATIVE_PACKAGER_HOSTNAME="$TAILSCALE_IP" npm run tailscale
```

O `REACT_NATIVE_PACKAGER_HOSTNAME` faz o manifesto e os assets apontarem para o
IP Tailscale, em vez do IP da rede local do servidor.

Para manter o Metro ativo após fechar o SSH, use o serviço `systemd` de
homologação em `deploy/onway-client-metro.service` (ou `tmux`). **Esse serviço
serve apenas o Metro de desenvolvimento — não tem relação com a API**, que é
pública e servida pela borda Cloudflare/Traefik/nginx.

## No iPhone

1. Ative o Tailscale (necessário só para baixar o bundle do Metro da VPS).
2. Confirme que o servidor aparece conectado.
3. Abra o QR Code mostrado pelo Metro com a Câmera ou informe no Expo Go:

```text
exp://IP_TAILSCALE_DO_SERVIDOR:8081
```

As chamadas de API do app irão direto para `https://app.onwaytech.cloud`,
independentemente do Tailscale.

## Segurança

O Metro é um servidor de desenvolvimento e não possui autenticação de aplicação.
Restrinja `tcp:8081` ao seu usuário ou dispositivo por Tailscale Grants/ACLs e
nunca publique essa porta diretamente na internet.
