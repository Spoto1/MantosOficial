# Release Readiness — Mantos Oficial

Checklist operacional para fechar a loja em homologação final, publicação controlada e go-live.

## 1. Envs e origem pública

- Confirmar `APP_URL` e `NEXT_PUBLIC_APP_URL` com a mesma origem pública do ambiente.
- Confirmar que nenhuma delas aponta para `localhost`, IP privado ou preview temporário errado.
- Manter `ALLOW_LOCAL_DEMO_CHECKOUT=false` em qualquer ambiente publicado.
- Confirmar `ADMIN_SESSION_SECRET` preenchido com valor forte no ambiente publicado.
- Confirmar `DATABASE_URL` apontando para a base correta do ambiente.
- Confirmar `NEXT_IMAGE_REMOTE_HOSTS` e `STORAGE_PUBLIC_BASE_URL` se houver imagens remotas ou storage externo.

## 2. Stripe e webhook

- Preencher `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` e `STRIPE_WEBHOOK_SECRET`.
- Confirmar que as chaves Stripe estão na mesma modalidade: `test` com `test` ou `live` com `live`.
- Validar que o endpoint publicado `POST /api/webhooks/stripe` está cadastrado na conta Stripe correta.
- Confirmar eventos mínimos:
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded`
  - `checkout.session.async_payment_failed`
  - `checkout.session.expired`
- Chamar `GET /api/health` e confirmar:
  - `payments.gateway = "stripe"`
  - `payments.checkoutReady = true`
  - `payments.issue = null`

Referência complementar: [`docs/payments/stripe-activation.md`](../payments/stripe-activation.md)

## 3. Build e validação técnica

- Rodar `npm run lint`
- Rodar `npm run typecheck`
- Rodar `npm run build`
- Rodar `npm run test:smoke`
- Subir preview mais próximo do deploy com `npm run start`
- Validar `GET /api/health`

## 4. Smoke publicado

Rodar smoke manual no ambiente publicado ou staging final:

- `/`
- `/colecao`
- `/produto/[slug]`
- `/checkout`
- `/checkout/success`
- `/checkout/pending`
- `/checkout/failure`
- `/conta`
- `/conta/pedidos`
- `/conta/pedidos/[id]`
- `/rastreio`
- `/sobre`
- `/privacidade`
- `/termos`
- `/admin`
- `/admin/kanban`

Em cada rota:

- Conferir carregamento sem erro visível.
- Conferir console sem erro crítico.
- Conferir rede sem `4xx/5xx` inesperado.
- Conferir título, heading principal e CTA coerentes.
- Conferir ausência de conteúdo indevido de demo, seed ou gateway antigo.

## 5. Homologação funcional

- Login de cliente funcionando.
- Histórico de pedidos acessível em `/conta/pedidos`.
- Detalhe do pedido acessível em `/conta/pedidos/[id]`.
- Rastreio funcionando com número do pedido + e-mail.
- Checkout abrindo sessão real no ambiente publicado.
- Pós-compra convergindo entre success/pending/failure, conta, detalhe do pedido e rastreio.
- Login admin funcionando.
- Dashboard admin carregando sem erro.
- Kanban admin carregando sem erro.

## 6. Go-live

- Confirmar domínio final e certificado válidos.
- Confirmar envs finais no provedor de deploy.
- Confirmar webhook Stripe após deploy final.
- Repetir `GET /api/health` no ambiente final.
- Rodar smoke publicado em produção com baixa amostra controlada.
- Monitorar primeiros pedidos, webhook e atualização de status no admin.
- Definir responsável de plantão para a primeira janela operacional.

## 7. Rollback e contingência

- Manter último deploy estável identificado.
- Manter acesso rápido aos logs do provedor e da aplicação.
- Ter plano claro para:
  - desativar tráfego
  - restaurar deploy anterior
  - pausar campanha que aponte para checkout
  - validar novamente `GET /api/health`
