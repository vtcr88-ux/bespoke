import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config, parse } from "dotenv";

export type InstanceCliOptions = {
  envFile?: string;
  instanceId?: string;
};

export function parseInstanceCliOptions(
  argv = process.argv.slice(2),
): InstanceCliOptions {
  const options: InstanceCliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument) continue;

    if (argument.startsWith("--instance=")) {
      options.instanceId = argument.slice("--instance=".length);
      continue;
    }
    if (argument === "--instance") {
      const value = argv[index + 1];
      if (!value) throw new Error("Use --instance <instance-id>.");
      options.instanceId = value;
      index += 1;
      continue;
    }
    if (argument.startsWith("--env-file=")) {
      options.envFile = argument.slice("--env-file=".length);
      continue;
    }
    if (argument === "--env-file") {
      const value = argv[index + 1];
      if (!value) throw new Error("Use --env-file <path>.");
      options.envFile = value;
      index += 1;
    }
  }

  if (options.instanceId) assertInstanceId(options.instanceId);
  if (options.instanceId && options.envFile) {
    throw new Error("Use --instance or --env-file, not both.");
  }
  if (options.instanceId && process.env.ENV_FILE) {
    throw new Error("Use --instance or ENV_FILE, not both.");
  }

  return options;
}

export function assertInstanceId(value: string) {
  if (!/^[a-z0-9][a-z0-9-]{2,62}$/.test(value)) {
    throw new Error(
      "Instance id must use lowercase letters, numbers and hyphens.",
    );
  }
}

export function resolveInstanceEnvFile(
  root: string,
  options: InstanceCliOptions,
  fallbackRelativePath?: string,
) {
  if (options.envFile) return resolve(options.envFile);
  if (process.env.ENV_FILE) return resolve(process.env.ENV_FILE);
  if (options.instanceId) {
    return resolve(root, "instances", options.instanceId, ".env");
  }
  return fallbackRelativePath ? resolve(root, fallbackRelativePath) : "";
}

export function loadApiEnvironment(root: string, options: InstanceCliOptions) {
  const explicit = Boolean(
    options.envFile || process.env.ENV_FILE || options.instanceId,
  );
  const envFile = resolveInstanceEnvFile(
    root,
    options,
    "apps/api/.env.production",
  );

  if (explicit && !existsSync(envFile)) {
    throw new Error(`Instance environment file not found: ${envFile}`);
  }

  config({ path: envFile });
  if (!explicit) config({ path: resolve(root, "apps/api/.env") });
  if (explicit) process.env.ENV_FILE = envFile;
  return envFile;
}

export function readInstanceEnvironmentFile(
  root: string,
  options: InstanceCliOptions,
) {
  const envFile = resolveInstanceEnvFile(root, options);
  if (!envFile) throw new Error("Use --instance, --env-file or ENV_FILE.");
  if (!existsSync(envFile)) {
    throw new Error(`Instance environment file not found: ${envFile}`);
  }
  return {
    envFile,
    values: parse(readFileSync(envFile, "utf8")),
  };
}
