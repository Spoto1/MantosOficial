import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CustomerLoginForm } from "@/components/customer-login-form";
import { getCurrentCustomer, resolveSafeRedirectPath } from "@/lib/auth/customer";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Entrar",
  description: "Acesse sua área do cliente para acompanhar pedidos e seguir para o checkout.",
  path: "/entrar",
  noIndex: true
});

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolved = (await searchParams) ?? {};
  const nextPath = resolveSafeRedirectPath(resolved.next, "/conta");
  const customer = await getCurrentCustomer();

  if (customer) {
    redirect(nextPath);
  }

  return (
    <section className="shell py-12">
      <div className="max-w-4xl">
        <p className="eyebrow">Área do cliente</p>
        <h1 className="mt-3 font-display text-5xl leading-none text-ink sm:text-6xl">
          Entre para acessar sua conta.
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate">
          Sua conta reúne pedidos, favoritos e acompanhamento do pós-compra em um painel mais
          organizado e consistente com a navegação da loja.
        </p>
      </div>

      <div className="mt-10 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-black/5 bg-[#111111] p-6 text-white shadow-soft sm:p-8">
          <p className="eyebrow !text-white/55">Por que entrar</p>
          <div className="mt-4 space-y-4 text-sm leading-7 text-white/72">
            <p>Consulte pedidos e status sem depender da busca manual por número e e-mail.</p>
            <p>Os favoritos ficam vinculados ao seu perfil para retomar a curadoria em outra visita.</p>
            <p>Se ainda não tem conta, você pode criar uma em poucos campos e seguir automaticamente.</p>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link className="button-secondary justify-center" href={`/cadastro?next=${encodeURIComponent(nextPath)}`}>
              Criar conta
            </Link>
            <Link className="button-ghost justify-center !border-white/15 !text-white" href="/colecao">
              Ver coleção
            </Link>
          </div>
        </div>

        <CustomerLoginForm next={nextPath} />
      </div>
    </section>
  );
}
