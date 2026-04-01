import { AdminPanel } from "@/components/admin/admin-panel";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import {
  getOrderStatusLabel,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
  getPaymentProviderLabel,
  getShippingStatusLabel,
  getShippingMethodLabel,
  ORDER_STATUS_VALUES,
  PAYMENT_STATUS_VALUES,
  SHIPPING_STATUS_VALUES
} from "@/lib/order-status";
import { updateAdminOrderStatusesAction } from "@/lib/actions/admin";
import { requireAdminAuth } from "@/lib/auth/admin";
import { getAdminOrders } from "@/lib/repositories/orders";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

function getOrderTone(status: string) {
  if (status === "PAID") {
    return "success" as const;
  }

  if (status === "FAILED" || status === "CANCELLED" || status === "REFUNDED") {
    return "danger" as const;
  }

  return "warning" as const;
}

function getPaymentTone(status: string) {
  if (status === "PAID") {
    return "success" as const;
  }

  if (status === "FAILED" || status === "CANCELLED" || status === "REFUNDED") {
    return "danger" as const;
  }

  if (status === "AUTHORIZED") {
    return "info" as const;
  }

  return "warning" as const;
}

function formatStripeSignal(value: string | null) {
  if (!value) {
    return "sem retorno detalhado";
  }

  return value.replaceAll("_", " ").replaceAll(".", " / ");
}

export default async function AdminOrdersPage() {
  const session = await requireAdminAuth("orders");
  const orders = await getAdminOrders();
  const paidCount = orders.filter((order) => order.paymentStatus === "PAID").length;
  const pendingCount = orders.filter((order) => order.status === "PENDING").length;
  const webhookVerifiedCount = orders.filter((order) =>
    order.webhookEvents.some((event) => event.signatureVerified)
  ).length;
  const missingWebhookCount = orders.filter(
    (order) => order.paymentProvider === "stripe" && order.webhookEvents.length === 0
  ).length;

  return (
    <AdminShell
      currentPath="/admin/orders"
      description="Acompanhe apenas pedidos reais do Stripe Checkout, ajuste status operacionais e audite retorno, webhook e consistência pós-compra."
      session={session}
      title="Pedidos"
    >
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          helper={
            orders.length > 0
              ? "A tela mostra somente pedidos relevantes para a operação atual."
              : "Ainda não existem pedidos reais disponíveis para leitura."
          }
          label="Pedidos reais"
          value={orders.length}
        />
        <AdminStatCard
          helper={
            paidCount > 0
              ? "Pedidos com pagamento efetivamente aprovado."
              : "Nenhum pagamento real aprovado por enquanto."
          }
          label="Pagos"
          value={paidCount}
        />
        <AdminStatCard
          helper={
            pendingCount > 0
              ? "Pedidos pedindo acompanhamento manual ou retorno final do pagamento."
              : "Nenhum pedido real pendente neste momento."
          }
          label="Pendentes"
          value={pendingCount}
        />
        <AdminStatCard
          helper={
            missingWebhookCount > 0
              ? `${missingWebhookCount} pedido(s) sem webhook recebido ainda.`
              : "Todos os pedidos listados já têm algum rastro de webhook ou ainda não dependem dele."
          }
          label="Webhook assinado"
          value={`${webhookVerifiedCount}/${orders.length || 0}`}
        />
      </div>

      <AdminPanel
        description="Cada pedido concentra totais, fluxo de pagamento, sessão do checkout, sinal de webhook e status operacionais editáveis pelo time."
        title="Lista de pedidos reais"
      >
        <div className="grid gap-3">
          {orders.length > 0 ? (
            orders.map((order) => (
              <article className="rounded-[1.25rem] border border-black/5 bg-white p-3.5" key={order.id}>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3.5">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-[0.64rem] uppercase tracking-[0.16em] text-slate">{order.number}</p>
                        <AdminStatusBadge
                          label={getOrderStatusLabel(order.status)}
                          tone={getOrderTone(order.status)}
                        />
                        <AdminStatusBadge
                          label={getPaymentStatusLabel(order.paymentStatus)}
                          tone={getPaymentTone(order.paymentStatus)}
                        />
                      </div>
                      <h2 className="mt-2 text-[1.06rem] font-semibold text-ink">{order.customerName}</h2>
                      <p className="mt-1 text-[0.82rem] leading-6 text-slate">
                        {order.customerEmail} • {formatCurrency(Number(order.total))}
                      </p>
                      <div className="mt-2 grid gap-1 text-[0.77rem] leading-5 text-slate sm:grid-cols-2">
                        <p>Checkout: {getPaymentProviderLabel(order.paymentProvider)}</p>
                        <p>Fluxo: {getPaymentMethodLabel(order.paymentMethod)}</p>
                        <p>Entrega: {getShippingMethodLabel(order.shippingMethod)}</p>
                        <p>Envio: {getShippingStatusLabel(order.shippingStatus)}</p>
                        <p>Status Stripe: {formatStripeSignal(order.paymentStatusDetail)}</p>
                        {order.paymentPreferenceId ? <p>Sessão: {order.paymentPreferenceId}</p> : null}
                        {order.paymentId ? <p>Payment intent: {order.paymentId}</p> : null}
                      </div>
                    </div>

                    <div className="grid gap-2.5">
                      {order.items.map((item) => (
                        <div className="rounded-[0.95rem] bg-sand p-3" key={item.id}>
                          <p className="text-[0.9rem] font-semibold text-ink">{item.productName}</p>
                          <p className="mt-1 text-[0.78rem] leading-5 text-slate">
                            {item.colorName} • {item.sizeLabel} • {item.quantity} un.
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <form action={updateAdminOrderStatusesAction} className="grid gap-2.5 xl:min-w-[18rem]">
                    <input name="orderId" type="hidden" value={order.id} />
                    <label className="space-y-2">
                      <span className="text-[0.82rem] font-medium text-ink">Status do pedido</span>
                      <select className="field-input field-input-compact" defaultValue={order.status} name="status">
                        {ORDER_STATUS_VALUES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-[0.82rem] font-medium text-ink">Status do pagamento</span>
                      <select className="field-input field-input-compact" defaultValue={order.paymentStatus} name="paymentStatus">
                        {PAYMENT_STATUS_VALUES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-[0.82rem] font-medium text-ink">Status do envio</span>
                      <select className="field-input field-input-compact" defaultValue={order.shippingStatus} name="shippingStatus">
                        {SHIPPING_STATUS_VALUES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
                    {order.webhookEvents[0] ? (
                      <div className="space-y-2 rounded-[0.95rem] border border-black/5 bg-black/[0.03] px-3 py-2.5 text-[0.74rem] leading-5 text-slate">
                        <div className="flex flex-wrap items-center gap-2">
                          <AdminStatusBadge
                            label={
                              order.webhookEvents[0].signatureVerified
                                ? "Webhook assinado"
                                : "Webhook sem assinatura"
                            }
                            tone={order.webhookEvents[0].signatureVerified ? "success" : "warning"}
                          />
                          <span>{order.webhookEvents[0].topic}</span>
                        </div>
                        <p>
                          Recebido em {order.webhookEvents[0].createdAt.toLocaleString("pt-BR")}
                        </p>
                      </div>
                    ) : order.paymentProvider === "stripe" ? (
                      <div className="rounded-[0.95rem] border border-amber-200 bg-amber-50 px-3 py-2.5 text-[0.74rem] leading-5 text-amber-800">
                        Nenhum webhook apareceu para este pedido ainda. Antes do go-live, valide o endpoint
                        público e a assinatura real.
                      </div>
                    ) : null}
                    <button className="button-primary button-compact justify-center" type="submit">
                      Atualizar status
                    </button>
                  </form>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[1.35rem] border border-dashed border-black/10 bg-black/5 p-5 text-[0.84rem] text-slate">
              Nenhum pedido operacional registrado ainda.
            </div>
          )}
        </div>
      </AdminPanel>
    </AdminShell>
  );
}
