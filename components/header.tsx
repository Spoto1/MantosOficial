"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { siteName, siteTagline } from "@/lib/seo";
import { tournamentCollectionSlug } from "@/lib/storefront-editorial";
import { useCart } from "@/providers/cart-provider";
import { useCustomerSession } from "@/providers/customer-session-provider";

const navigation = [
  { label: "Coleção", href: "/colecao" },
  { label: "Sobre", href: "/sobre" },
  { label: "Favoritos", href: "/favoritos" },
  { label: "Rastreio", href: "/rastreio" },
  { label: "Contato", href: "/contato" }
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname.startsWith(href);
}

export function Header() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { itemCount, openCart } = useCart();
  const { customer, status } = useCustomerSession();
  const accountHref = status === "authenticated" ? "/conta" : "/entrar?next=%2Fconta";
  const accountLabel = status === "authenticated" ? "Minha conta" : "Entrar";

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-[#f8f7f4]/82 backdrop-blur-2xl">
      <div className="border-b border-white/10 bg-[#101212] text-[0.58rem] uppercase tracking-[0.16em] text-white/78">
        <div className="shell flex min-h-7 items-center justify-between gap-3 py-1">
          <p className="flex items-center gap-2">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-gold" />
            Catálogo claro, pagamento orientado e pós-compra organizado
          </p>
          <div className="hidden items-center gap-5 md:flex">
            <p>Frete padrão grátis acima de R$ 650,00</p>
            <p className="hidden xl:block">Troca em até 30 dias e acompanhamento consistente do pedido</p>
          </div>
        </div>
      </div>

      <div className="shell flex items-center justify-between gap-3 py-2 sm:gap-4 sm:py-2.5">
        <Link
          aria-label={`${siteName}, voltar para a página inicial`}
          className="min-w-0 flex-1"
          href="/"
        >
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-[0.9rem] border border-black/10 bg-white text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-ink shadow-sm sm:h-9 sm:w-9 sm:text-[0.64rem] sm:tracking-[0.2em]">
              MO
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate font-display text-[1.02rem] leading-none text-ink sm:text-[1.22rem] lg:text-[1.38rem]">
                  {siteName}
                </p>
              </div>
              <p className="hidden text-[0.54rem] uppercase tracking-[0.16em] text-slate sm:block">
                {siteTagline}
              </p>
            </div>
          </div>
        </Link>

        <nav aria-label="Navegação principal" className="hidden items-center gap-1 lg:flex">
          {navigation.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <Link
                className={`rounded-full px-2.5 py-1.5 text-[0.8rem] transition ${
                  active
                    ? "bg-ink text-white shadow-sm"
                    : "text-slate hover:bg-black/5 hover:text-ink"
                }`}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            className={`rounded-full px-2.5 py-1.5 text-[0.8rem] transition ${
              pathname.startsWith("/conta") ||
              pathname.startsWith("/entrar") ||
              pathname.startsWith("/cadastro")
                ? "bg-ink text-white shadow-sm"
                : "text-slate hover:bg-black/5 hover:text-ink"
            }`}
            href={accountHref}
          >
            {accountLabel}
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Link
            className="button-accent button-compact hidden lg:inline-flex"
            href={`/colecao?collection=${tournamentCollectionSlug}`}
          >
            Ver edição especial
          </Link>
          <button
            aria-label="Abrir carrinho"
            className="button-secondary min-w-0 justify-center gap-1.5 px-3 text-[0.78rem] sm:min-w-[6.2rem] sm:gap-2 sm:px-3 sm:text-[0.82rem]"
            onClick={openCart}
            type="button"
          >
            <span className="sm:hidden">Carr.</span>
            <span className="hidden sm:inline">Carrinho</span>
            <span
              aria-live="polite"
              className="rounded-full bg-ink px-1.5 py-0.5 text-[0.62rem] text-white"
            >
              {itemCount}
            </span>
          </button>
          <button
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
            aria-label="Abrir menu"
            className="grid h-8 w-8 place-items-center rounded-full border border-black/10 bg-white text-ink lg:hidden"
            onClick={() => setIsMenuOpen((current) => !current)}
            type="button"
          >
            <span className="text-lg">{isMenuOpen ? "×" : "≡"}</span>
          </button>
        </div>
      </div>

      {isMenuOpen ? (
        <div className="border-t border-black/5 bg-white/92 lg:hidden">
          <nav aria-label="Menu mobile" className="shell flex flex-col gap-2 py-3">
            <Link
              className="button-accent button-compact justify-center"
              href={`/colecao?collection=${tournamentCollectionSlug}`}
            >
              Ver edição especial
            </Link>
            {navigation.map((item) => {
              const active = isActive(pathname, item.href);

              return (
                <Link
                  className={`rounded-[0.9rem] px-3 py-2 text-[0.84rem] ${
                    active ? "bg-ink text-white" : "bg-black/5 text-ink"
                  }`}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              className={`rounded-[0.9rem] px-3 py-2 text-[0.84rem] ${
                pathname.startsWith("/conta") ||
                pathname.startsWith("/entrar") ||
                pathname.startsWith("/cadastro")
                  ? "bg-ink text-white"
                  : "bg-black/5 text-ink"
              }`}
              href={accountHref}
            >
              {accountLabel}
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
