const defaultApiBaseUrl = "http://localhost:3333";
const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

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
