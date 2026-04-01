# Bot Start Checklist

1. Ler [`docs/INDEX.md`](../../INDEX.md) e [`PROJECT_MAP.md`](../../../PROJECT_MAP.md).
2. Confirmar se o trabalho toca storefront, admin, backend, Stripe ou deploy.
3. Se envolver pagamentos, abrir [`docs/payments/stripe-activation.md`](../../payments/stripe-activation.md).
4. Se envolver publicação, abrir [`docs/deploy/release-readiness.md`](../../deploy/release-readiness.md).
5. Se envolver QA local, abrir [`scripts/qa/README.md`](../../../scripts/qa/README.md).
6. Tratar `tmp/` e `output/` como artefatos efêmeros, não como fonte de verdade.
7. Preservar `app/` na raiz e evitar refatoração destrutiva do App Router sem necessidade real.
