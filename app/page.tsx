import Image from "next/image";
import { headers } from "next/headers";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { ProductCard } from "@/components/product-card";
import { SectionHeading } from "@/components/section-heading";
import { getFeaturedProducts, getProducts } from "@/lib/data";
import {
  editorialPillars,
  homeTrustSignals,
  institutionalHighlights,
  isTournamentCapsule,
  tournamentCollectionSlug,
  tournamentCapsuleName
} from "@/lib/storefront-editorial";
import {
  getLiveCampaignsByPlacement,
  pickPrimaryCampaign
} from "@/lib/repositories/campaigns";
import { absoluteUrl, buildMetadata, defaultDescription, siteName } from "@/lib/seo";
import { resolveAppUrlFromHeaders } from "@/lib/runtime-config";
import type { StorefrontProduct } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const heroNotes = [
  {
    title: "Coleções por contexto",
    description: "Linhas organizadas para comparar peças por proposta de uso, sem excesso de campanha."
  },
  {
    title: "Produto em primeiro plano",
    description: "Imagem, preço e acesso ao detalhe aparecem com prioridade para a decisão acontecer com clareza."
  },
  {
    title: "Pós-compra claro",
    description: "Favoritos, rastreio, trocas e suporte seguem a mesma linguagem objetiva da vitrine."
  }
] as const;

function uniqueProducts(products: StorefrontProduct[]) {
  return Array.from(new Map(products.map((product) => [product.slug, product])).values());
}

export const metadata = buildMetadata({
  title: "Camisas autorais com catálogo claro",
  description:
    "Explore a Mantos Oficial: camisas autorais, coleção organizada e informação clara para navegar pelo catálogo com mais confiança.",
  path: "/"
});

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const requestAppUrl = resolveAppUrlFromHeaders(await headers());
  const [featuredProducts, products, liveCampaigns] = await Promise.all([
    getFeaturedProducts(4),
    getProducts({ sort: "featured" }),
    getLiveCampaignsByPlacement(["HOME_HERO", "HOME_SECONDARY"])
  ]);

  const heroCampaign = pickPrimaryCampaign(liveCampaigns, "HOME_HERO");
  const secondaryCampaign = pickPrimaryCampaign(liveCampaigns, "HOME_SECONDARY");

  if (products.length === 0) {
    return (
      <section className="shell py-16">
        <EmptyState
          eyebrow="Loja"
          description="Ainda não há produtos publicados no momento. Assim que a coleção estiver ativa, esta página passa a exibir as peças disponíveis."
          primaryAction={{ label: "Falar com a equipe", href: "/contato" }}
          secondaryAction={{ label: "Conhecer a marca", href: "/sobre" }}
          title="Nenhum produto publicado no momento."
        />
      </section>
    );
  }

  const featuredGrid = uniqueProducts(
    featuredProducts.length > 0 ? featuredProducts : products.slice(0, 4)
  );
  const capsuleProduct =
    products.find((product) => isTournamentCapsule(product)) ??
    featuredGrid[0] ??
    products[0];
  const heroProduct =
    featuredGrid.find((product) => product.slug === heroCampaign?.product?.slug) ??
    capsuleProduct;
  const secondaryProduct =
    products.find((product) => product.slug === secondaryCampaign?.product?.slug) ??
    featuredGrid.find((product) => product.slug !== heroProduct.slug) ??
    products[1] ??
    heroProduct;
  const productRail = uniqueProducts(
    [capsuleProduct, ...featuredGrid, ...products.slice(0, 5)].filter(Boolean)
  ).slice(0, 3);
  const capsuleLink = `/produto/${capsuleProduct.slug}`;
  const heroTitle =
    heroCampaign?.publicTitle ?? "Camisas autorais com leitura clara da peça à entrega.";
  const heroSubtitle =
    heroCampaign?.publicSubtitle ?? `${siteName} • coleção autoral`;
  const heroDescription =
    heroCampaign?.description ??
    "A Mantos Oficial reúne linhas pensadas para jogo, cidade e deslocamento, com vitrine objetiva, preço claro e apoio consistente no pós-compra.";
  const heroImageSrc = heroCampaign?.desktopImageUrl ?? heroProduct.image;
  const secondaryImageSrc = secondaryCampaign?.desktopImageUrl ?? secondaryProduct.image;
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    url: absoluteUrl("/", requestAppUrl),
    logo: absoluteUrl("/icon.svg", requestAppUrl),
    description: defaultDescription,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      areaServed: "BR",
      availableLanguage: ["Portuguese"]
    }
  };

  return (
    <div className="pb-4">
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        type="application/ld+json"
      />
      <section className="shell pt-4 sm:pt-6">
        <div className="grid gap-3.5 xl:grid-cols-[minmax(0,1.03fr)_minmax(20rem,0.97fr)]">
          <div className="panel rounded-[1.65rem] p-4 sm:p-5 lg:p-5">
            <p className="eyebrow">{heroSubtitle}</p>
            <h1 className="display-hero mt-2.5 max-w-[10.8ch] text-balance">{heroTitle}</h1>
            <p className="lead-text mt-3.5 max-w-[37rem] text-slate">{heroDescription}</p>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Link className="button-primary justify-center" href={heroCampaign?.ctaLink ?? "/colecao"}>
                {heroCampaign?.ctaLabel ?? "Explorar coleção"}
              </Link>
              <Link className="button-secondary justify-center" href={capsuleLink}>
                Ver peça em destaque
              </Link>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              {homeTrustSignals.map((item) => (
                <div className="metric-card" key={item.value}>
                  <p className="text-[0.9rem] font-semibold text-ink">{item.value}</p>
                  <p className="mt-1 text-[0.78rem] leading-5 text-slate">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[1.2rem] border border-black/5 bg-black/5 p-3.5">
              <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                {heroNotes.map((note) => (
                  <div key={note.title}>
                    <p className="text-[0.58rem] uppercase tracking-[0.14em] text-slate">
                      {note.title}
                    </p>
                    <p className="mt-1 text-[0.78rem] leading-5 text-ink">{note.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            <article
              className="panel-dark relative overflow-hidden rounded-[1.65rem] p-4 sm:p-5"
              style={{
                backgroundImage: heroCampaign?.accentColor
                  ? `linear-gradient(135deg, ${heroCampaign.accentColor} 0%, #101212 100%)`
                  : heroProduct.gradient
              }}
            >
              <div className="absolute inset-0 bg-campaign-lines opacity-90" />
              <div className="relative flex h-full flex-col justify-between gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="campaign-chip">Peça em destaque</span>
                    <h2 className="mt-2.5 font-display text-[clamp(1.65rem,2.35vw,2.4rem)] leading-[0.94] text-white">
                      {heroProduct.name}
                    </h2>
                    <p className="mt-2 max-w-[17rem] text-[0.78rem] leading-5 text-white/74">
                      {heroProduct.subtitle}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/20 px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.12em] text-white/75">
                    {formatCurrency(heroProduct.price)}
                  </span>
                </div>

                <div className="flex justify-center">
                  <Image
                    alt={heroCampaign?.publicTitle ?? heroProduct.name}
                    className="h-auto w-full max-w-[14.5rem] sm:max-w-[16rem]"
                    height={760}
                    priority
                    sizes="(max-width: 1280px) 72vw, 30vw"
                    src={heroImageSrc}
                    width={540}
                  />
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-[1rem] border border-white/12 bg-white/8 p-3">
                    <p className="text-[0.58rem] uppercase tracking-[0.14em] text-white/50">
                      Produto em destaque
                    </p>
                    <p className="mt-1 text-[0.78rem] leading-5 text-white/78">
                      Imagem limpa, coleção identificada e acesso rápido ao detalhe da peça.
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-white/12 bg-white/8 p-3">
                    <p className="text-[0.58rem] uppercase tracking-[0.14em] text-white/50">
                      Compra clara
                    </p>
                    <p className="mt-1 text-[0.78rem] leading-5 text-white/78">
                      Catálogo, favoritos e acompanhamento do pedido seguem a mesma base de
                      informação.
                    </p>
                  </div>
                </div>
              </div>
            </article>

            <div className="grid gap-3 md:grid-cols-[1.02fr_0.98fr]">
              <article className="panel rounded-[1.25rem] p-3.5 sm:p-4">
              <p className="eyebrow">Narrativa de marca</p>
              <h3 className="mt-2 font-display text-[clamp(1.55rem,2vw,2.05rem)] leading-[0.98] text-ink">
                Peças autorais para jogo, rotina e deslocamento com leitura direta da coleção.
              </h3>
              <p className="mt-2 text-[0.8rem] leading-5 text-slate">
                A home combina destaque de produto, coleção e apoio ao cliente para transformar
                interesse em compra com mais confiança e menos ruído.
              </p>
            </article>

              <Link
                className="panel rounded-[1.25rem] p-3 sm:p-3.5"
                href={secondaryCampaign?.ctaLink ?? `/produto/${secondaryProduct.slug}`}
              >
                <div
                  className="rounded-[1rem] p-2.5"
                  style={{
                    backgroundImage: secondaryCampaign?.accentColor
                      ? `linear-gradient(135deg, ${secondaryCampaign.accentColor} 0%, #f5f0e8 100%)`
                      : secondaryProduct.gradient
                  }}
                >
                  <Image
                    alt={secondaryCampaign?.publicTitle ?? secondaryProduct.name}
                    className="mx-auto"
                    height={240}
                    priority={secondaryImageSrc !== heroImageSrc}
                    sizes="(max-width: 1024px) 68vw, 18vw"
                    src={secondaryImageSrc}
                    width={210}
                  />
                </div>
                <div className="mt-3">
                  <p className="text-[0.58rem] uppercase tracking-[0.14em] text-slate">
                    Peça em destaque
                  </p>
                  <h3 className="mt-1 text-[0.92rem] font-semibold text-ink">
                    {secondaryCampaign?.publicTitle ?? secondaryProduct.name}
                  </h3>
                  <p className="mt-1 text-[0.78rem] leading-5 text-slate">
                    {secondaryCampaign?.description ?? secondaryProduct.subtitle}
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="shell mt-12 lg:mt-14">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            description="Peças em foco para comparar proposta, faixa de preço e linguagem visual sem ruído promocional."
            eyebrow="Peças em foco"
            title="Peças autorais para entrar na coleção com contexto e preço claros."
          />
          <Link className="button-secondary button-compact justify-center" href="/colecao">
            Ver coleção completa
          </Link>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {productRail.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </section>

      <section className="shell mt-12 lg:mt-14">
        <div className="grid gap-3 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="panel-dark rounded-[1.65rem] p-4 sm:p-5">
            <p className="eyebrow !text-white/58">{tournamentCapsuleName}</p>
            <h2 className="mt-2.5 max-w-[12ch] font-display text-[clamp(1.85rem,2.5vw,2.55rem)] leading-[0.96] text-white">
              Uma linha especial para quem procura contraste forte e presença mais marcada.
            </h2>
            <p className="mt-2.5 max-w-2xl text-[0.8rem] leading-5 text-white/74">
              A seleção recebe espaço próprio sem perder a coerência com o restante da loja:
              produto em destaque, leitura direta e suporte claro para a compra.
            </p>

            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              {[
                ["Paleta noturna", "Uma linha com contraste alto para quem prefere presença visual mais marcada."],
                ["Presença de coleção", "A peça especial convive com o catálogo sem perder identidade própria."],
                ["Leitura direta", "Preço, detalhe e acesso ao produto aparecem de forma direta."]
              ].map(([title, description]) => (
                <div className="rounded-[1rem] border border-white/12 bg-white/8 p-3" key={title}>
                  <p className="text-[0.58rem] uppercase tracking-[0.14em] text-white/45">{title}</p>
                  <p className="mt-1 text-[0.78rem] leading-5 text-white/78">{description}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Link className="button-accent justify-center" href={capsuleLink}>
                Ver peça em destaque
              </Link>
              <Link
                className="button-secondary justify-center"
                href={`/colecao?collection=${tournamentCollectionSlug}`}
              >
                Abrir coleção relacionada
              </Link>
            </div>
          </div>

          <div className="grid gap-3">
            <article
              className="panel relative overflow-hidden rounded-[1.65rem] p-4 sm:p-5"
              style={{ backgroundImage: capsuleProduct.gradient }}
            >
              <div className="absolute inset-0 bg-campaign-lines opacity-80" />
              <div className="relative flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="max-w-[19rem] text-white">
                  <p className="text-[0.58rem] uppercase tracking-[0.14em] text-white/70">
                    Produto destaque
                  </p>
                  <h3 className="mt-2 font-display text-[clamp(1.65rem,2.2vw,2.1rem)] leading-[0.98]">
                    {capsuleProduct.name}
                  </h3>
                  <p className="mt-2 text-[0.78rem] leading-5 text-white/80">{capsuleProduct.description}</p>
                </div>
                <Image
                  alt={capsuleProduct.name}
                  className="mx-auto h-auto w-full max-w-[10.5rem] sm:max-w-[11.5rem]"
                  height={320}
                  sizes="(max-width: 1024px) 45vw, 18vw"
                  src={capsuleProduct.image}
                  width={240}
                />
              </div>
            </article>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="panel rounded-[1.25rem] p-3.5">
                <p className="text-[0.58rem] uppercase tracking-[0.14em] text-slate">Peça</p>
                <p className="mt-2 text-[0.92rem] font-semibold text-ink">{capsuleProduct.subtitle}</p>
                <p className="mt-1.5 text-[0.78rem] leading-5 text-slate">
                  {capsuleProduct.highlights[0] ?? "Construção autoral com presença visual e leitura direta da peça."}
                </p>
              </div>
              <div className="panel rounded-[1.25rem] p-3.5">
                <p className="text-[0.58rem] uppercase tracking-[0.14em] text-slate">Uso</p>
                <p className="mt-2 text-[0.92rem] font-semibold text-ink">Jogo, coleção e rotina</p>
                <p className="mt-1.5 text-[0.78rem] leading-5 text-slate">
                  Serve como ponto de entrada para quem procura uma peça mais expressiva dentro da
                  coleção.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="shell mt-12 lg:mt-14">
        <div className="grid gap-3 lg:grid-cols-[0.94fr_1.06fr]">
          <div className="panel rounded-[1.65rem] p-4 sm:p-5">
            <p className="eyebrow">Navegação</p>
            <h2 className="display-section mt-2.5 max-w-[14ch] text-balance">
              Encontre a linha certa para o seu momento de uso.
            </h2>
            <p className="lead-text mt-2.5 max-w-xl text-slate">
              Partida, Travel e seleção especial ajudam a entrar na coleção por proposta de uso, e
              não por excesso de elementos promocionais.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {editorialPillars.map((pillar) => (
              <Link className="story-card" href={pillar.href} key={pillar.title}>
                <p className="text-[0.64rem] uppercase tracking-[0.16em] text-slate">Curadoria</p>
                <h3 className="mt-2 text-[0.98rem] font-semibold text-ink">{pillar.title}</h3>
                <p className="mt-2 text-[0.82rem] leading-5 text-slate">{pillar.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="shell mt-12 lg:mt-14">
        <div className="grid gap-3 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="panel-dark rounded-[1.65rem] p-4 sm:p-5">
            <p className="eyebrow !text-white/55">Loja organizada</p>
            <h2 className="mt-2.5 max-w-[13ch] font-display text-[clamp(1.75rem,2.2vw,2.35rem)] leading-[0.98] text-white">
              Entrega, suporte e políticas claras reforçam a confiança na compra.
            </h2>
            <p className="mt-2.5 max-w-xl text-[0.8rem] leading-5 text-white/72">
              A experiência fica mais confiável quando compra, pós-compra e institucional seguem a
              mesma régua de clareza e maturidade comercial.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {institutionalHighlights.map((route) => (
              <Link className="story-card" href={route.href} key={route.href}>
                <h3 className="text-[1rem] font-semibold text-ink">{route.title}</h3>
                <p className="mt-2 text-[0.82rem] leading-5 text-slate">{route.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
