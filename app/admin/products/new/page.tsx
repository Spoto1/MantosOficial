import { AdminProductForm } from "@/components/admin/admin-product-form";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminAuth } from "@/lib/auth/admin";
import { getAdminProductFormData } from "@/lib/repositories/admin";

export const dynamic = "force-dynamic";

export default async function NewAdminProductPage() {
  const session = await requireAdminAuth("products");
  const formData = await getAdminProductFormData();

  return (
    <AdminShell
      currentPath="/admin/products/new"
      description="Crie novos produtos, defina a identidade cromática e gere variantes automaticamente."
      session={session}
      title="Novo produto"
    >
      <AdminProductForm
        categories={formData.categories}
        collections={formData.collections}
        sizes={formData.sizes}
      />
    </AdminShell>
  );
}
