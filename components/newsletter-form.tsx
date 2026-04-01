"use client";

import { useActionState, useEffect, useRef } from "react";

import { subscribeNewsletterAction } from "@/lib/actions/public";
import type { ActionResponse } from "@/lib/types";

type NewsletterFormProps = {
  source?: string;
  className?: string;
};

const initialState: ActionResponse = {
  ok: false,
  message: ""
};

export function NewsletterForm({ source = "footer", className }: NewsletterFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(subscribeNewsletterAction, initialState);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form
      action={formAction}
      className={className ?? "space-y-3"}
      ref={formRef}
    >
      <input name="source" type="hidden" value={source} />
      <label className="sr-only" htmlFor={`newsletter-${source}`}>
        E-mail
      </label>
      <input
        className="w-full rounded-[1.35rem] border border-white/10 bg-white/7 px-4 py-3 text-sm text-white shadow-sm placeholder:text-white/45 focus:border-white/30 focus:bg-white/10 focus:outline-none"
        id={`newsletter-${source}`}
        name="email"
        placeholder="seu melhor e-mail"
        required
        type="email"
      />
      <button className="button-accent w-full justify-center" disabled={isPending} type="submit">
        {isPending ? "Salvando..." : "Receber novidades"}
      </button>
      {state.message ? (
        <p
          aria-live="polite"
          className={`text-sm leading-6 ${state.ok ? "text-white/70" : "text-[#f1b7b7]"}`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
