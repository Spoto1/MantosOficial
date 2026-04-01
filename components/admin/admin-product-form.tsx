import type { ProductRecord } from "@/lib/repositories/product-shared";
import { saveAdminProductAction } from "@/lib/actions/admin";

type AdminProductFormProps = {
  product?: ProductRecord | null;
  collections: Array<{ name: string; slug: string; description?: string | null }>;
  categories: Array<{ name: string; slug: string; description?: string | null }>;
  sizes: Array<{ label: string }>;
};

function uniqueValues(values: string[]) {
  return [...new Set(values)];
}

const productToggleFields = [
  { name: "isFeatured", label: "Destaque" },
  { name: "isNew", label: "Novo" },
  { name: "isBestSeller", label: "Best-seller" },
  { name: "isRetro", label: "Retrô" },
  { name: "isActive", label: "Ativo" }
] as const;

export function AdminProductForm({
  product,
  collections,
  categories,
  sizes
}: AdminProductFormProps) {
  const defaultCollection = product?.collection ?? collections[0];
  const defaultCategory = product?.category ?? categories[0];
  const variantSizes = product
    ? uniqueValues(product.variants.map((variant) => variant.size.label))
    : sizes.map((size) => size.label);
  const variantColors = product
    ? uniqueValues(product.variants.map((variant) => variant.colorName))
    : ["Vermelho mineral", "Creme solar"];

  return (
    <form
      action={saveAdminProductAction}
      className="space-y-8 rounded-[2.25rem] border border-black/5 bg-white/85 p-6 shadow-soft sm:p-8"
    >
      <input name="id" type="hidden" value={product?.id ?? ""} />
      <input name="redirectTo" type="hidden" value="/admin/products" />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Nome</span>
          <input className="field-input" defaultValue={product?.name ?? ""} name="name" required type="text" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Slug</span>
          <input className="field-input" defaultValue={product?.slug ?? ""} name="slug" required type="text" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">SKU</span>
          <input className="field-input" defaultValue={product?.sku ?? ""} name="sku" required type="text" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Estoque total</span>
          <input
            className="field-input"
            defaultValue={product?.stock ?? 0}
            min={0}
            name="stock"
            required
            type="number"
          />
        </label>
      </div>

      <label className="space-y-2">
        <span className="text-sm font-medium text-ink">Descrição curta</span>
        <input
          className="field-input"
          defaultValue={product?.shortDescription ?? ""}
          name="shortDescription"
          required
          type="text"
        />
      </label>

      <label className="space-y-2">
        <span className="text-sm font-medium text-ink">Descrição completa</span>
        <textarea
          className="field-input min-h-36 resize-y"
          defaultValue={product?.description ?? ""}
          name="description"
          required
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Preço</span>
          <input
            className="field-input"
            defaultValue={product ? Number(product.price) : 0}
            min={0}
            name="price"
            required
            step="0.01"
            type="number"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Compare at</span>
          <input
            className="field-input"
            defaultValue={product?.compareAtPrice ? Number(product.compareAtPrice) : ""}
            min={0}
            name="compareAtPrice"
            step="0.01"
            type="number"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">País</span>
          <input className="field-input" defaultValue={product?.country ?? ""} name="country" required type="text" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Temporada</span>
          <input className="field-input" defaultValue={product?.season ?? ""} name="season" required type="text" />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Tipo</span>
          <input className="field-input" defaultValue={product?.type ?? ""} name="type" required type="text" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Modelagem</span>
          <input className="field-input" defaultValue={product?.fit ?? ""} name="fit" required type="text" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Material</span>
          <input className="field-input" defaultValue={product?.material ?? ""} name="material" required type="text" />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Coleção</span>
          <input
            className="field-input"
            defaultValue={defaultCollection?.name ?? ""}
            list="admin-collections"
            name="collectionName"
            required
            type="text"
          />
          <datalist id="admin-collections">
            {collections.map((collection) => (
              <option key={collection.slug} value={collection.name} />
            ))}
          </datalist>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Slug da coleção</span>
          <input
            className="field-input"
            defaultValue={defaultCollection?.slug ?? ""}
            name="collectionSlug"
            required
            type="text"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Categoria</span>
          <input
            className="field-input"
            defaultValue={defaultCategory?.name ?? ""}
            list="admin-categories"
            name="categoryName"
            required
            type="text"
          />
          <datalist id="admin-categories">
            {categories.map((category) => (
              <option key={category.slug} value={category.name} />
            ))}
          </datalist>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Slug da categoria</span>
          <input
            className="field-input"
            defaultValue={defaultCategory?.slug ?? ""}
            name="categorySlug"
            required
            type="text"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Descrição da coleção</span>
          <textarea
            className="field-input min-h-28 resize-y"
            defaultValue={defaultCollection?.description ?? ""}
            name="collectionDescription"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Descrição da categoria</span>
          <textarea
            className="field-input min-h-28 resize-y"
            defaultValue={defaultCategory?.description ?? ""}
            name="categoryDescription"
          />
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Detalhes (uma linha por item)</span>
          <textarea
            className="field-input min-h-32 resize-y"
            defaultValue={product?.details.join("\n") ?? ""}
            name="details"
            required
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Highlights (uma linha por item)</span>
          <textarea
            className="field-input min-h-32 resize-y"
            defaultValue={product?.highlights.join("\n") ?? ""}
            name="highlights"
            required
          />
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Cores (separadas por vírgula)</span>
          <input
            className="field-input"
            defaultValue={variantColors.join(", ")}
            name="colors"
            required
            type="text"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Tamanhos (separados por vírgula)</span>
          <input
            className="field-input"
            defaultValue={variantSizes.join(", ")}
            name="sizes"
            required
            type="text"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Badge</span>
          <input
            className="field-input"
            defaultValue={product?.badgeLabel ?? ""}
            name="badgeLabel"
            type="text"
          />
        </label>
      </div>

      <label className="space-y-2">
        <span className="text-sm font-medium text-ink">
          Imagens (um path local ou URL https por linha)
        </span>
        <textarea
          className="field-input min-h-28 resize-y"
          defaultValue={product?.images.map((image) => image.url).join("\n") ?? "/products/atlas-home.svg"}
          name="imageUrls"
          required
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Accent from</span>
          <input className="field-input" defaultValue={product?.accentFrom ?? "#8b342e"} name="accentFrom" required type="text" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Accent via</span>
          <input className="field-input" defaultValue={product?.accentVia ?? "#bb6b3d"} name="accentVia" required type="text" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Accent to</span>
          <input className="field-input" defaultValue={product?.accentTo ?? "#f2c883"} name="accentTo" required type="text" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Cor primária</span>
          <input className="field-input" defaultValue={product?.primaryHex ?? "#8b342e"} name="primaryHex" required type="text" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Cor secundária</span>
          <input className="field-input" defaultValue={product?.secondaryHex ?? "#f2c883"} name="secondaryHex" required type="text" />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-5">
        {productToggleFields.map(({ name, label }) => (
          <label
            className="flex items-center gap-3 rounded-2xl border border-black/10 bg-sand px-4 py-3 text-sm"
            key={name}
          >
            <input defaultChecked={product?.[name] ?? (name === "isActive")} name={name} type="checkbox" />
            <span>{label}</span>
          </label>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button className="button-primary justify-center" type="submit">
          Salvar produto
        </button>
        <p className="text-sm leading-7 text-slate">
          Variantes são atualizadas a partir de cores e tamanhos, preservando os registros
          existentes sempre que possível.
        </p>
      </div>
    </form>
  );
}
