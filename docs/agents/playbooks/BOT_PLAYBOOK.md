# Bot Playbook

## Leitura mínima antes de agir

1. [`PROJECT_MAP.md`](../../../PROJECT_MAP.md)
2. [`docs/workflows/workflow.md`](../../workflows/workflow.md)
3. O guia do domínio em questão:
   - pagamentos: [`docs/payments/stripe-activation.md`](../../payments/stripe-activation.md)
   - deploy: [`docs/deploy/release-readiness.md`](../../deploy/release-readiness.md)
   - QA: [`docs/qa/README.md`](../../qa/README.md)

## Convenções desta base

- `app/` continua na raiz por causa do App Router.
- `app/admin/*` é o runtime do admin.
- `app/api/*` e `lib/repositories/*` concentram backend.
- `components/admin/*` é UI do admin; `components/*` fora dessa pasta é majoritariamente storefront/shared UI.
- `scripts/qa/*` contém automações reaproveitáveis.
- `scripts/archive/legacy/*` contém scripts antigos preservados só como referência histórica.

## Quando arquivar em vez de apagar

- scripts antigos mas potencialmente úteis;
- notas operacionais obsoletas porém com contexto;
- compatibilidades de URL que ainda possam receber tráfego.
