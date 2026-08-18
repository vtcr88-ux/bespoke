import type { Product, StorefrontSettings } from "@bespoke/contracts";

const managedUploadPath =
  /^\/uploads\/images\/[0-9a-f-]{36}\.(?:png|jpg|webp)$/i;

export function publicMediaUrl(url: string, publicApiUrl: string) {
  if (!url) return url;

  try {
    const candidate = new URL(url);
    if (!managedUploadPath.test(candidate.pathname)) return url;

    const publicUrl = new URL(candidate.pathname, publicApiUrl);
    publicUrl.search = candidate.search;
    publicUrl.hash = "";
    return publicUrl.toString();
  } catch {
    return url;
  }
}

function publicLogoMediaUrl(url: string, publicApiUrl: string) {
  const publicUrl = publicMediaUrl(url, publicApiUrl);
  if (!publicUrl) return publicUrl;

  try {
    const candidate = new URL(publicUrl);
    if (!managedUploadPath.test(candidate.pathname)) return publicUrl;
    candidate.searchParams.set("variant", "logo");
    return candidate.toString();
  } catch {
    return publicUrl;
  }
}

export function publicProductMedia(
  product: Product,
  publicApiUrl: string,
): Product {
  return {
    ...product,
    images: product.images.map((image) => ({
      ...image,
      url: publicMediaUrl(image.url, publicApiUrl),
    })),
  };
}

export function publicStorefrontMedia(
  settings: StorefrontSettings,
  publicApiUrl: string,
): StorefrontSettings {
  return {
    ...settings,
    logoUrl: publicLogoMediaUrl(settings.logoUrl, publicApiUrl),
    logoOnDarkUrl: publicLogoMediaUrl(settings.logoOnDarkUrl, publicApiUrl),
    faviconUrl: publicMediaUrl(settings.faviconUrl, publicApiUrl),
    socialImageUrl: publicMediaUrl(settings.socialImageUrl, publicApiUrl),
    heroImageUrl: publicMediaUrl(settings.heroImageUrl, publicApiUrl),
    footerLinks: settings.footerLinks.map((link) => ({
      ...link,
      iconUrl: publicMediaUrl(link.iconUrl, publicApiUrl),
    })),
  };
}
