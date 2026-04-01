import {
  appendLocalValidationContext,
  isControlledValidationOrder
} from "@/lib/local-validation";

type StatusTone = "neutral" | "positive" | "progress" | "warning" | "danger";

type OrderLike = {
  id?: string;
  number: string;
  customerEmail: string;
  createdAt: Date;
  status: string;
  paymentStatus: string;
  shippingStatus: string;
  shippingMethod?: string | null;
  paymentProvider?: string | null;
  paymentMethod?: string | null;
  paymentStatusDetail?: string | null;
};

type OrderProgressStep = {
  id: string;
  label: string;
  detail: string;
  state: "complete" | "current" | "upcoming";
};

const POSITIVE_STATUSES = new Set(["PAID", "AUTHORIZED", "DELIVERED"]);
const PROGRESS_STATUSES = new Set(["READY_TO_SHIP", "IN_TRANSIT"]);
const WARNING_STATUSES = new Set(["PENDING"]);
const DANGER_STATUSES = new Set(["FAILED", "CANCELLED", "REFUNDED", "RETURNED"]);

export function getCustomerInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase())
    .join("");
}

export function formatCompactDate(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export function formatCompactDateTime(date: Date) {
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function getStatusTone(status: string): StatusTone {
  if (POSITIVE_STATUSES.has(status)) {
    return "positive";
  }

  if (PROGRESS_STATUSES.has(status)) {
    return "progress";
  }

  if (WARNING_STATUSES.has(status)) {
    return "warning";
  }

  if (DANGER_STATUSES.has(status)) {
    return "danger";
  }

  return "neutral";
}

export function getStatusToneClasses(status: string) {
  const tone = getStatusTone(status);

  if (tone === "positive") {
    return "border-forest/15 bg-forest/[0.08] text-forest";
  }

  if (tone === "progress") {
    return "border-night/15 bg-night/[0.08] text-night";
  }

  if (tone === "warning") {
    return "border-gold/20 bg-gold/[0.12] text-ink";
  }

  if (tone === "danger") {
    return "border-ember/20 bg-ember/[0.12] text-ember";
  }

  return "border-black/10 bg-black/[0.04] text-ink";
}

export function isOrderInProgress(order: Pick<OrderLike, "status" | "shippingStatus">) {
  if (DANGER_STATUSES.has(order.status) || order.shippingStatus === "RETURNED") {
    return false;
  }

  return order.shippingStatus !== "DELIVERED";
}

export function getOrderJourneySummary(
  order: Pick<OrderLike, "status" | "paymentStatus" | "shippingStatus" | "shippingMethod">
) {
  if (order.status === "FAILED") {
    return "O pedido foi registrado, mas o pagamento não foi concluído. Você pode iniciar uma nova compra quando quiser.";
  }

  if (order.status === "CANCELLED") {
    return "O pedido foi cancelado e não segue para preparação ou entrega.";
  }

  if (order.status === "REFUNDED") {
    return "O pedido foi encerrado com estorno registrado e permanece disponível apenas para consulta.";
  }

  if (order.shippingStatus === "DELIVERED") {
    return "Este pedido já foi concluído e permanece disponível para consulta sempre que você precisar.";
  }

  if (order.shippingStatus === "IN_TRANSIT") {
    return "Seu pedido já saiu para transporte e as próximas atualizações aparecem no acompanhamento assim que forem registradas.";
  }

  if (order.shippingStatus === "READY_TO_SHIP") {
    if (order.shippingMethod === "pickup") {
      return "O pagamento já foi confirmado e a retirada está em organização com a equipe responsável.";
    }

    return "O pagamento já foi confirmado e o pedido está pronto para seguir para expedição.";
  }

  if (order.paymentStatus === "PAID") {
    return "Recebemos a confirmação do pagamento e o pedido já entrou na fila de preparação.";
  }

  if (order.paymentStatus === "AUTHORIZED") {
    return "O pagamento foi autorizado e a confirmação final ainda pode levar alguns instantes.";
  }

  if (order.paymentStatus === "PENDING") {
    return "O pedido foi recebido e aguarda a confirmação do pagamento para seguir para preparação e envio.";
  }

  return "O pedido segue disponível para acompanhamento na sua conta com atualização de status sempre que houver avanço.";
}

export function getOrderPaymentSummary(
  order: Pick<
    OrderLike,
    "status" | "paymentStatus" | "paymentMethod" | "paymentProvider" | "paymentStatusDetail"
  >
) {
  if (order.paymentStatus === "PAID") {
    return "Pagamento aprovado. O pedido segue para preparação e a próxima atualização aparece na conta.";
  }

  if (order.paymentStatus === "AUTHORIZED") {
    return "Pagamento autorizado. A confirmação final ainda pode levar alguns instantes antes de liberar a preparação.";
  }

  if (order.paymentStatus === "REFUNDED" || order.status === "REFUNDED") {
    return "Pagamento estornado. Este pedido fica disponível apenas como histórico.";
  }

  if (order.paymentStatus === "FAILED" || order.status === "FAILED") {
    return "Pagamento não concluído. Para seguir com a compra, inicie uma nova tentativa de checkout.";
  }

  if (order.paymentStatus === "CANCELLED" || order.status === "CANCELLED") {
    return "Pagamento cancelado antes da confirmação. Não há cobrança em aberto para este pedido.";
  }

  return "Pagamento em análise. Não é necessário refazer a compra enquanto a confirmação ainda estiver pendente.";
}

export function getOrderTrackingSummary(
  order: Pick<OrderLike, "status" | "paymentStatus" | "shippingStatus" | "shippingMethod">
) {
  if (order.shippingStatus === "DELIVERED") {
    return "A entrega foi concluída. Este painel continua servindo como histórico e ponto de consulta.";
  }

  if (order.shippingStatus === "IN_TRANSIT") {
    return "O transporte já começou. Use esta página para acompanhar as próximas movimentações registradas.";
  }

  if (order.shippingStatus === "READY_TO_SHIP") {
    if (order.shippingMethod === "pickup") {
      return "Este pedido está em fase de retirada. A equipe confirma os próximos combinados diretamente com você.";
    }

    return "O pedido está pronto para envio. Assim que entrar em transporte, esta área passa a destacar a movimentação logística.";
  }

  if (
    order.status === "FAILED" ||
    order.status === "CANCELLED" ||
    order.status === "REFUNDED"
  ) {
    return "Como o pedido foi encerrado antes da entrega, não há movimentação logística para acompanhar.";
  }

  if (order.paymentStatus === "AUTHORIZED") {
    return "O transporte ainda não começou. Primeiro confirmamos o pagamento; depois disso, a preparação e o envio passam a aparecer aqui.";
  }

  if (order.paymentStatus === "PENDING") {
    return "O transporte ainda não começou porque o pedido aguarda a confirmação do pagamento. Quando o envio iniciar, esta área passa a mostrar a movimentação logística.";
  }

  return "As informações de transporte aparecem nesta página sempre que a expedição ou a entrega avançarem.";
}

export function getOrderNextStep(
  order: Pick<OrderLike, "status" | "paymentStatus" | "shippingStatus" | "shippingMethod">
) {
  if (
    order.status === "FAILED" ||
    order.status === "CANCELLED" ||
    order.status === "REFUNDED"
  ) {
    return "Se quiser seguir com a compra, volte para a coleção e inicie um novo checkout.";
  }

  if (order.shippingStatus === "DELIVERED") {
    return "Guarde o número do pedido para futuras consultas, troca ou suporte.";
  }

  if (order.shippingStatus === "IN_TRANSIT") {
    return "Acompanhe esta entrega pelo rastreio e fale com a equipe se precisar de apoio adicional.";
  }

  if (order.shippingStatus === "READY_TO_SHIP") {
    if (order.shippingMethod === "pickup") {
      return "Aguarde a confirmação final da equipe para combinar a retirada com segurança.";
    }

    return "A próxima atualização relevante será o início do transporte ou a confirmação de entrega.";
  }

  if (order.paymentStatus === "AUTHORIZED") {
    return "Nenhuma ação é necessária agora. A aprovação final costuma ser refletida automaticamente.";
  }

  if (order.paymentStatus === "PENDING") {
    return "Acompanhe a confirmação do pagamento pela sua conta. Assim que ele for aprovado, o pedido avança automaticamente.";
  }

  return "Você pode acompanhar a conta normalmente enquanto o pedido avança para a próxima etapa.";
}

export function buildTrackingHref(
  order: Pick<
    OrderLike,
    "number" | "customerEmail" | "paymentMethod" | "paymentProvider" | "paymentStatusDetail"
  >
) {
  const params = new URLSearchParams();
  params.set("pedido", order.number);
  params.set("email", order.customerEmail);

  return appendLocalValidationContext(
    `/rastreio?${params.toString()}`,
    isControlledValidationOrder(order)
  );
}

export function buildAccountOrderHref(
  order: Pick<
    OrderLike,
    "id" | "customerEmail" | "paymentMethod" | "paymentProvider" | "paymentStatusDetail"
  >
) {
  return appendLocalValidationContext(
    `/conta/pedidos/${order.id}`,
    isControlledValidationOrder(order)
  );
}

export function getOrderProgressSteps(
  order: Pick<
    OrderLike,
    "createdAt" | "status" | "paymentStatus" | "shippingStatus" | "shippingMethod"
  >
): OrderProgressStep[] {
  const cancelled =
    order.status === "FAILED" ||
    order.status === "CANCELLED" ||
    order.status === "REFUNDED" ||
    order.shippingStatus === "RETURNED";
  const refunded =
    order.status === "REFUNDED" || order.paymentStatus === "REFUNDED";
  const paymentCleared =
    order.paymentStatus === "AUTHORIZED" ||
    order.paymentStatus === "PAID" ||
    order.status === "PAID";
  const failedBeforeConfirmation =
    (order.status === "FAILED" ||
      order.status === "CANCELLED" ||
      order.paymentStatus === "FAILED" ||
      order.paymentStatus === "CANCELLED") &&
    !paymentCleared;
  const preparing =
    order.shippingStatus === "READY_TO_SHIP" ||
    order.shippingStatus === "IN_TRANSIT" ||
    order.shippingStatus === "DELIVERED";
  const inTransit =
    order.shippingStatus === "IN_TRANSIT" || order.shippingStatus === "DELIVERED";
  const delivered = order.shippingStatus === "DELIVERED";
  const isPickup = order.shippingMethod === "pickup";

  const resolveState = (complete: boolean, current: boolean): OrderProgressStep["state"] => {
    if (complete) {
      return "complete";
    }

    if (current) {
      return "current";
    }

    return "upcoming";
  };

  return [
    {
      id: "confirmed",
      label: cancelled ? "Pedido encerrado" : "Pedido recebido",
      detail: cancelled
        ? "O fluxo foi encerrado antes da conclusão da entrega."
        : formatCompactDate(order.createdAt),
      state: "complete"
    },
    {
      id: "payment",
      label: "Pagamento",
      detail: refunded
        ? "O pagamento foi confirmado e depois teve estorno registrado."
        : failedBeforeConfirmation
          ? "O fluxo foi interrompido antes da confirmação final."
          : cancelled
            ? "O pagamento não seguiu até a confirmação final."
            : paymentCleared
              ? "Pagamento confirmado para avançar o pedido."
              : "Aguardando a confirmação do pagamento.",
      state: refunded
        ? "complete"
        : failedBeforeConfirmation
          ? "current"
          : resolveState(paymentCleared, !paymentCleared && !cancelled)
    },
    {
      id: "preparing",
      label: isPickup ? "Preparação da retirada" : "Preparação",
      detail: cancelled
        ? "Sem avanço para separação ou expedição."
        : isPickup
          ? "A equipe organiza a disponibilidade para retirada."
          : "Itens em conferência e preparação para envio.",
      state: resolveState(preparing, paymentCleared && !preparing)
    },
    {
      id: "transit",
      label: isPickup ? "Retirada disponível" : "Em transporte",
      detail: cancelled
        ? "Sem avanço logístico."
        : isPickup
          ? "Esta etapa fica ativa quando a retirada pode ser combinada."
          : "Etapa ativa quando o pedido sai para transporte.",
      state: resolveState(inTransit, preparing && !inTransit)
    },
    {
      id: "delivered",
      label: delivered ? "Entregue" : "Conclusão",
      detail: delivered
        ? "Pedido concluído com sucesso."
        : isPickup
          ? "A conclusão acontece após a retirada ser finalizada."
          : "Entrega confirmada ao final do fluxo.",
      state: resolveState(delivered, inTransit && !delivered)
    }
  ];
}
