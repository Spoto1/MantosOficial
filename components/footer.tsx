import Link from "next/link";

import { NewsletterForm } from "@/components/newsletter-form";
import { siteName } from "@/lib/seo";
import { tournamentCollectionSlug } from "@/lib/storefront-editorial";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-black/5 bg-[#101212] text-white">
      <div className="shell grid gap-6 py-10 lg:grid-cols-[1.18fr_0.82fr_0.82fr_1fr]">
        <div className="space-y-4.5">
          <p className="eyebrow !text-white/60">{siteName}</p>
          <h2 className="max-w-md font-display text-[1.8rem] leading-[0.94] text-sand sm:text-[2.25rem]">
            Camisas autorais para jogo, deslocamento e rotina com leitura clara da peça ao pós-compra.
          </h2>
          <p className="max-w-md text-[0.88rem] leading-6 text-white/70">
            Produto, coleção, favoritos e pós-compra seguem a mesma linguagem para tornar a compra
            mais direta, consistente e confiável do primeiro clique ao acompanhamento do pedido.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              className="button-accent button-compact"
              href={`/colecao?collection=${tournamentCollectionSlug}`}
            >
              Ver edição especial
            </Link>
            <Link className="button-secondary button-compact" href="/colecao">
              Explorar coleção
            </Link>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-[0.74rem] font-semibold uppercase tracking-[0.22em] text-white/70">
            Navegação
          </h3>
          <div className="flex flex-col gap-2 text-[0.88rem] text-white/80">
            <Link href="/">Início</Link>
            <Link href="/colecao">Coleção completa</Link>
            <Link href={`/colecao?collection=${tournamentCollectionSlug}`}>Edição especial</Link>
            <Link href="/conta">Área do cliente</Link>
            <Link href="/favoritos">Favoritos</Link>
            <Link href="/rastreio">Rastreio</Link>
            <Link href="/contato">Contato</Link>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-[0.74rem] font-semibold uppercase tracking-[0.22em] text-white/70">
            Institucional
          </h3>
          <div className="flex flex-col gap-2 text-[0.88rem] text-white/80">
            <Link href="/sobre">Sobre a marca</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/trocas">Trocas</Link>
            <Link href="/privacidade">Privacidade</Link>
            <Link href="/termos">Termos</Link>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-[0.74rem] font-semibold uppercase tracking-[0.22em] text-white/70">
            Newsletter
          </h3>
          <p className="text-[0.88rem] leading-6 text-white/75">
            Receba lançamentos, reposições e avisos operacionais quando realmente fizer sentido.
          </p>
          <NewsletterForm />
          <div className="rounded-[1.15rem] border border-white/10 bg-white/5 p-3.5 text-[0.84rem] leading-6 text-white/68">
            <p className="font-semibold text-white">Compra com confiança</p>
            <p className="mt-2">Etapa de pagamento orientada, confirmação clara do pedido e acompanhamento contínuo pela conta e pelo rastreio.</p>
            <p className="mt-2">Frete padrão grátis acima de R$ 650,00 e troca em até 30 dias.</p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="shell flex flex-col gap-3 py-3.5 text-[0.62rem] uppercase tracking-[0.16em] text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>{siteName} {new Date().getFullYear()}</p>
          <p>Camisas autorais com catálogo claro e acompanhamento consistente</p>
        </div>
      </div>
    </footer>
  );
}
