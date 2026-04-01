import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CustomerRegisterForm } from "@/components/customer-register-form";
import { getCurrentCustomer, resolveSafeRedirectPath } from "@/lib/auth/customer";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Criar conta",
  description: "Crie sua conta para acompanhar pedidos e seguir para o checkout autenticado.",
  path: "/cadastro",
  noIndex: true
});

type RegisterPageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const resolved = (await searchParams) ?? {};
  const nextPath = resolveSafeRedirectPath(resolved.next, "/checkout");
  const customer = await getCurrentCustomer();

  if (customer) {
    redirect(nextPath);
  }

  return (
    <section className="shell py-12">
      <div className="max-w-4xl">
        <p className="eyebrow">Criar conta</p>
        <h1 className="mt-3 font-display text-5xl leading-none text-ink sm:text-6xl">
          Sua área do cliente começa aqui.
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate">
          Crie sua conta para acompanhar seus pedidos, revisar status e continuar comprando com o
          mesmo perfil no próximo acesso.
        </p>
      </div>

      <div className="mt-10 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <CustomerRegisterForm next={nextPath} />

        <div className="rounded-[2rem] border border-black/5 bg-white/85 p-6 shadow-soft sm:p-8">
          <p className="eyebrow">Benefícios</p>
          <div className="mt-4 space-y-4 text-sm leading-7 text-slate">
            <p>Seu histórico e status de pedidos ficam disponíveis na área autenticada.</p>
            <p>Pedidos futuros podem reaproveitar o e-mail e os dados já conectados à conta.</p>
            <p>Se você já comprou com este e-mail, o cadastro passa a organizar esse histórico na conta.</p>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link className="button-secondary justify-center" href={`/entrar?next=${encodeURIComponent(nextPath)}`}>
              Já tem conta? Entre
            </Link>
            <Link className="button-ghost justify-center" href="/checkout/acesso">
              Ver etapa de acesso
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
