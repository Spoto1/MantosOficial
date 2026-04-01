"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import type { CustomerSessionResponse } from "@/lib/types";

type FavoriteButtonProps = {
  productId: string;
  productName: string;
};

export function FavoriteButton({ productId, productName }: FavoriteButtonProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [sessionState, setSessionState] = useState<{
    loading: boolean;
    authenticated: boolean;
  }>({
    loading: true,
    authenticated: false
  });

  useEffect(() => {
    let ignore = false;

    void (async () => {
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store"
        });
        const result = (await response.json()) as CustomerSessionResponse;

        if (!ignore) {
          setSessionState({
            loading: false,
            authenticated: result.authenticated
          });
        }
      } catch {
        if (!ignore) {
          setSessionState({
            loading: false,
            authenticated: false
          });
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!sessionState.authenticated) {
      setSaved(false);
      return;
    }

    let ignore = false;

    void (async () => {
      try {
        const response = await fetch(`/api/favorites?productId=${encodeURIComponent(productId)}`, {
          cache: "no-store"
        });
        const result = (await response.json()) as {
          ok: boolean;
          saved?: boolean;
        };

        if (!ignore && response.ok && result.ok) {
          setSaved(Boolean(result.saved));
        }
      } catch {}
    })();

    return () => {
      ignore = true;
    };
  }, [productId, sessionState.authenticated]);

  const serializedSearchParams = searchParams.toString();
  const nextPath = `${pathname}${serializedSearchParams ? `?${serializedSearchParams}` : ""}`;

  if (sessionState.loading) {
    return (
      <div className="space-y-3">
        <button className="button-secondary justify-center" disabled type="button">
          Carregando favoritos...
        </button>
      </div>
    );
  }

  if (!sessionState.authenticated) {
    return (
      <div className="space-y-3">
        <Link
          className="button-secondary justify-center"
          href={`/entrar?next=${encodeURIComponent(nextPath)}`}
        >
          Entrar para salvar
        </Link>
        <div className="rounded-[1.6rem] border border-black/10 bg-black/5 p-4 text-sm leading-7 text-slate">
          Os favoritos exigem conta autenticada para manter sua seleção privada, acessível na área
          do cliente e pronta para voltar do produto ao carrinho quando você quiser.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        className={`button-secondary justify-center ${saved ? "!bg-ink !text-white" : ""}`}
        disabled={isPending}
        onClick={() => {
          setFeedback(null);

          startTransition(async () => {
            const response = await fetch("/api/favorites", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                productId
              })
            });
            const result = (await response.json()) as {
              ok: boolean;
              saved?: boolean;
              message?: string;
            };

            if (!response.ok || !result.ok) {
              setFeedback(result.message ?? "Não foi possível atualizar este favorito.");
              return;
            }

            setSaved(Boolean(result.saved));
            setFeedback(
              result.saved
                ? `${productName} foi salvo nos seus favoritos.`
                : `${productName} foi removido dos seus favoritos.`
            );
          });
        }}
        type="button"
      >
        {isPending ? "Salvando..." : saved ? "Salvo nos favoritos" : "Salvar nos favoritos"}
      </button>

      <p className="text-sm leading-7 text-slate">
        O favorito fica vinculado à sua conta e pode ser revisitado depois para retomar a compra
        com mais contexto.
      </p>

      {feedback ? (
        <p
          aria-live="polite"
          className={`text-sm leading-7 ${feedback.includes("não") ? "text-[#8b342e]" : "text-slate"}`}
        >
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
