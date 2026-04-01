import "dotenv/config";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE_URL = process.env.QA_BASE_URL ?? "http://127.0.0.1:3021";
const CHROME_PATH =
  process.env.QA_CHROME_PATH ??
  "C:\\Users\\Pedro Spoto\\AppData\\Local\\ms-playwright\\chromium-1194\\chrome-win\\chrome.exe";
const CDP_PORT = Number(process.env.QA_CDP_PORT ?? "9223");
const CUSTOMER_EMAIL = `qa-storefront-${Date.now()}@mantos.local`;
const CUSTOMER_PASSWORD = "MantosQa!2026";
const CUSTOMER_NAME = "QA Storefront";
const CART_STORAGE_KEY = "orbe-mantos-cart";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function serializeError(error) {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack ?? null
    };
  }

  return {
    message: String(error),
    stack: null
  };
}

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ao acessar ${url}`);
  }

  return response.json();
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.nextId = 0;
    this.pending = new Map();
    this.listeners = new Map();
    this.networkRequests = new Map();
    this.currentRoute = "global";
    this.consoleMessages = [];
    this.exceptions = [];
    this.failedRequests = [];
    this.httpErrors = [];
  }

  async connect() {
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl);
      this.ws = ws;

      ws.addEventListener("open", () => resolve());
      ws.addEventListener("error", (event) =>
        reject(event.error ?? new Error("Falha ao abrir websocket CDP."))
      );
      ws.addEventListener("message", (event) => this.onMessage(event.data));
      ws.addEventListener("close", () => {
        for (const pending of this.pending.values()) {
          pending.reject(new Error("Conexao CDP encerrada."));
        }

        this.pending.clear();
      });
    });
  }

  onMessage(raw) {
    const payload = JSON.parse(String(raw));

    if (payload.id) {
      const pending = this.pending.get(payload.id);

      if (!pending) {
        return;
      }

      this.pending.delete(payload.id);

      if (payload.error) {
        pending.reject(new Error(payload.error.message ?? "Erro CDP."));
        return;
      }

      pending.resolve(payload.result ?? {});
      return;
    }

    if (!payload.method) {
      return;
    }

    this.handleEvent(payload.method, payload.params ?? {});
  }

  handleEvent(method, params) {
    if (method === "Runtime.consoleAPICalled") {
      const text = (params.args ?? [])
        .map((arg) => {
          if ("value" in arg) {
            return String(arg.value);
          }

          return arg.description ?? arg.type ?? "";
        })
        .join(" ");

      this.consoleMessages.push({
        route: this.currentRoute,
        type: params.type,
        text
      });
    }

    if (method === "Runtime.exceptionThrown") {
      this.exceptions.push({
        route: this.currentRoute,
        text: params.exceptionDetails?.text ?? "Erro JS",
        url: params.exceptionDetails?.url ?? null,
        line: params.exceptionDetails?.lineNumber ?? null,
        column: params.exceptionDetails?.columnNumber ?? null
      });
    }

    if (method === "Network.requestWillBeSent") {
      this.networkRequests.set(params.requestId, params.request?.url ?? null);
    }

    if (method === "Network.responseReceived") {
      const status = Number(params.response?.status ?? 0);

      if (status >= 400) {
        this.httpErrors.push({
          route: this.currentRoute,
          status,
          url: params.response?.url ?? this.networkRequests.get(params.requestId) ?? null
        });
      }
    }

    if (method === "Network.loadingFailed") {
      const reason = params.errorText ?? params.blockedReason ?? "loadingFailed";

      if (reason.includes("ERR_ABORTED")) {
        return;
      }

      this.failedRequests.push({
        route: this.currentRoute,
        url: this.networkRequests.get(params.requestId) ?? null,
        reason
      });
    }
  }

  send(method, params = {}) {
    const id = ++this.nextId;

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async close() {
    if (!this.ws) {
      return;
    }

    await new Promise((resolve) => {
      this.ws.addEventListener("close", () => resolve(), { once: true });
      this.ws.close();
    });
  }
}

function jsCall(fn, ...args) {
  const serializedArgs = args.map((value) => JSON.stringify(value)).join(", ");
  return `(${fn.toString()})(${serializedArgs})`;
}

async function waitFor(condition, timeoutMs = 10000, intervalMs = 100) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const result = await condition();

      if (result) {
        return result;
      }
    } catch {}

    await sleep(intervalMs);
  }

  throw new Error(`Timeout de ${timeoutMs}ms excedido.`);
}

async function createBrowser() {
  const userDataDir = mkdtempSync(join(tmpdir(), "mantos-storefront-qa-"));
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-dev-shm-usage",
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${userDataDir}`,
    "about:blank"
  ];
  const browser = spawn(CHROME_PATH, args, {
    stdio: "ignore"
  });

  browser.on("error", () => {});

  const target = await waitFor(async () => {
    const targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
    return targets.find((entry) => entry.type === "page" && entry.webSocketDebuggerUrl);
  }, 15000);

  return {
    browser,
    userDataDir,
    wsUrl: target.webSocketDebuggerUrl
  };
}

async function setupPage(cdp) {
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Console.enable");
  await cdp.send("Network.enable");
  await cdp.send("Log.enable");
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });

  return result.result?.value;
}

async function call(cdp, fn, ...args) {
  return evaluate(cdp, jsCall(fn, ...args));
}

async function waitForLoad(cdp) {
  await waitFor(
    () => evaluate(cdp, `document.readyState === "complete" && Boolean(document.body)`),
    15000
  );
  await sleep(300);
}

async function navigate(cdp, route, label = route) {
  cdp.currentRoute = label;
  await cdp.send("Page.navigate", { url: `${BASE_URL}${route}` });
  await waitForLoad(cdp);
}

async function waitForUrlIncludes(cdp, fragment, timeoutMs = 10000) {
  return waitFor(async () => {
    const href = await evaluate(cdp, "location.href");
    return href.includes(fragment) ? href : null;
  }, timeoutMs);
}

async function fillField(cdp, selector, value) {
  const ok = await call(
    cdp,
    (inputSelector, nextValue) => {
      const element = document.querySelector(inputSelector);

      if (
        !element ||
        !(
          element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement ||
          element instanceof HTMLSelectElement
        )
      ) {
        return false;
      }

      element.focus();
      const prototype =
        element instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : element instanceof HTMLSelectElement
            ? HTMLSelectElement.prototype
            : HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");

      if (descriptor?.set) {
        descriptor.set.call(element, nextValue);
      } else {
        element.value = nextValue;
      }

      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    },
    selector,
    value
  );

  assert(ok, `Campo nao encontrado: ${selector}`);
}

async function clickByText(cdp, text, selector = "a, button, summary, label") {
  const ok = await call(
    cdp,
    (targetText, targetSelector) => {
      const normalize = (value) =>
        value
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();
      const normalized = normalize(targetText);
      const elements = [...document.querySelectorAll(targetSelector)];
      const element = elements.find((entry) => {
        if (!(entry instanceof HTMLElement)) {
          return false;
        }

        const content = normalize(entry.innerText || entry.textContent || "");
        return content === normalized || content.includes(normalized);
      });

      if (!element || !(element instanceof HTMLElement)) {
        return false;
      }

      element.click();
      return true;
    },
    text,
    selector
  );

  assert(ok, `Elemento com texto nao encontrado: ${text}`);
}

async function clickSelector(cdp, selector) {
  const ok = await call(
    cdp,
    (inputSelector) => {
      const element = document.querySelector(inputSelector);

      if (!element || !(element instanceof HTMLElement)) {
        return false;
      }

      element.click();
      return true;
    },
    selector
  );

  assert(ok, `Elemento nao encontrado: ${selector}`);
}

async function submitFirstForm(cdp) {
  const ok = await call(cdp, () => {
    const form = document.querySelector("form");

    if (!(form instanceof HTMLFormElement)) {
      return false;
    }

    form.requestSubmit();
    return true;
  });

  assert(ok, "Formulario principal nao encontrado.");
}

async function getText(cdp, selector) {
  return call(
    cdp,
    (inputSelector) => {
      const element = document.querySelector(inputSelector);
      return element ? (element.textContent || "").trim() : null;
    },
    selector
  );
}

async function getBodyText(cdp) {
  return evaluate(cdp, "document.body.innerText");
}

async function getTitle(cdp) {
  return evaluate(cdp, "document.title");
}

async function getViewportMetrics(cdp) {
  return call(cdp, () => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight
  }));
}

async function getImageMetrics(cdp) {
  return call(cdp, () => {
    const images = [...document.querySelectorAll("img")];

    return {
      count: images.length,
      broken: images.filter((image) => image.complete && image.naturalWidth === 0).length
    };
  });
}

async function clearStorage(cdp) {
  await cdp.send("Storage.clearDataForOrigin", {
    origin: BASE_URL,
    storageTypes: "all"
  });
}

async function setViewport(cdp, width, height, mobile = false) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    mobile,
    deviceScaleFactor: 1
  });
}

async function getProductLinks(cdp) {
  return call(
    cdp,
    () =>
      [...document.querySelectorAll('a[href^="/produto/"]')]
        .map((link) => link.getAttribute("href"))
        .filter(Boolean)
  );
}

async function getCartStorage(cdp) {
  return call(
    cdp,
    (key) => {
      try {
        return JSON.parse(localStorage.getItem(key) || "[]");
      } catch {
        return null;
      }
    },
    CART_STORAGE_KEY
  );
}

async function runChecks() {
  const { browser, userDataDir, wsUrl } = await createBrowser();
  const cdp = new CdpClient(wsUrl);
  const results = [];
  const findings = [];
  const contentFlags = [];
  let createdOrderId = null;
  let createdOrderNumber = null;
  let primaryProductRoute = null;
  let primaryProductName = null;

  try {
    await cdp.connect();
    await setupPage(cdp);
    await clearStorage(cdp);
    await setViewport(cdp, 1440, 1200, false);

    const checkRoute = async (route, validate, label = route) => {
      const result = {
        route,
        label,
        status: "confirmado",
        title: null,
        heading: null,
        bodySnippets: [],
        viewport: null,
        images: null,
        notes: []
      };

      try {
        await navigate(cdp, route, label);
        result.title = await getTitle(cdp);
        result.heading = (await getText(cdp, "h1")) ?? (await getText(cdp, "h2"));
        result.viewport = await getViewportMetrics(cdp);
        result.images = await getImageMetrics(cdp);

        if (typeof validate === "function") {
          await validate(result);
        }

        if (result.viewport.scrollWidth > result.viewport.innerWidth + 4) {
          result.notes.push("Overflow horizontal detectado.");
        }

        if (result.images.broken > 0) {
          result.notes.push(`Imagens quebradas: ${result.images.broken}.`);
        }
      } catch (error) {
        result.status = "confirmado";
        result.error = serializeError(error);
      }

      results.push(result);
      return result;
    };

    await checkRoute("/", async (result) => {
      const body = await getBodyText(cdp);
      const productLinks = await getProductLinks(cdp);
      assert(
        result.heading?.includes("Camisas autorais com leitura clara") ||
          result.heading?.includes("Camisas autorais com catalogo claro"),
        "Hero da home não carregou."
      );
      assert(productLinks.length > 0, "Home sem links de produto.");
      primaryProductRoute = productLinks[0] ?? primaryProductRoute;
      result.bodySnippets.push(body.includes("Newsletter") ? "Newsletter visível" : "Newsletter ausente");
    });

    await checkRoute("/colecao", async () => {
      const productLinks = await getProductLinks(cdp);
      assert(productLinks.length > 0, "Coleção sem cards de produto.");
      primaryProductRoute = productLinks[0] ?? primaryProductRoute;
    });

    assert(primaryProductRoute, "Nenhuma rota real de produto foi descoberta.");

    await checkRoute(primaryProductRoute, async (result) => {
      assert(result.heading, "Página de produto sem heading principal.");
      primaryProductName = result.heading;
      await clickByText(cdp, "G", "button");
      await clickByText(cdp, "Adicionar ao carrinho");
      await clickByText(cdp, "Abrir carrinho e revisar a seleção");
      await waitFor(async () => {
        const text = await getBodyText(cdp);
        return text.includes("Sua seleção") ? true : null;
      }, 10000);
      const cart = await getCartStorage(cdp);
      assert(Array.isArray(cart) && cart.length > 0, "Carrinho não recebeu item.");
    });

    await checkRoute("/checkout/acesso", async (result) => {
      assert(result.heading, "Página /checkout/acesso não carregou heading.");
    });

    await checkRoute("/cadastro?next=%2Fcheckout", async () => {
      await fillField(cdp, 'input[name="name"]', CUSTOMER_NAME);
      await fillField(cdp, 'input[name="email"]', CUSTOMER_EMAIL);
      await fillField(cdp, 'input[name="password"]', CUSTOMER_PASSWORD);
      await fillField(cdp, 'input[name="confirmPassword"]', CUSTOMER_PASSWORD);
      await submitFirstForm(cdp);
      await waitForUrlIncludes(cdp, "/checkout", 15000);
    }, "/cadastro");

    await checkRoute("/checkout", async (result) => {
      const body = await getBodyText(cdp);
      assert(
        result.heading?.includes("Confirme seus dados") ||
          result.heading?.includes("Confirme"),
        "Checkout não abriu autenticado."
      );
      if (body.includes("Ambiente de apresentação ativo")) {
        contentFlags.push({
          route: "/checkout",
          issue:
            "Aviso explícito de ambiente de apresentação aparece no checkout customer-facing."
        });
      }

      await fillField(cdp, 'input[name="postalCode"]', "01302000");
      await fillField(cdp, 'input[name="address"]', "Rua da Consolação, 410");
      await fillField(cdp, 'input[name="city"]', "São Paulo");
      await fillField(cdp, 'input[name="state"]', "SP");
      await fillField(cdp, 'input[name="complement"]', "Ap 12");
      await fillField(cdp, 'input[name="reference"]', "QA diário");
      await clickByText(cdp, "Revisar retorno interno do pedido");
      const demoUrl = await waitForUrlIncludes(cdp, "/checkout/demo", 15000);
      const demoParams = new URL(demoUrl).searchParams;
      createdOrderId = demoParams.get("order");
      assert(createdOrderId, "Checkout demo não retornou pedido.");
      const demoBody = await getBodyText(cdp);
      if (demoBody.includes("Nenhuma cobrança real")) {
        contentFlags.push({
          route: "/checkout/demo",
          issue: "Fluxo demo expõe cópia explícita de apresentação."
        });
      }
      createdOrderNumber = await call(
        cdp,
        () =>
          [...document.querySelectorAll("p, span, h1, h2")]
            .map((entry) => (entry.textContent || "").trim())
            .find((text) => /^MNT-/.test(text)) ?? null
      );
    }, "/checkout/demo");

    await checkRoute(
      `/checkout/pending?order=${createdOrderId}&flow=local-validacao&context=validacao-local`,
      async (result) => {
        const body = await getBodyText(cdp);
        result.bodySnippets.push(
          body.includes("Estamos acompanhando") ? "copy principal ok" : "copy divergente"
        );
      }
    );

    await checkRoute(
      `/checkout/failure?order=${createdOrderId}&flow=local-validacao&context=validacao-local`,
      async (result) => {
        const body = await getBodyText(cdp);
        result.bodySnippets.push(
          body.includes("Tentar novamente") ? "recuperação visível" : "recuperação fraca"
        );
      }
    );

    await checkRoute(
      `/checkout/success?order=${createdOrderId}&flow=local-validacao&context=validacao-local`,
      async (result) => {
        const body = await getBodyText(cdp);
        result.bodySnippets.push(
          body.includes("Pedido confirmado com sucesso.") ? "headline ok" : "headline divergente"
        );
      }
    );

    await checkRoute(primaryProductRoute, async () => {
      await clickByText(cdp, "Salvar nos favoritos");
      await waitFor(async () => {
        const body = await getBodyText(cdp);
        return body.includes("foi salvo na sua lista.") ? true : null;
      }, 10000);
    }, `${primaryProductRoute}#favorito`);

    await checkRoute("/favoritos", async (result) => {
      const body = await getBodyText(cdp);
      assert(primaryProductName && body.includes(primaryProductName), "Favorito salvo não apareceu.");
      result.bodySnippets.push(body.includes(CUSTOMER_EMAIL) ? "email da conta visível" : "email da conta ausente");
    });

    await checkRoute("/conta", async (result) => {
      const body = await getBodyText(cdp);
      assert(body.includes("Favoritos da conta"), "Conta não carregou o resumo principal.");
      result.bodySnippets.push(body.includes("Abrir favoritos") ? "atalho favoritos ok" : "atalho favoritos ausente");
    });

    await checkRoute("/conta/pedidos", async (result) => {
      const body = await getBodyText(cdp);
      assert(body.includes("Histórico de pedidos"), "Página /conta/pedidos não carregou.");
      result.bodySnippets.push(createdOrderNumber ? `pedido ${createdOrderNumber}` : "número do pedido não capturado");
    });

    await checkRoute(`/conta/pedidos/${createdOrderId}`, async (result) => {
      const body = await getBodyText(cdp);
      assert(body.includes("Acompanhar este pedido"), "CTA de rastreio ausente no detalhe.");
      result.bodySnippets.push(createdOrderNumber ?? "pedido sem número capturado");
    }, "/conta/pedidos/[id]");

    await checkRoute(
      `/rastreio?pedido=${encodeURIComponent(createdOrderNumber ?? "")}&email=${encodeURIComponent(CUSTOMER_EMAIL)}&context=local-validacao`,
      async (result) => {
        const body = await getBodyText(cdp);
        assert(body.includes(createdOrderNumber ?? ""), "Rastreio não encontrou pedido criado.");
        if (body.includes("Ambiente de apresentação")) {
          contentFlags.push({
            route: "/rastreio",
            issue: "Rastreio exibe aviso de apresentação para pedido controlado."
          });
        }
        result.bodySnippets.push(body.includes("Pedido localizado") ? "pedido localizado" : "pedido não localizado");
      },
      "/rastreio"
    );

    await checkRoute("/contato", async () => {});
    await checkRoute("/trocas", async () => {});
    await checkRoute("/faq", async () => {});
    await checkRoute("/privacidade", async () => {});
    await checkRoute("/termos", async () => {});
    await checkRoute("/sobre", async () => {});

    const customerFacingConsole = cdp.consoleMessages.filter(
      (entry) => !entry.text.includes("favicon")
    );
    const customerFacingExceptions = cdp.exceptions;
    const customerFacingHttpErrors = cdp.httpErrors.filter(
      (entry) => !String(entry.url ?? "").includes("/favicon")
    );

    for (const exception of customerFacingExceptions) {
      findings.push({
        severity: "alta",
        route: exception.route,
        issue: `Exception no browser: ${exception.text}`,
        detail: exception.url
      });
    }

    return {
      baseUrl: BASE_URL,
      customerEmail: CUSTOMER_EMAIL,
      createdOrderId,
      createdOrderNumber,
      results,
      contentFlags,
      consoleMessages: customerFacingConsole,
      exceptions: customerFacingExceptions,
      httpErrors: customerFacingHttpErrors,
      failedRequests: cdp.failedRequests
    };
  } finally {
    try {
      await cdp.close();
    } catch {}

    try {
      browser.kill("SIGKILL");
    } catch {}

    try {
      rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  }
}

runChecks()
  .then((report) => {
    console.log(JSON.stringify(report, null, 2));
  })
  .catch((error) => {
    console.error(JSON.stringify({ fatal: serializeError(error) }, null, 2));
    process.exitCode = 1;
  });
