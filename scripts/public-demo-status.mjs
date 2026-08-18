import { readdir, readFile, stat } from "node:fs/promises";

const watchedSources = [
  "apps/web/src",
  "apps/admin/src",
  "apps/api/src",
  "packages/contracts/src",
  "packages/design-system/src",
];

async function latestModifiedAt(path) {
  const details = await stat(path).catch(() => null);
  if (!details) return 0;
  if (!details.isDirectory()) return details.mtimeMs;

  const entries = await readdir(path, { withFileTypes: true });
  const modifiedTimes = await Promise.all(
    entries.map((entry) => latestModifiedAt(`${path}/${entry.name}`)),
  );
  return Math.max(details.mtimeMs, ...modifiedTimes);
}

async function request(url, options = {}) {
  try {
    return await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(2_000),
      ...options,
    });
  } catch {
    return null;
  }
}

const tunnelsResponse = await request("http://127.0.0.1:4040/api/tunnels");
const tunnels = tunnelsResponse?.ok
  ? await tunnelsResponse.json().catch(() => null)
  : null;
const tunnel = tunnels?.tunnels?.find((item) => item.proto === "https");

if (!tunnel?.public_url) {
  console.error("Demonstracao publica inativa. Execute: npm run demo:public");
  process.exitCode = 1;
} else {
  const publicUrl = tunnel.public_url.replace(/\/$/, "");
  const runtime = await readFile(".runtime/public-demo.json", "utf8")
    .then(JSON.parse)
    .catch(() => null);
  const adminPath =
    runtime?.publicUrl === publicUrl && typeof runtime?.adminPath === "string"
      ? runtime.adminPath
      : "";
  const headers = { "ngrok-skip-browser-warning": "bespoke-status" };
  const [preview, adminPreview, api, publicHealth, publicAdmin] =
    await Promise.all([
      request("http://127.0.0.1:4173"),
      adminPath ? request(`http://127.0.0.1:4174${adminPath}/`) : null,
      request("http://127.0.0.1:3334/health/ready"),
      request(`${publicUrl}/health/ready`, { headers }),
      adminPath ? request(`${publicUrl}${adminPath}/`, { headers }) : null,
    ]);
  const status = (response) =>
    response?.status && response.status >= 200 && response.status < 400
      ? "ok"
      : "indisponivel";
  const sourceModifiedAt = Math.max(
    ...(await Promise.all(watchedSources.map(latestModifiedAt))),
  );
  const buildTimestamp = Date.parse(runtime?.builtAt ?? "");
  const currentBuild =
    Number.isFinite(buildTimestamp) && buildTimestamp >= sourceModifiedAt;

  console.log(`Loja publica: ${publicUrl}`);
  console.log(
    adminPath
      ? `Painel temporario: ${publicUrl}${adminPath}/`
      : "Painel temporario: indisponivel",
  );
  console.log(`Webhook Mercado Pago: ${publicUrl}/api/webhooks/mercado-pago`);
  console.log(`Vitrine local: ${status(preview)}`);
  console.log(`Painel local temporario: ${status(adminPreview)}`);
  console.log(`API da demonstracao: ${status(api)}`);
  console.log(`Endereco publico: ${status(publicHealth)}`);
  console.log(`Painel publico: ${status(publicAdmin)}`);
  console.log(
    `Build publico: ${
      currentBuild
        ? "atualizado"
        : "desatualizado - reinicie npm run demo:public"
    }`,
  );
  if (!currentBuild) process.exitCode = 1;
}
