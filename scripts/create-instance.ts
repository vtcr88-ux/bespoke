import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { prepareInstanceTemplate } from "@bespoke/instance-kit";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = namedArgs();
const slug = args.slug ?? "";
const publicDomain = args["public-domain"] ?? "lojadocliente.com.br";
const result = prepareInstanceTemplate(root, {
  slug,
  name: args.name ?? titleFromSlug(slug),
  publicDomain,
  adminDomain: args["admin-domain"] ?? `admin.${publicDomain}`,
  apiDomain: args["api-domain"] ?? `api.${publicDomain}`,
  port: parsePort(args.port),
});

process.stdout.write(
  `Instance template created at instances/${result.slug} using API port ${result.port}.\n`,
);

function titleFromSlug(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function namedArgs() {
  const values: Record<string, string> = {};
  for (const argument of process.argv.slice(2)) {
    if (!argument.startsWith("--")) continue;
    const [key, value] = argument.slice(2).split("=", 2);
    if (key) values[key] = value ?? "";
  }
  return values;
}

function parsePort(value: string | undefined) {
  if (!value) return undefined;
  const port = Number(value);
  if (!Number.isInteger(port)) throw new Error("Use --port with a valid TCP port.");
  return port;
}
