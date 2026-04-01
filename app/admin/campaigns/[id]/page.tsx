import { notFound } from "next/navigation";

import { AdminCampaignForm } from "@/components/admin/admin-campaign-form";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminAuth } from "@/lib/auth/admin";
import { getCampaignById, getCampaignFormData } from "@/lib/repositories/campaigns";

type AdminCampaignDetailPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function AdminCampaignDetailPage({
  params
}: AdminCampaignDetailPageProps) {
  const session = await requireAdminAuth("campaigns");
  const { id } = await params;
  const [campaign, formData] = await Promise.all([getCampaignById(id), getCampaignFormData()]);

  if (!campaign) {
    notFound();
  }

  return (
    <AdminShell
      currentPath={`/admin/campaigns/${campaign.id}`}
      description="Edite o conteúdo, os assets e a janela de exibição da campanha."
      session={session}
      title={campaign.internalTitle}
    >
      <AdminCampaignForm
        assets={formData.assets}
        campaign={campaign}
        categories={formData.categories}
        collections={formData.collections}
        products={formData.products}
      />
    </AdminShell>
  );
}
