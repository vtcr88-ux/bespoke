const defaultApiBaseUrl = "http://localhost:3333";
const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const managedUploadPath =
  /^\/uploads\/images\/[0-9a-f-]{36}\.(?:png|jpg|webp)$/i;

export function resolveAdminApiBaseUrl(
  configuredUrl: string | undefined,
  browserUrl: string | undefined,
) {
  const configured = configuredUrl?.trim() || defaultApiBaseUrl;
  const apiUrl = browserUrl
    ? new URL(configured, browserUrl)
    : new URL(configured, defaultApiBaseUrl);

  if (browserUrl) {
    const browser = new URL(browserUrl);
    if (
      loopbackHosts.has(apiUrl.hostname) &&
      loopbackHosts.has(browser.hostname)
    ) {
      apiUrl.hostname = browser.hostname;
    }
  }

  return apiUrl.toString().replace(/\/$/, "");
}

export function resolveAdminMediaUrl(mediaUrl: string, apiBaseUrl: string) {
  if (!mediaUrl) return mediaUrl;

  try {
    const candidate = new URL(mediaUrl, apiBaseUrl);
    if (!managedUploadPath.test(candidate.pathname)) return mediaUrl;

    const resolved = new URL(candidate.pathname, apiBaseUrl);
    resolved.search = candidate.search;
    resolved.hash = "";
    return resolved.toString();
  } catch {
    return mediaUrl;
  }
}
