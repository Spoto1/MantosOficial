import Image from "next/image";
import Link from "next/link";

import { isTournamentCapsule } from "@/lib/storefront-editorial";
import type { StorefrontProduct } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type ProductCardProps = {
  product: StorefrontProduct;
  priority?: boolean;
};

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const badges = [
    product.isNew ? "Novo" : null,
    product.isBestSeller ? "Best-seller" : null,
    product.isRetro ? "Retrô" : null
  ].filter(Boolean);
  const isCapsule = isTournamentCapsule(product);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-black/5 bg-white/88 shadow-soft backdrop-blur">
      <Link
        className="relative overflow-hidden px-3.5 pb-3 pt-3.5"
        href={`/produto/${product.slug}`}
        style={{ backgroundImage: product.gradient }}
      >
        <div className="absolute inset-0 bg-campaign-lines opacity-95" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="space-y-1">
            <span className="inline-flex rounded-full border border-white/30 bg-white/15 px-2 py-1 text-[0.56rem] font-medium uppercase tracking-[0.14em] text-white/95">
              {product.collection}
            </span>
            {isCapsule ? <span className="campaign-chip">Edição especial</span> : null}
            {badges.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {badges.map((badge) => (
                  <span
                    className="inline-flex rounded-full border border-white/25 bg-black/15 px-2 py-1 text-[0.54rem] font-semibold uppercase tracking-[0.12em] text-white"
                    key={badge}
                  >
                    {badge}
                  </span>
                ))}
              </div>
            ) : product.badge ? (
              <p className="text-[0.8rem] font-medium text-white/90">{product.badge}</p>
            ) : null}
          </div>
          <span className="rounded-full border border-white/30 bg-black/10 px-2 py-1 text-[0.54rem] uppercase tracking-[0.14em] text-white/90">
            {product.category}
          </span>
        </div>
        <div className="relative mt-3.5 flex justify-center">
          <Image
            alt={`Camisa ${product.name}`}
            className="h-auto w-full max-w-[11.75rem] transition duration-500 group-hover:scale-[1.04] sm:max-w-[12.5rem]"
            height={560}
            priority={priority}
            sizes="(max-width: 768px) 68vw, (max-width: 1280px) 34vw, 20vw"
            src={product.image}
            width={440}
          />
        </div>
      </Link>

      <div className="flex flex-1 flex-col justify-between gap-3 p-3.5">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              {product.palette.map((color) => (
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full border border-black/10"
                  key={color}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <p className="text-[0.56rem] uppercase tracking-[0.14em] text-slate">{product.type}</p>
          </div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[0.96rem] font-semibold leading-5 text-ink">{product.name}</h3>
              <p className="mt-1 line-clamp-2 text-[0.82rem] leading-5 text-slate">{product.subtitle}</p>
            </div>
            <div className="text-right">
              <p className="text-[0.92rem] font-semibold text-ink">{formatCurrency(product.price)}</p>
              {product.compareAtPrice ? (
                <p className="text-[0.74rem] text-slate line-through">
                  {formatCurrency(product.compareAtPrice)}
                </p>
              ) : null}
            </div>
          </div>

          <ul className="space-y-1 text-[0.8rem] leading-5 text-slate">
            {product.details.slice(0, 2).map((detail) => (
              <li className="flex items-start gap-2" key={detail}>
                <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 rounded-full bg-ink" />
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-black/5 pt-2.5">
          <span className="status-badge">
            {product.stock > 0 ? "Disponível agora" : "Disponibilidade sob consulta"}
          </span>
          <Link className="button-secondary button-compact justify-center px-3.5" href={`/produto/${product.slug}`}>
            Ver produto
          </Link>
        </div>
      </div>
    </article>
  );
}
