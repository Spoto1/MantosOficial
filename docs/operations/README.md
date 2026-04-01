# Operations Docs

## Runtime e healthcheck

- Healthcheck operacional: `GET /api/health`
- Checkout: `POST /api/checkout/create-session`
- Webhook Stripe: `POST /api/webhooks/stripe`

## Artefatos locais

- `tmp/`: scratchpad local, logs temporários e saídas de execução.
- `tmp/logs/root/`: logs históricos movidos da raiz.
- `output/`: screenshots e artefatos de QA/browser.
- `.next/`, `.playwright-cli/`, `.codex-tmp/`: caches e saídas de runtime local.

Essas pastas não são parte do código-fonte da aplicação e devem ser tratadas como efêmeras.

## Referências operacionais

- Deploy e go-live: [`docs/deploy/release-readiness.md`](../deploy/release-readiness.md)
- Stripe: [`docs/payments/stripe-activation.md`](../payments/stripe-activation.md)
- Scripts de QA: [`scripts/qa/README.md`](../../scripts/qa/README.md)
