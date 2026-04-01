import { AdminCampaignForm } from "@/components/admin/admin-campaign-form";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminAuth } from "@/lib/auth/admin";
import { getCampaignFormData } from "@/lib/repositories/campaigns";

export const dynamic = "force-dynamic";

export default async function NewAdminCampaignPage() {
  const session = await requireAdminAuth("campaigns");
  const formData = await getCampaignFormData();

  return (
    <AdminShell
      currentPath="/admin/campaigns/new"
      description="Cadastre peças promocionais com agenda, prioridade, assets e vínculos com catálogo."
      session={session}
      title="Nova campanha"
    >
      <AdminCampaignForm
        assets={formData.assets}
        categories={formData.categories}
        collections={formData.collections}
        products={formData.products}
      />
    </AdminShell>
  );
}
