import type { CSSProperties, ReactNode, SyntheticEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  ImageOff,
  Menu,
  MessageCircle,
  Minus,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  QrCode,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  defaultCatalogTextStyles,
  defaultFooterLinks,
  defaultHomeSections,
  defaultManifestoItems,
  defaultStorefrontTextStyles,
  formatFooterCopyright,
  formatProductCardDescription,
  isSystemFooterLink,
  orderFooterLinks,
  storefrontSettingsSchema,
  type FooterLink,
  type Product,
  type StorefrontSettings,
} from "@bespoke/contracts";
import {
  Badge,
  Button,
  EmptyState,
  IconButton,
  PageTransition,
  SelectField,
  Skeleton,
  TextField,
  accessibleTextColor,
  cardVariants,
  drawerVariants,
  fadeInVariants,
  fadeUpVariants,
  getHomeMotionVariants,
  motionTokens,
  normalizeLogoImage,
  resetNormalizedLogo,
  scrollRevealViewport,
  staggerContainerVariants,
  updateNormalizedLogoLayout,
} from "@bespoke/design-system";
import {
  createCheckout,
  createPixCheckout,
  createWhatsappRequest,
  getCheckoutStatus,
  getPaymentMethods,
  getPixPayment,
  getProduct,
  getStorefrontSettings,
  getSupportWhatsappUrl,
  listCategories,
  listFeaturedProducts,
  listProducts,
  priceCart,
  recordCheckoutWhatsappOpen,
  recordPixWhatsappOpen,
  storefrontEventsUrl,
} from "../lib/api";
import { formatMoney } from "../lib/format";
import { useStorefrontPreviewMedia } from "../lib/storefront-preview-media";
import { useCartStore } from "../stores/cart";
import {
  EditorialNavigation,
  EditorialStatement,
  FeaturedCollectionHeading,
  HeroSection,
  ReviewsSection,
  type EditorialNavigationItem,
} from "../components/HomeSections";

const navigationLinks = [
  { to: "/catalogo", label: "Catalogo" },
  { to: "/pedidos", label: "Pedidos" },
  { to: "/conta", label: "Conta" },
  { to: "/suporte", label: "Suporte" },
];

const storefrontPreviewMessageType = "bespoke:storefront-preview";
const storefrontPreviewReadyType = "bespoke:storefront-preview-ready";
const storefrontPreviewAppliedType = "bespoke:storefront-preview-applied";
const storefrontPreviewErrorType = "bespoke:storefront-preview-error";
const storefrontPreviewLocationType = "bespoke:storefront-preview-location";

function isStorefrontPreviewMode() {
  return (
    typeof window !== "undefined" &&
    (isEmbeddedStorefrontPreview() ||
      new URLSearchParams(window.location.search).get("storefront-preview") ===
        "admin")
  );
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

const textStyleCssNames = {
  heroEyebrow: "hero-eyebrow",
  heroTitle: "hero-title",
  manifesto: "manifesto",
  navigation: "navigation",
  featuredEyebrow: "featured-eyebrow",
  featuredTitle: "featured-title",
  productCardTitle: "product-card-title",
  reviewsEyebrow: "reviews-eyebrow",
  reviewsTitle: "reviews-title",
  reviewsBody: "reviews-body",
  footerSlogan: "footer-slogan",
} satisfies Record<keyof StorefrontSettings["homeTextStyles"], string>;

function storefrontTextFontValue(
  font: StorefrontSettings["homeTextStyles"]["heroTitle"]["fontFamily"],
) {
  const fonts = {
    inherit: "inherit",
    display: "var(--font-display)",
    body: "var(--font-body)",
    modern: 'Aptos, "Segoe UI", Arial, sans-serif',
    classic: 'Georgia, "Times New Roman", serif',
    humanist: '"Trebuchet MS", "Segoe UI", sans-serif',
    editorial: 'Palatino, "Palatino Linotype", "Book Antiqua", serif',
  } as const;
  return fonts[font];
}

function storefrontTextVariables(settings: StorefrontSettings) {
  const variables: Record<string, string> = {};
  const textStyles = settings.homeTextStyles ?? defaultStorefrontTextStyles;

  for (const key of Object.keys(textStyleCssNames) as Array<
    keyof StorefrontSettings["homeTextStyles"]
  >) {
    const style = textStyles[key];
    const cssName = textStyleCssNames[key];
    if (style.color) variables[`--text-${cssName}-color`] = style.color;
    variables[`--text-${cssName}-size`] = `${style.fontSize}px`;
    variables[`--text-${cssName}-space`] = `${style.spacingAfter}px`;
    if (style.fontFamily !== "inherit") {
      variables[`--text-${cssName}-font`] = storefrontTextFontValue(
        style.fontFamily,
      );
    }
  }

  return variables;
}

const catalogTextStyleCssNames = {
  eyebrow: "eyebrow",
  title: "title",
  description: "description",
  category: "card-category",
  cardTitle: "card-title",
  cardDescription: "card-description",
  price: "card-price",
  button: "card-button",
} satisfies Record<keyof StorefrontSettings["catalogTextStyles"], string>;

function catalogTextVariables(settings: StorefrontSettings) {
  const variables: Record<string, string> = {};
  const textStyles = settings.catalogTextStyles ?? defaultCatalogTextStyles;

  for (const key of Object.keys(catalogTextStyleCssNames) as Array<
    keyof StorefrontSettings["catalogTextStyles"]
  >) {
    const style = textStyles[key];
    const cssName = catalogTextStyleCssNames[key];
    if (style.color) variables[`--catalog-text-${cssName}-color`] = style.color;
    variables[`--catalog-text-${cssName}-size`] = `${style.fontSize}px`;
    variables[`--catalog-text-${cssName}-space`] = `${style.spacingAfter}px`;
    if (style.fontFamily !== "inherit") {
      variables[`--catalog-text-${cssName}-font`] = storefrontTextFontValue(
        style.fontFamily,
      );
    }
  }

  return variables;
}

function productToCart(product: Product) {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    sku: product.sku,
    priceInCents: product.priceInCents,
    imageUrl: product.images[0]!.url,
  };
}

function rememberCheckoutAccess(orderReference: string, token: string) {
  try {
    window.sessionStorage.setItem(`checkout-access:${orderReference}`, token);
  } catch {
    // The return URL still supports a token for browsers without session storage.
  }
}

function recallCheckoutAccess(orderReference: string) {
  try {
    return window.sessionStorage.getItem(`checkout-access:${orderReference}`);
  } catch {
    return null;
  }
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Continue with the selection fallback used by restricted browsers.
    }
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Nao foi possivel copiar o codigo Pix.");
}

function useStorefrontSettingsQuery() {
  const previewMode = isStorefrontPreviewMode();
  return useQuery({
    queryKey: ["storefront-settings"],
    queryFn: getStorefrontSettings,
    enabled: !previewMode,
    staleTime: 0,
    refetchOnWindowFocus: previewMode ? false : "always",
  });
}

function useStorefrontPreviewBridge(enabled: boolean) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const route = useLocation();
  const previewFocusRequestRef = useRef(0);

  useEffect(() => {
    if (!enabled || window.parent === window) return;

    const sendToParent = (type: string) => {
      window.parent.postMessage({ type }, "*");
    };
    const focusPreviewLocation = (
      location: "top" | "catalog" | "reviews" | "footer",
      requestId: number,
      attempt = 0,
    ) => {
      if (requestId !== previewFocusRequestRef.current) return;

      const targetPath = location === "catalog" ? "/catalogo" : "/";
      if (route.pathname !== targetPath) return;

      const targetSelector =
        location === "catalog"
          ? ".catalog-page"
          : location === "reviews"
            ? ".reviews-section"
            : location === "footer"
              ? ".site-footer"
              : ".hero";
      const target = document.querySelector(targetSelector);

      // PageTransition waits for the previous route to leave before mounting
      // the next one. Keep the requested location until that target exists.
      if (!target && attempt < 120) {
        window.requestAnimationFrame(() =>
          focusPreviewLocation(location, requestId, attempt + 1),
        );
        return;
      }
      if (!target) return;

      if (location === "top" || location === "catalog") {
        window.scrollTo({ top: 0, behavior: "auto" });
        return;
      }
      target.scrollIntoView({ block: "start", behavior: "auto" });
    };
    const applyPreviewLocation = (
      location: "top" | "catalog" | "reviews" | "footer",
    ) => {
      const requestId = previewFocusRequestRef.current + 1;
      previewFocusRequestRef.current = requestId;
      document.documentElement.dataset.storefrontPreviewLocation = location;
      const targetPath = location === "catalog" ? "/catalogo" : "/";
      if (route.pathname !== targetPath) {
        navigate(
          {
            pathname: targetPath,
            search: isEmbeddedStorefrontPreview()
              ? ""
              : "?storefront-preview=admin",
          },
          { replace: true },
        );
      }
      window.requestAnimationFrame(() =>
        focusPreviewLocation(location, requestId),
      );
    };
    const handleMessage = (event: MessageEvent<unknown>) => {
      if (event.source !== window.parent) return;
      if (!event.data || typeof event.data !== "object") return;
      if (!("type" in event.data)) return;

      if (event.data.type === storefrontPreviewLocationType) {
        if (!("location" in event.data)) return;
        if (
          event.data.location !== "top" &&
          event.data.location !== "catalog" &&
          event.data.location !== "reviews" &&
          event.data.location !== "footer"
        )
          return;
        applyPreviewLocation(event.data.location);
        return;
      }

      if (
        event.data.type !== storefrontPreviewMessageType ||
        !("settings" in event.data)
      )
        return;

      const parsed = storefrontSettingsSchema.safeParse(event.data.settings);
      if (!parsed.success) {
        sendToParent(storefrontPreviewErrorType);
        return;
      }

      void queryClient.cancelQueries({ queryKey: ["storefront-settings"] });
      queryClient.setQueryData(["storefront-settings"], parsed.data);
      const location =
        document.documentElement.dataset.storefrontPreviewLocation;
      if (
        location === "top" ||
        location === "catalog" ||
        location === "reviews" ||
        location === "footer"
      ) {
        window.requestAnimationFrame(() => applyPreviewLocation(location));
      }
      sendToParent(storefrontPreviewAppliedType);
    };
    const preventPreviewNavigation = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest("a[href]")) {
        event.preventDefault();
      }
    };

    document.documentElement.dataset.storefrontPreview = "true";
    const currentLocation =
      document.documentElement.dataset.storefrontPreviewLocation;
    if (
      currentLocation !== "top" &&
      currentLocation !== "catalog" &&
      currentLocation !== "reviews" &&
      currentLocation !== "footer"
    ) {
      document.documentElement.dataset.storefrontPreviewLocation = "top";
    }
    window.addEventListener("message", handleMessage);
    document.addEventListener("click", preventPreviewNavigation, true);
    sendToParent(storefrontPreviewReadyType);

    return () => {
      previewFocusRequestRef.current += 1;
      delete document.documentElement.dataset.storefrontPreview;
      window.removeEventListener("message", handleMessage);
      document.removeEventListener("click", preventPreviewNavigation, true);
    };
  }, [enabled, navigate, queryClient, route.pathname]);
}

function useStorefrontSynchronization(enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const events = new EventSource(storefrontEventsUrl, {
      withCredentials: true,
    });
    events.onmessage = (event) => {
      const payload = parseStorefrontChange(event.data);
      if (!payload) return;

      if (payload === "ready" || payload === "settings") {
        void queryClient.invalidateQueries({
          queryKey: ["storefront-settings"],
        });
      }
      if (payload === "ready" || payload === "products") {
        void queryClient.invalidateQueries({
          predicate: (query) =>
            ["home-products", "catalog", "product", "cart-price"].includes(
              String(query.queryKey[0]),
            ),
        });
      }
      if (payload === "ready" || payload === "categories") {
        void queryClient.invalidateQueries({
          queryKey: ["catalog-categories"],
        });
      }
    };
    return () => events.close();
  }, [enabled, queryClient]);
}

function parseStorefrontChange(value: string) {
  try {
    const payload = JSON.parse(value) as unknown;
    if (!payload || typeof payload !== "object" || !("scope" in payload))
      return null;
    const scope = payload.scope;
    return scope === "ready" ||
      scope === "settings" ||
      scope === "products" ||
      scope === "categories"
      ? scope
      : null;
  } catch {
    return null;
  }
}

function BrandMark({
  compact = false,
  fallbackText = "Marca",
  footer = false,
  logoUrl = "",
}: {
  compact?: boolean;
  fallbackText?: string;
  footer?: boolean;
  logoUrl?: string;
}) {
  const markRef = useRef<HTMLSpanElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const previewMedia = useStorefrontPreviewMedia(logoUrl);
  const resolvedLogoUrl = previewMedia.url;
  const canInspectPixels =
    resolvedLogoUrl.startsWith("data:") ||
    resolvedLogoUrl.startsWith("blob:") ||
    resolvedLogoUrl.includes("/uploads/");

  useEffect(() => {
    const mark = markRef.current;
    if (!mark) return;

    setLoadFailed(previewMedia.error);
    resetNormalizedLogo(mark);
    if (previewMedia.loading || previewMedia.error) return;

    const image = imageRef.current;
    if (!image) return;
    const observer = new ResizeObserver(() =>
      updateNormalizedLogoLayout(image),
    );
    observer.observe(mark);
    if (image.complete) {
      if (image.naturalWidth > 0) {
        normalizeLogoImage(image, canInspectPixels);
      } else {
        setLoadFailed(true);
      }
    }
    return () => observer.disconnect();
  }, [canInspectPixels, previewMedia.error, previewMedia.loading, resolvedLogoUrl]);

  if (!logoUrl) return null;

  const handleLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    setLoadFailed(false);
    normalizeLogoImage(event.currentTarget, canInspectPixels);
  };

  return (
    <span
      ref={markRef}
      className={`brand__mark ${compact ? "brand__mark--compact" : ""}${
        footer ? " brand__mark--footer" : ""
      }`}
      data-logo-load={loadFailed ? "error" : "ready"}
      aria-hidden="true"
    >
      {resolvedLogoUrl ? (
        <img
          ref={imageRef}
          alt=""
          crossOrigin={canInspectPixels ? "anonymous" : undefined}
          src={resolvedLogoUrl}
          onLoad={handleLoad}
          onError={() => setLoadFailed(true)}
        />
      ) : null}
      {loadFailed ? (
        <span className="brand__mark-fallback">{fallbackText}</span>
      ) : null}
    </span>
  );
}

function FooterLinkItem({ link }: { link: FooterLink }) {
  const label = link.label.trim();
  const accessibleName = footerLinkAccessibleName(link);
  const previewIcon = useStorefrontPreviewMedia(link.iconUrl);
  const content = (
    <>
      {previewIcon.url ? <img src={previewIcon.url} alt="" /> : null}
      {label ? <span>{label}</span> : null}
    </>
  );
  const commonProps = {
    "aria-label": label ? undefined : accessibleName,
    className: label ? undefined : "site-footer__icon-link",
    title: label ? undefined : accessibleName,
  };

  return link.href.startsWith("/") ? (
    <Link to={link.href} {...commonProps}>
      {content}
    </Link>
  ) : (
    <a href={link.href} {...commonProps}>
      {content}
    </a>
  );
}

function FooterActionLink({
  children,
  className,
  href,
}: {
  children: ReactNode;
  className: string;
  href: string;
}) {
  return href.startsWith("/") ? (
    <Link className={className} to={href}>
      {children}
    </Link>
  ) : (
    <a className={className} href={href} rel="noreferrer" target="_blank">
      {children}
    </a>
  );
}

function footerLinkAccessibleName(link: FooterLink) {
  const label = link.label.trim();
  if (label) return label;
  if (link.href.startsWith("mailto:")) return "Enviar email";
  if (link.href.startsWith("tel:")) return "Entrar em contato por telefone";
  if (link.href.startsWith("/")) return "Abrir pagina da loja";

  try {
    const hostname = new URL(link.href).hostname.replace(/^www\./, "");
    return hostname ? `Abrir ${hostname}` : "Abrir link do rodape";
  } catch {
    return "Abrir link do rodape";
  }
}

function NavigationLinks({
  indicatorId,
  onNavigate,
}: {
  indicatorId: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {navigationLinks.map((item) => (
        <NavLink
          className={({ isActive }) => (isActive ? "is-active" : undefined)}
          key={item.to}
          onClick={onNavigate}
          to={item.to}
        >
          {({ isActive }) => (
            <>
              <span>{item.label}</span>
              {isActive ? (
                <motion.span
                  aria-hidden="true"
                  className="main-nav__indicator"
                  layoutId={indicatorId}
                />
              ) : null}
            </>
          )}
        </NavLink>
      ))}
    </>
  );
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handleChange = () => setMatches(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}

function Layout() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [cartFeedbackKey, setCartFeedbackKey] = useState(0);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileNavRef = useRef<HTMLElement>(null);
  const previousCountRef = useRef(0);
  const location = useLocation();
  const reducedMotion = useReducedMotion();
  const previewMode = isStorefrontPreviewMode();
  useStorefrontPreviewBridge(previewMode);
  useStorefrontSynchronization(!previewMode);
  const count = useCartStore((state) =>
    state.items.reduce((total, item) => total + item.quantity, 0),
  );
  const { scrollY } = useScroll();
  const { data: storefront } = useStorefrontSettingsQuery();
  const brandName = storefront?.brandName ?? "Loja";
  const footerLinks = orderFooterLinks(
    storefront?.footerLinks ?? defaultFooterLinks,
  );
  const customFooterLinks = footerLinks.filter(
    (link) => !isSystemFooterLink(link),
  );
  const systemFooterLinks = footerLinks.filter(isSystemFooterLink);
  const footerLogoUrl = storefront?.logoOnDarkUrl || storefront?.logoUrl || "";
  const showFooterBrandName = storefront?.footerShowBrandName ?? true;
  const footerWhatsappHref = storefront?.whatsappNumber
    ? `https://wa.me/${storefront.whatsappNumber}`
    : "/suporte";
  const footerCopyright = formatFooterCopyright(
    storefront?.footerCopyrightText ??
      "\u00a9 {{year}} {{brand}} · Todos os direitos reservados.",
    brandName,
  );
  const footerColor =
    storefront?.footerColor ?? storefront?.accentColor ?? "#c9a76d";
  const headerBackground = storefront?.headerBackgroundColor ?? "#ffffff";
  const headerForeground = storefront?.headerTextColor ?? "#090907";
  const customHeaderButtons = storefront?.headerButtonMode === "custom";
  const headerButtonBackground = customHeaderButtons
    ? (storefront?.headerButtonBackgroundColor ?? headerForeground)
    : headerForeground;
  const headerButtonStyle = storefront?.headerButtonStyle ?? "solid";
  const headerButtonForeground = customHeaderButtons
    ? (storefront?.headerButtonTextColor ?? headerForeground)
    : headerButtonStyle === "solid"
      ? accessibleTextColor(
          headerButtonBackground,
          storefront?.headerButtonTextColor ?? headerBackground,
        )
      : accessibleTextColor(
          headerBackground,
          storefront?.headerButtonTextColor ?? headerForeground,
        );
  const footerMotionVariants = getHomeMotionVariants({
    enabled: storefront?.homeMotionEnabled ?? true,
    preset:
      storefront?.homeMotionByBlock?.footer ??
      storefront?.homeMotionPreset ??
      "editorial",
    intensity: storefront?.homeMotionIntensity ?? "balanced",
  });
  const shellStyle = storefront
    ? ({
        "--color-brand-primary": storefront.primaryColor,
        "--color-brand-accent": storefront.accentColor,
        "--color-header-background": headerBackground,
        "--color-header-foreground": headerForeground,
        "--color-header-accent": storefront.headerAccentColor,
        "--color-header-button-background": headerButtonBackground,
        "--color-header-button-foreground": headerButtonForeground,
        "--header-font": storefrontTextFontValue(
          storefront.headerFontFamily === "inherit" ||
            storefront.headerFontFamily === "display" ||
            storefront.headerFontFamily === "body"
            ? "modern"
            : (storefront.headerFontFamily ?? "modern"),
        ),
        "--header-nav-font-size": `${storefront.headerNavFontSize ?? 15}px`,
        "--header-button-font-size": `${storefront.headerButtonFontSize ?? 15}px`,
        "--header-height": `${storefront.headerHeight ?? 72}px`,
        "--header-logo-width": `${storefront.headerLogoWidth ?? 300}px`,
        "--header-button-radius": `${storefront.headerButtonRadius ?? 6}px`,
        "--header-border-color": storefront.headerBorderColor ?? "#d8d1c5",
        "--header-border-width": `${storefront.headerBorderWidth ?? 1}px`,
        "--header-position":
          storefront.headerSticky === false ? "relative" : "sticky",
        "--color-footer-background": footerColor,
        "--color-background": storefront.backgroundColor,
        "--color-home-surface-alt": storefront.homeAlternateColor ?? "#f3efe8",
        "--color-footer-foreground": accessibleTextColor(
          footerColor,
          storefront.primaryColor,
        ),
        ...storefrontTextVariables(storefront),
      } as CSSProperties)
    : undefined;

  useEffect(() => {
    if (!storefront) return;
    document.title = storefront.defaultMetaTitle;

    const metadata = [
      ["name", "description", storefront.defaultMetaDescription],
      ["property", "og:title", storefront.defaultMetaTitle],
      ["property", "og:description", storefront.defaultMetaDescription],
      ["property", "og:image", storefront.socialImageUrl],
    ] as const;
    for (const [attribute, key, content] of metadata) {
      let element = document.head.querySelector<HTMLMetaElement>(
        `meta[${attribute}="${key}"]`,
      );
      if (!content) {
        element?.remove();
        continue;
      }
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, key);
        document.head.append(element);
      }
      element.content = content;
    }

    let favicon = document.head.querySelector<HTMLLinkElement>(
      'link[rel="icon"][data-storefront-favicon]',
    );
    if (!storefront.faviconUrl) {
      favicon?.remove();
      return;
    }
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      favicon.dataset.storefrontFavicon = "true";
      document.head.append(favicon);
    }
    favicon.href = storefront.faviconUrl;
  }, [storefront]);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const nextScrolled = latest > 18;
    setScrolled((current) =>
      current === nextScrolled ? current : nextScrolled,
    );
  });

  useEffect(() => {
    if (count > previousCountRef.current)
      setCartFeedbackKey((value) => value + 1);
    previousCountRef.current = count;
  }, [count]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;

    const focusFrame = window.requestAnimationFrame(() =>
      mobileNavRef.current?.querySelector<HTMLAnchorElement>("a")?.focus(),
    );
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      menuButtonRef.current?.focus();
    };
  }, [open]);

  return (
    <div
      className="store-shell"
      data-storefront-preview={previewMode ? "true" : undefined}
      data-storefront-font={storefront?.storefrontFont ?? "signature"}
      style={shellStyle}
    >
      <a className="skip-link" href="#main">
        Ir para o conteudo
      </a>
      <header
        data-button-style={headerButtonStyle}
        data-shadow={storefront?.headerShadow ?? "subtle"}
        className={
          scrolled ? "site-header site-header--scrolled" : "site-header"
        }
      >
        <Link
          className="brand brand--header"
          to="/"
          aria-label={`${brandName} inicio`}
        >
          <BrandMark fallbackText={brandName} logoUrl={storefront?.logoUrl} />
        </Link>
        <nav className="main-nav main-nav--desktop" aria-label="Principal">
          <NavigationLinks indicatorId="desktop-navigation-active" />
        </nav>
        <div className="header-actions">
          <Link
            className="cart-link"
            to="/carrinho"
            aria-label={`Carrinho com ${count} itens`}
          >
            <motion.span
              animate={{ rotate: 0, scale: 1 }}
              className="cart-link__icon"
              initial={cartFeedbackKey ? { rotate: -8, scale: 0.84 } : false}
              key={cartFeedbackKey}
              transition={{
                duration: motionTokens.duration.standard,
                ease: motionTokens.easing.outExpo,
              }}
            >
              <ShoppingBag size={20} />
            </motion.span>
            <span className="cart-link__count" aria-hidden="true">
              <motion.span
                animate={{ opacity: 1, y: 0 }}
                initial={{ opacity: 0, y: -5 }}
                key={count}
                transition={{
                  duration: motionTokens.duration.fast,
                  ease: motionTokens.easing.outQuart,
                }}
              >
                {count}
              </motion.span>
            </span>
          </Link>
          <IconButton
            ref={menuButtonRef}
            label={open ? "Fechar menu" : "Abrir menu"}
            aria-controls="mobile-navigation"
            aria-expanded={open}
            className="menu-button"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </IconButton>
        </div>
        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              animate="open"
              className="mobile-navigation-shell"
              exit="closed"
              initial="closed"
              variants={drawerVariants}
            >
              <nav
                ref={mobileNavRef}
                aria-label="Principal"
                className="main-nav main-nav--mobile"
                id="mobile-navigation"
              >
                <NavigationLinks
                  indicatorId="mobile-navigation-active"
                  onNavigate={() => setOpen(false)}
                />
              </nav>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>
      <main id="main">
        <PageTransition routeKey={location.pathname}>
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            <Route path="/catalogo" element={<CatalogPage />} />
            <Route path="/produto/:slug" element={<ProductPage />} />
            <Route path="/carrinho" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/checkout/pix" element={<PixPaymentPage />} />
            <Route path="/conta" element={<AccountPage />} />
            <Route path="/pedidos" element={<OrdersPage />} />
            <Route path="/suporte" element={<SupportPage />} />
            <Route path="/privacidade" element={<PrivacyPage />} />
            <Route path="/checkout/sandbox" element={<CheckoutReturnPage />} />
          </Routes>
        </PageTransition>
      </main>
      <motion.footer
        className={
          location.pathname === "/"
            ? "site-footer site-footer--home"
            : "site-footer"
        }
        initial={reducedMotion ? false : "hidden"}
        variants={footerMotionVariants.footerContainer}
        viewport={scrollRevealViewport.text}
        whileInView="visible"
      >
        <div className="site-footer__inner">
          <div className="site-footer__main">
            <motion.div
              className="site-footer__brand"
              variants={footerMotionVariants.footerItem}
            >
              {footerLogoUrl || showFooterBrandName ? (
                <Link
                  className={`brand brand--footer${
                    showFooterBrandName
                      ? " brand--footer-with-text"
                      : " brand--footer-logo-only"
                  }`}
                  to="/"
                  aria-label={`${brandName} inicio`}
                >
                  <BrandMark
                    fallbackText={brandName}
                    footer
                    logoUrl={footerLogoUrl}
                  />
                  {showFooterBrandName ? (
                    <span className="brand__wordmark brand__wordmark--footer">
                      <strong>{brandName}</strong>
                    </span>
                  ) : null}
                </Link>
              ) : null}
              {storefront?.footerSlogan ? (
                <p className="site-footer__slogan">{storefront.footerSlogan}</p>
              ) : null}
              {storefront?.footerWhatsappButtonLabel ? (
                <FooterActionLink
                  className="site-footer__whatsapp-button"
                  href={footerWhatsappHref}
                >
                  <MessageCircle aria-hidden="true" size={18} />
                  <span>{storefront.footerWhatsappButtonLabel}</span>
                </FooterActionLink>
              ) : null}
            </motion.div>
            <motion.div
              className="site-footer__links"
              variants={footerMotionVariants.footerItem}
            >
              {storefront?.footerHeading ? (
                <h2>{storefront.footerHeading}</h2>
              ) : null}
              {footerLinks.length ? (
                <div className="site-footer__nav-groups">
                  {customFooterLinks.length ? (
                    <nav
                      className="site-footer__nav site-footer__nav--custom"
                      aria-label="Contato e redes sociais"
                    >
                      {customFooterLinks.map((link) => (
                        <FooterLinkItem link={link} key={link.id} />
                      ))}
                    </nav>
                  ) : null}
                  {systemFooterLinks.length ? (
                    <nav
                      className="site-footer__nav site-footer__nav--system"
                      aria-label="Paginas da loja"
                    >
                      {systemFooterLinks.map((link) => (
                        <FooterLinkItem link={link} key={link.id} />
                      ))}
                    </nav>
                  ) : null}
                </div>
              ) : null}
            </motion.div>
            <motion.div
              className="site-footer__service"
              variants={footerMotionVariants.footerItem}
            >
              {storefront?.footerServiceHeading ? (
                <h2>{storefront.footerServiceHeading}</h2>
              ) : null}
              <div className="site-footer__service-lines">
                {storefront?.footerServiceLineOne ? (
                  <p>{storefront.footerServiceLineOne}</p>
                ) : null}
                {storefront?.footerServiceLineTwo ? (
                  <p>{storefront.footerServiceLineTwo}</p>
                ) : null}
              </div>
              {storefront?.footerWhatsappLinkLabel ? (
                <FooterActionLink
                  className="site-footer__service-link"
                  href={footerWhatsappHref}
                >
                  <span>{storefront.footerWhatsappLinkLabel}</span>
                  <ArrowRight aria-hidden="true" size={15} />
                </FooterActionLink>
              ) : null}
            </motion.div>
          </div>
          {footerCopyright || storefront?.footerSecurityText ? (
            <motion.div
              className="site-footer__bottom"
              variants={footerMotionVariants.footerItem}
            >
              {footerCopyright ? <p>{footerCopyright}</p> : null}
              {storefront?.footerSecurityText ? (
                <p className="site-footer__security">
                  <span aria-hidden="true" />
                  {storefront.footerSecurityText}
                </p>
              ) : null}
            </motion.div>
          ) : null}
        </div>
      </motion.footer>
    </div>
  );
}

function HomePage() {
  const storefrontQuery = useStorefrontSettingsQuery();

  if (storefrontQuery.isLoading) {
    return (
      <div
        className="home-page home-page--loading"
        aria-label="Carregando vitrine"
      >
        <Skeleton className="home-hero-skeleton" />
        <Skeleton className="home-statement-skeleton" />
      </div>
    );
  }

  if (storefrontQuery.isError || !storefrontQuery.data) {
    return (
      <section className="home-data-state">
        <EmptyState
          title="Vitrine temporariamente indisponivel"
          body="Nao foi possivel carregar as configuracoes publicadas. Tente novamente em instantes."
          action={
            <Button onClick={() => storefrontQuery.refetch()}>
              Tentar novamente
            </Button>
          }
        />
      </section>
    );
  }

  const storefront = storefrontQuery.data;
  const editorialLinks: EditorialNavigationItem[] = [
    {
      label: storefront.editorialCatalogLabel,
      to: "/catalogo",
    },
    {
      label: storefront.editorialOrdersLabel ?? "Acompanhar pedidos",
      to: "/pedidos",
    },
    {
      label: storefront.editorialAccountLabel ?? "Minha conta",
      to: "/conta",
    },
    {
      label: storefront.editorialSupportLabel,
      to: "/suporte",
    },
  ];
  const manifestoItems =
    storefront.manifestoItems ??
    defaultManifestoItems.map((item, index) => ({
      ...item,
      content:
        index === 0 ? storefront.manifestoLineOne : storefront.manifestoLineTwo,
    }));
  const homeSections =
    storefront.homeSections ??
    defaultHomeSections.map((section) => ({ ...section }));
  const motionEnabled = storefront.homeMotionEnabled ?? true;
  const legacyMotionPreset = storefront.homeMotionPreset ?? "editorial";
  const motionByBlock = storefront.homeMotionByBlock;
  const motionIntensity = storefront.homeMotionIntensity ?? "balanced";
  const transitionPreset = storefront.homeTransitionPreset ?? "editorial";
  const visibleHomeSections = homeSections.filter((section) => {
    if (!section.enabled) return false;
    if (section.id === "manifesto") {
      return manifestoItems.some((item) => item.enabled && item.content.trim());
    }
    if (section.id === "navigation") {
      return editorialLinks.some((item) => item.label.trim());
    }
    return true;
  });

  function renderHomeSection(section: (typeof homeSections)[number]) {
    if (!section.enabled) return null;

    if (section.id === "manifesto") {
      return (
        <EditorialStatement
          divider={storefront.manifestoDivider ?? "line"}
          items={manifestoItems}
          maxWidth={storefront.manifestoMaxWidth ?? 880}
          mobileDividerEnabled={
            storefront.manifestoDividerMobileEnabled ?? false
          }
          motionEnabled={motionEnabled}
          motionIntensity={motionIntensity}
          motionPreset={motionByBlock?.manifesto ?? legacyMotionPreset}
        />
      );
    }
    if (section.id === "navigation") {
      return (
        <EditorialNavigation
          ariaLabel="Caminhos da loja"
          items={editorialLinks}
          mobileEnabled={storefront.editorialNavigationMobileEnabled}
          motionEnabled={motionEnabled}
          motionIntensity={motionIntensity}
          motionPreset={motionByBlock?.navigation ?? legacyMotionPreset}
        />
      );
    }
    return <CatalogPreview storefront={storefront} />;
  }

  return (
    <div
      className="home-page"
      data-home-layout={storefront.homeLayout}
      data-card-style={storefront.productCardStyle}
      data-image-fit={storefront.imageFit}
      data-home-spacing={storefront.homeSectionSpacing ?? "balanced"}
      data-home-transition={transitionPreset}
      data-home-depth={storefront.homeDepthIntensity ?? "balanced"}
      style={
        {
          "--home-surface": storefront.homeSurfaceColor ?? "#faf8f4",
          "--home-surface-alt": storefront.homeAlternateColor ?? "#f3efe8",
          "--home-text-secondary":
            storefront.homeSecondaryTextColor ?? "#5c584f",
          "--home-border": storefront.homeBorderColor ?? "#d8d1c5",
          "--home-shadow": storefront.homeShadowColor ?? "#090907",
          "--home-transition-start":
            storefront.homeTransitionStartColor ?? storefront.accentColor,
          "--home-transition-end":
            storefront.homeTransitionEndColor ?? "#faf8f4",
          "--reviews-background": storefront.reviewsBackgroundColor,
          "--reviews-card-background": storefront.reviewsCardColor,
          "--home-transition-overlap": `${
            transitionPreset === "none"
              ? 0
              : (storefront.homeTransitionOverlap ?? 64)
          }px`,
          "--home-transition-opacity": `${
            storefront.homeTransitionOpacity ?? 82
          }%`,
          "--home-transition-edge-strength": `${Math.min(
            8,
            storefront.homeTransitionOpacity === 0
              ? 0
              : Math.max(2, (storefront.homeTransitionOpacity ?? 82) / 12),
          )}%`,
        } as CSSProperties
      }
    >
      <HeroSection
        contentAlignment={
          storefront.homeLayout === "showcase" ? "center" : "start"
        }
        eyebrow={storefront.heroEyebrow}
        eyebrowFontSize={
          storefront.homeTextStyles?.heroEyebrow.fontSize ??
          storefront.heroEyebrowFontSize
        }
        height={storefront.heroHeight}
        image={storefront.heroImageUrl}
        imagePosition="center"
        overlayOpacity={storefront.homeLayout === "showcase" ? 0.9 : 1}
        title={storefront.heroTitle}
        titleFontSize={
          storefront.homeTextStyles?.heroTitle.fontSize ??
          storefront.heroTitleFontSize
        }
      />
      {visibleHomeSections.length ? (
        <div className="home-composition">
          {visibleHomeSections.map((section) => (
            <div
              className={`home-section home-section--${section.id}`}
              key={section.id}
            >
              {renderHomeSection(section)}
            </div>
          ))}
        </div>
      ) : null}
      {storefront.reviewsEnabled ? (
        <ReviewsSection
          eyebrow={storefront.reviewsEyebrow}
          items={storefront.reviewsItems}
          motionEnabled={motionEnabled}
          motionIntensity={motionIntensity}
          motionPreset={motionByBlock?.reviews ?? "soft"}
          speedSeconds={storefront.reviewsSpeedSeconds}
          title={storefront.reviewsTitle}
        />
      ) : null}
    </div>
  );
}

function CatalogPreview({ storefront }: { storefront: StorefrontSettings }) {
  const products = useQuery({
    queryKey: ["home-products", "all-featured"],
    queryFn: ({ signal }) => listFeaturedProducts(signal),
    staleTime: 0,
    refetchOnWindowFocus: "always",
  });
  return (
    <section className="section featured-collection">
      <FeaturedCollectionHeading
        actionLabel={storefront.featuredLinkLabel}
        actionTo="/catalogo"
        eyebrow={storefront.featuredEyebrow}
        title={storefront.featuredTitle}
        motionEnabled={storefront.homeMotionEnabled ?? true}
        motionIntensity={storefront.homeMotionIntensity ?? "balanced"}
        motionPreset={
          storefront.homeMotionByBlock?.featuredHeading ??
          storefront.homeMotionPreset ??
          "editorial"
        }
      />
      {products.isError ? (
        <EmptyState
          title="Nao foi possivel carregar os destaques"
          body="A vitrine continua disponivel. Tente consultar os produtos novamente."
          action={
            <Button onClick={() => products.refetch()}>Tentar novamente</Button>
          }
        />
      ) : null}
      <motion.div className="product-grid product-grid--preview">
        {products.isLoading
          ? Array.from({ length: 4 }, (_, index) => (
              <ProductSkeleton key={index} />
            ))
          : products.data?.items.map((product, index) => (
              <ProductCard
                addButtonLabel={storefront.featuredAddButtonLabel}
                product={product}
                key={product.id}
                homePreview
                homeMotionEnabled={storefront.homeMotionEnabled ?? true}
                homeMotionIntensity={
                  storefront.homeMotionIntensity ?? "balanced"
                }
                homeMotionPreset={
                  storefront.homeMotionByBlock?.productCards ??
                  storefront.homeMotionPreset ??
                  "editorial"
                }
                revealOrder={index}
              />
            ))}
      </motion.div>
      {!products.isLoading &&
      !products.isError &&
      products.data?.items.length === 0 ? (
        <EmptyState
          title="Nenhum destaque publicado"
          body="Os produtos marcados como destaque no painel aparecerao aqui."
        />
      ) : null}
    </section>
  );
}

function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const { data: storefront } = useStorefrontSettingsQuery();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const filterDrawerRef = useRef<HTMLElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const filterCloseRef = useRef<HTMLButtonElement>(null);
  const filterReturnFocusRef = useRef<HTMLElement | null>(null);
  const isMobileFilters = useMediaQuery("(max-width: 760px)");
  const categories = useQuery({
    queryKey: ["catalog-categories"],
    queryFn: listCategories,
    staleTime: 0,
    refetchOnWindowFocus: "always",
  });
  const queryKey = ["catalog", params.toString()];
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam, signal }) => listProducts(params, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
  const products = query.data?.pages.flatMap((page) => page.items) ?? [];

  useEffect(() => {
    if (!loadMoreRef.current || !query.hasNextPage || query.isFetchingNextPage)
      return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) void query.fetchNextPage();
    });
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);

  useEffect(() => {
    if (!filtersOpen || !isMobileFilters) return;

    const previousOverflow = document.body.style.overflow;
    const previousFocus =
      filterReturnFocusRef.current ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null);
    let mountedFocusFrame = 0;
    const focusFrame = window.requestAnimationFrame(() => {
      mountedFocusFrame = window.requestAnimationFrame(() =>
        filterCloseRef.current?.focus(),
      );
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFiltersOpen(false);
        return;
      }

      if (event.key !== "Tab" || !filterDrawerRef.current) return;
      const focusable = Array.from(
        filterDrawerRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]",
        ),
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.cancelAnimationFrame(mountedFocusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      window.requestAnimationFrame(() => {
        const returnTarget =
          previousFocus &&
          previousFocus !== document.body &&
          previousFocus.isConnected
            ? previousFocus
            : filterButtonRef.current;
        returnTarget?.focus();
        filterReturnFocusRef.current = null;
      });
    };
  }, [filtersOpen, isMobileFilters]);

  function updateParam(name: string, value: string) {
    const next = new URLSearchParams(params);
    const defaultValues: Record<string, string> = { sort: "featured" };
    if (value && value !== defaultValues[name]) next.set(name, value);
    else next.delete(name);
    next.delete("cursor");
    setParams(next);
  }

  function clearFilters() {
    setParams(new URLSearchParams());
  }

  const categoryLabels = Object.fromEntries(
    (categories.data?.items ?? []).map((category) => [
      category.slug,
      category.name,
    ]),
  );
  const sortLabels: Record<string, string> = {
    featured: "Destaques",
    price_asc: "Menor preco",
    price_desc: "Maior preco",
    newest: "Recentes",
  };
  const searchValue = params.get("search")?.trim() ?? "";
  const categoryValue = params.get("category") ?? "";
  const sortValue = params.get("sort") ?? "featured";
  const activeFilters = [
    searchValue ? { key: "search", label: `Busca: ${searchValue}` } : null,
    categoryValue
      ? {
          key: "category",
          label: `Categoria: ${categoryLabels[categoryValue] ?? categoryValue}`,
        }
      : null,
    sortValue !== "featured"
      ? { key: "sort", label: `Ordem: ${sortLabels[sortValue] ?? sortValue}` }
      : null,
  ].filter((filter): filter is { key: string; label: string } =>
    Boolean(filter),
  );
  const activeFilterCount = activeFilters.length;
  const catalogButtonBackground =
    storefront?.catalogButtonBackgroundColor ?? "#090907";
  const catalogButtonForeground =
    storefront?.catalogButtonTextColor ?? "#ffffff";
  const catalogStyle = storefront
    ? ({
        "--catalog-background": storefront.catalogBackgroundColor,
        "--catalog-surface": storefront.catalogSurfaceColor,
        "--catalog-text": storefront.catalogTextColor,
        "--catalog-text-secondary": storefront.catalogSecondaryTextColor,
        "--catalog-accent": storefront.catalogAccentColor,
        "--catalog-border": storefront.catalogBorderColor,
        "--catalog-button-background": catalogButtonBackground,
        "--catalog-button-foreground": catalogButtonForeground,
        "--catalog-card-radius": `${storefront.catalogCardRadius}px`,
        "--catalog-columns-desktop": storefront.catalogColumnsDesktop,
        "--catalog-columns-tablet": storefront.catalogColumnsTablet,
        "--catalog-columns-mobile": storefront.catalogColumnsMobile,
        ...catalogTextVariables(storefront),
      } as CSSProperties)
    : undefined;

  return (
    <div
      className="catalog-page"
      data-catalog-density={storefront?.catalogDensity ?? "comfortable"}
      data-card-style={storefront?.catalogCardStyle ?? "boutique"}
      data-image-fit={storefront?.catalogImageFit ?? "contain"}
      data-image-ratio={storefront?.catalogImageRatio ?? "square"}
      data-button-style={storefront?.catalogButtonStyle ?? "solid"}
      style={catalogStyle}
    >
      <header className="catalog-intro">
        <div>
          {storefront?.catalogEyebrow?.trim() ? (
            <p>{storefront.catalogEyebrow}</p>
          ) : null}
          <h1>{storefront?.catalogTitle ?? "Catalogo"}</h1>
        </div>
        {storefront?.catalogDescription?.trim() ? (
          <p className="catalog-intro__description">
            {storefront.catalogDescription}
          </p>
        ) : null}
      </header>
      <section
        className={`catalog-layout catalog-layout--infinite ${filtersCollapsed ? "catalog-layout--filters-collapsed" : ""}`}
        aria-label="Produtos do catalogo"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {filtersCollapsed ? (
            <motion.button
              animate="visible"
              className={
                activeFilterCount
                  ? "filters-rail filters-rail--active"
                  : "filters-rail"
              }
              exit="hidden"
              initial="hidden"
              key="filters-rail"
              layout
              type="button"
              variants={fadeInVariants}
              onClick={() => {
                filterReturnFocusRef.current = filterButtonRef.current;
                setFiltersCollapsed(false);
                if (isMobileFilters) setFiltersOpen(true);
              }}
            >
              <PanelLeftOpen size={18} />
              <span>Filtros</span>
              {activeFilterCount ? <small>{activeFilterCount}</small> : null}
            </motion.button>
          ) : !isMobileFilters || filtersOpen ? (
            <motion.aside
              ref={filterDrawerRef}
              animate="open"
              aria-label="Filtros do catalogo"
              aria-modal={isMobileFilters || undefined}
              className={filtersOpen ? "filters filters--open" : "filters"}
              exit="closed"
              initial={isMobileFilters ? "closed" : false}
              key="filters-panel"
              layout
              role={isMobileFilters ? "dialog" : undefined}
              variants={drawerVariants}
            >
              <div className="filters__header">
                <h2>Filtros</h2>
                <div className="filters__header-actions">
                  <IconButton
                    label="Ocultar filtros"
                    className="filters__collapse"
                    onClick={() => {
                      setFiltersOpen(false);
                      setFiltersCollapsed(true);
                    }}
                  >
                    <PanelLeftClose size={18} />
                  </IconButton>
                  <IconButton
                    ref={filterCloseRef}
                    label="Fechar filtros"
                    className="filters__close"
                    onClick={() => setFiltersOpen(false)}
                  >
                    <X size={18} />
                  </IconButton>
                </div>
              </div>
              <TextField
                label="Buscar"
                value={params.get("search") ?? ""}
                onChange={(event) => updateParam("search", event.target.value)}
                placeholder="Produto, SKU ou tag"
              />
              <SelectField
                label="Categoria"
                value={params.get("category") ?? ""}
                onChange={(event) =>
                  updateParam("category", event.target.value)
                }
              >
                <option value="">Todas</option>
                {(categories.data?.items ?? []).map((category) => (
                  <option value={category.slug} key={category.id}>
                    {category.name}
                  </option>
                ))}
              </SelectField>
              {categories.isError ? (
                <p className="filters__field-error" role="alert">
                  Categorias indisponiveis no momento.
                </p>
              ) : null}
              <SelectField
                label="Ordenacao"
                value={params.get("sort") ?? "featured"}
                onChange={(event) => updateParam("sort", event.target.value)}
              >
                <option value="featured">Destaques</option>
                <option value="price_asc">Menor preco</option>
                <option value="price_desc">Maior preco</option>
                <option value="newest">Recentes</option>
              </SelectField>
              <div className="active-filters" aria-live="polite">
                <div className="active-filters__header">
                  <span>
                    {activeFilterCount
                      ? "Filtros ativos"
                      : "Sem filtros ativos"}
                  </span>
                  {activeFilterCount ? (
                    <button type="button" onClick={clearFilters}>
                      Limpar filtros
                    </button>
                  ) : null}
                </div>
                {activeFilterCount ? (
                  <div className="active-filters__list">
                    {activeFilters.map((filter) => (
                      <button
                        type="button"
                        key={filter.key}
                        onClick={() => updateParam(filter.key, "")}
                      >
                        {filter.label}
                        <X size={14} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="filters__hint">
                    Use busca, categoria ou ordenacao para refinar o catalogo.
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                className="filters__done"
                onClick={() => {
                  setFiltersOpen(false);
                  setFiltersCollapsed(true);
                }}
              >
                <PanelLeftClose size={16} />
                Ocultar filtros
              </Button>
            </motion.aside>
          ) : null}
        </AnimatePresence>
        <div className="catalog-results">
          <div className="catalog-toolbar">
            <div>
              <p aria-live="polite">
                {query.isLoading
                  ? "Carregando produtos"
                  : `${products.length} ${products.length === 1 ? "produto carregado" : "produtos carregados"}`}
              </p>
              <h2>Produtos</h2>
            </div>
            <IconButton
              ref={filterButtonRef}
              label="Abrir filtros"
              className={
                activeFilterCount
                  ? "filters-button filters-button--active"
                  : "filters-button"
              }
              onClick={() => {
                filterReturnFocusRef.current = filterButtonRef.current;
                setFiltersCollapsed(false);
                setFiltersOpen(true);
              }}
            >
              <SlidersHorizontal size={20} />
              {activeFilterCount ? <span>{activeFilterCount}</span> : null}
            </IconButton>
          </div>
          {activeFilterCount ? (
            <div className="catalog-active-filters" aria-live="polite">
              <div className="active-filters__list">
                {activeFilters.map((filter) => (
                  <button
                    type="button"
                    key={filter.key}
                    onClick={() => updateParam(filter.key, "")}
                  >
                    {filter.label}
                    <X size={14} />
                  </button>
                ))}
              </div>
              <button type="button" onClick={clearFilters}>
                Limpar filtros
              </button>
            </div>
          ) : null}
          {query.isError ? (
            <EmptyState
              title="Nao foi possivel carregar"
              body="Verifique a conexao com a API e tente novamente."
              action={
                <Button onClick={() => query.refetch()}>
                  Tentar novamente
                </Button>
              }
            />
          ) : null}
          <motion.div
            className="product-grid infinite-feed"
            aria-live="polite"
            layout
          >
            {query.isLoading
              ? Array.from({ length: 8 }, (_, index) => (
                  <ProductSkeleton key={index} />
                ))
              : null}
            <AnimatePresence initial={false}>
              {products.map((product, index) => (
                <ProductCard
                  addButtonLabel={
                    storefront?.featuredAddButtonLabel ?? "Adicionar"
                  }
                  product={product}
                  key={product.id}
                  revealOrder={index % 4}
                />
              ))}
            </AnimatePresence>
          </motion.div>
          {!query.isLoading && products.length === 0 ? (
            <EmptyState
              title="Nada encontrado"
              body="Ajuste os filtros para ver outras opcoes."
            />
          ) : null}
          <div ref={loadMoreRef} className="load-more">
            {query.hasNextPage ? (
              <Button
                variant="secondary"
                loading={query.isFetchingNextPage}
                onClick={() => query.fetchNextPage()}
              >
                Carregar mais
              </Button>
            ) : products.length > 0 ? (
              <p>Todos os produtos foram carregados.</p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function ProductCard({
  product,
  addButtonLabel = "Adicionar",
  homePreview = false,
  revealOrder = 0,
  homeMotionEnabled = true,
  homeMotionPreset = "editorial",
  homeMotionIntensity = "balanced",
}: {
  product: Product;
  addButtonLabel?: string;
  homePreview?: boolean;
  revealOrder?: number;
  homeMotionEnabled?: boolean;
  homeMotionPreset?: StorefrontSettings["homeMotionPreset"];
  homeMotionIntensity?: StorefrontSettings["homeMotionIntensity"];
}) {
  const navigate = useNavigate();
  const add = useCartStore((state) => state.add);
  const reducedMotion = useReducedMotion();
  const [imageFailed, setImageFailed] = useState(false);
  const lowStock =
    product.lowStockWarningEnabled &&
    product.stock <= product.lowStockThreshold;
  const primaryImage = product.images[0]!;
  const previewImage = useStorefrontPreviewMedia(primaryImage.url);
  const homeMotionVariants = getHomeMotionVariants({
    enabled: homeMotionEnabled,
    preset: homeMotionPreset,
    intensity: homeMotionIntensity,
  });

  useEffect(() => {
    setImageFailed(previewImage.error);
  }, [previewImage.error, primaryImage.url]);

  function handleAdd() {
    add(productToCart(product));
    navigate("/carrinho");
  }

  return (
    <motion.article
      className={
        homePreview
          ? "product-card product-card--catalog-style product-card--home-preview"
          : "product-card product-card--catalog-style"
      }
      custom={revealOrder}
      exit="exit"
      initial={reducedMotion ? false : "hidden"}
      layout={homePreview ? false : "position"}
      variants={homePreview ? homeMotionVariants.card : cardVariants}
      viewport={
        homePreview
          ? scrollRevealViewport.homeCards
          : scrollRevealViewport.cards
      }
      whileHover="hover"
      whileInView="visible"
      whileTap="tap"
    >
      <Link
        to={`/produto/${product.slug}`}
        className={
          imageFailed
            ? "product-card__image product-card__image--fallback"
            : "product-card__image"
        }
      >
        {imageFailed ? (
          <span className="product-card__image-fallback">
            <ImageOff aria-hidden="true" size={24} />
            <span>Imagem indisponivel</span>
          </span>
        ) : previewImage.url ? (
          <img
            alt={primaryImage.alt}
            decoding="async"
            loading="lazy"
            onError={() => setImageFailed(true)}
            src={previewImage.url}
          />
        ) : null}
      </Link>
      <div className="product-card__body">
        <div className="product-card__content">
          <div className="product-card__meta">
            <Badge tone="neutral">{product.category.name}</Badge>
            {lowStock ? (
              <span className="product-card__stock">Estoque baixo</span>
            ) : null}
          </div>
          <h2>
            <Link to={`/produto/${product.slug}`}>{product.name}</Link>
          </h2>
          <p className="product-card__description">
            {formatProductCardDescription(product.description)}
          </p>
        </div>
        <div className="product-card__footer">
          <div className="product-card__price">
            <span>Valor</span>
            <strong>{formatMoney(product.priceInCents)}</strong>
          </div>
          <Button
            type="button"
            className="product-card__button"
            aria-label={`Adicionar ${product.name} ao carrinho`}
            onClick={handleAdd}
          >
            <ShoppingBag aria-hidden="true" size={16} />
            {addButtonLabel}
          </Button>
        </div>
      </div>
    </motion.article>
  );
}

function ProductSkeleton() {
  return (
    <article className="product-card product-card--catalog-style">
      <Skeleton className="product-card__image" />
      <div className="product-card__body">
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </div>
    </article>
  );
}

function ProductPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const add = useCartStore((state) => state.add);
  const {
    data: product,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => getProduct(slug),
  });

  if (isLoading)
    return (
      <section className="section">
        <ProductSkeleton />
      </section>
    );
  if (isError || !product)
    return (
      <section className="section">
        <EmptyState
          title="Produto indisponivel"
          body="Este produto nao esta disponivel no momento."
        />
      </section>
    );

  return (
    <section className="product-detail">
      <motion.div
        animate="visible"
        className="product-detail__media"
        initial="hidden"
        variants={fadeInVariants}
      >
        <img src={product.images[0]!.url} alt={product.images[0]!.alt} />
      </motion.div>
      <motion.div
        animate="visible"
        className="product-detail__info"
        initial="hidden"
        variants={fadeUpVariants}
      >
        <Badge
          tone={
            product.lowStockWarningEnabled &&
            product.stock <= product.lowStockThreshold
              ? "warning"
              : "neutral"
          }
        >
          {product.category.name}
        </Badge>
        <h1>{product.name}</h1>
        <p>{product.description}</p>
        <strong>{formatMoney(product.priceInCents)}</strong>
        <div className="detail-actions">
          <Button
            onClick={() => {
              add(productToCart(product));
              navigate("/carrinho");
            }}
          >
            Adicionar ao carrinho
          </Button>
          <Link className="store-button store-button--secondary" to="/carrinho">
            Ver carrinho
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

function CartPage() {
  const navigate = useNavigate();
  const items = useCartStore((state) => state.items);
  const update = useCartStore((state) => state.update);
  const remove = useCartStore((state) => state.remove);
  const cartInput = useMemo(
    () =>
      items.map((item) => ({ productId: item.id, quantity: item.quantity })),
    [items],
  );
  const priced = useQuery({
    queryKey: ["cart-price", cartInput],
    queryFn: () => priceCart(cartInput),
    enabled: items.length > 0,
  });
  const fallbackSubtotalInCents = items.reduce(
    (total, item) => total + item.priceInCents * item.quantity,
    0,
  );
  const subtotalInCents =
    priced.data?.subtotalInCents ?? fallbackSubtotalInCents;
  const onlineTotalInCents = priced.data?.totalInCents ?? subtotalInCents;
  const whatsapp = useMutation({
    mutationFn: () => createWhatsappRequest({ items: cartInput }),
  });

  async function continueOnWhatsapp() {
    const result = await whatsapp.mutateAsync();
    window.location.assign(result.url);
  }

  if (items.length === 0) {
    return (
      <section className="section">
        <EmptyState
          title="Seu carrinho esta vazio"
          body="Escolha produtos no catalogo para iniciar sua compra."
          action={
            <Button onClick={() => navigate("/catalogo")}>
              Ir ao catalogo
            </Button>
          }
        />
      </section>
    );
  }

  return (
    <section className="cart-page">
      <div>
        <h1>Carrinho</h1>
        <motion.div className="cart-lines" layout>
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.article
                animate="visible"
                className="cart-line"
                exit="exit"
                initial="hidden"
                key={item.id}
                layout
                variants={fadeUpVariants}
              >
                <img src={item.imageUrl} alt="" />
                <div>
                  <h2>{item.name}</h2>
                  <p>{item.sku}</p>
                  <strong>{formatMoney(item.priceInCents)}</strong>
                </div>
                <div
                  className="quantity-control"
                  aria-label={`Quantidade de ${item.name}`}
                >
                  <IconButton
                    label="Diminuir quantidade"
                    onClick={() => update(item.id, item.quantity - 1)}
                  >
                    <Minus size={16} />
                  </IconButton>
                  <AnimatePresence initial={false}>
                    <motion.span
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      initial={{ opacity: 0, y: -4 }}
                      key={item.quantity}
                      transition={{
                        duration: motionTokens.duration.fast,
                        ease: motionTokens.easing.outQuart,
                      }}
                    >
                      {item.quantity}
                    </motion.span>
                  </AnimatePresence>
                  <IconButton
                    label="Aumentar quantidade"
                    onClick={() => update(item.id, item.quantity + 1)}
                  >
                    <Plus size={16} />
                  </IconButton>
                </div>
                <IconButton
                  label={`Remover ${item.name}`}
                  onClick={() => remove(item.id)}
                >
                  <Trash2 size={17} />
                </IconButton>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
      <motion.aside
        animate="visible"
        className="summary"
        initial="hidden"
        variants={fadeUpVariants}
        aria-label="Resumo do pedido"
      >
        <h2>Resumo</h2>
        <dl>
          <div>
            <dt>Produtos</dt>
            <dd>{formatMoney(subtotalInCents)}</dd>
          </div>
          <div>
            <dt>Frete</dt>
            <dd>A combinar pelo WhatsApp</dd>
          </div>
          <div>
            <dt>Total dos produtos</dt>
            <dd>{formatMoney(onlineTotalInCents)}</dd>
          </div>
        </dl>
        <div className="checkout-choice">
          <Button loading={whatsapp.isPending} onClick={continueOnWhatsapp}>
            <MessageCircle size={16} />
            Comprar pelo WhatsApp
          </Button>
          <Button variant="secondary" onClick={() => navigate("/checkout")}>
            Comprar online <ArrowRight size={16} />
          </Button>
        </div>
        {whatsapp.isError ? (
          <p className="error-text">{whatsapp.error.message}</p>
        ) : null}
        <p className="shipping-note">
          Frete nao incluido. Pelo WhatsApp, voce combina entrega ou retirada
          diretamente com a loja. O pagamento online continua disponivel como
          alternativa.
        </p>
        {priced.isError ? (
          <p className="error-text">Nao foi possivel validar o carrinho.</p>
        ) : null}
      </motion.aside>
    </section>
  );
}

function CheckoutPage() {
  const navigate = useNavigate();
  const items = useCartStore((state) => state.items);
  const { data: storefront } = useStorefrontSettingsQuery();
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "" });
  const [shippingAcknowledged, setShippingAcknowledged] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<
    "pix_manual" | "mercado_pago" | null
  >(null);
  const [pixOperationId] = useState(() => crypto.randomUUID());
  const paymentMethods = useQuery({
    queryKey: ["checkout-payment-methods"],
    queryFn: getPaymentMethods,
    staleTime: 30_000,
  });
  const selectedPaymentMethod =
    paymentMethod ??
    (paymentMethods.data?.pixManualEnabled ? "pix_manual" : "mercado_pago");
  const cartInput = useMemo(
    () =>
      items.map((item) => ({ productId: item.id, quantity: item.quantity })),
    [items],
  );
  const subtotalInCents = items.reduce(
    (total, item) => total + item.priceInCents * item.quantity,
    0,
  );
  const totalItems = items.reduce((total, item) => total + item.quantity, 0);
  const previewItems = items.slice(0, 3);
  const whatsapp = useMutation({
    mutationFn: () => createWhatsappRequest({ items: cartInput }),
  });
  const checkout = useMutation({
    mutationFn: () =>
      createCheckout({
        customer,
        shippingAcknowledged: true,
        items: cartInput,
      }),
    onSuccess(data) {
      rememberCheckoutAccess(data.orderReference, data.checkoutAccessToken);
      window.location.assign(data.checkoutUrl);
    },
  });
  const pixCheckout = useMutation({
    mutationFn: () =>
      createPixCheckout({
        operationId: pixOperationId,
        customer,
        shippingAcknowledged: true,
        items: cartInput,
      }),
    onSuccess(data) {
      rememberCheckoutAccess(data.orderReference, data.checkoutAccessToken);
      navigate(`/checkout/pix?order=${encodeURIComponent(data.orderReference)}`);
    },
  });

  if (items.length === 0) {
    return (
      <section className="section">
        <EmptyState
          title="Seu carrinho esta vazio"
          body="Escolha produtos no catalogo antes de iniciar o checkout."
          action={
            <Link className="store-button store-button--primary" to="/catalogo">
              Ir ao catalogo
            </Link>
          }
        />
      </section>
    );
  }

  return (
    <section className="checkout-page">
      <div className="checkout-main">
        <div className="checkout-intro">
          <p>Compra segura</p>
          <h1>
            Finalize com acompanhamento {storefront?.brandName ?? "da loja"}
          </h1>
          <p className="checkout-intro__copy">
            Revise seus dados e siga para um pagamento protegido. Se preferir,
            nossa consultoria conclui a compra com voce pelo WhatsApp.
          </p>
        </div>
        <form
          className="checkout-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!shippingAcknowledged) return;
            if (selectedPaymentMethod === "pix_manual") {
              pixCheckout.mutate();
              return;
            }
            checkout.mutate();
          }}
        >
          <section className="checkout-step" aria-labelledby="checkout-contact">
            <div className="checkout-step__heading">
              <span>1</span>
              <div>
                <h2 id="checkout-contact">Contato</h2>
                <p>
                  Usamos estes dados apenas para confirmar o pedido e acompanhar
                  o atendimento.
                </p>
              </div>
            </div>
            <div className="checkout-field-grid">
              <TextField
                label="Nome completo"
                required
                value={customer.name}
                onChange={(event) =>
                  setCustomer({ ...customer, name: event.target.value })
                }
              />
              <TextField
                label="E-mail"
                required
                type="email"
                value={customer.email}
                onChange={(event) =>
                  setCustomer({ ...customer, email: event.target.value })
                }
              />
              <TextField
                label="Telefone"
                required
                value={customer.phone}
                onChange={(event) =>
                  setCustomer({ ...customer, phone: event.target.value })
                }
              />
            </div>
          </section>
          <section
            className="checkout-step"
            aria-labelledby="checkout-delivery"
          >
            <div className="checkout-step__heading">
              <span>2</span>
              <div>
                <h2 id="checkout-delivery">Entrega ou retirada</h2>
                <p>
                  Depois do pagamento, a loja continuara o atendimento pelo
                  WhatsApp para combinar a melhor opcao com voce.
                </p>
              </div>
            </div>
            <p className="checkout-shipping-notice">
              Frete nao incluido. Apos a confirmacao do pagamento, nossa equipe
              entrara em contato pelo WhatsApp para combinar entrega, retirada e
              possiveis custos de frete.
            </p>
          </section>
          <section className="checkout-step" aria-labelledby="checkout-payment">
            <div className="checkout-step__heading">
              <span>3</span>
              <div>
                <h2 id="checkout-payment">Pagamento</h2>
                <p>
                  Escolha Pix para gerar o QR Code agora ou siga para o ambiente
                  seguro do Mercado Pago.
                </p>
              </div>
            </div>
            {paymentMethods.isLoading ? (
              <p className="checkout-payment-loading" aria-live="polite">
                Consultando formas de pagamento...
              </p>
            ) : (
              <fieldset className="checkout-payment-methods">
                <legend>Como deseja pagar?</legend>
                {paymentMethods.data?.pixManualEnabled ? (
                  <label
                    className={
                      selectedPaymentMethod === "pix_manual"
                        ? "checkout-payment-option is-selected"
                        : "checkout-payment-option"
                    }
                  >
                    <input
                      checked={selectedPaymentMethod === "pix_manual"}
                      name="payment-method"
                      onChange={() => setPaymentMethod("pix_manual")}
                      type="radio"
                      value="pix_manual"
                    />
                    <QrCode aria-hidden="true" size={22} />
                    <span>
                      <strong>Pagar via Pix automaticamente</strong>
                      <small>
                        QR Code e copia e cola gerados agora. A loja confirma o
                        pagamento apos receber o comprovante.
                      </small>
                    </span>
                  </label>
                ) : null}
                <label
                  className={
                    selectedPaymentMethod === "mercado_pago"
                      ? "checkout-payment-option is-selected"
                      : "checkout-payment-option"
                  }
                >
                  <input
                    checked={selectedPaymentMethod === "mercado_pago"}
                    name="payment-method"
                    onChange={() => setPaymentMethod("mercado_pago")}
                    type="radio"
                    value="mercado_pago"
                  />
                  <CreditCard aria-hidden="true" size={22} />
                  <span>
                    <strong>Pagar com cartao via Mercado Pago</strong>
                    <small>
                      Finalize o pagamento no ambiente protegido do Mercado
                      Pago.
                    </small>
                  </span>
                </label>
              </fieldset>
            )}
            {whatsapp.isError ? (
              <p className="error-text">{whatsapp.error.message}</p>
            ) : null}
            {checkout.isError ? (
              <p className="error-text">{checkout.error.message}</p>
            ) : null}
            {pixCheckout.isError ? (
              <p className="error-text">{pixCheckout.error.message}</p>
            ) : null}
            <label className="checkout-acknowledgement">
              <input
                type="checkbox"
                checked={shippingAcknowledged}
                onChange={(event) =>
                  setShippingAcknowledged(event.target.checked)
                }
              />
              <span>
                Estou ciente de que o frete ou a retirada sera combinado
                separadamente com a loja pelo WhatsApp.
              </span>
            </label>
            <div className="checkout-actions">
              <Button
                type="submit"
                disabled={!shippingAcknowledged || paymentMethods.isLoading}
                loading={checkout.isPending || pixCheckout.isPending}
              >
                {selectedPaymentMethod === "pix_manual" ? (
                  <>
                    <QrCode size={16} /> Gerar Pix e continuar
                  </>
                ) : (
                  <>
                    <CreditCard size={16} /> Ir para o Mercado Pago
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                loading={whatsapp.isPending}
                onClick={async () => {
                  const result = await whatsapp.mutateAsync();
                  window.location.assign(result.url);
                }}
              >
                <MessageCircle size={16} />
                Atendimento pelo WhatsApp
              </Button>
            </div>
          </section>
        </form>
      </div>
      <aside className="checkout-review" aria-label="Revisao do pedido">
        <div className="checkout-review__header">
          <p>Resumo reservado</p>
          <h2>Seu pedido</h2>
        </div>
        <div className="checkout-review__items">
          {previewItems.map((item) => (
            <article className="checkout-review__item" key={item.id}>
              <img src={item.imageUrl} alt="" />
              <div>
                <strong>{item.name}</strong>
                <span>Quantidade: {item.quantity}</span>
              </div>
              <span>{formatMoney(item.priceInCents * item.quantity)}</span>
            </article>
          ))}
          {items.length > previewItems.length ? (
            <p className="checkout-review__more">
              + {items.length - previewItems.length}{" "}
              {items.length - previewItems.length === 1
                ? "item adicional"
                : "itens adicionais"}
            </p>
          ) : null}
        </div>
        <dl>
          <div>
            <dt>Itens</dt>
            <dd>{totalItems}</dd>
          </div>
          <div>
            <dt>Produtos</dt>
            <dd>{formatMoney(subtotalInCents)}</dd>
          </div>
          <div>
            <dt>Frete</dt>
            <dd>A combinar pelo WhatsApp</dd>
          </div>
          <div>
            <dt>Total dos produtos</dt>
            <dd>{formatMoney(subtotalInCents)}</dd>
          </div>
        </dl>
        <ul className="checkout-reassurance" aria-label="Garantias do checkout">
          <li>O valor e conferido novamente pela loja antes de gerar o pagamento.</li>
          <li>O pagamento inclui somente produtos e descontos aplicaveis.</li>
          <li>O frete ou a retirada sera combinado depois pelo WhatsApp.</li>
        </ul>
      </aside>
    </section>
  );
}

function PixPaymentPage() {
  const [searchParams] = useSearchParams();
  const orderReference = searchParams.get("order") ?? "";
  const token = recallCheckoutAccess(orderReference) ?? "";
  const clear = useCartStore((state) => state.clear);
  const [copied, setCopied] = useState(false);
  const copyFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const payment = useQuery({
    queryKey: ["pix-payment", orderReference, token],
    queryFn: () => getPixPayment(orderReference, token),
    enabled: Boolean(orderReference && token),
    refetchInterval: (query) =>
      query.state.data?.status === "pending_confirmation" ? 5_000 : false,
    retry: 1,
  });
  const whatsappOpen = useMutation({
    mutationFn: () => recordPixWhatsappOpen(orderReference, token),
  });

  useEffect(() => {
    if (payment.data) clear();
  }, [clear, payment.data]);

  useEffect(
    () => () => {
      if (copyFeedbackTimer.current) clearTimeout(copyFeedbackTimer.current);
    },
    [],
  );

  async function copyPixCode() {
    if (!payment.data?.pixCode) return;
    await copyText(payment.data.pixCode);
    setCopied(true);
    if (copyFeedbackTimer.current) clearTimeout(copyFeedbackTimer.current);
    copyFeedbackTimer.current = setTimeout(() => setCopied(false), 2_500);
  }

  function openWhatsapp() {
    if (!payment.data?.whatsappUrl) return;
    whatsappOpen.mutate();
    window.open(payment.data.whatsappUrl, "_blank", "noopener,noreferrer");
  }

  if (!orderReference || !token) {
    return (
      <InfoPanel
        icon={<QrCode />}
        title="Pagamento Pix nao encontrado"
        body="Volte ao carrinho e gere um novo pagamento para continuar com seguranca."
      />
    );
  }

  if (payment.isLoading) {
    return (
      <section className="pix-payment-page" aria-live="polite">
        <Skeleton className="pix-payment-skeleton" />
      </section>
    );
  }

  if (payment.isError || !payment.data) {
    return (
      <InfoPanel
        icon={<QrCode />}
        title="Nao foi possivel carregar o Pix"
        body="O pedido continua protegido. Tente consultar os dados novamente."
        action={<Button onClick={() => payment.refetch()}>Tentar novamente</Button>}
      />
    );
  }

  const approved = payment.data.status === "approved";
  const rejected = payment.data.status === "rejected";

  return (
    <section className="pix-payment-page">
      <header className="pix-payment-heading">
        <p>Pedido {payment.data.orderReference}</p>
        <h1>Pagamento via Pix</h1>
        <p>
          Escaneie o QR Code ou copie o codigo. Depois, envie o comprovante para
          a loja confirmar o pagamento.
        </p>
      </header>

      <div className="pix-payment-layout">
        <article className="pix-payment-card">
          <div className="pix-payment-qr">
            <img
              alt={`QR Code Pix do pedido ${payment.data.orderReference}`}
              height="360"
              src={payment.data.qrCodeDataUrl}
              width="360"
            />
          </div>
          <div className="pix-payment-amount">
            <span>Valor dos produtos</span>
            <strong>{formatMoney(payment.data.amountInCents)}</strong>
          </div>
          <label className="pix-copy-field">
            <span>Pix copia e cola</span>
            <textarea readOnly rows={3} value={payment.data.pixCode} />
          </label>
          <Button onClick={copyPixCode} type="button">
            {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
            {copied ? "Pix copiado!" : "Copiar codigo Pix"}
          </Button>
          <span className="sr-only" aria-live="polite">
            {copied ? "Codigo Pix copiado para a area de transferencia." : ""}
          </span>
        </article>

        <aside className="pix-payment-instructions">
          <div
            className={`pix-payment-status${approved ? " is-approved" : ""}${
              rejected ? " is-rejected" : ""
            }`}
            role="status"
          >
            {approved ? <CheckCircle2 size={22} /> : <Clock3 size={22} />}
            <div>
              <strong>
                {approved
                  ? "Pagamento confirmado"
                  : rejected
                    ? "Pagamento nao confirmado"
                    : "Aguardando confirmacao da loja"}
              </strong>
              <span>
                {approved
                  ? "A loja ja registrou o recebimento do Pix."
                  : rejected
                    ? "Fale com a loja para revisar o comprovante ou refazer o pedido."
                    : "A confirmacao e manual e pode levar alguns minutos apos o envio do comprovante."}
              </span>
            </div>
          </div>
          <ol>
            <li>Abra o aplicativo do seu banco.</li>
            <li>Escolha pagar via Pix e use o QR Code ou o copia e cola.</li>
            <li>Confira o valor antes de concluir.</li>
            <li>Envie o comprovante pelo WhatsApp abaixo.</li>
          </ol>
          <Button
            loading={whatsappOpen.isPending}
            onClick={openWhatsapp}
            type="button"
            variant="secondary"
          >
            <MessageCircle size={18} /> Enviar comprovante pelo WhatsApp
          </Button>
          {whatsappOpen.isError ? (
            <p className="error-text">Nao foi possivel registrar o acesso ao WhatsApp.</p>
          ) : null}
          <p className="shipping-note">
            Frete ou retirada continuam a combinar diretamente com a loja.
          </p>
        </aside>
      </div>
    </section>
  );
}

function AccountPage() {
  return (
    <InfoPanel
      icon={<UserRound />}
      title="Conta do cliente"
      body="Area preparada para perfil, enderecos e preferencias com autorizacao por recurso."
    />
  );
}

function OrdersPage() {
  return (
    <InfoPanel
      icon={<ShoppingBag />}
      title="Historico de pedidos"
      body="Os pedidos serao exibidos por referencia publica e somente para o cliente autenticado."
    />
  );
}

function SupportPage() {
  const { data: storefront } = useStorefrontSettingsQuery();
  const support = useQuery({
    queryKey: ["support-whatsapp"],
    queryFn: getSupportWhatsappUrl,
  });

  return (
    <InfoPanel
      icon={<MessageCircle />}
      title={`Suporte ${storefront?.brandName ?? "da loja"}`}
      body="Atendimento para duvidas de produto, entrega e compra assistida."
      action={
        <div className="info-panel__actions">
          <a
            className="store-button store-button--primary"
            href={support.data?.url ?? "#"}
            aria-disabled={!support.data}
          >
            <MessageCircle size={16} />
            Falar no WhatsApp
          </a>
          {storefront?.contactEmail ? (
            <a
              className="store-button store-button--secondary"
              href={`mailto:${storefront.contactEmail}`}
            >
              Enviar email
            </a>
          ) : null}
        </div>
      }
    />
  );
}

function PrivacyPage() {
  return (
    <InfoPanel
      icon={<Search />}
      title="Privacidade"
      body="Dados pessoais devem ser usados apenas para atendimento, pedidos, seguranca e obrigacoes legais."
    />
  );
}

function CheckoutReturnPage() {
  const [searchParams] = useSearchParams();
  const [checkoutAccess] = useState(() => {
    const orderReference = searchParams.get("order") ?? "";
    return {
      orderReference,
      token:
        searchParams.get("token") ?? recallCheckoutAccess(orderReference) ?? "",
    };
  });
  const { orderReference, token } = checkoutAccess;
  const clear = useCartStore((state) => state.clear);
  const status = useQuery({
    queryKey: ["checkout-status", orderReference, token],
    queryFn: () => getCheckoutStatus(orderReference, token),
    enabled: Boolean(orderReference && token),
    refetchInterval: (query) =>
      ["created", "pending"].includes(
        query.state.data?.paymentStatus ?? "pending",
      )
        ? 2500
        : false,
    retry: 2,
  });
  const whatsappOpen = useMutation({
    mutationFn: () => recordCheckoutWhatsappOpen(orderReference, token),
  });

  useEffect(() => {
    if (!token || !window.location.search.includes("token=")) return;
    const safeUrl = new URL(window.location.href);
    safeUrl.searchParams.delete("token");
    window.history.replaceState({}, "", `${safeUrl.pathname}${safeUrl.search}`);
  }, [token]);

  useEffect(() => {
    if (status.data?.paymentStatus === "approved") clear();
  }, [clear, status.data?.paymentStatus]);

  async function openWhatsapp() {
    if (!status.data?.whatsappUrl) return;
    await whatsappOpen.mutateAsync();
    window.open(status.data.whatsappUrl, "_blank", "noopener,noreferrer");
  }

  if (!orderReference || !token) {
    return (
      <InfoPanel
        icon={<ShoppingBag />}
        title="Retorno incompleto"
        body="Nao foi possivel identificar este checkout. Consulte a loja usando a referencia publica do pedido."
      />
    );
  }

  if (status.isLoading) {
    return (
      <section className="checkout-return" aria-live="polite">
        <Skeleton className="checkout-return__skeleton" />
      </section>
    );
  }

  if (status.isError || !status.data) {
    return (
      <InfoPanel
        icon={<ShoppingBag />}
        title="Nao foi possivel consultar o pagamento"
        body="A confirmacao depende do estado validado pela loja. Tente novamente em instantes."
        action={
          <Button onClick={() => status.refetch()}>Tentar novamente</Button>
        }
      />
    );
  }

  const approved = status.data.paymentStatus === "approved";
  const pending = ["created", "pending"].includes(status.data.paymentStatus);
  return (
    <section className="checkout-return" aria-live="polite">
      <div className="checkout-return__status">
        {approved ? (
          <CheckCircle2 aria-hidden="true" />
        ) : pending ? (
          <Clock3 aria-hidden="true" />
        ) : (
          <X aria-hidden="true" />
        )}
        <p>
          {approved
            ? "Pagamento confirmado"
            : pending
              ? "Confirmando pagamento"
              : "Pagamento nao aprovado"}
        </p>
        <h1>
          {approved
            ? "Agora vamos combinar a entrega"
            : pending
              ? "Aguardando o Mercado Pago"
              : "Pagamento nao concluido"}
        </h1>
        <span>Pedido {status.data.orderReference}</span>
        <p>
          {approved
            ? "Os produtos foram pagos. O frete ou a retirada sera combinado diretamente com a loja pelo WhatsApp."
            : pending
              ? "Esta pagina atualiza automaticamente assim que o webhook for validado pela loja."
              : "Nenhum atendimento de entrega foi iniciado. Voce pode retornar ao carrinho e tentar novamente."}
        </p>
        {approved ? (
          <Button loading={whatsappOpen.isPending} onClick={openWhatsapp}>
            <MessageCircle size={17} />
            Abrir conversa no WhatsApp
          </Button>
        ) : null}
        {whatsappOpen.isError ? (
          <p className="error-text">
            Nao foi possivel registrar o acionamento. O pagamento continua
            confirmado.
          </p>
        ) : null}
      </div>
      <aside
        className="checkout-return__summary"
        aria-label="Resumo confirmado"
      >
        <h2>Resumo do pedido</h2>
        {status.data.items.map((item) => (
          <div className="checkout-return__item" key={item.productId}>
            <img src={item.imageUrl} alt="" />
            <span>
              <strong>{item.name}</strong>
              Quantidade: {item.quantity}
            </span>
            <b>{formatMoney(item.subtotalInCents)}</b>
          </div>
        ))}
        <dl>
          <div>
            <dt>Total pago</dt>
            <dd>{formatMoney(status.data.totalPaidInCents)}</dd>
          </div>
          <div>
            <dt>Frete</dt>
            <dd>
              {status.data.shippingAmountInCents == null
                ? "A combinar pelo WhatsApp"
                : formatMoney(status.data.shippingAmountInCents)}
            </dd>
          </div>
        </dl>
      </aside>
    </section>
  );
}

function InfoPanel({
  title,
  body,
  icon,
  action,
}: {
  title: string;
  body: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <motion.section
      animate="visible"
      className="info-panel"
      initial="hidden"
      variants={staggerContainerVariants}
    >
      <motion.div aria-hidden="true" variants={fadeUpVariants}>
        {icon}
      </motion.div>
      <motion.h1 variants={fadeUpVariants}>{title}</motion.h1>
      <motion.p variants={fadeUpVariants}>{body}</motion.p>
      <motion.div variants={fadeUpVariants}>
        {action ?? (
          <Link className="store-button store-button--secondary" to="/catalogo">
            Voltar ao catalogo
          </Link>
        )}
      </motion.div>
    </motion.section>
  );
}

export default function App() {
  return <Layout />;
}
