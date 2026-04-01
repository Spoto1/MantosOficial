import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CheckoutClearCart } from "@/components/checkout-clear-cart";
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
import { reconcileStripeCheckoutSession } from "@/lib/repositories/orders";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Pagamento aprovado",
  description: "Confirmação do pedido com resumo claro e próximos passos do pós-compra.",
  path: "/checkout/success",
  noIndex: true
});

type CheckoutSuccessPageProps = {
  searchParams?: Promise<{
    order?: string;
    external_reference?: string;
    session_id?: string;
    flow?: string;
    context?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  searchParams
}: CheckoutSuccessPageProps) {
  const resolved = (await searchParams) ?? {};
  const customerSession = await getCustomerSession();
  const isValidationFlow =
    isLocalValidationFlow(resolved.flow) && isLocalValidationContext(resolved.context);
  const allowControlledOrder = isValidationFlow && isLocalCheckoutDemoAllowed();
  let reconciliationMessage: string | null = null;
  let reconciledOrder = null;

  if (resolved.session_id && customerSession && !allowControlledOrder) {
    try {
      reconciledOrder = await reconcileStripeCheckoutSession(resolved.session_id, {
        expectedCustomerId: customerSession.customerId,
        expectedOrderId: resolved.order,
        expectedExternalReference: resolved.external_reference
      });
    } catch (error) {
      console.error("[checkout-success] falha ao reconciliar sessão Stripe", error);
      reconciliationMessage =
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o pagamento automaticamente nesta página.";
    }
  } else if (resolved.session_id && !customerSession && !allowControlledOrder) {
    reconciliationMessage =
      "Entre na sua conta para visualizar o pedido completo com segurança. O status continua sendo atualizado automaticamente.";
  }

  const order =
    customerSession
      ? reconciledOrder?.customerId === customerSession.customerId
        ? reconciledOrder
        : allowControlledOrder
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
    : "success";

  if (order && resolvedRoute !== "success") {
    const params = new URLSearchParams();
    params.set("order", order.id);

    if (resolved.external_reference) {
      params.set("external_reference", resolved.external_reference);
    }

    if (resolved.session_id) {
      params.set("session_id", resolved.session_id);
    }

    if (resolved.flow) {
      params.set("flow", resolved.flow);
    }

    if (resolved.context) {
      params.set("context", resolved.context);
    }

    redirect(`/checkout/${resolvedRoute}?${params.toString()}`);
  }

  const isPaid = order?.paymentStatus === "PAID";
  const journeySummary = order ? getOrderJourneySummary(order) : null;
  const nextStep = order ? getOrderNextStep(order) : null;
  const trackingSummary = order ? getOrderTrackingSummary(order) : null;
  const controlledOrder = allowControlledOrder && isControlledValidationOrder(order);
  const primaryAccountHref =
    customerSession && order ? `/conta/pedidos/${order.id}` : "/conta/pedidos";
  const validationHref =
    order ? `/checkout/demo?order=${order.id}&context=${LOCAL_VALIDATION_CONTEXT}` : "/checkout";

  return (
    <>
      <CheckoutClearCart enabled={Boolean(isPaid)} />
      <PostPurchaseView
        actions={[
          {
            label: controlledOrder
              ? "Voltar para homologação interna"
              : customerSession
                ? "Ver pedido na conta"
                : "Entrar para ver meu pedido",
            href: controlledOrder
              ? validationHref
              : customerSession
                ? primaryAccountHref
                : "/entrar?next=%2Fconta%2Fpedidos",
            variant: "primary"
          },
          {
            label: "Continuar comprando",
            href: "/colecao",
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
            ? "Pedido validado internamente em estado aprovado para revisar o pós-compra antes da ativação da conta Stripe correta."
            : journeySummary ??
              "Pagamento aprovado e pedido confirmado. Acompanhe a preparação na conta e use o rastreio quando a expedição realmente começar."
        }
        emptyMessage="Não foi possível exibir o resumo completo nesta sessão. Entre na sua conta para revisar o pedido com segurança ou use o rastreio com o número e o e-mail da compra."
        eyebrow={controlledOrder ? "Homologação interna" : "Compra concluída"}
        guidanceItems={[
          {
            title: "Pagamento confirmado",
            description:
              controlledOrder
                ? "O estado aprovado foi aplicado internamente para revisar conteúdo, resumo e continuidade do pós-compra antes da ativação da conta Stripe correta."
                : "A confirmação já foi registrada e o pedido está liberado para seguir para preparação e expedição."
          },
          {
            title: "Situação do pedido",
            description:
              nextStep ??
              "A próxima atualização aparece automaticamente na conta assim que o pedido avançar para preparação, expedição ou entrega."
          },
          {
            title: "Transporte",
            description:
              trackingSummary ??
              "Quando a expedição começar, o rastreio passa a destacar a movimentação logística com o mesmo número do pedido."
          }
        ]}
        guidanceTitle="O que acontece agora"
        infoCards={[
          {
            kicker: "Conta e histórico",
            body:
              customerSession
                ? "Este pedido já está vinculado à sua conta. Use o detalhe do pedido para revisar pagamento, entrega, itens e próximos passos sem depender do rastreio público."
                : "Entre na sua conta para revisar o detalhe do pedido, acompanhar a preparação e abrir o rastreio com menos atrito."
          },
          {
            kicker: "Entrega",
            rows: [
              {
                label: "Destinatário",
                value: order?.address?.recipientName ?? order?.customerName ?? "Disponível na conta"
              },
              {
                label: "Endereço",
                value: order?.address?.line1 ?? "Disponível no detalhe do pedido"
              },
              {
                label: "Cidade",
                value: `${order?.address?.city ?? "Não informado"} • ${order?.address?.state ?? "--"}`
              }
            ]
          }
        ]}
        journeySummary={journeySummary}
        nextStep={nextStep}
        notice={
          controlledOrder
            ? {
                message:
                  "Fluxo interno de QA. Esta confirmação existe para revisar a jornada antes da ativação da conta Stripe correta.",
                tone: "neutral"
              }
            : reconciliationMessage
            ? {
                message: reconciliationMessage,
                tone: "danger"
              }
            : null
        }
        order={order}
        title={controlledOrder ? "Estado aprovado homologado internamente." : "Pedido confirmado com sucesso."}
      />
    </>
  );
}
