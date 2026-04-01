import { z } from "zod";

import {
  KANBAN_ARCHIVE_SCOPE_VALUES,
  KANBAN_PRIORITY_VALUES,
  KANBAN_STATUS_VALUES,
  KANBAN_TYPE_VALUES
} from "@/lib/kanban";
import {
  ORDER_STATUS_VALUES,
  PAYMENT_STATUS_VALUES,
  SHIPPING_STATUS_VALUES
} from "@/lib/order-status";
import { isRemoteImageUrlAllowed } from "@/lib/runtime-config";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const cpfPattern = /^\d{11}$/;

function isSupportedImageSource(value: string) {
  if (value.startsWith("/")) {
    return true;
  }

  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && isRemoteImageUrlAllowed(value);
  } catch {
    return false;
  }
}

export const adminLoginSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido.").optional().or(z.literal("")),
  password: z.string().min(1, "Informe a senha do admin.")
});

export const LEAD_STATUS_VALUES = [
  "NEW",
  "IN_CONTACT",
  "QUALIFIED",
  "CONVERTED",
  "ARCHIVED"
] as const;

export const NEWSLETTER_STATUS_VALUES = ["ACTIVE", "ARCHIVED", "UNSUBSCRIBED"] as const;
export const CONTACT_LEAD_STATUS_VALUES = ["NEW", "IN_REVIEW", "REPLIED", "ARCHIVED"] as const;
export const ADMIN_ROLE_VALUES = ["SUPERADMIN", "ADMIN", "EDITOR", "MARKETING"] as const;
export const ADMIN_USER_STATUS_VALUES = ["ACTIVE", "INVITED", "DISABLED"] as const;
export const CAMPAIGN_TYPE_VALUES = [
  "HERO",
  "SECONDARY_BANNER",
  "PROMO_BAR",
  "PROMO_CARD",
  "CATEGORY_AD",
  "POPUP"
] as const;
export const CAMPAIGN_PLACEMENT_VALUES = [
  "HOME_HERO",
  "HOME_SECONDARY",
  "SITE_TOP",
  "BELOW_CATEGORIES",
  "COLLECTION_PAGE",
  "PRODUCT_PAGE",
  "GLOBAL_BAR",
  "NEWSLETTER_SECTION"
] as const;
export const CAMPAIGN_STATUS_VALUES = [
  "DRAFT",
  "ACTIVE",
  "SCHEDULED",
  "PAUSED",
  "ARCHIVED"
] as const;

export const newsletterLeadSchema = z.object({
  email: z.email("Informe um e-mail válido."),
  source: z.string().min(2).max(40).default("footer")
});

export const contactLeadSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto."),
  email: z.email("Informe um e-mail válido."),
  phone: z.string().trim().max(20).optional(),
  subject: z.string().trim().min(3, "Assunto muito curto."),
  message: z.string().trim().min(10, "Mensagem muito curta.")
});

export const favoriteSchema = z.object({
  customerId: z.string().cuid("Sessão de cliente inválida."),
  productId: z.string().cuid("Produto inválido.")
});

export const customerLoginSchema = z.object({
  email: z.email("Informe um e-mail válido."),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres.")
});

export const customerRegistrationSchema = z
  .object({
    name: z.string().trim().min(3, "Informe seu nome completo."),
    email: z.email("Informe um e-mail válido."),
    password: z
      .string()
      .min(8, "A senha deve ter pelo menos 8 caracteres.")
      .max(72, "Use uma senha com no máximo 72 caracteres."),
    confirmPassword: z.string().min(8, "Confirme a senha.")
  })
  .superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "As senhas não coincidem."
      });
    }
  });

export const adminProductSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().trim().min(3),
  slug: z.string().trim().regex(slugPattern, "Slug inválido."),
  sku: z.string().trim().min(4),
  shortDescription: z.string().trim().min(10),
  description: z.string().trim().min(20),
  price: z.coerce.number().positive(),
  compareAtPrice: z.coerce.number().positive().optional(),
  stock: z.coerce.number().int().min(0),
  country: z.string().trim().min(2),
  season: z.string().trim().min(2),
  type: z.string().trim().min(2),
  collectionName: z.string().trim().min(2),
  collectionSlug: z.string().trim().regex(slugPattern),
  collectionDescription: z.string().trim().min(10).optional(),
  categoryName: z.string().trim().min(2),
  categorySlug: z.string().trim().regex(slugPattern),
  categoryDescription: z.string().trim().min(10).optional(),
  fit: z.string().trim().min(2),
  material: z.string().trim().min(2),
  badgeLabel: z.string().trim().max(40).optional(),
  accentFrom: z.string().trim().min(4),
  accentVia: z.string().trim().min(4),
  accentTo: z.string().trim().min(4),
  primaryHex: z.string().trim().min(4),
  secondaryHex: z.string().trim().min(4),
  details: z.array(z.string().trim().min(3)).min(1),
  highlights: z.array(z.string().trim().min(3)).min(1),
  colors: z.array(z.string().trim().min(2)).min(1),
  sizes: z.array(z.string().trim().min(1)).min(1),
  imageUrls: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .refine(
          (value) => isSupportedImageSource(value),
          "Use um path local ou uma URL https válida para a imagem."
        )
    )
    .min(1),
  isRetro: z.boolean(),
  isFeatured: z.boolean(),
  isNew: z.boolean(),
  isBestSeller: z.boolean(),
  isActive: z.boolean()
});

export const adminToggleProductSchema = z.object({
  productId: z.string().cuid(),
  isActive: z
    .string()
    .transform((value) => value === "true")
});

export const adminStockSchema = z.object({
  productId: z.string().cuid(),
  stock: z.coerce.number().int().min(0)
});

export const adminOrderStatusSchema = z.object({
  orderId: z.string().cuid(),
  status: z.enum(ORDER_STATUS_VALUES),
  paymentStatus: z.enum(PAYMENT_STATUS_VALUES),
  shippingStatus: z.enum(SHIPPING_STATUS_VALUES)
});

export const checkoutItemSchema = z.object({
  productId: z.string().cuid(),
  variantId: z.string().cuid().optional(),
  quantity: z.number().int().min(1).max(10),
  size: z.string().trim().min(1),
  color: z.string().trim().min(1)
});

export const checkoutSchema = z.object({
  name: z.string().trim().min(3),
  email: z.email(),
  phone: z.string().trim().min(8),
  cpf: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, ""))
    .refine((value) => value === "" || cpfPattern.test(value), "CPF inválido.")
    .optional(),
  postalCode: z.string().trim().min(5),
  address: z.string().trim().min(5),
  city: z.string().trim().min(2),
  state: z.string().trim().min(2),
  complement: z.string().trim().optional(),
  reference: z.string().trim().optional(),
  shipping: z.enum(["standard", "express", "pickup"]),
  couponCode: z.string().trim().optional(),
  items: z.array(checkoutItemSchema).min(1)
});

export type AdminProductInput = z.infer<typeof adminProductSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CustomerLoginInput = z.infer<typeof customerLoginSchema>;
export type CustomerRegistrationInput = z.infer<typeof customerRegistrationSchema>;
export const checkoutQuoteSchema = z.object({
  shipping: z.enum(["standard", "express", "pickup"]),
  couponCode: z.string().trim().optional(),
  items: z.array(checkoutItemSchema).min(1)
});
export type CheckoutQuoteInput = z.infer<typeof checkoutQuoteSchema>;

export const leadUpdateSchema = z.object({
  id: z.string().cuid(),
  status: z.enum(LEAD_STATUS_VALUES),
  internalNotes: z.string().trim().max(4000).optional()
});

export const newsletterUpdateSchema = z.object({
  id: z.string().cuid(),
  status: z.enum(NEWSLETTER_STATUS_VALUES),
  internalNotes: z.string().trim().max(4000).optional()
});

export const contactLeadUpdateSchema = z.object({
  id: z.string().cuid(),
  status: z.enum(CONTACT_LEAD_STATUS_VALUES),
  internalNotes: z.string().trim().max(4000).optional()
});

export const adminUserSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().trim().min(2, "Nome muito curto."),
  email: z.email("Informe um e-mail válido."),
  role: z.enum(ADMIN_ROLE_VALUES),
  status: z.enum(ADMIN_USER_STATUS_VALUES),
  password: z.string().trim().min(8, "Use ao menos 8 caracteres.").optional(),
  requirePassword: z.boolean().default(false)
}).superRefine((value, context) => {
  if (value.requirePassword && !value.password) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["password"],
      message: "Informe uma senha para criar o admin."
    });
  }
});

export const kanbanChecklistItemSchema = z.object({
  label: z.string().trim().min(1, "Checklist inválido.").max(160, "Checklist muito longo."),
  isDone: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0)
});

export const kanbanTaskSchema = z
  .object({
    id: z.string().cuid().optional(),
    title: z.string().trim().min(3, "Título muito curto.").max(140, "Título muito longo."),
    description: z
      .string()
      .trim()
      .min(10, "Descreva a tarefa com um pouco mais de contexto.")
      .max(6000, "Descrição muito longa."),
    notes: z.string().trim().max(6000, "Observações muito longas.").optional(),
    status: z.enum(KANBAN_STATUS_VALUES),
    priority: z.enum(KANBAN_PRIORITY_VALUES),
    type: z.enum(KANBAN_TYPE_VALUES),
    dueDate: z.date().optional(),
    assigneeId: z.string().cuid().optional(),
    isArchived: z.boolean().default(false),
    checklistItems: z.array(kanbanChecklistItemSchema).max(30, "Use no máximo 30 itens.")
  })
  .transform((value) => ({
    ...value,
    notes: value.notes || undefined,
    assigneeId: value.assigneeId || undefined,
    dueDate: optionalDateField(value.dueDate)
  }));

export const kanbanTaskReorderSchema = z
  .object({
    taskId: z.string().cuid(),
    status: z.enum(KANBAN_STATUS_VALUES),
    previousStatus: z.enum(KANBAN_STATUS_VALUES).optional(),
    orderedIds: z.array(z.string().cuid()).min(1, "A coluna de destino precisa de ao menos uma tarefa."),
    previousOrderedIds: z.array(z.string().cuid()).optional()
  })
  .superRefine((value, context) => {
    if (!value.orderedIds.includes(value.taskId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["orderedIds"],
        message: "A tarefa movida precisa constar na ordenação final."
      });
    }

    if (value.previousStatus && value.previousStatus !== value.status && !value.previousOrderedIds) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["previousOrderedIds"],
        message: "A coluna de origem precisa ser reordenada após a movimentação."
      });
    }
  });

export const kanbanChecklistToggleSchema = z.object({
  itemId: z.string().cuid(),
  isDone: z.boolean()
});

export const kanbanTaskCommentSchema = z.object({
  taskId: z.string().cuid(),
  body: z
    .string()
    .trim()
    .min(1, "Escreva um comentário antes de enviar.")
    .max(4000, "Use no máximo 4000 caracteres no comentário.")
});

export const kanbanTaskArchiveSchema = z.object({
  taskId: z.string().cuid(),
  isArchived: z.boolean()
});

export const kanbanArchiveScopeSchema = z.enum(KANBAN_ARCHIVE_SCOPE_VALUES);

function optionalDateField(value: Date | null | undefined) {
  return value ?? undefined;
}

export const campaignSchema = z
  .object({
    id: z.string().cuid().optional(),
    internalTitle: z.string().trim().min(3, "Título interno muito curto."),
    slug: z.string().trim().regex(slugPattern, "Slug inválido."),
    type: z.enum(CAMPAIGN_TYPE_VALUES),
    placement: z.enum(CAMPAIGN_PLACEMENT_VALUES),
    status: z.enum(CAMPAIGN_STATUS_VALUES),
    publicTitle: z.string().trim().min(3, "Título público muito curto."),
    publicSubtitle: z.string().trim().max(180).optional(),
    description: z.string().trim().max(600).optional(),
    ctaLabel: z.string().trim().max(60).optional(),
    ctaLink: z.string().trim().max(500).optional(),
    desktopImageUrl: z
      .string()
      .trim()
      .refine(
        (value) => !value || isSupportedImageSource(value),
        "Use um path local ou uma URL https válida."
      )
      .optional(),
    mobileImageUrl: z
      .string()
      .trim()
      .refine(
        (value) => !value || isSupportedImageSource(value),
        "Use um path local ou uma URL https válida."
      )
      .optional(),
    cardImageUrl: z
      .string()
      .trim()
      .refine(
        (value) => !value || isSupportedImageSource(value),
        "Use um path local ou uma URL https válida."
      )
      .optional(),
    desktopAssetId: z.string().cuid().optional(),
    mobileAssetId: z.string().cuid().optional(),
    cardAssetId: z.string().cuid().optional(),
    position: z.coerce.number().int().min(0),
    startsAt: z.date().optional(),
    endsAt: z.date().optional(),
    isActive: z.boolean(),
    priority: z.coerce.number().int().min(0),
    accentColor: z.string().trim().max(30).optional(),
    isPrimary: z.boolean(),
    collectionId: z.string().cuid().optional(),
    categoryId: z.string().cuid().optional(),
    productId: z.string().cuid().optional()
  })
  .transform((value) => ({
    ...value,
    publicSubtitle: value.publicSubtitle || undefined,
    description: value.description || undefined,
    ctaLabel: value.ctaLabel || undefined,
    ctaLink: value.ctaLink || undefined,
    desktopImageUrl: value.desktopImageUrl || undefined,
    mobileImageUrl: value.mobileImageUrl || undefined,
    cardImageUrl: value.cardImageUrl || undefined,
    desktopAssetId: value.desktopAssetId || undefined,
    mobileAssetId: value.mobileAssetId || undefined,
    cardAssetId: value.cardAssetId || undefined,
    accentColor: value.accentColor || undefined,
    collectionId: value.collectionId || undefined,
    categoryId: value.categoryId || undefined,
    productId: value.productId || undefined,
    startsAt: optionalDateField(value.startsAt),
    endsAt: optionalDateField(value.endsAt)
  }))
  .superRefine((value, context) => {
    if (value.endsAt && value.startsAt && value.endsAt < value.startsAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endsAt"],
        message: "A data final deve ser posterior à data inicial."
      });
    }
  });

export type CampaignInput = z.infer<typeof campaignSchema>;
export type KanbanTaskInput = z.infer<typeof kanbanTaskSchema>;
export type KanbanTaskReorderInput = z.infer<typeof kanbanTaskReorderSchema>;
export type KanbanTaskCommentInput = z.infer<typeof kanbanTaskCommentSchema>;
export type KanbanTaskArchiveInput = z.infer<typeof kanbanTaskArchiveSchema>;
