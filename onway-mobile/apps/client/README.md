# OnWay Cliente

Aplicativo Expo/React Native conectado à API mobile OnWay.

## Executar

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie `.env.local`:

   ```bash
   EXPO_PUBLIC_API_URL=https://monitoramento-vps.tailec3b7b.ts.net
   ```

3. Com o Tailscale ativo, inicie o app:

   ```bash
   npx expo start
   ```

O login, a renovação da sessão, o dashboard, a lista de usinas e o histórico usam
dados reais. Não coloque credenciais em arquivos `.env`; somente a URL pública da
API pertence à configuração do aplicativo.
