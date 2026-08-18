import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const root = process.cwd();
const npmCli =
  process.env.npm_execpath ??
  resolve(dirname(process.execPath), "node_modules/npm/bin/npm-cli.js");
const children = new Set();
let closing = false;
let preview = null;
let adminPreview = null;
let tunnel = null;
let api = null;
let publicUrl = "";
let builtAt = "";
const runtimeDirectory = resolve(root, ".runtime");
const runtimeStatusFile = resolve(runtimeDirectory, "public-demo.json");
const runtimeAdminPathFile = resolve(
  runtimeDirectory,
  "public-demo-admin-path.txt",
);

function validAdminPath(value) {
  const segment = value.trim().replace(/^\/+|\/+$/g, "");
  return /^painel-[A-Za-z0-9_-]{24,}$/.test(segment) ? `/${segment}` : null;
}

async function createAdminPath() {
  const configured = process.env.BESPOKE_ADMIN_DEMO_PATH?.trim();
  if (configured) {
    const path = validAdminPath(configured);
    if (!path) {
      throw new Error(
        "BESPOKE_ADMIN_DEMO_PATH deve iniciar com painel- e conter pelo menos 24 caracteres aleatorios.",
      );
    }
    await persistAdminPath(path);
    return path;
  }

  const persisted = await readFile(runtimeAdminPathFile, "utf8")
    .then(validAdminPath)
    .catch(() => null);
  if (persisted) return persisted;

  const generated = `/painel-${randomBytes(18).toString("base64url")}`;
  await persistAdminPath(generated);
  return generated;
}

async function persistAdminPath(path) {
  await mkdir(runtimeDirectory, { recursive: true });
  await writeFile(runtimeAdminPathFile, `${path}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
}

const adminPath = await createAdminPath();
let consecutivePublicFailures = 0;
let lastPublicHealthCheckAt = 0;

const supervisorIntervalMs = 10_000;
const publicHealthIntervalMs = 5 * 60_000;
const publicFailureLimit = 2;

function child(command, args, options = {}) {
  const processHandle = spawn(command, args, {
    cwd: root,
    env: { ...process.env, ...options.env },
    stdio: options.stdio ?? "inherit",
    windowsHide: true,
  });
  children.add(processHandle);
  processHandle.once("exit", () => children.delete(processHandle));
  return processHandle;
}

function npm(args, options = {}) {
  return child(process.execPath, [npmCli, ...args], options);
}

async function waitFor(url, label, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, {
        redirect: "manual",
        headers: { "ngrok-skip-browser-warning": "bespoke-health-check" },
        signal: AbortSignal.timeout(Math.min(5_000, deadline - Date.now())),
      });
      if (response.status >= 200 && response.status < 400) return response;
    } catch {
      // The service is still starting.
    }
    await delay(500);
  }
  throw new Error(`${label} nao iniciou dentro do tempo esperado.`);
}

async function healthy(url) {
  try {
    const response = await fetch(url, {
      redirect: "manual",
      headers: { "ngrok-skip-browser-warning": "bespoke-health-check" },
      signal: AbortSignal.timeout(5_000),
    });
    return response.status >= 200 && response.status < 400;
  } catch {
    return false;
  }
}

async function activeNgrokTunnel() {
  try {
    const response = await fetch("http://127.0.0.1:4040/api/tunnels", {
      signal: AbortSignal.timeout(2_000),
    });
    if (!response.ok) return null;
    const payload = await response.json().catch(() => null);
    return payload?.tunnels?.find((tunnel) => tunnel.proto === "https") ?? null;
  } catch {
    return null;
  }
}

async function waitForNgrok(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const tunnel = await activeNgrokTunnel();
    if (tunnel?.public_url) return tunnel.public_url.replace(/\/$/, "");
    await delay(500);
  }
  throw new Error("O ngrok nao disponibilizou uma URL HTTPS.");
}

function processRunning(processHandle) {
  return Boolean(processHandle?.pid && processHandle.exitCode === null);
}

async function stopChild(processHandle) {
  if (!processHandle?.pid || processHandle.exitCode !== null) return;
  if (process.platform === "win32") {
    await new Promise((resolve) => {
      const killer = spawn(
        "taskkill",
        ["/PID", String(processHandle.pid), "/T", "/F"],
        { stdio: "ignore", windowsHide: true },
      );
      killer.once("exit", resolve);
      killer.once("error", resolve);
    });
    return;
  }
  processHandle.kill("SIGTERM");
}

async function shutdown(exitCode = 0) {
  if (closing) return;
  closing = true;
  await Promise.all([...children].map(stopChild));
  await rm(runtimeStatusFile, { force: true }).catch(() => undefined);
  process.exitCode = exitCode;
}

function startPreview() {
  return npm(
    [
      "--workspace",
      "@bespoke/web",
      "exec",
      "--",
      "vite",
      "preview",
      "--mode",
      "demo",
      "--host",
      "127.0.0.1",
      "--port",
      "4173",
      "--strictPort",
    ],
    { env: { BESPOKE_ADMIN_DEMO_PATH: adminPath } },
  );
}

function startAdminPreview() {
  return npm(
    [
      "--workspace",
      "@bespoke/admin",
      "exec",
      "--",
      "vite",
      "preview",
      "--mode",
      "demo",
      "--host",
      "127.0.0.1",
      "--port",
      "4174",
      "--strictPort",
    ],
    { env: { VITE_ADMIN_BASE_PATH: adminPath } },
  );
}

function startTunnel() {
  return npm([
    "exec",
    "--",
    "ngrok",
    "http",
    "4173",
    "--traffic-policy-file",
    "infra/ngrok/public-storefront.yml",
  ]);
}

function startApi(url) {
  return child(process.execPath, [resolve(root, "apps/api/dist/server.js")], {
    env: {
      ENV_FILE: resolve(root, "apps/api/.env"),
      PORT: "3334",
      PUBLIC_API_URL: `${url}/api`,
      PUBLIC_WEB_URL: url,
      CORS_ORIGINS: [
        url,
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
      ].join(","),
    },
  });
}

function printAddresses(reason = "Demonstracao pronta") {
  console.log("");
  console.log(reason);
  console.log(`Loja publica: ${publicUrl}`);
  console.log(`Painel temporario: ${publicUrl}${adminPath}/`);
  console.log(`Webhook Mercado Pago: ${publicUrl}/api/webhooks/mercado-pago`);
  console.log("O painel continua protegido pelo login administrativo.");
  console.log("Nao compartilhe o endereco temporario do painel.");
  console.log(
    "Mantenha este terminal e o computador ativos. Pressione Ctrl+C para encerrar.",
  );
}

async function writeRuntimeStatus() {
  await mkdir(runtimeDirectory, { recursive: true });
  await writeFile(
    runtimeStatusFile,
    `${JSON.stringify(
      {
        publicUrl,
        adminPath,
        builtAt,
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
}

async function verifyPublicBundle() {
  const assetsDirectory = resolve(root, "apps/web/dist-demo/assets");
  const assetNames = await readdir(assetsDirectory);
  const javascriptAssets = assetNames.filter((name) => name.endsWith(".js"));
  if (javascriptAssets.length === 0) {
    throw new Error("O build publico nao gerou um arquivo JavaScript.");
  }

  const localApiPattern = /https?:\/\/(?:localhost|127\.0\.0\.1):3333\b/i;
  const requiredCheckoutFeatures = [
    "/checkout/payment-methods",
    "/checkout/pix",
  ];
  const checkoutFeatures = new Set();
  for (const assetName of javascriptAssets) {
    const source = await readFile(resolve(assetsDirectory, assetName), "utf8");
    for (const feature of requiredCheckoutFeatures) {
      if (source.includes(feature)) checkoutFeatures.add(feature);
    }
    if (localApiPattern.test(source)) {
      throw new Error(
        "O build publico tentou usar uma API local. A demonstracao foi interrompida antes de abrir o tunel.",
      );
    }
  }
  const missingCheckoutFeatures = requiredCheckoutFeatures.filter(
    (feature) => !checkoutFeatures.has(feature),
  );
  if (missingCheckoutFeatures.length > 0) {
    throw new Error(
      `O build publico nao incluiu o checkout atual: ${missingCheckoutFeatures.join(", ")}.`,
    );
  }
}

async function verifyAdminBundle() {
  const assetsDirectory = resolve(root, "apps/admin/dist-demo/assets");
  const assetNames = await readdir(assetsDirectory);
  const javascriptAssets = assetNames.filter((name) => name.endsWith(".js"));
  if (javascriptAssets.length === 0) {
    throw new Error("O build temporario do Admin nao gerou JavaScript.");
  }

  const expectedApiPath = `${adminPath}/api`;
  const localStorefrontPattern =
    /https?:\/\/(?:localhost|127\.0\.0\.1):5173\b/i;
  let usesExpectedApiPath = false;
  for (const assetName of javascriptAssets) {
    const source = await readFile(resolve(assetsDirectory, assetName), "utf8");
    usesExpectedApiPath ||= source.includes(expectedApiPath);
    if (localStorefrontPattern.test(source)) {
      throw new Error(
        "O build temporario do Admin tentou usar a vitrine local. O preview remoto nao funcionaria em celulares.",
      );
    }
  }
  const html = await readFile(
    resolve(root, "apps/admin/dist-demo/index.html"),
    "utf8",
  );
  if (!usesExpectedApiPath || !html.includes(`${adminPath}/assets/`)) {
    throw new Error(
      "O Admin temporario nao foi compilado com o caminho secreto. O tunel nao foi aberto.",
    );
  }
}

async function restartApi() {
  if (processRunning(api)) await stopChild(api);
  api = startApi(publicUrl);
  await waitFor("http://127.0.0.1:3334/health/ready", "A API da demonstracao");
}

async function restartTunnel() {
  if (processRunning(tunnel)) await stopChild(tunnel);
  tunnel = startTunnel();
  const nextPublicUrl = await waitForNgrok(60_000);
  const urlChanged = publicUrl !== nextPublicUrl;
  publicUrl = nextPublicUrl;
  consecutivePublicFailures = 0;
  lastPublicHealthCheckAt = Date.now();
  if (urlChanged || !processRunning(api)) await restartApi();
  await waitFor(`${publicUrl}/health/ready`, "O endereco publico", 60_000);
  await waitFor(`${publicUrl}${adminPath}/`, "O painel temporario", 60_000);
  await writeRuntimeStatus();
  printAddresses("Tunel publico recuperado");
}

async function supervise() {
  while (!closing) {
    await delay(supervisorIntervalMs);
    if (closing) return;

    try {
      if (!processRunning(preview)) {
        console.warn("A vitrine local parou. Reiniciando...");
        preview = startPreview();
        await waitFor("http://127.0.0.1:4173", "A vitrine publica");
      }

      if (!processRunning(adminPreview)) {
        console.warn("O painel temporario parou. Reiniciando...");
        adminPreview = startAdminPreview();
        await waitFor(
          `http://127.0.0.1:4174${adminPath}/`,
          "O painel temporario",
        );
      }

      if (!processRunning(tunnel) || !(await activeNgrokTunnel())) {
        console.warn("O agente ngrok parou. Reiniciando o tunel...");
        await restartTunnel();
        continue;
      }

      if (!processRunning(api)) {
        console.warn("A API da demonstracao parou. Reiniciando...");
        await restartApi();
      }

      const localHealth = await healthy("http://127.0.0.1:3334/health/ready");
      if (!localHealth) {
        console.warn("A API local deixou de responder. Reiniciando...");
        await restartApi();
      }

      if (Date.now() - lastPublicHealthCheckAt < publicHealthIntervalMs) {
        continue;
      }
      lastPublicHealthCheckAt = Date.now();
      const publicHealth = await healthy(`${publicUrl}/health/ready`);
      if (!publicHealth) {
        consecutivePublicFailures += 1;
        console.warn(
          `O endereco publico nao respondeu (${consecutivePublicFailures}/${publicFailureLimit}).`,
        );
        if (consecutivePublicFailures >= publicFailureLimit) {
          console.warn("Recriando o tunel apos falhas consecutivas...");
          await restartTunnel();
        }
      } else {
        consecutivePublicFailures = 0;
      }
    } catch (error) {
      console.error(
        error instanceof Error
          ? `Falha de recuperacao: ${error.message}`
          : "Falha de recuperacao da demonstracao.",
      );
    }
  }
}

async function main() {
  if (await activeNgrokTunnel()) {
    throw new Error(
      "Ja existe um tunel ngrok ativo. Encerre o terminal do tunel atual e execute npm run demo:public novamente.",
    );
  }

  console.log("Preparando os builds da demonstracao...");
  for (const [label, args] of [
    ["contratos", ["run", "build:contracts"]],
    ["API", ["run", "build:api"]],
  ]) {
    const buildDependency = npm(args);
    const buildDependencyCode = await new Promise((resolve) =>
      buildDependency.once("exit", resolve),
    );
    if (buildDependencyCode !== 0) {
      throw new Error(`O build de ${label} nao foi concluido.`);
    }
  }

  const build = npm(
    ["--workspace", "@bespoke/web", "run", "build", "--", "--mode", "demo"],
    {
      env: {
        VITE_API_BASE_URL: "/api",
        BESPOKE_ADMIN_DEMO_PATH: adminPath,
      },
    },
  );
  const buildCode = await new Promise((resolve) => build.once("exit", resolve));
  if (buildCode !== 0) {
    throw new Error("O build publico nao foi concluido.");
  }
  await verifyPublicBundle();

  const adminBuild = npm(
    ["--workspace", "@bespoke/admin", "run", "build", "--", "--mode", "demo"],
    {
      env: {
        VITE_ADMIN_BASE_PATH: adminPath,
        VITE_API_BASE_URL: `${adminPath}/api`,
      },
    },
  );
  const adminBuildCode = await new Promise((resolve) =>
    adminBuild.once("exit", resolve),
  );
  if (adminBuildCode !== 0) {
    throw new Error("O build temporario do Admin nao foi concluido.");
  }
  await verifyAdminBundle();
  builtAt = new Date().toISOString();

  preview = startPreview();
  await waitFor("http://127.0.0.1:4173", "A vitrine publica");
  adminPreview = startAdminPreview();
  await waitFor(`http://127.0.0.1:4174${adminPath}/`, "O painel temporario");

  tunnel = startTunnel();
  publicUrl = await waitForNgrok();
  await restartApi();
  await waitFor(`${publicUrl}/health/ready`, "O endereco publico");
  await waitFor(
    `${publicUrl}/api/checkout/payment-methods`,
    "As modalidades publicas de pagamento",
  );
  await waitFor(`${publicUrl}${adminPath}/`, "O painel temporario");
  await writeRuntimeStatus();
  printAddresses();
  await supervise();
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => void shutdown());
}

main().catch(async (error) => {
  console.error(
    error instanceof Error ? error.message : "Falha ao iniciar a demonstracao.",
  );
  await shutdown(1);
});
