import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CustomerLoginForm } from "@/components/customer-login-form";
import { CustomerRegisterForm } from "@/components/customer-register-form";
import { getCurrentCustomer, resolveSafeRedirectPath } from "@/lib/auth/customer";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Acesse para continuar a compra",
  description:
    "Etapa de acesso antes do checkout para associar o pedido à conta do cliente.",
  path: "/checkout/acesso",
  noIndex: true
});

type CheckoutAccessPageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

export default async function CheckoutAccessPage({ searchParams }: CheckoutAccessPageProps) {
  const resolved = (await searchParams) ?? {};
  const nextPath = resolveSafeRedirectPath(resolved.next, "/checkout");
  const customer = await getCurrentCustomer();

  if (customer) {
    redirect(nextPath);
  }

  return (
    <section className="shell py-12">
      <div className="max-w-4xl">
        <p className="eyebrow">Acesso ao checkout</p>
        <h1 className="mt-3 font-display text-5xl leading-none text-ink sm:text-6xl">
          Entre ou crie sua conta para finalizar com segurança.
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate">
          Sua conta reúne checkout, pedidos, detalhe da compra e rastreio em um só lugar. Se você
          já comprou antes, basta entrar para seguir do ponto em que parou.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          [
            "Pedido salvo na conta",
            "O pedido fica disponível na sua área do cliente desde a finalização."
          ],
          [
            "Acompanhamento centralizado",
            "Histórico, andamento, detalhe do pedido e rastreio aparecem no mesmo fluxo."
          ],
          [
            "Cadastro rápido",
            "Você cria a conta com nome, e-mail e senha e já volta para o checkout."
          ]
        ].map(([title, description]) => (
          <div className="rounded-[1.75rem] border border-black/5 bg-white/80 p-5 shadow-soft" key={title}>
            <h2 className="text-xl font-semibold text-ink">{title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate">{description}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-6 xl:grid-cols-2">
        <CustomerLoginForm
          description="Já tem conta? Entre para continuar o checkout com seu histórico e seus pedidos reunidos no mesmo lugar."
          next={nextPath}
        />
        <CustomerRegisterForm
          description="Depois da compra, seu histórico, seus pedidos e o rastreio ficam disponíveis na sua área do cliente."
          next={nextPath}
        />
      </div>
    </section>
  );
}
