import Image from "next/image";
import Link from "next/link";

import { AdminPanel } from "@/components/admin/admin-panel";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import {
  toggleAdminProductAction,
  updateAdminProductStockAction
} from "@/lib/actions/admin";
import { requireAdminAuth } from "@/lib/auth/admin";
import { getAdminProducts } from "@/lib/repositories/admin";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const session = await requireAdminAuth("products");
  const products = await getAdminProducts();

  return (
    <AdminShell
      actions={
        <Link className="button-primary justify-center" href="/admin/products/new">
          Novo produto
        </Link>
      }
      currentPath="/admin/products"
      description="Edite catálogo, estoque e disponibilidade sem alterar o storefront público."
      session={session}
      title="Produtos"
    >
      <AdminPanel description="Catálogo ativo e controles rápidos de estoque/publicação." title="Catálogo">
        <div className="grid gap-4">
          {products.map((product) => (
            <article className="rounded-[2rem] border border-black/5 bg-white p-5" key={product.id}>
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex gap-4">
                  <div className="rounded-[1.5rem] bg-sand p-3">
                    <Image
                      alt={product.name}
                      className="h-auto w-auto"
                      height={112}
                      sizes="92px"
                      src={product.images[0]?.url ?? "/products/atlas-home.svg"}
                      width={92}
                    />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate">{product.sku}</p>
                      <AdminStatusBadge label={product.isActive ? "Ativo" : "Inativo"} tone={product.isActive ? "success" : "warning"} />
                      <AdminStatusBadge
                        label={product.stock > 0 ? `${product.stock} em estoque` : "Sem estoque"}
                        tone={product.stock > 0 ? "neutral" : "danger"}
                      />
                    </div>
                    <h2 className="mt-3 text-2xl font-semibold text-ink">{product.name}</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-slate">
                      {product.shortDescription}
                    </p>
                    <p className="mt-3 text-sm text-slate">
                      {product.collection.name} • {product.category.name}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 xl:min-w-[22rem]">
                  <div className="flex items-center justify-between text-sm text-slate">
                    <span>Preço</span>
                    <strong className="text-ink">{formatCurrency(Number(product.price))}</strong>
                  </div>

                  <form action={updateAdminProductStockAction} className="flex flex-col gap-3 sm:flex-row">
                    <input name="productId" type="hidden" value={product.id} />
                    <input
                      className="field-input sm:max-w-[8rem]"
                      defaultValue={product.stock}
                      min={0}
                      name="stock"
                      type="number"
                    />
                    <button className="button-secondary justify-center" type="submit">
                      Atualizar estoque
                    </button>
                  </form>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <form action={toggleAdminProductAction}>
                      <input name="productId" type="hidden" value={product.id} />
                      <input name="isActive" type="hidden" value={product.isActive ? "false" : "true"} />
                      <button className="button-secondary justify-center" type="submit">
                        {product.isActive ? "Desativar" : "Ativar"}
                      </button>
                    </form>
                    <Link className="button-primary justify-center" href={`/admin/products/${product.id}`}>
                      Editar
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </AdminPanel>
    </AdminShell>
  );
}
