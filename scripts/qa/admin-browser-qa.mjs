import "dotenv/config";
import { spawn } from "node:child_process";
import { createHash, createHmac } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE_URL = process.env.QA_BASE_URL ?? "http://127.0.0.1:3016";
const CHROME_PATH =
  process.env.QA_CHROME_PATH ??
  "C:\\Users\\Pedro Spoto\\AppData\\Local\\ms-playwright\\chromium-1194\\chrome-win\\chrome.exe";
const CDP_PORT = Number(process.env.QA_CDP_PORT ?? "9333");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim() || "owner@mantos.local";
const ADMIN_NAME = process.env.ADMIN_NAME?.trim() || "Admin Mantos";
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET?.trim() || "__mantos-admin-dev-session__";
const OUTPUT_DIR = join(process.cwd(), "output", "qa", "admin-browser");

mkdirSync(OUTPUT_DIR, { recursive: true });

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
      stack: error.stack ?? null,
    };
  }

  return {
    message: String(error),
    stack: null,
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
    this.consoleMessages = [];
    this.exceptions = [];
    this.failedRequests = [];
    this.httpErrors = [];
    this.currentRoute = "global";
    this.requestUrls = new Map();
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.addEventListener("open", resolve);
      this.ws.addEventListener("error", (event) =>
        reject(event.error ?? new Error("Falha ao abrir websocket CDP."))
      );
      this.ws.addEventListener("message", (event) => this.onMessage(event.data));
      this.ws.addEventListener("close", () => {
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

    const params = payload.params ?? {};

    if (payload.method === "Runtime.consoleAPICalled") {
      const text = (params.args ?? [])
        .map((arg) => ("value" in arg ? String(arg.value) : arg.description ?? arg.type ?? ""))
        .join(" ");

      this.consoleMessages.push({
        route: this.currentRoute,
        type: params.type,
        text,
      });
    }

    if (payload.method === "Runtime.exceptionThrown") {
      this.exceptions.push({
        route: this.currentRoute,
        text: params.exceptionDetails?.text ?? "Erro JS",
        url: params.exceptionDetails?.url ?? null,
      });
    }

    if (payload.method === "Network.requestWillBeSent") {
      this.requestUrls.set(params.requestId, params.request?.url ?? null);
    }

    if (payload.method === "Network.responseReceived") {
      const status = Number(params.response?.status ?? 0);
      if (status >= 400) {
        this.httpErrors.push({
          route: this.currentRoute,
          status,
          url: params.response?.url ?? this.requestUrls.get(params.requestId) ?? null,
        });
      }
    }

    if (payload.method === "Network.loadingFailed") {
      const reason = params.errorText ?? params.blockedReason ?? "loadingFailed";
      if (!String(reason).includes("ERR_ABORTED")) {
        this.failedRequests.push({
          route: this.currentRoute,
          url: this.requestUrls.get(params.requestId) ?? null,
          reason,
        });
      }
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
    if (!this.ws) return;

    await new Promise((resolve) => {
      this.ws.addEventListener("close", resolve, { once: true });
      this.ws.close();
    });
  }
}

async function waitFor(condition, timeoutMs = 10000, intervalMs = 100) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const result = await condition();
    if (result) {
      return result;
    }
    await sleep(intervalMs);
  }

  throw new Error(`Timeout de ${timeoutMs}ms excedido.`);
}

async function createBrowser() {
  const userDataDir = mkdtempSync(join(tmpdir(), "mantos-admin-qa-"));
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-dev-shm-usage",
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${userDataDir}`,
    "about:blank",
  ];

  const browser = spawn(CHROME_PATH, args, { stdio: "ignore" });
  browser.on("error", () => {});

  const target = await waitFor(async () => {
    const targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
    return targets.find((entry) => entry.type === "page" && entry.webSocketDebuggerUrl);
  }, 15000);

  return {
    browser,
    userDataDir,
    wsUrl: target.webSocketDebuggerUrl,
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
    returnByValue: true,
  });

  return result.result?.value;
}

function jsCall(fn, ...args) {
  const serializedArgs = args.map((value) => JSON.stringify(value)).join(", ");
  return `(${fn.toString()})(${serializedArgs})`;
}

async function call(cdp, fn, ...args) {
  return evaluate(cdp, jsCall(fn, ...args));
}

async function navigate(cdp, url) {
  await cdp.send("Page.navigate", { url });
  await waitFor(() => evaluate(cdp, `document.readyState === "complete"`), 15000);
  await sleep(300);
}

async function setViewport(cdp, width, height, mobile = false) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    mobile,
    deviceScaleFactor: 1,
  });
}

async function waitForText(cdp, text, timeoutMs = 10000) {
  return waitFor(
    () =>
      call(
        cdp,
        (expected) => document.body.innerText.includes(expected),
        text
      ),
    timeoutMs
  );
}

async function screenshot(cdp, name) {
  const { data } = await cdp.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
  });

  const filePath = join(OUTPUT_DIR, `${name}.png`);
  writeFileSync(filePath, Buffer.from(data, "base64"));
  return filePath;
}

function createAdminSessionCookie() {
  const expiresAt = Date.now() + 60 * 60 * 12 * 1000;
  const passwordDigest = createHash("sha256").update(ADMIN_PASSWORD).digest("hex");
  const payload = {
    adminId: null,
    email: ADMIN_EMAIL,
    name: ADMIN_NAME,
    role: "superadmin",
    source: "env",
    expiresAt,
    passwordDigest,
  };
  const serializedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", ADMIN_SESSION_SECRET)
    .update(serializedPayload)
    .digest("hex");

  return `${serializedPayload}.${signature}`;
}

async function setAdminSessionCookie(cdp) {
  const { success } = await cdp.send("Network.setCookie", {
    name: "orbe-admin-session",
    value: createAdminSessionCookie(),
    url: BASE_URL,
    httpOnly: true,
    secure: false,
    sameSite: "Lax",
    path: "/",
  });

  assert(success, "Nao foi possivel configurar o cookie da sessao admin.");
}

async function collectLayoutMetrics(cdp) {
  return call(cdp, () => {
    const aside = document.querySelector("aside");
    const header = document.querySelector("header");
    const statCards = document.querySelectorAll("article").length;
    const actionButtons = [...document.querySelectorAll("a,button")]
      .map((entry) => (entry.textContent || "").trim())
      .filter(Boolean)
      .slice(0, 20);
    const maxTextLength = Math.max(
      ...[...document.querySelectorAll("body *")]
        .map((el) => (el.textContent || "").trim().length)
        .filter(Boolean),
      0
    );

    return {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      asideWidth: aside ? Math.round(aside.getBoundingClientRect().width) : null,
      headerWidth: header ? Math.round(header.getBoundingClientRect().width) : null,
      statCards,
      actionButtons,
      maxTextLength,
      bodyTextSample: document.body.innerText.slice(0, 800),
    };
  });
}

async function gatherPageSummary(cdp, route) {
  cdp.currentRoute = route;
  await navigate(cdp, `${BASE_URL}${route}`);
  return call(cdp, () => {
    const title =
      document.querySelector("h1,h2")?.textContent?.trim() ??
      document.title ??
      null;
    const text = document.body.innerText;
    return {
      title,
      textSample: text.slice(0, 1000),
      hasForm: Boolean(document.querySelector("form")),
      hasTable: Boolean(document.querySelector("table")),
      hasButtons: document.querySelectorAll("button").length,
      hasLinks: document.querySelectorAll("a").length,
    };
  });
}

async function main() {
  assert(ADMIN_PASSWORD, "ADMIN_PASSWORD nao configurado.");

  const report = {
    baseUrl: BASE_URL,
    timestamp: new Date().toISOString(),
    login: null,
    viewports: {},
    routes: {},
    fakeContentHits: [],
    consoleMessages: [],
    exceptions: [],
    failedRequests: [],
    httpErrors: [],
    screenshots: {},
  };

  const { browser, userDataDir, wsUrl } = await createBrowser();
  const cdp = new CdpClient(wsUrl);

  try {
    await cdp.connect();
    await setupPage(cdp);
    await setAdminSessionCookie(cdp);

    await setViewport(cdp, 1366, 768, false);
    await navigate(cdp, `${BASE_URL}/admin`);
    await waitForText(cdp, "Dashboard operacional", 15000);
    report.login = { ok: true, url: await evaluate(cdp, "location.href"), email: ADMIN_EMAIL };

    const viewportChecks = [
      ["1366x768", 1366, 768, false],
      ["mobile", 390, 844, true],
    ];

    for (const [label, width, height, mobile] of viewportChecks) {
      await setViewport(cdp, width, height, mobile);
      cdp.currentRoute = `/admin@${label}`;
      await navigate(cdp, `${BASE_URL}/admin`);
      report.viewports[label] = await collectLayoutMetrics(cdp);
    }

    await setViewport(cdp, 1366, 768, false);
    report.screenshots.dashboard1366 = await screenshot(cdp, "dashboard-1366");
    await setViewport(cdp, 390, 844, true);
    await navigate(cdp, `${BASE_URL}/admin`);
    report.screenshots.dashboardMobile = await screenshot(cdp, "dashboard-mobile");

    await setViewport(cdp, 1366, 768, false);
    const targetRoutes = [
      "/admin",
      "/admin/kanban",
      "/admin/orders",
      "/admin/campaigns",
      "/admin/uploads",
      "/admin/contacts",
      "/admin/newsletter",
      "/admin/leads",
    ];

    for (const route of targetRoutes) {
      report.routes[route] = await gatherPageSummary(cdp, route);
    }

    cdp.currentRoute = "/admin/kanban";
    await navigate(cdp, `${BASE_URL}/admin/kanban`);
    report.screenshots.kanban1366 = await screenshot(cdp, "kanban-1366");

    const fakeTerms = ["seed", "demo", "fake", "teste", "homolog", "mock"];
    for (const [route, summary] of Object.entries(report.routes)) {
      const haystack = `${summary.title ?? ""}\n${summary.textSample ?? ""}`.toLowerCase();
      for (const term of fakeTerms) {
        if (haystack.includes(term)) {
          report.fakeContentHits.push({ route, term });
        }
      }
    }

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
