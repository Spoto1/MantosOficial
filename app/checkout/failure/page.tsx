import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PostPurchaseView } from "@/components/checkout/post-purchase-view";
import {
  getOrderJourneySummary,
  getOrderNextStep,
  getOrderTrackingSummary
} from "@/lib/account";
import { getCustomerSession } from "@/lib/auth/customer";
import { isLocalCheckoutDemoAllowed } from "@/lib/checkout-mode";
import { resolveCheckoutResultRoute } from "@/lib/checkout-status";
import {
  isControlledValidationOrder,
  isLocalValidationContext,
  isLocalValidationFlow,
  LOCAL_VALIDATION_CONTEXT
} from "@/lib/local-validation";
import {
  getCustomerControlledOrderByIdentifier,
  getCustomerOrderByIdentifier
} from "@/lib/repositories/customers";
import { markStripeCheckoutCancelled } from "@/lib/repositories/orders";
import { buildMetadata } from "@/lib/seo";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = buildMetadata({
  title: "Pagamento não concluído",
  description: "Retorno claro para revisar o pedido e seguir com a próxima ação adequada.",
  path: "/checkout/failure",
  noIndex: true
});

type CheckoutFailurePageProps = {
  searchParams?: Promise<{
    order?: string;
    external_reference?: string;
    flow?: string;
    context?: string;
    checkout_cancelled?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function CheckoutFailurePage({
  searchParams
}: CheckoutFailurePageProps) {
  const resolved = (await searchParams) ?? {};
  const customerSession = await getCustomerSession();
  const checkoutCancelled = resolved.checkout_cancelled === "1";
  const isValidationFlow =
    isLocalValidationFlow(resolved.flow) && isLocalValidationContext(resolved.context);
  const allowControlledOrder = isValidationFlow && isLocalCheckoutDemoAllowed();

  if (checkoutCancelled && !allowControlledOrder) {
    await markStripeCheckoutCancelled({
      orderId: resolved.order,
      externalReference: resolved.external_reference
    });
  }

  const order = customerSession
    ? allowControlledOrder
      ? await getCustomerControlledOrderByIdentifier({
          customerId: customerSession.customerId,
          orderId: resolved.order,
          externalReference: resolved.external_reference
        })
      : await getCustomerOrderByIdentifier({
          customerId: customerSession.customerId,
          orderId: resolved.order,
          externalReference: resolved.external_reference
        })
    : null;
  const resolvedRoute = order
    ? resolveCheckoutResultRoute({
        status: order.status,
        paymentStatus: order.paymentStatus
      })
    : "failure";

  if (order && resolvedRoute !== "failure" && !checkoutCancelled) {
    const params = new URLSearchParams();
    params.set("order", order.id);

    if (resolved.external_reference) {
      params.set("external_reference", resolved.external_reference);
    }

    if (resolved.flow) {
      params.set("flow", resolved.flow);
    }

    if (resolved.context) {
      params.set("context", resolved.context);
    }

    redirect(`/checkout/${resolvedRoute}?${params.toString()}`);
  }

  const headline =
    checkoutCancelled || order?.paymentStatus === "CANCELLED" || order?.status === "CANCELLED"
      ? "O pedido foi cancelado."
      : order?.paymentStatus === "REFUNDED" || order?.status === "REFUNDED"
        ? "O pedido teve estorno registrado."
        : "O pagamento não foi concluído.";
  const description =
    checkoutCancelled || order?.paymentStatus === "CANCELLED" || order?.status === "CANCELLED"
      ? "A etapa de pagamento foi interrompida antes da confirmação final. Não há cobrança ativa para este pedido e você pode iniciar uma nova tentativa quando quiser."
      : order?.paymentStatus === "REFUNDED" || order?.status === "REFUNDED"
        ? "O pedido foi encerrado após o estorno. Você pode gerar uma nova compra quando quiser."
        : "Revise os dados do pedido e tente novamente quando estiver pronto. Se o pedido já foi criado, ele continua disponível para consulta na sua conta.";
  const journeySummary = order ? getOrderJourneySummary(order) : null;
  const nextStep = order ? getOrderNextStep(order) : null;
  const trackingSummary = order ? getOrderTrackingSummary(order) : null;
  const controlledOrder = allowControlledOrder && isControlledValidationOrder(order);
  const validationHref =
    order ? `/checkout/demo?order=${order.id}&context=${LOCAL_VALIDATION_CONTEXT}` : "/checkout";

  return (
    <PostPurchaseView
      actions={[
        {
          label: "Tentar novamente",
          href: "/checkout",
          variant: "primary"
        },
        {
          label: controlledOrder
            ? "Voltar para homologação interna"
            : customerSession
              ? "Ver pedidos na conta"
              : "Entrar para ver meus pedidos",
          href: controlledOrder
            ? validationHref
            : customerSession
              ? "/conta/pedidos"
              : "/entrar?next=%2Fconta%2Fpedidos",
          variant: "secondary"
        },
        {
          label: "Falar com a equipe",
          href: "/contato",
          variant: "ghost"
        }
      ]}
      description={
        controlledOrder
          ? "Pedido validado internamente em estado de falha para revisar recuperação de jornada e clareza de status antes da ativação da conta Stripe correta."
          : description
      }
      emptyMessage="Não foi possível exibir o detalhe do pedido nesta sessão. Entre na sua conta para revisar o histórico e iniciar uma nova compra com segurança."
      eyebrow={controlledOrder ? "Homologação interna" : "Pagamento não concluído"}
      guidanceItems={[
        {
          title: "Pagamento",
          description:
            controlledOrder
              ? "Este cenário foi mantido em QA interna apenas para revisar textos, recuperação e consistência do pós-compra antes da ativação da conta Stripe correta."
              : checkoutCancelled
                ? "O checkout foi encerrado antes da cobrança. Quando quiser, volte ao pedido e abra uma nova sessão de pagamento."
                : "Antes de tentar novamente, confirme limite, saldo, autenticação e qualquer etapa exigida pelo banco ou pelo emissor do pagamento."
        },
        {
          title: "Situação do pedido",
          description:
            nextStep ??
            "Se quiser seguir com a compra, volte para a coleção e gere um novo checkout com os itens desejados."
        },
        {
          title: "Transporte",
          description:
            trackingSummary ?? "Sem movimentação logística para acompanhar nesta tentativa."
        }
      ]}
      guidanceTitle="Como retomar a compra"
      infoCards={[
        {
          kicker: "Conta e histórico",
          body:
            order
              ? `O pedido ${order.number} continua disponível para consulta na conta com os dados registrados nesta tentativa.`
              : "O histórico da conta continua sendo o melhor lugar para revisar pedidos anteriores."
        },
        {
          kicker: "Situação do pedido",
          rows: [
            {
              label: "Leitura atual",
              value: journeySummary ?? "Pagamento não concluído"
            },
            {
              label: "Total desta tentativa",
              value: order ? formatCurrency(Number(order.total)) : "Disponível na conta"
            },
            {
              label: "Entrega",
              value: trackingSummary ?? "Sem movimentação logística para acompanhar."
            }
          ]
        },
        {
          kicker: "Quando falar com a equipe",
          body:
            order
              ? `Se você tiver dúvida sobre esta tentativa, informe o pedido ${order.number} para a equipe localizar o contexto com mais rapidez.`
              : "Se precisar de apoio para concluir a compra, fale com a equipe informando o número do pedido."
        }
      ]}
      journeySummary={journeySummary}
      nextStep={nextStep}
      notice={
        controlledOrder
          ? {
              message:
                "Fluxo interno de QA. Esta falha existe para revisar a jornada antes da ativação da conta Stripe correta.",
              tone: "neutral"
            }
          : null
      }
      order={order}
      title={controlledOrder ? "Estado de falha homologado internamente." : headline}
    />
  );
}
