import { isAbsolute, resolve } from "node:path";
import type { AppEnv } from "./env.js";

type UploadsEnvironment = Pick<
  AppEnv,
  "INSTANCE_ID" | "NODE_ENV" | "UPLOADS_DIR"
>;

export function resolveUploadsRoot(
  env: UploadsEnvironment,
  repoRoot: string,
  platform: NodeJS.Platform = process.platform,
) {
  const configured = env.UPLOADS_DIR?.trim();
  const localRoot = resolve(repoRoot, "storage", env.INSTANCE_ID, "uploads");

  // A Linux production mount (for example /var/lib/...) resolves inside C:\var
  // on Windows. During native development, keep uploads in the documented,
  // persistent repository storage instead of silently serving that empty path.
  if (
    env.NODE_ENV === "development" &&
    platform === "win32" &&
    configured?.startsWith("/")
  ) {
    return localRoot;
  }

  if (configured) {
    return isAbsolute(configured) ? configured : resolve(repoRoot, configured);
  }

  return env.NODE_ENV === "development"
    ? localRoot
    : resolve(repoRoot, "apps/api/storage/uploads");
}
