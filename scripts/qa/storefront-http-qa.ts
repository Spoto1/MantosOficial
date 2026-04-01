import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { createMockCheckout, toggleFavorite, updateDemoOrderStatus } from "@/lib/repositories/orders";

const BASE_URL = process.env.QA_BASE_URL ?? "http://127.0.0.1:3021";
const CUSTOMER_COOKIE_NAME = "orbe-customer-session";

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function createCustomerSession(customerId: string) {
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

async function fetchRoute(path: string, cookie?: string) {
  const response = await fetch(`${BASE_URL}${path}`, {
    redirect: "follow",
    headers: cookie
      ? {
          cookie
        }
      : undefined
  });

  return {
    path,
    status: response.status,
    finalUrl: response.url,
    html: await response.text()
  };
}

function extractHeading(html: string) {
  const match = html.match(/<h1[^>]*>(.*?)<\/h1>/i) ?? html.match(/<h2[^>]*>(.*?)<\/h2>/i);
  return match?.[1]?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ?? null;
}

async function main() {
  const unique = Date.now();
  const email = `qa-http-${unique}@mantos.local`;
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

  const product = await prisma.product.findFirstOrThrow({
    where: {
      isActive: true
    },
    include: {
      variants: {
        include: {
          size: true
        },
        orderBy: {
          createdAt: "asc"
        }
      }
    },
    orderBy: {
      createdAt: "asc"
    }
  });
  const purchasableVariant = product.variants.find(
    (variant) => variant.isActive && variant.stock > 0
  );

  if (!purchasableVariant) {
    throw new Error(`Nenhuma variação com estoque disponível foi encontrada para ${product.name}.`);
  }

  const mockCheckout = await createMockCheckout(
    {
      name: "QA HTTP",
      email,
      phone: "11999990000",
      cpf: "12345678901",
      postalCode: "01302000",
      address: "Rua da Consolação, 410",
      city: "São Paulo",
      state: "SP",
      complement: "Ap 12",
      reference: "QA diário",
      shipping: "standard",
      items: [
        {
          productId: product.id,
          variantId: purchasableVariant.id,
          quantity: 1,
          size: purchasableVariant.size.label,
          color: purchasableVariant.colorName
        }
      ]
    },
    {
      customerId: customer.id
    }
  );

  await toggleFavorite({
    customerId: customer.id,
    productId: product.id
  });

  await updateDemoOrderStatus({
    orderId: mockCheckout.orderId!,
    outcome: "pending"
  });

  const pendingPage = await fetchRoute(
    `/checkout/pending?order=${encodeURIComponent(mockCheckout.orderId!)}&flow=local-validacao`,
    cookie
  );

  await updateDemoOrderStatus({
    orderId: mockCheckout.orderId!,
    outcome: "failure"
  });

  const failurePage = await fetchRoute(
    `/checkout/failure?order=${encodeURIComponent(mockCheckout.orderId!)}&flow=local-validacao`,
    cookie
  );

  await updateDemoOrderStatus({
    orderId: mockCheckout.orderId!,
    outcome: "success"
  });

  const order = await prisma.order.findUniqueOrThrow({
    where: {
      id: mockCheckout.orderId
    }
  });

  const routes = [
    await fetchRoute("/"),
    await fetchRoute("/colecao"),
    await fetchRoute(`/produto/${product.slug}`),
    await fetchRoute("/favoritos", cookie),
    await fetchRoute(
      `/rastreio?pedido=${encodeURIComponent(order.number)}&email=${encodeURIComponent(email)}&context=local-validacao`
    ),
    await fetchRoute("/checkout", cookie),
    await fetchRoute("/checkout/acesso"),
    await fetchRoute(
      `/checkout/success?order=${encodeURIComponent(mockCheckout.orderId!)}&flow=local-validacao`,
      cookie
    ),
    pendingPage,
    failurePage,
    await fetchRoute("/conta", cookie),
    await fetchRoute("/conta/pedidos", cookie),
    await fetchRoute(`/conta/pedidos/${encodeURIComponent(mockCheckout.orderId!)}`, cookie),
    await fetchRoute("/contato"),
    await fetchRoute("/trocas"),
    await fetchRoute("/faq"),
    await fetchRoute("/privacidade"),
    await fetchRoute("/termos"),
    await fetchRoute("/sobre")
  ];

  console.log(
    JSON.stringify(
      {
        baseUrl: BASE_URL,
        email,
        orderId: mockCheckout.orderId,
        orderNumber: order.number,
        product: {
          name: product.name,
          slug: product.slug
        },
        routes: routes.map((route) => ({
          path: route.path,
          status: route.status,
          finalUrl: route.finalUrl,
          heading: extractHeading(route.html),
          containsPresentation: route.html.includes("Ambiente de apresentação"),
          containsOrbe: route.html.includes("Orbe") || route.html.includes("orbe"),
          containsDemo: route.html.includes("demonstração") || route.html.includes("demonstracao")
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
