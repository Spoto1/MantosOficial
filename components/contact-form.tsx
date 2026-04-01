"use client";

import { useActionState, useEffect, useRef } from "react";

import { createContactLeadAction } from "@/lib/actions/public";
import type { ActionResponse } from "@/lib/types";

const initialState: ActionResponse = {
  ok: false,
  message: ""
};

export function ContactForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(createContactLeadAction, initialState);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form
      action={formAction}
      className="panel space-y-6 p-5 sm:p-6"
      ref={formRef}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Nome</span>
          <input
            className="field-input"
            name="name"
            placeholder="Seu nome completo"
            required
            type="text"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">E-mail</span>
          <input
            className="field-input"
            name="email"
            placeholder="voce@dominio.com"
            required
            type="email"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Telefone</span>
          <input className="field-input" name="phone" placeholder="Opcional" type="tel" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Assunto</span>
          <input
            className="field-input"
            name="subject"
            placeholder="Ex.: Pedido MNT-100001, troca, parceria ou dúvida sobre tamanho"
            required
            type="text"
          />
        </label>
      </div>

      <label className="space-y-2">
        <span className="text-sm font-medium text-ink">Mensagem</span>
        <textarea
          className="field-input min-h-32 resize-y"
          name="message"
          placeholder="Descreva o contexto, informe o número do pedido se houver e explique o que você precisa resolver."
          required
        />
      </label>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm leading-6 text-slate">
          Pedidos corporativos, collabs, suporte de compra, trocas e dúvidas sobre coleção seguem
          direto para a equipe responsável pelo atendimento da marca.
        </p>
        <button className="button-primary justify-center" disabled={isPending} type="submit">
          {isPending ? "Enviando..." : "Enviar para a equipe"}
        </button>
      </div>

      {state.message ? (
        <p
          aria-live="polite"
          className={`text-sm leading-7 ${state.ok ? "text-forest" : "text-[#8b342e]"}`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
