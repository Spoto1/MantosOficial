# Mantos Oficial

Base Next.js + Prisma do storefront e painel operacional da Mantos Oficial.

## Mapa rápido

- Storefront customer-facing: `app/` fora de `app/admin`, com UI em `components/` e estado client-side em `providers/`.
- Admin operacional: `app/admin/*` com componentes dedicados em `components/admin/*`.
- Backend e persistência: `app/api/*`, `lib/actions/*`, `lib/auth/*`, `lib/repositories/*`, `lib/storage/*`, `lib/prisma.ts` e `prisma/*`.
- Shared: utilitários, tipos e regras reaproveitadas em `lib/*.ts`.
- Scripts locais e QA: `scripts/`.
- Documentação operacional e contexto para bots: `docs/`.

Decisão arquitetural importante:

- `app/` permanece na raiz por segurança, porque o projeto usa Next.js App Router e a reorganização física dessa pasta seria desnecessariamente arriscada.
- A separação frontend/backend/shared desta passada é incremental e documentada em [`PROJECT_MAP.md`](./PROJECT_MAP.md).

## Documentação

- Índice geral: [`docs/INDEX.md`](./docs/INDEX.md)
- Mapa estrutural do projeto: [`PROJECT_MAP.md`](./PROJECT_MAP.md)
- Stripe e ativação: [`docs/payments/stripe-activation.md`](./docs/payments/stripe-activation.md)
- Deploy e go-live: [`docs/deploy/release-readiness.md`](./docs/deploy/release-readiness.md)
- Workflow e orquestração: [`docs/workflows/workflow.md`](./docs/workflows/workflow.md)
- Playbooks/checklists para bots: [`docs/agents/AGENTS_INDEX.md`](./docs/agents/AGENTS_INDEX.md)

## Scripts úteis

- Abrir storefront/admin local em uma porta detectada: `npm run local:open`
- QA browser do admin: `npm run qa:admin:browser`
- QA browser do storefront: `npm run qa:storefront:browser`
- QA HTTP do storefront: `npm run qa:storefront:http`
- Índice dos scripts: [`scripts/README.md`](./scripts/README.md)

## Rodando localmente

1. Instale dependências:
   `npm install`
2. Ajuste o `.env` a partir de `.env.example`.
3. Gere o client Prisma e aplique migrations:
   `npx prisma generate`
   `npx prisma migrate dev`
4. Suba a aplicação:
   `npm run dev`

## Preview local coerente

- Em desenvolvimento local, deixe `APP_URL` e `NEXT_PUBLIC_APP_URL` vazios por padrão.
- O runtime passa a usar a origem ativa do preview local para metadata, canonicals e retornos guiados quando o acesso vier por `localhost`, `127.0.0.1` ou IP privado de rede local.
- Se você quiser travar um host público real de staging, defina `APP_URL` e `NEXT_PUBLIC_APP_URL` com a mesma origem e mantenha esse valor sincronizado com o preview usado.
- Se Stripe ainda nao estiver configurado nesse ambiente, use `ALLOW_LOCAL_DEMO_CHECKOUT=true` apenas no ambiente local para revisar checkout, success, pending e failure sem cobranca real.
- Esse retorno guiado continua disponível em `npm run dev` e também em `next start` local, mas permanece bloqueado em qualquer ambiente público.
- Em produção, continue definindo a URL pública real e não use o checkout demo como substituto operacional.

## Preview de build

- Para validar a aplicação mais perto do deploy:
  `npm run build`
  `npm run start`
- O preview local em `next start` continua respeitando a origem ativa quando `APP_URL` e `NEXT_PUBLIC_APP_URL` estiverem vazios.
- Se quiser validar canonicals, callbacks e metadata contra uma origem pública de staging, defina `APP_URL` e `NEXT_PUBLIC_APP_URL` exatamente com a mesma URL.

## Envs essenciais

- `DATABASE_URL`: conexão PostgreSQL.
- `APP_URL`: URL pública server-side preferencial.
- `NEXT_PUBLIC_APP_URL`: URL pública usada no client e metadados. Quando uma delas estiver preenchida, as duas devem apontar para a mesma origem pública.
- `ENFORCE_PUBLIC_APP_URL`: opcional para forçar a validação rígida da URL pública em deploys self-hosted ou pipelines próprios.
- `ADMIN_SESSION_SECRET`: obrigatório em produção.
- `ADMIN_PASSWORD`: senha do bootstrap admin.
- `ENABLE_ADMIN_BOOTSTRAP`: em produção só habilita bootstrap durante onboarding controlado.
- `STRIPE_SECRET_KEY`: chave secreta da conta Stripe correta do projeto. Ativa o checkout online somente quando o pareamento Stripe estiver completo.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: chave pública da mesma conta Stripe. Deve existir junto da secret key e na mesma modalidade (`test` ou `live`).
- `STRIPE_WEBHOOK_SECRET`: segredo do endpoint `POST /api/webhooks/stripe`. Use o valor `whsec_...` do endpoint e mantenha um segredo diferente por ambiente.
- `STRIPE_PAYMENT_METHOD_TYPES`: opcional para limitar meios do Stripe Checkout por ambiente.
- `ALLOW_LOCAL_DEMO_CHECKOUT`: libera checkout demo apenas fora de produção e somente quando Stripe ainda não estiver configurado nesse ambiente.
- `STORAGE_DRIVER`: atualmente `local`.
- `STORAGE_PUBLIC_BASE_URL`: host público do storage externo quando existir.
- `NEXT_IMAGE_REMOTE_HOSTS`: lista de hosts remotos permitidos para `next/image`.

Importante:
- Stripe e o gateway definitivo do projeto;
- nao adicione variaveis `MERCADO_PAGO_*` ou caminhos paralelos de gateway para evitar configuracao morta e ambigua;
- nao use a conta Stripe conectada ao plugin do Codex como conta operacional da loja sem confirmacao explicita.

## Credenciais e dados de validação local

- O seed demo cria o cliente `cliente@mantos-preview.test` com a senha `Mantos2026!` e pedidos vinculados.
- Se a base local já tiver sido usada antes dessa melhoria, atualize a senha desse cliente no banco ou rode `npm run prisma:seed:demo` em um banco local de homologação.
- O seed demo também cria pedidos, favoritos, FAQ e campanhas suficientes para validar home, coleção, conta, detalhe do pedido, rastreio e pós-compra.

## Seeds

- `npm run prisma:seed`: seed incremental e não-destrutivo. Só cria catálogo/cupom faltantes.
- `npm run prisma:seed:demo`: reset destrutivo para demo local. Use apenas com banco loopback.

O modo demo-reset é bloqueado em produção e exige confirmação explícita.

## Cuidados de produção

- Não publique com `APP_URL` ou `NEXT_PUBLIC_APP_URL` apontando para `localhost`.
- Não publique com `APP_URL` e `NEXT_PUBLIC_APP_URL` divergentes.
- Deploys hospedados comuns já disparam a validação rígida da URL pública automaticamente; em produção self-hosted, defina `ENFORCE_PUBLIC_APP_URL=true`.
- Nao publique Stripe ativo com apenas uma das chaves (`STRIPE_SECRET_KEY` ou `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`).
- Nao publique Stripe ativo com `STRIPE_SECRET_KEY` `test` e `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` `live` ou o inverso.
- Nao publique Stripe ativo sem `STRIPE_WEBHOOK_SECRET`.
- O checkout demo local não substitui operação real: em produção ele permanece bloqueado mesmo que `ALLOW_LOCAL_DEMO_CHECKOUT=true`.
- O bootstrap admin por variável não deve ser tratado como backdoor permanente. Em produção ele depende de `ENABLE_ADMIN_BOOTSTRAP=true` e deixa de funcionar quando já existe admin ativo no banco.
- Uploads continuam funcionando em disco local, mas agora passam por uma camada de provider preparada para migração a S3/R2/Supabase Storage.
- Configure `NEXT_IMAGE_REMOTE_HOSTS` antes de usar imagens remotas de campanhas ou storage externo.
- Nao trate o checkout demo local como substituto da ativacao real da conta Stripe correta.

## Validação básica

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test:smoke`

## Checklists operacionais

- Ativação Stripe: [`docs/payments/stripe-activation.md`](./docs/payments/stripe-activation.md)
- Release readiness, smoke publicado e go-live: [`docs/deploy/release-readiness.md`](./docs/deploy/release-readiness.md)

## Operação mínima

- Healthcheck: `GET /api/health`
- Entrada do checkout: `POST /api/checkout/create-session`
- Webhook Stripe: `POST /api/webhooks/stripe`
- Favoritos: exigem sessão autenticada do cliente

O healthcheck agora devolve um resumo operacional em `payments` com:
- se há configuração Stripe parcial;
- se o checkout está realmente pronto para abrir sessão;
- modalidade detectada (`test` ou `live`);
- issue textual quando falta pareamento, segredo de webhook ou alinhamento de URL.

## Pagamento Stripe

Stripe e o gateway definitivo da loja.

Pronto hoje:
- criação de pedido pendente antes do redirecionamento;
- cálculo de frete, cupom e resumo do checkout;
- criação de Stripe Checkout Session no servidor;
- telas de `success`, `pending` e `failure` alinhadas ao pós-compra;
- detalhe do pedido, área da conta e rastreio coerentes com a reconciliação do pagamento;
- reconciliação por sessão e webhook Stripe com idempotência básica;
- fluxo demo local controlado para QA sem cobrança real quando Stripe ainda não está configurado.

Arquitetura atual:
- o catálogo e os preços continuam vindo do banco local;
- o checkout monta os line items com `price_data` inline em `lib/repositories/orders.ts`;
- hoje a ativação real nao depende de `price_id` persistido por SKU no dashboard da Stripe;
- se a operação quiser catálogo de produtos/preços mantido diretamente na Stripe, isso exige uma rodada separada de refatoração.

O que ainda depende da conta Stripe correta:
- preencher `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` e `STRIPE_WEBHOOK_SECRET` com a conta operacional da loja;
- configurar `APP_URL` e `NEXT_PUBLIC_APP_URL` com a origem pública definitiva;
- cadastrar o endpoint publicado `POST /api/webhooks/stripe` no dashboard da conta correta;
- validar ponta a ponta pagamento aprovado, pendente, cancelado e falho em ambiente real;
- conferir atualização automática de status em conta, detalhe do pedido, rastreio e admin após webhook real.

Observações importantes:
- a base atual já separa storefront, criação do pedido pendente, pós-compra e reconciliação; por isso a ativação real acontece na fronteira do checkout, não na experiência do cliente;
- o projeto usa `price_data` inline para montar os line items do Checkout Session; não depende de `price_id` persistido por SKU para go-live;
- o webhook relevante para o fluxo atual é `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed` e `checkout.session.expired`;
- o endpoint público deve ser criado em Workbench > Webhooks > Account com HTTPS e segredo próprio por ambiente;
- nao use `ALLOW_LOCAL_DEMO_CHECKOUT` como substituto de operação real;
- nao plugar a loja em uma conta provisoria apenas para "fazer funcionar";
- o guia de ativação está em [`docs/payments/stripe-activation.md`](./docs/payments/stripe-activation.md).
