import { notFound } from "next/navigation";

import { AdminProductForm } from "@/components/admin/admin-product-form";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminAuth } from "@/lib/auth/admin";
import { getAdminProductById, getAdminProductFormData } from "@/lib/repositories/admin";

type AdminProductPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ saved?: string }>;
};

export const dynamic = "force-dynamic";

export default async function AdminProductPage({ params, searchParams }: AdminProductPageProps) {
  const session = await requireAdminAuth("products");
  const { id } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const [product, formData] = await Promise.all([
    getAdminProductById(id),
    getAdminProductFormData()
  ]);

  if (!product) {
    notFound();
  }

  return (
    <AdminShell
      currentPath={`/admin/products/${product.id}`}
      description="Edite conteúdo, estoque, visual e flags comerciais do produto selecionado."
      session={session}
      title={`Editar ${product.name}`}
    >
      {resolvedSearchParams.saved ? (
        <div className="rounded-[1.75rem] bg-[#e8efe7] px-5 py-4 text-sm text-[#28533a] shadow-soft">
          Produto salvo com sucesso.
        </div>
      ) : null}
      <AdminProductForm
        categories={formData.categories}
        collections={formData.collections}
        product={product}
        sizes={formData.sizes}
      />
    </AdminShell>
  );
}
