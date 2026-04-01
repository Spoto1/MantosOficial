# Project Map

Mapa rápido da base para quem entrar depois, humano ou bot.

## Estrutura estável

- `app/`: camada de rotas do Next.js App Router.
- `components/`: UI reutilizável do storefront e do admin.
- `providers/`: providers client-side do carrinho e da sessão do cliente.
- `lib/`: regra de negócio, auth, repositórios, integrações, utilitários e tipos.
- `prisma/`: schema, migrations e seed.
- `scripts/`: automações locais, QA e artefatos legados arquivados.
- `docs/`: contexto operacional, Stripe, deploy, workflows e playbooks para bots.
- `tests/`: smoke tests de runtime/config.
- `tmp/` e `output/`: artefatos locais de execução e QA, não fazem parte do runtime.

## Frontend

- Storefront customer-facing:
  - `app/page.tsx`
  - `app/colecao/*`
  - `app/produto/*`
  - `app/checkout/*`
  - `app/conta/*`
  - `app/contato/*`
  - `app/favoritos/*`
  - `app/rastreio/*`
  - `app/sobre`, `app/faq`, `app/privacidade`, `app/termos`, `app/trocas`
- UI compartilhada do storefront:
  - `components/*.tsx`
  - `components/account/*`
  - `components/checkout/*`
- Client state:
  - `providers/cart-provider.tsx`
  - `providers/customer-session-provider.tsx`

## Admin

- Rotas:
  - `app/admin/*`
- UI:
  - `components/admin/*`

## Backend

- Endpoints HTTP:
  - `app/api/*`
- Server actions:
  - `lib/actions/*`
- Auth:
  - `lib/auth/*`
- Repositórios e acesso ao banco:
  - `lib/repositories/*`
  - `lib/prisma.ts`
  - `prisma/*`
- Integrações server-side:
  - `lib/stripe.ts`
  - `lib/storage/provider.ts`
  - `lib/payment-runtime.ts`
  - `lib/runtime-config.ts`

## Shared

- Tipos e helpers reutilizados em múltiplas camadas:
  - `lib/types.ts`
  - `lib/utils.ts`
  - `lib/constants.ts`
  - `lib/money.ts`
  - `lib/shipping.ts`
  - `lib/checkout-status.ts`
  - `lib/order-status.ts`
  - `lib/validators.ts`
  - `lib/seo.ts`
  - `lib/account.ts`

## Compatibilidade e segurança arquitetural

- `app/` foi mantido na raiz. Mover App Router por estética aumentaria risco sem ganho técnico real.
- `app/minha-conta/page.tsx` foi mantido como rota de compatibilidade e redireciona para `/conta`.
- A separação frontend/backend/shared nesta passada é explícita por convenção e documentação, sem refatorar imports críticos de produção.

## Onde começar

- Visão geral de docs: [`docs/INDEX.md`](./docs/INDEX.md)
- Stripe: [`docs/payments/stripe-activation.md`](./docs/payments/stripe-activation.md)
- Deploy: [`docs/deploy/release-readiness.md`](./docs/deploy/release-readiness.md)
- Workflows: [`docs/workflows/workflow.md`](./docs/workflows/workflow.md)
- Bots e playbooks: [`docs/agents/AGENTS_INDEX.md`](./docs/agents/AGENTS_INDEX.md)
- Scripts locais: [`scripts/README.md`](./scripts/README.md)
