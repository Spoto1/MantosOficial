import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { simulateCheckoutDemoAction } from "@/lib/actions/public";
import { buildTrackingHref } from "@/lib/account";
import { requireCustomerAuth } from "@/lib/auth/customer";
import { isLocalCheckoutDemoAllowed } from "@/lib/checkout-mode";
import {
  isLocalValidationContext,
  LOCAL_VALIDATION_CONTEXT
} from "@/lib/local-validation";
import { getCustomerControlledOrderByIdentifier } from "@/lib/repositories/customers";
import { buildMetadata } from "@/lib/seo";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = buildMetadata({
  title: "QA interna do pós-compra",
  description:
    "Rota interna de QA para revisar estados controlados do pós-compra antes da ativação da conta Stripe correta.",
  path: "/checkout/demo",
  noIndex: true
});

type CheckoutDemoPageProps = {
  searchParams?: Promise<{
    order?: string;
    context?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function CheckoutDemoPage({ searchParams }: CheckoutDemoPageProps) {
  const resolved = (await searchParams) ?? {};
  const hasInternalAccess =
    isLocalCheckoutDemoAllowed() && isLocalValidationContext(resolved.context);

  if (!hasInternalAccess || !resolved.order) {
    notFound();
  }

  const nextPath = resolved.order
    ? `/checkout/demo?order=${encodeURIComponent(resolved.order)}&context=${LOCAL_VALIDATION_CONTEXT}`
    : `/checkout/demo?context=${LOCAL_VALIDATION_CONTEXT}`;
  const session = await requireCustomerAuth({
    next: nextPath,
    loginPath: "/checkout/acesso"
  });
  const order = await getCustomerControlledOrderByIdentifier({
    customerId: session.customerId,
    orderId: resolved.order
  });

  if (!order) {
    notFound();
  }

  return (
    <section className="shell py-16">
      <div className="mx-auto max-w-4xl rounded-[2.5rem] border border-black/5 bg-white/90 p-8 shadow-soft sm:p-12">
        <p className="eyebrow">Homologação interna</p>
        <h1 className="mt-3 font-display text-5xl leading-none text-ink sm:text-6xl">
          Rota interna para revisar retornos controlados do pós-compra.
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate">
          Use esta etapa apenas no ambiente interno autorizado. Nenhuma cobrança real é executada e
          o objetivo aqui é revisar estados controlados antes da ativação da conta Stripe correta.
        </p>

        <div className="mt-8 rounded-[2rem] border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-950">
          Esta rota responde somente com host local, flag interna ativa e contexto explícito de
          homologação. Fora dessas condições, ela deixa de existir para a navegação pública.
        </div>

        <div className="mt-6 grid gap-4 rounded-[2rem] bg-black/5 p-6 sm:grid-cols-3">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-slate">Pedido</p>
            <p className="mt-2 text-xl font-semibold text-ink">{order.number}</p>
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-slate">Cliente</p>
            <p className="mt-2 text-xl font-semibold text-ink">{order.customerName}</p>
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-slate">Total</p>
            <p className="mt-2 text-xl font-semibold text-ink">{formatCurrency(Number(order.total))}</p>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              outcome: "success",
              title: "Pagamento aprovado",
              description:
                "Abre o retorno de pedido confirmado para revisar resumo, próximos passos e acesso à conta."
            },
            {
              outcome: "pending",
              title: "Pagamento em análise",
              description:
                "Mantém o pedido em acompanhamento para validar linguagem, clareza e continuidade do fluxo."
            },
            {
              outcome: "failure",
              title: "Pagamento não concluído",
              description:
                "Abre o retorno de falha para revisar recuperação da jornada sem tratar o cenário como operação real."
            }
          ].map((option) => (
            <form
              action={simulateCheckoutDemoAction}
              className="rounded-[2rem] border border-black/5 bg-white p-5 shadow-soft"
              key={option.outcome}
            >
              <input name="orderId" type="hidden" value={order.id} />
              <input name="outcome" type="hidden" value={option.outcome} />
              <input name="context" type="hidden" value={LOCAL_VALIDATION_CONTEXT} />
              <h2 className="text-2xl font-semibold text-ink">{option.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate">{option.description}</p>
              <button className="button-primary mt-6 w-full justify-center" type="submit">
                Abrir retorno
              </button>
            </form>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link className="button-secondary justify-center" href="/checkout">
            Voltar ao checkout
          </Link>
          <Link className="button-ghost justify-center" href={buildTrackingHref(order)}>
            Abrir rastreio interno
          </Link>
        </div>
      </div>
    </section>
  );
}
