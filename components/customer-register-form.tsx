"use client";

import Link from "next/link";
import { useActionState } from "react";

import { registerCustomerAction } from "@/lib/actions/customer";

const initialState = {
  ok: false,
  message: ""
};

type CustomerRegisterFormProps = {
  next?: string;
  title?: string;
  description?: string;
  submitLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export function CustomerRegisterForm({
  next = "/checkout",
  title = "Crie sua conta para acompanhar seus pedidos",
  description = "Seu histórico e status de pedidos ficarão disponíveis na sua área do cliente.",
  submitLabel = "Criar conta",
  secondaryHref = "/entrar",
  secondaryLabel = "Já tenho conta"
}: CustomerRegisterFormProps) {
  const [state, formAction, isPending] = useActionState(registerCustomerAction, initialState);

  return (
    <div className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-soft sm:p-8">
      <div>
        <p className="eyebrow">Criar conta</p>
        <h2 className="mt-3 text-2xl font-semibold text-ink">{title}</h2>
        <p className="mt-3 text-sm leading-7 text-slate">{description}</p>
      </div>

      <form action={formAction} className="mt-6 space-y-4">
        <input name="next" type="hidden" value={next} />

        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Nome completo</span>
          <input autoComplete="name" className="field-input" name="name" required type="text" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">E-mail</span>
          <input autoComplete="email" className="field-input" name="email" required type="email" />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-ink">Senha</span>
            <input
              autoComplete="new-password"
              className="field-input"
              name="password"
              required
              type="password"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-ink">Confirmar senha</span>
            <input
              autoComplete="new-password"
              className="field-input"
              name="confirmPassword"
              required
              type="password"
            />
          </label>
        </div>

        {state.message ? <p className="text-sm leading-7 text-[#8b342e]">{state.message}</p> : null}

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <button className="button-primary justify-center" disabled={isPending} type="submit">
            {isPending ? "Criando conta..." : submitLabel}
          </button>
          <Link className="button-secondary justify-center" href={`${secondaryHref}?next=${encodeURIComponent(next)}`}>
            {secondaryLabel}
          </Link>
        </div>
      </form>
    </div>
  );
}
