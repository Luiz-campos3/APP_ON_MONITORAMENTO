# Plano de Desenvolvimento Mobile — OnWay Monitoramento

**Versão do documento:** 1.0  
**Data da análise:** 03/07/2026  
**Escopo inicial:** iOS; Android após estabilização do produto no iOS  
**Produtos:** aplicativo do Cliente e aplicativo do Técnico  
**Sistema analisado:** `/opt/apps/monitoramento`  
**Natureza deste documento:** análise e planejamento; nenhuma alteração funcional foi realizada no sistema existente.

---

## 1. Objetivo

Planejar a criação de dois aplicativos móveis conectados ao backend atual da plataforma OnWay:

1. **OnWay Cliente:** permite que o cliente autenticado visualize somente as usinas às quais possui acesso, acompanhe geração, desempenho, comunicação, dados técnicos, relatórios e alertas relevantes.
2. **OnWay Técnico:** permite que o técnico autenticado consulte e execute somente as ordens de serviço atribuídas a ele, controle sua agenda, atualize o atendimento em campo, preencha checklist, anexe evidências e conclua a visita mesmo em condições de internet instável.

Este plano parte do sistema real encontrado na VPS. Ele não presume que as rotas atualmente usadas pelo operador web possam ser expostas diretamente aos aplicativos.

---

## 2. Resumo executivo da análise

O sistema existente já possui boa parte do domínio necessário:

- cadastro de clientes, contatos, usinas, contratos e vínculos;
- telemetria real persistida por usina;
- histórico de geração por dia, semana, mês, ano e período;
- relatórios de geração;
- chamados, ordens de serviço e máquina de estados;
- agendamentos e reagendamentos;
- checklist e anexos de O.S.;
- usuários, perfis, permissões, sessões, auditoria e rate limit;
- PostgreSQL, Redis, jobs de coleta e integrações com fabricantes.

Entretanto, o backend atual foi projetado principalmente para o **operador interno do portal web**. Antes de iniciar os aplicativos, são necessários contratos de API próprios para mobile, principalmente por segurança e escopo de dados.

### Conclusão principal

Não é seguro construir os apps apenas reutilizando o CRUD genérico `/api/v3/data/*` e as permissões atuais. O mobile precisa de uma camada de API específica, com respostas menores e regras obrigatórias no servidor:

- cliente só pode consultar dados de seus próprios clientes/usinas/contratos;
- técnico só pode consultar e alterar O.S. atribuídas a ele;
- tokens e sessões devem funcionar corretamente em aplicativo nativo;
- mutações offline precisam de idempotência e controle de conflito;
- fotos, checklist e assinatura devem possuir uma única fonte de verdade;
- push notifications e registro de dispositivos ainda precisam ser criados.

### Arquitetura recomendada

```text
                     ┌──────────────────────────┐
                     │ Backend OnWay existente │
                     │ Express + PostgreSQL    │
                     │ Redis + jobs/vendors    │
                     └────────────┬─────────────┘
                                  │
                     API Mobile versionada e
                     escopada por identidade
                                  │
                 ┌────────────────┴────────────────┐
                 │                                 │
        ┌────────▼────────┐               ┌────────▼────────┐
        │ OnWay Cliente  │               │ OnWay Técnico  │
        │ iOS → Android  │               │ iOS → Android  │
        └─────────────────┘               └─────────────────┘

        Um monorepo mobile, dois aplicativos/bundle IDs,
        com pacotes compartilhados de UI, API e domínio.
```

Recomendação de stack: **React Native + Expo + TypeScript**, com dois targets de aplicativo. React Native permite compartilhar a maior parte do código e ainda separar comportamentos específicos de iOS e Android quando necessário. A documentação oficial descreve tanto o módulo `Platform` quanto arquivos `.ios` e `.android` para esses casos: [Platform-Specific Code](https://reactnative.dev/docs/platform-specific-code.html).

> Decisão a confirmar na Fase 0: dois apps separados na loja ou um único app que muda conforme o perfil. A recomendação deste plano é **dois aplicativos separados**, compartilhando código. Cliente e técnico têm objetivos, permissões, linguagem e ritmo de evolução diferentes.

---

## 3. Retrato técnico do sistema existente

### 3.1 Stack encontrada

| Camada | Situação atual |
|---|---|
| Portal web | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express 5, API sob `/api/v3` |
| Banco | PostgreSQL, migrations versionadas |
| Cache/filas | Redis + BullMQ |
| Autenticação | JWT em cookies HTTP-only, refresh rotativo e sessões persistidas |
| Autorização | RBAC por módulo e ação, com perfis em banco |
| Segurança | Helmet, CORS, CSRF double-submit, rate limit, lockout e auditoria append-only |
| Telemetria | Coleta persistida em `usina_leitura`; integrações Sungrow e Enphase |
| Arquivos | Upload em filesystem configurado por `UPLOAD_DIR` |
| Deploy | Docker/Traefik, PostgreSQL e Redis na VPS |

### 3.2 Domínio já disponível

#### Cliente e usina

- `clientes` e `cliente_contatos`;
- vínculo direto `cliente_usinas`;
- contratos com múltiplas usinas via `contrato_usinas`;
- usinas com nome, potência, fabricante, cidade, coordenadas, placas e inversor;
- rateio de unidades consumidoras;
- faturas e anexos;
- relatório consolidado por usina.

#### Telemetria

- leituras append-only em `usina_leitura`;
- geração do dia, últimos sete dias, mês, ano e período;
- última leitura/fonte para estado de comunicação;
- geração mensal agregada;
- dados reais dependem da disponibilidade e frequência de coleta do fabricante.

#### Técnico, O.S. e agenda

- O.S. com nove estados;
- técnico programado e técnico executor;
- data agendada e data de realização;
- descrição do serviço a realizar e do serviço realizado;
- checklist, foto, anexos e relatório de conclusão;
- histórico de agendamentos, reagendamentos e status;
- bloqueio de conclusão quando houver checklist obrigatório pendente;
- cascata para encerrar o chamado após a conclusão da O.S.;
- auditoria das ações.

### 3.3 Rotas atuais potencialmente reutilizáveis internamente

| Capacidade | Rota atual | Observação para mobile |
|---|---|---|
| Login | `POST /api/v3/auth/login` | Usa cookies + CSRF; precisa contrato nativo ou cookie jar rigorosamente validado |
| Sessão | `POST /api/v3/auth/refresh` | Refresh rotativo já existe |
| Usuário atual | `GET /api/v3/auth/me` | Útil, mas não informa identidade de cliente |
| Lista de usinas | `GET /api/v3/data/usinas` | Retorna coleção conforme RBAC do módulo, não conforme posse do cliente |
| Histórico | `GET /api/v3/usinas/:id/historico` | Boa base, mas falta ownership por cliente |
| Relatório | `GET /api/v3/usinas/:id/relatorio` | Boa base, mas falta ownership por cliente |
| O.S. | `GET /api/v3/data/ordens_servico` | Lista global conforme perfil, não agenda pessoal obrigatória |
| Agendamentos | `GET /api/v3/agendamentos` | Lista global e técnico armazenado como texto |
| Atualizar O.S. | `PATCH /api/v3/os/:id` | Permissão por módulo; não valida necessariamente atribuição ao técnico atual |
| Transição | `POST /api/v3/os/:id/status` | Máquina de estados já é validada no backend |
| Concluir O.S. | `POST /api/v3/os/:id/complete` | Valida checklist normalizado, mas há duplicidade com checklist JSON |
| Anexos | `/api/v3/os/:id/anexos` | Base existente; precisa limites, metadados, segurança e estratégia offline |

### 3.4 Pontos positivos a preservar

- UUIDs no backend;
- refresh token rotativo e detecção de reutilização;
- auditoria append-only;
- transações nas operações críticas;
- máquina de estados no servidor;
- soft-delete em entidades de domínio;
- idempotência de leituras de telemetria por `(usina_id, lido_em)`;
- separação entre coleta dos fabricantes e consumo pela interface;
- RBAC persistido no banco.

---

## 4. Lacunas que precisam ser resolvidas antes do mobile

### 4.1 Lacunas críticas

#### A. Identidade do cliente não existe como identidade de acesso

O cadastro `clientes` representa o titular comercial, mas o login atual usa `usuarios`, criado para pessoas internas e perfis RBAC. Não existe vínculo canônico entre usuário autenticado e um ou mais clientes.

Requisito:

- criar vínculo N:N entre usuário e cliente, por exemplo `usuario_clientes`;
- distinguir identidade interna de técnico e identidade externa de cliente;
- permitir convite/ativação pelo operador, recuperação de senha e revogação;
- não permitir cadastro público sem validação, salvo decisão explícita de produto;
- aplicar ownership no backend em toda consulta, inclusive por ID direto.

#### B. Agenda do técnico não está escopada pela identidade

`agendamentos.tecnico` é texto, enquanto a O.S. possui campos de técnico por ID e por nome. Uma busca global seguida de filtro no app seria falha de segurança.

Requisito:

- tornar `tecnico_programado_id` a referência canônica;
- relacionar o agendamento ao `usuario_id` do técnico;
- disponibilizar endpoint “minha agenda”;
- validar a atribuição em toda leitura e mutação do técnico;
- manter nomes somente como snapshot de exibição, não como autorização.

#### C. Autenticação web não deve ser copiada sem projeto para o native

O portal usa cookies HTTP-only, CSRF e `document.cookie`. O código HTTP atual do frontend é dependente de navegador. Em React Native não existe `document.cookie`.

Requisito recomendado:

- criar autenticação mobile baseada em `Authorization: Bearer <access_token>`;
- usar access token curto e refresh token rotativo por dispositivo;
- guardar segredos no Keychain/secure storage, nunca em AsyncStorage ou SQLite comum;
- registrar dispositivo, versão do app e push token;
- permitir revogação individual de sessão/dispositivo;
- manter o fluxo de cookies atual para o portal web, evitando regressão.

O Expo SecureStore utiliza Keychain no iOS e armazenamento protegido pelo Keystore no Android; a documentação também alerta para comportamento após reinstalação e invalidação por alteração biométrica: [Expo SecureStore](https://docs.expo.dev/versions/v56.0.0/sdk/securestore/).

#### D. CRUD genérico não é contrato adequado para apps externos

O endpoint genérico oferece entidades amplas e paginação orientada ao portal. Mobile precisa de contratos explícitos, mínimos e escopados.

Requisito:

- criar uma API dedicada, sugerida como `/api/mobile/v1/*`;
- DTOs de resposta sem PII desnecessária;
- paginação por cursor para listas extensas;
- versionamento e compatibilidade retroativa;
- documentação OpenAPI;
- testes de autorização negativa: usuário A nunca acessa recurso de B.

### 4.2 Lacunas de campo

- checklist existe simultaneamente na tabela `os_checklist` e no JSON `ordens_servico.checklist`;
- a UI web grava bastante conteúdo no JSON, mas a conclusão consulta a tabela normalizada;
- assinatura do cliente ainda não existe como artefato verificável;
- fotos/anexos ficam no filesystem local da aplicação;
- não existe fila de mutações offline com chaves de idempotência;
- não existe versionamento explícito da O.S. para detectar conflito;
- não existe cadastro de dispositivos/push tokens;
- não existe trilha própria de sincronização mobile;
- não existe endpoint otimizado para resumo do cliente ou detalhe completo de atendimento do técnico;
- coordenadas existem, mas devem ser validadas antes de oferecer navegação;
- não existe roteirização otimizada; apenas agenda cronológica.

### 4.3 Lacunas de produto

Precisam de decisão antes do Figma final:

- o cliente poderá abrir chamado pelo app no MVP?
- o cliente visualizará faturas e economia financeira no MVP?
- o cliente poderá ter acesso a mais de um cadastro/empresa?
- o técnico poderá recusar ou devolver uma O.S.?
- quem pode reagendar: técnico, operador ou ambos?
- a localização do técnico será coletada? Em quais momentos e com qual consentimento?
- assinatura presencial é obrigatória para quais tipos de serviço?
- fotos são obrigatórias antes/depois por tipo de serviço?
- haverá operação 100% offline ou apenas tolerância a perda temporária de conexão?
- cliente e técnico serão publicados como dois apps ou um app com dois perfis?
- quais marcas e métricas são confiáveis para serem mostradas ao cliente?
- qual é a regra oficial para “usina online”, “atenção” e “offline”?

---

## 5. Escopo funcional — Aplicativo do Cliente

### 5.1 Persona

Cliente proprietário, representante ou responsável por uma ou mais usinas solares vinculadas à OnWay. Geralmente quer uma resposta rápida para três perguntas:

1. Minha usina está funcionando?
2. Quanto ela gerou?
3. Existe algo que exige minha atenção?

### 5.2 MVP recomendado

#### Autenticação e conta

- login por e-mail e senha;
- ativação por convite enviado pela OnWay;
- recuperação de senha;
- renovação silenciosa de sessão;
- logout do dispositivo e logout de todos os dispositivos;
- visualização de dados básicos da conta;
- política de privacidade e termos;
- solicitação de exclusão/encerramento da conta, conforme regra jurídica e retenção obrigatória;
- opção de biometria somente para desbloquear credencial já estabelecida no dispositivo.

#### Início

- saudação e nome do cliente;
- seletor de usina quando houver mais de uma;
- estado atual: normal, atenção, offline ou sem dados;
- geração de hoje;
- geração do mês;
- potência instalada;
- desempenho/prognóstico, somente quando houver fonte confiável;
- data e hora da última leitura;
- aviso claro quando o dado estiver desatualizado;
- atalhos para gráfico, detalhes e suporte.

#### Minhas usinas

- lista somente das usinas autorizadas;
- nome, cidade, fabricante, potência e status;
- busca quando houver muitas usinas;
- estados de loading, vazio, sem conexão e erro;
- atualização por gesto de pull-to-refresh.

#### Detalhe da usina

- nome e localização;
- status de comunicação;
- geração atual disponível;
- geração diária, semanal, mensal, anual e período personalizado;
- gráfico acessível com resumo textual;
- comparação com prognóstico quando suportada;
- potência de placas, quantidade de placas, fabricante e modelo do inversor;
- última sincronização e origem do dado;
- relatório de geração do período;
- impacto ambiental somente se a metodologia for aprovada pela área de negócio.

#### Alertas e notificações

- push opt-in;
- alertas de indisponibilidade ou baixa geração validados pelo backend;
- retorno ao detalhe correto por deep link;
- central de notificações no app;
- preferência por categoria de notificação;
- nenhuma informação sensível no texto da tela bloqueada.

#### Suporte básico

- contatos oficiais OnWay;
- acesso ao FAQ/base de conhecimento;
- botão para falar com atendimento pelos canais aprovados;
- consulta de chamados próprios pode entrar no MVP se o backend de ownership for concluído a tempo.

### 5.3 Pós-MVP do Cliente

- abertura e acompanhamento de chamado;
- anexar foto ou vídeo ao chamado;
- visualizar faturas, consumo, injeção e economia;
- aprovar ou recusar orçamento;
- visualizar agendamento de visita técnica;
- confirmar disponibilidade;
- avaliar atendimento;
- relatórios em PDF compartilháveis;
- widget iOS;
- notificações avançadas de desempenho;
- acesso compartilhado por membros da família/empresa;
- autenticação sem senha/passkeys, após avaliação.

### 5.4 Fora do MVP

- configuração de portais de fabricantes pelo cliente;
- edição técnica de prognóstico;
- edição de rateio de créditos;
- edição de contrato;
- comando remoto de inversor;
- promessa de telemetria em tempo real quando a coleta é periódica;
- exibição de dados de outros clientes por qualquer motivo.

---

## 6. Escopo funcional — Aplicativo do Técnico

### 6.1 Persona

Técnico de campo que precisa saber onde ir, o que executar, quais evidências coletar e como devolver o resultado ao operador, inclusive sob internet instável.

### 6.2 MVP recomendado

#### Autenticação e dispositivo

- login de usuário interno com perfil técnico ativo;
- sessão vinculada ao dispositivo;
- biometria opcional para reentrada;
- revogação remota da sessão;
- bloqueio imediato quando o usuário for inativado;
- registro do push token e versão instalada.

#### Minha agenda

- visualização “Hoje”, “Semana” e lista;
- somente agendamentos do técnico autenticado;
- O.S. com número, horário, usina, cidade, tipo, urgência e status;
- diferenciação de atrasada, próxima, em andamento e concluída;
- atualização por pull-to-refresh;
- agenda disponível offline após sincronização;
- deep link a partir de notificação.

#### Detalhe da O.S.

- número, status e urgência;
- data/horário e histórico de reagendamento;
- cliente e contato estritamente necessários ao atendimento;
- usina, endereço e coordenadas;
- botão “Abrir rota” no Apple Maps inicialmente;
- tipo e descrição do serviço;
- instruções internas;
- dados essenciais da usina/equipamentos;
- anexos previamente autorizados;
- vínculo com chamado sem expor dados internos desnecessários;
- histórico mínimo das ações de campo.

#### Execução em campo

- iniciar deslocamento;
- iniciar atendimento;
- pausar e retomar com motivo;
- cancelar/impedir atendimento somente conforme regra de negócio;
- preencher checklist item a item;
- observação e foto por item quando exigido;
- anexar fotos de antes/depois;
- registrar descrição do serviço realizado;
- registrar recomendações;
- selecionar serviços/peças utilizados, se aprovado para o MVP;
- capturar nome do responsável presente;
- capturar assinatura quando obrigatória;
- revisar tudo antes de concluir;
- concluir somente após validações obrigatórias do servidor.

#### Offline-first

- baixar agenda e O.S. atribuídas para uma janela definida, por exemplo hoje + próximos dias;
- guardar dados operacionais em banco local;
- guardar token somente no armazenamento seguro;
- criar fila local de mudanças com `mutation_id` único;
- mostrar claramente: sincronizado, pendente, sincronizando ou com conflito;
- nunca perder texto/checklist/foto quando o app for encerrado;
- enviar fotos em segundo plano quando possível;
- permitir nova tentativa manual;
- impedir conclusão duplicada;
- resolver conflito preservando a auditoria e informando o técnico.

O SQLite do Expo persiste dados entre reinicializações e é uma base apropriada para cache/fila offline, desde que tokens e segredos permaneçam fora dele: [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/).

#### Notificações

- nova O.S. atribuída;
- alteração ou cancelamento de agenda;
- lembrete de próxima visita;
- retorno de pendência/conflito de sincronização;
- deep link para a O.S.;
- processamento de receipts e remoção de tokens inválidos no backend.

### 6.3 Pós-MVP do Técnico

- roteirização otimizada por distância/tempo;
- localização durante deslocamento com consentimento e política clara;
- ETA para operador/cliente;
- leitura de QR Code do equipamento;
- leitura de número de série;
- estoque e peças;
- vídeos de evidência;
- chat com a central;
- chamada de vídeo;
- impressão/compartilhamento do relatório;
- coleta de avaliação do cliente;
- modo equipe com múltiplos técnicos na mesma O.S.

### 6.4 Fora do MVP

- mostrar a agenda de outros técnicos;
- permitir que o técnico se atribua qualquer O.S.;
- editar contrato, cliente ou configurações da usina;
- executar transição inválida apenas porque o app está offline;
- depender de conexão contínua para não perder trabalho de campo.

---

## 7. Requisitos da API Mobile

### 7.1 Princípios

- prefixo versionado: `/api/mobile/v1`;
- autenticação Bearer para apps nativos;
- autorização por identidade e ownership em todas as rotas;
- respostas específicas por caso de uso;
- não expor tabelas diretamente;
- IDs em UUID;
- datas em ISO 8601 com timezone;
- valores numéricos como números, com unidade explícita;
- envelope de erro estável: `code`, `message`, `details`, `request_id`;
- cursor para paginação;
- `Idempotency-Key` em mutações reexecutáveis;
- `version` ou ETag para concorrência otimista;
- OpenAPI como contrato versionado;
- compatibilidade de pelo menos uma versão anterior do app durante rollout.

### 7.2 Endpoints propostos — autenticação e dispositivos

```text
POST   /api/mobile/v1/auth/login
POST   /api/mobile/v1/auth/refresh
POST   /api/mobile/v1/auth/logout
POST   /api/mobile/v1/auth/logout-all
POST   /api/mobile/v1/auth/forgot-password
POST   /api/mobile/v1/auth/reset-password
GET    /api/mobile/v1/me
GET    /api/mobile/v1/me/sessions
DELETE /api/mobile/v1/me/sessions/:id
POST   /api/mobile/v1/devices
PATCH  /api/mobile/v1/devices/:id
DELETE /api/mobile/v1/devices/:id
```

Resposta de login deve distinguir `audience: client|technician`, permissões e vínculos, sem retornar hash, credenciais de portal ou dados administrativos.

### 7.3 Endpoints propostos — Cliente

```text
GET /api/mobile/v1/client/home
GET /api/mobile/v1/client/plants
GET /api/mobile/v1/client/plants/:id
GET /api/mobile/v1/client/plants/:id/generation?range=day|week|month|year
GET /api/mobile/v1/client/plants/:id/generation?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /api/mobile/v1/client/plants/:id/report?month=YYYY-MM
GET /api/mobile/v1/client/alerts
POST /api/mobile/v1/client/alerts/:id/read
GET /api/mobile/v1/client/faq
```

Pós-MVP:

```text
GET  /api/mobile/v1/client/tickets
POST /api/mobile/v1/client/tickets
GET  /api/mobile/v1/client/tickets/:id
POST /api/mobile/v1/client/tickets/:id/attachments
GET  /api/mobile/v1/client/invoices
GET  /api/mobile/v1/client/quotes
POST /api/mobile/v1/client/quotes/:id/decision
```

### 7.4 Endpoints propostos — Técnico

```text
GET  /api/mobile/v1/technician/agenda?from=&to=&cursor=
GET  /api/mobile/v1/technician/work-orders/:id
POST /api/mobile/v1/technician/work-orders/:id/transitions
PATCH /api/mobile/v1/technician/work-orders/:id/report
PATCH /api/mobile/v1/technician/work-orders/:id/checklist/:itemId
POST /api/mobile/v1/technician/work-orders/:id/attachments
POST /api/mobile/v1/technician/work-orders/:id/signature
POST /api/mobile/v1/technician/work-orders/:id/complete
POST /api/mobile/v1/technician/sync
```

Cada endpoint deve verificar no banco se `tecnico_programado_id = req.user.id` ou se existe atribuição ativa equivalente. Não basta o perfil ser `tecnico_campo`.

### 7.5 Alterações de modelo sugeridas

| Item | Finalidade |
|---|---|
| `usuario_clientes` | Usuário externo acessa um ou mais clientes |
| `agendamentos.tecnico_id` | Referência canônica ao técnico |
| `mobile_devices` | Plataforma, push token, versão, última atividade e revogação |
| `mobile_refresh_sessions` ou extensão de `user_sessions` | Distinguir app/dispositivo/audience |
| `mobile_mutations` | Idempotência e resultado de mutações offline |
| `ordens_servico.version` | Concorrência otimista |
| `os_assinaturas` | Assinante, timestamp, hash, arquivo e consentimento |
| metadados de anexo | MIME, tamanho, hash, autor, categoria e status de upload |
| preferências de notificação | Consentimento por canal/categoria |

### 7.6 Migração do checklist

Antes do app do Técnico:

1. escolher `os_checklist` como fonte canônica recomendada;
2. migrar/conciliar os checklists existentes no JSON;
3. expor itens com IDs estáveis;
4. registrar `updated_at`, autor e versão;
5. fazer o endpoint de conclusão validar a mesma fonte usada pelo app;
6. remover ou tornar o JSON apenas uma projeção derivada;
7. testar concorrência entre operador web e técnico mobile.

### 7.7 Arquivos e evidências

Para piloto pequeno, o filesystem existente pode ser mantido com backup e limites claros. Antes de produção ampla, avaliar object storage compatível com S3.

Requisitos mínimos:

- upload multipart e streaming;
- limite por arquivo e por O.S.;
- allowlist de MIME e validação real do conteúdo;
- nome gerado no servidor;
- hash SHA-256;
- remoção de metadados EXIF quando não necessários;
- URLs autenticadas ou temporárias;
- compressão de imagem no app;
- retry resumível ou idempotente;
- política de retenção e exclusão;
- backup testado;
- varredura antimalware conforme risco.

---

## 8. Requisitos não funcionais

### Segurança e privacidade

- TLS obrigatório;
- sem segredo de fabricante no app;
- sem senha ou token em logs;
- armazenamento seguro para refresh token;
- access token curto;
- refresh rotativo por dispositivo;
- revogação ao desativar usuário;
- proteção contra enumeração de IDs;
- testes automatizados de acesso cruzado;
- dados mínimos em push notification;
- consentimento para localização, câmera, fotos e notificações;
- política LGPD: finalidade, retenção, exportação, correção e exclusão;
- revisão dos SDKs de terceiros e dos dados enviados por eles;
- trilha auditável de assinatura e alterações de campo;
- pinning de certificado somente se houver plano operacional de rotação e recuperação.

A Apple exige política de privacidade e declaração precisa dos dados coletados, inclusive pelos SDKs integrados: [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/) e [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/). Se o app permitir criação de conta, deve oferecer início do processo de exclusão dentro do app: [Offering Account Deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/).

### Desempenho

- primeira tela útil em até 3 segundos em condição normal de rede;
- cache local da última visão válida;
- paginação e lazy loading;
- gráficos sem carregar série bruta desnecessária;
- imagens redimensionadas antes do upload;
- timeout, cancelamento e retry com backoff;
- indicar “dado de X minutos atrás”, sem mascarar stale data;
- monitorar latência p50/p95/p99 dos endpoints mobile.

### Disponibilidade e resiliência

- cliente: leitura da última informação em cache quando offline;
- técnico: leitura e mutações essenciais offline;
- fila persistente e idempotente;
- circuit breaker/retry nas integrações externas do backend;
- indisponibilidade do fabricante não deve impedir a abertura do app;
- readiness da API e alertas operacionais;
- backup e teste de restauração de anexos e banco.

### Acessibilidade

- VoiceOver em todos os fluxos principais;
- Dynamic Type sem truncar ações;
- contraste AA;
- alvo de toque adequado;
- não depender apenas de cor para status;
- labels e hints em ícones;
- alternativa textual para gráficos;
- foco correto em modais e erros;
- testes em tamanhos de fonte ampliados.

Antes da publicação, mapear e testar as tarefas comuns do app; a Apple orienta avaliar login, configurações e funcionalidades principais para as informações de acessibilidade da loja: [Accessibility Nutrition Labels](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels).

### Observabilidade

- crash reporting com sanitização de PII;
- eventos de produto aprovados e documentados;
- `request_id` do app ao backend;
- log de versão do app e versão da API;
- métricas de login, refresh, sync, upload e push;
- painel de falhas por versão;
- alertas para aumento de 401, 403, 409, 422 e 5xx;
- nunca registrar conteúdo completo de relatório, assinatura ou contato.

---

## 9. Organização recomendada do projeto mobile

```text
onway-mobile/
├── apps/
│   ├── client/                 # OnWay Cliente
│   └── technician/             # OnWay Técnico
├── packages/
│   ├── api-client/             # HTTP, auth, refresh, erros e OpenAPI types
│   ├── auth/                   # sessão e armazenamento seguro
│   ├── design-system/          # tokens e componentes compartilhados
│   ├── domain/                 # modelos e validações
│   ├── telemetry/              # gráficos e formatação de geração
│   ├── offline/                # SQLite, fila e sincronização
│   ├── notifications/          # registro e deep links
│   └── test-utils/
├── tooling/
│   ├── eslint/
│   ├── typescript/
│   └── scripts/
└── docs/
    ├── api-mobile-openapi.yaml
    ├── adr/
    └── release/
```

### Tecnologias sugeridas

- React Native + Expo;
- TypeScript estrito;
- Expo Router ou React Navigation, escolhendo apenas um;
- cliente de dados com cache e invalidação;
- gerenciador de estado local pequeno, sem duplicar estado de servidor;
- Zod ou equivalente para validar respostas nas fronteiras;
- Expo SecureStore para tokens;
- Expo SQLite para cache/fila offline do técnico;
- biblioteca de formulários e validação;
- biblioteca de testes unitários e React Native Testing Library;
- Maestro ou Detox para testes E2E, após spike técnico;
- EAS Build/Submit ou pipeline nativo equivalente.

Não fixar versões neste plano. Na Fase 2, selecionar versões estáveis e compatíveis, registrar a decisão e manter lockfile.

### Ambientes

- `development`: API local ou de desenvolvimento;
- `staging`: dados de teste e integrações controladas;
- `production`: API e credenciais de produção;
- nomes, bundle IDs, ícones e endpoints distintos;
- nunca permitir build de desenvolvimento apontar silenciosamente para produção.

---

## 10. Plano de desenvolvimento por fases

As estimativas abaixo são faixas para planejamento, não promessa de calendário. Dependem da quantidade de pessoas, das decisões de produto e da qualidade dos dados. Para uma pessoa acumulando mobile e backend, aumentar as durações e evitar desenvolver os dois apps em paralelo.

### Fase 0 — Descoberta, decisões e contrato do MVP

**Objetivo:** remover ambiguidades antes do design detalhado e da implementação.

**Duração indicativa:** 1 a 2 semanas.

#### Tarefas

- [ ] confirmar responsáveis por produto, backend, mobile, design e publicação;
- [ ] confirmar dois apps versus app único;
- [ ] definir nomes comerciais e bundle IDs provisórios;
- [ ] definir público do piloto;
- [ ] escolher exatamente quais itens entram no MVP Cliente;
- [ ] escolher exatamente quais itens entram no MVP Técnico;
- [ ] definir regra oficial de status da usina;
- [ ] definir tempo máximo para uma leitura ser considerada atual;
- [ ] definir métricas confiáveis por fabricante;
- [ ] definir poderes de reagendamento/cancelamento do técnico;
- [ ] definir fotos e checklist obrigatórios por serviço;
- [ ] definir necessidade e valor jurídico da assinatura;
- [ ] definir janela offline da agenda;
- [ ] definir retenção de fotos, assinatura e localização;
- [ ] mapear dados pessoais e bases legais LGPD;
- [ ] confirmar estratégia de conta Apple Developer da empresa;
- [ ] criar ADRs das decisões estruturais;
- [ ] criar matriz “funcionalidade × app × fase”.

#### Entregáveis

- visão de produto aprovada;
- lista fechada do MVP;
- mapa de jornadas;
- decisões de identidade e autorização;
- riscos priorizados;
- critérios de sucesso do piloto.

#### Critério de saída

Não restam dúvidas que alterem a arquitetura, o modelo de identidade ou as telas principais.

---

### Fase 1 — UX, prototipação e design system no Figma

**Objetivo:** transformar a prototipação simples já iniciada em especificação navegável e testável.

**Duração indicativa:** 2 a 4 semanas, com validações semanais.

#### Fundação no Figma

- [ ] organizar arquivo por `Foundations`, `Components`, `Client`, `Technician` e `Prototype`;
- [ ] importar/recriar a identidade OnWay sem copiar componentes web literalmente;
- [ ] definir cores semânticas: sucesso, atenção, erro, offline e sem dados;
- [ ] definir tipografia compatível com Dynamic Type;
- [ ] definir escala de espaçamento e grid;
- [ ] definir radius, elevação, bordas e ícones;
- [ ] criar light mode e dark mode somente se ambos entrarem no MVP;
- [ ] criar componentes com variants e auto layout;
- [ ] documentar acessibilidade e comportamento, não apenas aparência.

#### Telas do Cliente no Figma

- [ ] splash/initial load;
- [ ] convite/ativação;
- [ ] login, esqueci a senha e redefinição;
- [ ] início com uma usina;
- [ ] início com múltiplas usinas;
- [ ] lista de usinas;
- [ ] detalhe e gráficos;
- [ ] seleção de período;
- [ ] alertas/notificações;
- [ ] perfil, privacidade e sessões;
- [ ] suporte/FAQ;
- [ ] estados vazio, loading, erro, offline, dado desatualizado e sem permissão.

#### Telas do Técnico no Figma

- [ ] login;
- [ ] agenda de hoje;
- [ ] agenda semanal/lista;
- [ ] detalhe da O.S.;
- [ ] navegação/endereço;
- [ ] alteração de status;
- [ ] checklist;
- [ ] captura e revisão de fotos;
- [ ] relatório e recomendações;
- [ ] assinatura, se aprovada;
- [ ] revisão/conclusão;
- [ ] fila de sincronização;
- [ ] conflito e retry;
- [ ] estados offline e sessão revogada.

#### Validação

- [ ] protótipo clicável dos dois fluxos principais;
- [ ] teste com pelo menos 5 clientes representativos;
- [ ] teste com pelo menos 5 técnicos/operadores;
- [ ] registrar problemas, severidade e correções;
- [ ] validar legibilidade sob sol e uso com uma mão para o Técnico;
- [ ] revisar com fontes grandes e VoiceOver conceitualmente;
- [ ] fechar conteúdo textual e mensagens de erro.

#### Critério de saída

Protótipo aprovado, componentes documentados e todos os estados excepcionais desenhados.

---

### Fase 2 — Fundação técnica mobile e contrato OpenAPI

**Objetivo:** criar o projeto que sustentará ambos os apps sem ainda depender de telas completas.

**Duração indicativa:** 1 a 2 semanas.

#### Tarefas mobile

- [ ] criar repositório/monorepo separado do portal atual;
- [ ] configurar TypeScript estrito;
- [ ] criar os dois apps e pacotes compartilhados;
- [ ] configurar aliases, lint, format e hooks de qualidade;
- [ ] configurar ambientes e variáveis públicas;
- [ ] criar design tokens a partir do Figma;
- [ ] configurar navegação e deep links;
- [ ] implementar error boundary e tela de manutenção;
- [ ] definir estratégia de estado servidor/local;
- [ ] criar cliente HTTP com timeout, cancelamento e request ID;
- [ ] criar mocks contratuais a partir do OpenAPI;
- [ ] criar pipeline de testes e build iOS de desenvolvimento;
- [ ] validar app em simulador e iPhone físico.

#### Tarefas de contrato

- [ ] escrever OpenAPI da autenticação mobile;
- [ ] escrever OpenAPI do app Cliente;
- [ ] escrever OpenAPI do app Técnico;
- [ ] definir códigos de erro;
- [ ] definir versionamento e depreciação;
- [ ] gerar tipos TypeScript a partir do contrato;
- [ ] criar mock server para o mobile avançar sem bloquear no backend.

#### Critério de saída

Os dois shells abrem em iOS, usam componentes compartilhados e navegam contra uma API simulada tipada.

---

### Fase 3 — Backend mobile: identidade, segurança e escopo

**Objetivo:** preparar uma fronteira segura antes de expor dados reais.

**Duração indicativa:** 3 a 5 semanas.

#### Tarefas

- [ ] adicionar audience/client type às identidades;
- [ ] criar vínculo `usuario_clientes`;
- [ ] migrar/ligar técnicos a `usuarios.id`;
- [ ] criar `agendamentos.tecnico_id` e backfill validado;
- [ ] criar fluxo de convite/ativação de cliente;
- [ ] criar recuperação de senha com token de uso único;
- [ ] implementar login/refresh/logout Bearer para mobile;
- [ ] armazenar apenas hash de refresh token;
- [ ] registrar dispositivo e push token;
- [ ] implementar revogação por dispositivo;
- [ ] criar middleware de audience;
- [ ] criar policy de ownership do cliente;
- [ ] criar policy de atribuição do técnico;
- [ ] implementar `/me` mobile;
- [ ] manter auth web atual compatível;
- [ ] documentar ameaças e controles;
- [ ] criar testes de acesso horizontal/vertical;
- [ ] criar rate limits por rota/identidade/dispositivo;
- [ ] garantir auditoria sem PII desnecessária;
- [ ] publicar OpenAPI de staging.

#### Testes obrigatórios

- cliente A tenta acessar usina de B: 404/403 sem vazamento;
- técnico A tenta acessar O.S. de B: bloqueado;
- token de Cliente tenta rota de Técnico: bloqueado;
- refresh reutilizado: família revogada;
- dispositivo revogado: refresh recusado;
- usuário inativado: acesso interrompido;
- UUID válido inexistente e UUID de terceiro não revelam informações diferentes;
- endpoints antigos continuam atendendo o portal web.

#### Critério de saída

Auditoria de segurança funcional aprovada e nenhuma rota mobile depende de filtro feito apenas no app.

---

### Fase 4 — Backend e app iOS do Cliente

**Objetivo:** entregar o primeiro produto vertical completo.

**Duração indicativa:** 4 a 6 semanas.

#### Backend

- [ ] endpoint de resumo/home do cliente;
- [ ] lista de usinas com ownership;
- [ ] detalhe da usina com campos aprovados;
- [ ] histórico agregado por período;
- [ ] estado de comunicação e stale threshold;
- [ ] relatórios próprios;
- [ ] alertas próprios;
- [ ] preferências de notificação;
- [ ] cache e índices necessários;
- [ ] testes de carga dos gráficos;
- [ ] proteção contra intervalos excessivos.

#### Mobile Cliente

- [ ] login, ativação e recuperação;
- [ ] sessão segura e renovação silenciosa;
- [ ] home;
- [ ] lista/seletor de usina;
- [ ] detalhe e gráficos;
- [ ] status de última leitura;
- [ ] alertas;
- [ ] perfil e sessões;
- [ ] política/privacidade;
- [ ] suporte/FAQ;
- [ ] cache de leitura;
- [ ] estados offline/erro/vazio;
- [ ] analytics mínimos e crash reporting sanitizado;
- [ ] testes unitários, integração e E2E principais;
- [ ] acessibilidade no fluxo completo.

#### Critério de saída

Cliente piloto consegue instalar, autenticar, visualizar somente suas usinas e compreender status/geração sem ajuda do desenvolvedor.

---

### Fase 5 — Piloto do Cliente no TestFlight

**Objetivo:** validar produto e operação antes da loja pública.

**Duração indicativa:** 2 a 3 semanas.

#### Tarefas

- [ ] criar app e grupo no App Store Connect;
- [ ] preparar builds Development, Preview e Production;
- [ ] criar grupo interno no TestFlight;
- [ ] executar checklist de smoke em iPhones suportados;
- [ ] convidar grupo piloto controlado;
- [ ] monitorar crash-free sessions, login e latência;
- [ ] coletar feedback estruturado;
- [ ] corrigir bloqueadores e problemas de entendimento;
- [ ] validar textos de status com suporte/pós-venda;
- [ ] validar privacidade, screenshots e metadados;
- [ ] realizar go/no-go.

O fluxo oficial do Expo cobre build de produção, envio e distribuição via TestFlight: [Create a production build for iOS](https://docs.expo.dev/tutorial/eas/ios-production-build/).

#### Critério de saída

Piloto cumpre os indicadores definidos na Fase 0, sem incidente de autorização ou perda de sessão relevante.

---

### Fase 6 — Backend de campo e sincronização offline

**Objetivo:** preparar a operação segura do app Técnico.

**Duração indicativa:** 4 a 6 semanas.

#### Tarefas de modelo e domínio

- [ ] consolidar checklist em uma fonte canônica;
- [ ] criar IDs estáveis para itens;
- [ ] versionar O.S. e checklist;
- [ ] implementar `minha agenda`;
- [ ] implementar detalhe escopado da O.S.;
- [ ] reforçar atribuição em toda mutação;
- [ ] implementar transições com idempotência;
- [ ] implementar relatório parcial/autosave;
- [ ] implementar upload idempotente de evidências;
- [ ] implementar assinatura, se aprovada;
- [ ] implementar conclusão atômica;
- [ ] criar sync batch com resultados por mutation ID;
- [ ] definir matriz de conflito por campo;
- [ ] impedir dupla conclusão;
- [ ] sincronizar operador web e mobile;
- [ ] enviar eventos de push ao atribuir/reagendar/cancelar;
- [ ] implementar receipts e limpeza de push tokens.

#### Regras de conflito sugeridas

| Campo | Estratégia inicial |
|---|---|
| status da O.S. | máquina de estados autoritativa no servidor |
| checklist | merge por item + versão; conflito explícito quando mesmo item mudou |
| relatório textual | versão/ETag; preservar ambas as versões em conflito |
| anexos | aditivos e idempotentes por hash/mutation ID |
| agendamento | operador/servidor autoritativo; técnico recebe atualização |
| conclusão | operação única, transacional e idempotente |

#### Critério de saída

Uma suíte automatizada comprova execução online, perda de rede, reabertura do app, retry e sincronização sem duplicar ações.

---

### Fase 7 — App iOS do Técnico

**Objetivo:** entregar a jornada de campo completa em iPhone.

**Duração indicativa:** 5 a 7 semanas.

#### Tarefas

- [ ] autenticação e proteção da sessão;
- [ ] agenda Hoje/Semana;
- [ ] cache local e bootstrap de sync;
- [ ] detalhe da O.S.;
- [ ] Apple Maps;
- [ ] transições de status;
- [ ] checklist offline;
- [ ] câmera/galeria e compressão;
- [ ] upload em fila;
- [ ] relatório e autosave;
- [ ] assinatura, se aprovada;
- [ ] revisão e conclusão;
- [ ] indicador de sync global e por O.S.;
- [ ] tela de pendências/conflitos;
- [ ] push notifications e deep links;
- [ ] recovery após force close;
- [ ] testes com modo avião e rede degradada;
- [ ] testes de bateria e armazenamento;
- [ ] acessibilidade e uso sob luz intensa;
- [ ] E2E da jornada crítica.

Push notifications exigem build de desenvolvimento/produção e integração com APNs/FCM; não devem ser validadas apenas no Expo Go. Referência: [Expo Push Notifications](https://docs.expo.dev/push-notifications/overview/).

#### Critério de saída

Técnico executa uma O.S. completa, fica offline, fecha o app, reabre, sincroniza e o operador vê o resultado correto e auditado.

---

### Fase 8 — Piloto Técnico e publicação iOS

**Objetivo:** validar operação real e publicar os apps aprovados.

**Duração indicativa:** 3 a 5 semanas.

#### Piloto Técnico

- [ ] selecionar poucos técnicos e tipos de serviço;
- [ ] treinamento curto e roteiro de suporte;
- [ ] rodar em paralelo com processo atual por período definido;
- [ ] testar locais com baixa conectividade;
- [ ] medir tempo de execução e taxa de sync;
- [ ] verificar qualidade das fotos e relatórios;
- [ ] coletar falhas por etapa;
- [ ] corrigir bloqueadores;
- [ ] ampliar gradualmente o grupo.

#### Preparação App Store

- [ ] Apple Developer Program em nome da empresa;
- [ ] certificados, perfis, App IDs e APNs;
- [ ] nome, subtítulo, descrição e palavras-chave;
- [ ] ícone e screenshots reais;
- [ ] URL de suporte;
- [ ] URL e tela interna de privacidade;
- [ ] declaração de dados coletados e SDKs;
- [ ] justificativas de câmera, fotos, Face ID, localização e notificações;
- [ ] conta de demonstração funcional para App Review;
- [ ] instruções claras para o revisor acessar os fluxos;
- [ ] classificação etária;
- [ ] export compliance;
- [ ] política de exclusão de conta;
- [ ] accessibility labels após testes;
- [ ] build final sem endpoints/debug de staging;
- [ ] plano de rollback e feature flags no backend;
- [ ] envio para revisão;
- [ ] lançamento gradual/manual.

#### Critério de saída

Apps aprovados, monitorados e com processo documentado de incidente, rollback e nova versão.

---

### Fase 9 — Android

**Objetivo:** levar os produtos estabilizados ao Android sem tratar a plataforma como simples recompilação.

**Duração indicativa:** 4 a 7 semanas para ambos, dependendo das diferenças encontradas.

#### Tarefas

- [ ] definir versões mínimas e matriz de aparelhos;
- [ ] criar package IDs e projetos no Google Play Console;
- [ ] revisar navegação/back button;
- [ ] revisar permissões de notificações, câmera, fotos e localização;
- [ ] configurar FCM;
- [ ] validar SecureStore/Keystore e backup;
- [ ] validar SQLite e fila offline;
- [ ] revisar seleção de arquivos e câmera por fabricante;
- [ ] testar uploads em aparelhos de pouca memória;
- [ ] revisar gráficos, teclado e fontes;
- [ ] adaptar componentes realmente específicos com `.android.tsx` quando necessário;
- [ ] configurar assinatura e Play App Signing;
- [ ] testes internos/fechados;
- [ ] preencher Data Safety;
- [ ] publicação gradual;
- [ ] monitorar ANRs, crashes e fragmentação.

#### Critério de saída

Paridade funcional aprovada, sem assumir paridade visual pixel a pixel com iOS.

---

## 11. Estratégia de testes

### Pirâmide

#### Unitários

- formatadores de energia, potência, datas e status;
- regras de stale data;
- máquina de sync local;
- redutores/estado de autenticação;
- merge e conflito de checklist;
- validações de formulário;
- mapeamento DTO → view model.

#### Integração

- login/refresh/logout;
- cache e refetch;
- ownership do cliente;
- atribuição do técnico;
- transições de O.S.;
- upload e retry;
- conclusão transacional;
- push token lifecycle;
- migrações do SQLite local.

#### E2E mobile

Cliente:

- ativar → entrar → selecionar usina → visualizar gráfico → sair;
- sessão expirada durante uso;
- sem dados de telemetria;
- offline com cache;
- tentativa de deep link sem acesso.

Técnico:

- entrar → agenda → O.S. → deslocamento → execução → checklist → foto → conclusão;
- modo avião durante checklist;
- force close antes de sincronizar;
- upload falha e é retomado;
- agenda é alterada pelo operador;
- conflito de versão;
- sessão revogada com dados locais pendentes.

#### Backend/security

- testes de autorização negativos em toda rota;
- mass assignment;
- enumeração de IDs;
- rate limit;
- replay de refresh token;
- replay de mutation ID;
- MIME falso e arquivo excessivo;
- injection em filtros;
- intervalos de data abusivos;
- logs sem token/PII;
- compatibilidade com o portal web.

### Matriz mínima iOS

- menor iPhone suportado pelo layout;
- modelo de tela padrão atual;
- modelo Pro/Max;
- versão mínima de iOS suportada;
- versão atual de iOS;
- fonte padrão e tamanhos grandes;
- light/dark conforme escopo;
- Wi-Fi, 4G/5G, rede lenta e modo avião;
- câmera, notificações e Face ID em aparelho físico.

---

## 12. Definition of Done

Uma funcionalidade só está concluída quando:

- [ ] critérios de aceite foram atendidos;
- [ ] telas normal, loading, vazio, erro e offline foram tratadas;
- [ ] autorização foi implementada no servidor;
- [ ] contrato OpenAPI foi atualizado;
- [ ] tipos do app foram regenerados;
- [ ] testes unitários e de integração passam;
- [ ] jornada crítica E2E foi atualizada quando aplicável;
- [ ] acessibilidade foi revisada;
- [ ] logs não contêm PII/segredos;
- [ ] eventos e métricas foram documentados;
- [ ] observabilidade está disponível em staging;
- [ ] produto/design homologaram;
- [ ] documentação de suporte foi atualizada;
- [ ] não houve regressão no portal web.

---

## 13. Indicadores de sucesso

### Cliente

- taxa de ativação do convite;
- sucesso de login;
- tempo até visualizar a primeira usina;
- usuários ativos semanais/mensais;
- taxa de erro ao carregar geração;
- percentual de dados exibidos dentro do freshness SLA;
- redução de contatos “minha usina está funcionando?”;
- crash-free sessions;
- satisfação do piloto.

### Técnico

- O.S. abertas no app / O.S. atribuídas;
- conclusão sem intervenção do operador;
- tempo médio por etapa;
- mutações sincronizadas na primeira tentativa;
- tempo médio de permanência na fila offline;
- uploads concluídos;
- conflitos por 100 O.S.;
- checklists completos;
- retrabalho por informação ausente;
- crash-free sessions e ANR no Android.

### Backend

- latência p95 por endpoint;
- 401/403/409/422/5xx por versão;
- refresh failures;
- push delivery receipts;
- jobs de telemetria dentro do SLA;
- incidentes de acesso indevido: meta zero.

---

## 14. Riscos e mitigação

| Risco | Impacto | Mitigação |
|---|---|---|
| Expor CRUD genérico ao cliente | Vazamento de dados | API mobile específica + ownership + testes negativos |
| Técnico identificado por nome | Acesso/atribuição incorreta | FK canônica por `usuario_id` e backfill auditado |
| Duplicidade de checklist | Conclusão inconsistente | Uma fonte canônica antes do app Técnico |
| Cookie/CSRF do web no native | Sessões frágeis | Auth mobile Bearer mantendo web intacto |
| Internet ruim em campo | Perda de trabalho | SQLite, fila persistente, idempotência e UX de sync |
| Fotos grandes | Falhas e custo | Compressão, limite, upload resiliente e storage adequado |
| Dados de fabricante atrasados | Cliente interpreta falha errada | Exibir timestamp/fonte e regra de stale data |
| Docs antigas divergirem do código | Planejamento incorreto | Código/migrations/OpenAPI como fonte operacional |
| Dois apps dobrarem releases | Custo operacional | Monorepo e pacotes compartilhados, pipelines separados |
| Publicação travada por privacidade | Atraso | Preparar LGPD/App Privacy desde a Fase 0 |
| Escopo crescer durante construção | Atraso geral | MVP fechado, backlog pós-MVP e go/no-go por fase |
| Mudança web quebrar mobile antigo | Usuários bloqueados | API versionada e janela de compatibilidade |
| Assinatura sem validade definida | Risco jurídico | Parecer e política antes de implementar |

---

## 15. Dependências e caminho crítico

```text
Decisões do MVP
      ↓
Figma validado ───────────────┐
      ↓                       │
OpenAPI + fundação mobile     │
      ↓                       │
Identidade/ownership backend  │
      ↓                       │
App Cliente iOS → piloto      │
                              │
Checklist + sync backend ◀────┘
      ↓
App Técnico iOS → piloto
      ↓
Publicação iOS
      ↓
Adaptação e publicação Android
```

O caminho crítico não é a criação das telas. É a definição segura de identidade, ownership, atribuição do técnico e sincronização offline.

---

## 16. Ordem prática recomendada para começar no Mac

1. Baixar este documento e o protótipo Figma.
2. Fechar as decisões da Fase 0.
3. Finalizar primeiro o fluxo Cliente no Figma e, em seguida, o fluxo Técnico.
4. Criar um repositório mobile separado; não colocar o app dentro do deploy atual sem decisão arquitetural.
5. Criar os dois shells iOS e o design system compartilhado.
6. Escrever o OpenAPI mobile e usar mock server.
7. Implementar autenticação/ownership no backend de staging.
8. Entregar o Cliente de ponta a ponta e pilotar no TestFlight.
9. Consolidar checklist, atribuição e sync.
10. Entregar o Técnico e pilotar em campo.
11. Publicar iOS após métricas e privacidade aprovadas.
12. Adaptar e validar Android.

---

## 17. Checklist antes de escrever código mobile

- [ ] dois apps ou app único decidido;
- [ ] nomes e bundle IDs reservados;
- [ ] conta Apple da empresa disponível;
- [ ] MVP de cada app assinado pelo produto;
- [ ] protótipo Figma testado;
- [ ] status/freshness da usina definido;
- [ ] identidade do cliente desenhada;
- [ ] atribuição do técnico por UUID definida;
- [ ] política offline definida;
- [ ] fonte canônica do checklist escolhida;
- [ ] assinatura decidida;
- [ ] política de fotos e retenção definida;
- [ ] OpenAPI inicial aprovado;
- [ ] staging isolado disponível;
- [ ] dados de teste sem PII real disponíveis;
- [ ] plano LGPD/App Privacy iniciado;
- [ ] indicadores de piloto definidos.

---

## 18. Resultado esperado ao final

Ao concluir este plano, a OnWay terá:

- dois aplicativos iOS publicados e operáveis;
- base compartilhada pronta para Android;
- cliente vendo apenas suas usinas e dados confiáveis;
- técnico controlando sua própria agenda e execução de campo;
- operação tolerante à falta de internet;
- backend mobile versionado, documentado e seguro;
- rastreabilidade de ações, checklist, fotos e conclusão;
- processo repetível de build, TestFlight, publicação e monitoramento;
- preservação do portal web do operador como ferramenta administrativa e de pós-venda.

---

## 19. Observações finais da análise

1. A documentação histórica do repositório ainda contém trechos que descrevem o sistema como mock/protótipo. O código atual, as migrations e as rotas mostram que PostgreSQL, autenticação e vários fluxos já são reais. Para o mobile, considerar **código + migrations + contrato OpenAPI futuro** como fontes de verdade.
2. A telemetria não é necessariamente “tempo real”; hoje é coletada periodicamente. A interface deve comunicar última atualização e não prometer instantaneidade.
3. O app do Cliente pode ser desenvolvido primeiro com cache de leitura simples. O app do Técnico exige uma arquitetura offline muito mais cuidadosa e não deve ser tratado como apenas outra interface visual.
4. O portal existente deve continuar como sistema administrativo. Os apps devem consumir casos de uso próprios, e não replicar todas as telas web.
5. A primeira publicação deve passar pelo TestFlight. A própria Apple determina que versões beta sejam distribuídas por TestFlight, não como app público de teste: [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).

