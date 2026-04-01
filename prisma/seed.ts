import {
  AdminRole,
  OrderStatus,
  PaymentStatus,
  Prisma,
  PrismaClient,
  ShippingStatus
} from "@prisma/client";

import { hashAdminPassword } from "../lib/auth/admin-password";
import { hashCustomerPassword } from "../lib/auth/customer-password";
import { KANBAN_STATUS_VALUES } from "../lib/kanban";
import { seedCategories, seedCollections, seedProducts, seedSizes } from "../lib/seed-catalog";
import { knownSeedKanbanTaskTitles, seedKanbanTasks } from "../lib/seed-kanban";

const prisma = new PrismaClient();
const DEMO_RESET_CONFIRMATION = "RESET_DEMO_DATA";
const DEMO_CUSTOMER_EMAIL = "cliente@mantos-preview.test";
const DEMO_CUSTOMER_PASSWORD = "Mantos2026!";

function distributeStock(total: number, parts: number) {
  if (parts <= 0) {
    return [];
  }

  const base = Math.floor(total / parts);
  const remainder = total % parts;

  return Array.from({ length: parts }, (_, index) => base + (index < remainder ? 1 : 0));
}

function isProductionEnvironment() {
  return process.env.NODE_ENV === "production";
}

function isDemoResetRequested() {
  return process.argv.includes("--demo-reset") || process.env.SEED_MODE === "demo-reset";
}

function isDemoResetConfirmed() {
  return process.argv.includes("--confirm-reset") || process.env.SEED_CONFIRM === DEMO_RESET_CONFIRMATION;
}

function isLoopbackDatabaseUrl(connectionString: string) {
  try {
    const parsed = new URL(connectionString);
    return ["localhost", "127.0.0.1"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function assertDemoResetAllowed() {
  const databaseUrl = process.env.DATABASE_URL ?? "";

  if (isProductionEnvironment()) {
    throw new Error("Seed destrutivo bloqueado: NODE_ENV=production.");
  }

  if (!databaseUrl || !isLoopbackDatabaseUrl(databaseUrl)) {
    throw new Error(
      "Seed destrutivo bloqueado: use apenas bancos locais/loopback para o modo demo-reset."
    );
  }

  if (!isDemoResetConfirmed()) {
    throw new Error(
      `Seed destrutivo bloqueado: confirme com SEED_CONFIRM=${DEMO_RESET_CONFIRMATION} ou --confirm-reset.`
    );
  }
}

async function resetDemoDatabase() {
  await prisma.$transaction([
    prisma.kanbanTaskComment.deleteMany(),
    prisma.kanbanTaskChecklistItem.deleteMany(),
    prisma.kanbanTask.deleteMany(),
    prisma.activityLog.deleteMany(),
    prisma.campaign.deleteMany(),
    prisma.mediaAsset.deleteMany(),
    prisma.adminUser.deleteMany(),
    prisma.webhookEvent.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.lead.deleteMany(),
    prisma.favorite.deleteMany(),
    prisma.customerSession.deleteMany(),
    prisma.address.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.newsletterLead.deleteMany(),
    prisma.contactLead.deleteMany(),
    prisma.productVariant.deleteMany(),
    prisma.productImage.deleteMany(),
    prisma.coupon.deleteMany(),
    prisma.product.deleteMany(),
    prisma.rateLimitBucket.deleteMany(),
    prisma.size.deleteMany(),
    prisma.category.deleteMany(),
    prisma.collection.deleteMany()
  ]);
}

async function syncCollections() {
  for (const collection of seedCollections) {
    await prisma.collection.upsert({
      where: {
        slug: collection.slug
      },
      update: {
        name: collection.name,
        description: collection.description
      },
      create: collection
    });
  }
}

async function syncCategories() {
  for (const category of seedCategories) {
    await prisma.category.upsert({
      where: {
        slug: category.slug
      },
      update: {
        name: category.name,
        description: category.description
      },
      create: category
    });
  }
}

async function syncSizes() {
  for (const size of seedSizes) {
    await prisma.size.upsert({
      where: {
        label: size.label
      },
      update: {
        sortOrder: size.sortOrder
      },
      create: size
    });
  }
}

async function syncCatalogProducts() {
  const sizes = await prisma.size.findMany({
    orderBy: {
      sortOrder: "asc"
    }
  });
  const sizesByLabel = new Map(sizes.map((size) => [size.label, size]));

  for (const product of seedProducts) {
    const [collection, category] = await Promise.all([
      prisma.collection.findUniqueOrThrow({
        where: {
          slug: product.collectionSlug
        }
      }),
      prisma.category.findUniqueOrThrow({
        where: {
          slug: product.categorySlug
        }
      })
    ]);
    const combinations = product.colors.flatMap((color) =>
      product.sizes.map((size) => ({
        color,
        size
      }))
    );
    const stockDistribution = distributeStock(product.stock, combinations.length);
    const existingProduct = await prisma.product.findUnique({
      where: {
        sku: product.sku
      },
      include: {
        images: true,
        variants: true
      }
    });

    if (existingProduct) {
      await prisma.product.update({
        where: {
          id: existingProduct.id
        },
        data: {
          name: product.name,
          slug: product.slug,
          shortDescription: product.shortDescription,
          description: product.description,
          price: new Prisma.Decimal(product.price),
          compareAtPrice:
            product.compareAtPrice !== undefined ? new Prisma.Decimal(product.compareAtPrice) : null,
          stock: product.stock,
          country: product.country,
          season: product.season,
          type: product.type,
          fit: product.fit,
          material: product.material,
          badgeLabel: product.badgeLabel ?? null,
          accentFrom: product.accentFrom,
          accentVia: product.accentVia,
          accentTo: product.accentTo,
          primaryHex: product.primaryHex,
          secondaryHex: product.secondaryHex,
          details: product.details,
          highlights: product.highlights,
          isRetro: product.isRetro,
          isFeatured: product.isFeatured,
          isNew: product.isNew,
          isBestSeller: product.isBestSeller,
          isActive: product.isActive,
          collectionId: collection.id,
          categoryId: category.id,
          images: {
            updateMany: product.images.map((image, index) => ({
              where: {
                url: image.url
              },
              data: {
                alt: image.alt,
                sortOrder: index,
                isPrimary: image.isPrimary ?? index === 0
              }
            }))
          }
        }
      });

      continue;
    }

    await prisma.product.create({
      data: {
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        shortDescription: product.shortDescription,
        description: product.description,
        price: new Prisma.Decimal(product.price),
        compareAtPrice:
          product.compareAtPrice !== undefined ? new Prisma.Decimal(product.compareAtPrice) : null,
        stock: product.stock,
        country: product.country,
        season: product.season,
        type: product.type,
        fit: product.fit,
        material: product.material,
        badgeLabel: product.badgeLabel,
        accentFrom: product.accentFrom,
        accentVia: product.accentVia,
        accentTo: product.accentTo,
        primaryHex: product.primaryHex,
        secondaryHex: product.secondaryHex,
        details: product.details,
        highlights: product.highlights,
        isRetro: product.isRetro,
        isFeatured: product.isFeatured,
        isNew: product.isNew,
        isBestSeller: product.isBestSeller,
        isActive: product.isActive,
        collectionId: collection.id,
        categoryId: category.id,
        images: {
          create: product.images.map((image, index) => ({
            url: image.url,
            alt: image.alt,
            sortOrder: index,
            isPrimary: image.isPrimary ?? index === 0
          }))
        },
        variants: {
          create: combinations.map((combination, index) => ({
            colorName: combination.color,
            sku: `${product.sku}-${combination.color.slice(0, 3).toUpperCase()}-${combination.size}`,
            stock: stockDistribution[index] ?? 0,
            sizeId: sizesByLabel.get(combination.size)?.id ?? sizes[0].id
          }))
        }
      }
    });
  }
}

async function syncSafeSeed() {
  await syncCollections();
  await syncCategories();
  await syncSizes();
  await syncCatalogProducts();
}

async function seedDemoOperationalData() {
  const coupon = await prisma.coupon.upsert({
    where: {
      code: "HOMOLOGA10"
    },
    update: {
      isActive: true
    },
    create: {
      code: "HOMOLOGA10",
      type: "PERCENTAGE",
      value: new Prisma.Decimal(10),
      minimumOrderAmount: new Prisma.Decimal(250),
      isActive: true
    }
  });
  const customer = await prisma.customer.create({
    data: {
      email: DEMO_CUSTOMER_EMAIL,
      firstName: "Livia",
      lastName: "Gomes",
      phone: "11998887766",
      document: "12345678901",
      acceptsMarketing: true,
      passwordHash: hashCustomerPassword(DEMO_CUSTOMER_PASSWORD)
    }
  });
  const address = await prisma.address.create({
    data: {
      customerId: customer.id,
      label: "Casa",
      recipientName: "Livia Gomes",
      line1: "Rua da Consolação, 410",
      city: "São Paulo",
      state: "SP",
      postalCode: "01302-000",
      country: "Brasil",
      phone: "11998887766",
      isDefault: true
    }
  });
  const atlas = await prisma.product.findUniqueOrThrow({
    where: {
      sku: "MNT-ATL-01"
    },
    include: {
      images: true,
      variants: true
    }
  });
  const aurora = await prisma.product.findUniqueOrThrow({
    where: {
      sku: "MNT-AUR-02"
    },
    include: {
      images: true,
      variants: true
    }
  });
  const brasil2026 = await prisma.product.findUniqueOrThrow({
    where: {
      sku: "MNT-BR26-07"
    },
    include: {
      images: true,
      variants: true
    }
  });
  const superAdmin = await prisma.adminUser.create({
    data: {
      name: "Pedro Spoto",
      email: "pedro@mantos.local",
      role: AdminRole.SUPERADMIN,
      passwordHash: hashAdminPassword("change-me-123")
    }
  });
  const marketingAdmin = await prisma.adminUser.create({
    data: {
      name: "Equipe Marketing",
      email: "marketing@mantos.local",
      role: AdminRole.MARKETING,
      passwordHash: hashAdminPassword("change-me-123")
    }
  });

  await prisma.order.create({
    data: {
      number: "MNT-100001",
      externalReference: "MNT-100001",
      customerId: customer.id,
      addressId: address.id,
      couponId: coupon.id,
      status: OrderStatus.PAID,
      paymentStatus: PaymentStatus.PAID,
      shippingStatus: ShippingStatus.READY_TO_SHIP,
      paymentProvider: "stripe",
      paymentMethod: "checkout_session",
      paymentPreferenceId: "cs_test_seed_100001",
      paymentId: "pi_seed_100001",
      merchantOrderId: "cus_seed_100001",
      paymentStatusDetail: "paid",
      customerName: "Livia Gomes",
      customerEmail: DEMO_CUSTOMER_EMAIL,
      customerPhone: "11998887766",
      customerDocument: "12345678901",
      shippingMethod: "express",
      subtotal: new Prisma.Decimal(649.8),
      discountAmount: new Prisma.Decimal(64.98),
      shippingAmount: new Prisma.Decimal(0),
      total: new Prisma.Decimal(584.82),
      paidAt: new Date("2026-03-19T10:00:00.000Z"),
      couponRedeemedAt: new Date("2026-03-19T10:00:00.000Z"),
      inventoryCommittedAt: new Date("2026-03-19T10:00:00.000Z"),
      notes: "Pedido base de homologação local para validar storefront, conta e pós-compra.",
      items: {
        create: [
          {
            productId: atlas.id,
            variantId: atlas.variants[0]?.id,
            productName: atlas.name,
            productSlug: atlas.slug,
            sku: atlas.variants[0]?.sku ?? atlas.sku,
            unitPrice: atlas.price,
            quantity: 1,
            sizeLabel: "M",
            colorName: "Vermelho mineral",
            imageUrl: atlas.images[0]?.url ?? "/products/atlas-home.svg"
          },
          {
            productId: aurora.id,
            variantId: aurora.variants[0]?.id,
            productName: aurora.name,
            productSlug: aurora.slug,
            sku: aurora.variants[0]?.sku ?? aurora.sku,
            unitPrice: aurora.price,
            quantity: 1,
            sizeLabel: "G",
            colorName: "Azul noturno",
            imageUrl: aurora.images[0]?.url ?? "/products/aurora-away.svg"
          }
        ]
      }
    }
  });

  await prisma.$transaction([
    prisma.product.update({
      where: {
        id: atlas.id
      },
      data: {
        stock: {
          decrement: 1
        }
      }
    }),
    prisma.product.update({
      where: {
        id: aurora.id
      },
      data: {
        stock: {
          decrement: 1
        }
      }
    }),
    prisma.productVariant.update({
      where: {
        id: atlas.variants[0]?.id ?? ""
      },
      data: {
        stock: {
          decrement: 1
        }
      }
    }),
    prisma.productVariant.update({
      where: {
        id: aurora.variants[0]?.id ?? ""
      },
      data: {
        stock: {
          decrement: 1
        }
      }
    })
  ]);

  await prisma.newsletterLead.createMany({
    data: [
      {
        email: "editorial@mantos.local",
        source: "footer"
      },
      {
        email: "convites@mantos.local",
        source: "landing"
      }
    ]
  });

  await prisma.contactLead.createMany({
    data: [
      {
        name: "Marcos Vale",
        email: "marcos@mantos.local",
        phone: "21999990000",
        subject: "Pedido corporativo",
        message: "Quero entender uma produção pequena para evento e ativação de marca."
      },
      {
        name: "Ana Teles",
        email: "ana@mantos.local",
        subject: "Prazo de cápsula",
        message: "Existe previsão de reposição da Halo 03 em GG ainda neste mês?"
      }
    ]
  });

  const newsletterLeads = await prisma.newsletterLead.findMany();
  const contactLeads = await prisma.contactLead.findMany();

  await prisma.lead.createMany({
    data: [
      ...newsletterLeads.map((lead) => ({
        type: "NEWSLETTER" as const,
        email: lead.email,
        source: lead.source,
        origin: "newsletter",
        context: `Inscrição capturada via ${lead.source}.`,
        newsletterLeadId: lead.id
      })),
      ...contactLeads.map((lead) => ({
        type: "CONTACT" as const,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        source: "contact-form",
        origin: "contact",
        message: `${lead.subject}\n\n${lead.message}`,
        context: `Mensagem de contato enviada com o assunto "${lead.subject}".`,
        contactLeadId: lead.id
      }))
    ]
  });

  const heroAsset = await prisma.mediaAsset.create({
    data: {
      label: "Hero Brasil 2026",
      originalName: "brasil-2026-noite.svg",
      fileName: "brasil-2026-noite.svg",
      mimeType: "image/svg+xml",
      sizeBytes: 2048,
      url: "/products/brasil-2026-noite.svg",
      storageProvider: "local-public",
      storageKey: "products/brasil-2026-noite.svg",
      uploadedById: superAdmin.id
    }
  });
  const secondaryAsset = await prisma.mediaAsset.create({
    data: {
      label: "Aurora Banner",
      originalName: "aurora-away.svg",
      fileName: "aurora-away.svg",
      mimeType: "image/svg+xml",
      sizeBytes: 2048,
      url: "/products/aurora-away.svg",
      storageProvider: "local-public",
      storageKey: "products/aurora-away.svg",
      uploadedById: marketingAdmin.id
    }
  });

  await prisma.campaign.createMany({
    data: [
      {
        internalTitle: "Hero cápsula Brasil 2026",
        slug: "hero-capsula-brasil-2026",
        type: "HERO",
        placement: "HOME_HERO",
        status: "ACTIVE",
        publicTitle: "Temporada de seleção, presença de coleção",
        publicSubtitle: "Drop Brasil 2026",
        description:
          "Campanha principal da home com leitura premium, base monocromática e atmosfera sutil de convocação para 2026.",
        ctaLabel: "Explorar cápsula",
        ctaLink: "/colecao?collection=selecao-2026",
        desktopImageUrl: heroAsset.url,
        mobileImageUrl: heroAsset.url,
        desktopAssetId: heroAsset.id,
        mobileAssetId: heroAsset.id,
        position: 1,
        isActive: true,
        priority: 100,
        accentColor: "#17342d",
        isPrimary: true,
        productId: brasil2026.id,
        createdById: superAdmin.id,
        updatedById: superAdmin.id
      },
      {
        internalTitle: "Banner secundário Aurora",
        slug: "banner-secundario-aurora",
        type: "SECONDARY_BANNER",
        placement: "HOME_SECONDARY",
        status: "ACTIVE",
        publicTitle: "Coleção principal em contraste controlado",
        publicSubtitle: "Banner secundário controlado via admin",
        description:
          "Espaço secundário pensado para equilibrar cápsula especial e linha principal sem perder sofisticação.",
        ctaLabel: "Ver destaque",
        ctaLink: `/produto/${aurora.slug}`,
        desktopImageUrl: secondaryAsset.url,
        mobileImageUrl: secondaryAsset.url,
        desktopAssetId: secondaryAsset.id,
        mobileAssetId: secondaryAsset.id,
        position: 2,
        isActive: true,
        priority: 80,
        accentColor: "#17324f",
        isPrimary: false,
        productId: aurora.id,
        createdById: marketingAdmin.id,
        updatedById: marketingAdmin.id
      }
    ]
  });

  await prisma.activityLog.createMany({
    data: [
      {
        type: "admin.login",
        entityType: "SESSION",
        actorId: superAdmin.id,
        actorName: superAdmin.name,
        actorEmail: superAdmin.email,
        description: "Login administrativo seed para validar atividade recente."
      },
      {
        type: "campaign.created",
        entityType: "CAMPAIGN",
        actorId: marketingAdmin.id,
        actorName: marketingAdmin.name,
        actorEmail: marketingAdmin.email,
        description: "Campanhas iniciais de hero e banner foram publicadas."
      }
    ]
  });
}

function normalizeKanbanTaskTitle(value: string) {
  return value.trim().toLowerCase();
}

async function replaceKanbanChecklistItems(
  taskId: string,
  checklistItems: Array<{ label: string; isDone: boolean }>
) {
  await prisma.kanbanTaskChecklistItem.deleteMany({
    where: {
      taskId
    }
  });

  if (checklistItems.length === 0) {
    return;
  }

  await prisma.kanbanTaskChecklistItem.createMany({
    data: checklistItems.map((item, index) => ({
      taskId,
      label: item.label,
      isDone: item.isDone,
      sortOrder: index
    }))
  });
}

async function syncKanbanSeed() {
  const [admins, existingTasks] = await prisma.$transaction([
    prisma.adminUser.findMany({
      where: {
        status: "ACTIVE"
      },
      select: {
        id: true,
        email: true
      },
      orderBy: {
        createdAt: "asc"
      }
    }),
    prisma.kanbanTask.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        sortOrder: true,
        isArchived: true,
        archivedAt: true,
        archivedById: true
      }
    })
  ]);
  const adminsByEmail = new Map(admins.map((admin) => [admin.email.toLowerCase(), admin]));
  const defaultActorId = admins[0]?.id ?? null;
  const existingByTitle = new Map(
    existingTasks.map((task) => [normalizeKanbanTaskTitle(task.title), task])
  );
  const knownSeedTitles = new Set(
    knownSeedKanbanTaskTitles.map((title) => normalizeKanbanTaskTitle(title))
  );
  const matchedTaskIds = new Set<string>();
  const statusCounters = Object.fromEntries(
    KANBAN_STATUS_VALUES.map((status) => [status, 0])
  ) as Record<(typeof KANBAN_STATUS_VALUES)[number], number>;

  for (const task of seedKanbanTasks) {
    const assigneeId = task.assigneeEmail
      ? adminsByEmail.get(task.assigneeEmail.toLowerCase())?.id ?? null
      : null;
    const existingTask = [task.title, ...(task.aliases ?? [])]
      .map((title) => existingByTitle.get(normalizeKanbanTaskTitle(title)))
      .find(Boolean);
    const isArchived = Boolean(task.isArchived);
    const sortOrder = isArchived ? existingTask?.sortOrder ?? 0 : statusCounters[task.status];

    if (!isArchived) {
      statusCounters[task.status] += 1;
    }

    if (existingTask) {
      await prisma.kanbanTask.update({
        where: {
          id: existingTask.id
        },
        data: {
          title: task.title,
          description: task.description,
          notes: task.notes ?? null,
          status: task.status,
          priority: task.priority,
          type: task.type,
          sortOrder,
          dueDate: task.dueDate ? new Date(task.dueDate) : null,
          assigneeId,
          isArchived,
          archivedAt: isArchived ? existingTask.archivedAt ?? new Date() : null,
          archivedById: isArchived ? existingTask.archivedById ?? defaultActorId : null,
          updatedById: defaultActorId
        }
      });

      await replaceKanbanChecklistItems(existingTask.id, task.checklistItems ?? []);
      matchedTaskIds.add(existingTask.id);
      continue;
    }

    const createdTask = await prisma.kanbanTask.create({
      data: {
        title: task.title,
        description: task.description,
        notes: task.notes ?? null,
        status: task.status,
        priority: task.priority,
        type: task.type,
        sortOrder,
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
        assigneeId,
        isArchived,
        archivedAt: isArchived ? new Date() : null,
        archivedById: isArchived ? defaultActorId : null,
        createdById: defaultActorId,
        updatedById: defaultActorId,
        checklistItems: {
          create: (task.checklistItems ?? []).map((item, index) => ({
            label: item.label,
            isDone: item.isDone,
            sortOrder: index
          }))
        }
      },
      select: {
        id: true
      }
    });

    matchedTaskIds.add(createdTask.id);
  }

  for (const task of existingTasks) {
    const normalizedTitle = normalizeKanbanTaskTitle(task.title);

    if (!knownSeedTitles.has(normalizedTitle) || matchedTaskIds.has(task.id) || task.isArchived) {
      continue;
    }

    await prisma.kanbanTask.update({
      where: {
        id: task.id
      },
      data: {
        isArchived: true,
        archivedAt: task.archivedAt ?? new Date(),
        archivedById: task.archivedById ?? defaultActorId,
        updatedById: defaultActorId
      }
    });
  }
}

async function main() {
  if (isDemoResetRequested()) {
    assertDemoResetAllowed();
    await resetDemoDatabase();
    await syncSafeSeed();
    await seedDemoOperationalData();
    await syncKanbanSeed();
    console.log("[seed] demo-reset concluído com sucesso.");
    return;
  }

  await syncSafeSeed();
  await syncKanbanSeed();
  console.log("[seed] safe concluído sem apagar dados existentes.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
