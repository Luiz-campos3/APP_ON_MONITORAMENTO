# OnWay Cliente

Aplicativo Expo/React Native conectado à API mobile OnWay.

## Executar

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Confirme o `.env` (já versionado como exemplo em `.env.example`):

   ```bash
   EXPO_PUBLIC_API_URL=https://app.onwaytech.cloud
   ```

3. Inicie o app (a API é pública; não é preciso VPN):

   ```bash
   npx expo start
   ```

O login, a renovação da sessão, o dashboard, a lista de usinas, o histórico,
contratos, faturas e a troca de senha usam dados reais. Não coloque credenciais
em arquivos `.env`; somente a URL pública da API pertence à configuração do
aplicativo.
