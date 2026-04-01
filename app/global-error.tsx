"use client";

import Link from "next/link";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="pt-BR">
      <body className="bg-[#f8f7f4] font-sans text-ink antialiased">
        <section className="shell py-16 sm:py-20">
          <div className="empty-state mx-auto max-w-3xl">
            <p className="eyebrow">Erro de renderizacao</p>
            <h1 className="display-section mt-3">Algo saiu do fluxo esperado.</h1>
            <p className="lead-text mx-auto mt-4 max-w-xl text-slate">
              Encontramos um erro ao montar esta tela. Voce pode tentar novamente, voltar para a
              home ou seguir para a colecao enquanto o estado e recomposto.
            </p>
            {error.message ? (
              <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate/80">
                {error.message}
              </p>
            ) : null}
            <div className="mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
              <button className="button-primary justify-center" onClick={reset} type="button">
                Tentar novamente
              </button>
              <Link className="button-secondary justify-center" href="/">
                Voltar ao inicio
              </Link>
              <Link className="button-secondary justify-center" href="/colecao">
                Ir para a colecao
              </Link>
            </div>
          </div>
        </section>
      </body>
    </html>
  );
}
