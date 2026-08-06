// @ts-check
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
const uploadedUrl = "http://127.0.0.1:3333/uploads/images/playwright.png";
const portraitProductUrl =
  "http://127.0.0.1:3333/uploads/images/playwright-portrait.svg";
const portraitProductSvg = Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1536" viewBox="0 0 1024 1536">
    <rect x="292" y="160" width="440" height="124" rx="34" fill="#2457a7" />
    <path d="M332 284h360l44 128v820c0 80-64 144-144 144H432c-80 0-144-64-144-144V412z" fill="#ffffff" stroke="#d8dce5" stroke-width="18" />
    <rect x="330" y="590" width="364" height="420" rx="20" fill="#f6f8fc" />
    <text x="512" y="760" fill="#2457a7" font-family="Arial, sans-serif" font-size="74" text-anchor="middle">Produto</text>
    <text x="512" y="850" fill="#323a48" font-family="Arial, sans-serif" font-size="42" text-anchor="middle">1024 x 1536</text>
  </svg>
`);
const paddedHorizontalLogoUrl = `data:image/svg+xml,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024">
    <g fill="#090907">
      <rect x="288" y="408" width="184" height="208" rx="16" />
      <rect x="520" y="452" width="700" height="120" rx="12" />
    </g>
  </svg>
`)}`;
const responsiveWidths = [320, 360, 375, 390, 430, 768, 1024, 1280, 1440];
const adminOrigin = "http://localhost:4174";
const webOrigin = "http://localhost:4173";

const contentTypes = {
  ".css": "text/css",
  ".html": "text/html",
  ".js": "text/javascript",
  ".map": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

async function serveBuiltApp(page, origin, relativeDistPath) {
  const distRoot = resolve(process.cwd(), relativeDistPath);
  await page.route(`${origin}/**`, async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const assetPath = pathname.startsWith("/assets/")
      ? resolve(distRoot, `.${pathname}`)
      : resolve(distRoot, "index.html");
    const isSafeAsset =
      assetPath === resolve(distRoot, "index.html") ||
      assetPath.startsWith(`${distRoot}${sep}`);
    if (!isSafeAsset) {
      await route.fulfill({ status: 404, body: "Not found" });
      return;
    }

    await route.fulfill({
      body: await readFile(assetPath),
      contentType:
        contentTypes[extname(assetPath)] ?? "application/octet-stream",
    });
  });
  await page.route("**/catalog/categories", (route) =>
    fulfillCorsJson(route, categories, origin),
  );
  await page.route("**/admin/auth/session", (route) =>
    fulfillCorsJson(
      route,
      {
        admin: { email: "owner@example.test", role: "owner" },
        csrfToken: "playwright-csrf-token",
        expiresAt: "2099-01-01T00:00:00.000Z",
      },
      origin,
    ),
  );
}

async function fulfillCorsJson(route, json, origin, status = 200) {
  const headers = {
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "authorization, content-type, x-csrf-token",
    "access-control-allow-methods": "GET, PATCH, POST, PUT, DELETE, OPTIONS",
    "access-control-allow-origin": origin,
  };

  if (route.request().method() === "OPTIONS") {
    await route.fulfill({ status: 204, headers });
    return false;
  }

  await route.fulfill({ status, headers, json });
  return true;
}

const storefront = {
  brandName: "Bespoke",
  logoUrl: "",
  heroImageUrl: uploadedUrl,
  heroEyebrow: "Loja Bespoke",
  heroTitle: "Bespoke",
  manifestoLineOne: "UMA EXPERIENCIA EXCLUSIVA, SOFISTICADA",
  manifestoLineTwo: "CUIDADOSAMENTE SELECIONADA PARA QUEM VALORIZA PRESENCA",
  editorialCatalogLabel: "Explorar catalogo",
  editorialSupportLabel: "Atendimento exclusivo",
  heroHeight: "balanced",
  featuredEyebrow: "Selecao inicial",
  featuredTitle: "Produtos em destaque",
  featuredLinkLabel: "Ver todos",
  featuredAddButtonLabel: "Adicionar",
  featuredAddedButtonLabel: "Adicionado",
  homeLayout: "editorial",
  productCardStyle: "boutique",
  imageFit: "contain",
  storefrontFont: "signature",
  adminFont: "signature",
  footerSlogan:
    "Curadoria reservada, cuidado impecavel e escolhas feitas para poucos.",
  footerShowBrandName: true,
  footerHeading: "Loja",
  footerServiceHeading: "Atendimento",
  footerServiceLineOne: "Seg-Sex · 9h as 19h",
  footerServiceLineTwo: "Sabado · 9h as 14h",
  footerWhatsappButtonLabel: "Atendimento WhatsApp",
  footerWhatsappLinkLabel: "Falar agora",
  footerCopyrightText:
    "\u00a9 {{year}} {{brand}} · Todos os direitos reservados.",
  footerSecurityText: "Pagamento seguro",
  footerLinks: [
    {
      id: "00000000-0000-4000-8000-000000000101",
      label: "Privacidade",
      href: "/privacidade",
      iconUrl: "",
    },
    {
      id: "00000000-0000-4000-8000-000000000102",
      label: "Catalogo",
      href: "/catalogo",
      iconUrl: "",
    },
    {
      id: "00000000-0000-4000-8000-000000000103",
      label: "Suporte",
      href: "/suporte",
      iconUrl: "",
    },
  ],
  footerPrivacyLabel: "Privacidade",
  footerCatalogLabel: "Catalogo",
  footerSupportLabel: "Suporte",
  whatsappNumber: "5511999999999",
  whatsappPurchaseMessage:
    "Gostaria de confirmar disponibilidade diretamente com a loja.",
  postPaymentWhatsappMessage:
    "Gostaria de combinar o frete ou a retirada com a equipe.",
  primaryColor: "#090907",
  accentColor: "#c9a76d",
  footerColor: "#c9a76d",
  backgroundColor: "#ffffff",
};

const product = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
  slug: "produto-playwright",
  sku: "BSP-PW-001",
  name: "Produto Playwright",
  subtitle: "Imagem enviada pelo painel",
  description:
    "Produto usado para validar visualmente o upload administrativo.",
  category: {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "chas-soluveis",
    name: "Ch\u00e1s Sol\u00faveis",
    description: null,
  },
  priceInCents: 28900,
  compareAtPriceInCents: null,
  stock: 8,
  lowStockThreshold: 2,
  lowStockWarningEnabled: false,
  images: [
    {
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      url: uploadedUrl,
      alt: "Produto Playwright",
      width: 1,
      height: 1,
    },
  ],
  tags: [],
  isActive: true,
  isFeatured: true,
  sortOrder: 10,
};

const featuredProducts = [
  "Produto Essencial",
  "Selecao Equilibrio",
  "Cuidado Diario",
  "Ritual Completo",
].map((name, index) => ({
  ...product,
  id: `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa${index + 1}`,
  slug: `produto-playwright-${index + 1}`,
  sku: `BSP-PW-00${index + 1}`,
  name,
  priceInCents: 9500 + index * 4700,
  sortOrder: (index + 1) * 10,
  images: product.images.map((image) => ({
    ...image,
    id: `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb${index + 1}`,
    alt: name,
  })),
}));

const categories = {
  items: [
    product.category,
    {
      id: "22222222-2222-4222-8222-222222222222",
      slug: "encapsulados",
      name: "Encapsulados",
      description: null,
    },
    {
      id: "33333333-3333-4333-8333-333333333333",
      slug: "injetaveis",
      name: "Injet\u00e1veis",
      description: null,
    },
    {
      id: "44444444-4444-4444-8444-444444444444",
      slug: "suplementacoes",
      name: "Suplementa\u00e7\u00f5es",
      description: null,
    },
  ],
};

async function mockUploadedImage(page) {
  await page.route(uploadedUrl, (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: png }),
  );
}

async function mockPortraitProductImage(page) {
  await page.route(portraitProductUrl, (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: portraitProductSvg,
    }),
  );
}

async function expectNoHorizontalOverflow(page) {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
}

async function expectCategoryMenuAnchored(editor) {
  const field = editor.getByRole("combobox", { name: "Categoria" });
  const menu = editor.getByRole("listbox", { name: "Categorias salvas" });
  await expect(field).toHaveAttribute("aria-expanded", "true");
  await expect(menu).toBeVisible();
  const [fieldBox, menuBox] = await Promise.all([
    field.boundingBox(),
    menu.boundingBox(),
  ]);
  expect(fieldBox).not.toBeNull();
  expect(menuBox).not.toBeNull();
  expect(Math.abs(menuBox.x - fieldBox.x)).toBeLessThanOrEqual(1);
  expect(
    Math.abs(menuBox.x + menuBox.width - (fieldBox.x + fieldBox.width)),
  ).toBeLessThanOrEqual(1);
  expect(menuBox.y).toBeGreaterThanOrEqual(fieldBox.y + fieldBox.height);
}

test("admin cadastra produto com categoria livre sem expor campos internos", async ({
  browserName,
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await serveBuiltApp(page, adminOrigin, "apps/admin/dist");
  await mockUploadedImage(page);
  const categoryItems = [
    ...categories.items,
    ...Array.from({ length: 12 }, (_, index) => ({
      id: `55555555-5555-4555-8555-${String(index + 1).padStart(12, "0")}`,
      slug: `categoria-${index + 1}`,
      name: `Categoria personalizada ${index + 1}`,
      description: null,
    })),
  ];
  const customCategory = {
    id: "66666666-6666-4666-8666-666666666666",
    slug: "colecoes-sazonais",
    name: "Colecoes sazonais",
    description: null,
  };
  let savedCategory;
  let savedProduct;
  let savedProductUpdate;
  let adminProductItems = [];
  await page.route("**/catalog/categories", (route) =>
    fulfillCorsJson(route, { items: categoryItems }, adminOrigin),
  );
  await page.route("**/admin/categories", async (route) => {
    savedCategory = route.request().postDataJSON();
    categoryItems.push(customCategory);
    await fulfillCorsJson(route, customCategory, adminOrigin, 201);
  });
  await page.route("**/admin/products", async (route) => {
    if (route.request().method() === "POST") {
      savedProduct = route.request().postDataJSON();
      const createdProduct = {
        ...product,
        ...savedProduct,
        category: customCategory,
        slug: "produto-categoria-livre",
        sku: "PRD-PRODUTOCATE",
        images: [
          {
            ...product.images[0],
            url: savedProduct.imageUrl,
            alt: savedProduct.imageAlt,
          },
        ],
      };
      adminProductItems = [
        {
          id: createdProduct.id,
          sku: createdProduct.sku,
          slug: createdProduct.slug,
          name: createdProduct.name,
          subtitle: createdProduct.subtitle,
          description: createdProduct.description,
          category: customCategory.name,
          categorySlug: customCategory.slug,
          priceInCents: createdProduct.priceInCents,
          compareAtPriceInCents: createdProduct.compareAtPriceInCents,
          stock: createdProduct.stock,
          lowStockThreshold: createdProduct.lowStockThreshold,
          lowStockWarningEnabled: createdProduct.lowStockWarningEnabled,
          status: createdProduct.isActive ? "active" : "inactive",
          lowStock: createdProduct.stock <= createdProduct.lowStockThreshold,
          imageUrl: createdProduct.images[0].url,
          imageAlt: createdProduct.images[0].alt,
          imageWidth: savedProduct.imageWidth,
          imageHeight: savedProduct.imageHeight,
          imageContentType: savedProduct.imageContentType,
          imageSizeBytes: savedProduct.imageSizeBytes,
          isFeatured: createdProduct.isFeatured,
          sortOrder: createdProduct.sortOrder,
        },
      ];
      await fulfillCorsJson(route, createdProduct, adminOrigin, 201);
      return;
    }
    await fulfillCorsJson(route, { items: adminProductItems }, adminOrigin);
  });
  await page.route("**/admin/products/*", async (route) => {
    if (route.request().method() !== "PUT") {
      await route.fallback();
      return;
    }
    savedProductUpdate = route.request().postDataJSON();
    const selectedCategory = categoryItems.find(
      (category) => category.slug === savedProductUpdate.categorySlug,
    );
    adminProductItems = adminProductItems.map((item) => ({
      ...item,
      ...savedProductUpdate,
      category: selectedCategory.name,
      categorySlug: selectedCategory.slug,
      status: savedProductUpdate.isActive ? "active" : "inactive",
      lowStock:
        savedProductUpdate.stock <= savedProductUpdate.lowStockThreshold,
      imageUrl: savedProductUpdate.imageUrl,
      imageAlt: savedProductUpdate.imageAlt,
    }));
    await fulfillCorsJson(
      route,
      {
        ...product,
        ...savedProductUpdate,
        id: adminProductItems[0].id,
        sku: adminProductItems[0].sku,
        slug: adminProductItems[0].slug,
        category: selectedCategory,
        images: [
          {
            ...product.images[0],
            url: savedProductUpdate.imageUrl,
            alt: savedProductUpdate.imageAlt,
          },
        ],
      },
      adminOrigin,
    );
  });
  await page.route("**/admin/storefront", (route) =>
    fulfillCorsJson(route, storefront, adminOrigin),
  );

  let uploads = 0;
  let uploadHeaders;
  let uploadBody;
  await page.route("**/admin/uploads/images", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await fulfillCorsJson(route, {}, adminOrigin);
      return;
    }
    uploads += 1;
    uploadHeaders = route.request().headers();
    uploadBody = route.request().postDataBuffer();
    await fulfillCorsJson(
      route,
      {
        url: uploadedUrl,
        width: 1,
        height: 1,
        contentType: "image/png",
        sizeBytes: png.length,
      },
      adminOrigin,
      201,
    );
  });

  await page.goto(`${adminOrigin}/produtos`);
  await page.getByRole("button", { name: "Novo produto" }).click();
  const editor = page.locator(".product-editor");
  await expect(page.getByLabel("URL da imagem principal")).toHaveCount(0);
  await expect(editor.getByLabel("SKU")).toHaveCount(0);
  await expect(editor.getByLabel("Slug publico")).toHaveCount(0);
  await expect(
    editor.getByRole("switch", { name: /Aviso desativado/ }),
  ).toHaveAttribute("aria-checked", "false");
  const categoryField = editor.getByRole("combobox", {
    name: "Categoria",
    exact: true,
  });
  await expect(categoryField).toHaveValue("");
  await expect(categoryField).not.toHaveAttribute("list", /.+/);
  const categoryToggle = editor.getByRole("button", {
    name: "Mostrar categorias salvas",
  });
  await categoryToggle.click();
  await expectCategoryMenuAnchored(editor);
  await expect(
    editor.getByRole("option", {
      name: "Ch\u00e1s Sol\u00faveis",
      exact: true,
    }),
  ).toBeVisible();
  const categoryMenu = editor.getByRole("listbox", {
    name: "Categorias salvas",
  });
  await expect(categoryMenu).toHaveCSS("overflow-y", "auto");
  expect(
    await categoryMenu.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    ),
  ).toBe(true);
  await categoryField.press("Escape");
  await expect(categoryField).toHaveAttribute("aria-expanded", "false");
  await categoryField.press("ArrowDown");
  await categoryField.press("Enter");
  await expect(categoryField).toHaveValue("Ch\u00e1s Sol\u00faveis");
  await categoryField.fill("");

  const input = page.locator('input[type="file"]');
  await input.setInputFiles({
    name: "produto.png",
    mimeType: "image/png",
    buffer: png,
  });
  await expect(page.getByText(/Upload concluido: 1 x 1px/)).toBeVisible();
  await expect(
    page.locator(".product-editor__preview-media img"),
  ).toHaveAttribute("src", uploadedUrl);
  await expect(
    page.locator(".product-editor__preview-description"),
  ).toContainText("Descricao completa do produto");
  await expect(page.locator(".product-editor__preview-button")).toContainText(
    "Adicionar",
  );

  await input.setInputFiles({
    name: "produto.gif",
    mimeType: "image/gif",
    buffer: Buffer.from("GIF89a"),
  });
  await expect(
    page.getByText("Escolha uma imagem PNG, JPG ou WebP."),
  ).toBeVisible();
  await expect(
    page.locator(".product-editor__preview-media img"),
  ).toHaveAttribute("src", uploadedUrl);
  expect(uploads).toBe(1);
  expect(uploadHeaders["content-type"]).toBe("image/png");
  expect(uploadHeaders["x-csrf-token"]).toBe("playwright-csrf-token");
  expect(uploadBody === null || uploadBody.equals(png)).toBe(true);

  await editor
    .getByLabel("Titulo", { exact: true })
    .fill("Produto categoria livre");
  await editor
    .getByLabel("Subtitulo", { exact: true })
    .fill("Edicao criada pelo painel");
  await categoryField.fill(customCategory.name);
  await editor.getByLabel("Preco (R$)").fill("129,00");
  await editor
    .getByLabel("Texto alternativo da imagem")
    .fill("Produto de categoria livre");
  await editor.getByRole("button", { name: "Cadastrar produto" }).click();

  await expect(
    page.getByText(/A categoria "Colecoes sazonais" tambem foi salva/),
  ).toBeVisible();
  expect(savedCategory).toEqual({ name: customCategory.name });
  expect(savedProduct.categorySlug).toBe(customCategory.slug);
  expect(savedProduct.lowStockWarningEnabled).toBe(false);
  expect(savedProduct).toMatchObject({
    imageWidth: 1,
    imageHeight: 1,
    imageContentType: "image/png",
    imageSizeBytes: png.length,
  });
  expect(savedProduct).not.toHaveProperty("sku");
  expect(savedProduct).not.toHaveProperty("slug");

  await page
    .getByRole("button", { name: "Editar Produto categoria livre" })
    .click();
  const editEditor = page.locator(".product-editor");
  const editCategoryField = editEditor.getByRole("combobox", {
    name: "Categoria",
    exact: true,
  });
  await expect(editCategoryField).toHaveValue(customCategory.name);
  await editEditor
    .getByRole("button", { name: "Mostrar categorias salvas" })
    .click();
  await expectCategoryMenuAnchored(editEditor);
  const replacementCategory = editEditor.getByRole("option", {
    name: "Encapsulados",
    exact: true,
  });
  await expect(replacementCategory).toBeVisible();
  await replacementCategory.click();
  await expect(editCategoryField).toHaveValue("Encapsulados");

  const lowStockWarningToggle = editEditor.getByRole("switch", {
    name: /Aviso desativado/,
  });
  await expect(lowStockWarningToggle).toHaveAttribute("aria-checked", "false");
  await lowStockWarningToggle.click();
  await expect(
    editEditor.getByRole("switch", { name: /Aviso ativado/ }),
  ).toHaveAttribute("aria-checked", "true");
  if (browserName === "chromium") {
    await editEditor.screenshot({
      path: "test-results/admin-product-edit-low-stock-enabled.png",
    });
  }
  await editEditor.getByRole("button", { name: "Salvar alteracoes" }).click();
  await expect(
    page.getByText("Produto atualizado e pronto para a vitrine."),
  ).toBeVisible();
  expect(savedProductUpdate.categorySlug).toBe("encapsulados");
  expect(savedProductUpdate.lowStockWarningEnabled).toBe(true);

  await page.getByRole("button", { name: "Novo produto" }).click();
  const nextEditor = page.locator(".product-editor");
  const nextCategoryField = nextEditor.getByRole("combobox", {
    name: "Categoria",
    exact: true,
  });
  await expect(nextCategoryField).toHaveValue("");
  await nextEditor
    .getByRole("button", { name: "Mostrar categorias salvas" })
    .click();
  await expectCategoryMenuAnchored(nextEditor);
  await expect(
    nextEditor.getByRole("option", {
      name: "Colecoes sazonais",
      exact: true,
    }),
  ).toBeVisible();
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    await nextCategoryField.scrollIntoViewIfNeeded();
    await expectCategoryMenuAnchored(nextEditor);
    await expectNoHorizontalOverflow(page);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await nextCategoryField.scrollIntoViewIfNeeded();
  await expectCategoryMenuAnchored(nextEditor);
  if (browserName === "chromium") {
    await page.screenshot({
      path: "test-results/admin-product-upload-desktop.png",
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await nextCategoryField.scrollIntoViewIfNeeded();
  await expectCategoryMenuAnchored(nextEditor);
  await expectNoHorizontalOverflow(page);
  if (browserName === "chromium") {
    await page.screenshot({
      path: "test-results/admin-product-upload-mobile.png",
      fullPage: true,
    });
  }
});

test("upload da capa permanece utilizavel no admin mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await serveBuiltApp(page, adminOrigin, "apps/admin/dist");
  await mockUploadedImage(page);
  await page.route("**/admin/storefront", async (route) => {
    if (route.request().method() === "GET") {
      await fulfillCorsJson(route, storefront, adminOrigin);
      return;
    }
    await fulfillCorsJson(route, storefront, adminOrigin);
  });
  await page.route("**/admin/uploads/images", (route) =>
    fulfillCorsJson(
      route,
      {
        url: uploadedUrl,
        width: 1,
        height: 1,
        contentType: "image/png",
        sizeBytes: png.length,
      },
      adminOrigin,
      201,
    ),
  );

  await page.goto(`${adminOrigin}/aparencia`);
  await page.getByRole("tab", { name: "Conteudo" }).click();
  await expect(page.getByText("Imagem da capa")).toBeVisible();
  const heroUploader = page
    .locator(".image-upload-field")
    .filter({ hasText: "Imagem da capa" });
  await heroUploader
    .locator('input[type="file"]')
    .setInputFiles({ name: "capa.png", mimeType: "image/png", buffer: png });
  await expect(page.getByText(/Upload concluido: 1 x 1px/)).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const uploaderWidth = await heroUploader
    .locator(".image-upload")
    .evaluate((element) => element.getBoundingClientRect().width);
  expect(uploaderWidth).toBeLessThanOrEqual(358);
  await heroUploader.screenshot({
    path: "test-results/admin-hero-upload-mobile.png",
  });
});

test("admin configura logo, fontes e links com icone sem campos de URL de imagem", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await serveBuiltApp(page, adminOrigin, "apps/admin/dist");
  await mockUploadedImage(page);

  let saved;
  await page.route("**/admin/storefront", async (route) => {
    if (route.request().method() === "GET") {
      await fulfillCorsJson(route, storefront, adminOrigin);
      return;
    }
    saved = route.request().postDataJSON();
    await fulfillCorsJson(route, saved, adminOrigin);
  });
  await page.route("**/admin/uploads/images", (route) =>
    fulfillCorsJson(
      route,
      {
        url: uploadedUrl,
        width: 1,
        height: 1,
        contentType: "image/png",
        sizeBytes: png.length,
      },
      adminOrigin,
      201,
    ),
  );

  await page.goto(`${adminOrigin}/aparencia`);
  await expect(page.getByLabel("URL da logo")).toHaveCount(0);
  await expect(page.locator(".footer-link-editor")).toHaveCount(3);

  const logoUploader = page
    .locator(".image-upload-field")
    .filter({ hasText: "Logo da marca" });
  await logoUploader
    .locator('input[type="file"]')
    .setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: png });
  await expect(
    logoUploader.getByText(/Upload concluido: 1 x 1px/),
  ).toBeVisible();
  await page.getByLabel("Fonte da vitrine publica").selectOption("modern");
  await page.getByLabel("Fonte do painel admin").selectOption("classic");
  await page.getByRole("tab", { name: "Conteudo" }).click();
  await page
    .getByLabel("Primeira linha do manifesto")
    .fill("PRIMEIRA LINHA EDITADA NO ADMIN");
  await page
    .getByLabel("Segunda linha do manifesto")
    .fill("SEGUNDA LINHA EDITADA PARA A HOME");
  await page.getByLabel("Texto do botao dos cards").fill("Colocar no carrinho");
  await page
    .getByLabel("Texto depois de adicionar")
    .fill("Incluido no carrinho");

  await page.getByRole("tab", { name: "Composicao" }).click();
  const primaryColorInput = page.getByLabel("Cor principal do texto");
  await expect(primaryColorInput).toHaveAttribute("type", "text");
  await expect(primaryColorInput).toHaveAttribute("placeholder", "#C9A76D");
  await primaryColorInput.fill("2F6F74");
  await expect(primaryColorInput).toHaveValue("#2F6F74");

  const accentColorInput = page.getByLabel("Cor de destaque");
  const footerColorInput = page.getByLabel("Cor do rodape");
  const appearancePreview = page.locator(".appearance-preview");
  const initialPreviewAccent = await appearancePreview.evaluate((preview) =>
    getComputedStyle(preview).getPropertyValue("--preview-accent").trim(),
  );
  const initialPreviewFooter = await appearancePreview.evaluate((preview) =>
    getComputedStyle(preview).getPropertyValue("--preview-footer").trim(),
  );
  await accentColorInput.fill("#12ZZ99");
  await expect(accentColorInput).toHaveAttribute("aria-invalid", "true");
  await expect(
    page.getByText("Informe uma cor com # e seis digitos, como #C9A76D."),
  ).toBeVisible();
  expect(
    await appearancePreview.evaluate((preview) =>
      getComputedStyle(preview).getPropertyValue("--preview-accent").trim(),
    ),
  ).toBe(initialPreviewAccent);
  await accentColorInput.fill("A34252");
  await expect(accentColorInput).toHaveValue("#A34252");
  await expect(accentColorInput).toHaveAttribute("aria-invalid", "false");
  expect(
    await appearancePreview.evaluate((preview) =>
      getComputedStyle(preview).getPropertyValue("--preview-accent").trim(),
    ),
  ).toBe("#a34252");
  expect(
    await appearancePreview.evaluate((preview) =>
      getComputedStyle(preview).getPropertyValue("--preview-footer").trim(),
    ),
  ).toBe(initialPreviewFooter);
  await footerColorInput.fill("5A2738");
  await expect(footerColorInput).toHaveValue("#5A2738");
  expect(
    await appearancePreview.evaluate((preview) =>
      getComputedStyle(preview).getPropertyValue("--preview-footer").trim(),
    ),
  ).toBe("#5a2738");

  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    await expect(primaryColorInput).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/admin-hex-colors-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.getByRole("tab", { name: "Rodape" }).click();
  const footerBrandNameToggle = page.getByLabel(
    "Exibir nome da marca no rodape",
  );
  await expect(footerBrandNameToggle).toBeChecked();
  await footerBrandNameToggle.uncheck();
  await expect(
    page.locator(".appearance-preview__footer-brand strong"),
  ).toHaveCount(0);
  await expect(
    page.locator(".appearance-preview__footer-brand-logo"),
  ).toHaveAttribute("data-logo-normalized", "true");
  await expect(
    page.locator(".appearance-preview__footer-brand-logo"),
  ).toHaveAttribute("data-logo-load", "ready");
  await page
    .getByLabel("Texto do botao do WhatsApp")
    .fill("Fale com nossa equipe");
  await page.getByLabel("Titulo da coluna de navegacao").fill("Loja Divinas");
  await page
    .getByLabel("Titulo da coluna de atendimento")
    .fill("Atendimento personalizado");
  await page
    .getByLabel("Primeira linha de atendimento")
    .fill("Seg-Sex · 8h as 18h");
  await page
    .getByLabel("Segunda linha de atendimento")
    .fill("Sabado · 9h as 13h");
  await page.getByLabel("Texto do link de atendimento").fill("Conversar agora");
  await page
    .getByLabel("Direitos autorais")
    .fill("© {{year}} {{brand}} · Conteudo protegido.");
  await page.getByLabel("Texto de seguranca").fill("Compra protegida");
  await page.getByRole("button", { name: "Adicionar item" }).click();
  await expect(page.locator(".footer-link-editor")).toHaveCount(4);
  const newLink = page.locator(".footer-link-editor").filter({
    has: page.getByText("Novo item do rodape", { exact: true }),
  });
  await expect(
    newLink.getByLabel("Texto exibido (opcional)"),
  ).not.toHaveAttribute("required", "");
  await newLink
    .getByLabel("Destino do link")
    .fill("https://instagram.com/bespoke");
  await newLink.locator('input[type="file"]').setInputFiles({
    name: "instagram.png",
    mimeType: "image/png",
    buffer: png,
  });
  await expect(newLink.getByText(/Upload concluido: 1 x 1px/)).toBeVisible();

  await page.getByRole("button", { name: "Salvar vitrine" }).click();
  await expect(
    page.getByText("Configuracoes da vitrine salvas."),
  ).toBeVisible();
  expect(saved.logoUrl).toBe(uploadedUrl);
  expect(saved.storefrontFont).toBe("modern");
  expect(saved.adminFont).toBe("classic");
  expect(saved.manifestoLineOne).toBe("PRIMEIRA LINHA EDITADA NO ADMIN");
  expect(saved.manifestoLineTwo).toBe("SEGUNDA LINHA EDITADA PARA A HOME");
  expect(saved.featuredAddButtonLabel).toBe("Colocar no carrinho");
  expect(saved.featuredAddedButtonLabel).toBe("Incluido no carrinho");
  expect(saved.primaryColor).toBe("#2f6f74");
  expect(saved.accentColor).toBe("#a34252");
  expect(saved.footerColor).toBe("#5a2738");
  expect(saved.footerShowBrandName).toBe(false);
  expect(saved.footerWhatsappButtonLabel).toBe("Fale com nossa equipe");
  expect(saved.footerHeading).toBe("Loja Divinas");
  expect(saved.footerServiceHeading).toBe("Atendimento personalizado");
  expect(saved.footerServiceLineOne).toBe("Seg-Sex · 8h as 18h");
  expect(saved.footerServiceLineTwo).toBe("Sabado · 9h as 13h");
  expect(saved.footerWhatsappLinkLabel).toBe("Conversar agora");
  expect(saved.footerCopyrightText).toBe(
    "© {{year}} {{brand}} · Conteudo protegido.",
  );
  expect(saved.footerSecurityText).toBe("Compra protegida");
  expect(saved.footerLinks[0]).toMatchObject({
    label: "",
    href: "https://instagram.com/bespoke",
    iconUrl: uploadedUrl,
  });
  expect(saved.footerLinks.slice(1).map((link) => link.href)).toEqual([
    "/privacidade",
    "/catalogo",
    "/suporte",
  ]);
  for (const width of responsiveWidths) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    await expectNoHorizontalOverflow(page);
  }
  await page.screenshot({
    path: "test-results/admin-appearance-branding-1280.png",
    fullPage: true,
  });
});

test("todas as abas do admin carregam em desktop e mobile", async ({
  browserName,
  page,
}) => {
  test.setTimeout(60_000);
  const tabs = [
    { path: "/", nav: "Dashboard", title: "Dashboard" },
    { path: "/produtos", nav: "Produtos", title: "Produtos" },
    { path: "/estoque", nav: "Estoque", title: "Estoque" },
    { path: "/pedidos", nav: "Pedidos", title: "Pedidos" },
    { path: "/clientes", nav: "Clientes", title: "Clientes" },
    { path: "/pagamentos", nav: "Pagamentos", title: "Pagamentos" },
    {
      path: "/whatsapp",
      nav: "WhatsApp",
      title: "Mensagens do WhatsApp",
    },
    { path: "/aparencia", nav: "Vitrine", title: "Aparencia" },
    { path: "/relatorios", nav: "Relatorios", title: "Relatorios" },
    { path: "/auditoria", nav: "Auditoria", title: "Auditoria" },
    { path: "/configuracoes", nav: "Config", title: "Configuracoes" },
  ];
  const runtimeErrors = [];
  const serverErrors = [];

  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 500) {
      serverErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  await serveBuiltApp(page, adminOrigin, "apps/admin/dist");
  await page.route("**/admin/storefront", (route) =>
    fulfillCorsJson(route, storefront, adminOrigin),
  );
  await page.route("**/admin/overview", (route) =>
    fulfillCorsJson(
      route,
      {
        metrics: {
          confirmedRevenueInCents: 0,
          pendingOrders: 0,
          lowStockCount: 0,
          activeProducts: 0,
          inventoryValueInCents: 0,
        },
        alerts: [],
        recentOrders: [],
      },
      adminOrigin,
    ),
  );
  await page.route("**/admin/products", (route) =>
    fulfillCorsJson(route, { items: [] }, adminOrigin),
  );
  await page.route("**/admin/orders", (route) =>
    fulfillCorsJson(route, { items: [] }, adminOrigin),
  );

  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(adminOrigin);
  for (const tab of tabs) {
    await page.getByRole("link", { name: tab.nav, exact: true }).click();
    await expect(page).toHaveURL(
      new RegExp(`${tab.path.replace("/", "\\/")}$`),
    );
    await expect(
      page.getByRole("heading", { level: 1, name: tab.title, exact: true }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  for (const tab of tabs) {
    await page.goto(`${adminOrigin}${tab.path}`);
    await expect(
      page.getByRole("heading", { level: 1, name: tab.title, exact: true }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }

  expect(runtimeErrors).toEqual([]);
  expect(serverErrors).toEqual([]);
  if (browserName === "chromium") {
    await page.screenshot({
      path: "test-results/admin-tabs-mobile.png",
      fullPage: true,
    });
  }
});

test("imagem enviada renderiza na home e no card publico sem overflow", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await serveBuiltApp(page, webOrigin, "apps/web/dist");
  await mockUploadedImage(page);
  await mockPortraitProductImage(page);
  const configuredStorefront = {
    ...storefront,
    logoUrl: paddedHorizontalLogoUrl,
    logoOnDarkUrl: paddedHorizontalLogoUrl,
    footerShowBrandName: false,
    storefrontFont: "classic",
    imageFit: "cover",
    footerHeading: "Contato e redes",
    footerLinks: [
      ...storefront.footerLinks,
      {
        id: "00000000-0000-4000-8000-000000000104",
        label: "",
        href: "https://instagram.com/bespoke",
        iconUrl: uploadedUrl,
      },
    ],
  };
  const productsWithLowStock = featuredProducts.map((item, index) => ({
    ...(index === 1
      ? { ...item, stock: 1, lowStockWarningEnabled: true }
      : item),
    images: item.images.map((image) => ({
      ...image,
      url: portraitProductUrl,
      width: 1024,
      height: 1536,
    })),
  }));
  await page.route("**/storefront/settings", (route) =>
    fulfillCorsJson(route, configuredStorefront, webOrigin),
  );
  await page.route("**/catalog/products?*", (route) =>
    fulfillCorsJson(
      route,
      { items: productsWithLowStock, nextCursor: null },
      webOrigin,
    ),
  );

  await page.goto(`${webOrigin}/`);
  const headerBrand = page.locator(".site-header > .brand--header");
  await expect(headerBrand).toHaveAccessibleName("Bespoke inicio");
  await expect(headerBrand.locator(".brand__mark img")).toHaveAttribute(
    "src",
    paddedHorizontalLogoUrl,
  );
  await expect(headerBrand.locator(".brand__mark")).toHaveAttribute(
    "data-logo-shape",
    "wide",
  );
  await expect(headerBrand.locator(".brand__mark")).toHaveAttribute(
    "data-logo-normalized",
    "true",
  );
  await expect(headerBrand.locator(".brand__mark img")).toHaveAttribute(
    "data-logo-fit",
    "contain",
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(headerBrand.locator(".brand__mark")).toHaveAttribute(
    "data-logo-normalized",
    "true",
  );
  await expect(headerBrand.locator(".brand__mark")).toHaveAttribute(
    "data-logo-load",
    "ready",
  );
  await expect(headerBrand.locator(".brand__wordmark")).toHaveCount(0);
  await expect(page.locator(".hero")).toHaveCSS("background-image", "none");
  await expect(page.locator(".hero__media")).toHaveAttribute(
    "src",
    uploadedUrl,
  );
  await expect(page.locator(".editorial-statement__line")).toHaveCount(2);
  await expect(
    page.getByText(configuredStorefront.manifestoLineOne, { exact: true }),
  ).toBeAttached();
  const productImage = page.locator(".product-card__image img").first();
  await productImage.scrollIntoViewIfNeeded();
  await expect(productImage).toHaveJSProperty("naturalWidth", 1024);
  await expect(productImage).toHaveJSProperty("naturalHeight", 1536);
  await expect(productImage).toHaveCSS("object-fit", "contain");
  const featuredCards = page.locator(".product-card--home-preview");
  await expect(
    featuredCards.first().locator(".product-card__description"),
  ).toHaveText(product.description);
  const featuredAddButton = page
    .locator(".product-card--home-preview .product-card__button")
    .first();
  await expect(featuredAddButton).toContainText(
    configuredStorefront.featuredAddButtonLabel,
  );
  const operationalTypography = await page.evaluate(() => {
    const read = (selector) => {
      const element = document.querySelector(selector);
      if (!element) throw new Error(`Elemento nao encontrado: ${selector}`);
      const style = getComputedStyle(element);
      return {
        backgroundColor: style.backgroundColor,
        borderColor: style.borderTopColor,
        borderWidth: style.borderTopWidth,
        color: style.color,
        display: style.display,
        fontFamily: style.fontFamily,
        lineClamp: style.webkitLineClamp,
        textTransform: style.textTransform,
      };
    };

    return {
      category: read(".product-card--home-preview .ds-badge"),
      description: read(
        ".product-card--home-preview .product-card__description",
      ),
      eyebrow: read(".section-heading--featured .section-heading__copy > p"),
      eyebrowIcon: read(
        ".section-heading--featured .section-heading__copy > p svg",
      ),
      price: read(".product-card--home-preview .product-card__price strong"),
      stock: read(".product-card--home-preview .product-card__stock"),
      viewAll: read(".section-heading--featured .store-button"),
    };
  });
  for (const role of ["category", "eyebrow", "price", "stock", "viewAll"]) {
    expect(operationalTypography[role].fontFamily).toMatch(
      /Inter|Segoe UI|ui-sans-serif|system-ui|sans-serif/i,
    );
    expect(operationalTypography[role].fontFamily).not.toMatch(
      /Georgia|Times New Roman|Bodoni|Didot/i,
    );
  }
  expect(operationalTypography.eyebrow.backgroundColor).toBe("rgb(9, 9, 7)");
  expect(operationalTypography.eyebrow.borderWidth).toBe("0px");
  expect(operationalTypography.eyebrow.color).toBe("rgb(201, 167, 109)");
  expect(operationalTypography.eyebrowIcon.color).toBe("rgb(201, 167, 109)");
  expect(operationalTypography.category.borderWidth).toBe("1px");
  expect(operationalTypography.category.textTransform).toBe("none");
  expect(operationalTypography.category.color).not.toBe("rgb(201, 167, 109)");
  expect(operationalTypography.description.display).not.toBe("none");
  expect(operationalTypography.description.lineClamp).toBe("2");
  expect(operationalTypography.price.color).toBe("rgb(9, 9, 7)");
  expect(operationalTypography.stock.color).toBe("rgb(9, 9, 7)");
  expect(operationalTypography.viewAll.backgroundColor).toBe("rgb(9, 9, 7)");
  expect(operationalTypography.viewAll.borderWidth).toBe("0px");
  expect(operationalTypography.viewAll.color).toBe("rgb(201, 167, 109)");

  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000, columns: 4 },
    { name: "tablet", width: 768, height: 1024, columns: 2 },
    { name: "mobile", width: 390, height: 844, columns: 2 },
    { name: "mobile-small", width: 320, height: 720, columns: 2 },
  ]) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await page.locator(".featured-collection").scrollIntoViewIfNeeded();
    await expect(featuredCards).toHaveCount(4);
    await expect(featuredCards.first()).toBeVisible();
    await expect(
      featuredCards.first().locator(".product-card__description"),
    ).toBeVisible();
    await expect(
      featuredCards.first().locator(".product-card__image img"),
    ).toHaveCSS("object-fit", "contain");
    const imageContainment = await featuredCards.first().evaluate((card) => {
      const media = card.querySelector(".product-card__image");
      const image = media?.querySelector("img");
      if (!media || !image) return null;
      const mediaBox = media.getBoundingClientRect();
      const imageBox = image.getBoundingClientRect();
      return {
        bottom: imageBox.bottom <= mediaBox.bottom + 0.5,
        left: imageBox.left >= mediaBox.left - 0.5,
        right: imageBox.right <= mediaBox.right + 0.5,
        top: imageBox.top >= mediaBox.top - 0.5,
      };
    });
    expect(imageContainment).toEqual({
      bottom: true,
      left: true,
      right: true,
      top: true,
    });
    await page.waitForTimeout(1_100);
    const cardBoxes = await featuredCards.evaluateAll((cards) =>
      cards.map((card) => {
        const box = card.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top };
      }),
    );
    expect(cardBoxes).toHaveLength(4);
    for (const cardBox of cardBoxes) {
      expect(cardBox.left).toBeGreaterThanOrEqual(0);
      expect(cardBox.right).toBeLessThanOrEqual(viewport.width + 0.5);
    }
    if (viewport.columns === 4) {
      expect(cardBoxes[0].top).toBeCloseTo(cardBoxes[3].top, 0);
    } else if (viewport.columns === 2) {
      expect(cardBoxes[0].top).toBeCloseTo(cardBoxes[1].top, 0);
      expect(cardBoxes[2].top).toBeGreaterThan(cardBoxes[0].top);
    }
    await expectNoHorizontalOverflow(page);
    await page.locator(".featured-collection").screenshot({
      path: `test-results/home-featured-${viewport.name}.png`,
    });
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator(".featured-collection").scrollIntoViewIfNeeded();
  const imageTransformBeforeHover = await productImage.evaluate(
    (image) => getComputedStyle(image).transform,
  );
  await featuredCards.first().hover();
  await expect
    .poll(() =>
      productImage.evaluate((image) => getComputedStyle(image).transform),
    )
    .not.toBe(imageTransformBeforeHover);
  await page.mouse.move(0, 0);

  await featuredAddButton.click();
  await expect(featuredAddButton).toContainText(
    configuredStorefront.featuredAddedButtonLabel,
  );
  await expect(page.locator(".store-shell")).toHaveAttribute(
    "data-storefront-font",
    "classic",
  );
  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${webOrigin}/catalogo`, {
      waitUntil: "domcontentloaded",
    });
    const catalogCard = page
      .locator(".infinite-feed .product-card--catalog-style")
      .filter({ has: page.locator(".product-card__price strong") })
      .first();
    await expect(catalogCard).toBeVisible();
    await expect(catalogCard.locator(".product-card__description")).toHaveText(
      product.description,
    );
    await expect(catalogCard.locator(".product-card__image img")).toHaveCSS(
      "object-fit",
      "contain",
    );
    const catalogFonts = await catalogCard.evaluate((card) => {
      const category = card.querySelector(".ds-badge");
      const price = card.querySelector(".product-card__price strong");
      if (!category || !price) {
        throw new Error("Metadados do card do catalogo nao encontrados.");
      }
      return {
        category: getComputedStyle(category).fontFamily,
        price: getComputedStyle(price).fontFamily,
      };
    });
    expect(catalogFonts.category).not.toMatch(/Georgia|Times New Roman/i);
    expect(catalogFonts.price).not.toMatch(/Georgia|Times New Roman/i);
    await expectNoHorizontalOverflow(page);
    await page.locator(".catalog-layout").screenshot({
      path: `test-results/catalog-operational-type-${viewport.name}.png`,
    });
  }
  await expect(
    page.locator('.site-footer__nav a[href="https://instagram.com/bespoke"]'),
  ).toHaveAccessibleName("Abrir instagram.com");
  await expect(
    page.locator(
      '.site-footer__nav a[href="https://instagram.com/bespoke"] img',
    ),
  ).toHaveJSProperty("naturalWidth", 1);
  await expect(
    page.getByRole("link", {
      name: configuredStorefront.footerWhatsappButtonLabel,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: configuredStorefront.footerHeading }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: configuredStorefront.footerServiceHeading,
    }),
  ).toBeVisible();
  await expect(
    page.getByText(configuredStorefront.footerServiceLineOne, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(configuredStorefront.footerServiceLineTwo, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: configuredStorefront.footerWhatsappLinkLabel,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("© 2026 Bespoke · Todos os direitos reservados."),
  ).toBeVisible();
  await expect(
    page.getByText(configuredStorefront.footerSecurityText, { exact: true }),
  ).toBeVisible();
  const footerBrand = page.locator(".site-footer .brand--footer");
  await expect(footerBrand).toHaveAccessibleName("Bespoke inicio");
  await expect(footerBrand.locator(".brand__wordmark")).toHaveCount(0);
  await expect(footerBrand.locator(".brand__mark")).toHaveAttribute(
    "data-logo-shape",
    "wide",
  );
  await expect(footerBrand.locator(".brand__mark")).toHaveAttribute(
    "data-logo-normalized",
    "true",
  );
  await expect(footerBrand.locator(".brand__mark img")).toHaveAttribute(
    "data-logo-fit",
    "contain",
  );
  await expect(footerBrand.locator(".brand__mark img")).toHaveCSS(
    "object-fit",
    "contain",
  );
  for (const width of responsiveWidths) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    await footerBrand.scrollIntoViewIfNeeded();
    await expect(footerBrand).toBeVisible();
    const brandBox = await headerBrand.boundingBox();
    const headerMarkBox = await headerBrand
      .locator(".brand__mark")
      .boundingBox();
    const logoBox = await headerBrand.locator(".brand__mark img").boundingBox();
    if (!brandBox || !headerMarkBox || !logoBox) {
      throw new Error(`A logo publica nao foi renderizada em ${width}px.`);
    }
    expect(headerMarkBox.x).toBeGreaterThanOrEqual(brandBox.x);
    expect(headerMarkBox.x + headerMarkBox.width).toBeLessThanOrEqual(
      brandBox.x + brandBox.width + 0.5,
    );
    expect(headerMarkBox.y).toBeGreaterThanOrEqual(brandBox.y);
    expect(headerMarkBox.y + headerMarkBox.height).toBeLessThanOrEqual(
      brandBox.y + brandBox.height + 0.5,
    );
    expect(logoBox.width / logoBox.height).toBeCloseTo(1.5, 1);
    const footerBox = await footerBrand.boundingBox();
    const footerLogoBox = await footerBrand
      .locator(".brand__mark")
      .boundingBox();
    if (!footerBox || !footerLogoBox) {
      throw new Error(`A logo do rodape nao foi renderizada em ${width}px.`);
    }
    expect(footerLogoBox.width).toBeGreaterThanOrEqual(
      Math.min(220, footerBox.width),
    );
    expect(footerLogoBox.x + footerLogoBox.width).toBeLessThanOrEqual(
      footerBox.x + footerBox.width + 0.5,
    );
    const customNavBox = await page
      .locator(".site-footer__nav--custom")
      .boundingBox();
    const systemNavBox = await page
      .locator(".site-footer__nav--system")
      .boundingBox();
    if (!customNavBox || !systemNavBox) {
      throw new Error(
        `Os grupos do rodape nao foram renderizados em ${width}px.`,
      );
    }
    expect(customNavBox.y + customNavBox.height).toBeLessThanOrEqual(
      systemNavBox.y + 1,
    );
    if (width >= 768) {
      expect(footerLogoBox.width).toBeGreaterThanOrEqual(headerMarkBox.width);
      expect(footerLogoBox.height).toBeGreaterThanOrEqual(headerMarkBox.height);
    } else {
      const footerLinkBoxes = await page
        .locator(".site-footer__nav--system a")
        .evaluateAll((links) =>
          links.map((link) => {
            const box = link.getBoundingClientRect();
            return { height: box.height, top: box.top };
          }),
        );
      expect(footerLinkBoxes.length).toBeGreaterThan(0);
      for (const linkBox of footerLinkBoxes) {
        expect(linkBox.height).toBeGreaterThanOrEqual(44);
      }
      expect(footerLinkBoxes[0].top).toBeLessThan(footerLinkBoxes[1].top);
      expect(footerLinkBoxes[1].top).toBeLessThan(footerLinkBoxes[2].top);

      const footerSectionBoxes = await page
        .locator(
          ".site-footer__brand, .site-footer__links, .site-footer__service, .site-footer__bottom",
        )
        .evaluateAll((sections) =>
          sections.map((section) => {
            const box = section.getBoundingClientRect();
            return { top: box.top };
          }),
        );
      expect(footerSectionBoxes).toHaveLength(4);
      expect(footerSectionBoxes[0].top).toBeLessThan(footerSectionBoxes[1].top);
      expect(footerSectionBoxes[1].top).toBeLessThan(footerSectionBoxes[2].top);
      expect(footerSectionBoxes[2].top).toBeLessThan(footerSectionBoxes[3].top);
    }
    await expectNoHorizontalOverflow(page);
  }
  await page.screenshot({
    path: "test-results/storefront-upload-1280.png",
    fullPage: true,
  });
  await page.locator(".site-footer").screenshot({
    path: "test-results/storefront-footer-horizontal-1440.png",
  });
  await page.setViewportSize({ width: 320, height: 844 });
  await footerBrand.scrollIntoViewIfNeeded();
  await page.locator(".site-footer").screenshot({
    path: "test-results/storefront-footer-horizontal-320.png",
  });

  for (const viewport of [
    { name: "mobile", width: 390, height: 844 },
    { name: "mobile-small", width: 320, height: 720 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${webOrigin}/catalogo`);
    const catalogCards = page.locator(
      ".infinite-feed .product-card--catalog-style",
    );
    await expect(catalogCards).toHaveCount(4);
    await catalogCards.first().scrollIntoViewIfNeeded();
    await expect(catalogCards.first()).toBeVisible();
    await expect
      .poll(async () => {
        const firstRowTops = await catalogCards.evaluateAll((cards) =>
          cards.slice(0, 2).map((card) => card.getBoundingClientRect().top),
        );
        return Math.abs(firstRowTops[0] - firstRowTops[1]);
      })
      .toBeLessThanOrEqual(0.5);
    const catalogCardBoxes = await catalogCards.evaluateAll((cards) =>
      cards.map((card) => {
        const box = card.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top };
      }),
    );
    expect(catalogCardBoxes[0].top).toBeCloseTo(catalogCardBoxes[1].top, 0);
    expect(catalogCardBoxes[2].top).toBeGreaterThan(catalogCardBoxes[0].top);
    for (const cardBox of catalogCardBoxes) {
      expect(cardBox.left).toBeGreaterThanOrEqual(0);
      expect(cardBox.right).toBeLessThanOrEqual(viewport.width + 0.5);
    }
    await expectNoHorizontalOverflow(page);
    await page.locator(".catalog-results").screenshot({
      path: `test-results/catalog-cards-${viewport.name}.png`,
    });
  }

  const catalogAddButton = page
    .locator(".infinite-feed .product-card__button")
    .first();
  await expect(catalogAddButton).toContainText(
    configuredStorefront.featuredAddButtonLabel,
  );
  await catalogAddButton.click();
  await expect(catalogAddButton).toContainText(
    configuredStorefront.featuredAddedButtonLabel,
  );
});

test("home editorial mantem header e menu acessiveis em desktop e mobile", async ({
  page,
}) => {
  await serveBuiltApp(page, webOrigin, "apps/web/dist");
  await mockUploadedImage(page);
  await page.route("**/storefront/settings", (route) =>
    fulfillCorsJson(route, storefront, webOrigin),
  );
  await page.route("**/catalog/products?*", (route) =>
    fulfillCorsJson(route, { items: [product], nextCursor: null }, webOrigin),
  );

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${webOrigin}/`);
  const brandBox = await page.locator(".site-header > .brand").boundingBox();
  const navBox = await page.locator(".main-nav--desktop").boundingBox();
  const cartBox = await page.locator(".cart-link").boundingBox();
  if (!brandBox || !navBox || !cartBox)
    throw new Error("O header desktop nao foi renderizado por completo.");
  expect(navBox.x).toBeGreaterThan(brandBox.x + brandBox.width);
  expect(navBox.x + navBox.width).toBeLessThanOrEqual(cartBox.x);
  await expect(page.locator(".hero .hero__lede")).toHaveCount(0);
  await expect(page.locator(".hero .hero__actions")).toHaveCount(0);
  await expect(
    page
      .getByRole("navigation", { name: "Caminhos da loja" })
      .getByRole("link"),
  ).toHaveCount(4);

  await page.setViewportSize({ width: 320, height: 844 });
  await page.getByRole("button", { name: "Abrir menu" }).click();
  const mobileNavigation = page.locator("#mobile-navigation");
  await expect(mobileNavigation).toBeVisible();
  await expect(
    mobileNavigation.getByRole("link", { name: "Catalogo" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(mobileNavigation).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Abrir menu" })).toBeFocused();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: "test-results/storefront-motion-320.png",
    fullPage: true,
  });

  await page.setViewportSize({ width: 768, height: 1024 });
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: "test-results/storefront-motion-768.png",
    fullPage: true,
  });

  await page.setViewportSize({ width: 844, height: 390 });
  await expectNoHorizontalOverflow(page);
  const editorialNavigation = page.getByRole("navigation", {
    name: "Caminhos da loja",
  });
  await editorialNavigation.scrollIntoViewIfNeeded();
  await expect(editorialNavigation).toBeInViewport();
});

test("drawer de filtros gerencia foco e Escape no catalogo mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await serveBuiltApp(page, webOrigin, "apps/web/dist");
  await mockUploadedImage(page);
  await page.route("**/storefront/settings", (route) =>
    fulfillCorsJson(route, storefront, webOrigin),
  );
  await page.route("**/catalog/products?*", (route) =>
    fulfillCorsJson(route, { items: [product], nextCursor: null }, webOrigin),
  );

  await page.goto(`${webOrigin}/catalogo`);
  const filterButton = page.getByRole("button", { name: "Abrir filtros" });
  await filterButton.click();
  const drawer = page.getByRole("dialog", { name: "Filtros do catalogo" });
  await expect(drawer).toBeVisible();
  await expect(
    drawer.getByRole("button", { name: "Fechar filtros" }),
  ).toBeFocused();
  await drawer.getByRole("button", { name: "Ocultar filtros" }).last().click();
  await expect(drawer).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => document.body.style.overflow))
    .toBe("");
  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  await expect(drawer).toBeVisible();
  await expect(
    drawer.getByRole("button", { name: "Fechar filtros" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await expect(filterButton).toBeFocused();
  await expectNoHorizontalOverflow(page);
});

test("produto e carrinho preservam feedback e operacoes durante as animacoes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await serveBuiltApp(page, webOrigin, "apps/web/dist");
  await mockUploadedImage(page);
  await page.route("**/storefront/settings", (route) =>
    fulfillCorsJson(route, storefront, webOrigin),
  );
  await page.route("**/catalog/products/produto-playwright", (route) =>
    fulfillCorsJson(route, product, webOrigin),
  );
  await page.route("**/cart/price", (route) =>
    fulfillCorsJson(
      route,
      {
        lines: [],
        subtotalInCents: 28900,
        discountInCents: 0,
        shippingAmountInCents: null,
        shippingMode: "whatsapp_after_payment",
        totalInCents: 28900,
        currency: "BRL",
      },
      webOrigin,
    ),
  );

  await page.goto(`${webOrigin}/produto/produto-playwright`);
  await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await expect(
    page.getByRole("link", { name: "Carrinho com 1 itens" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Carrinho com 1 itens" }).click();
  await expect(page.locator(".cart-line")).toContainText("Produto Playwright");
  await page.getByRole("button", { name: "Aumentar quantidade" }).click();
  await expect(
    page.locator(".quantity-control").getByText("2", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Remover Produto Playwright" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Seu carrinho esta vazio" }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("checkout combina frete depois do pagamento sem solicitar CEP", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await serveBuiltApp(page, webOrigin, "apps/web/dist");
  await mockUploadedImage(page);
  await context.route("https://wa.me/**", (route) => route.abort());
  await page.route("**/storefront/settings", (route) =>
    fulfillCorsJson(route, storefront, webOrigin),
  );
  await page.route("**/catalog/products/produto-playwright", (route) =>
    fulfillCorsJson(route, product, webOrigin),
  );
  await page.route("**/cart/price", (route) =>
    fulfillCorsJson(
      route,
      {
        lines: [],
        subtotalInCents: 28900,
        discountInCents: 0,
        shippingAmountInCents: null,
        shippingMode: "whatsapp_after_payment",
        totalInCents: 28900,
        currency: "BRL",
      },
      webOrigin,
    ),
  );
  await page.route("**/checkout/mercado-pago", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.shippingAcknowledged).toBe(true);
    expect(body.shipping).toBeUndefined();
    await fulfillCorsJson(
      route,
      {
        orderReference: "ORD-TESTE1",
        preferenceId: null,
        checkoutUrl: `${webOrigin}/checkout/sandbox?order=ORD-TESTE1`,
        checkoutAccessToken: "a".repeat(32),
        status: "pending_payment",
      },
      webOrigin,
      201,
    );
  });
  await page.route("**/checkout/orders/ORD-TESTE1", async (route) => {
    if (route.request().method() !== "OPTIONS") {
      expect(route.request().headers().authorization).toBe(
        `Bearer ${"a".repeat(32)}`,
      );
    }
    await fulfillCorsJson(
      route,
      {
        orderReference: "ORD-TESTE1",
        paymentStatus: "approved",
        shippingStatus: "awaiting_contact",
        shippingAmountInCents: null,
        totalPaidInCents: 28900,
        currency: "BRL",
        items: [
          {
            productId: product.id,
            name: product.name,
            quantity: 1,
            unitPriceInCents: 28900,
            subtotalInCents: 28900,
            imageUrl: uploadedUrl,
          },
        ],
        whatsappUrl: "https://wa.me/5511999999999?text=pedido",
        canContinueOnWhatsapp: true,
      },
      webOrigin,
    );
  });
  await page.route(
    "**/checkout/orders/ORD-TESTE1/whatsapp-open",
    async (route) => {
      if (route.request().method() === "OPTIONS") {
        await fulfillCorsJson(route, {}, webOrigin);
        return;
      }
      expect(route.request().headers().authorization).toBe(
        `Bearer ${"a".repeat(32)}`,
      );
      await route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-credentials": "true",
          "access-control-allow-origin": webOrigin,
        },
      });
    },
  );

  await page.goto(`${webOrigin}/produto/produto-playwright`);
  await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await page.getByRole("link", { name: "Carrinho com 1 itens" }).click();
  await expect(page.getByText("A combinar pelo WhatsApp")).toBeVisible();
  const checkoutChoices = page.locator(".checkout-choice .ds-button");
  await expect(checkoutChoices).toHaveCount(2);
  await expect(checkoutChoices.nth(0)).toContainText("Comprar pelo WhatsApp");
  await expect(checkoutChoices.nth(0)).toHaveClass(/ds-button--primary/);
  await expect(checkoutChoices.nth(1)).toContainText("Comprar online");
  await expect(checkoutChoices.nth(1)).toHaveClass(/ds-button--secondary/);
  await expect(page.getByText(/CEP/i)).toHaveCount(0);
  await expect(page.getByText("R$ 0,00")).toHaveCount(0);
  await page.getByRole("button", { name: /Comprar online/ }).click();

  await page.getByLabel("Nome completo").fill("Cliente Playwright");
  await page.getByLabel("E-mail").fill("cliente@example.test");
  await page.getByLabel("Telefone").fill("11999999999");
  const payButton = page.getByRole("button", {
    name: "Continuar para pagamento seguro",
  });
  await expect(payButton).toBeDisabled();
  await page.getByRole("checkbox").check();
  await payButton.click();

  await expect(page).toHaveURL(/checkout\/sandbox/);
  await expect.poll(() => page.url()).not.toContain("token=");
  await expect(page.getByText("Pagamento confirmado")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Abrir conversa no WhatsApp" }),
  ).toBeVisible();
  await expect(page.getByText("A combinar pelo WhatsApp")).toBeVisible();
  for (const width of responsiveWidths) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await expectNoHorizontalOverflow(page);
    if ([390, 768, 1440].includes(width)) {
      await page.screenshot({
        path: `test-results/checkout-confirmed-${width}.png`,
        fullPage: true,
      });
    }
  }
});

test("admin edita apenas os complementos das mensagens do WhatsApp", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await serveBuiltApp(page, adminOrigin, "apps/admin/dist");
  let saved = storefront;
  await page.route("**/admin/storefront", async (route) => {
    if (route.request().method() === "PATCH") {
      saved = route.request().postDataJSON();
      await fulfillCorsJson(route, saved, adminOrigin);
      return;
    }
    await fulfillCorsJson(route, saved, adminOrigin);
  });

  await page.goto(`${adminOrigin}/whatsapp`);
  await expect(
    page.getByRole("heading", { name: "Mensagens do WhatsApp" }),
  ).toBeVisible();
  const messages = page.getByLabel("Mensagem complementar");
  await messages
    .nth(0)
    .fill("Quero ajuda da equipe para concluir esta compra.");
  await messages
    .nth(1)
    .fill("Pagamento confirmado. Vamos combinar entrega ou retirada.");
  await page.getByRole("button", { name: "Salvar mensagens" }).click();
  await expect(
    page.getByText("Mensagens de atendimento salvas."),
  ).toBeVisible();
  expect(saved.whatsappPurchaseMessage).toContain("concluir esta compra");
  expect(saved.postPaymentWhatsappMessage).toContain("entrega ou retirada");
  await expect(page.getByText("Referencia: WSP-EXEMPLO")).toBeVisible();
  await expect(
    page.getByText("Frete: a combinar pelo WhatsApp").first(),
  ).toBeVisible();
  for (const width of responsiveWidths) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await expectNoHorizontalOverflow(page);
    if ([390, 768, 1440].includes(width)) {
      await page.screenshot({
        path: `test-results/admin-whatsapp-${width}.png`,
        fullPage: true,
      });
    }
  }
});

test("transicao compartilhada preserva a navegacao com movimento reduzido", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await serveBuiltApp(page, webOrigin, "apps/web/dist");
  await mockUploadedImage(page);
  await page.route("**/storefront/settings", (route) =>
    fulfillCorsJson(route, storefront, webOrigin),
  );
  await page.route("**/catalog/products?*", (route) =>
    fulfillCorsJson(route, { items: [product], nextCursor: null }, webOrigin),
  );

  await page.goto(`${webOrigin}/`);
  await expect
    .poll(() =>
      page.evaluate(
        () => matchMedia("(prefers-reduced-motion: reduce)").matches,
      ),
    )
    .toBe(true);
  await expect(page.locator(".hero__media")).toHaveCSS("transform", "none", {
    timeout: 10_000,
  });
  await expect(page.locator(".editorial-statement")).toBeVisible();
  await page
    .getByRole("navigation", { name: "Principal" })
    .getByRole("link", { name: "Catalogo" })
    .click();

  await expect(page).toHaveURL(`${webOrigin}/catalogo`);
  await expect(page.locator(".catalog-layout")).toBeVisible();
  await expect(page.locator(".ds-page-transition")).toHaveCount(1);
  await expect(page.locator(".ds-page-transition")).toHaveCSS(
    "transform",
    "none",
    { timeout: 10_000 },
  );
});
