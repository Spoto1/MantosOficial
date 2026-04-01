import "dotenv/config";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE_URL = process.env.QA_BASE_URL ?? "http://127.0.0.1:3000";
const CHROME_PATH =
  process.env.QA_CHROME_PATH ??
  "C:\\Users\\Pedro Spoto\\AppData\\Local\\ms-playwright\\chromium-1194\\chrome-win\\chrome.exe";
const CDP_PORT = Number(process.env.QA_CDP_PORT ?? "9222");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "change-me";
const FAVORITE_EMAIL = "qa-favoritos@orbe.local";
const CONTACT_EMAIL = "qa-contato@orbe.local";
const CONTACT_SUBJECT = `QA smoke ${Date.now()}`;
const CONTACT_MESSAGE =
  "Mensagem automatizada de QA para validar persistencia real entre storefront e painel admin.";
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

async function fetchJson(url, options) {
  const response = await fetch(url, options);

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
    this.currentArea = "global";
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
      ws.addEventListener("error", (event) => reject(event.error ?? new Error("Falha ao abrir websocket CDP.")));
      ws.addEventListener("message", (event) => this.onMessage(event.data));
      ws.addEventListener("close", () => {
        for (const pending of this.pending.values()) {
          pending.reject(new Error("Conexao CDP encerrada."));
        }

        this.pending.clear();
      });
    });
  }

  on(method, handler) {
    const handlers = this.listeners.get(method) ?? [];
    handlers.push(handler);
    this.listeners.set(method, handlers);
  }

  emit(method, params) {
    const handlers = this.listeners.get(method) ?? [];

    for (const handler of handlers) {
      try {
        handler(params);
      } catch {}
    }
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
    this.emit(payload.method, payload.params ?? {});
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
        area: this.currentArea,
        type: params.type,
        text,
        url: params.stackTrace?.callFrames?.[0]?.url ?? null
      });
    }

    if (method === "Runtime.exceptionThrown") {
      this.exceptions.push({
        area: this.currentArea,
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
          area: this.currentArea,
          status,
          url: params.response?.url ?? this.networkRequests.get(params.requestId) ?? null,
          mimeType: params.response?.mimeType ?? null
        });
      }
    }

    if (method === "Network.loadingFailed") {
      const reason = params.errorText ?? params.blockedReason ?? "loadingFailed";

      if (reason.includes("ERR_ABORTED")) {
        return;
      }

      this.failedRequests.push({
        area: this.currentArea,
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
  const userDataDir = mkdtempSync(join(tmpdir(), "mantos-qa-"));
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
  await cdp.send("Page.setLifecycleEventsEnabled", { enabled: true });
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
  await sleep(300);
  await waitFor(
    () =>
      evaluate(
        cdp,
        `document.readyState === "complete" && Boolean(document.body)`
      ),
    15000
  );
  await sleep(250);
}

async function navigate(cdp, url) {
  await cdp.send("Page.navigate", { url });
  await waitForLoad(cdp);
}

async function waitForUrlIncludes(cdp, fragment, timeoutMs = 10000) {
  return waitFor(async () => {
    const href = await evaluate(cdp, "location.href");
    return href.includes(fragment) ? href : null;
  }, timeoutMs);
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

  assert(ok, `Elemento nao encontrado para clique: ${selector}`);
}

async function clickByText(cdp, text, selector = "a, button, summary") {
  const ok = await call(
    cdp,
    (targetText, targetSelector) => {
      const normalize = (value) =>
        value
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
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

async function fillField(cdp, selector, value) {
  const ok = await call(
    cdp,
    (inputSelector, nextValue) => {
      const element = document.querySelector(inputSelector);

      if (!element || !(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) {
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

async function submitForm(cdp, selector = "form") {
  const ok = await call(
    cdp,
    (formSelector) => {
      const form = document.querySelector(formSelector);

      if (!(form instanceof HTMLFormElement)) {
        return false;
      }

      form.requestSubmit();
      return true;
    },
    selector
  );

  assert(ok, `Formulario nao encontrado: ${selector}`);
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

async function getTexts(cdp, selector) {
  return call(
    cdp,
    (inputSelector) =>
      [...document.querySelectorAll(inputSelector)].map((element) =>
        (element.textContent || "").trim()
      ),
    selector
  );
}

async function getDocumentMetrics(cdp) {
  return call(
    cdp,
    () => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      headerExists: Boolean(document.querySelector("header")),
      footerExists: Boolean(document.querySelector("footer")),
      cartButtonExists: Boolean(
        [...document.querySelectorAll("button")].find((button) =>
          (button.textContent || "").includes("Carrinho")
        )
      ),
      mobileMenuVisible: Boolean(
        [...document.querySelectorAll("button")].find((button) =>
          (button.getAttribute("aria-label") || "").includes("Abrir menu")
        )
      )
    })
  );
}

async function setViewport(cdp, width, height, mobile = false) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    mobile,
    deviceScaleFactor: 1
  });
}

async function clearStorage(cdp) {
  await cdp.send("Storage.clearDataForOrigin", {
    origin: BASE_URL,
    storageTypes: "all"
  });
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

function createArea(name) {
  return {
    name,
    status: "PASSOU",
    notes: [],
    warnings: [],
    data: {}
  };
}

function warn(area, message) {
  area.status = area.status === "FALHOU" ? "FALHOU" : "PASSOU COM RESSALVAS";
  area.warnings.push(message);
}

async function runArea(report, cdp, name, fn) {
  const area = createArea(name);
  cdp.currentArea = name;

  try {
    await fn(area);
  } catch (error) {
    area.status = "FALHOU";
    area.error = serializeError(error);
  }

  report.areas.push(area);
  return area;
}

async function main() {
  const report = {
    baseUrl: BASE_URL,
    timestamp: new Date().toISOString(),
    areas: [],
    consoleMessages: [],
    exceptions: [],
    failedRequests: [],
    httpErrors: []
  };

  const { browser, userDataDir, wsUrl } = await createBrowser();
  const cdp = new CdpClient(wsUrl);

  try {
    await cdp.connect();
    await setupPage(cdp);
    await clearStorage(cdp);
    await setViewport(cdp, 1440, 1200, false);

    await runArea(report, cdp, "Home", async (area) => {
      await navigate(cdp, `${BASE_URL}/`);

      const h1 = await getText(cdp, "h1");
      const productLinks = await call(
        cdp,
        () =>
          [...document.querySelectorAll('a[href^="/produto/"]')]
            .map((link) => link.getAttribute("href"))
            .filter(Boolean)
      );

      area.data.h1 = h1;
      area.data.productLinkCount = productLinks.length;

      assert(h1?.includes("O manto como peca") || h1?.includes("O manto como peça"), "Hero principal nao carregou.");
      assert(productLinks.length >= 3, "A home nao exibiu pelo menos 3 links de produto.");
      assert((await getText(cdp, "footer"))?.includes("Newsletter"), "Footer ou newsletter nao encontrados.");
    });

    await runArea(report, cdp, "Catalogo", async (area) => {
      await navigate(cdp, `${BASE_URL}/colecao`);
      const heading = (await getText(cdp, "h2")) ?? (await getText(cdp, "h1"));
      assert(
        heading?.includes("Coleção") || heading?.includes("Colecao"),
        "Pagina de colecao nao carregou."
      );

      await navigate(cdp, `${BASE_URL}/colecao?collection=studio`);
      const studioProducts = await call(
        cdp,
        () => document.querySelectorAll('a[href^="/produto/"]').length
      );
      assert(studioProducts > 0, "Filtro Studio nao retornou produtos.");

      await navigate(cdp, `${BASE_URL}/colecao?collection=studio&sort=price-desc`);

      const prices = await call(
        cdp,
        () =>
          [...document.querySelectorAll("article")]
            .map((article) => {
              const raw = article.textContent || "";
              const match = raw.match(/R\$\s?([\d.]+,\d{2})/);
              return match ? Number(match[1].replace(/\./g, "").replace(",", ".")) : null;
            })
            .filter((value) => value !== null)
            .slice(0, 3)
      );

      area.data.sortedPrices = prices;

      if (prices.length >= 2 && prices[0] < prices[1]) {
        warn(area, "Ordenacao por maior preco nao se manteve descrescente nos primeiros cards.");
      }
    });

    await runArea(report, cdp, "Produto", async (area) => {
      await navigate(cdp, `${BASE_URL}/produto/atlas-home`);
      const h1 = await getText(cdp, "h1");
      assert(h1?.includes("Atlas"), "Pagina do produto atlas-home nao abriu.");

      await clickByText(cdp, "G", "button");
      await sleep(200);

      await clickByText(cdp, "Adicionar ao carrinho");
      await waitFor(async () => {
        const dialog = await call(
          cdp,
          () => document.querySelector('[role="dialog"]')?.getAttribute("aria-hidden") === "false"
        );
        return dialog ? true : null;
      }, 10000);

      const stockText = await call(
        cdp,
        () =>
          [...document.querySelectorAll("p")]
            .map((entry) => (entry.textContent || "").trim())
            .find((entry) => entry.startsWith("Estoque disponivel") || entry.startsWith("Estoque disponível")) ?? null
      );

      area.data.stockText = stockText;
      assert(stockText, "Carrinho nao exibiu o estoque disponivel do item.");
    });

    await runArea(report, cdp, "Carrinho", async (area) => {
      await clickSelector(cdp, '[aria-label="Fechar carrinho"]');
      await clickByText(cdp, "Adicionar ao carrinho");
      await waitFor(async () => {
        const dialog = await call(
          cdp,
          () => document.querySelector('[role="dialog"]')?.getAttribute("aria-hidden") === "false"
        );
        return dialog ? true : null;
      }, 10000);

      const beforeQuantity = await call(
        cdp,
        () =>
          [...document.querySelectorAll('[role="dialog"] article span')]
            .map((entry) => (entry.textContent || "").trim())
            .find((text) => /^\d+$/.test(text)) ?? null
      );

      await clickByText(cdp, "+", '[role="dialog"] article button');
      await sleep(300);

      const afterQuantity = await call(
        cdp,
        () =>
          [...document.querySelectorAll('[role="dialog"] article span')]
            .map((entry) => (entry.textContent || "").trim())
            .find((text) => /^\d+$/.test(text)) ?? null
      );

      area.data.beforeQuantity = beforeQuantity;
      area.data.afterQuantity = afterQuantity;

      assert(Number(afterQuantity) >= Number(beforeQuantity), "Aumento de quantidade falhou no carrinho.");

      for (let attempt = 0; attempt < 12; attempt += 1) {
        await clickByText(cdp, "+", '[role="dialog"] article button');
        await sleep(80);
      }

      const cartSnapshot = await call(
        cdp,
        () => {
          const article = document.querySelector('[role="dialog"] article');

          if (!article) {
            return null;
          }

          const paragraphs = [...article.querySelectorAll("p")].map((entry) =>
            (entry.textContent || "").trim()
          );
          const quantityText =
            [...article.querySelectorAll("span")]
              .map((entry) => (entry.textContent || "").trim())
              .find((text) => /^\d+$/.test(text)) ?? "0";
          const stockLine = paragraphs.find((entry) =>
            entry.startsWith("Estoque disponivel") || entry.startsWith("Estoque disponível")
          );
          const stockValue = stockLine ? Number(stockLine.replace(/\D+/g, "")) : null;

          return {
            quantity: Number(quantityText),
            stockValue
          };
        }
      );

      area.data.cartSnapshot = cartSnapshot;

      assert(
        cartSnapshot && cartSnapshot.stockValue !== null && cartSnapshot.quantity <= cartSnapshot.stockValue,
        "O carrinho permitiu quantidade acima do estoque disponivel."
      );

      await clickByText(cdp, "−", '[role="dialog"] article button');
      await sleep(200);
      await clickByText(cdp, "Remover");
      await waitFor(async () => {
        const text = await call(
          cdp,
          () => document.body.innerText.includes("Seu carrinho esta vazio.") || document.body.innerText.includes("Seu carrinho está vazio.")
        );
        return text ? true : null;
      }, 10000);

      await clickSelector(cdp, '[aria-label="Fechar carrinho"]');
      await clickByText(cdp, "Adicionar ao carrinho");
      await waitFor(async () => {
        const stored = await getCartStorage(cdp);
        return stored?.length ? true : null;
      }, 10000);
    });

    await runArea(report, cdp, "Responsividade", async (area) => {
      const checks = [];

      await setViewport(cdp, 1440, 1200, false);
      await navigate(cdp, `${BASE_URL}/`);
      checks.push({ viewport: "desktop-home", metrics: await getDocumentMetrics(cdp) });

      await setViewport(cdp, 900, 1180, false);
      await navigate(cdp, `${BASE_URL}/colecao`);
      checks.push({ viewport: "tablet-catalogo", metrics: await getDocumentMetrics(cdp) });

      await setViewport(cdp, 390, 844, true);
      await navigate(cdp, `${BASE_URL}/produto/atlas-home`);
      checks.push({ viewport: "mobile-produto", metrics: await getDocumentMetrics(cdp) });

      await clickSelector(cdp, '[aria-label="Abrir menu"]');
      await sleep(250);
      const mobileMenuHasItems = await call(
        cdp,
        () => Boolean(document.querySelector('nav[aria-label="Menu mobile"] a'))
      );

      await navigate(cdp, `${BASE_URL}/checkout`);
      checks.push({ viewport: "mobile-checkout", metrics: await getDocumentMetrics(cdp) });

      area.data.checks = checks;
      area.data.mobileMenuHasItems = mobileMenuHasItems;

      assert(mobileMenuHasItems, "Menu mobile nao abriu com itens navegaveis.");

      for (const entry of checks) {
        if (entry.metrics.scrollWidth > entry.metrics.innerWidth + 4) {
          warn(area, `Overflow horizontal detectado em ${entry.viewport}.`);
        }
      }
    });

    let createdOrderId = null;

    await runArea(report, cdp, "Checkout", async (area) => {
      await setViewport(cdp, 1440, 1200, false);
      await navigate(cdp, `${BASE_URL}/checkout`);

      const isInvalid = await call(
        cdp,
        () => {
          const form = document.querySelector("form");
          return form instanceof HTMLFormElement ? !form.checkValidity() : null;
        }
      );
      area.data.emptyFormInvalid = isInvalid;
      assert(isInvalid === true, "O formulario vazio do checkout nao marcou campos obrigatorios.");

      await fillField(cdp, 'input[name="couponCode"]', "INVALIDO");
      await clickByText(cdp, "Aplicar cupom");
      await waitFor(async () => {
        const text = await call(
          cdp,
          () => document.body.innerText.includes("Cupom invalido") || document.body.innerText.includes("Cupom inválido")
        );
        return text ? true : null;
      }, 10000);

      await fillField(cdp, 'input[name="couponCode"]', "ORBE10");
      await clickByText(cdp, "Aplicar cupom");
      await waitFor(async () => {
        const text = await call(
          cdp,
          () => document.body.innerText.includes("Cupom aplicado")
        );
        return text ? true : null;
      }, 10000);

      await clickByText(cdp, "Expressa");
      await sleep(400);

      await fillField(cdp, 'input[name="name"]', "QA Browser");
      await fillField(cdp, 'input[name="email"]', "qa-checkout@orbe.local");
      await fillField(cdp, 'input[name="phone"]', "11999990000");
      await fillField(cdp, 'input[name="cpf"]', "12345678901");
      await fillField(cdp, 'input[name="postalCode"]', "01302000");
      await fillField(cdp, 'input[name="address"]', "Rua da Consolacao, 410");
      await fillField(cdp, 'input[name="city"]', "Sao Paulo");
      await fillField(cdp, 'input[name="state"]', "SP");
      await fillField(cdp, 'input[name="complement"]', "Ap 12");
      await fillField(cdp, 'input[name="reference"]', "Smoke test");

      await clickByText(cdp, "Ir para pagamento");
      const pendingUrl = await waitForUrlIncludes(cdp, "/checkout/pending", 15000);
      const pending = new URL(pendingUrl);
      createdOrderId = pending.searchParams.get("order");

      area.data.pendingUrl = pendingUrl;
      area.data.createdOrderId = createdOrderId;

      assert(createdOrderId, "Checkout nao retornou ID de pedido no ambiente mock.");
    });

    await runArea(report, cdp, "Retornos de pagamento", async (area) => {
      const pendingCart = await getCartStorage(cdp);
      area.data.cartBeforePendingCheck = pendingCart;

      assert(
        Array.isArray(pendingCart) && pendingCart.length > 0,
        "Carrinho foi limpo indevidamente na pagina pending."
      );

      assert(
        (await getText(cdp, "h1"))?.includes("confirmacao") ||
          (await getText(cdp, "h1"))?.includes("confirmação") ||
          (await getText(cdp, "h1"))?.includes("Estamos acompanhando"),
        "Pagina pending nao exibiu o estado esperado."
      );

      await navigate(
        cdp,
        `${BASE_URL}/checkout/failure?order=${encodeURIComponent(createdOrderId ?? "")}`
      );
      const failureCart = await getCartStorage(cdp);
      area.data.cartAfterFailure = failureCart;

      assert(
        Array.isArray(failureCart) && failureCart.length > 0,
        "Carrinho foi limpo indevidamente na pagina failure."
      );

      await navigate(cdp, `${BASE_URL}/checkout/success?external_reference=ORB-100001`);
      await waitFor(async () => {
        const cart = await getCartStorage(cdp);
        return Array.isArray(cart) && cart.length === 0 ? true : null;
      }, 10000);

      const successHeading = await getText(cdp, "h1");
      area.data.successHeading = successHeading;
      area.data.cartAfterSuccess = await getCartStorage(cdp);

      assert(
        successHeading?.includes("confirmado") || successHeading?.includes("confirmada"),
        "Pagina success nao exibiu confirmacao coerente."
      );
    });

    await runArea(report, cdp, "Favoritos", async (area) => {
      await navigate(cdp, `${BASE_URL}/produto/atlas-home`);
      await clickByText(cdp, "Salvar nos favoritos");
      await fillField(cdp, 'input[name="favoriteEmail"]', FAVORITE_EMAIL);
      await clickByText(cdp, "Confirmar favorito");
      await waitFor(async () => {
        const text = await call(
          cdp,
          () => document.body.innerText.includes("foi salvo na sua lista.")
        );
        return text ? true : null;
      }, 10000);

      await navigate(cdp, `${BASE_URL}/favoritos?email=${encodeURIComponent(FAVORITE_EMAIL)}`);
      const text = await call(cdp, () => document.body.innerText);
      area.data.bodyIncludesAtlas = text.includes("Atlas 01");
      assert(text.includes("Atlas 01"), "Produto favoritado nao apareceu na pagina de favoritos.");
    });

    await runArea(report, cdp, "Rastreio", async (area) => {
      await navigate(
        cdp,
        `${BASE_URL}/rastreio?pedido=ORB-100001&email=${encodeURIComponent("cliente@orbe.local")}`
      );
      const text = await call(cdp, () => document.body.innerText);
      area.data.containsOrder = text.includes("ORB-100001");
      assert(text.includes("ORB-100001"), "Rastreio nao encontrou o pedido seed.");
    });

    await runArea(report, cdp, "Contato", async (area) => {
      await navigate(cdp, `${BASE_URL}/contato`);
      await fillField(cdp, 'input[name="name"]', "QA Browser");
      await fillField(cdp, 'input[name="email"]', CONTACT_EMAIL);
      await fillField(cdp, 'input[name="phone"]', "11988887777");
      await fillField(cdp, 'input[name="subject"]', CONTACT_SUBJECT);
      await fillField(cdp, 'textarea[name="message"]', CONTACT_MESSAGE);
      await submitForm(cdp);
      await waitFor(async () => {
        const text = await call(
          cdp,
          () => document.body.innerText.includes("Mensagem enviada com sucesso")
        );
        return text ? true : null;
      }, 10000);

      area.data.subject = CONTACT_SUBJECT;
    });

    await runArea(report, cdp, "Admin", async (area) => {
      await navigate(cdp, `${BASE_URL}/admin`);
      const preLoginMetrics = await getDocumentMetrics(cdp);
      area.data.preLoginMetrics = preLoginMetrics;

      assert(!preLoginMetrics.headerExists && !preLoginMetrics.footerExists, "Admin herdou header/footer do storefront.");

      await fillField(cdp, 'input[name="password"]', ADMIN_PASSWORD);
      await submitForm(cdp);
      await sleep(400);
      await waitFor(async () => {
        const text = await call(cdp, () => document.body.innerText.includes("Dashboard operacional"));
        return text ? true : null;
      }, 10000);

      await navigate(cdp, `${BASE_URL}/admin/products`);
      const productListText = await call(cdp, () => document.body.innerText);
      assert(productListText.includes("Atlas Home"), "Admin products nao listou produtos seed.");

      const editHref = await call(
        cdp,
        () =>
          [...document.querySelectorAll('a[href^="/admin/products/"]')]
            .map((link) => link.getAttribute("href"))
            .find((href) => href && !href.endsWith("/new")) ?? null
      );
      assert(editHref, "Nao foi possivel localizar um link de edicao no admin.");

      await navigate(cdp, `${BASE_URL}${editHref}`);
      await clickByText(cdp, "Salvar produto");
      await waitForUrlIncludes(cdp, "saved=1", 15000);
      await waitFor(async () => {
        const text = await call(cdp, () => document.body.innerText.includes("Produto salvo com sucesso."));
        return text ? true : null;
      }, 10000);

      await navigate(cdp, `${BASE_URL}/admin/contacts`);
      const contactsText = await call(cdp, () => document.body.innerText);
      area.data.contactVisibleInAdmin = contactsText.includes(CONTACT_SUBJECT);
      assert(contactsText.includes(CONTACT_SUBJECT), "Lead de contato nao apareceu no admin.");
    });

    await runArea(report, cdp, "Institucionais", async (area) => {
      const routes = [
        "/faq",
        "/sobre",
        "/trocas",
        "/privacidade",
        "/termos",
        "/rota-inexistente-qa"
      ];
      const results = [];

      for (const route of routes) {
        await navigate(cdp, `${BASE_URL}${route}`);
        results.push({
          route,
          h1: await getText(cdp, "h1")
        });
      }

      area.data.routes = results;
      assert(results.every((entry) => entry.h1), "Alguma pagina institucional nao apresentou heading principal.");
      assert(
        results.find((entry) => entry.route === "/rota-inexistente-qa")?.h1?.includes("Essa rota"),
        "Pagina 404 customizada nao foi renderizada."
      );
    });

    report.consoleMessages = cdp.consoleMessages;
    report.exceptions = cdp.exceptions;
    report.failedRequests = cdp.failedRequests;
    report.httpErrors = cdp.httpErrors;

    console.log(JSON.stringify(report, null, 2));
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

main().catch((error) => {
  console.error(JSON.stringify({ fatal: serializeError(error) }, null, 2));
  process.exitCode = 1;
});
