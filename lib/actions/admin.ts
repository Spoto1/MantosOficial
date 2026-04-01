"use server";

import { ActivityEntityType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  authenticateAdminCredentials,
  createAdminSession,
  requireAdminAuth
} from "@/lib/auth/admin";
import { ADMIN_LOGIN_RATE_LIMIT } from "@/lib/rate-limit-policies";
import { buildRateLimitIdentifier, enforceRateLimit, getRequestIp } from "@/lib/rate-limit";
import { createActivityLog } from "@/lib/repositories/activity-logs";
import { saveAdminUser } from "@/lib/repositories/admin-users";
import {
  saveAdminProduct,
  getAdminProductById,
  toggleAdminProduct,
  updateAdminOrderStatuses,
  updateAdminProductStock
} from "@/lib/repositories/admin";
import { saveCampaign } from "@/lib/repositories/campaigns";
import { updateLead } from "@/lib/repositories/leads";
import { updateContactLead, updateNewsletterLead } from "@/lib/repositories/marketing";
import type { CampaignInput } from "@/lib/validators";

function parseBooleanField(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "");
  return value === "on" || value === "true";
}

function parseLines(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseCommaList(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseOptionalDate(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    return undefined;
  }

  const parsed = new Date(normalized);

  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export async function loginAdminAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const requestHeaders = await headers();

  try {
    await enforceRateLimit({
      policy: ADMIN_LOGIN_RATE_LIMIT,
      identifier: buildRateLimitIdentifier([getRequestIp(requestHeaders), email || "bootstrap"])
    });
  } catch {
    redirect("/admin?error=rate-limit");
  }

  const session = await authenticateAdminCredentials({
    email,
    password
  });

  if (!session) {
    redirect("/admin?error=invalid");
  }

  await createAdminSession(session);
  await createActivityLog({
    type: "admin.login",
    entityType: ActivityEntityType.SESSION,
    actor: session,
    description: `${session.name} iniciou sessão no admin.`
  });
  redirect("/admin?login=1");
}

export async function saveAdminProductAction(formData: FormData) {
  const session = await requireAdminAuth("products");

  const redirectTo = String(formData.get("redirectTo") ?? "/admin/products");
  const existingProductId = String(formData.get("id") ?? "").trim() || undefined;
  const previousProduct = existingProductId
    ? await getAdminProductById(existingProductId)
    : null;
  const product = await saveAdminProduct({
    id: existingProductId,
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    sku: String(formData.get("sku") ?? ""),
    shortDescription: String(formData.get("shortDescription") ?? ""),
    description: String(formData.get("description") ?? ""),
    price: Number(formData.get("price") ?? 0),
    compareAtPrice: String(formData.get("compareAtPrice") ?? "").trim()
      ? Number(formData.get("compareAtPrice"))
      : undefined,
    stock: Number(formData.get("stock") ?? 0),
    country: String(formData.get("country") ?? ""),
    season: String(formData.get("season") ?? ""),
    type: String(formData.get("type") ?? ""),
    collectionName: String(formData.get("collectionName") ?? ""),
    collectionSlug: String(formData.get("collectionSlug") ?? ""),
    collectionDescription: String(formData.get("collectionDescription") ?? "").trim() || undefined,
    categoryName: String(formData.get("categoryName") ?? ""),
    categorySlug: String(formData.get("categorySlug") ?? ""),
    categoryDescription: String(formData.get("categoryDescription") ?? "").trim() || undefined,
    fit: String(formData.get("fit") ?? ""),
    material: String(formData.get("material") ?? ""),
    badgeLabel: String(formData.get("badgeLabel") ?? "").trim() || undefined,
    accentFrom: String(formData.get("accentFrom") ?? ""),
    accentVia: String(formData.get("accentVia") ?? ""),
    accentTo: String(formData.get("accentTo") ?? ""),
    primaryHex: String(formData.get("primaryHex") ?? ""),
    secondaryHex: String(formData.get("secondaryHex") ?? ""),
    details: parseLines(formData.get("details")),
    highlights: parseLines(formData.get("highlights")),
    colors: parseCommaList(formData.get("colors")),
    sizes: parseCommaList(formData.get("sizes")),
    imageUrls: parseLines(formData.get("imageUrls")),
    isRetro: parseBooleanField(formData, "isRetro"),
    isFeatured: parseBooleanField(formData, "isFeatured"),
    isNew: parseBooleanField(formData, "isNew"),
    isBestSeller: parseBooleanField(formData, "isBestSeller"),
    isActive: parseBooleanField(formData, "isActive")
  });
  await createActivityLog({
    type: previousProduct ? "product.updated" : "product.created",
    entityType: ActivityEntityType.PRODUCT,
    entityId: product.id,
    actor: session,
    description: previousProduct
      ? `Produto ${product.name} foi atualizado.`
      : `Produto ${product.name} foi criado.`
  });

  revalidatePath("/");
  revalidatePath("/colecao");
  revalidatePath(`/produto/${product.slug}`);
  revalidatePath("/admin");
  revalidatePath("/admin/products");

  redirect(`${redirectTo}/${product.id}?saved=1`);
}

export async function toggleAdminProductAction(formData: FormData) {
  const session = await requireAdminAuth("products");
  const productId = String(formData.get("productId") ?? "");
  const result = await toggleAdminProduct({
    productId: String(formData.get("productId") ?? ""),
    isActive: String(formData.get("isActive") ?? "")
  });
  await createActivityLog({
    type: result.isActive ? "product.activated" : "product.deactivated",
    entityType: ActivityEntityType.PRODUCT,
    entityId: productId,
    actor: session,
    description: `Produto ${result.name} foi ${result.isActive ? "ativado" : "desativado"}.`
  });
  revalidatePath("/");
  revalidatePath("/colecao");
  revalidatePath("/admin/products");
}

export async function updateAdminProductStockAction(formData: FormData) {
  const session = await requireAdminAuth("products");
  const productId = String(formData.get("productId") ?? "");
  const stock = Number(formData.get("stock") ?? 0);
  await updateAdminProductStock({
    productId: String(formData.get("productId") ?? ""),
    stock
  });
  await createActivityLog({
    type: "product.stock.updated",
    entityType: ActivityEntityType.PRODUCT,
    entityId: productId,
    actor: session,
    description: `Estoque do produto ${productId} atualizado para ${stock}.`
  });
  revalidatePath("/admin/products");
}

export async function updateAdminOrderStatusesAction(formData: FormData) {
  const session = await requireAdminAuth("orders");
  const order = await updateAdminOrderStatuses({
    orderId: String(formData.get("orderId") ?? ""),
    status: String(formData.get("status") ?? ""),
    paymentStatus: String(formData.get("paymentStatus") ?? ""),
    shippingStatus: String(formData.get("shippingStatus") ?? "")
  });
  await createActivityLog({
    type: "order.status.updated",
    entityType: ActivityEntityType.ORDER,
    entityId: order.id,
    actor: session,
    description: `Pedido ${order.number} teve status ajustado para ${order.status}/${order.paymentStatus}.`
  });
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
}

export async function updateLeadAction(formData: FormData) {
  const session = await requireAdminAuth("leads");
  const lead = await updateLead({
    id: String(formData.get("id") ?? ""),
    status: String(formData.get("status") ?? ""),
    internalNotes: String(formData.get("internalNotes") ?? "").trim() || undefined
  });
  await createActivityLog({
    type: "lead.updated",
    entityType: ActivityEntityType.LEAD,
    entityId: lead.id,
    actor: session,
    description: `Lead ${lead.email} atualizado para ${lead.status}.`
  });
  revalidatePath("/admin");
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${lead.id}`);
}

export async function updateNewsletterLeadAction(formData: FormData) {
  const session = await requireAdminAuth("newsletter");
  const lead = await updateNewsletterLead({
    id: String(formData.get("id") ?? ""),
    status: String(formData.get("status") ?? ""),
    internalNotes: String(formData.get("internalNotes") ?? "").trim() || undefined
  });
  await createActivityLog({
    type: "newsletter.updated",
    entityType: ActivityEntityType.NEWSLETTER,
    entityId: lead.id,
    actor: session,
    description: `Inscrito ${lead.email} atualizado para ${lead.status}.`
  });
  revalidatePath("/admin");
  revalidatePath("/admin/newsletter");
}

export async function updateContactLeadAction(formData: FormData) {
  const session = await requireAdminAuth("contacts");
  const lead = await updateContactLead({
    id: String(formData.get("id") ?? ""),
    status: String(formData.get("status") ?? ""),
    internalNotes: String(formData.get("internalNotes") ?? "").trim() || undefined
  });
  await createActivityLog({
    type: lead.status === "ARCHIVED" ? "contact.archived" : "contact.updated",
    entityType: ActivityEntityType.CONTACT,
    entityId: lead.id,
    actor: session,
    description: `Mensagem de ${lead.email} atualizada para ${lead.status}.`
  });
  revalidatePath("/admin");
  revalidatePath("/admin/contacts");
  revalidatePath(`/admin/contacts/${lead.id}`);
}

export async function saveCampaignAction(formData: FormData) {
  const session = await requireAdminAuth("campaigns");
  const redirectTo = String(formData.get("redirectTo") ?? "/admin/campaigns");
  const campaign = await saveCampaign(
    {
      id: String(formData.get("id") ?? "").trim() || undefined,
      internalTitle: String(formData.get("internalTitle") ?? ""),
      slug: String(formData.get("slug") ?? ""),
      type: String(formData.get("type") ?? "") as CampaignInput["type"],
      placement: String(formData.get("placement") ?? "") as CampaignInput["placement"],
      status: String(formData.get("status") ?? "") as CampaignInput["status"],
      publicTitle: String(formData.get("publicTitle") ?? ""),
      publicSubtitle: String(formData.get("publicSubtitle") ?? "").trim() || undefined,
      description: String(formData.get("description") ?? "").trim() || undefined,
      ctaLabel: String(formData.get("ctaLabel") ?? "").trim() || undefined,
      ctaLink: String(formData.get("ctaLink") ?? "").trim() || undefined,
      desktopImageUrl: String(formData.get("desktopImageUrl") ?? "").trim() || undefined,
      mobileImageUrl: String(formData.get("mobileImageUrl") ?? "").trim() || undefined,
      cardImageUrl: String(formData.get("cardImageUrl") ?? "").trim() || undefined,
      desktopAssetId: String(formData.get("desktopAssetId") ?? "").trim() || undefined,
      mobileAssetId: String(formData.get("mobileAssetId") ?? "").trim() || undefined,
      cardAssetId: String(formData.get("cardAssetId") ?? "").trim() || undefined,
      position: Number(formData.get("position") ?? 0),
      startsAt: parseOptionalDate(formData.get("startsAt")),
      endsAt: parseOptionalDate(formData.get("endsAt")),
      isActive: parseBooleanField(formData, "isActive"),
      priority: Number(formData.get("priority") ?? 0),
      accentColor: String(formData.get("accentColor") ?? "").trim() || undefined,
      isPrimary: parseBooleanField(formData, "isPrimary"),
      collectionId: String(formData.get("collectionId") ?? "").trim() || undefined,
      categoryId: String(formData.get("categoryId") ?? "").trim() || undefined,
      productId: String(formData.get("productId") ?? "").trim() || undefined
    },
    session
  );
  await createActivityLog({
    type: formData.get("id") ? "campaign.updated" : "campaign.created",
    entityType: ActivityEntityType.CAMPAIGN,
    entityId: campaign.id,
    actor: session,
    description: `Campanha ${campaign.internalTitle} foi ${formData.get("id") ? "atualizada" : "criada"}.`
  });
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/campaigns");
  redirect(`${redirectTo}/${campaign.id}?saved=1`);
}

export async function saveAdminUserAction(formData: FormData) {
  const session = await requireAdminAuth("admins");
  const adminUser = await saveAdminUser({
    id: String(formData.get("id") ?? "").trim() || undefined,
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    role: String(formData.get("role") ?? ""),
    status: String(formData.get("status") ?? ""),
    password: String(formData.get("password") ?? "").trim() || undefined,
    requirePassword: !String(formData.get("id") ?? "").trim()
  });
  await createActivityLog({
    type: formData.get("id") ? "admin.updated" : "admin.created",
    entityType: ActivityEntityType.ADMIN,
    entityId: adminUser.id,
    actor: session,
    description: `Admin ${adminUser.email} foi ${formData.get("id") ? "atualizado" : "criado"}.`
  });
  revalidatePath("/admin");
  revalidatePath("/admin/admins");
}
