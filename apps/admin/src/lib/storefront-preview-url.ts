const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const temporaryAdminPath = /^\/painel-[A-Za-z0-9_-]{24,}(?:\/|$)/;

function parsedUrl(value: string | undefined, baseUrl: URL) {
  const candidate = value?.trim();
  if (!candidate) return null;

  try {
    return new URL(candidate, baseUrl);
  } catch {
    return null;
  }
}

function isLoopback(url: URL) {
  return loopbackHosts.has(url.hostname);
}

export function resolveStorefrontPreviewUrl(
  publicWebUrl: string | undefined,
  configuredUrl: string | undefined,
  browserUrl: string,
) {
  const browser = new URL(browserUrl);
  const localAdmin = isLoopback(browser);
  const runtime = parsedUrl(publicWebUrl, browser);
  const configured = parsedUrl(configuredUrl, browser);
  let previewUrl: URL | null = null;

  if (localAdmin) {
    previewUrl = runtime && isLoopback(runtime) ? runtime : null;
    previewUrl ??= configured && isLoopback(configured) ? configured : null;
    previewUrl ??= new URL(browser.origin);
    previewUrl.port = "5173";
  } else {
    // The authenticated runtime value belongs to the active store instance and
    // must win over a build-time fallback that may point to another environment.
    previewUrl = runtime && !isLoopback(runtime) ? runtime : null;
    previewUrl ??= configured && !isLoopback(configured) ? configured : null;

    // The temporary ngrok demo serves Admin and Storefront on the same origin.
    if (!previewUrl && temporaryAdminPath.test(browser.pathname)) {
      previewUrl = new URL(browser.origin);
    }
  }

  if (!previewUrl) return null;

  previewUrl.searchParams.set("storefront-preview", "admin");
  return previewUrl.toString();
}
