const ngrokHosts = [/\.ngrok-free\.dev$/i, /\.ngrok\.app$/i];
const previewMarker = "__BESPOKE_EMBEDDED_STOREFRONT_PREVIEW__";

function escapedAttribute(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function shouldEmbedStorefrontPreview(
  previewUrl: string,
  browserUrl: string,
) {
  const preview = new URL(previewUrl);
  const browser = new URL(browserUrl);
  return (
    preview.origin === browser.origin &&
    ngrokHosts.some((pattern) => pattern.test(preview.hostname))
  );
}

export function createStorefrontPreviewDocument(
  source: string,
  previewUrl: string,
) {
  if (!/<div\s+[^>]*id=["']root["'][^>]*>/i.test(source)) {
    throw new Error("STOREFRONT_DOCUMENT_INVALID");
  }
  if (!/<script\s+[^>]*type=["']module["'][^>]*>/i.test(source)) {
    throw new Error("STOREFRONT_BUNDLE_MISSING");
  }

  const target = new URL(previewUrl);
  target.searchParams.set("storefront-preview", "admin");
  const baseUrl = new URL("/", target).toString();
  const serializedTarget = JSON.stringify(target.toString()).replaceAll(
    "<",
    "\\u003c",
  );
  const bootstrap = [
    `<base href="${escapedAttribute(baseUrl)}">`,
    "<script>",
    `window.${previewMarker}=true;`,
    `try { window.history.replaceState({}, "", ${serializedTarget}); } catch {}`,
    "</script>",
  ].join("");

  if (/<head(?:\s[^>]*)?>/i.test(source)) {
    return source.replace(/<head(?:\s[^>]*)?>/i, (head) => `${head}${bootstrap}`);
  }
  return `${bootstrap}${source}`;
}
