import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { EmptyState } from "@/components/empty-state";
import { ProductCard } from "@/components/product-card";
import { getCollectionOptions, getProducts, sortOptions } from "@/lib/data";
import {
  isTournamentCapsule,
  tournamentCapsuleName,
  tournamentCollectionSlug
} from "@/lib/storefront-editorial";
import { buildMetadata } from "@/lib/seo";

type SearchParams = {
  collection?: string;
  sort?: string;
};

type SortValue = (typeof sortOptions)[number]["value"];

type CollectionPageProps = {
  searchParams?: Promise<SearchParams>;
};

export const metadata: Metadata = buildMetadata({
  title: "Coleção completa",
  description:
    "Explore a coleção da Mantos Oficial com filtros claros, comparação simples e peças organizadas por linha.",
  path: "/colecao"
});

function buildQuery(collection: string, sort: string) {
  const params = new URLSearchParams();

  if (collection !== "all") {
    params.set("collection", collection);
  }

  if (sort !== "featured") {
    params.set("sort", sort);
  }

  const query = params.toString();
  return query ? `/colecao?${query}` : "/colecao";
}

export const dynamic = "force-dynamic";

export default async function CollectionPage({ searchParams }: CollectionPageProps) {
  const collectionOptions = await getCollectionOptions();
  const resolved: SearchParams = (await searchParams) ?? {};
  const selectedCollection = collectionOptions.some(
    (option) => option.slug === (resolved.collection ?? "all")
  )
    ? (resolved.collection ?? "all")
    : "all";
  const selectedSort: SortValue = sortOptions.some((option) => option.value === resolved.sort)
    ? ((resolved.sort ?? "featured") as SortValue)
    : "featured";

  const sortedProducts = await getProducts({
    collectionSlug: selectedCollection === "all" ? undefined : selectedCollection,
    sort: selectedSort
  });
  const spotlightProducts =
    selectedCollection === "all" ? sortedProducts : await getProducts({ sort: "featured" });
  const selectedCollectionLabel =
    collectionOptions.find((option) => option.slug === selectedCollection)?.name ?? "Todos";
  const capsuleProduct =
    spotlightProducts.find((product) => isTournamentCapsule(product)) ?? sortedProducts[0] ?? null;
  const collectionHeadline =
    selectedCollection === "all"
      ? "Coleção completa com filtros claros para comparar peças por linha."
      : `${selectedCollectionLabel} com leitura direta da linha e comparação mais objetiva entre peças.`;
  const collectionDescription =
    selectedCollection === "all"
      ? "Filtre por linha, compare proposta de uso e navegue por uma grade pensada para mostrar peça, preço e disponibilidade sem ruído."
      : `Você está vendo a linha ${selectedCollectionLabel}. A grade reúne peças com a mesma direção para facilitar comparação, escolha e retorno ao produto certo.`;

  return (
    <section className="shell py-6 lg:py-7">
      <Breadcrumbs
        className="mb-5"
        items={[
          { label: "Início", href: "/" },
          { label: "Coleção" },
          ...(selectedCollection !== "all" ? [{ label: selectedCollectionLabel }] : [])
        ]}
      />

      <div className="panel mt-2 grid gap-3 rounded-[1.65rem] p-4 sm:p-4 lg:grid-cols-[minmax(0,1.02fr)_minmax(15rem,0.98fr)] lg:p-5">
        <div className="space-y-3">
          <p className="eyebrow">Catálogo</p>
          <h1 className="display-page max-w-[10.5ch] text-balance">
            {collectionHeadline}
          </h1>
          <p className="lead-text max-w-2xl text-slate">
            {collectionDescription}
          </p>

          <div className="grid gap-2 sm:grid-cols-3">
            {[
              ["Linhas autorais", "Partida, Studio, Travel e a edição especial em recortes fáceis de comparar."],
              ["Leitura rápida", "Título, preço e acesso ao produto aparecem com mais respiro e menos ruído."],
              ["Compra clara", "Disponibilidade, favoritos e acesso ao detalhe aparecem de forma objetiva."]
            ].map(([title, description]) => (
              <div className="metric-card" key={title}>
                <p className="text-[0.82rem] font-semibold text-ink">{title}</p>
                <p className="mt-1 text-[0.76rem] leading-5 text-slate">{description}</p>
              </div>
            ))}
          </div>
        </div>

        {capsuleProduct ? (
          <Link
            className="panel-dark relative overflow-hidden rounded-[1.4rem] p-3.5 sm:p-4"
            href={`/produto/${capsuleProduct.slug}`}
            style={{ backgroundImage: capsuleProduct.gradient }}
          >
            <div className="absolute inset-0 bg-campaign-lines opacity-85" />
            <div className="relative flex h-full flex-col justify-between gap-3">
              <div>
                <span className="campaign-chip">{tournamentCapsuleName}</span>
                <h2 className="mt-2.5 font-display text-[clamp(1.55rem,2vw,2rem)] leading-[0.98] text-white">
                  {capsuleProduct.name}
                </h2>
                <p className="mt-2 max-w-[16rem] text-[0.78rem] leading-5 text-white/75">
                  {capsuleProduct.subtitle}
                </p>
              </div>
              <div className="flex items-end justify-between gap-4">
                <Image
                  alt={capsuleProduct.name}
                  className="h-auto w-full max-w-[8rem] sm:max-w-[9rem]"
                  height={260}
                  sizes="(max-width: 1024px) 34vw, 18vw"
                  src={capsuleProduct.image}
                  width={220}
                />
                <span className="rounded-full border border-white/18 px-2.5 py-1 text-[0.58rem] uppercase tracking-[0.12em] text-white/75">
                  {selectedCollection === tournamentCollectionSlug ? "Curadoria atual" : "Ver peça"}
                </span>
              </div>
            </div>
          </Link>
        ) : null}
      </div>

      <div className="panel mt-5 grid gap-3 p-3.5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="space-y-2.5">
          <p className="text-[0.58rem] font-medium uppercase tracking-[0.14em] text-slate">Linhas</p>
          <div className="flex flex-wrap gap-2">
            {collectionOptions.map((option) => {
              const active = option.slug === selectedCollection;

              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={`rounded-full px-3 py-1.5 text-[0.8rem] font-medium transition ${
                    active ? "bg-ink text-white shadow-sm" : "bg-black/5 text-ink hover:bg-white"
                  }`}
                  href={buildQuery(option.slug, selectedSort)}
                  key={option.slug}
                >
                  {option.name}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="space-y-2.5">
          <p className="text-[0.58rem] font-medium uppercase tracking-[0.14em] text-slate">
            Ordenar por
          </p>
          <div className="flex flex-wrap gap-2">
            {sortOptions.map((option) => {
              const active = option.value === selectedSort;

              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={`rounded-full px-3 py-1.5 text-[0.8rem] font-medium transition ${
                    active ? "bg-ink text-white shadow-sm" : "bg-black/5 text-ink hover:bg-white"
                  }`}
                  href={buildQuery(selectedCollection, option.value)}
                  key={option.value}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-1.5 text-[0.8rem] text-slate sm:flex-row sm:items-center sm:justify-between">
        <p>
          {sortedProducts.length} peça{sortedProducts.length > 1 ? "s" : ""} encontrada
          {sortedProducts.length > 1 ? "s" : ""}.
        </p>
        <p>{selectedCollectionLabel} • frete padrão grátis acima de R$ 650,00.</p>
      </div>

      {sortedProducts.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            eyebrow="Sem resultados"
            description="Nenhuma peça ativa atende a essa combinação no momento. Ajuste a linha ou a ordenação para continuar explorando a coleção."
            primaryAction={{ label: "Limpar filtros", href: "/colecao" }}
            secondaryAction={{ label: "Falar com a equipe", href: "/contato" }}
            title="Nenhuma peça ativa nesta curadoria."
          />
        </div>
      ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {sortedProducts.map((product, index) => (
              <ProductCard key={product.slug} priority={index === 0} product={product} />
            ))}
        </div>
      )}
    </section>
  );
}
