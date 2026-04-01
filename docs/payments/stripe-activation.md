# Ativação Stripe na Mantos Oficial

Stripe é o gateway definitivo da loja.

Este projeto já está consolidado para Stripe no checkout, no pós-compra e na reconciliação do pedido. O que falta para ativação real não é trocar de arquitetura: é conectar a conta Stripe correta do projeto, cadastrar o webhook publicado e homologar os cenários finais.

## Como o projeto funciona hoje

- `app/api/checkout/create-session/route.ts` recebe o pedido autenticado e decide entre Stripe real ou demo local controlado.
- `lib/repositories/orders.ts` cria o pedido pendente, calcula frete/cupom, monta os line items e persiste os vínculos de sessão.
- `lib/stripe.ts` cria a Stripe Checkout Session e valida a assinatura do webhook.
- `app/api/webhooks/stripe/route.ts` registra o evento, trata idempotência e reconcilia o pedido.
- `app/checkout/success`, `pending` e `failure` leem a sessão retornada e mantêm conta, pedidos e rastreio coerentes com o mesmo número do pedido.

## Envs obrigatórias por ambiente

- `STRIPE_SECRET_KEY`
  Chave secreta da conta Stripe correta do projeto. Sem ela o checkout online não abre.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  Chave pública da mesma conta Stripe. Hoje o storefront usa checkout hospedado, mas a chave pública precisa continuar pareada com a conta certa do ambiente e na mesma modalidade da secret key (`test` com `test`, `live` com `live`).
- `STRIPE_WEBHOOK_SECRET`
  Segredo do endpoint `POST /api/webhooks/stripe`. Em qualquer ambiente publicado com Stripe ativo, ele é obrigatório e precisa usar o valor `whsec_...` do endpoint desse mesmo ambiente.
- `APP_URL`
  Origem pública server-side usada para URLs de retorno, metadata e callbacks.
- `NEXT_PUBLIC_APP_URL`
  Origem pública client-side. Deve apontar para a mesma URL do `APP_URL`.
- `STRIPE_PAYMENT_METHOD_TYPES`
  Opcional. Use apenas se a operação quiser limitar meios como `card` ou `pix` por ambiente.

Guardas aplicadas na base:

- `APP_URL` e `NEXT_PUBLIC_APP_URL` divergentes agora bloqueiam a configuração.
- `STRIPE_SECRET_KEY` sem `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` bloqueia ativação.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` sem `STRIPE_SECRET_KEY` bloqueia ativação.
- combinação `sk_test_...` com `pk_live_...` ou `sk_live_...` com `pk_test_...` bloqueia ativação.
- `STRIPE_WEBHOOK_SECRET` inválido ou ausente em ambiente publicado bloqueia ativação.
- o checkout demo local só fica liberado quando não existe configuração Stripe parcial no ambiente.

## Modelo atual de catálogo e preços

Hoje a loja não depende de produtos e preços persistidos na Stripe para abrir checkout.

- A fonte da verdade continua no catálogo local em Prisma.
- O checkout gera os line items da sessão com `price_data` inline.
- Isso significa que não é obrigatório cadastrar `product` e `price` por SKU no dashboard da Stripe para ativar o checkout.

Se a operação quiser futuramente conciliar catálogo financeiro dentro da Stripe por SKU, será uma decisão nova de modelagem e não um pré-requisito do go-live atual.

## O que precisa existir na conta Stripe correta

- branding da conta revisado;
- statement descriptor e dados fiscais conferidos;
- métodos de pagamento realmente desejados pela operação;
- endpoint público `POST /api/webhooks/stripe` cadastrado;
- segredo do webhook separado por ambiente;
- permissões e acessos do time alinhados à conta certa da loja.

Importante: nada nesta base presume que a conta Stripe conectada ao plugin do Codex seja a conta operacional da loja. O preenchimento das envs continua manual e deve ser feito só depois da confirmação da conta correta.

## Como cadastrar o webhook

Referência oficial da Stripe:

- Webhooks: [https://docs.stripe.com/webhooks](https://docs.stripe.com/webhooks)
- Checkout Sessions com preços inline: [https://docs.stripe.com/products-prices/how-products-and-prices-work](https://docs.stripe.com/products-prices/how-products-and-prices-work)

Passo a passo recomendado:

1. Publicar o ambiente que será homologado com `APP_URL` e `NEXT_PUBLIC_APP_URL` apontando para a origem real desse ambiente.
2. Abrir o dashboard da conta Stripe correta em Workbench > Webhooks.
3. Criar um novo event destination do tipo `Account`.
4. Informar a URL HTTPS pública completa: `https://<origem-do-ambiente>/api/webhooks/stripe`.
5. Selecionar os eventos já tratados pela base atual:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `checkout.session.expired`
6. Salvar o endpoint e copiar o signing secret `whsec_...` para `STRIPE_WEBHOOK_SECRET` do mesmo ambiente.
7. Revalidar o healthcheck em `GET /api/health` e conferir se `payments.checkoutReady` ficou `true` e `payments.issue` ficou `null`.

Observação operacional:

- o fluxo atual usa `checkout.session.*` como fonte principal de mudança de estado para pedidos one-time;
- a página de retorno não substitui webhook, ela só tenta reconciliar a sessão de forma segura enquanto o webhook segue como caminho principal de confirmação.

## Checklist de ativação real

1. Preencher `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` e `STRIPE_WEBHOOK_SECRET` com a conta Stripe correta do projeto.
2. Configurar `APP_URL` e `NEXT_PUBLIC_APP_URL` com a origem pública final.
3. Confirmar que `STRIPE_SECRET_KEY` e `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` estão na mesma modalidade (`test` ou `live`).
4. Publicar a aplicação e cadastrar `POST /api/webhooks/stripe` no dashboard dessa mesma conta.
5. Conferir `GET /api/health` antes de abrir o tráfego e garantir que `payments.issue` está vazio.
6. Validar ao menos um pagamento aprovado, um cancelamento, um cenário pendente e um cenário de falha.
7. Conferir se webhook, conta, detalhe do pedido, rastreio e admin convergem para o mesmo estado final.
8. Revisar logs e eventos duplicados para garantir que não há baixa de estoque nem reconciliação duplicada.

Checklist operacional complementar:

- use também [`docs/deploy/release-readiness.md`](../deploy/release-readiness.md) para validar envs, deploy, smoke publicado e go-live.

## Testes presenciais recomendados

- cartão de teste com aprovação imediata;
- cenário de cancelamento pelo comprador na página da Stripe;
- cenário pendente compatível com o método habilitado no ambiente;
- cenário de falha/autenticação recusada;
- verificação do pedido em `/checkout/success`, `/checkout/pending` e `/checkout/failure`;
- verificação do mesmo pedido em `/conta/pedidos`, detalhe do pedido, `/rastreio` e `/admin/orders`.

O que precisa ser confirmado nesses testes:

- o pedido nasce como `PENDING` antes do redirecionamento;
- `checkout.session.completed` não duplica efeito colateral em caso de retry;
- `checkout.session.async_payment_succeeded` fecha pendência e baixa estoque só uma vez;
- `checkout.session.async_payment_failed` move o pedido para falha sem reabrir sessão antiga;
- `checkout.session.expired` ou cancelamento no `cancel_url` levam o pedido para estado coerente de cancelamento;
- conta, detalhe do pedido, rastreio e admin mostram o mesmo status final.

## O que não fazer

- não usar a conta Stripe conectada ao plugin do Codex como conta final sem confirmação explícita;
- não reabrir caminho oficial de Mercado Pago;
- não usar `ALLOW_LOCAL_DEMO_CHECKOUT` para mascarar falta de configuração real em ambiente publicado;
- não duplicar a fronteira de pagamento fora do fluxo já existente de `create-session` + webhook Stripe.
