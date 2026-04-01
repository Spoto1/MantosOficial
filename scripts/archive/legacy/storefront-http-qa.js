const { createHash, randomBytes } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const BASE_URL = process.env.QA_BASE_URL ?? "http://127.0.0.1:3021";
const CUSTOMER_COOKIE_NAME = "orbe-customer-session";

function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function buildOrderNumber() {
  const stamp = Date.now().toString().slice(-8);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `MNT-${stamp}${suffix}`;
}

async function createCustomerSession(customerId) {
  const sessionToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

  await prisma.customerSession.create({
    data: {
      customerId,
      tokenHash: hashSessionToken(sessionToken),
      expiresAt,
      lastUsedAt: new Date(),
      userAgent: "codex-http-qa"
    }
  });

  return sessionToken;
}

async function fetchRoute(path, cookie) {
  const response = await fetch(`${BASE_URL}${path}`, {
    redirect: "follow",
    headers: cookie ? { cookie } : undefined
  });

  return {
    path,
    status: response.status,
    finalUrl: response.url,
    html: await response.text()
  };
}

function extractHeading(html) {
  const match = html.match(/<h1[^>]*>(.*?)<\/h1>/i) || html.match(/<h2[^>]*>(.*?)<\/h2>/i);

  if (!match) {
    return null;
  }

  return match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function main() {
  const unique = Date.now();
  const email = `qa-http-${unique}@cliente.test`;
  const customer = await prisma.customer.create({
    data: {
      email,
      firstName: "QA",
      lastName: "HTTP",
      passwordHash: "qa-http-placeholder",
      phone: "11999990000"
    }
  });
  const sessionToken = await createCustomerSession(customer.id);
  const cookie = `${CUSTOMER_COOKIE_NAME}=${sessionToken}`;

  const atlas = await prisma.product.findFirstOrThrow({
    where: {
      slug: "atlas-home"
    },
    include: {
      images: {
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }]
      },
      variants: {
        include: {
          size: true
        },
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  });

  const address = await prisma.address.create({
    data: {
      customerId: customer.id,
      label: "QA",
      recipientName: "QA HTTP",
      line1: "Rua da Consolação, 410",
      line2: "Ap 12 • QA diário",
      city: "São Paulo",
      state: "SP",
      postalCode: "01302000",
      country: "Brasil",
      phone: "11999990000"
    }
  });

  const order = await prisma.order.create({
    data: {
      number: buildOrderNumber(),
      externalReference: buildOrderNumber(),
      customerId: customer.id,
      addressId: address.id,
      status: "PENDING",
      paymentStatus: "PENDING",
      shippingStatus: "PENDING",
      paymentProvider: "mercado_pago_demo",
      paymentMethod: "checkout_demo",
      paymentStatusDetail: "demo-pending",
      checkoutUrl: "/checkout/demo",
      customerName: "QA HTTP",
      customerEmail: email,
      customerPhone: "11999990000",
      customerDocument: "12345678901",
      shippingMethod: "standard",
      subtotal: atlas.price,
      discountAmount: 0,
      shippingAmount: 24.9,
      total: Number(atlas.price) + 24.9,
      notes: "pedido QA controlado para validação diária",
      items: {
        create: [
          {
            productId: atlas.id,
            variantId: atlas.variants[0].id,
            productName: atlas.name,
            productSlug: atlas.slug,
            sku: atlas.variants[0].sku,
            unitPrice: atlas.price,
            quantity: 1,
            sizeLabel: atlas.variants[0].size.label,
            colorName: atlas.variants[0].colorName,
            imageUrl: atlas.images[0]?.url ?? "/products/atlas-home.svg"
          }
        ]
      }
    }
  });

  await prisma.favorite.create({
    data: {
      customerId: customer.id,
      productId: atlas.id
    }
  });

  const fetchState = async (path, paymentStatusDetail, paymentStatus, status) => {
    await prisma.order.update({
      where: {
        id: order.id
      },
      data: {
        paymentStatusDetail,
        paymentStatus,
        status,
        paidAt: paymentStatus === "PAID" ? new Date() : null
      }
    });

    return fetchRoute(path, cookie);
  };

  const pendingPage = await fetchState(
    `/checkout/pending?order=${encodeURIComponent(order.id)}&flow=local-validacao`,
    "demo-pending",
    "PENDING",
    "PENDING"
  );
  const failurePage = await fetchState(
    `/checkout/failure?order=${encodeURIComponent(order.id)}&flow=local-validacao`,
    "demo-failed",
    "FAILED",
    "FAILED"
  );
  const successPage = await fetchState(
    `/checkout/success?order=${encodeURIComponent(order.id)}&flow=local-validacao`,
    "demo-approved",
    "PAID",
    "PAID"
  );

  const refreshedOrder = await prisma.order.findUniqueOrThrow({
    where: {
      id: order.id
    }
  });

  const routes = await Promise.all([
    fetchRoute("/"),
    fetchRoute("/colecao"),
    fetchRoute("/produto/atlas-home"),
    fetchRoute("/favoritos", cookie),
    fetchRoute(
      `/rastreio?pedido=${encodeURIComponent(refreshedOrder.number)}&email=${encodeURIComponent(email)}&context=validacao-local`
    ),
    fetchRoute("/checkout", cookie),
    successPage,
    pendingPage,
    failurePage,
    fetchRoute("/conta", cookie),
    fetchRoute("/conta/pedidos", cookie),
    fetchRoute(`/conta/pedidos/${encodeURIComponent(order.id)}`, cookie),
    fetchRoute("/privacidade"),
    fetchRoute("/termos"),
    fetchRoute("/sobre")
  ]);

  console.log(
    JSON.stringify(
      {
        baseUrl: BASE_URL,
        email,
        orderId: order.id,
        orderNumber: refreshedOrder.number,
        routes: routes.map((route) => ({
          path: route.path,
          status: route.status,
          finalUrl: route.finalUrl,
          heading: extractHeading(route.html),
          containsPresentation: route.html.includes("Ambiente de apresentação"),
          containsOrbe: route.html.includes("Orbe") || route.html.includes("orbe"),
          containsDemo:
            route.html.includes("demonstração") ||
            route.html.includes("demonstracao") ||
            route.html.includes("Pedidos de demonstração"),
          containsAtlas: route.html.includes("Atlas 01")
        }))
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
