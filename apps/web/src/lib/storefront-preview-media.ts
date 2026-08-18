import { useEffect, useState } from "react";

const ngrokHosts = [/\.ngrok-free\.dev$/i, /\.ngrok\.app$/i];
const managedUploadPath =
  /^\/uploads\/images\/[0-9a-f-]{36}\.(?:png|jpe?g|webp)$/i;
const previewMediaHeader = "bespoke-storefront-preview-media";
const mediaCache = new Map<string, Promise<string>>();
const objectUrls = new Set<string>();
let cleanupRegistered = false;

type PreviewMediaState = {
  error: boolean;
  loading: boolean;
  url: string;
};

function currentBrowserUrl() {
  return typeof document === "undefined"
    ? ""
    : document.baseURI || window.location.href;
}

export function resolveStorefrontMediaUrl(
  source: string,
  browserUrl = currentBrowserUrl(),
) {
  if (!source || !browserUrl) return source;

  try {
    const mediaUrl = new URL(source, browserUrl);
    if (!managedUploadPath.test(mediaUrl.pathname)) return source;

    const browser = new URL(browserUrl);
    return new URL(
      `${mediaUrl.pathname}${mediaUrl.search}${mediaUrl.hash}`,
      browser.origin,
    ).toString();
  } catch {
    return source;
  }
}

function isEmbeddedStorefrontPreview() {
  return Boolean(
    (
      window as typeof window & {
        __BESPOKE_EMBEDDED_STOREFRONT_PREVIEW__?: boolean;
      }
    ).__BESPOKE_EMBEDDED_STOREFRONT_PREVIEW__,
  );
}

export function shouldProxyStorefrontPreviewMedia(
  source: string,
  browserUrl = currentBrowserUrl(),
  embedded =
    typeof window === "undefined" ? false : isEmbeddedStorefrontPreview(),
) {
  if (!source || !browserUrl || !embedded) return false;

  try {
    const mediaUrl = new URL(source, browserUrl);
    const browser = new URL(browserUrl);
    return (
      mediaUrl.origin === browser.origin &&
      ngrokHosts.some((pattern) => pattern.test(mediaUrl.hostname)) &&
      managedUploadPath.test(mediaUrl.pathname)
    );
  } catch {
    return false;
  }
}

export async function fetchStorefrontPreviewMedia(
  source: string,
  fetcher: typeof fetch = fetch,
) {
  const response = await fetcher(source, {
    // The Admin renders the same uploads before mounting the storefront preview.
    // Chrome Android can cache that <img> response as opaque, which makes a
    // later credentialed fetch unreadable and leaves the preview without media.
    cache: "no-store",
    credentials: "include",
    headers: {
      accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      "ngrok-skip-browser-warning": previewMediaHeader,
    },
  });
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

  if (!response.ok || !contentType.startsWith("image/")) {
    throw new Error("STOREFRONT_PREVIEW_MEDIA_INVALID");
  }

  return response.blob();
}

function registerObjectUrlCleanup() {
  if (cleanupRegistered || typeof window === "undefined") return;
  cleanupRegistered = true;
  window.addEventListener(
    "pagehide",
    () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.clear();
      mediaCache.clear();
    },
    { once: true },
  );
}

function loadStorefrontPreviewMedia(source: string) {
  const cached = mediaCache.get(source);
  if (cached) return cached;

  const request = fetchStorefrontPreviewMedia(source)
    .then((blob) => {
      const objectUrl = URL.createObjectURL(blob);
      objectUrls.add(objectUrl);
      registerObjectUrlCleanup();
      return objectUrl;
    })
    .catch((error) => {
      mediaCache.delete(source);
      throw error;
    });
  mediaCache.set(source, request);
  return request;
}

function initialState(source: string): PreviewMediaState {
  const resolvedSource = resolveStorefrontMediaUrl(source);
  const proxied = shouldProxyStorefrontPreviewMedia(resolvedSource);
  return {
    error: false,
    loading: proxied,
    url: proxied ? "" : resolvedSource,
  };
}

export function useStorefrontPreviewMedia(source: string) {
  const [state, setState] = useState<PreviewMediaState>(() =>
    initialState(source),
  );

  useEffect(() => {
    const resolvedSource = resolveStorefrontMediaUrl(source);
    if (!shouldProxyStorefrontPreviewMedia(resolvedSource)) {
      setState({ error: false, loading: false, url: resolvedSource });
      return;
    }

    let active = true;
    setState({ error: false, loading: true, url: "" });
    void loadStorefrontPreviewMedia(resolvedSource)
      .then((url) => {
        if (active) setState({ error: false, loading: false, url });
      })
      .catch(() => {
        if (active) setState({ error: true, loading: false, url: "" });
      });

    return () => {
      active = false;
    };
  }, [source]);

  return state;
}
