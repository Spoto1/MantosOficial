import { AdminPanel } from "@/components/admin/admin-panel";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { AdminUploadStudio } from "@/components/admin/admin-upload-studio";
import { requireAdminAuth } from "@/lib/auth/admin";
import { getMediaAssets } from "@/lib/repositories/uploads";
import { summarizeStorageDriver } from "@/lib/runtime-config";

export const dynamic = "force-dynamic";

export default async function AdminUploadsPage() {
  const session = await requireAdminAuth("uploads");
  const assets = await getMediaAssets();
  const storageDriver = summarizeStorageDriver();
  const externalStorageReady = storageDriver !== "local";

  return (
    <AdminShell
      currentPath="/admin/uploads"
      description="Envie imagens pelo navegador e reutilize assets em campanhas e banners dentro do acervo operacional."
      session={session}
      title="Uploads do admin"
    >
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        <AdminStatCard
          helper={
            assets.length > 0
              ? "Assets reais disponíveis para campanhas e peças administrativas."
              : "Nenhum asset operacional real publicado neste acervo."
          }
          label="Assets reais"
          value={assets.length}
        />
        <AdminStatCard
          helper={
            externalStorageReady
              ? "O painel já aponta para storage externo nesta leitura."
              : "O admin continua usando storage local nesta rodada."
          }
          label="Driver"
          value={externalStorageReady ? storageDriver : "local-public"}
        />
        <AdminStatCard
          helper={
            externalStorageReady
              ? "Pré-requisito de go-live atendido para uploads."
              : "Antes do go-live, ainda falta migrar o admin para storage externo."
          }
          label="Go-live"
          value={externalStorageReady ? "Pronto" : "Pendente"}
        />
      </div>

      <AdminPanel
        description="Studio compacto com validação de formato e tamanho. Se o acervo estiver vazio, ainda não há assets operacionais publicados."
        title="Studio de assets"
      >
        <AdminUploadStudio assets={assets} />
      </AdminPanel>
    </AdminShell>
  );
}
