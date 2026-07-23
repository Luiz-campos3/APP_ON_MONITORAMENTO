# Testar o OnWay Cliente via Tailscale

Esse fluxo é destinado ao desenvolvimento com Expo Go. Não substitui TestFlight ou uma publicação de produção.

## Pré-requisitos

- servidor e iPhone autenticados na mesma tailnet;
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

O `REACT_NATIVE_PACKAGER_HOSTNAME` faz o manifesto e os assets apontarem para o IP Tailscale, em vez do IP da rede local do servidor.

Para manter o Metro ativo após fechar o SSH, execute o comando por um serviço `systemd`, `tmux` ou outro supervisor de desenvolvimento.

## No iPhone

1. Ative o Tailscale.
2. Confirme que o servidor aparece conectado.
3. Abra o QR Code mostrado pelo Metro com a Câmera ou informe no Expo Go:

```text
exp://IP_TAILSCALE_DO_SERVIDOR:8081
```

## Segurança

O Metro é um servidor de desenvolvimento e não possui autenticação de aplicação. Restrinja `tcp:8081` ao seu usuário ou dispositivo por Tailscale Grants/ACLs e nunca publique essa porta diretamente na internet.
