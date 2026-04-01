import type { Metadata } from "next";
import Image from "next/image";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCartForm } from "@/components/add-to-cart-form";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { EmptyState } from "@/components/empty-state";
import { FavoriteButton } from "@/components/favorite-button";
import { ProductCard } from "@/components/product-card";
import { getProductBySlug, getRelatedProducts } from "@/lib/data";
import { absoluteUrl, buildMetadata, siteName } from "@/lib/seo";
import { resolveAppUrlFromHeaders } from "@/lib/runtime-config";
import { isTournamentCapsule, tournamentCapsuleName } from "@/lib/storefront-editorial";
import { formatCurrency } from "@/lib/utils";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const product = await getProductBySlug(resolvedParams.slug);

  if (!product) {
    return buildMetadata({
      title: "Produto não encontrado",
      path: `/produto/${resolvedParams.slug}`,
      noIndex: true
    });
  }

  const metadataDescription = `${product.subtitle}. ${product.highlights[0] ?? product.description}`;

  return buildMetadata({
    title: `${product.name} - ${product.collection}`,
    description: metadataDescription,
    path: `/produto/${product.slug}`,
    image: product.image
  });
}

export default async function ProductPage({ params }: ProductPageProps) {
  const resolvedParams = await params;
  const requestAppUrl = resolveAppUrlFromHeaders(await headers());
  const product = await getProductBySlug(resolvedParams.slug);

  if (!product) {
    notFound();
  }

  const relatedProducts = await getRelatedProducts(product.slug, product.collectionSlug);
  const isCapsule = isTournamentCapsule(product);
  const savingsPercentage =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round((1 - product.price / product.compareAtPrice) * 100)
      : null;
  const priceValidUntil = new Date();
  priceValidUntil.setDate(priceValidUntil.getDate() + 30);
  const breadcrumbItems = [
    { label: "Início", href: "/" },
    { label: "Coleção", href: "/colecao" },
    { label: product.collection, href: `/colecao?collection=${product.collectionSlug}` },
    { label: product.name }
  ];
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.map((image) => absoluteUrl(image, requestAppUrl)),
    sku: product.sku,
    category: product.category,
    color: product.colors.join(", "),
    material: product.material,
    offers: {
      "@type": "Offer",
      priceCurrency: "BRL",
      price: product.price,
      priceValidUntil: priceValidUntil.toISOString().split("T")[0],
      availability:
        product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      url: absoluteUrl(`/produto/${product.slug}`, requestAppUrl),
      seller: {
        "@type": "Organization",
        name: siteName
      }
    },
    brand: {
      "@type": "Brand",
      name: siteName
    }
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: absoluteUrl(item.href ?? `/produto/${product.slug}`, requestAppUrl)
    }))
  };

  return (
    <div className="shell py-6 lg:py-7">
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify([productJsonLd, breadcrumbJsonLd]) }}
        type="application/ld+json"
      />

      <Breadcrumbs className="mb-5" items={breadcrumbItems} />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
        <div
          className="relative overflow-hidden rounded-[1.85rem] p-4 shadow-float sm:p-5"
          style={{ backgroundImage: product.gradient }}
        >
          <div className="absolute inset-0 bg-campaign-lines opacity-95" />
          <div className="relative flex h-full flex-col justify-between gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <span className="campaign-chip">{product.collection}</span>
                <span className="campaign-chip">{product.category}</span>
                {isCapsule ? <span className="campaign-chip">{tournamentCapsuleName}</span> : null}
              </div>
              <span className="rounded-full border border-white/22 px-3 py-1 text-[0.64rem] uppercase tracking-[0.14em] text-white/78">
                {product.type}
              </span>
            </div>

            <div className="flex justify-center">
              <Image
                alt={`Camisa ${product.name} da coleção ${product.collection}`}
                className="h-auto w-full max-w-[22rem]"
                height={980}
                priority
                sizes="(max-width: 1280px) 88vw, 38vw"
                src={product.image}
                width={640}
              />
            </div>

            <div className="grid gap-2.5 sm:grid-cols-3">
              {[
                ["Modelagem", product.fit],
                ["Material", product.material],
                [
                  isCapsule ? "Posição" : "Linha",
                  isCapsule
                    ? "Peça destacada dentro da seleção especial da coleção."
                    : `${product.collection} / ${product.category}`
                ]
              ].map(([label, value]) => (
                <div
                  className="rounded-[1.05rem] border border-white/18 bg-black/10 p-3 text-white"
                  key={label}
                >
                  <p className="text-[0.58rem] uppercase tracking-[0.16em] text-white/56">{label}</p>
                  <p className="mt-1.5 text-[0.8rem] leading-5">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel rounded-[1.7rem] p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-xl">
                <p className="eyebrow">{isCapsule ? `${tournamentCapsuleName}` : "Curadoria da coleção"}</p>
                <h1 className="display-page mt-2.5 max-w-[9ch] text-balance">{product.name}</h1>
                <p className="lead-text mt-2.5 text-slate">{product.subtitle}</p>
              </div>
              <div className="text-right">
                <p className="text-[1.6rem] font-semibold text-ink sm:text-[1.8rem]">
                  {formatCurrency(product.price)}
                </p>
                {product.compareAtPrice ? (
                  <p className="mt-1.5 text-[0.82rem] text-slate line-through">
                    {formatCurrency(product.compareAtPrice)}
                  </p>
                ) : null}
                <p className="mt-1.5 text-[0.62rem] uppercase tracking-[0.16em] text-slate">
                  Frete grátis acima de R$ 650,00
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="status-badge">{product.collection}</span>
              <span className="status-badge">{product.category}</span>
              <span className="status-badge">
                {product.stock > 0 ? "Disponível agora" : "Disponibilidade sob consulta"}
              </span>
              {product.isNew ? <span className="status-badge">Novo</span> : null}
              {product.isBestSeller ? <span className="status-badge">Best-seller</span> : null}
              {savingsPercentage ? <span className="status-badge">-{savingsPercentage}%</span> : null}
              {isCapsule ? <span className="status-badge">Edição especial</span> : null}
            </div>

            <p className="mt-4 text-[0.88rem] leading-6 text-slate">{product.description}</p>

            <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {product.highlights.map((highlight, index) => (
                <div
                  className={
                    isCapsule && index === 0
                      ? "rounded-[1.1rem] border border-[#17342d]/10 bg-[#17342d] p-3.5 text-white"
                      : "metric-card"
                  }
                  key={highlight}
                >
                  <p className={`text-[0.8rem] leading-5 ${isCapsule && index === 0 ? "text-white/80" : "text-slate"}`}>
                    {highlight}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-2.5 border-t border-black/5 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[0.84rem] font-medium text-ink">Salvar para depois</p>
                <p className="mt-1 text-[0.8rem] leading-5 text-slate">
                  Guarde a peça nos favoritos para retomar a escolha com mais contexto e menos pressa.
                </p>
              </div>
              <FavoriteButton productId={product.id} productName={product.name} />
            </div>
          </div>

          <AddToCartForm product={product} />

          <div className="panel grid gap-4 rounded-[1.7rem] p-4 sm:grid-cols-[1.1fr_0.9fr] sm:p-5">
            <div>
              <p className="text-[0.62rem] font-medium uppercase tracking-[0.16em] text-slate">
                Detalhes
              </p>
              <ul className="mt-3.5 space-y-2">
                {product.details.map((detail) => (
                  <li className="flex items-start gap-3 text-[0.82rem] leading-5 text-slate" key={detail}>
                    <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 rounded-full bg-ink" />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="panel-dark rounded-[1.3rem] p-3.5">
              <p className="text-[0.62rem] uppercase tracking-[0.16em] text-white/48">
                {isCapsule ? "Peça especial" : "Compra e uso"}
              </p>
              <div className="mt-2.5 space-y-2.5 text-[0.82rem] leading-5 text-white/76">
                <p>
                  {isCapsule
                    ? "Uma peça destacada da edição especial, com a mesma leitura clara de disponibilidade, carrinho e pós-compra do restante da loja."
                    : "Frete padrão grátis acima de R$ 650,00. Escolha a variação, adicione ao carrinho e revise a compra no checkout antes do pagamento."}
                </p>
                <p>
                  Origem: <span className="text-white">{product.country}</span> • Temporada{" "}
                  <span className="text-white">{product.season}</span>
                </p>
                <p>
                  Cores principais: <span className="text-white">{product.colors.join(" • ")}</span>
                </p>
              </div>
              <Link
                className={`${isCapsule ? "button-accent" : "button-primary"} mt-4 w-full justify-center`}
                href="/colecao"
              >
                Continuar explorando
              </Link>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-14">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Relacionados</p>
            <h2 className="display-section mt-2.5 max-w-sm text-balance">
              Outras peças desta curadoria
            </h2>
          </div>
          <Link className="button-secondary button-compact justify-center" href={`/colecao?collection=${product.collectionSlug}`}>
            Ver coleção {product.collection}
          </Link>
        </div>

        {relatedProducts.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              description="Ainda não há outras peças ativas nesta linha. Continue navegando pelo catálogo completo para ampliar a curadoria."
              primaryAction={{ label: "Ver coleção completa", href: "/colecao" }}
              title="Sem peças relacionadas por enquanto."
            />
          </div>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {relatedProducts.map((relatedProduct) => (
              <ProductCard key={relatedProduct.slug} product={relatedProduct} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
