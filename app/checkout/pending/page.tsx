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
import { reconcileStripeCheckoutSession } from "@/lib/repositories/orders";
import { buildMetadata } from "@/lib/seo";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = buildMetadata({
  title: "Pagamento pendente",
  description: "Acompanhamento do pedido enquanto o pagamento ainda está em análise.",
  path: "/checkout/pending",
  noIndex: true
});

type CheckoutPendingPageProps = {
  searchParams?: Promise<{
    order?: string;
    external_reference?: string;
    session_id?: string;
    flow?: string;
    context?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function CheckoutPendingPage({
  searchParams
}: CheckoutPendingPageProps) {
  const resolved = (await searchParams) ?? {};
  const customerSession = await getCustomerSession();
  const isValidationFlow =
    isLocalValidationFlow(resolved.flow) && isLocalValidationContext(resolved.context);
  const allowControlledOrder = isValidationFlow && isLocalCheckoutDemoAllowed();
  let reconciliationMessage: string | null = null;
  let reconciledOrder = null;

  if (resolved.session_id && !allowControlledOrder) {
    try {
      reconciledOrder = await reconcileStripeCheckoutSession(resolved.session_id);
    } catch (error) {
      console.error("[checkout-pending] falha ao reconciliar sessão Stripe", error);
      reconciliationMessage =
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o status automaticamente.";
    }
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
    : "pending";

  if (order && resolvedRoute !== "pending") {
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

  const journeySummary = order ? getOrderJourneySummary(order) : null;
  const nextStep = order ? getOrderNextStep(order) : null;
  const trackingSummary = order ? getOrderTrackingSummary(order) : null;
  const controlledOrder = allowControlledOrder && isControlledValidationOrder(order);
  const primaryAccountHref =
    customerSession && order ? `/conta/pedidos/${order.id}` : "/conta/pedidos";
  const validationHref =
    order ? `/checkout/demo?order=${order.id}&context=${LOCAL_VALIDATION_CONTEXT}` : "/checkout";

  return (
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
          label: "Continuar navegando",
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
          ? "Pedido validado internamente em estado pendente para revisar mensagens, continuidade e clareza do pós-compra antes da ativação da conta Stripe correta."
          : journeySummary ??
            "O pedido já foi registrado. Agora estamos aguardando a confirmação do pagamento para liberar a preparação e a expedição."
      }
      emptyMessage="O pedido não pode ser exibido nesta sessão. Entre na sua conta para acompanhar a confirmação do pagamento com segurança."
      eyebrow={controlledOrder ? "Homologação interna" : "Pagamento em análise"}
      guidanceItems={[
        {
          title: "Pagamento",
          description:
            controlledOrder
              ? "Este estado foi mantido em QA interna para revisar a linguagem de acompanhamento antes da ativação da conta Stripe correta."
              : "A confirmação ainda está em análise. Em geral, essa atualização aparece automaticamente sem precisar refazer a compra."
        },
        {
          title: "Situação do pedido",
          description:
            nextStep ??
            "Assim que o pagamento for confirmado, o pedido avança na conta e a preparação começa em sequência."
        },
        {
          title: "Transporte",
          description:
            trackingSummary ??
            "O transporte ainda não começou. Esta área passa a mostrar movimentação logística apenas quando a expedição realmente iniciar."
        }
      ]}
      guidanceTitle="Próximos passos"
      infoCards={[
        {
          kicker: "Conta e histórico",
          body:
            customerSession
              ? "Use a conta para revisar este pedido sem perder o contexto entre pagamento, situação do pedido e transporte."
              : "Entre na sua conta para acompanhar este pedido com a mesma leitura de status mostrada aqui."
        },
        {
          kicker: "Resumo do pedido",
          rows: [
            {
              label: "Status do pedido",
              value: order ? journeySummary ?? "Em acompanhamento" : "Em acompanhamento"
            },
            {
              label: "Total",
              value: order ? formatCurrency(Number(order.total)) : "Disponível na conta"
            },
            {
              label: "Transporte",
              value: trackingSummary ?? "Aguardando o pedido avançar para expedição."
            }
          ]
        },
        {
          kicker: "Entrega e rastreio",
          body:
            trackingSummary ??
            "O transporte só passa a aparecer com prioridade quando a expedição realmente começar."
        }
      ]}
      journeySummary={journeySummary}
      nextStep={nextStep}
        notice={
          controlledOrder
            ? {
                message:
                  "Fluxo interno de QA. Esta tela existe para revisar a jornada antes da ativação da conta Stripe correta.",
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
      title={
        controlledOrder
          ? "Estado pendente homologado internamente."
          : "Estamos acompanhando a confirmação do seu pedido."
      }
    />
  );
}
