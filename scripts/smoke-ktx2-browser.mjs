import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import process from "node:process";
import { chromium } from "playwright";

const HOST = "127.0.0.1";
const PORT = 4173;
const BASE_URL = `http://${HOST}:${PORT}`;
const SERVER_TIMEOUT_MS = 30_000;
const READY_TIMEOUT_MS = 30_000;
const expectMeshopt = process.env.SHOWCASE_EXPECT_MESHOPT === "1";
const meshoptSuffix = expectMeshopt ? "-meshopt" : "";
const screenshotDir = process.env.SHOWCASE_SCREENSHOT_DIR
  ? resolve(process.cwd(), process.env.SHOWCASE_SCREENSHOT_DIR)
  : undefined;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function commandName() {
  return process.platform === "win32" ? "pnpm.cmd" : "pnpm";
}

async function waitForServer(server, logTail) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < SERVER_TIMEOUT_MS) {
    if (server.exitCode !== null) {
      throw new Error(
        `Next server exited before becoming ready (code ${server.exitCode}).\n${logTail()}`,
      );
    }

    try {
      const response = await fetch(BASE_URL, { redirect: "manual" });
      if (response.status >= 200 && response.status < 500) return;
    } catch {
      // Server is not accepting connections yet.
    }

    await delay(250);
  }

  throw new Error(`Next server did not become ready within ${SERVER_TIMEOUT_MS}ms.\n${logTail()}`);
}

function signalServerTree(server, signal) {
  if (!server.pid) return;

  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(server.pid), "/t", signal === "SIGKILL" ? "/f" : ""].filter(Boolean), {
      stdio: "ignore",
    });
    return;
  }

  try {
    process.kill(-server.pid, signal);
  } catch {
    server.kill(signal);
  }
}

async function stopServer(server) {
  if (server.exitCode !== null) return;

  signalServerTree(server, "SIGTERM");

  await Promise.race([
    new Promise((resolve) => server.once("exit", resolve)),
    delay(5_000).then(() => {
      if (server.exitCode === null) signalServerTree(server, "SIGKILL");
    }),
  ]);
}

function relevantUrl(url) {
  return url.includes("/models/") || url.includes("/basis/");
}

async function runSmokeCase(browser, {
  label,
  viewport,
  expectedModel,
  forbiddenModel,
  requireBasisTranscoder,
}) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const responses = [];
  const requestFailures = [];
  const pageErrors = [];
  const consoleErrors = [];

  page.on("response", (response) => {
    if (relevantUrl(response.url())) {
      responses.push({
        url: response.url(),
        status: response.status(),
      });
    }
  });

  page.on("requestfailed", (request) => {
    if (relevantUrl(request.url())) {
      requestFailures.push(
        `${request.url()} :: ${request.failure()?.errorText ?? "unknown request failure"}`,
      );
    }
  });

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  try {
    const navigation = await page.goto(BASE_URL, {
      waitUntil: "domcontentloaded",
      timeout: READY_TIMEOUT_MS,
    });
    assert(navigation?.ok(), `${label}: initial navigation failed with HTTP ${navigation?.status()}`);

    await page.waitForSelector('.stage-status[data-status="ready"]', {
      timeout: READY_TIMEOUT_MS,
    });

    assert(
      await page.locator("canvas").count() > 0,
      `${label}: showcase reached ready without a canvas`,
    );

    const modelResponses = responses.filter((entry) => entry.url.includes("/models/"));
    const basisResponses = responses.filter((entry) => entry.url.includes("/basis/"));

    assert(
      modelResponses.some(
        (entry) => entry.url.includes(expectedModel) && entry.status >= 200 && entry.status < 400,
      ),
      `${label}: expected model '${expectedModel}' was not loaded successfully. Saw: ${JSON.stringify(modelResponses)}`,
    );

    if (forbiddenModel) {
      assert(
        !modelResponses.some((entry) => entry.url.includes(forbiddenModel)),
        `${label}: forbidden model '${forbiddenModel}' was requested. Saw: ${JSON.stringify(modelResponses)}`,
      );
    }

    if (requireBasisTranscoder) {
      assert(
        basisResponses.some(
          (entry) =>
            entry.url.includes("basis_transcoder.wasm") &&
            entry.status >= 200 &&
            entry.status < 400,
        ),
        `${label}: Basis transcoder WASM was not loaded successfully. Saw: ${JSON.stringify(basisResponses)}`,
      );
    }

    assert(
      requestFailures.length === 0,
      `${label}: model/Basis request failures: ${requestFailures.join(" | ")}`,
    );
    assert(pageErrors.length === 0, `${label}: page errors: ${pageErrors.join(" | ")}`);

    const statusText = await page.locator(".stage-status").innerText();
    assert(
      !statusText.toLowerCase().includes("error"),
      `${label}: stage reported an error: ${statusText}`,
    );

    if (screenshotDir) {
      await mkdir(screenshotDir, { recursive: true });
      const fileName = `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.png`;
      await page.screenshot({
        path: resolve(screenshotDir, fileName),
        fullPage: true,
      });
    }

    console.log(
      `✓ ${label} | model=${expectedModel} | basis=${requireBasisTranscoder ? "decoded" : "not-required"} | ready`,
    );

    if (consoleErrors.length > 0) {
      console.log(
        `  browser console errors observed (non-fatal because runtime reached ready): ${consoleErrors.join(" | ")}`,
      );
    }
  } finally {
    await context.close();
  }
}

const serverLogs = [];
const server = spawn(
  commandName(),
  ["--filter", "@showcase/web", "exec", "next", "start", "-H", HOST, "-p", String(PORT)],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "production",
    },
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32",
  },
);

for (const stream of [server.stdout, server.stderr]) {
  stream?.on("data", (chunk) => {
    const text = chunk.toString();
    serverLogs.push(text);
    if (serverLogs.length > 100) serverLogs.shift();
    process.stdout.write(text);
  });
}

const logTail = () => serverLogs.slice(-30).join("");

let browser;

try {
  await waitForServer(server, logTail);

  browser = await chromium.launch({
    headless: true,
    timeout: 30_000,
    ...(process.env.PLAYWRIGHT_BROWSER_CHANNEL
      ? { channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL }
      : {}),
    args: [
      "--use-angle=swiftshader",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
    ],
  });

  await runSmokeCase(browser, {
    label: expectMeshopt
      ? "desktop KTX2 + Meshopt browser decode"
      : "desktop KTX2 browser decode",
    viewport: { width: 1440, height: 900 },
    expectedModel: `/models/astra-one-touring-lod0-ktx2${meshoptSuffix}.glb`,
    forbiddenModel: expectMeshopt
      ? "/models/astra-one-touring-lod0-ktx2.glb"
      : "/models/astra-one-touring-lod0.glb",
    requireBasisTranscoder: true,
  });

  await runSmokeCase(browser, {
    label: expectMeshopt
      ? "mobile PNG + Meshopt delivery"
      : "mobile adaptive PNG delivery",
    viewport: { width: 390, height: 844 },
    expectedModel: `/models/astra-one-touring-lod2${meshoptSuffix}.glb`,
    forbiddenModel: expectMeshopt
      ? "/models/astra-one-touring-lod2.glb"
      : "/models/astra-one-touring-lod2-ktx2.glb",
    requireBasisTranscoder: false,
  });

  console.log(
    expectMeshopt
      ? "Validated browser runtime delivery for KTX2/PNG texture policy with Meshopt geometry."
      : "Validated browser runtime delivery for desktop KTX2 and mobile PNG LOD2.",
  );
} finally {
  await browser?.close();
  await stopServer(server);
}
