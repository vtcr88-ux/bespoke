import { chromium } from "@playwright/test";
import {
  defaultFooterLinks,
  defaultHomeMotionByBlock,
  defaultHomeSections,
  defaultManifestoItems,
  defaultStorefrontTextStyles,
} from "../packages/contracts/dist/index.js";

const adminUrl = process.env.ADMIN_URL ?? "http://127.0.0.1:5180";
const webUrl = process.env.WEB_URL ?? "http://127.0.0.1:5179";
const apiHosts = new Set(["127.0.0.1:3333", "localhost:3333"]);

const heroImageUrl = "http://127.0.0.1:3333/mock/hero.svg";
const productImageUrl = "http://127.0.0.1:3333/mock/product.svg";

const storefrontSettings = {
  settingsVersion: 2,
  brandName: "Atelie Aurora",
  legalName: "Atelie Aurora Comercio Digital",
  logoUrl: "",
  logoOnDarkUrl: "",
  faviconUrl: "",
  socialImageUrl: heroImageUrl,
  contactEmail: "contato@atelieaurora.com.br",
  defaultMetaTitle: "Atelie Aurora | Catalogo",
  defaultMetaDescription:
    "Curadoria de pecas autorais para comprar online ou pelo WhatsApp.",
  heroImageUrl,
  heroEyebrow: "Nova curadoria",
  heroEyebrowFontSize: 12,
  heroTitle: "Atelie Aurora",
  heroTitleFontSize: 56,
  manifestoLineOne: "PECAS AUTORAIS COM PRESENCA",
  manifestoLineTwo: "ESCOLHIDAS PARA UMA ROTINA MAIS CRIATIVA",
  manifestoItems: defaultManifestoItems.map((item) => ({ ...item })),
  manifestoMaxWidth: 880,
  manifestoDivider: "line",
  editorialCatalogLabel: "Explorar catalogo",
  editorialSupportLabel: "Atendimento",
  editorialOrdersLabel: "Meus pedidos",
  editorialAccountLabel: "Minha conta",
  editorialNavigationMobileEnabled: true,
  heroHeight: "balanced",
  featuredEyebrow: "Selecao inicial",
  featuredTitle: "Produtos em destaque",
  featuredLinkLabel: "Ver todos",
  featuredAddButtonLabel: "Adicionar",
  featuredAddedButtonLabel: "Adicionado",
  homeLayout: "editorial",
  productCardStyle: "boutique",
  imageFit: "contain",
  homeSections: defaultHomeSections.map((section) => ({ ...section })),
  homeSectionSpacing: "balanced",
  homeTransitionPreset: "editorial",
  homeTransitionOverlap: 64,
  homeTransitionOpacity: 82,
  homeDepthIntensity: "balanced",
  homeMotionEnabled: true,
  homeMotionPreset: "editorial",
  homeMotionByBlock: { ...defaultHomeMotionByBlock },
  homeMotionIntensity: "balanced",
  homeTextStyles: {
    heroEyebrow: { ...defaultStorefrontTextStyles.heroEyebrow },
    heroTitle: { ...defaultStorefrontTextStyles.heroTitle },
    manifesto: { ...defaultStorefrontTextStyles.manifesto },
    navigation: { ...defaultStorefrontTextStyles.navigation },
    featuredEyebrow: { ...defaultStorefrontTextStyles.featuredEyebrow },
    featuredTitle: { ...defaultStorefrontTextStyles.featuredTitle },
    productCardTitle: { ...defaultStorefrontTextStyles.productCardTitle },
    footerSlogan: { ...defaultStorefrontTextStyles.footerSlogan },
  },
  storefrontFont: "signature",
  adminFont: "signature",
  footerSlogan:
    "Curadoria reservada, atendimento proximo e escolhas feitas com calma.",
  footerShowBrandName: true,
  footerHeading: "Loja",
  footerServiceHeading: "Atendimento",
  footerServiceLineOne: "Seg-Sex - 9h as 19h",
  footerServiceLineTwo: "Sabado - 9h as 14h",
  footerWhatsappButtonLabel: "Atendimento WhatsApp",
  footerWhatsappLinkLabel: "Falar agora",
  footerCopyrightText: "(c) {{year}} {{brand}} - Todos os direitos reservados.",
  footerSecurityText: "Pagamento seguro",
  footerLinks: defaultFooterLinks.map((link) => ({ ...link })),
  footerPrivacyLabel: "Privacidade",
  footerCatalogLabel: "Catalogo",
  footerSupportLabel: "Suporte",
  whatsappNumber: "5511999999999",
  whatsappPurchaseMessage:
    "Gostaria de confirmar disponibilidade e combinar os proximos passos diretamente com a loja.",
  postPaymentWhatsappMessage:
    "Meu pagamento foi confirmado. Gostaria de combinar o frete ou a retirada com a equipe.",
  primaryColor: "#090907",
  accentColor: "#c9a76d",
  footerColor: "#7a5a25",
  backgroundColor: "#ffffff",
  homeSurfaceColor: "#faf8f4",
  homeAlternateColor: "#f3efe8",
  homeSecondaryTextColor: "#5c584f",
  homeBorderColor: "#d8d1c5",
  homeShadowColor: "#090907",
  homeTransitionStartColor: "#c9a76d",
  homeTransitionEndColor: "#faf8f4",
};

const products = [
  makeProduct("00000000-0000-4000-8000-000000000501", "vestido-linho", 1),
  makeProduct("00000000-0000-4000-8000-000000000502", "bolsa-couro", 2),
  makeProduct("00000000-0000-4000-8000-000000000503", "colar-aurora", 3),
];

function makeProduct(id, slug, order) {
  return {
    id,
    slug,
    sku: `AA-${String(order).padStart(3, "0")}`,
    name: order === 1 ? "Vestido Linho" : order === 2 ? "Bolsa Couro" : "Colar Aurora",
    subtitle: "Edicao limitada",
    description:
      "Produto de curadoria autoral com acabamento cuidadoso e pronta disponibilidade para venda online.",
    category: {
      id: "00000000-0000-4000-8000-000000000401",
      slug: "curadoria",
      name: "Curadoria",
      description: null,
    },
    priceInCents: 18990 + order * 1000,
    compareAtPriceInCents: null,
    stock: 8,
    lowStockThreshold: 2,
    lowStockWarningEnabled: true,
    images: [
      {
        id: `00000000-0000-4000-8000-00000000060${order}`,
        url: productImageUrl,
        alt: "Produto em fundo claro",
        width: 1200,
        height: 900,
        contentType: "image/webp",
        sizeBytes: 1024,
      },
    ],
    tags: ["curadoria", "pronta-entrega"],
    isActive: true,
    isFeatured: true,
    sortOrder: order,
  };
}

async function installRoutes(context) {
  await context.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (!apiHosts.has(requestUrl.host)) return route.continue();

    if (requestUrl.pathname === "/mock/hero.svg") {
      return route.fulfill({
        status: 200,
        contentType: "image/svg+xml",
        body: mockHeroSvg(),
      });
    }

    if (requestUrl.pathname === "/mock/product.svg") {
      return route.fulfill({
        status: 200,
        contentType: "image/svg+xml",
        body: mockProductSvg(),
      });
    }

    if (requestUrl.pathname === "/admin/auth/session") {
      return json(route, {
        admin: { email: "admin@atelieaurora.com.br", role: "owner" },
        csrfToken: "qa-token",
        expiresAt: "2026-08-06T23:59:59.000Z",
      });
    }

    if (requestUrl.pathname === "/admin/runtime") {
      return json(route, {
        instanceId: "qa",
        publicApiUrl: "http://127.0.0.1:3333",
        publicWebUrl: webUrl,
      });
    }

    if (
      requestUrl.pathname === "/admin/storefront" ||
      requestUrl.pathname === "/storefront/settings"
    ) {
      return json(route, storefrontSettings);
    }

    if (requestUrl.pathname === "/catalog/products") {
      return json(route, { items: products, nextCursor: null });
    }

    if (requestUrl.pathname === "/catalog/categories") {
      return json(route, {
        items: [
          {
            id: "00000000-0000-4000-8000-000000000401",
            slug: "curadoria",
            name: "Curadoria",
            description: null,
          },
        ],
      });
    }

    return json(route, {});
  });
}

function json(route, body) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function mockHeroSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900"><rect width="1600" height="900" fill="#e8dfcf"/><rect x="940" y="130" width="390" height="610" rx="190" fill="#8a6a39"/><rect x="240" y="190" width="560" height="520" rx="28" fill="#f8f4ea"/><path d="M305 640 C475 470 610 490 735 315" fill="none" stroke="#c9a76d" stroke-width="22" stroke-linecap="round"/><circle cx="410" cy="310" r="86" fill="#c9a76d" opacity=".42"/></svg>`;
}

function mockProductSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900"><rect width="1200" height="900" fill="#f6f0e6"/><rect x="390" y="155" width="420" height="590" rx="210" fill="#d4bd91"/><path d="M505 300h190l60 330H445z" fill="#ffffff"/><path d="M530 300c25-76 139-76 164 0" fill="none" stroke="#7a5a25" stroke-width="24" stroke-linecap="round"/></svg>`;
}

async function runViewport(browser, name, viewport) {
  const context = await browser.newContext({ viewport });
  await installRoutes(context);
  const page = await context.newPage();
  const problems = [];
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console: ${message.text()}`);
  });

  await page.goto(`${adminUrl}/aparencia`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Vitrine publica" }).waitFor();
  await page.getByRole("tab", { name: /Capa e textos/ }).click();
  await page.getByRole("tab", { name: /Layout da Home/ }).click();
  await page.getByRole("tab", { name: /Rodape/ }).click();
  await page.getByRole("tab", { name: /Busca/ }).click();
  await page.getByRole("tab", { name: /Movimento/ }).click();
  await page.getByRole("tab", { name: /Identidade/ }).click();
  await page.waitForTimeout(800);

  const screenshotPath = `.tmp/vitrine-${name}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const metrics = await page.evaluate(() => {
    const textClips = [...document.querySelectorAll(
      ".appearance-tabs strong, .appearance-guide p, .editor-section__title h3",
    )]
      .filter((element) => element.scrollWidth > element.clientWidth + 1)
      .map((element) => element.textContent?.trim());
    const buttons = [...document.querySelectorAll(".appearance-tabs button")].map(
      (button) => {
        const rect = button.getBoundingClientRect();
        return {
          text: button.textContent?.replace(/\s+/g, " ").trim(),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      },
    );
    const shell = document.querySelector(".admin-shell");
    const tabs = document.querySelector(".appearance-tabs");
    return {
      activeGuide: document.querySelector(".appearance-guide p")?.textContent?.trim(),
      bodyFont: getComputedStyle(document.body).fontFamily,
      shellFont: shell ? getComputedStyle(shell).fontFamily : null,
      tabsColumns: tabs ? getComputedStyle(tabs).gridTemplateColumns : null,
      previewStatus:
        document.querySelector(".storefront-live-preview__status")?.textContent?.trim() ??
        null,
      buttons,
      textClips,
    };
  });

  await context.close();
  return { name, screenshotPath, problems, metrics };
}

const browser = await chromium.launch();
const results = [];
try {
  results.push(await runViewport(browser, "desktop", { width: 1440, height: 1050 }));
  results.push(await runViewport(browser, "mobile", { width: 390, height: 1100 }));
} finally {
  await browser.close();
}

console.log(JSON.stringify(results, null, 2));

const failures = results.flatMap((result) => {
  const smallTargets = result.metrics.buttons.filter((button) => button.height < 44);
  return [
    ...result.problems,
    ...result.metrics.textClips.map((clip) => `texto cortado: ${clip}`),
    ...smallTargets.map((button) => `alvo menor que 44px: ${button.text}`),
  ];
});

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
