import { AdminImageUploadField } from "@/components/admin/admin-image-upload-field";
import { saveCampaignAction } from "@/lib/actions/admin";
import {
  CAMPAIGN_PLACEMENT_VALUES,
  CAMPAIGN_STATUS_VALUES,
  CAMPAIGN_TYPE_VALUES
} from "@/lib/validators";

type CampaignFormData = {
  collections: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  products: Array<{ id: string; name: string; slug: string }>;
  assets: Array<{ id: string; label: string; url: string }>;
};

type CampaignValue = {
  id: string;
  internalTitle: string;
  slug: string;
  type: string;
  placement: string;
  status: string;
  publicTitle: string;
  publicSubtitle: string | null;
  description: string | null;
  ctaLabel: string | null;
  ctaLink: string | null;
  desktopImageUrl: string | null;
  mobileImageUrl: string | null;
  cardImageUrl: string | null;
  desktopAssetId: string | null;
  mobileAssetId: string | null;
  cardAssetId: string | null;
  position: number;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
  priority: number;
  accentColor: string | null;
  isPrimary: boolean;
  collectionId: string | null;
  categoryId: string | null;
  productId: string | null;
};

type AdminCampaignFormProps = CampaignFormData & {
  campaign?: CampaignValue | null;
};

function formatDateTimeLocal(value: Date | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

export function AdminCampaignForm({
  campaign,
  collections,
  categories,
  products,
  assets
}: AdminCampaignFormProps) {
  return (
    <form
      action={saveCampaignAction}
      className="space-y-8 rounded-[2.25rem] border border-black/5 bg-white/90 p-6 shadow-soft sm:p-8"
    >
      <input name="id" type="hidden" value={campaign?.id ?? ""} />
      <input name="redirectTo" type="hidden" value="/admin/campaigns" />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Título interno</span>
          <input
            className="field-input"
            defaultValue={campaign?.internalTitle ?? ""}
            name="internalTitle"
            required
            type="text"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Slug</span>
          <input
            className="field-input"
            defaultValue={campaign?.slug ?? ""}
            name="slug"
            required
            type="text"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Tipo</span>
          <select className="field-input" defaultValue={campaign?.type ?? "HERO"} name="type">
            {CAMPAIGN_TYPE_VALUES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Local</span>
          <select
            className="field-input"
            defaultValue={campaign?.placement ?? "HOME_HERO"}
            name="placement"
          >
            {CAMPAIGN_PLACEMENT_VALUES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Status</span>
          <select className="field-input" defaultValue={campaign?.status ?? "DRAFT"} name="status">
            {CAMPAIGN_STATUS_VALUES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Prioridade</span>
          <input
            className="field-input"
            defaultValue={campaign?.priority ?? 0}
            min={0}
            name="priority"
            type="number"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Título público</span>
          <input
            className="field-input"
            defaultValue={campaign?.publicTitle ?? ""}
            name="publicTitle"
            required
            type="text"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Subtítulo público</span>
          <input
            className="field-input"
            defaultValue={campaign?.publicSubtitle ?? ""}
            name="publicSubtitle"
            type="text"
          />
        </label>
      </div>

      <label className="space-y-2">
        <span className="text-sm font-medium text-ink">Descrição curta</span>
        <textarea
          className="field-input min-h-28 resize-y"
          defaultValue={campaign?.description ?? ""}
          name="description"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">CTA label</span>
          <input className="field-input" defaultValue={campaign?.ctaLabel ?? ""} name="ctaLabel" type="text" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">CTA link</span>
          <input className="field-input" defaultValue={campaign?.ctaLink ?? ""} name="ctaLink" type="text" />
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <AdminImageUploadField
          assetIdName="desktopAssetId"
          assets={assets}
          helper="Imagem principal para desktop."
          initialAssetId={campaign?.desktopAssetId}
          initialUrl={campaign?.desktopImageUrl}
          label="Imagem desktop"
          urlName="desktopImageUrl"
        />
        <AdminImageUploadField
          assetIdName="mobileAssetId"
          assets={assets}
          helper="Variação otimizada para mobile."
          initialAssetId={campaign?.mobileAssetId}
          initialUrl={campaign?.mobileImageUrl}
          label="Imagem mobile"
          urlName="mobileImageUrl"
        />
        <AdminImageUploadField
          assetIdName="cardAssetId"
          assets={assets}
          helper="Imagem opcional para cards promocionais."
          initialAssetId={campaign?.cardAssetId}
          initialUrl={campaign?.cardImageUrl}
          label="Imagem card"
          urlName="cardImageUrl"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Posição</span>
          <input
            className="field-input"
            defaultValue={campaign?.position ?? 0}
            min={0}
            name="position"
            type="number"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Data de início</span>
          <input
            className="field-input"
            defaultValue={formatDateTimeLocal(campaign?.startsAt)}
            name="startsAt"
            type="datetime-local"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Data de fim</span>
          <input
            className="field-input"
            defaultValue={formatDateTimeLocal(campaign?.endsAt)}
            name="endsAt"
            type="datetime-local"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Cor de destaque</span>
          <input
            className="field-input"
            defaultValue={campaign?.accentColor ?? ""}
            name="accentColor"
            placeholder="#8b342e"
            type="text"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Coleção vinculada</span>
          <select className="field-input" defaultValue={campaign?.collectionId ?? ""} name="collectionId">
            <option value="">Sem coleção</option>
            {collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Categoria vinculada</span>
          <select className="field-input" defaultValue={campaign?.categoryId ?? ""} name="categoryId">
            <option value="">Sem categoria</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Produto vinculado</span>
          <select className="field-input" defaultValue={campaign?.productId ?? ""} name="productId">
            <option value="">Sem produto</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            name: "isActive",
            label: "Campanha ativa",
            defaultChecked: campaign?.isActive ?? true
          },
          {
            name: "isPrimary",
            label: "Campanha principal",
            defaultChecked: campaign?.isPrimary ?? false
          }
        ].map((item) => (
          <label
            className="flex items-center gap-3 rounded-[1.5rem] border border-black/10 bg-sand px-4 py-3 text-sm"
            key={item.name}
          >
            <input defaultChecked={item.defaultChecked} name={item.name} type="checkbox" />
            <span>{item.label}</span>
          </label>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button className="button-primary justify-center" type="submit">
          Salvar campanha
        </button>
        <p className="max-w-2xl text-sm leading-7 text-slate">
          O storefront já pode consumir campanhas de HOME_HERO e HOME_SECONDARY sem editar a
          home manualmente.
        </p>
      </div>
    </form>
  );
}
