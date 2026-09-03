import type {
  CSSProperties,
  KeyboardEvent,
  ReactNode,
  SyntheticEvent,
  TextareaHTMLAttributes,
} from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Archive,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Boxes,
  CheckCircle2,
  Check,
  ChevronDown,
  ClipboardList,
  CreditCard,
  Copy,
  Download,
  Edit3,
  Eye,
  EyeOff,
  Image as ImageIcon,
  LayoutDashboard,
  Link2,
  LogOut,
  Monitor,
  MessageCircle,
  Maximize2,
  Minimize2,
  PackagePlus,
  Palette,
  PanelTop,
  PanelBottom,
  Plus,
  Power,
  QrCode,
  RotateCcw,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Smartphone,
  Tablet,
  Trash2,
  Type,
  Users,
  X,
} from "lucide-react";
import {
  defaultCatalogTextStyles,
  defaultFooterLinks,
  defaultHomeMotionByBlock,
  defaultHomeSections,
  defaultManifestoItems,
  defaultStorefrontTextStyles,
  formatFooterCopyright,
  formatProductCardDescription,
  isSystemFooterLink,
  orderFooterLinks,
  productCardDescriptionMaxLength,
  type AdminProductInput,
  type AdminOrderUpdate,
  type AdminProductRow,
  type Category,
  type OrderSummary,
  type PixSettings,
  type StorefrontSettings,
  type StorefrontTextStyle,
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
  normalizeLogoImage,
  resetNormalizedLogo,
  updateNormalizedLogoLayout,
} from "@bespoke/design-system";
import {
  type AdminOverview,
  adminMediaUrl,
  createCategory,
  createProduct,
  deleteProduct,
  getAdminRuntime,
  getCategories,
  getOrders,
  getOverview,
  getPixSettings,
  getProducts,
  getStorefront,
  setOrdersArchived,
  setPixPaymentStatus,
  setWhatsappRevenueConfirmed,
  updateProduct,
  updateOrder,
  updatePixSettings,
  updateStorefront,
} from "../lib/api";
import { resolveStorefrontPreviewUrl } from "../lib/storefront-preview-url";
import {
  createStorefrontPreviewDocument,
  shouldEmbedStorefrontPreview,
} from "../lib/storefront-preview-document";
import { formatMoney, maskEmail } from "../lib/format";
import { ImageUploadField } from "../components/ImageUploadField";
import { HexColorField } from "../components/HexColorField";
import { AdminAuthGate } from "../components/AdminAuthGate";
import adminLogo from "../assets/bespoke-admin-logo.png";

type StorefrontPaletteKey =
  | "primaryColor"
  | "accentColor"
  | "backgroundColor"
  | "homeSurfaceColor"
  | "homeAlternateColor"
  | "homeSecondaryTextColor"
  | "homeBorderColor"
  | "homeShadowColor"
  | "homeTransitionStartColor"
  | "homeTransitionEndColor";

const storefrontPaletteFields: ReadonlyArray<{
  key: StorefrontPaletteKey;
  label: string;
}> = [
  { key: "primaryColor", label: "Cor principal do texto" },
  { key: "accentColor", label: "Cor de destaque" },
  { key: "backgroundColor", label: "Fundo principal" },
  { key: "homeSurfaceColor", label: "Superficie da Home" },
  { key: "homeAlternateColor", label: "Superficie alternativa" },
  { key: "homeSecondaryTextColor", label: "Texto secundario" },
  { key: "homeBorderColor", label: "Bordas e divisores" },
  { key: "homeShadowColor", label: "Sombras" },
  { key: "homeTransitionStartColor", label: "Inicio da transicao" },
  { key: "homeTransitionEndColor", label: "Fim da transicao" },
];

const navSections = [
  {
    label: "Operacao",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/produtos", label: "Produtos", icon: PackagePlus },
      { to: "/pedidos", label: "Pedidos", icon: ClipboardList },
      { to: "/estoque", label: "Estoque", icon: Boxes },
    ],
  },
  {
    label: "Loja",
    items: [
      { to: "/aparencia", label: "Vitrine", icon: Palette },
      { to: "/relatorios", label: "Relatorios", icon: BarChart3 },
    ],
  },
  {
    label: "Atendimento",
    items: [
      { to: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
      { to: "/clientes", label: "Clientes", icon: Users },
      { to: "/pagamentos", label: "Pagamentos", icon: CreditCard },
    ],
  },
  {
    label: "Sistema",
    items: [
      { to: "/auditoria", label: "Auditoria", icon: ShieldCheck },
      { to: "/configuracoes", label: "Ajustes", icon: Settings },
    ],
  },
];

type AdminSearchItem = {
  label: string;
  group: string;
  description: string;
  to: string;
  keywords: string;
};

const adminSearchItems: AdminSearchItem[] = [
  {
    label: "Dashboard",
    group: "Operacao",
    description: "Resumo geral da loja",
    to: "/",
    keywords: "inicio metricas resumo painel",
  },
  {
    label: "Produtos",
    group: "Operacao",
    description: "Cadastro, imagens, categorias e destaques",
    to: "/produtos",
    keywords: "produto card imagem categoria preco estoque",
  },
  {
    label: "Pedidos",
    group: "Operacao",
    description: "Compras e estados de atendimento",
    to: "/pedidos",
    keywords: "pedido compra pagamento entrega whatsapp",
  },
  {
    label: "Estoque",
    group: "Operacao",
    description: "Disponibilidade dos produtos",
    to: "/estoque",
    keywords: "quantidade baixo disponibilidade",
  },
  {
    label: "Identidade da vitrine",
    group: "Vitrine",
    description: "Marca, logos e fontes gerais",
    to: "/aparencia?tab=brand",
    keywords: "marca logo identidade fonte geral",
  },
  {
    label: "Cabecalho da vitrine",
    group: "Vitrine",
    description: "Cores, tipografia, logo e botoes do Header",
    to: "/aparencia?tab=header",
    keywords: "header cabecalho menu navegacao cor botao logo sombra",
  },
  {
    label: "Capa e textos da Home",
    group: "Vitrine",
    description: "Hero, manifesto e chamadas principais",
    to: "/aparencia?tab=content",
    keywords: "capa hero manifesto texto titulo etiqueta",
  },
  {
    label: "Layout da Home",
    group: "Vitrine",
    description: "Paleta, secoes e cards em destaque",
    to: "/aparencia?tab=composition",
    keywords: "home layout cor paleta card secao espacamento",
  },
  {
    label: "Catalogo da vitrine",
    group: "Vitrine",
    description: "Textos, paleta, tipografia, cards e grade",
    to: "/aparencia?tab=catalog",
    keywords: "catalogo titulo descricao cor fonte card coluna filtro",
  },
  {
    label: "Avaliacoes",
    group: "Vitrine",
    description: "Relatos reais e carrossel",
    to: "/aparencia?tab=reviews",
    keywords: "avaliacao depoimento relato carrossel",
  },
  {
    label: "Rodape",
    group: "Vitrine",
    description: "Logo, atendimento, links e textos legais",
    to: "/aparencia?tab=footer",
    keywords: "footer rodape slogan link rede social whatsapp",
  },
  {
    label: "Busca e compartilhamento",
    group: "Vitrine",
    description: "SEO, titulo, descricao, favicon e imagem social",
    to: "/aparencia?tab=seo",
    keywords: "busca seo google meta favicon compartilhamento",
  },
  {
    label: "Movimento da Home",
    group: "Vitrine",
    description: "Animacoes por area da pagina publica",
    to: "/aparencia?tab=motion",
    keywords: "motion animacao movimento scroll fade cascade",
  },
  {
    label: "Clientes",
    group: "Atendimento",
    description: "Relacionamento e cadastro de clientes",
    to: "/clientes",
    keywords: "cliente conta contato",
  },
  {
    label: "WhatsApp",
    group: "Atendimento",
    description: "Mensagens dos fluxos de compra",
    to: "/whatsapp",
    keywords: "mensagem compra atendimento frete",
  },
  {
    label: "Pagamentos",
    group: "Atendimento",
    description: "Acompanhamento de pagamentos",
    to: "/pagamentos",
    keywords: "mercado pago status financeiro",
  },
  {
    label: "Relatorios",
    group: "Loja",
    description: "Indicadores e exportacoes",
    to: "/relatorios",
    keywords: "relatorio exportar csv indicadores",
  },
  {
    label: "Auditoria",
    group: "Sistema",
    description: "Historico e verificacoes administrativas",
    to: "/auditoria",
    keywords: "auditoria log historico seguranca",
  },
  {
    label: "Ajustes",
    group: "Sistema",
    description: "Configuracoes operacionais da loja",
    to: "/configuracoes",
    keywords: "ajuste configuracao sistema",
  },
];

function normalizeAdminSearchTerm(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

const defaultProductFilters = {
  search: "",
  status: "active",
  category: "",
};

const csvDate = () => new Date().toISOString().slice(0, 10);

function csvCell(value: string | number | boolean | null | undefined) {
  const normalized =
    value == null
      ? ""
      : typeof value === "boolean"
        ? value
          ? "sim"
          : "nao"
        : String(value);
  return `"${normalized.replaceAll('"', '""')}"`;
}

function downloadCsv(
  filename: string,
  columns: string[],
  rows: Array<Array<string | number | boolean | null | undefined>>,
) {
  const content = [
    columns.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ].join("\n");
  const blob = new Blob([`\uFEFF${content}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function exportProductsCsv(
  products: AdminProductRow[],
  scope: "filtrados" | "selecionados" | "relatorio" = "filtrados",
) {
  if (!products.length) return;
  downloadCsv(
    `produtos-${scope}-${csvDate()}.csv`,
    [
      "SKU",
      "Nome",
      "Slug",
      "Categoria",
      "Preco",
      "Estoque",
      "Estoque baixo",
      "Status",
      "Destaque",
      "Ordem",
    ],
    products.map((product) => [
      product.sku,
      product.name,
      product.slug,
      product.category,
      formatMoney(product.priceInCents),
      product.stock,
      product.lowStock,
      product.status === "active" ? "Ativo" : "Inativo",
      product.isFeatured,
      product.sortOrder,
    ]),
  );
}

function exportOrdersCsv(
  orders: OrderSummary[],
  scope: "pedidos" | "relatorio" = "pedidos",
) {
  if (!orders.length) return;
  downloadCsv(
    `${scope}-${csvDate()}.csv`,
    [
      "Referencia",
      "Cliente",
      "Email",
      "Telefone",
      "Status",
      "Metodo de pagamento",
      "Pagamento",
      "Frete",
      "Atendimento",
      "Canal",
      "Subtotal",
      "Desconto",
      "Total",
      "Criado em",
      "Receita confirmada em",
      "Atualizado em",
    ],
    orders.map((order) => [
      order.publicReference,
      order.customerName ?? "",
      order.customerEmail ?? "",
      order.customerPhone ?? "",
      order.status,
      paymentMethodLabel(order),
      order.paymentStatus ?? "nao aplicavel",
      order.shippingStatus ?? "nao iniciado",
      order.contactStatus ?? "nao iniciado",
      order.salesChannel,
      formatMoney(order.subtotalInCents),
      formatMoney(order.discountInCents),
      formatMoney(order.totalInCents),
      formatDate(order.createdAt),
      order.revenueConfirmedAt ? formatDate(order.revenueConfirmedAt) : "",
      formatDate(order.updatedAt),
    ]),
  );
}

function paymentMethodLabel(order: OrderSummary) {
  if (order.salesChannel === "whatsapp") return "WhatsApp";
  return order.paymentMethod === "pix_manual" ? "Pix" : "Mercado Pago";
}

function exportOverviewCsv(overview: AdminOverview) {
  downloadCsv(
    `resumo-operacao-${csvDate()}.csv`,
    ["Metrica", "Valor", "Observacao"],
    [
      [
        "Receita confirmada",
        formatMoney(overview.metrics.confirmedRevenueInCents),
        "Somente pagamentos confirmados",
      ],
      ["Pedidos pendentes", overview.metrics.pendingOrders, ""],
      ["Produtos com estoque baixo", overview.metrics.lowStockCount, ""],
      ["Produtos ativos", overview.metrics.activeProducts, ""],
      ["Unidades ativas em estoque", overview.metrics.activeStockUnits, ""],
      [
        "Valor em estoque",
        formatMoney(overview.metrics.inventoryValueInCents),
        "",
      ],
    ],
  );
}

function exportMonthlyRevenueCsv(overview: AdminOverview) {
  if (!overview.monthlyRevenue.length) return;
  downloadCsv(
    `receita-mensal-${csvDate()}.csv`,
    ["Mes", "Online (Pix e Mercado Pago)", "WhatsApp", "Total confirmado"],
    overview.monthlyRevenue.map((row) => [
      formatMonthKey(row.month),
      formatMoney(row.onlineInCents),
      formatMoney(row.whatsappInCents),
      formatMoney(row.totalInCents),
    ]),
  );
}

function isEditableShortcutTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable]"));
}

function Shell({
  adminEmail,
  logout,
  logoutError,
  logoutPending,
}: {
  adminEmail: string;
  logout: () => Promise<void>;
  logoutError: string;
  logoutPending: boolean;
}) {
  const [topbarCollapsed, setTopbarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const storefront = useQuery({
    queryKey: ["admin-storefront"],
    queryFn: getStorefront,
    retry: false,
  });
  const brandName = storefront.data?.brandName?.trim();
  const operationTitle = brandName
    ? `Operacao ${brandName}`
    : "Operacao da loja";
  const normalizedSearch = normalizeAdminSearchTerm(searchQuery);
  const searchResults = useMemo(() => {
    const source = normalizedSearch
      ? adminSearchItems.filter((item) =>
          normalizeAdminSearchTerm(
            `${item.label} ${item.group} ${item.description} ${item.keywords}`,
          ).includes(normalizedSearch),
        )
      : adminSearchItems.slice(0, 7);
    return source.slice(0, 8);
  }, [normalizedSearch]);

  function openSearchItem(item: AdminSearchItem) {
    navigate(item.to);
    setSearchQuery("");
    setSearchOpen(false);
  }

  return (
    <div
      className="admin-shell"
      data-admin-font={storefront.data?.adminFont ?? "signature"}
    >
      <aside className="sidebar" aria-label="Navegacao administrativa">
        <div className="sidebar__brand">
          <span className="sidebar__logo-frame">
            <img
              className="sidebar__logo"
              src={adminLogo}
              alt="Painel administrativo"
            />
          </span>
          <span className="sidebar__brand-context" aria-hidden="true">
            Admin
          </span>
        </div>
        <nav>
          {navSections.map((section) => {
            const sectionId = `admin-nav-${section.label
              .toLocaleLowerCase("pt-BR")
              .replace(/\s+/g, "-")}`;
            return (
              <div
                aria-labelledby={sectionId}
                className="sidebar__nav-section"
                key={section.label}
              >
                <span className="sidebar__nav-heading" id={sectionId}>
                  {section.label}
                </span>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === "/"}
                      title={`${section.label}: ${item.label}`}
                      aria-label={`${section.label}: ${item.label}`}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </aside>
      <div className="admin-main">
        <header
          className={`admin-topbar ${topbarCollapsed ? "admin-topbar--collapsed" : ""}`}
        >
          <div className="admin-topbar__title">
            <p>Portal administrativo</p>
            <strong>{operationTitle}</strong>
            <span>{adminEmail}</span>
          </div>
          <div className="topbar-actions">
            {!topbarCollapsed ? (
              <>
                <div
                  ref={searchRef}
                  className="admin-global-search"
                  data-open={searchOpen ? "true" : "false"}
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                      setSearchOpen(false);
                    }
                  }}
                >
                  <label htmlFor="admin-global-search-input">
                    Buscar no painel
                  </label>
                  <div className="admin-global-search__control">
                    <Search aria-hidden="true" size={17} />
                    <input
                      aria-autocomplete="list"
                      aria-controls="admin-global-search-results"
                      aria-expanded={searchOpen}
                      autoComplete="off"
                      id="admin-global-search-input"
                      placeholder="Buscar pagina ou configuracao"
                      role="combobox"
                      type="search"
                      value={searchQuery}
                      onChange={(event) => {
                        setSearchQuery(event.target.value);
                        setSearchOpen(true);
                      }}
                      onFocus={() => setSearchOpen(true)}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          setSearchQuery("");
                          setSearchOpen(false);
                        }
                        if (event.key === "Enter" && searchResults[0]) {
                          event.preventDefault();
                          openSearchItem(searchResults[0]);
                        }
                        if (event.key === "ArrowDown") {
                          event.preventDefault();
                          searchRef.current
                            ?.querySelector<HTMLButtonElement>(
                              ".admin-global-search__results button",
                            )
                            ?.focus();
                        }
                      }}
                    />
                    {searchQuery ? (
                      <IconButton
                        label="Limpar busca"
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setSearchOpen(true);
                        }}
                      >
                        <X size={15} />
                      </IconButton>
                    ) : null}
                  </div>
                  {searchOpen ? (
                    <div
                      className="admin-global-search__results"
                      id="admin-global-search-results"
                      role="listbox"
                    >
                      <div className="admin-global-search__results-heading">
                        {normalizedSearch
                          ? `${searchResults.length} resultado${searchResults.length === 1 ? "" : "s"}`
                          : "Atalhos de navegacao"}
                      </div>
                      {searchResults.length ? (
                        searchResults.map((item) => (
                          <button
                            key={`${item.to}-${item.label}`}
                            role="option"
                            type="button"
                            onClick={() => openSearchItem(item)}
                          >
                            <Search aria-hidden="true" size={15} />
                            <span>
                              <strong>{item.label}</strong>
                              <small>{item.description}</small>
                            </span>
                            <em>{item.group}</em>
                          </button>
                        ))
                      ) : (
                        <p>Nenhuma pagina ou configuracao encontrada.</p>
                      )}
                    </div>
                  ) : null}
                </div>
                <IconButton disabled label="Status da plataforma em preparacao">
                  <Activity size={18} />
                </IconButton>
              </>
            ) : null}
            <IconButton
              label={
                topbarCollapsed
                  ? "Expandir portal administrativo"
                  : "Minimizar portal administrativo"
              }
              className="topbar-toggle"
              onClick={() => setTopbarCollapsed((value) => !value)}
            >
              {topbarCollapsed ? (
                <Maximize2 size={18} />
              ) : (
                <Minimize2 size={18} />
              )}
            </IconButton>
            <IconButton
              disabled={logoutPending}
              label={logoutPending ? "Encerrando sessao" : "Sair do painel"}
              onClick={() => void logout()}
            >
              <LogOut size={18} />
            </IconButton>
          </div>
        </header>
        {logoutError ? (
          <p className="admin-session-error" role="alert">
            {logoutError}
          </p>
        ) : null}
        <main>
          <PageTransition routeKey={location.pathname}>
            <Routes location={location}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/produtos" element={<Products />} />
              <Route path="/estoque" element={<Inventory />} />
              <Route path="/pedidos" element={<Orders />} />
              <Route path="/clientes" element={<Customers />} />
              <Route path="/pagamentos" element={<Payments />} />
              <Route path="/whatsapp" element={<Whatsapp />} />
              <Route path="/aparencia" element={<Appearance />} />
              <Route path="/vitrine" element={<Appearance />} />
              <Route path="/relatorios" element={<Reports />} />
              <Route path="/auditoria" element={<Audit />} />
              <Route path="/configuracoes" element={<SettingsPage />} />
            </Routes>
          </PageTransition>
        </main>
      </div>
    </div>
  );
}

function Dashboard() {
  const overview = useQuery({
    queryKey: ["admin-overview"],
    queryFn: getOverview,
  });

  return (
    <section className="admin-page">
      <PageTitle
        eyebrow="Visao geral"
        title="Dashboard"
        action={
          <div className="page-title__actions">
            <Button
              loading={overview.isFetching}
              type="button"
              variant="secondary"
              onClick={() => overview.refetch()}
            >
              <RefreshCw size={16} />
              Atualizar
            </Button>
            <Link
              className="ds-button ds-button--primary admin-link-button"
              to="/produtos"
            >
              <span>
                <Plus size={16} />
                Novo produto
              </span>
            </Link>
          </div>
        }
      />
      {overview.isError ? (
        <EmptyState
          title="Falha ao carregar"
          body="Confirme se a API esta ativa e se a sessao admin e valida."
        />
      ) : null}
      <div className="metric-grid">
        {overview.isLoading || !overview.data ? (
          Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="metric-card" />
          ))
        ) : (
          <>
            <Metric
              label="Receita confirmada"
              value={formatMoney(overview.data.metrics.confirmedRevenueInCents)}
              hint="Somente pagamentos confirmados"
            />
            <Metric
              label="Pedidos pendentes"
              value={String(overview.data.metrics.pendingOrders)}
              hint="Aguardando pagamento"
            />
            <Metric
              label="Estoque baixo"
              value={String(overview.data.metrics.lowStockCount)}
              hint="Precisa revisao"
              tone="warning"
            />
            <Metric
              label="Produtos ativos"
              value={String(overview.data.metrics.activeProducts)}
              hint={`${overview.data.metrics.activeStockUnits ?? 0} unidades disponíveis`}
            />
            <Metric
              label="Valor do estoque ativo"
              value={formatMoney(overview.data.metrics.inventoryValueInCents)}
              hint="Preço atual × quantidade disponível"
            />
          </>
        )}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <h2>Receita por canal</h2>
          <RevenueByChannelChart overview={overview.data} />
        </section>
        <section className="panel">
          <h2>Alertas</h2>
          {overview.data?.alerts.length ? (
            overview.data.alerts.map((alert) => (
              <p className="alert" key={alert.message}>
                {alert.message}
              </p>
            ))
          ) : (
            <p className="muted">Nenhum alerta critico.</p>
          )}
        </section>
      </div>
    </section>
  );
}

function Products() {
  const queryClient = useQueryClient();
  const products = useQuery({
    queryKey: ["admin-products"],
    queryFn: getProducts,
  });
  const categories = useQuery({
    queryKey: ["catalog-categories"],
    queryFn: getCategories,
  });
  const [editing, setEditing] = useState<AdminProductRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AdminProductRow | null>(
    null,
  );
  const [notice, setNotice] = useState("");
  const [filters, setFilters] = useState({ ...defaultProductFilters });
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(
    () => new Set(),
  );
  const productSearchInputId = useId();
  const categoryOptions = categories.data?.items ?? [];
  const saveProduct = useMutation({
    mutationFn: async ({ product, categoryName }: ProductEditorSubmission) => {
      const categoryKey = normalizeCategoryName(categoryName);
      const existingCategory = categoryOptions.find(
        (category) => normalizeCategoryName(category.name) === categoryKey,
      );
      const category =
        existingCategory ?? (await createCategory({ name: categoryName }));
      const productWithCategory = {
        ...product,
        categorySlug: category.slug,
      };
      const savedProduct = editing
        ? await updateProduct(editing.id, productWithCategory)
        : await createProduct(productWithCategory);
      return {
        category,
        categoryCreated: existingCategory == null,
        product: savedProduct,
      };
    },
    onSuccess(result) {
      const productNotice = editing
        ? "Produto atualizado e pronto para a vitrine."
        : "Produto criado e adicionado ao catalogo.";
      setNotice(
        result.categoryCreated
          ? `${productNotice} A categoria "${result.category.name}" tambem foi salva.`
          : productNotice,
      );
      setCreating(false);
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      void queryClient.invalidateQueries({ queryKey: ["catalog-categories"] });
    },
  });
  const removeProduct = useMutation({
    mutationFn: deleteProduct,
    onSuccess() {
      setNotice("Produto removido da lista ativa do catalogo.");
      setPendingDelete(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
  });
  const updateBulkProductStatus = useMutation({
    mutationFn: async ({
      products: targetProducts,
      status,
    }: {
      products: AdminProductRow[];
      status: AdminProductRow["status"];
    }) => {
      await Promise.all(
        targetProducts.map((product) =>
          updateProduct(product.id, {
            ...productRowToInput(product),
            isActive: status === "active",
          }),
        ),
      );
      return { count: targetProducts.length, status };
    },
    onSuccess(result) {
      setNotice(
        `${result.count} ${
          result.count === 1 ? "produto" : "produtos"
        } ${result.status === "active" ? "ativado" : "pausado"}${
          result.count === 1 ? "" : "s"
        }.`,
      );
      setSelectedProductIds(new Set());
      void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
  });
  const showForm = creating || editing != null;
  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.status !== defaultProductFilters.status ||
    filters.category !== defaultProductFilters.category;
  const clearFilters = () => setFilters({ ...defaultProductFilters });
  const allProducts = useMemo(
    () =>
      [...(products.data?.items ?? [])].sort(
        (first, second) =>
          first.sortOrder - second.sortOrder ||
          first.name.localeCompare(second.name, "pt-BR"),
      ),
    [products.data?.items],
  );
  const filteredProducts = useMemo(
    () =>
      allProducts.filter((product) => {
        const search = filters.search.trim().toLocaleLowerCase("pt-BR");
        const matchesSearch = search
          ? [
              product.name,
              product.sku,
              product.slug,
              product.subtitle ?? "",
            ].some((value) => value.toLocaleLowerCase("pt-BR").includes(search))
          : true;
        const matchesStatus =
          filters.status === "all" ? true : product.status === filters.status;
        const matchesCategory = filters.category
          ? product.categorySlug === filters.category
          : true;
        return matchesSearch && matchesStatus && matchesCategory;
      }),
    [allProducts, filters],
  );
  const selectedProducts = allProducts.filter((product) =>
    selectedProductIds.has(product.id),
  );
  const filteredProductIds = filteredProducts.map((product) => product.id);
  const selectedVisibleCount = filteredProductIds.filter((id) =>
    selectedProductIds.has(id),
  ).length;
  const allVisibleProductsSelected =
    filteredProductIds.length > 0 &&
    selectedVisibleCount === filteredProductIds.length;
  const productIdKey = allProducts.map((product) => product.id).join("|");

  useEffect(() => {
    setSelectedProductIds((current) => {
      const validIds = new Set(allProducts.map((product) => product.id));
      const next = new Set([...current].filter((id) => validIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [allProducts, productIdKey]);

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented || isEditableShortcutTarget(event.target))
        return;
      const key = event.key.toLocaleLowerCase("pt-BR");

      if (key === "/") {
        event.preventDefault();
        document.getElementById(productSearchInputId)?.focus();
        return;
      }

      if (key === "n" && !categories.isLoading) {
        event.preventDefault();
        setCreating(true);
        setEditing(null);
        setNotice("");
        return;
      }

      if (key === "escape") {
        if (pendingDelete) {
          event.preventDefault();
          setPendingDelete(null);
          return;
        }
        if (showForm) {
          event.preventDefault();
          setCreating(false);
          setEditing(null);
          return;
        }
        if (selectedProductIds.size) {
          event.preventDefault();
          setSelectedProductIds(new Set());
        }
        return;
      }

      if (
        key === "e" &&
        event.shiftKey &&
        (event.ctrlKey || event.metaKey) &&
        filteredProducts.length
      ) {
        event.preventDefault();
        exportProductsCsv(filteredProducts);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    categories.isLoading,
    filteredProducts,
    pendingDelete,
    productSearchInputId,
    selectedProductIds.size,
    showForm,
  ]);

  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds((current) => {
      const next = new Set(current);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const toggleVisibleProductSelection = () => {
    setSelectedProductIds((current) => {
      const next = new Set(current);
      if (allVisibleProductsSelected) {
        filteredProductIds.forEach((id) => next.delete(id));
      } else {
        filteredProductIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };
  const productBulkBusy = updateBulkProductStatus.isPending;

  return (
    <section className="admin-page">
      <PageTitle
        eyebrow="Catalogo"
        title="Produtos"
        body="Cadastre, edite, publique ou remova produtos com imagem, preco e estoque sem depender de codigo."
        action={
          <div className="page-title__actions">
            <Button
              disabled={products.isLoading || filteredProducts.length === 0}
              title="Exportar produtos filtrados"
              type="button"
              variant="secondary"
              onClick={() => exportProductsCsv(filteredProducts)}
            >
              <Download size={16} />
              Exportar
            </Button>
            <Button
              aria-keyshortcuts="N"
              disabled={categories.isLoading}
              title="Novo produto"
              onClick={() => {
                setCreating(true);
                setEditing(null);
                setNotice("");
              }}
            >
              <Plus size={16} />
              Novo produto
            </Button>
          </div>
        }
      />
      {notice ? (
        <p className="notice-text">
          <CheckCircle2 size={16} />
          {notice}
        </p>
      ) : null}
      {products.isError ? (
        <p className="error-text" role="alert">
          Nao foi possivel carregar os produtos. Tente novamente.
        </p>
      ) : null}
      <div className="filters-row">
        <TextField
          aria-keyshortcuts="/"
          id={productSearchInputId}
          label="Buscar produto"
          placeholder="SKU, slug ou nome"
          title="Focar busca"
          value={filters.search}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              search: event.target.value,
            }))
          }
        />
        <SelectField
          label="Status"
          value={filters.status}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              status: event.target.value,
            }))
          }
        >
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
          <option value="all">Todos</option>
        </SelectField>
        <SelectField
          label="Categoria"
          value={filters.category}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              category: event.target.value,
            }))
          }
        >
          <option value="">Todas</option>
          {categoryOptions.map((category) => (
            <option value={category.slug} key={category.id}>
              {category.name}
            </option>
          ))}
        </SelectField>
        <Button
          disabled={!hasActiveFilters}
          type="button"
          variant="secondary"
          onClick={clearFilters}
        >
          <RotateCcw size={16} />
          Limpar filtros
        </Button>
        <div className="filters-row__summary" aria-live="polite">
          <strong>{filteredProducts.length}</strong>
          <span>
            {filteredProducts.length === 1
              ? "produto exibido"
              : "produtos exibidos"}
          </span>
        </div>
      </div>
      {categories.isError ? (
        <p className="error-text" role="alert">
          Nao foi possivel carregar as categorias usadas pela vitrine.
        </p>
      ) : null}
      {selectedProducts.length ? (
        <ProductBulkActions
          busy={productBulkBusy}
          selectedCount={selectedProducts.length}
          onActivate={() =>
            updateBulkProductStatus.mutate({
              products: selectedProducts,
              status: "active",
            })
          }
          onClear={() => setSelectedProductIds(new Set())}
          onExport={() => exportProductsCsv(selectedProducts, "selecionados")}
          onPause={() =>
            updateBulkProductStatus.mutate({
              products: selectedProducts,
              status: "inactive",
            })
          }
        />
      ) : null}
      {updateBulkProductStatus.error ? (
        <p className="error-text" role="alert">
          {updateBulkProductStatus.error.message}
        </p>
      ) : null}
      {showForm ? (
        <ProductEditor
          key={editing?.id ?? "new"}
          categories={categoryOptions}
          initial={editing ? productRowToInput(editing) : emptyProductInput()}
          initialCategoryName={editing?.category ?? ""}
          mode={editing ? "edit" : "create"}
          saving={saveProduct.isPending}
          error={saveProduct.error?.message}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSubmit={(submission) => saveProduct.mutate(submission)}
        />
      ) : null}
      {removeProduct.error ? (
        <p className="error-text" role="alert">
          {removeProduct.error.message}
        </p>
      ) : null}
      {pendingDelete ? (
        <ProductDeleteConfirmation
          deleting={
            removeProduct.isPending &&
            removeProduct.variables === pendingDelete.id
          }
          product={pendingDelete}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => removeProduct.mutate(pendingDelete.id)}
        />
      ) : null}
      <ProductsTable
        loading={products.isLoading}
        products={filteredProducts}
        hasActiveFilters={hasActiveFilters}
        deletingId={removeProduct.variables}
        selectedIds={selectedProductIds}
        allVisibleSelected={allVisibleProductsSelected}
        selectedVisibleCount={selectedVisibleCount}
        onClearFilters={clearFilters}
        onEdit={(product) => {
          setCreating(false);
          setEditing(product);
          setNotice("");
          setPendingDelete(null);
        }}
        onDelete={(product) => setPendingDelete(product)}
        onToggleSelect={toggleProductSelection}
        onToggleSelectAll={toggleVisibleProductSelection}
      />
    </section>
  );
}

function Inventory() {
  return (
    <Placeholder
      title="Estoque"
      body="Movimentacoes atomicas, historico e ajustes com justificativa obrigatoria."
    />
  );
}

function Orders() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<OrderSummary | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [notice, setNotice] = useState("");
  const orders = useQuery({
    queryKey: ["admin-orders", showArchived],
    queryFn: () => getOrders(showArchived),
  });
  const orderItems = orders.data?.items ?? [];
  const save = useMutation({
    mutationFn: ({
      reference,
      payload,
    }: {
      reference: string;
      payload: AdminOrderUpdate;
    }) => updateOrder(reference, payload),
    onSuccess(order) {
      setSelected(order);
      void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
  });
  const archive = useMutation({
    mutationFn: () =>
      setOrdersArchived({
        references: orderItems.map((order) => order.publicReference),
        archived: !showArchived,
      }),
    onSuccess(result) {
      setNotice(
        showArchived
          ? `${result.changed} pedidos restaurados.`
          : `${result.changed} pedidos arquivados e removidos dos indicadores.`,
      );
      setConfirmArchive(false);
      void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
  });
  const whatsappRevenue = useMutation({
    mutationFn: ({
      reference,
      confirmed,
    }: {
      reference: string;
      confirmed: boolean;
    }) => setWhatsappRevenueConfirmed(reference, confirmed),
    onSuccess() {
      setNotice("Receita do pedido atualizada.");
      void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
  });

  return (
    <section className="admin-page">
      <PageTitle
        eyebrow="Operacao"
        title="Pedidos"
        action={
          <div className="page-title__actions">
            <Button
              loading={orders.isFetching}
              type="button"
              variant="secondary"
              onClick={() => orders.refetch()}
            >
              <RefreshCw size={16} />
              Atualizar
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setNotice("");
                setShowArchived((value) => !value);
              }}
            >
              {showArchived ? <RotateCcw size={16} /> : <Archive size={16} />}
              {showArchived ? "Ver atuais" : "Ver arquivados"}
            </Button>
            <Button
              disabled={orders.isLoading || orderItems.length === 0}
              title="Exportar historico de pedidos"
              type="button"
              variant="secondary"
              onClick={() => exportOrdersCsv(orderItems)}
            >
              <Download size={16} />
              Exportar
            </Button>
          </div>
        }
      />
      {notice ? (
        <p className="notice-text" role="status">
          <CheckCircle2 size={16} /> {notice}
        </p>
      ) : null}
      {orders.isError ? (
        <p className="error-text" role="alert">
          Nao foi possivel carregar os pedidos. Tente novamente.
        </p>
      ) : null}
      <OrderHistory
        loading={orders.isLoading}
        orders={orderItems}
        revenuePendingReference={whatsappRevenue.variables?.reference}
        onManage={setSelected}
        onToggleWhatsappRevenue={(order) =>
          whatsappRevenue.mutate({
            reference: order.publicReference,
            confirmed: !order.revenueConfirmedAt,
          })
        }
      />
      {orderItems.length ? (
        <section className="panel history-maintenance">
          <div>
            <p className="panel-eyebrow">Organizacao do historico</p>
            <h2>
              {showArchived
                ? "Restaurar pedidos arquivados"
                : "Arquivar pedidos de teste"}
            </h2>
            <p>
              {showArchived
                ? "Os pedidos voltam a participar do Dashboard e dos Relatorios."
                : "Os pedidos permanecem preservados para auditoria, mas deixam de participar dos indicadores e relatorios atuais."}
            </p>
          </div>
          <Button
            type="button"
            variant={showArchived ? "secondary" : "danger"}
            onClick={() => setConfirmArchive(true)}
          >
            {showArchived ? <RotateCcw size={16} /> : <Archive size={16} />}
            {showArchived
              ? "Restaurar este historico"
              : "Arquivar historico atual"}
          </Button>
        </section>
      ) : null}
      {confirmArchive ? (
        <HistoryArchiveConfirmation
          archived={showArchived}
          count={orderItems.length}
          pending={archive.isPending}
          onCancel={() => setConfirmArchive(false)}
          onConfirm={() => archive.mutate()}
        />
      ) : null}
      {selected ? (
        <OrderOperations
          key={`${selected.publicReference}-${selected.updatedAt}`}
          order={selected}
          saving={save.isPending}
          error={save.error?.message}
          onClose={() => setSelected(null)}
          onSave={(payload) =>
            save.mutate({ reference: selected.publicReference, payload })
          }
        />
      ) : null}
    </section>
  );
}

function OrderOperations({
  order,
  saving,
  error,
  onClose,
  onSave,
}: {
  order: OrderSummary;
  saving: boolean;
  error?: string;
  onClose: () => void;
  onSave: (payload: AdminOrderUpdate) => void;
}) {
  const [shippingAmount, setShippingAmount] = useState(
    order.shippingAmountInCents == null
      ? ""
      : currencyInputFromCents(order.shippingAmountInCents),
  );
  const [form, setForm] = useState<AdminOrderUpdate>({
    shippingStatus: order.shippingStatus ?? "awaiting_payment",
    contactStatus: order.contactStatus ?? "not_started",
    shippingAmountInCents: order.shippingAmountInCents,
    shippingNotes: order.shippingNotes,
    deliveryMethod: order.deliveryMethod ?? "undecided",
    deliveryAddress: order.deliveryAddress,
    pickupInstructions: order.pickupInstructions,
  });
  const paymentApproved = order.paymentStatus === "approved";

  return (
    <form
      className="panel order-operations"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({
          ...form,
          shippingAmountInCents: shippingAmount.trim()
            ? currencyInputToCents(shippingAmount)
            : null,
        });
      }}
    >
      <div className="order-operations__heading">
        <div>
          <p className="panel-eyebrow">{order.publicReference}</p>
          <h2>Entrega e atendimento</h2>
          <p>
            Pagamento: {paymentMethodLabel(order)} -{" "}
            {order.paymentStatus ?? "nao aplicavel"}
          </p>
          {!paymentApproved ? (
            <p className="order-operations__notice">
              A entrega so pode avancar depois da confirmacao do pagamento.
            </p>
          ) : null}
        </div>
        <IconButton
          label="Fechar edicao do pedido"
          onClick={onClose}
          type="button"
        >
          <X size={17} />
        </IconButton>
      </div>
      <div className="order-operations__grid">
        <SelectField
          label="Status do frete"
          value={form.shippingStatus}
          onChange={(event) =>
            setForm({
              ...form,
              shippingStatus: event.target
                .value as AdminOrderUpdate["shippingStatus"],
            })
          }
        >
          <option value="awaiting_payment">Aguardando pagamento</option>
          <option disabled={!paymentApproved} value="awaiting_contact">
            Aguardando contato
          </option>
          <option disabled={!paymentApproved} value="contact_started">
            Contato iniciado
          </option>
          <option
            disabled={!paymentApproved}
            value="awaiting_customer_response"
          >
            Aguardando cliente
          </option>
          <option disabled={!paymentApproved} value="arranged">
            Combinado
          </option>
          <option disabled={!paymentApproved} value="ready_for_pickup">
            Pronto para retirada
          </option>
          <option disabled={!paymentApproved} value="dispatched">
            Enviado
          </option>
          <option disabled={!paymentApproved} value="delivered">
            Entregue
          </option>
          <option value="cancelled">Cancelado</option>
        </SelectField>
        <SelectField
          label="Status do atendimento"
          value={form.contactStatus}
          onChange={(event) =>
            setForm({
              ...form,
              contactStatus: event.target
                .value as AdminOrderUpdate["contactStatus"],
            })
          }
        >
          <option value="not_started">Nao iniciado</option>
          <option value="whatsapp_opened">WhatsApp acionado</option>
          <option value="contact_started">Contato iniciado</option>
          <option value="completed">Concluido</option>
        </SelectField>
        <SelectField
          label="Forma de entrega"
          value={form.deliveryMethod}
          onChange={(event) =>
            setForm({
              ...form,
              deliveryMethod: event.target
                .value as AdminOrderUpdate["deliveryMethod"],
            })
          }
        >
          <option value="undecided">A definir</option>
          <option value="delivery">Entrega</option>
          <option value="pickup">Retirada</option>
        </SelectField>
        <TextField
          label="Valor do frete (opcional)"
          inputMode="decimal"
          placeholder="Deixe vazio enquanto nao definido"
          value={shippingAmount}
          onChange={(event) => setShippingAmount(event.target.value)}
        />
        <TextAreaField
          className="order-operations__wide"
          label="Observacoes"
          rows={3}
          maxLength={1000}
          value={form.shippingNotes ?? ""}
          onChange={(event) =>
            setForm({ ...form, shippingNotes: event.target.value || null })
          }
        />
        <TextAreaField
          label="Endereco combinado"
          rows={3}
          maxLength={500}
          value={form.deliveryAddress ?? ""}
          onChange={(event) =>
            setForm({ ...form, deliveryAddress: event.target.value || null })
          }
        />
        <TextAreaField
          label="Instrucoes de retirada"
          rows={3}
          maxLength={500}
          value={form.pickupInstructions ?? ""}
          onChange={(event) =>
            setForm({ ...form, pickupInstructions: event.target.value || null })
          }
        />
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="order-operations__actions">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" loading={saving}>
          <Save size={16} /> Salvar pedido
        </Button>
      </div>
    </form>
  );
}

const storefrontEditorDefaults: StorefrontSettings = {
  settingsVersion: 2,
  brandName: "Sua loja",
  legalName: "Sua loja",
  logoUrl: "",
  logoOnDarkUrl: "",
  faviconUrl: "",
  socialImageUrl: "",
  contactEmail: "",
  defaultMetaTitle: "Sua loja | Catalogo",
  defaultMetaDescription:
    "Descubra a curadoria de produtos e compre online ou pelo WhatsApp.",
  heroImageUrl:
    "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1800&q=82",
  heroEyebrow: "Loja online",
  heroEyebrowFontSize: 12,
  heroTitle: "Sua loja",
  heroTitleFontSize: 56,
  manifestoLineOne: "UMA EXPERI\u00caNCIA EXCLUSIVA, SOFISTICADA",
  manifestoLineTwo:
    "CUIDADOSAMENTE SELECIONADA PARA QUEM VALORIZA PRESEN\u00c7A",
  manifestoItems: defaultManifestoItems.map((item) => ({ ...item })),
  manifestoMaxWidth: 880,
  manifestoDivider: "line",
  manifestoDividerMobileEnabled: false,
  editorialCatalogLabel: "Explorar catalogo",
  editorialSupportLabel: "Atendimento exclusivo",
  editorialOrdersLabel: "Acompanhar pedidos",
  editorialAccountLabel: "Minha conta",
  editorialNavigationMobileEnabled: false,
  heroHeight: "balanced",
  featuredEyebrow: "Selecao inicial",
  featuredTitle: "Produtos em destaque",
  featuredDescription: "Uma selecao preparada para facilitar sua escolha.",
  featuredLinkLabel: "Ver todos",
  featuredAddButtonLabel: "Adicionar",
  featuredAddedButtonLabel: "Adicionado",
  categoryEyebrow: "Explore",
  categoryTitle: "Compre por categoria",
  categoryDescription: "Encontre rapidamente o que combina com o seu momento.",
  categoryLinkLabel: "Ver catalogo completo",
  categoryLayout: "rail",
  categoryLimit: 6,
  commerceEyebrow: "Compre do seu jeito",
  commerceTitle: "Atendimento proximo ou pagamento online",
  commerceDescription:
    "Escolha a experiencia que faz mais sentido para voce, com a mesma seguranca em toda a jornada.",
  commerceWhatsappTitle: "Comprar pelo WhatsApp",
  commerceWhatsappDescription:
    "Finalize com atendimento humano para tirar duvidas e combinar os detalhes diretamente com a loja.",
  commerceOnlineTitle: "Pagar online",
  commerceOnlineDescription:
    "Conclua o pagamento com Pix ou cartao e continue o atendimento pelo WhatsApp quando necessario.",
  commerceCtaLabel: "Explorar produtos",
  catalogEyebrow: "Loja",
  catalogTitle: "Catalogo",
  catalogDescription:
    "Explore os produtos, compare opcoes e encontre a escolha certa para voce.",
  catalogDensity: "comfortable",
  catalogBackgroundColor: "#f9f6f0",
  catalogSurfaceColor: "#ffffff",
  catalogTextColor: "#090907",
  catalogSecondaryTextColor: "#5c584f",
  catalogAccentColor: "#c9a76d",
  catalogBorderColor: "#d8d1c5",
  catalogButtonBackgroundColor: "#090907",
  catalogButtonTextColor: "#ffffff",
  catalogCardStyle: "boutique",
  catalogImageFit: "contain",
  catalogImageRatio: "landscape",
  catalogButtonStyle: "solid",
  catalogCardRadius: 8,
  catalogColumnsDesktop: 4,
  catalogColumnsTablet: 2,
  catalogColumnsMobile: 2,
  catalogTextStyles: {
    eyebrow: { ...defaultCatalogTextStyles.eyebrow },
    title: { ...defaultCatalogTextStyles.title },
    description: { ...defaultCatalogTextStyles.description },
    category: { ...defaultCatalogTextStyles.category },
    cardTitle: { ...defaultCatalogTextStyles.cardTitle },
    cardDescription: { ...defaultCatalogTextStyles.cardDescription },
    price: { ...defaultCatalogTextStyles.price },
    button: { ...defaultCatalogTextStyles.button },
  },
  homeLayout: "editorial",
  productCardStyle: "boutique",
  imageFit: "contain",
  homeProductImageRatio: "landscape",
  homeProductDescriptionMode: "full",
  homeProductColumnsDesktop: 4,
  homeProductColumnsTablet: 2,
  homeProductColumnsMobile: 2,
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
    categoryEyebrow: { ...defaultStorefrontTextStyles.categoryEyebrow },
    categoryTitle: { ...defaultStorefrontTextStyles.categoryTitle },
    categoryBody: { ...defaultStorefrontTextStyles.categoryBody },
    productCardTitle: { ...defaultStorefrontTextStyles.productCardTitle },
    commerceEyebrow: { ...defaultStorefrontTextStyles.commerceEyebrow },
    commerceTitle: { ...defaultStorefrontTextStyles.commerceTitle },
    commerceBody: { ...defaultStorefrontTextStyles.commerceBody },
    reviewsEyebrow: { ...defaultStorefrontTextStyles.reviewsEyebrow },
    reviewsTitle: { ...defaultStorefrontTextStyles.reviewsTitle },
    reviewsBody: { ...defaultStorefrontTextStyles.reviewsBody },
    footerSlogan: { ...defaultStorefrontTextStyles.footerSlogan },
  },
  storefrontFont: "signature",
  adminFont: "signature",
  reviewsEnabled: false,
  reviewsEyebrow: "Avaliacoes",
  reviewsTitle: "Experiencias compartilhadas",
  reviewsItems: [],
  reviewsSpeedSeconds: 38,
  reviewsBackgroundColor: "#faf8f4",
  reviewsCardColor: "#ffffff",
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
  footerLinks: defaultFooterLinks.map((link) => ({ ...link })),
  footerPrivacyLabel: "Privacidade",
  footerCatalogLabel: "Catalogo",
  footerSupportLabel: "Suporte",
  whatsappNumber: "",
  whatsappPurchaseMessage:
    "Gostaria de confirmar disponibilidade e combinar os proximos passos diretamente com a loja.",
  postPaymentWhatsappMessage:
    "Meu pagamento foi confirmado. Gostaria de combinar o frete ou a retirada com a equipe.",
  primaryColor: "#090907",
  accentColor: "#c9a76d",
  headerBackgroundColor: "#ffffff",
  headerTextColor: "#090907",
  headerAccentColor: "#c9a76d",
  headerButtonMode: "automatic",
  headerButtonBackgroundColor: "#090907",
  headerButtonTextColor: "#ffffff",
  headerFontFamily: "modern",
  headerNavFontSize: 15,
  headerButtonFontSize: 15,
  headerHeight: 72,
  headerLogoWidth: 300,
  headerButtonStyle: "solid",
  headerButtonRadius: 6,
  headerBorderColor: "#d8d1c5",
  headerBorderWidth: 1,
  headerShadow: "subtle",
  headerSticky: true,
  footerColor: "#c9a76d",
  backgroundColor: "#ffffff",
  homeSurfaceColor: "#faf8f4",
  homeAlternateColor: "#f3efe8",
  homeSecondaryTextColor: "#5c584f",
  homeBorderColor: "#d8d1c5",
  homeShadowColor: "#090907",
  homeTransitionStartColor: "#c9a76d",
  homeTransitionEndColor: "#faf8f4",
};

function normalizeStorefrontEditorInitial(
  initial: StorefrontSettings,
): StorefrontSettings {
  const legacy = initial as Partial<StorefrontSettings>;
  const textStyles = legacy.homeTextStyles;
  const catalogTextStyles = legacy.catalogTextStyles;
  const legacyHeaderFont = legacy.headerFontFamily ?? "modern";
  const configuredHomeSections = legacy.homeSections ?? [];
  const knownHomeSectionIds = new Set(
    defaultHomeSections.map((section) => section.id),
  );
  const seenHomeSectionIds = new Set<string>();
  const homeSections: StorefrontSettings["homeSections"] =
    configuredHomeSections.filter((section) => {
      if (
        !knownHomeSectionIds.has(section.id) ||
        seenHomeSectionIds.has(section.id)
      ) {
        return false;
      }
      seenHomeSectionIds.add(section.id);
      return true;
    });
  for (const section of defaultHomeSections) {
    if (seenHomeSectionIds.has(section.id)) continue;
    const nextSection = { ...section };
    const featuredIndex = homeSections.findIndex(
      (current) => current.id === "featured",
    );
    if (section.id === "categories" && featuredIndex >= 0) {
      homeSections.splice(featuredIndex, 0, nextSection);
    } else if (section.id === "commerce" && featuredIndex >= 0) {
      homeSections.splice(featuredIndex + 1, 0, nextSection);
    } else {
      homeSections.push(nextSection);
    }
    seenHomeSectionIds.add(section.id);
  }

  return {
    ...storefrontEditorDefaults,
    ...legacy,
    homeSections,
    headerFontFamily:
      legacyHeaderFont === "inherit" ||
      legacyHeaderFont === "display" ||
      legacyHeaderFont === "body"
        ? "modern"
        : legacyHeaderFont,
    manifestoItems: (legacy.manifestoItems ?? defaultManifestoItems).map(
      (item) => ({
        ...item,
        fontFamily:
          item.fontFamily === "display" || item.fontFamily === "body"
            ? "inherit"
            : (item.fontFamily ?? "inherit"),
        fontSize: item.fontSize ?? 0,
        spacingAfter: item.spacingAfter ?? 40,
      }),
    ),
    homeMotionByBlock: {
      ...storefrontEditorDefaults.homeMotionByBlock,
      ...(legacy.homeMotionByBlock ?? {}),
    },
    homeTextStyles: {
      heroEyebrow: {
        ...storefrontEditorDefaults.homeTextStyles.heroEyebrow,
        ...(textStyles?.heroEyebrow ?? {}),
      },
      heroTitle: {
        ...storefrontEditorDefaults.homeTextStyles.heroTitle,
        ...(textStyles?.heroTitle ?? {}),
      },
      manifesto: {
        ...storefrontEditorDefaults.homeTextStyles.manifesto,
        ...(textStyles?.manifesto ?? {}),
      },
      navigation: {
        ...storefrontEditorDefaults.homeTextStyles.navigation,
        ...(textStyles?.navigation ?? {}),
      },
      featuredEyebrow: {
        ...storefrontEditorDefaults.homeTextStyles.featuredEyebrow,
        ...(textStyles?.featuredEyebrow ?? {}),
      },
      featuredTitle: {
        ...storefrontEditorDefaults.homeTextStyles.featuredTitle,
        ...(textStyles?.featuredTitle ?? {}),
      },
      categoryEyebrow: {
        ...storefrontEditorDefaults.homeTextStyles.categoryEyebrow,
        ...(textStyles?.categoryEyebrow ?? {}),
      },
      categoryTitle: {
        ...storefrontEditorDefaults.homeTextStyles.categoryTitle,
        ...(textStyles?.categoryTitle ?? {}),
      },
      categoryBody: {
        ...storefrontEditorDefaults.homeTextStyles.categoryBody,
        ...(textStyles?.categoryBody ?? {}),
      },
      productCardTitle: {
        ...storefrontEditorDefaults.homeTextStyles.productCardTitle,
        ...(textStyles?.productCardTitle ?? {}),
      },
      commerceEyebrow: {
        ...storefrontEditorDefaults.homeTextStyles.commerceEyebrow,
        ...(textStyles?.commerceEyebrow ?? {}),
      },
      commerceTitle: {
        ...storefrontEditorDefaults.homeTextStyles.commerceTitle,
        ...(textStyles?.commerceTitle ?? {}),
      },
      commerceBody: {
        ...storefrontEditorDefaults.homeTextStyles.commerceBody,
        ...(textStyles?.commerceBody ?? {}),
      },
      reviewsEyebrow: {
        ...storefrontEditorDefaults.homeTextStyles.reviewsEyebrow,
        ...(textStyles?.reviewsEyebrow ?? {}),
      },
      reviewsTitle: {
        ...storefrontEditorDefaults.homeTextStyles.reviewsTitle,
        ...(textStyles?.reviewsTitle ?? {}),
      },
      reviewsBody: {
        ...storefrontEditorDefaults.homeTextStyles.reviewsBody,
        ...(textStyles?.reviewsBody ?? {}),
      },
      footerSlogan: {
        ...storefrontEditorDefaults.homeTextStyles.footerSlogan,
        ...(textStyles?.footerSlogan ?? {}),
      },
    },
    catalogTextStyles: {
      eyebrow: {
        ...storefrontEditorDefaults.catalogTextStyles.eyebrow,
        ...(catalogTextStyles?.eyebrow ?? {}),
      },
      title: {
        ...storefrontEditorDefaults.catalogTextStyles.title,
        ...(catalogTextStyles?.title ?? {}),
      },
      description: {
        ...storefrontEditorDefaults.catalogTextStyles.description,
        ...(catalogTextStyles?.description ?? {}),
      },
      category: {
        ...storefrontEditorDefaults.catalogTextStyles.category,
        ...(catalogTextStyles?.category ?? {}),
      },
      cardTitle: {
        ...storefrontEditorDefaults.catalogTextStyles.cardTitle,
        ...(catalogTextStyles?.cardTitle ?? {}),
      },
      cardDescription: {
        ...storefrontEditorDefaults.catalogTextStyles.cardDescription,
        ...(catalogTextStyles?.cardDescription ?? {}),
      },
      price: {
        ...storefrontEditorDefaults.catalogTextStyles.price,
        ...(catalogTextStyles?.price ?? {}),
      },
      button: {
        ...storefrontEditorDefaults.catalogTextStyles.button,
        ...(catalogTextStyles?.button ?? {}),
      },
    },
  };
}

type ProductEditorSubmission = {
  product: AdminProductInput;
  categoryName: string;
};

function normalizeCategoryName(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function emptyProductInput(): AdminProductInput {
  return {
    name: "",
    subtitle: "",
    description:
      "Descricao completa do produto com detalhes, acabamento e indicacao de uso.",
    categorySlug: "",
    priceInCents: 0,
    compareAtPriceInCents: null,
    stock: 0,
    lowStockThreshold: 3,
    lowStockWarningEnabled: false,
    imageUrl: "",
    imageAlt: "",
    imageWidth: undefined,
    imageHeight: undefined,
    imageContentType: undefined,
    imageSizeBytes: undefined,
    isActive: true,
    isFeatured: true,
    sortOrder: 0,
  };
}

function productRowToInput(product: AdminProductRow): AdminProductInput {
  return {
    sku: product.sku,
    slug: product.slug,
    name: product.name,
    subtitle: product.subtitle,
    description: product.description,
    categorySlug: product.categorySlug,
    priceInCents: product.priceInCents,
    compareAtPriceInCents: product.compareAtPriceInCents,
    stock: product.stock,
    lowStockThreshold: product.lowStockThreshold,
    lowStockWarningEnabled: product.lowStockWarningEnabled,
    imageUrl: product.imageUrl,
    imageAlt: product.imageAlt,
    imageWidth: product.imageWidth,
    imageHeight: product.imageHeight,
    imageContentType: product.imageContentType,
    imageSizeBytes: product.imageSizeBytes,
    isActive: product.status === "active",
    isFeatured: product.isFeatured,
    sortOrder: product.sortOrder,
  };
}

function currencyInputFromCents(value: number) {
  return (value / 100).toFixed(2).replace(".", ",");
}

function currencyInputToCents(value: string) {
  const clean = value.trim().replace(/[R$\s]/g, "");
  const normalized = clean.includes(",")
    ? clean.replace(/\./g, "").replace(",", ".")
    : clean;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100)) : 0;
}

function TextAreaField({
  label,
  error,
  hint,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  hint?: string;
}) {
  const generatedId = useId();
  const fieldId = props.id ?? generatedId;
  const errorId = error ? `${fieldId}-error` : undefined;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const describedBy = [props["aria-describedby"], hintId, errorId]
    .filter(Boolean)
    .join(" ");
  return (
    <label className={`ds-field ${className ?? ""}`}>
      <span>{label}</span>
      <textarea
        {...props}
        id={fieldId}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy || undefined}
      />
      {hint ? (
        <small className="ds-field__hint" id={hintId}>
          {hint}
        </small>
      ) : null}
      {error ? <small id={errorId}>{error}</small> : null}
    </label>
  );
}

function CategoryCombobox({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string;
  onChange: (value: string) => void;
}) {
  const inputId = useId();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [filterSuggestions, setFilterSuggestions] = useState(false);
  const query = normalizeCategoryName(value);
  const options =
    filterSuggestions && query
      ? categories.filter((category) =>
          normalizeCategoryName(category.name).includes(query),
        )
      : categories;
  const activeOption = options[activeIndex];

  function showOptions() {
    const selectedIndex = categories.findIndex(
      (category) => normalizeCategoryName(category.name) === query,
    );
    setActiveIndex(
      selectedIndex >= 0 ? selectedIndex : categories.length ? 0 : -1,
    );
    setFilterSuggestions(false);
    setOpen(true);
  }

  function selectCategory(name: string) {
    onChange(name);
    setOpen(false);
    setActiveIndex(-1);
    setFilterSuggestions(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        showOptions();
        return;
      }
      if (!options.length) return;
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((current) => {
        if (current < 0) return direction > 0 ? 0 : options.length - 1;
        return (current + direction + options.length) % options.length;
      });
      return;
    }

    if (event.key === "Enter" && open && activeOption) {
      event.preventDefault();
      selectCategory(activeOption.name);
      return;
    }

    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
      setFilterSuggestions(false);
    }
  }

  return (
    <div
      className="ds-field category-combobox"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
          setActiveIndex(-1);
          setFilterSuggestions(false);
        }
      }}
    >
      <label htmlFor={inputId}>Categoria</label>
      <div className="category-combobox__control">
        <input
          ref={inputRef}
          id={inputId}
          name="categoryName"
          role="combobox"
          required
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={open}
          aria-activedescendant={
            open && activeOption
              ? `${listboxId}-option-${activeOption.id}`
              : undefined
          }
          placeholder="Digite uma nova categoria"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setActiveIndex(0);
            setFilterSuggestions(true);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className="category-combobox__toggle"
          aria-label="Mostrar categorias salvas"
          aria-controls={listboxId}
          aria-expanded={open}
          aria-haspopup="listbox"
          title="Mostrar categorias salvas"
          onClick={() => {
            if (open) {
              setOpen(false);
              setActiveIndex(-1);
              setFilterSuggestions(false);
            } else {
              showOptions();
            }
          }}
        >
          <ChevronDown size={18} aria-hidden="true" />
        </button>
      </div>
      {open ? (
        <div
          id={listboxId}
          className="category-combobox__menu"
          role="listbox"
          aria-label="Categorias salvas"
        >
          {options.length ? (
            options.map((category, index) => {
              const selected = normalizeCategoryName(category.name) === query;
              return (
                <button
                  type="button"
                  id={`${listboxId}-option-${category.id}`}
                  className="category-combobox__option"
                  role="option"
                  aria-selected={selected}
                  data-active={index === activeIndex}
                  key={category.id}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectCategory(category.name)}
                >
                  <span>{category.name}</span>
                  <Check size={16} aria-hidden="true" data-visible={selected} />
                </button>
              );
            })
          ) : (
            <p className="category-combobox__empty">
              {categories.length
                ? `Use "${value.trim()}" para criar uma nova categoria.`
                : "Nenhuma categoria salva ainda."}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ProductEditor({
  categories,
  initial,
  initialCategoryName,
  mode,
  saving,
  error,
  onCancel,
  onSubmit,
}: {
  categories: Category[];
  initial: AdminProductInput;
  initialCategoryName: string;
  mode: "create" | "edit";
  saving: boolean;
  error?: string;
  onCancel: () => void;
  onSubmit: (submission: ProductEditorSubmission) => void;
}) {
  const [form, setForm] = useState<AdminProductInput>(initial);
  const [price, setPrice] = useState(
    currencyInputFromCents(initial.priceInCents),
  );
  const [comparePrice, setComparePrice] = useState(
    initial.compareAtPriceInCents
      ? currencyInputFromCents(initial.compareAtPriceInCents)
      : "",
  );
  const [imageUploading, setImageUploading] = useState(false);
  const [imageMissing, setImageMissing] = useState(false);
  const [categoryName, setCategoryName] = useState(
    initialCategoryName ||
      categories.find((category) => category.slug === initial.categorySlug)
        ?.name ||
      "",
  );
  const categoryLabel = categoryName.trim() || "Categoria";
  const payloadPreviewPrice = currencyInputToCents(price);

  return (
    <form
      className="panel editor-form product-editor"
      onSubmit={(event) => {
        event.preventDefault();
        if (imageUploading) return;
        if (!form.imageUrl) {
          setImageMissing(true);
          return;
        }
        onSubmit({
          categoryName: categoryName.trim(),
          product: {
            ...form,
            sku: form.sku?.trim() || undefined,
            slug: form.slug?.trim() || undefined,
            name: form.name.trim(),
            subtitle: form.subtitle?.trim() ? form.subtitle.trim() : null,
            description: form.description.trim(),
            imageUrl: form.imageUrl.trim(),
            imageAlt: form.imageAlt.trim(),
            priceInCents: payloadPreviewPrice,
            compareAtPriceInCents: comparePrice.trim()
              ? currencyInputToCents(comparePrice)
              : null,
          },
        });
      }}
    >
      <div className="editor-form__header">
        <div>
          <p>
            {mode === "create" ? "Novo item de catalogo" : "Edicao de catalogo"}
          </p>
          <h2>{mode === "create" ? "Cadastrar produto" : "Editar produto"}</h2>
          <span>
            Imagem, descricao, preco e estoque saem daqui para a operacao.
          </span>
        </div>
        <Badge tone={form.isActive ? "success" : "warning"}>
          {form.isActive ? "Publicado" : "Oculto"}
        </Badge>
      </div>
      <div className="product-editor__layout">
        <div className="product-editor__fields">
          <section className="editor-section">
            <div className="editor-section__title">
              <Store size={18} />
              <h3>Identidade do produto</h3>
            </div>
            <div className="editor-form__grid">
              <TextField
                label="Titulo"
                required
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
              />
              <TextField
                label="Subtitulo"
                value={form.subtitle ?? ""}
                onChange={(event) =>
                  setForm({ ...form, subtitle: event.target.value })
                }
              />
              <CategoryCombobox
                categories={categories}
                value={categoryName}
                onChange={setCategoryName}
              />
              <SelectField
                label="Status"
                value={form.isActive ? "active" : "inactive"}
                onChange={(event) =>
                  setForm({
                    ...form,
                    isActive: event.target.value === "active",
                  })
                }
              >
                <option value="active">Publicado</option>
                <option value="inactive">Oculto da vitrine</option>
              </SelectField>
            </div>
          </section>
          <section className="editor-section">
            <div className="editor-section__title">
              <CreditCard size={18} />
              <h3>Preco e disponibilidade</h3>
            </div>
            <div className="editor-form__grid editor-form__grid--compact">
              <TextField
                label="Preco (R$)"
                required
                inputMode="decimal"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
              />
              <TextField
                label="Preco anterior (R$)"
                inputMode="decimal"
                value={comparePrice}
                onChange={(event) => setComparePrice(event.target.value)}
              />
              <TextField
                label="Estoque"
                required
                type="number"
                min={0}
                value={form.stock}
                onChange={(event) =>
                  setForm({ ...form, stock: Number(event.target.value) })
                }
              />
              <div className="product-stock-warning-control">
                <TextField
                  label="Aviso de estoque baixo"
                  required
                  type="number"
                  min={0}
                  value={form.lowStockThreshold}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      lowStockThreshold: Number(event.target.value),
                    })
                  }
                />
                <button
                  aria-checked={form.lowStockWarningEnabled}
                  className="product-stock-warning-toggle"
                  data-enabled={form.lowStockWarningEnabled}
                  role="switch"
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      lowStockWarningEnabled: !current.lowStockWarningEnabled,
                    }))
                  }
                >
                  <Power aria-hidden="true" size={18} />
                  <span>
                    <strong>
                      {form.lowStockWarningEnabled
                        ? "Aviso ativado"
                        : "Aviso desativado"}
                    </strong>
                    <small>Controla a mensagem exibida na vitrine.</small>
                  </span>
                </button>
              </div>
              <TextField
                label="Ordem na vitrine"
                required
                type="number"
                min={0}
                max={9999}
                value={form.sortOrder}
                onChange={(event) =>
                  setForm({ ...form, sortOrder: Number(event.target.value) })
                }
              />
              <label className="editor-checkbox">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(event) =>
                    setForm({ ...form, isFeatured: event.target.checked })
                  }
                />
                <span>
                  <strong>Produto em destaque</strong>
                  <small>Exibir na selecao principal da Home.</small>
                </span>
              </label>
            </div>
          </section>
          <section className="editor-section">
            <div className="editor-section__title">
              <ImageIcon size={18} />
              <h3>Imagem e descricao</h3>
            </div>
            <div className="editor-form__grid">
              <ImageUploadField
                label="Imagem principal"
                value={form.imageUrl}
                alt={form.imageAlt || form.name || "Previa do produto"}
                recommendation="Recomendado: 1200 x 1200 px (proporcao 1:1), com o produto centralizado e cerca de 10% de respiro nas bordas"
                variant="product"
                required
                disabled={saving}
                error={
                  imageMissing
                    ? "Adicione a imagem principal antes de salvar."
                    : undefined
                }
                onUploadingChange={setImageUploading}
                onChange={(upload) => {
                  setImageMissing(false);
                  setForm((current) => ({
                    ...current,
                    imageUrl: upload.url,
                    imageWidth: upload.width,
                    imageHeight: upload.height,
                    imageContentType: upload.contentType,
                    imageSizeBytes: upload.sizeBytes,
                  }));
                }}
              />
              <TextField
                label="Texto alternativo da imagem"
                required
                value={form.imageAlt}
                onChange={(event) =>
                  setForm({ ...form, imageAlt: event.target.value })
                }
              />
              <TextAreaField
                label="Descricao completa"
                hint={`O card exibe ate ${productCardDescriptionMaxLength} caracteres. Para criar topicos curtos, inicie cada linha com °, •, - ou *.`}
                required
                minLength={20}
                rows={5}
                className="editor-form__wide"
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
              />
            </div>
          </section>
        </div>
        <aside
          className="product-editor__preview"
          aria-label="Previa do produto"
        >
          <div className="product-editor__preview-media">
            {form.imageUrl ? (
              <img src={adminMediaUrl(form.imageUrl)} alt="" />
            ) : (
              <ImageIcon size={32} />
            )}
          </div>
          <div className="product-editor__preview-body">
            <div>
              <Badge>{categoryLabel}</Badge>
              {form.lowStockWarningEnabled &&
              form.stock <= form.lowStockThreshold ? (
                <Badge tone="warning">Estoque baixo</Badge>
              ) : null}
              <span>{form.isActive ? "Publicado" : "Oculto"}</span>
            </div>
            <h3>{form.name || "Nome do produto"}</h3>
            <p className="product-editor__preview-description">
              {formatProductCardDescription(
                form.description ||
                  "Descricao breve do produto para revisar o card antes de salvar.",
              )}
            </p>
            <div className="product-editor__preview-footer">
              <strong>{formatMoney(payloadPreviewPrice)}</strong>
              <span className="product-editor__preview-button">
                <ShoppingBag aria-hidden="true" size={15} />
                Adicionar
              </span>
            </div>
          </div>
        </aside>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="form-actions">
        <Button type="submit" loading={saving} disabled={imageUploading}>
          <Save size={16} />
          {imageUploading
            ? "Enviando imagem"
            : mode === "create"
              ? "Cadastrar produto"
              : "Salvar alteracoes"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={imageUploading || saving}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function ProductsTable({
  products,
  loading,
  hasActiveFilters,
  deletingId,
  selectedIds,
  allVisibleSelected,
  selectedVisibleCount,
  onClearFilters,
  onEdit,
  onDelete,
  onToggleSelect,
  onToggleSelectAll,
}: {
  products: AdminProductRow[];
  loading: boolean;
  hasActiveFilters: boolean;
  deletingId?: string;
  selectedIds: Set<string>;
  allVisibleSelected: boolean;
  selectedVisibleCount: number;
  onClearFilters: () => void;
  onEdit: (product: AdminProductRow) => void;
  onDelete: (product: AdminProductRow) => void;
  onToggleSelect: (productId: string) => void;
  onToggleSelectAll: () => void;
}) {
  if (loading) return <Skeleton className="table-skeleton" />;
  if (products.length === 0)
    return (
      <EmptyState
        title={hasActiveFilters ? "Nenhum produto encontrado" : "Sem produtos"}
        body={
          hasActiveFilters
            ? "Nenhum produto corresponde aos filtros atuais."
            : "Nenhum produto cadastrado."
        }
        action={
          hasActiveFilters ? (
            <Button type="button" variant="secondary" onClick={onClearFilters}>
              <RotateCcw size={16} />
              Limpar filtros
            </Button>
          ) : undefined
        }
      />
    );

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th className="selection-cell" scope="col">
              <SelectionCheckbox
                checked={allVisibleSelected}
                indeterminate={selectedVisibleCount > 0 && !allVisibleSelected}
                label="Selecionar produtos exibidos"
                onChange={onToggleSelectAll}
              />
            </th>
            <th scope="col">Produto</th>
            <th scope="col">Categoria</th>
            <th scope="col">Preco</th>
            <th scope="col">Estoque</th>
            <th scope="col">Vitrine</th>
            <th scope="col">Status</th>
            <th scope="col">Acoes</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td className="selection-cell" data-label="Selecionar">
                <SelectionCheckbox
                  checked={selectedIds.has(product.id)}
                  label={`Selecionar ${product.name}`}
                  onChange={() => onToggleSelect(product.id)}
                />
              </td>
              <td data-label="Produto">
                <div className="product-cell">
                  <img src={adminMediaUrl(product.imageUrl)} alt="" />
                  <span>
                    <strong>{product.name}</strong>
                    <small>{product.sku}</small>
                  </span>
                </div>
              </td>
              <td data-label="Categoria">{product.category}</td>
              <td data-label="Preco">{formatMoney(product.priceInCents)}</td>
              <td data-label="Estoque">
                {product.lowStock ? `${product.stock} - baixo` : product.stock}
              </td>
              <td data-label="Vitrine">
                <span className="merchandising-status">
                  <strong>{product.sortOrder}</strong>
                  {product.isFeatured ? (
                    <Badge tone="success">Destaque</Badge>
                  ) : (
                    <Badge tone="neutral">Catalogo</Badge>
                  )}
                </span>
              </td>
              <td data-label="Status">
                <Badge
                  tone={product.status === "active" ? "success" : "neutral"}
                >
                  {product.status === "active" ? "Ativo" : "Inativo"}
                </Badge>
              </td>
              <td data-label="Acoes">
                <div className="table-actions">
                  <IconButton
                    label={`Editar ${product.name}`}
                    onClick={() => onEdit(product)}
                  >
                    <Edit3 size={16} />
                  </IconButton>
                  <IconButton
                    label={`Apagar ${product.name}`}
                    onClick={() => onDelete(product)}
                    disabled={deletingId === product.id}
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SelectionCheckbox({
  checked,
  indeterminate = false,
  label,
  onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  label: string;
  onChange: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      aria-label={label}
      checked={checked}
      className="selection-checkbox"
      type="checkbox"
      onChange={onChange}
    />
  );
}

function ProductBulkActions({
  busy,
  selectedCount,
  onActivate,
  onClear,
  onExport,
  onPause,
}: {
  busy: boolean;
  selectedCount: number;
  onActivate: () => void;
  onClear: () => void;
  onExport: () => void;
  onPause: () => void;
}) {
  return (
    <section className="bulk-actions" aria-live="polite">
      <div>
        <strong>
          {selectedCount} {selectedCount === 1 ? "produto" : "produtos"}{" "}
          selecionado{selectedCount === 1 ? "" : "s"}
        </strong>
        <span>Acao aplicada somente aos itens marcados.</span>
      </div>
      <div className="bulk-actions__buttons">
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={onExport}
        >
          <Download size={16} />
          Exportar selecionados
        </Button>
        <Button
          type="button"
          variant="secondary"
          loading={busy}
          onClick={onActivate}
        >
          <CheckCircle2 size={16} />
          Ativar
        </Button>
        <Button
          type="button"
          variant="secondary"
          loading={busy}
          onClick={onPause}
        >
          <Power size={16} />
          Pausar
        </Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={onClear}>
          Limpar selecao
        </Button>
      </div>
    </section>
  );
}

function ProductDeleteConfirmation({
  product,
  deleting,
  onCancel,
  onConfirm,
}: {
  product: AdminProductRow;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <section
      className="panel delete-confirmation"
      aria-labelledby="delete-product-title"
    >
      <div>
        <p className="panel-eyebrow">Acao destrutiva</p>
        <h2 id="delete-product-title">Apagar produto do catalogo?</h2>
        <p>
          {product.name} sera removido da lista ativa. Se houver historico de
          pedidos, a auditoria deve continuar preservada no servidor.
        </p>
      </div>
      <div className="delete-confirmation__actions">
        <Button
          disabled={deleting}
          type="button"
          variant="secondary"
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button
          loading={deleting}
          type="button"
          variant="danger"
          onClick={onConfirm}
        >
          <Trash2 size={16} />
          Apagar produto
        </Button>
      </div>
    </section>
  );
}

function FontSizeControl({
  label,
  value,
  min,
  max,
  onChange,
  suffix = "px",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  suffix?: string;
}) {
  return (
    <label className="font-size-control">
      <span>
        {label}
        <output>
          {value}
          {suffix}
        </output>
      </span>
      <input
        aria-label={label}
        max={max}
        min={min}
        step={1}
        type="range"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function TextStyleControls({
  title,
  description,
  value,
  fallbackColor,
  fontSizeRange,
  onChange,
}: {
  title: string;
  description: string;
  value: StorefrontTextStyle;
  fallbackColor: string;
  fontSizeRange: { min: number; max: number };
  onChange: (value: StorefrontTextStyle) => void;
}) {
  const usesPaletteColor = value.color === "";

  return (
    <fieldset className="text-style-controls">
      <legend>{title}</legend>
      <p>{description}</p>
      <div className="text-style-controls__grid">
        <div className="text-style-controls__color">
          <HexColorField
            disabled={usesPaletteColor}
            label="Cor personalizada"
            required={!usesPaletteColor}
            value={value.color || fallbackColor}
            onChange={(color) => onChange({ ...value, color })}
          />
          <label className="visibility-control">
            <input
              checked={usesPaletteColor}
              type="checkbox"
              onChange={(event) =>
                onChange({
                  ...value,
                  color: event.target.checked ? "" : fallbackColor,
                })
              }
            />
            <span>Usar cor da paleta</span>
          </label>
        </div>
        <FontSizeControl
          label="Tamanho do texto"
          max={fontSizeRange.max}
          min={fontSizeRange.min}
          suffix="px"
          value={value.fontSize}
          onChange={(fontSize) => onChange({ ...value, fontSize })}
        />
        <FontSizeControl
          label="Espacamento vertical"
          max={96}
          min={0}
          suffix="px"
          value={value.spacingAfter}
          onChange={(spacingAfter) => onChange({ ...value, spacingAfter })}
        />
        <SelectField
          label="Fonte do texto"
          value={editableTextFontValue(value.fontFamily)}
          onChange={(event) =>
            onChange({
              ...value,
              fontFamily: event.target
                .value as StorefrontTextStyle["fontFamily"],
            })
          }
        >
          {storefrontTextFontOptions.map(([font, label]) => (
            <option key={font} value={font}>
              {label}
            </option>
          ))}
        </SelectField>
      </div>
    </fieldset>
  );
}

type AppearanceTab =
  | "brand"
  | "header"
  | "content"
  | "composition"
  | "sales"
  | "catalog"
  | "reviews"
  | "footer"
  | "seo"
  | "motion";
type PreviewDevice = "desktop" | "tablet" | "mobile";
type PreviewLocation = "top" | "catalog" | "reviews" | "footer";

function PreviewBrandLogo({
  fallbackText,
  src,
}: {
  fallbackText: string;
  src: string;
}) {
  const markRef = useRef<HTMLSpanElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const previewSrc = adminMediaUrl(src);
  const canInspectPixels =
    previewSrc.startsWith("data:") ||
    previewSrc.startsWith("blob:") ||
    previewSrc.includes("/uploads/");

  useEffect(() => {
    const mark = markRef.current;
    const image = imageRef.current;
    if (!mark || !image) return;

    setLoadFailed(false);
    resetNormalizedLogo(mark);
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
  }, [canInspectPixels, previewSrc]);

  const handleLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    setLoadFailed(false);
    normalizeLogoImage(event.currentTarget, canInspectPixels);
  };

  return (
    <span
      ref={markRef}
      className="appearance-preview__footer-brand-logo"
      data-logo-load={loadFailed ? "error" : "ready"}
      aria-hidden="true"
    >
      <img
        ref={imageRef}
        alt=""
        crossOrigin={canInspectPixels ? "anonymous" : undefined}
        src={previewSrc}
        onError={() => setLoadFailed(true)}
        onLoad={handleLoad}
      />
      {loadFailed ? <span>{fallbackText}</span> : null}
    </span>
  );
}

const previewDevices = {
  desktop: { label: "Desktop", width: 1440, height: 900, icon: Monitor },
  tablet: { label: "Tablet", width: 768, height: 1024, icon: Tablet },
  mobile: { label: "Celular", width: 390, height: 844, icon: Smartphone },
} satisfies Record<
  PreviewDevice,
  { label: string; width: number; height: number; icon: typeof Monitor }
>;

const storefrontPreviewMessageType = "bespoke:storefront-preview";
const storefrontPreviewReadyType = "bespoke:storefront-preview-ready";
const storefrontPreviewAppliedType = "bespoke:storefront-preview-applied";
const storefrontPreviewErrorType = "bespoke:storefront-preview-error";
const storefrontPreviewLocationType = "bespoke:storefront-preview-location";

function StorefrontLivePreview({
  device,
  focusLocation,
  form,
  publicWebUrl,
  replayKey,
  onDeviceChange,
  onReplay,
}: {
  device: PreviewDevice;
  focusLocation: PreviewLocation;
  form: StorefrontSettings;
  publicWebUrl?: string;
  replayKey: number;
  onDeviceChange: (device: PreviewDevice) => void;
  onReplay: () => void;
}) {
  const frameHostRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewUrl = useMemo(
    () =>
      resolveStorefrontPreviewUrl(
        publicWebUrl,
        import.meta.env.VITE_STOREFRONT_PREVIEW_URL,
        window.location.href,
      ),
    [publicWebUrl],
  );
  const [scale, setScale] = useState(0.25);
  const [status, setStatus] = useState<
    "connecting" | "syncing" | "synced" | "invalid" | "unavailable"
  >("connecting");
  const [previewDocument, setPreviewDocument] = useState<string | null>(null);
  const [previewDocumentState, setPreviewDocumentState] = useState<
    "direct" | "loading" | "ready" | "error"
  >("direct");
  const [previewLocation, setPreviewLocation] =
    useState<PreviewLocation>("top");
  const configuration = previewDevices[device];
  const previewOrigin = previewUrl ? new URL(previewUrl).origin : null;
  const embeddedPreview = Boolean(
    previewUrl &&
    shouldEmbedStorefrontPreview(previewUrl, window.location.href),
  );

  useEffect(() => {
    setPreviewDocument(null);
    if (!previewUrl || !embeddedPreview) {
      setPreviewDocumentState("direct");
      return;
    }

    const controller = new AbortController();
    setPreviewDocumentState("loading");
    setStatus("connecting");
    void fetch(previewUrl, {
      cache: "no-store",
      credentials: "omit",
      headers: { "ngrok-skip-browser-warning": "bespoke-admin-preview" },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("STOREFRONT_DOCUMENT_UNAVAILABLE");
        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.includes("text/html")) {
          throw new Error("STOREFRONT_DOCUMENT_INVALID");
        }
        return createStorefrontPreviewDocument(
          await response.text(),
          previewUrl,
        );
      })
      .then((document) => {
        if (controller.signal.aborted) return;
        setPreviewDocument(document);
        setPreviewDocumentState("ready");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setPreviewDocumentState("error");
        setStatus("unavailable");
        if (import.meta.env.DEV) console.error(error);
      });

    return () => controller.abort();
  }, [embeddedPreview, previewUrl, replayKey]);

  const navigatePreview = (location: PreviewLocation) => {
    setPreviewLocation(location);
    if (!previewOrigin) return;
    iframeRef.current?.contentWindow?.postMessage(
      { type: storefrontPreviewLocationType, location },
      previewOrigin,
    );
  };

  useEffect(() => {
    setPreviewLocation(focusLocation);
    if (!previewOrigin) return;
    iframeRef.current?.contentWindow?.postMessage(
      { type: storefrontPreviewLocationType, location: focusLocation },
      previewOrigin,
    );
  }, [focusLocation, previewOrigin]);

  useEffect(() => {
    const host = frameHostRef.current;
    if (!host) return;

    const updateScale = () => {
      const availableWidth = Math.max(240, host.clientWidth - 24);
      setScale(
        Math.min(1, Math.max(0.16, availableWidth / configuration.width)),
      );
    };
    const observer = new ResizeObserver(updateScale);
    observer.observe(host);
    updateScale();
    return () => observer.disconnect();
  }, [configuration.width]);

  useEffect(() => {
    if (!previewOrigin) {
      setStatus("unavailable");
      return;
    }

    const handleMessage = (event: MessageEvent<unknown>) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.origin !== previewOrigin) return;
      if (!event.data || typeof event.data !== "object") return;
      if (!("type" in event.data)) return;

      if (event.data.type === storefrontPreviewReadyType) {
        iframeRef.current?.contentWindow?.postMessage(
          { type: storefrontPreviewMessageType, settings: form },
          previewOrigin,
        );
        iframeRef.current?.contentWindow?.postMessage(
          {
            type: storefrontPreviewLocationType,
            location: previewLocation,
          },
          previewOrigin,
        );
        setStatus("syncing");
      } else if (event.data.type === storefrontPreviewAppliedType) {
        setStatus("synced");
      } else if (event.data.type === storefrontPreviewErrorType) {
        setStatus("invalid");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [form, previewLocation, previewOrigin]);

  useEffect(() => {
    if (!previewUrl) return;

    setStatus("connecting");
    const timeout = window.setTimeout(() => {
      setStatus((current) =>
        current === "synced" || current === "invalid" ? current : "unavailable",
      );
    }, 20_000);
    return () => window.clearTimeout(timeout);
  }, [previewUrl, replayKey]);

  useEffect(() => {
    if (!previewOrigin) return;
    const iframeWindow = iframeRef.current?.contentWindow;
    if (!iframeWindow) return;
    setStatus("syncing");
    iframeWindow.postMessage(
      { type: storefrontPreviewMessageType, settings: form },
      previewOrigin,
    );
  }, [form, previewOrigin, replayKey]);

  const scaledWidth = configuration.width * scale;
  const visibleHeight =
    previewLocation === "top" || previewLocation === "catalog"
      ? configuration.height
      : Math.min(configuration.height, device === "desktop" ? 420 : 500);
  const scaledHeight = visibleHeight * scale;

  return (
    <div
      className="storefront-live-preview"
      data-live-preview-device={device}
      data-live-preview-status={status}
    >
      <div className="appearance-preview__toolbar storefront-live-preview__toolbar">
        <div className="storefront-live-preview__title">
          <Eye aria-hidden="true" size={16} />
          <div>
            <strong>
              {previewLocation === "catalog"
                ? "Catalogo"
                : previewLocation === "reviews"
                  ? "Avaliacoes"
                  : previewLocation === "footer"
                    ? "Rodape"
                    : "Home"}{" "}
              em tempo real
            </strong>
            <span>
              {configuration.label} {configuration.width} x{" "}
              {configuration.height}
            </span>
          </div>
        </div>
        <div
          className="appearance-preview__devices"
          role="group"
          aria-label="Tamanho do preview"
        >
          {(
            Object.entries(previewDevices) as Array<
              [PreviewDevice, (typeof previewDevices)[PreviewDevice]]
            >
          ).map(([previewDevice, previewConfiguration]) => {
            const Icon = previewConfiguration.icon;
            return (
              <IconButton
                aria-pressed={device === previewDevice}
                className={device === previewDevice ? "is-active" : undefined}
                key={previewDevice}
                label={previewConfiguration.label}
                type="button"
                onClick={() => onDeviceChange(previewDevice)}
              >
                <Icon size={15} />
              </IconButton>
            );
          })}
          <IconButton
            label="Reproduzir animacao do preview"
            type="button"
            onClick={onReplay}
          >
            <RotateCcw size={15} />
          </IconButton>
        </div>
      </div>
      <div className="storefront-live-preview__status" aria-live="polite">
        <span aria-hidden="true" />
        {status === "synced"
          ? "Alteracoes locais sincronizadas"
          : status === "invalid"
            ? "Revise os campos invalidos para atualizar"
            : status === "unavailable"
              ? previewUrl
                ? "Nao foi possivel carregar a pagina publica"
                : "URL publica indisponivel"
              : "Atualizando preview"}
      </div>
      <div className="storefront-live-preview__location-bar">
        <div
          className="storefront-live-preview__location-control"
          role="group"
          aria-label="Area exibida no preview"
        >
          <button
            aria-pressed={previewLocation === "top"}
            className={previewLocation === "top" ? "is-active" : undefined}
            type="button"
            onClick={() => navigatePreview("top")}
          >
            <ArrowUp aria-hidden="true" size={15} />
            Topo
          </button>
          <button
            aria-pressed={previewLocation === "catalog"}
            className={previewLocation === "catalog" ? "is-active" : undefined}
            type="button"
            onClick={() => navigatePreview("catalog")}
          >
            <ShoppingBag aria-hidden="true" size={15} />
            Catalogo
          </button>
          <button
            aria-pressed={previewLocation === "reviews"}
            className={previewLocation === "reviews" ? "is-active" : undefined}
            type="button"
            onClick={() => navigatePreview("reviews")}
          >
            <Star aria-hidden="true" size={15} />
            Avaliacoes
          </button>
          <button
            aria-pressed={previewLocation === "footer"}
            className={previewLocation === "footer" ? "is-active" : undefined}
            type="button"
            onClick={() => navigatePreview("footer")}
          >
            <PanelBottom aria-hidden="true" size={15} />
            Rodape
          </button>
        </div>
      </div>
      <div className="storefront-live-preview__stage" ref={frameHostRef}>
        <div
          className="storefront-live-preview__frame"
          style={
            {
              "--live-preview-height": `${scaledHeight}px`,
              width: `${scaledWidth}px`,
            } as CSSProperties
          }
        >
          <div
            className="storefront-live-preview__viewport"
            style={{
              height: `${configuration.height}px`,
              transform: `scale(${scale})`,
              width: `${configuration.width}px`,
            }}
          >
            {previewUrl &&
            previewOrigin &&
            (!embeddedPreview || previewDocumentState === "ready") ? (
              <iframe
                key={replayKey}
                ref={iframeRef}
                data-preview-device={device}
                height={configuration.height}
                loading="eager"
                referrerPolicy="same-origin"
                sandbox="allow-same-origin allow-scripts"
                src={embeddedPreview ? undefined : previewUrl}
                srcDoc={
                  embeddedPreview ? (previewDocument ?? undefined) : undefined
                }
                title={`Preview da Home em ${configuration.label}`}
                width={configuration.width}
                onLoad={() => {
                  setStatus("syncing");
                  iframeRef.current?.contentWindow?.postMessage(
                    { type: storefrontPreviewMessageType, settings: form },
                    previewOrigin,
                  );
                  iframeRef.current?.contentWindow?.postMessage(
                    {
                      type: storefrontPreviewLocationType,
                      location: previewLocation,
                    },
                    previewOrigin,
                  );
                }}
              />
            ) : previewDocumentState === "loading" ? (
              <div
                className="storefront-live-preview__unavailable"
                role="status"
              >
                <RefreshCw aria-hidden="true" size={28} />
                <strong>Preparando preview</strong>
                <span>Carregando a pagina publica desta loja.</span>
              </div>
            ) : (
              <div
                className="storefront-live-preview__unavailable"
                role="alert"
              >
                <EyeOff aria-hidden="true" size={28} />
                <strong>Preview indisponivel</strong>
                <span>
                  {previewDocumentState === "error"
                    ? "Nao foi possivel preparar a pagina publica. Tente recarregar o preview."
                    : "A URL publica desta loja nao foi informada pela API."}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const appearanceTabs = [
  {
    id: "brand",
    label: "Identidade",
    description: "Nome, logos e fontes",
    guidance:
      "Comece pelo nome, logos e fontes. Essa base mantem a pagina publica e o painel com a mesma assinatura visual.",
    level: "Essencial",
    icon: Store,
  },
  {
    id: "header",
    label: "Cabecalho",
    description: "Cores, logo, navegacao e botoes",
    guidance:
      "Personalize o cabecalho de forma independente. As escolhas desta etapa nao alteram a Home, o Catalogo ou o Rodape.",
    level: "Essencial",
    icon: PanelTop,
  },
  {
    id: "content",
    label: "Capa e textos",
    description: "Hero, manifesto e chamadas",
    guidance:
      "Atualize a imagem da capa, o manifesto e as chamadas da Home. Use a previa para conferir leitura antes de salvar.",
    level: "Essencial",
    icon: Type,
  },
  {
    id: "composition",
    label: "Layout da Home",
    description: "Cores, cards e ordem",
    guidance:
      "Organize cores, espacamento, cards e secoes. Aqui fica o desenho geral da vitrine sem mexer nos dados de produto.",
    level: "Essencial",
    icon: Palette,
  },
  {
    id: "sales",
    label: "Vendas",
    description: "Categorias, produtos e formas de compra",
    guidance:
      "Transforme a Home em uma experiencia de compra completa. Edite categorias, apresentacao dos produtos e os dois caminhos de compra sem alterar o checkout.",
    level: "Essencial",
    icon: ShoppingBag,
  },
  {
    id: "catalog",
    label: "Catalogo",
    description: "Textos, paleta, cards e grade",
    guidance:
      "Ajuste a pagina de Catalogo em um escopo proprio. A paleta e a tipografia daqui prevalecem somente no Catalogo.",
    level: "Essencial",
    icon: ShoppingBag,
  },
  {
    id: "reviews",
    label: "Avaliacoes",
    description: "Relatos reais e carrossel",
    guidance:
      "Cadastre apenas avaliacoes reais e autorizadas. Ajuste leitura, ritmo e cores sem duplicar conteudo para tecnologias assistivas.",
    level: "Essencial",
    icon: Star,
  },
  {
    id: "footer",
    label: "Rodape",
    description: "Slogan, atendimento e links",
    guidance:
      "Revise a parte final da loja: slogan, WhatsApp, links uteis, redes sociais e texto legal.",
    level: "Essencial",
    icon: Link2,
  },
  {
    id: "seo",
    label: "Busca",
    description: "Titulo, descricao e imagens",
    guidance:
      "Prepare titulo, descricao, favicon e imagem de compartilhamento para buscadores, abas do navegador e redes sociais.",
    level: "Ajuste fino",
    icon: Eye,
  },
  {
    id: "motion",
    label: "Movimento",
    description: "Animacoes por area",
    guidance:
      "Ajuste os efeitos da Home quando quiser mais expressividade. O modo de movimento reduzido continua respeitado.",
    level: "Ajuste fino",
    icon: Sparkles,
  },
] satisfies Array<{
  id: AppearanceTab;
  label: string;
  description: string;
  guidance: string;
  level: "Essencial" | "Ajuste fino";
  icon: typeof Store;
}>;

const appearanceTabSettingKeys = {
  brand: [
    "brandName",
    "legalName",
    "logoUrl",
    "logoOnDarkUrl",
    "storefrontFont",
    "adminFont",
  ],
  header: [
    "headerBackgroundColor",
    "headerTextColor",
    "headerAccentColor",
    "headerButtonMode",
    "headerButtonBackgroundColor",
    "headerButtonTextColor",
    "headerFontFamily",
    "headerNavFontSize",
    "headerButtonFontSize",
    "headerHeight",
    "headerLogoWidth",
    "headerButtonStyle",
    "headerButtonRadius",
    "headerBorderColor",
    "headerBorderWidth",
    "headerShadow",
    "headerSticky",
  ],
  content: [
    "heroImageUrl",
    "heroEyebrow",
    "heroTitle",
    "manifestoItems",
    "manifestoMaxWidth",
    "featuredEyebrow",
    "featuredTitle",
    "featuredLinkLabel",
    "featuredAddButtonLabel",
    "featuredAddedButtonLabel",
    "editorialCatalogLabel",
    "editorialSupportLabel",
    "editorialOrdersLabel",
    "editorialAccountLabel",
  ],
  composition: [
    "homeLayout",
    "imageFit",
    "homeSections",
    "homeSectionSpacing",
    "homeTransitionPreset",
    "homeTransitionOverlap",
    "homeTransitionOpacity",
    "homeDepthIntensity",
    "manifestoDivider",
    "manifestoDividerMobileEnabled",
    "editorialNavigationMobileEnabled",
    "primaryColor",
    "accentColor",
    "backgroundColor",
    "homeSurfaceColor",
    "homeAlternateColor",
    "homeSecondaryTextColor",
    "homeBorderColor",
    "homeShadowColor",
    "homeTransitionStartColor",
    "homeTransitionEndColor",
  ],
  sales: [
    "featuredDescription",
    "productCardStyle",
    "categoryEyebrow",
    "categoryTitle",
    "categoryDescription",
    "categoryLinkLabel",
    "categoryLayout",
    "categoryLimit",
    "commerceEyebrow",
    "commerceTitle",
    "commerceDescription",
    "commerceWhatsappTitle",
    "commerceWhatsappDescription",
    "commerceOnlineTitle",
    "commerceOnlineDescription",
    "commerceCtaLabel",
    "homeProductImageRatio",
    "homeProductDescriptionMode",
    "homeProductColumnsDesktop",
    "homeProductColumnsTablet",
    "homeProductColumnsMobile",
  ],
  catalog: [
    "catalogEyebrow",
    "catalogTitle",
    "catalogDescription",
    "catalogDensity",
    "catalogBackgroundColor",
    "catalogSurfaceColor",
    "catalogTextColor",
    "catalogSecondaryTextColor",
    "catalogAccentColor",
    "catalogBorderColor",
    "catalogButtonBackgroundColor",
    "catalogButtonTextColor",
    "catalogCardStyle",
    "catalogImageFit",
    "catalogImageRatio",
    "catalogButtonStyle",
    "catalogCardRadius",
    "catalogColumnsDesktop",
    "catalogColumnsTablet",
    "catalogColumnsMobile",
    "catalogTextStyles",
  ],
  reviews: [
    "reviewsEnabled",
    "reviewsEyebrow",
    "reviewsTitle",
    "reviewsItems",
    "reviewsSpeedSeconds",
    "reviewsBackgroundColor",
    "reviewsCardColor",
  ],
  footer: [
    "footerSlogan",
    "footerShowBrandName",
    "footerHeading",
    "footerServiceHeading",
    "footerServiceLineOne",
    "footerServiceLineTwo",
    "footerWhatsappButtonLabel",
    "footerWhatsappLinkLabel",
    "footerCopyrightText",
    "footerSecurityText",
    "footerLinks",
    "footerColor",
  ],
  seo: [
    "defaultMetaTitle",
    "defaultMetaDescription",
    "faviconUrl",
    "socialImageUrl",
    "contactEmail",
  ],
  motion: [
    "homeMotionEnabled",
    "homeMotionPreset",
    "homeMotionByBlock",
    "homeMotionIntensity",
  ],
} satisfies Record<AppearanceTab, Array<keyof StorefrontSettings>>;

const homeSectionLabels: Record<
  StorefrontSettings["homeSections"][number]["id"],
  string
> = {
  manifesto: "Manifesto editorial",
  navigation: "Atalhos da loja",
  categories: "Navegacao por categorias",
  featured: "Produtos em destaque",
  commerce: "Formas de compra",
};

const motionBlockLabels: Record<
  keyof StorefrontSettings["homeMotionByBlock"],
  { title: string; description: string }
> = {
  manifesto: {
    title: "Manifesto editorial",
    description: "Entrada independente de cada linha durante a rolagem.",
  },
  navigation: {
    title: "Atalhos da loja",
    description: "Links de catalogo, pedidos, conta e suporte.",
  },
  categories: {
    title: "Navegacao por categorias",
    description: "Cabecalho e entrada das categorias da loja.",
  },
  featuredHeading: {
    title: "Cabecalho dos destaques",
    description: "Etiqueta, titulo e link da selecao de produtos.",
  },
  productCards: {
    title: "Cards de produtos",
    description: "Entrada coordenada dos itens em destaque.",
  },
  commerce: {
    title: "Formas de compra",
    description: "Apresentacao do WhatsApp e do pagamento online.",
  },
  reviews: {
    title: "Avaliacoes",
    description: "Cabecalho e entrada do carrossel continuo.",
  },
  footer: {
    title: "Rodape",
    description: "Marca, slogan, links e redes sociais.",
  },
};

const motionPresetOptions = [
  ["scroll", "Scroll / Fade Up"],
  ["cascade", "Cascade"],
  ["soft", "Soft Rise"],
  ["editorial", "Editorial Reveal"],
  ["structured", "Structured"],
  ["subtle", "Subtle Fade"],
  ["static", "Sem movimento"],
] as const;

const storefrontTextFontOptions = [
  ["inherit", "Padrao deste elemento"],
  ["modern", "Sans moderna"],
  ["classic", "Serif classica"],
  ["humanist", "Sans humanista"],
  ["editorial", "Serif editorial"],
] as const;

function editableTextFontValue(font: StorefrontTextStyle["fontFamily"]) {
  return font === "display" || font === "body" ? "inherit" : font;
}

function editableHeaderFontValue(font: StorefrontTextStyle["fontFamily"]) {
  return font === "inherit" || font === "display" || font === "body"
    ? "modern"
    : font;
}

function textFontCssValue(
  font: StorefrontTextStyle["fontFamily"],
  inheritedFont = "inherit",
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
  return font === "inherit" ? inheritedFont : fonts[font];
}

function StorefrontEditor({
  initial,
  publicWebUrl,
  saving,
  error,
  onSubmit,
}: {
  initial: StorefrontSettings;
  publicWebUrl?: string;
  saving: boolean;
  error?: string;
  onSubmit: (payload: StorefrontSettings) => void;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab = appearanceTabs.some((tab) => tab.id === requestedTab)
    ? (requestedTab as AppearanceTab)
    : "brand";
  const [form, setForm] = useState<StorefrontSettings>(() =>
    normalizeStorefrontEditorInitial(initial),
  );
  const [activeUploads, setActiveUploads] = useState<Record<string, boolean>>(
    {},
  );
  const [activeTab, setActiveTab] = useState<AppearanceTab>(initialTab);
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");
  const [previewKey, setPreviewKey] = useState(0);
  const [heroMissing, setHeroMissing] = useState(false);
  const uploading = Object.values(activeUploads).some(Boolean);

  useEffect(() => {
    if (!requestedTab) return;
    if (!appearanceTabs.some((tab) => tab.id === requestedTab)) return;
    setActiveTab(requestedTab as AppearanceTab);
  }, [requestedTab]);

  function selectAppearanceTab(tab: AppearanceTab) {
    setActiveTab(tab);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", tab);
    setSearchParams(nextParams, { replace: true });
  }

  function restoreActiveTab() {
    setForm((current) => {
      const defaults = structuredClone(storefrontEditorDefaults);
      const restoredEntries = appearanceTabSettingKeys[activeTab].map((key) => [
        key,
        defaults[key],
      ]);
      const restored = {
        ...current,
        ...Object.fromEntries(restoredEntries),
      } as StorefrontSettings;
      const textStyleKeys =
        activeTab === "content"
          ? ([
              "heroEyebrow",
              "heroTitle",
              "manifesto",
              "featuredEyebrow",
              "featuredTitle",
            ] as const)
          : activeTab === "composition"
            ? (["navigation", "productCardTitle"] as const)
            : activeTab === "sales"
              ? ([
                  "categoryEyebrow",
                  "categoryTitle",
                  "categoryBody",
                  "commerceEyebrow",
                  "commerceTitle",
                  "commerceBody",
                ] as const)
              : activeTab === "reviews"
                ? (["reviewsEyebrow", "reviewsTitle", "reviewsBody"] as const)
                : activeTab === "footer"
                  ? (["footerSlogan"] as const)
                  : [];
      if (textStyleKeys.length) {
        restored.homeTextStyles = { ...current.homeTextStyles };
        for (const key of textStyleKeys) {
          restored.homeTextStyles[key] = {
            ...defaults.homeTextStyles[key],
          };
        }
      }
      return restored;
    });
  }

  function trackUpload(key: string, active: boolean) {
    setActiveUploads((current) => ({ ...current, [key]: active }));
  }

  function updateFooterLink(
    id: string,
    changes: Partial<StorefrontSettings["footerLinks"][number]>,
  ) {
    setForm((current) => ({
      ...current,
      footerLinks: current.footerLinks.map((link) =>
        link.id === id ? { ...link, ...changes } : link,
      ),
    }));
  }

  function updateManifestoItem(
    id: string,
    changes: Partial<StorefrontSettings["manifestoItems"][number]>,
  ) {
    setForm((current) => ({
      ...current,
      manifestoItems: current.manifestoItems.map((item) =>
        item.id === id ? { ...item, ...changes } : item,
      ),
    }));
  }

  function updateTextStyle(
    key: keyof StorefrontSettings["homeTextStyles"],
    value: StorefrontTextStyle,
  ) {
    setForm((current) => ({
      ...current,
      homeTextStyles: {
        ...current.homeTextStyles,
        [key]: value,
      },
    }));
  }

  function updateCatalogTextStyle(
    key: keyof StorefrontSettings["catalogTextStyles"],
    value: StorefrontTextStyle,
  ) {
    setForm((current) => ({
      ...current,
      catalogTextStyles: {
        ...current.catalogTextStyles,
        [key]: value,
      },
    }));
  }

  function moveManifestoItem(index: number, direction: -1 | 1) {
    setForm((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.manifestoItems.length) return current;
      const manifestoItems = [...current.manifestoItems];
      const [item] = manifestoItems.splice(index, 1);
      manifestoItems.splice(target, 0, item!);
      return { ...current, manifestoItems };
    });
  }

  function updateReviewItem(
    id: string,
    changes: Partial<StorefrontSettings["reviewsItems"][number]>,
  ) {
    setForm((current) => ({
      ...current,
      reviewsItems: current.reviewsItems.map((item) =>
        item.id === id ? { ...item, ...changes } : item,
      ),
    }));
  }

  function moveReviewItem(index: number, direction: -1 | 1) {
    setForm((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.reviewsItems.length) return current;
      const reviewsItems = [...current.reviewsItems];
      const [item] = reviewsItems.splice(index, 1);
      reviewsItems.splice(target, 0, item!);
      return { ...current, reviewsItems };
    });
  }

  function moveHomeSection(index: number, direction: -1 | 1) {
    setForm((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.homeSections.length) return current;
      const homeSections = [...current.homeSections];
      const [section] = homeSections.splice(index, 1);
      homeSections.splice(target, 0, section!);
      return { ...current, homeSections };
    });
  }

  const orderedFooterLinks = orderFooterLinks(form.footerLinks);
  const customFooterLinks = orderedFooterLinks.filter(
    (link) => !isSystemFooterLink(link),
  );
  const systemFooterLinks = orderedFooterLinks.filter(isSystemFooterLink);
  const activeAppearanceIndex = Math.max(
    0,
    appearanceTabs.findIndex((tab) => tab.id === activeTab),
  );
  const activeAppearanceTab = appearanceTabs[activeAppearanceIndex]!;

  return (
    <form
      className="appearance-workspace"
      onSubmit={(event) => {
        event.preventDefault();
        if (uploading) return;
        if (!form.heroImageUrl) {
          setHeroMissing(true);
          return;
        }
        onSubmit({
          ...form,
          footerLinks: orderedFooterLinks,
          settingsVersion: 2,
          heroEyebrowFontSize: Math.min(
            18,
            Math.max(10, form.homeTextStyles.heroEyebrow.fontSize),
          ),
          heroTitleFontSize: Math.min(
            80,
            Math.max(40, form.homeTextStyles.heroTitle.fontSize),
          ),
          homeMotionPreset: form.homeMotionByBlock.manifesto,
          manifestoLineOne: form.manifestoItems[0]?.content ?? "",
          manifestoLineTwo: form.manifestoItems[1]?.content ?? "",
        });
      }}
    >
      <section className="panel storefront-form">
        <div className="editor-form__header">
          <div>
            <p>Controle visual</p>
            <h2>Vitrine publica</h2>
            <span>
              Edite a pagina publica em etapas guiadas: comece pelo essencial,
              revise na previa e use ajustes finos quando fizer sentido.
            </span>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={uploading || saving}
            onClick={restoreActiveTab}
          >
            <RotateCcw size={16} />
            Restaurar esta etapa
          </Button>
        </div>
        <div className="appearance-guide" aria-live="polite">
          <div className="appearance-guide__progress">
            <span>
              Etapa {activeAppearanceIndex + 1} de {appearanceTabs.length}
            </span>
            <Badge
              tone={
                activeAppearanceTab.level === "Essencial"
                  ? "success"
                  : "neutral"
              }
            >
              {activeAppearanceTab.level}
            </Badge>
          </div>
          <div>
            <strong>{activeAppearanceTab.label}</strong>
            <p>{activeAppearanceTab.guidance}</p>
          </div>
        </div>
        <div
          aria-label="Etapas de configuracao da vitrine"
          className="appearance-tabs"
          role="tablist"
        >
          {appearanceTabs.map((tab, index) => {
            const Icon = tab.icon;
            return (
              <button
                aria-controls={`appearance-panel-${tab.id}`}
                aria-describedby={`appearance-tab-copy-${tab.id}`}
                aria-selected={activeTab === tab.id}
                className={activeTab === tab.id ? "is-active" : undefined}
                id={`appearance-tab-${tab.id}`}
                key={tab.id}
                role="tab"
                type="button"
                onClick={() => selectAppearanceTab(tab.id)}
              >
                <span className="appearance-tabs__index">{index + 1}</span>
                <span className="appearance-tabs__copy">
                  <strong>
                    <Icon aria-hidden="true" size={16} />
                    {tab.label}
                  </strong>
                  <small
                    className="appearance-tabs__assistive"
                    id={`appearance-tab-copy-${tab.id}`}
                  >
                    {tab.description}
                  </small>
                </span>
              </button>
            );
          })}
        </div>
        <section
          aria-labelledby="appearance-tab-brand"
          className="editor-section"
          hidden={activeTab !== "brand"}
          id="appearance-panel-brand"
          role="tabpanel"
        >
          <div className="editor-section__title">
            <Store size={18} />
            <h3>Marca e logo</h3>
          </div>
          <div className="editor-form__grid hero-controls">
            <TextField
              label="Nome da marca"
              required
              value={form.brandName}
              onChange={(event) =>
                setForm({ ...form, brandName: event.target.value })
              }
            />
            <TextField
              label="Razao social"
              required
              value={form.legalName}
              onChange={(event) =>
                setForm({ ...form, legalName: event.target.value })
              }
            />
            <ImageUploadField
              label="Logo da marca"
              value={form.logoUrl}
              alt={`Logo ${form.brandName}`}
              recommendation="PNG, JPG ou WebP; prefira fundo transparente e proporcao horizontal"
              variant="logo"
              disabled={saving}
              onUploadingChange={(active) => trackUpload("logo", active)}
              onChange={(upload) =>
                setForm((current) => ({ ...current, logoUrl: upload.url }))
              }
              onRemove={() =>
                setForm((current) => ({ ...current, logoUrl: "" }))
              }
            />
            <ImageUploadField
              label="Logo para fundo escuro"
              value={form.logoOnDarkUrl}
              alt={`Logo clara ${form.brandName}`}
              recommendation="PNG, JPG ou WebP; use uma versao legivel sobre o rodape"
              variant="logo"
              disabled={saving}
              onUploadingChange={(active) => trackUpload("logo-dark", active)}
              onChange={(upload) =>
                setForm((current) => ({
                  ...current,
                  logoOnDarkUrl: upload.url,
                }))
              }
              onRemove={() =>
                setForm((current) => ({ ...current, logoOnDarkUrl: "" }))
              }
            />
          </div>
        </section>
        <section
          aria-labelledby="appearance-tab-header"
          className="editor-section"
          hidden={activeTab !== "header"}
          id="appearance-panel-header"
          role="tabpanel"
        >
          <div className="editor-section__title">
            <Palette size={18} />
            <h3>Cores do cabecalho</h3>
          </div>
          <p className="editor-section__hint">
            Os textos usam exatamente a cor escolhida. No modo automatico, os
            botoes continuam protegendo o contraste para manter boa leitura; em
            cores manuais, revise a legibilidade no preview.
          </p>
          <div className="editor-form__grid color-controls">
            <HexColorField
              label="Fundo do cabecalho"
              required
              value={form.headerBackgroundColor}
              onChange={(headerBackgroundColor) =>
                setForm({ ...form, headerBackgroundColor })
              }
            />
            <HexColorField
              label="Textos do cabecalho"
              required
              value={form.headerTextColor}
              onChange={(headerTextColor) =>
                setForm({ ...form, headerTextColor })
              }
            />
            <HexColorField
              label="Destaque do cabecalho"
              required
              value={form.headerAccentColor}
              onChange={(headerAccentColor) =>
                setForm({ ...form, headerAccentColor })
              }
            />
            <SelectField
              label="Cores dos botoes"
              value={form.headerButtonMode}
              onChange={(event) =>
                setForm({
                  ...form,
                  headerButtonMode: event.target
                    .value as StorefrontSettings["headerButtonMode"],
                })
              }
            >
              <option value="automatic">Adaptar automaticamente</option>
              <option value="custom">Personalizar manualmente</option>
            </SelectField>
            <HexColorField
              disabled={form.headerButtonMode === "automatic"}
              label="Fundo dos botoes do cabecalho"
              required={form.headerButtonMode === "custom"}
              value={form.headerButtonBackgroundColor}
              onChange={(headerButtonBackgroundColor) =>
                setForm({ ...form, headerButtonBackgroundColor })
              }
            />
            <HexColorField
              disabled={form.headerButtonMode === "automatic"}
              label="Texto dos botoes do cabecalho"
              required={form.headerButtonMode === "custom"}
              value={form.headerButtonTextColor}
              onChange={(headerButtonTextColor) =>
                setForm({ ...form, headerButtonTextColor })
              }
            />
          </div>
        </section>
        <section className="editor-section" hidden={activeTab !== "header"}>
          <div className="editor-section__title">
            <Type size={18} />
            <h3>Tipografia e dimensoes</h3>
          </div>
          <p className="editor-section__hint">
            Estes valores sao exclusivos do cabecalho e prevalecem sobre a fonte
            geral da vitrine.
          </p>
          <div className="editor-form__grid">
            <SelectField
              label="Fonte do cabecalho"
              value={editableHeaderFontValue(form.headerFontFamily)}
              onChange={(event) =>
                setForm({
                  ...form,
                  headerFontFamily: event.target
                    .value as StorefrontSettings["headerFontFamily"],
                })
              }
            >
              <option value="modern">Sans moderna</option>
              <option value="classic">Serif classica</option>
              <option value="humanist">Sans humanista</option>
              <option value="editorial">Serif editorial</option>
            </SelectField>
            <FontSizeControl
              label="Tamanho dos links"
              max={20}
              min={12}
              suffix="px"
              value={form.headerNavFontSize}
              onChange={(headerNavFontSize) =>
                setForm({ ...form, headerNavFontSize })
              }
            />
            <FontSizeControl
              label="Tamanho do texto dos botoes"
              max={20}
              min={12}
              suffix="px"
              value={form.headerButtonFontSize}
              onChange={(headerButtonFontSize) =>
                setForm({ ...form, headerButtonFontSize })
              }
            />
            <FontSizeControl
              label="Altura do cabecalho"
              max={96}
              min={56}
              suffix="px"
              value={form.headerHeight}
              onChange={(headerHeight) => setForm({ ...form, headerHeight })}
            />
            <FontSizeControl
              label="Largura maxima da logo"
              max={360}
              min={140}
              suffix="px"
              value={form.headerLogoWidth}
              onChange={(headerLogoWidth) =>
                setForm({ ...form, headerLogoWidth })
              }
            />
          </div>
        </section>
        <section className="editor-section" hidden={activeTab !== "header"}>
          <div className="editor-section__title">
            <PanelTop size={18} />
            <h3>Acabamento e comportamento</h3>
          </div>
          <div className="editor-form__grid">
            <SelectField
              label="Visual dos botoes"
              value={form.headerButtonStyle}
              onChange={(event) =>
                setForm({
                  ...form,
                  headerButtonStyle: event.target
                    .value as StorefrontSettings["headerButtonStyle"],
                })
              }
            >
              <option value="solid">Preenchido</option>
              <option value="outline">Contorno</option>
              <option value="minimal">Minimalista</option>
            </SelectField>
            <FontSizeControl
              label="Arredondamento dos botoes"
              max={24}
              min={0}
              suffix="px"
              value={form.headerButtonRadius}
              onChange={(headerButtonRadius) =>
                setForm({ ...form, headerButtonRadius })
              }
            />
            <HexColorField
              label="Cor da borda do cabecalho"
              required
              value={form.headerBorderColor}
              onChange={(headerBorderColor) =>
                setForm({ ...form, headerBorderColor })
              }
            />
            <FontSizeControl
              label="Espessura da borda"
              max={3}
              min={0}
              suffix="px"
              value={form.headerBorderWidth}
              onChange={(headerBorderWidth) =>
                setForm({ ...form, headerBorderWidth })
              }
            />
            <SelectField
              label="Sombra ao rolar"
              value={form.headerShadow}
              onChange={(event) =>
                setForm({
                  ...form,
                  headerShadow: event.target
                    .value as StorefrontSettings["headerShadow"],
                })
              }
            >
              <option value="none">Sem sombra</option>
              <option value="subtle">Sutil</option>
              <option value="pronounced">Destacada</option>
            </SelectField>
            <label className="visibility-control">
              <input
                checked={form.headerSticky}
                type="checkbox"
                onChange={(event) =>
                  setForm({ ...form, headerSticky: event.target.checked })
                }
              />
              <span>Manter cabecalho fixo durante a rolagem</span>
            </label>
          </div>
        </section>
        <section
          aria-labelledby="appearance-tab-brand"
          className="editor-section"
          hidden={activeTab !== "brand"}
          role="tabpanel"
        >
          <div className="editor-section__title">
            <Type size={18} />
            <h3>Tipografia</h3>
          </div>
          <p className="editor-section__hint">
            Escolha combinacoes preparadas para manter leitura, alinhamento e
            consistencia em qualquer tela.
          </p>
          <div className="editor-form__grid typography-controls">
            <SelectField
              label="Fonte da vitrine publica"
              value={form.storefrontFont}
              onChange={(event) =>
                setForm({
                  ...form,
                  storefrontFont: event.target
                    .value as StorefrontSettings["storefrontFont"],
                })
              }
            >
              <option value="signature">Assinatura - sofisticada</option>
              <option value="modern">Moderna - direta</option>
              <option value="classic">Classica - acolhedora</option>
              <option value="humanist">Humanista - proxima</option>
              <option value="editorial">Editorial - expressiva</option>
            </SelectField>
            <SelectField
              label="Fonte do painel admin"
              value={form.adminFont}
              onChange={(event) =>
                setForm({
                  ...form,
                  adminFont: event.target
                    .value as StorefrontSettings["adminFont"],
                })
              }
            >
              <option value="signature">Assinatura - equilibrada</option>
              <option value="modern">Moderna - compacta</option>
              <option value="classic">Classica - tradicional</option>
              <option value="humanist">Humanista - acessivel</option>
              <option value="editorial">Editorial - autoral</option>
            </SelectField>
          </div>
        </section>
        <section
          aria-labelledby="appearance-tab-content"
          className="editor-section"
          hidden={activeTab !== "content"}
          id="appearance-panel-content"
          role="tabpanel"
        >
          <div className="editor-section__title">
            <ImageIcon size={18} />
            <h3>Capa da home</h3>
          </div>
          <div className="editor-form__grid">
            <ImageUploadField
              label="Imagem da capa"
              value={form.heroImageUrl}
              alt="Previa da capa da home"
              recommendation="Prefira 1920 x 1080px, com o assunto na area central"
              variant="hero"
              required
              disabled={saving}
              error={
                heroMissing
                  ? "Adicione a imagem da capa antes de salvar."
                  : undefined
              }
              onUploadingChange={(active) => trackUpload("hero", active)}
              onChange={(upload) => {
                setHeroMissing(false);
                setForm((current) => ({
                  ...current,
                  heroImageUrl: upload.url,
                }));
              }}
            />
            <TextField
              label="Etiqueta da capa"
              placeholder="Opcional"
              value={form.heroEyebrow}
              onChange={(event) =>
                setForm({ ...form, heroEyebrow: event.target.value })
              }
            />
            <TextField
              label="Titulo da capa"
              placeholder="Opcional"
              value={form.heroTitle}
              onChange={(event) =>
                setForm({ ...form, heroTitle: event.target.value })
              }
            />
            <SelectField
              label="Altura da capa"
              value={form.heroHeight}
              onChange={(event) =>
                setForm({
                  ...form,
                  heroHeight: event.target
                    .value as StorefrontSettings["heroHeight"],
                })
              }
            >
              <option value="compact">Compacta</option>
              <option value="balanced">Equilibrada</option>
              <option value="immersive">Imersiva</option>
            </SelectField>
          </div>
          <div className="text-style-group">
            <TextStyleControls
              description="Cor, escala responsiva, distancia ate o titulo e fonte da etiqueta opcional."
              fallbackColor={form.accentColor}
              fontSizeRange={{ min: 10, max: 24 }}
              title="Estilo da etiqueta"
              value={form.homeTextStyles.heroEyebrow}
              onChange={(value) => updateTextStyle("heroEyebrow", value)}
            />
            <TextStyleControls
              description="O valor escolhido funciona como limite responsivo para evitar cortes em telas pequenas."
              fallbackColor={form.primaryColor}
              fontSizeRange={{ min: 28, max: 96 }}
              title="Estilo do titulo"
              value={form.homeTextStyles.heroTitle}
              onChange={(value) => updateTextStyle("heroTitle", value)}
            />
          </div>
        </section>
        <section className="editor-section" hidden={activeTab !== "content"}>
          <div className="editor-section__title">
            <Type size={18} />
            <h3>Manifesto editorial</h3>
          </div>
          <p className="editor-section__hint">
            Cada bloco possui seu proprio gatilho de rolagem. Reordene, duplique
            ou desative sem deixar espacos vazios na Home.
          </p>
          <div className="manifesto-editor" aria-live="polite">
            {form.manifestoItems.map((item, index) => (
              <article className="manifesto-editor__item" key={item.id}>
                <div className="manifesto-editor__header">
                  <div>
                    <span>{index + 1}</span>
                    <strong>Bloco {index + 1}</strong>
                  </div>
                  <div className="manifesto-editor__actions">
                    <IconButton
                      label={`Mover bloco ${index + 1} para cima`}
                      type="button"
                      disabled={index === 0 || saving}
                      onClick={() => moveManifestoItem(index, -1)}
                    >
                      <ArrowUp size={15} />
                    </IconButton>
                    <IconButton
                      label={`Mover bloco ${index + 1} para baixo`}
                      type="button"
                      disabled={
                        index === form.manifestoItems.length - 1 || saving
                      }
                      onClick={() => moveManifestoItem(index, 1)}
                    >
                      <ArrowDown size={15} />
                    </IconButton>
                    <IconButton
                      label={`Duplicar bloco ${index + 1}`}
                      type="button"
                      disabled={form.manifestoItems.length >= 8 || saving}
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          manifestoItems: current.manifestoItems.flatMap(
                            (currentItem) =>
                              currentItem.id === item.id
                                ? [
                                    currentItem,
                                    {
                                      ...currentItem,
                                      id: crypto.randomUUID(),
                                    },
                                  ]
                                : [currentItem],
                          ),
                        }))
                      }
                    >
                      <Copy size={15} />
                    </IconButton>
                    <IconButton
                      label={`Remover bloco ${index + 1}`}
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          manifestoItems: current.manifestoItems.filter(
                            (currentItem) => currentItem.id !== item.id,
                          ),
                        }))
                      }
                    >
                      <Trash2 size={15} />
                    </IconButton>
                  </div>
                </div>
                <TextAreaField
                  label={
                    index === 0
                      ? "Primeira linha do manifesto"
                      : index === 1
                        ? "Segunda linha do manifesto"
                        : `Texto do bloco ${index + 1}`
                  }
                  maxLength={280}
                  rows={3}
                  value={item.content}
                  onChange={(event) =>
                    updateManifestoItem(item.id, {
                      content: event.target.value,
                    })
                  }
                />
                <div className="editor-form__grid manifesto-editor__options">
                  <SelectField
                    label={`Tipo do bloco ${index + 1}`}
                    value={item.type}
                    onChange={(event) =>
                      updateManifestoItem(item.id, {
                        type: event.target
                          .value as StorefrontSettings["manifestoItems"][number]["type"],
                      })
                    }
                  >
                    <option value="eyebrow">Etiqueta</option>
                    <option value="headline">Titulo principal</option>
                    <option value="supporting">Texto de apoio</option>
                    <option value="paragraph">Paragrafo</option>
                  </SelectField>
                  <SelectField
                    label={`Alinhamento do bloco ${index + 1}`}
                    value={item.alignment}
                    onChange={(event) =>
                      updateManifestoItem(item.id, {
                        alignment: event.target
                          .value as StorefrontSettings["manifestoItems"][number]["alignment"],
                      })
                    }
                  >
                    <option value="center">Centralizado</option>
                    <option value="start">A esquerda</option>
                  </SelectField>
                  <SelectField
                    label={`Enfase do bloco ${index + 1}`}
                    value={item.emphasis}
                    onChange={(event) =>
                      updateManifestoItem(item.id, {
                        emphasis: event.target
                          .value as StorefrontSettings["manifestoItems"][number]["emphasis"],
                      })
                    }
                  >
                    <option value="subtle">Sutil</option>
                    <option value="standard">Padrao</option>
                    <option value="strong">Forte</option>
                  </SelectField>
                  <SelectField
                    label={`Fonte do bloco ${index + 1}`}
                    value={editableTextFontValue(item.fontFamily)}
                    onChange={(event) =>
                      updateManifestoItem(item.id, {
                        fontFamily: event.target
                          .value as StorefrontSettings["manifestoItems"][number]["fontFamily"],
                      })
                    }
                  >
                    <option value="inherit">Herdar estilo do manifesto</option>
                    <option value="modern">Sans moderna</option>
                    <option value="classic">Serif classica</option>
                    <option value="humanist">Sans humanista</option>
                    <option value="editorial">Serif editorial</option>
                  </SelectField>
                  <FontSizeControl
                    label={`Tamanho do bloco ${index + 1}`}
                    max={96}
                    min={0}
                    suffix={item.fontSize === 0 ? " (automatico)" : "px"}
                    value={item.fontSize}
                    onChange={(fontSize) =>
                      updateManifestoItem(item.id, { fontSize })
                    }
                  />
                  <FontSizeControl
                    label={`Espaco depois do bloco ${index + 1}`}
                    max={120}
                    min={12}
                    suffix="px"
                    value={item.spacingAfter}
                    onChange={(spacingAfter) =>
                      updateManifestoItem(item.id, { spacingAfter })
                    }
                  />
                  <label className="visibility-control">
                    <input
                      checked={item.enabled}
                      type="checkbox"
                      onChange={(event) =>
                        updateManifestoItem(item.id, {
                          enabled: event.target.checked,
                        })
                      }
                    />
                    <span>Exibir este bloco</span>
                  </label>
                </div>
              </article>
            ))}
          </div>
          <TextStyleControls
            description="Define a base tipografica e o intervalo entre as linhas; tipos de apoio continuam proporcionais."
            fallbackColor={form.primaryColor}
            fontSizeRange={{ min: 28, max: 84 }}
            title="Estilo do manifesto"
            value={form.homeTextStyles.manifesto}
            onChange={(value) => updateTextStyle("manifesto", value)}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={form.manifestoItems.length >= 8 || saving}
            onClick={() =>
              setForm((current) => ({
                ...current,
                manifestoItems: [
                  ...current.manifestoItems,
                  {
                    id: crypto.randomUUID(),
                    type: "supporting",
                    content: "",
                    enabled: true,
                    alignment: "center",
                    emphasis: "standard",
                    fontFamily: "inherit",
                    fontSize: 0,
                    spacingAfter: 40,
                  },
                ],
              }))
            }
          >
            <Plus size={16} />
            Adicionar bloco
          </Button>
        </section>
        <section className="editor-section" hidden={activeTab !== "content"}>
          <div className="editor-section__title">
            <Eye size={18} />
            <h3>Home, catalogo e cards</h3>
          </div>
          <p className="editor-section__hint">
            Edite aqui as chamadas da secao. Imagem, categoria, nome, subtitulo
            e preco continuam sendo gerenciados na aba Produtos.
          </p>
          <div className="editor-form__grid">
            <TextField
              label="Etiqueta dos destaques"
              required
              value={form.featuredEyebrow}
              onChange={(event) =>
                setForm({ ...form, featuredEyebrow: event.target.value })
              }
            />
            <TextField
              label="Titulo dos destaques"
              required
              value={form.featuredTitle}
              onChange={(event) =>
                setForm({ ...form, featuredTitle: event.target.value })
              }
            />
            <TextField
              label="Link de catalogo"
              required
              value={form.featuredLinkLabel}
              onChange={(event) =>
                setForm({ ...form, featuredLinkLabel: event.target.value })
              }
            />
            <TextField
              label="Texto do botao dos cards"
              maxLength={40}
              required
              value={form.featuredAddButtonLabel}
              onChange={(event) =>
                setForm({
                  ...form,
                  featuredAddButtonLabel: event.target.value,
                })
              }
            />
            <TextField
              label="Texto depois de adicionar"
              maxLength={40}
              required
              value={form.featuredAddedButtonLabel}
              onChange={(event) =>
                setForm({
                  ...form,
                  featuredAddedButtonLabel: event.target.value,
                })
              }
            />
            <TextField
              label="Atalho para o catalogo"
              required
              value={form.editorialCatalogLabel}
              onChange={(event) =>
                setForm({ ...form, editorialCatalogLabel: event.target.value })
              }
            />
            <TextField
              label="Atalho para o atendimento"
              required
              value={form.editorialSupportLabel}
              onChange={(event) =>
                setForm({ ...form, editorialSupportLabel: event.target.value })
              }
            />
            <TextField
              label="Atalho para pedidos"
              required
              value={form.editorialOrdersLabel}
              onChange={(event) =>
                setForm({ ...form, editorialOrdersLabel: event.target.value })
              }
            />
            <TextField
              label="Atalho para a conta"
              required
              value={form.editorialAccountLabel}
              onChange={(event) =>
                setForm({ ...form, editorialAccountLabel: event.target.value })
              }
            />
          </div>
          <div className="text-style-group">
            <TextStyleControls
              description="Controla a chamada curta exibida acima do titulo da selecao."
              fallbackColor={form.accentColor}
              fontSizeRange={{ min: 10, max: 22 }}
              title="Etiqueta dos destaques"
              value={form.homeTextStyles.featuredEyebrow}
              onChange={(value) => updateTextStyle("featuredEyebrow", value)}
            />
            <TextStyleControls
              description="Mantem o titulo fluido e limita seu tamanho maximo em cada viewport."
              fallbackColor={form.primaryColor}
              fontSizeRange={{ min: 24, max: 72 }}
              title="Titulo dos destaques"
              value={form.homeTextStyles.featuredTitle}
              onChange={(value) => updateTextStyle("featuredTitle", value)}
            />
          </div>
        </section>
        <section
          aria-labelledby="appearance-tab-catalog"
          className="editor-section"
          hidden={activeTab !== "catalog"}
          id="appearance-panel-catalog"
          role="tabpanel"
        >
          <div className="editor-section__title">
            <Type size={18} />
            <h3>Conteudo do catalogo</h3>
          </div>
          <p className="editor-section__hint">
            Estes textos aparecem somente na abertura da pagina de Catalogo.
          </p>
          <div className="editor-form__grid">
            <TextField
              label="Etiqueta do catalogo"
              placeholder="Opcional"
              value={form.catalogEyebrow}
              onChange={(event) =>
                setForm({ ...form, catalogEyebrow: event.target.value })
              }
            />
            <TextField
              label="Titulo do catalogo"
              required
              value={form.catalogTitle}
              onChange={(event) =>
                setForm({ ...form, catalogTitle: event.target.value })
              }
            />
            <TextAreaField
              label="Descricao do catalogo"
              maxLength={220}
              rows={3}
              value={form.catalogDescription}
              onChange={(event) =>
                setForm({ ...form, catalogDescription: event.target.value })
              }
            />
          </div>
        </section>
        <section className="editor-section" hidden={activeTab !== "catalog"}>
          <div className="editor-section__title">
            <Palette size={18} />
            <h3>Paleta exclusiva do catalogo</h3>
          </div>
          <p className="editor-section__hint">
            Estas cores nao alteram a Home, o Cabecalho, as Avaliacoes ou o
            Rodape.
          </p>
          <div className="editor-form__grid color-controls">
            <HexColorField
              label="Fundo do catalogo"
              required
              value={form.catalogBackgroundColor}
              onChange={(catalogBackgroundColor) =>
                setForm({ ...form, catalogBackgroundColor })
              }
            />
            <HexColorField
              label="Superficie dos cards e filtros"
              required
              value={form.catalogSurfaceColor}
              onChange={(catalogSurfaceColor) =>
                setForm({ ...form, catalogSurfaceColor })
              }
            />
            <HexColorField
              label="Texto principal do catalogo"
              required
              value={form.catalogTextColor}
              onChange={(catalogTextColor) =>
                setForm({ ...form, catalogTextColor })
              }
            />
            <HexColorField
              label="Texto secundario do catalogo"
              required
              value={form.catalogSecondaryTextColor}
              onChange={(catalogSecondaryTextColor) =>
                setForm({ ...form, catalogSecondaryTextColor })
              }
            />
            <HexColorField
              label="Destaque do catalogo"
              required
              value={form.catalogAccentColor}
              onChange={(catalogAccentColor) =>
                setForm({ ...form, catalogAccentColor })
              }
            />
            <HexColorField
              label="Bordas do catalogo"
              required
              value={form.catalogBorderColor}
              onChange={(catalogBorderColor) =>
                setForm({ ...form, catalogBorderColor })
              }
            />
            <HexColorField
              label="Fundo dos botoes do catalogo"
              required
              value={form.catalogButtonBackgroundColor}
              onChange={(catalogButtonBackgroundColor) =>
                setForm({ ...form, catalogButtonBackgroundColor })
              }
            />
            <HexColorField
              label="Texto dos botoes do catalogo"
              required
              value={form.catalogButtonTextColor}
              onChange={(catalogButtonTextColor) =>
                setForm({ ...form, catalogButtonTextColor })
              }
            />
          </div>
        </section>
        <section className="editor-section" hidden={activeTab !== "catalog"}>
          <div className="editor-section__title">
            <Type size={18} />
            <h3>Tipografia do catalogo</h3>
          </div>
          <div className="text-style-group text-style-group--catalog">
            <TextStyleControls
              description="Chamada curta acima do titulo do Catalogo."
              fallbackColor={form.catalogAccentColor}
              fontSizeRange={{ min: 10, max: 22 }}
              title="Etiqueta do catalogo"
              value={form.catalogTextStyles.eyebrow}
              onChange={(value) => updateCatalogTextStyle("eyebrow", value)}
            />
            <TextStyleControls
              description="Titulo principal da pagina de Catalogo."
              fallbackColor={form.catalogTextColor}
              fontSizeRange={{ min: 28, max: 80 }}
              title="Titulo do catalogo"
              value={form.catalogTextStyles.title}
              onChange={(value) => updateCatalogTextStyle("title", value)}
            />
            <TextStyleControls
              description="Texto de apoio exibido na abertura do Catalogo."
              fallbackColor={form.catalogSecondaryTextColor}
              fontSizeRange={{ min: 13, max: 24 }}
              title="Descricao do catalogo"
              value={form.catalogTextStyles.description}
              onChange={(value) => updateCatalogTextStyle("description", value)}
            />
            <TextStyleControls
              description="Categoria exibida acima do nome de cada produto."
              fallbackColor={form.catalogAccentColor}
              fontSizeRange={{ min: 10, max: 18 }}
              title="Categoria dos cards"
              value={form.catalogTextStyles.category}
              onChange={(value) => updateCatalogTextStyle("category", value)}
            />
            <TextStyleControls
              description="Nome do produto nos cards do Catalogo."
              fallbackColor={form.catalogTextColor}
              fontSizeRange={{ min: 14, max: 32 }}
              title="Titulo dos cards do catalogo"
              value={form.catalogTextStyles.cardTitle}
              onChange={(value) => updateCatalogTextStyle("cardTitle", value)}
            />
            <TextStyleControls
              description="Resumo do produto nos cards do Catalogo."
              fallbackColor={form.catalogSecondaryTextColor}
              fontSizeRange={{ min: 12, max: 20 }}
              title="Descricao dos cards"
              value={form.catalogTextStyles.cardDescription}
              onChange={(value) =>
                updateCatalogTextStyle("cardDescription", value)
              }
            />
            <TextStyleControls
              description="Preco apresentado nos cards do Catalogo."
              fallbackColor={form.catalogTextColor}
              fontSizeRange={{ min: 16, max: 32 }}
              title="Preco dos cards"
              value={form.catalogTextStyles.price}
              onChange={(value) => updateCatalogTextStyle("price", value)}
            />
            <TextStyleControls
              description="Texto dos botoes de adicionar ao carrinho."
              fallbackColor={form.catalogButtonTextColor}
              fontSizeRange={{ min: 12, max: 20 }}
              title="Texto dos botoes"
              value={form.catalogTextStyles.button}
              onChange={(value) => updateCatalogTextStyle("button", value)}
            />
          </div>
        </section>
        <section className="editor-section" hidden={activeTab !== "catalog"}>
          <div className="editor-section__title">
            <ShoppingBag size={18} />
            <h3>Cards, imagens e grade</h3>
          </div>
          <div className="editor-form__grid">
            <SelectField
              label="Densidade do catalogo"
              value={form.catalogDensity}
              onChange={(event) =>
                setForm({
                  ...form,
                  catalogDensity: event.target
                    .value as StorefrontSettings["catalogDensity"],
                })
              }
            >
              <option value="comfortable">Confortavel</option>
              <option value="compact">Compacta</option>
            </SelectField>
            <SelectField
              label="Estilo dos cards do catalogo"
              value={form.catalogCardStyle}
              onChange={(event) =>
                setForm({
                  ...form,
                  catalogCardStyle: event.target
                    .value as StorefrontSettings["catalogCardStyle"],
                })
              }
            >
              <option value="minimal">Minimalista</option>
              <option value="boutique">Boutique</option>
              <option value="editorial">Editorial</option>
              <option value="ecommerce">E-commerce</option>
            </SelectField>
            <SelectField
              label="Enquadramento das imagens do catalogo"
              value={form.catalogImageFit}
              onChange={(event) =>
                setForm({
                  ...form,
                  catalogImageFit: event.target
                    .value as StorefrontSettings["catalogImageFit"],
                })
              }
            >
              <option value="contain">Produto inteiro</option>
              <option value="cover">Preencher a area</option>
            </SelectField>
            <SelectField
              label="Proporcao das imagens"
              value={form.catalogImageRatio}
              onChange={(event) =>
                setForm({
                  ...form,
                  catalogImageRatio: event.target
                    .value as StorefrontSettings["catalogImageRatio"],
                })
              }
            >
              <option value="square">Quadrada</option>
              <option value="portrait">Vertical</option>
              <option value="landscape">Horizontal</option>
            </SelectField>
            <SelectField
              label="Visual dos botoes do catalogo"
              value={form.catalogButtonStyle}
              onChange={(event) =>
                setForm({
                  ...form,
                  catalogButtonStyle: event.target
                    .value as StorefrontSettings["catalogButtonStyle"],
                })
              }
            >
              <option value="solid">Preenchido</option>
              <option value="outline">Contorno</option>
              <option value="minimal">Minimalista</option>
            </SelectField>
            <FontSizeControl
              label="Arredondamento dos cards"
              max={16}
              min={0}
              suffix="px"
              value={form.catalogCardRadius}
              onChange={(catalogCardRadius) =>
                setForm({ ...form, catalogCardRadius })
              }
            />
            <SelectField
              label="Colunas no desktop"
              value={String(form.catalogColumnsDesktop)}
              onChange={(event) =>
                setForm({
                  ...form,
                  catalogColumnsDesktop: Number(event.target.value) as 3 | 4,
                })
              }
            >
              <option value="3">3 produtos</option>
              <option value="4">4 produtos</option>
            </SelectField>
            <SelectField
              label="Colunas no tablet"
              value={String(form.catalogColumnsTablet)}
              onChange={(event) =>
                setForm({
                  ...form,
                  catalogColumnsTablet: Number(event.target.value) as 2 | 3,
                })
              }
            >
              <option value="2">2 produtos</option>
              <option value="3">3 produtos</option>
            </SelectField>
            <SelectField
              label="Colunas no celular"
              value={String(form.catalogColumnsMobile)}
              onChange={(event) =>
                setForm({
                  ...form,
                  catalogColumnsMobile: Number(event.target.value) as 1 | 2,
                })
              }
            >
              <option value="1">1 produto</option>
              <option value="2">2 produtos</option>
            </SelectField>
          </div>
        </section>
        <section
          aria-labelledby="appearance-tab-reviews"
          className="editor-section"
          hidden={activeTab !== "reviews"}
          id="appearance-panel-reviews"
          role="tabpanel"
        >
          <div className="editor-section__title">
            <Star size={18} />
            <h3>Avaliacoes da loja</h3>
          </div>
          <p className="editor-section__hint">
            A secao aparece no final da Home somente quando estiver ativada e
            possuir ao menos uma avaliacao preenchida e visivel.
          </p>
          <label className="visibility-control visibility-control--panel">
            <input
              checked={form.reviewsEnabled}
              type="checkbox"
              onChange={(event) =>
                setForm({ ...form, reviewsEnabled: event.target.checked })
              }
            />
            <span>Exibir avaliacoes na Home</span>
          </label>
          <div className="editor-form__grid">
            <TextField
              label="Etiqueta da secao"
              placeholder="Opcional"
              value={form.reviewsEyebrow}
              onChange={(event) =>
                setForm({ ...form, reviewsEyebrow: event.target.value })
              }
            />
            <TextField
              label="Titulo da secao"
              placeholder="Opcional"
              value={form.reviewsTitle}
              onChange={(event) =>
                setForm({ ...form, reviewsTitle: event.target.value })
              }
            />
            <FontSizeControl
              label="Duracao de uma volta"
              max={80}
              min={18}
              suffix="s"
              value={form.reviewsSpeedSeconds}
              onChange={(reviewsSpeedSeconds) =>
                setForm({ ...form, reviewsSpeedSeconds })
              }
            />
            <HexColorField
              label="Fundo da secao de avaliacoes"
              required
              value={form.reviewsBackgroundColor}
              onChange={(reviewsBackgroundColor) =>
                setForm({ ...form, reviewsBackgroundColor })
              }
            />
            <HexColorField
              label="Fundo dos cards de avaliacao"
              required
              value={form.reviewsCardColor}
              onChange={(reviewsCardColor) =>
                setForm({ ...form, reviewsCardColor })
              }
            />
          </div>
          <div className="text-style-group">
            <TextStyleControls
              description="Controla a chamada curta acima do titulo das avaliacoes."
              fallbackColor={form.accentColor}
              fontSizeRange={{ min: 10, max: 22 }}
              title="Etiqueta das avaliacoes"
              value={form.homeTextStyles.reviewsEyebrow}
              onChange={(value) => updateTextStyle("reviewsEyebrow", value)}
            />
            <TextStyleControls
              description="Define a hierarquia do titulo sem comprometer telas pequenas."
              fallbackColor={form.primaryColor}
              fontSizeRange={{ min: 24, max: 72 }}
              title="Titulo das avaliacoes"
              value={form.homeTextStyles.reviewsTitle}
              onChange={(value) => updateTextStyle("reviewsTitle", value)}
            />
            <TextStyleControls
              description="Ajusta o texto dos relatos; autoria e nota mantem hierarquia propria."
              fallbackColor={form.homeSecondaryTextColor}
              fontSizeRange={{ min: 14, max: 22 }}
              title="Texto das avaliacoes"
              value={form.homeTextStyles.reviewsBody}
              onChange={(value) => updateTextStyle("reviewsBody", value)}
            />
          </div>
        </section>
        <section className="editor-section" hidden={activeTab !== "reviews"}>
          <div className="footer-links-editor__header">
            <div>
              <strong>Relatos publicados</strong>
              <span>
                Cadastre apenas experiencias reais, verificaveis e autorizadas.
              </span>
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={form.reviewsItems.length >= 12 || saving}
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  reviewsItems: [
                    ...current.reviewsItems,
                    {
                      id: crypto.randomUUID(),
                      author: "",
                      context: "",
                      content: "",
                      rating: 5,
                      enabled: true,
                    },
                  ],
                }))
              }
            >
              <Plus size={16} />
              Nova avaliacao
            </Button>
          </div>
          {form.reviewsItems.length ? (
            <div className="reviews-editor" aria-live="polite">
              {form.reviewsItems.map((item, index) => (
                <article className="review-editor__item" key={item.id}>
                  <div className="manifesto-editor__header">
                    <div>
                      <span>{index + 1}</span>
                      <strong>Avaliacao {index + 1}</strong>
                    </div>
                    <div className="manifesto-editor__actions">
                      <IconButton
                        label={`Mover avaliacao ${index + 1} para cima`}
                        type="button"
                        disabled={index === 0 || saving}
                        onClick={() => moveReviewItem(index, -1)}
                      >
                        <ArrowUp size={15} />
                      </IconButton>
                      <IconButton
                        label={`Mover avaliacao ${index + 1} para baixo`}
                        type="button"
                        disabled={
                          index === form.reviewsItems.length - 1 || saving
                        }
                        onClick={() => moveReviewItem(index, 1)}
                      >
                        <ArrowDown size={15} />
                      </IconButton>
                      <IconButton
                        label={`Remover avaliacao ${index + 1}`}
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            reviewsItems: current.reviewsItems.filter(
                              (review) => review.id !== item.id,
                            ),
                          }))
                        }
                      >
                        <Trash2 size={15} />
                      </IconButton>
                    </div>
                  </div>
                  <div className="editor-form__grid">
                    <TextField
                      label={`Nome na avaliacao ${index + 1}`}
                      maxLength={80}
                      placeholder="Nome ou identificacao publica"
                      value={item.author}
                      onChange={(event) =>
                        updateReviewItem(item.id, {
                          author: event.target.value,
                        })
                      }
                    />
                    <TextField
                      label={`Contexto da avaliacao ${index + 1}`}
                      maxLength={100}
                      placeholder="Opcional: cidade, produto ou perfil"
                      value={item.context}
                      onChange={(event) =>
                        updateReviewItem(item.id, {
                          context: event.target.value,
                        })
                      }
                    />
                    <SelectField
                      label={`Nota da avaliacao ${index + 1}`}
                      value={String(item.rating)}
                      onChange={(event) =>
                        updateReviewItem(item.id, {
                          rating: Number(event.target.value),
                        })
                      }
                    >
                      {[5, 4, 3, 2, 1].map((rating) => (
                        <option key={rating} value={rating}>
                          {rating} {rating === 1 ? "estrela" : "estrelas"}
                        </option>
                      ))}
                    </SelectField>
                    <label className="visibility-control">
                      <input
                        checked={item.enabled}
                        type="checkbox"
                        onChange={(event) =>
                          updateReviewItem(item.id, {
                            enabled: event.target.checked,
                          })
                        }
                      />
                      <span>Exibir esta avaliacao</span>
                    </label>
                  </div>
                  <TextAreaField
                    label={`Relato da avaliacao ${index + 1}`}
                    maxLength={360}
                    rows={4}
                    value={item.content}
                    onChange={(event) =>
                      updateReviewItem(item.id, {
                        content: event.target.value,
                      })
                    }
                  />
                </article>
              ))}
            </div>
          ) : (
            <div className="footer-links-editor__empty">
              <Star aria-hidden="true" size={18} />
              <p>Nenhuma avaliacao cadastrada. A Home permanece sem a secao.</p>
            </div>
          )}
        </section>
        <section
          aria-labelledby="appearance-tab-composition"
          className="editor-section"
          hidden={activeTab !== "composition"}
          id="appearance-panel-composition"
          role="tabpanel"
        >
          <div className="editor-section__title">
            <Palette size={18} />
            <h3>Paleta e superficies</h3>
          </div>
          <p className="editor-section__hint">
            Cores validadas e aplicadas como tokens em toda a composicao da
            Home.
          </p>
          <div className="editor-form__grid color-controls">
            {storefrontPaletteFields.map((field) => (
              <HexColorField
                key={field.key}
                label={field.label}
                required
                value={form[field.key]}
                onChange={(color) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    [field.key]: color,
                  }))
                }
              />
            ))}
          </div>
          <div className="text-style-group">
            <TextStyleControls
              description="Aplica tipografia consistente aos atalhos sem alterar seus icones ou destinos."
              fallbackColor={form.primaryColor}
              fontSizeRange={{ min: 12, max: 24 }}
              title="Links de navegacao editorial"
              value={form.homeTextStyles.navigation}
              onChange={(value) => updateTextStyle("navigation", value)}
            />
            <TextStyleControls
              description="Controla somente os titulos dos produtos; preco e informacoes operacionais permanecem protegidos."
              fallbackColor={form.primaryColor}
              fontSizeRange={{ min: 18, max: 38 }}
              title="Titulos dos cards"
              value={form.homeTextStyles.productCardTitle}
              onChange={(value) => updateTextStyle("productCardTitle", value)}
            />
          </div>
        </section>
        <section
          className="editor-section"
          hidden={activeTab !== "composition"}
        >
          <div className="editor-section__title">
            <Maximize2 size={18} />
            <h3>Layout e transicao da capa</h3>
          </div>
          <div className="editor-form__grid">
            <SelectField
              label="Layout da home"
              value={form.homeLayout}
              onChange={(event) =>
                setForm({
                  ...form,
                  homeLayout: event.target
                    .value as StorefrontSettings["homeLayout"],
                })
              }
            >
              <option value="editorial">Editorial</option>
              <option value="compact">Compacto</option>
              <option value="showcase">Showcase</option>
            </SelectField>
            <SelectField
              label="Espacamento entre secoes"
              value={form.homeSectionSpacing}
              onChange={(event) =>
                setForm({
                  ...form,
                  homeSectionSpacing: event.target
                    .value as StorefrontSettings["homeSectionSpacing"],
                })
              }
            >
              <option value="compact">Compacto</option>
              <option value="balanced">Equilibrado</option>
              <option value="airy">Arejado</option>
            </SelectField>
            <SelectField
              label="Enquadramento das imagens"
              value={form.imageFit}
              onChange={(event) =>
                setForm({
                  ...form,
                  imageFit: event.target
                    .value as StorefrontSettings["imageFit"],
                })
              }
            >
              <option value="contain">Produto inteiro</option>
              <option value="cover">Ampliar sem cortar</option>
            </SelectField>
            <SelectField
              label="Transicao entre capa e Home"
              value={form.homeTransitionPreset}
              onChange={(event) =>
                setForm({
                  ...form,
                  homeTransitionPreset: event.target
                    .value as StorefrontSettings["homeTransitionPreset"],
                })
              }
            >
              <option value="soft">Suave</option>
              <option value="editorial">Editorial</option>
              <option value="depth">Profundidade</option>
              <option value="minimal">Minima</option>
              <option value="none">Sem transicao</option>
            </SelectField>
            <SelectField
              label="Profundidade visual"
              value={form.homeDepthIntensity}
              onChange={(event) =>
                setForm({
                  ...form,
                  homeDepthIntensity: event.target
                    .value as StorefrontSettings["homeDepthIntensity"],
                })
              }
            >
              <option value="subtle">Sutil</option>
              <option value="balanced">Equilibrada</option>
              <option value="pronounced">Marcante</option>
            </SelectField>
            <SelectField
              label="Divisor do manifesto"
              value={form.manifestoDivider}
              onChange={(event) =>
                setForm({
                  ...form,
                  manifestoDivider: event.target
                    .value as StorefrontSettings["manifestoDivider"],
                })
              }
            >
              <option value="none">Sem divisor</option>
              <option value="line">Linha completa</option>
              <option value="accent">Detalhe de destaque</option>
            </SelectField>
            <FontSizeControl
              label="Sobreposicao da transicao"
              max={96}
              min={0}
              value={form.homeTransitionOverlap}
              onChange={(value) =>
                setForm({ ...form, homeTransitionOverlap: value })
              }
            />
            <FontSizeControl
              label="Opacidade da transicao"
              max={100}
              min={0}
              suffix="%"
              value={form.homeTransitionOpacity}
              onChange={(value) =>
                setForm({ ...form, homeTransitionOpacity: value })
              }
            />
            <FontSizeControl
              label="Largura maxima do manifesto"
              max={1120}
              min={560}
              value={form.manifestoMaxWidth}
              onChange={(value) =>
                setForm({ ...form, manifestoMaxWidth: value })
              }
            />
          </div>
        </section>
        <section
          className="editor-section"
          hidden={activeTab !== "composition"}
        >
          <div className="editor-section__title">
            <Eye size={18} />
            <h3>Ordem e visibilidade</h3>
          </div>
          <div className="section-order-editor">
            {form.homeSections.map((section, index) => (
              <article key={section.id}>
                <div>
                  <span>{index + 1}</span>
                  <strong>{homeSectionLabels[section.id]}</strong>
                </div>
                <label className="visibility-control">
                  <input
                    checked={section.enabled}
                    type="checkbox"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        homeSections: current.homeSections.map(
                          (currentSection) =>
                            currentSection.id === section.id
                              ? {
                                  ...currentSection,
                                  enabled: event.target.checked,
                                }
                              : currentSection,
                        ),
                      }))
                    }
                  />
                  <span>Exibir</span>
                </label>
                <div className="section-order-editor__actions">
                  <IconButton
                    label={`Mover ${homeSectionLabels[section.id]} para cima`}
                    type="button"
                    disabled={index === 0 || saving}
                    onClick={() => moveHomeSection(index, -1)}
                  >
                    <ArrowUp size={15} />
                  </IconButton>
                  <IconButton
                    label={`Mover ${homeSectionLabels[section.id]} para baixo`}
                    type="button"
                    disabled={index === form.homeSections.length - 1 || saving}
                    onClick={() => moveHomeSection(index, 1)}
                  >
                    <ArrowDown size={15} />
                  </IconButton>
                </div>
              </article>
            ))}
          </div>
          <label className="visibility-control visibility-control--panel">
            <input
              checked={form.manifestoDividerMobileEnabled}
              disabled={form.manifestoDivider === "none"}
              type="checkbox"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  manifestoDividerMobileEnabled: event.target.checked,
                }))
              }
            />
            <span>Exibir divisor do manifesto em celulares</span>
          </label>
          <p className="editor-section__hint">
            Desative para separar o manifesto da proxima secao sem repetir
            linhas quando os atalhos tambem estiverem ocultos.
          </p>
          <label className="visibility-control visibility-control--panel">
            <input
              checked={form.editorialNavigationMobileEnabled}
              type="checkbox"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  editorialNavigationMobileEnabled: event.target.checked,
                }))
              }
            />
            <span>Exibir atalhos da Home em celulares</span>
          </label>
          <p className="editor-section__hint">
            Quando desativado, os atalhos continuam visiveis em tablets e
            desktops, mas nao ocupam espaco na Home em celulares.
          </p>
        </section>
        <section
          aria-labelledby="appearance-tab-sales"
          className="editor-section"
          hidden={activeTab !== "sales"}
          id="appearance-panel-sales"
          role="tabpanel"
        >
          <div className="editor-section__title">
            <ShoppingBag size={18} />
            <h3>Navegacao por categorias</h3>
          </div>
          <p className="editor-section__hint">
            As categorias cadastradas nos produtos aparecem automaticamente.
            Aqui voce controla apenas a apresentacao dessa navegacao.
          </p>
          <div className="editor-form__grid">
            <TextField
              label="Etiqueta da secao"
              maxLength={80}
              placeholder="Opcional"
              value={form.categoryEyebrow}
              onChange={(event) =>
                setForm({ ...form, categoryEyebrow: event.target.value })
              }
            />
            <TextField
              label="Titulo da secao"
              maxLength={100}
              placeholder="Opcional"
              value={form.categoryTitle}
              onChange={(event) =>
                setForm({ ...form, categoryTitle: event.target.value })
              }
            />
            <TextAreaField
              className="editor-form__wide"
              label="Descricao da secao"
              maxLength={220}
              placeholder="Opcional"
              rows={3}
              value={form.categoryDescription}
              onChange={(event) =>
                setForm({ ...form, categoryDescription: event.target.value })
              }
            />
            <TextField
              label="Texto do link para o catalogo"
              maxLength={60}
              required
              value={form.categoryLinkLabel}
              onChange={(event) =>
                setForm({ ...form, categoryLinkLabel: event.target.value })
              }
            />
            <SelectField
              label="Organizacao das categorias"
              value={form.categoryLayout}
              onChange={(event) =>
                setForm({
                  ...form,
                  categoryLayout: event.target
                    .value as StorefrontSettings["categoryLayout"],
                })
              }
            >
              <option value="rail">Faixa horizontal</option>
              <option value="grid">Grade organizada</option>
            </SelectField>
            <FontSizeControl
              label="Quantidade de categorias"
              max={8}
              min={3}
              suffix=""
              value={form.categoryLimit}
              onChange={(categoryLimit) => setForm({ ...form, categoryLimit })}
            />
          </div>
        </section>
        <section className="editor-section" hidden={activeTab !== "sales"}>
          <div className="editor-section__title">
            <PackagePlus size={18} />
            <h3>Vitrine de produtos</h3>
          </div>
          <p className="editor-section__hint">
            Ajuste a densidade da Home sem alterar a grade da pagina de
            Catalogo. Produtos marcados como destaque continuam ilimitados.
          </p>
          <div className="editor-form__grid">
            <SelectField
              label="Estilo visual dos cards"
              value={form.productCardStyle}
              onChange={(event) =>
                setForm({
                  ...form,
                  productCardStyle: event.target
                    .value as StorefrontSettings["productCardStyle"],
                })
              }
            >
              <option value="boutique">Atual - Boutique</option>
              <option value="ecommerce">E-commerce</option>
              <option value="minimal">Minimalista</option>
              <option value="editorial">Editorial</option>
            </SelectField>
            <TextAreaField
              className="editor-form__wide"
              label="Descricao dos produtos em destaque"
              maxLength={220}
              placeholder="Opcional"
              rows={3}
              value={form.featuredDescription}
              onChange={(event) =>
                setForm({ ...form, featuredDescription: event.target.value })
              }
            />
            <SelectField
              label="Proporcao das imagens"
              value={form.homeProductImageRatio}
              onChange={(event) =>
                setForm({
                  ...form,
                  homeProductImageRatio: event.target
                    .value as StorefrontSettings["homeProductImageRatio"],
                })
              }
            >
              <option value="landscape">Horizontal</option>
              <option value="square">Quadrada</option>
            </SelectField>
            <SelectField
              label="Descricao nos cards"
              value={form.homeProductDescriptionMode}
              onChange={(event) =>
                setForm({
                  ...form,
                  homeProductDescriptionMode: event.target
                    .value as StorefrontSettings["homeProductDescriptionMode"],
                })
              }
            >
              <option value="full">Completa, ate 200 caracteres</option>
              <option value="compact">Resumo em ate 3 linhas</option>
            </SelectField>
            <SelectField
              label="Colunas no desktop"
              value={String(form.homeProductColumnsDesktop)}
              onChange={(event) =>
                setForm({
                  ...form,
                  homeProductColumnsDesktop: Number(event.target.value),
                })
              }
            >
              <option value="3">3 produtos</option>
              <option value="4">4 produtos</option>
            </SelectField>
            <SelectField
              label="Colunas no tablet"
              value={String(form.homeProductColumnsTablet)}
              onChange={(event) =>
                setForm({
                  ...form,
                  homeProductColumnsTablet: Number(event.target.value),
                })
              }
            >
              <option value="2">2 produtos</option>
              <option value="3">3 produtos</option>
            </SelectField>
            <SelectField
              label="Colunas no celular"
              value={String(form.homeProductColumnsMobile)}
              onChange={(event) =>
                setForm({
                  ...form,
                  homeProductColumnsMobile: Number(event.target.value),
                })
              }
            >
              <option value="1">1 produto</option>
              <option value="2">2 produtos</option>
            </SelectField>
          </div>
        </section>
        <section className="editor-section" hidden={activeTab !== "sales"}>
          <div className="editor-section__title">
            <MessageCircle size={18} />
            <h3>Formas de compra</h3>
          </div>
          <p className="editor-section__hint">
            Estes textos apresentam os dois caminhos existentes. A logica do
            WhatsApp, Pix e Mercado Pago permanece protegida pelo sistema.
          </p>
          <div className="editor-form__grid">
            <TextField
              label="Etiqueta da secao"
              maxLength={80}
              placeholder="Opcional"
              value={form.commerceEyebrow}
              onChange={(event) =>
                setForm({ ...form, commerceEyebrow: event.target.value })
              }
            />
            <TextField
              label="Titulo da secao"
              maxLength={120}
              placeholder="Opcional"
              value={form.commerceTitle}
              onChange={(event) =>
                setForm({ ...form, commerceTitle: event.target.value })
              }
            />
            <TextAreaField
              className="editor-form__wide"
              label="Descricao da secao"
              maxLength={280}
              placeholder="Opcional"
              rows={3}
              value={form.commerceDescription}
              onChange={(event) =>
                setForm({ ...form, commerceDescription: event.target.value })
              }
            />
            <TextField
              label="Titulo da compra pelo WhatsApp"
              maxLength={80}
              required
              value={form.commerceWhatsappTitle}
              onChange={(event) =>
                setForm({ ...form, commerceWhatsappTitle: event.target.value })
              }
            />
            <TextField
              label="Titulo do pagamento online"
              maxLength={80}
              required
              value={form.commerceOnlineTitle}
              onChange={(event) =>
                setForm({ ...form, commerceOnlineTitle: event.target.value })
              }
            />
            <TextAreaField
              label="Descricao da compra pelo WhatsApp"
              maxLength={180}
              rows={4}
              value={form.commerceWhatsappDescription}
              onChange={(event) =>
                setForm({
                  ...form,
                  commerceWhatsappDescription: event.target.value,
                })
              }
            />
            <TextAreaField
              label="Descricao do pagamento online"
              maxLength={180}
              rows={4}
              value={form.commerceOnlineDescription}
              onChange={(event) =>
                setForm({
                  ...form,
                  commerceOnlineDescription: event.target.value,
                })
              }
            />
            <TextField
              label="Texto do botao"
              maxLength={60}
              required
              value={form.commerceCtaLabel}
              onChange={(event) =>
                setForm({ ...form, commerceCtaLabel: event.target.value })
              }
            />
          </div>
        </section>
        <section className="editor-section" hidden={activeTab !== "sales"}>
          <div className="editor-section__title">
            <Type size={18} />
            <h3>Tipografia das secoes comerciais</h3>
          </div>
          <div className="text-style-group">
            <TextStyleControls
              description="Chamada curta acima da navegacao por categorias."
              fallbackColor={form.accentColor}
              fontSizeRange={{ min: 10, max: 22 }}
              title="Etiqueta das categorias"
              value={form.homeTextStyles.categoryEyebrow}
              onChange={(value) => updateTextStyle("categoryEyebrow", value)}
            />
            <TextStyleControls
              description="Titulo principal da navegacao por categorias."
              fallbackColor={form.primaryColor}
              fontSizeRange={{ min: 24, max: 64 }}
              title="Titulo das categorias"
              value={form.homeTextStyles.categoryTitle}
              onChange={(value) => updateTextStyle("categoryTitle", value)}
            />
            <TextStyleControls
              description="Texto de apoio da navegacao por categorias."
              fallbackColor={form.homeSecondaryTextColor}
              fontSizeRange={{ min: 12, max: 24 }}
              title="Descricao das categorias"
              value={form.homeTextStyles.categoryBody}
              onChange={(value) => updateTextStyle("categoryBody", value)}
            />
            <TextStyleControls
              description="Chamada curta acima das formas de compra."
              fallbackColor={form.accentColor}
              fontSizeRange={{ min: 10, max: 22 }}
              title="Etiqueta das formas de compra"
              value={form.homeTextStyles.commerceEyebrow}
              onChange={(value) => updateTextStyle("commerceEyebrow", value)}
            />
            <TextStyleControls
              description="Titulo principal das formas de compra."
              fallbackColor={form.primaryColor}
              fontSizeRange={{ min: 24, max: 68 }}
              title="Titulo das formas de compra"
              value={form.homeTextStyles.commerceTitle}
              onChange={(value) => updateTextStyle("commerceTitle", value)}
            />
            <TextStyleControls
              description="Textos explicativos da secao e dos dois fluxos."
              fallbackColor={form.homeSecondaryTextColor}
              fontSizeRange={{ min: 12, max: 24 }}
              title="Descricoes das formas de compra"
              value={form.homeTextStyles.commerceBody}
              onChange={(value) => updateTextStyle("commerceBody", value)}
            />
          </div>
        </section>
        <section
          aria-labelledby="appearance-tab-motion"
          className="editor-section"
          hidden={activeTab !== "motion"}
          id="appearance-panel-motion"
          role="tabpanel"
        >
          <div className="editor-section__title">
            <Sparkles size={18} />
            <h3>Movimento da Home</h3>
          </div>
          <p className="editor-section__hint">
            Cada area possui seu proprio efeito. Movimento reduzido continua
            automatico para todos os visitantes.
          </p>
          <div className="editor-form__grid">
            <label className="visibility-control visibility-control--panel">
              <input
                checked={form.homeMotionEnabled}
                type="checkbox"
                onChange={(event) => {
                  const homeMotionEnabled = event.target.checked;
                  setForm((current) => ({
                    ...current,
                    homeMotionEnabled,
                  }));
                  setPreviewKey((current) => current + 1);
                }}
              />
              <span>Ativar animacoes da Home</span>
            </label>
            <SelectField
              label="Intensidade do movimento"
              value={form.homeMotionIntensity}
              onChange={(event) => {
                const homeMotionIntensity = event.target
                  .value as StorefrontSettings["homeMotionIntensity"];
                setForm((current) => ({
                  ...current,
                  homeMotionIntensity,
                }));
                setPreviewKey((current) => current + 1);
              }}
            >
              <option value="subtle">Sutil</option>
              <option value="balanced">Equilibrada</option>
              <option value="expressive">Expressiva</option>
            </SelectField>
          </div>
          <div className="motion-block-editor">
            {(
              Object.keys(motionBlockLabels) as Array<
                keyof StorefrontSettings["homeMotionByBlock"]
              >
            ).map((key) => (
              <article key={key}>
                <div>
                  <strong>{motionBlockLabels[key].title}</strong>
                  <p>{motionBlockLabels[key].description}</p>
                </div>
                <SelectField
                  disabled={!form.homeMotionEnabled}
                  label={`Efeito de ${motionBlockLabels[key].title}`}
                  value={form.homeMotionByBlock[key]}
                  onChange={(event) => {
                    const homeMotionPreset = event.target
                      .value as StorefrontSettings["homeMotionPreset"];
                    setForm((current) => ({
                      ...current,
                      homeMotionByBlock: {
                        ...current.homeMotionByBlock,
                        [key]: homeMotionPreset,
                      },
                    }));
                    setPreviewKey((current) => current + 1);
                  }}
                >
                  {motionPresetOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </SelectField>
              </article>
            ))}
          </div>
        </section>
        <section
          aria-labelledby="appearance-tab-seo"
          className="editor-section"
          hidden={activeTab !== "seo"}
          id="appearance-panel-seo"
          role="tabpanel"
        >
          <div className="editor-section__title">
            <Eye size={18} />
            <h3>SEO e identidade do navegador</h3>
          </div>
          <p className="editor-section__hint">
            Estes dados aparecem na aba do navegador, nos buscadores e no
            compartilhamento da loja.
          </p>
          <div className="editor-form__grid">
            <TextField
              label="Titulo padrao"
              required
              maxLength={70}
              value={form.defaultMetaTitle}
              onChange={(event) =>
                setForm({ ...form, defaultMetaTitle: event.target.value })
              }
            />
            <TextField
              label="Email de contato"
              type="email"
              value={form.contactEmail}
              onChange={(event) =>
                setForm({ ...form, contactEmail: event.target.value })
              }
            />
            <TextAreaField
              className="editor-form__wide"
              label="Descricao padrao"
              required
              maxLength={180}
              rows={4}
              value={form.defaultMetaDescription}
              onChange={(event) =>
                setForm({
                  ...form,
                  defaultMetaDescription: event.target.value,
                })
              }
            />
            <ImageUploadField
              label="Favicon"
              value={form.faviconUrl}
              alt="Previa do favicon"
              recommendation="PNG, JPG ou WebP quadrado; recomendado 512 x 512px"
              variant="icon"
              disabled={saving}
              onUploadingChange={(active) => trackUpload("favicon", active)}
              onChange={(upload) =>
                setForm((current) => ({ ...current, faviconUrl: upload.url }))
              }
              onRemove={() =>
                setForm((current) => ({ ...current, faviconUrl: "" }))
              }
            />
            <ImageUploadField
              label="Imagem de compartilhamento"
              value={form.socialImageUrl}
              alt="Previa da imagem de compartilhamento"
              recommendation="PNG, JPG ou WebP; recomendado 1200 x 630px"
              variant="hero"
              disabled={saving}
              onUploadingChange={(active) => trackUpload("social", active)}
              onChange={(upload) =>
                setForm((current) => ({
                  ...current,
                  socialImageUrl: upload.url,
                }))
              }
              onRemove={() =>
                setForm((current) => ({ ...current, socialImageUrl: "" }))
              }
            />
          </div>
        </section>
        <section
          aria-labelledby="appearance-tab-footer"
          className="editor-section"
          hidden={activeTab !== "footer"}
          id="appearance-panel-footer"
          role="tabpanel"
        >
          <div className="editor-section__title">
            <Link2 size={18} />
            <h3>Rodape</h3>
          </div>
          <p className="editor-section__hint">
            Esta paleta pertence somente ao rodape e nao altera a Home, o
            Cabecalho ou o Catalogo.
          </p>
          <div className="editor-form__grid color-controls">
            <HexColorField
              label="Cor do rodape"
              required
              value={form.footerColor}
              onChange={(footerColor) => setForm({ ...form, footerColor })}
            />
          </div>
          <div className="footer-copy-groups">
            <fieldset className="footer-copy-group">
              <legend>Marca e chamada</legend>
              <div className="editor-form__grid footer-copy-fields">
                <TextAreaField
                  label="Slogan do rodape (opcional)"
                  maxLength={220}
                  rows={3}
                  className="editor-form__wide"
                  value={form.footerSlogan}
                  onChange={(event) =>
                    setForm({ ...form, footerSlogan: event.target.value })
                  }
                />
                <TextField
                  label="Texto do botao do WhatsApp"
                  maxLength={60}
                  value={form.footerWhatsappButtonLabel}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      footerWhatsappButtonLabel: event.target.value,
                    })
                  }
                />
                <label className="editor-checkbox">
                  <input
                    type="checkbox"
                    checked={form.footerShowBrandName}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        footerShowBrandName: event.target.checked,
                      })
                    }
                  />
                  <span>
                    <strong>Exibir nome da marca no rodape</strong>
                    <small>
                      Desative quando a logo ja incluir o nome completo da loja.
                    </small>
                  </span>
                </label>
              </div>
            </fieldset>
            <fieldset className="footer-copy-group">
              <legend>Navegacao e atendimento</legend>
              <div className="editor-form__grid footer-copy-fields">
                <TextField
                  label="Titulo da coluna de navegacao"
                  maxLength={80}
                  value={form.footerHeading}
                  onChange={(event) =>
                    setForm({ ...form, footerHeading: event.target.value })
                  }
                />
                <TextField
                  label="Titulo da coluna de atendimento"
                  maxLength={80}
                  value={form.footerServiceHeading}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      footerServiceHeading: event.target.value,
                    })
                  }
                />
                <TextField
                  label="Primeira linha de atendimento"
                  maxLength={100}
                  value={form.footerServiceLineOne}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      footerServiceLineOne: event.target.value,
                    })
                  }
                />
                <TextField
                  label="Segunda linha de atendimento"
                  maxLength={100}
                  value={form.footerServiceLineTwo}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      footerServiceLineTwo: event.target.value,
                    })
                  }
                />
                <TextField
                  label="Texto do link de atendimento"
                  maxLength={60}
                  value={form.footerWhatsappLinkLabel}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      footerWhatsappLinkLabel: event.target.value,
                    })
                  }
                />
              </div>
            </fieldset>
            <fieldset className="footer-copy-group">
              <legend>Faixa inferior</legend>
              <div className="editor-form__grid footer-copy-fields">
                <TextField
                  className="editor-form__wide"
                  label="Direitos autorais"
                  maxLength={180}
                  value={form.footerCopyrightText}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      footerCopyrightText: event.target.value,
                    })
                  }
                />
                <p className="editor-section__hint editor-form__wide">
                  Use {"{{brand}}"} para o nome da loja e {"{{year}}"} para o
                  ano atual. Previa:{" "}
                  {formatFooterCopyright(
                    form.footerCopyrightText,
                    form.brandName,
                  )}
                </p>
                <TextField
                  label="Texto de seguranca"
                  maxLength={100}
                  value={form.footerSecurityText}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      footerSecurityText: event.target.value,
                    })
                  }
                />
              </div>
            </fieldset>
          </div>
          <TextStyleControls
            description="Ajusta o slogan abaixo da logo mantendo contraste automatico e leitura no mobile."
            fallbackColor={accessibleTextColor(
              form.footerColor,
              form.primaryColor,
            )}
            fontSizeRange={{ min: 12, max: 24 }}
            title="Estilo do slogan"
            value={form.homeTextStyles.footerSlogan}
            onChange={(value) => updateTextStyle("footerSlogan", value)}
          />
          <div className="footer-links-editor__header">
            <div>
              <strong>Links, contato e redes sociais</strong>
              <span>
                Use rota interna, HTTPS, email ou telefone. O texto e opcional
                quando o item tiver um icone. Ate 8 itens.
              </span>
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={form.footerLinks.length >= 8 || saving || uploading}
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  footerLinks: orderFooterLinks([
                    ...current.footerLinks,
                    {
                      id: crypto.randomUUID(),
                      label: "",
                      href: "",
                      iconUrl: "",
                    },
                  ]),
                }))
              }
            >
              <Plus size={16} />
              Adicionar item
            </Button>
          </div>
          {form.footerLinks.length ? (
            <div className="footer-links-editor" aria-live="polite">
              {orderedFooterLinks.map((link, index) => (
                <article className="footer-link-editor" key={link.id}>
                  <div className="footer-link-editor__title">
                    <div>
                      <span>{index + 1}</span>
                      <strong>{link.label || "Novo item do rodape"}</strong>
                    </div>
                    <IconButton
                      type="button"
                      label={`Remover ${link.label || `item ${index + 1}`}`}
                      disabled={saving || uploading}
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          footerLinks: current.footerLinks.filter(
                            (item) => item.id !== link.id,
                          ),
                        }))
                      }
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
                  <div className="footer-link-editor__fields">
                    <TextField
                      label="Texto exibido (opcional)"
                      maxLength={60}
                      value={link.label}
                      onChange={(event) =>
                        updateFooterLink(link.id, { label: event.target.value })
                      }
                    />
                    <TextField
                      label="Destino do link"
                      required
                      inputMode="url"
                      placeholder="https://, mailto:, tel: ou /pagina"
                      value={link.href}
                      onChange={(event) =>
                        updateFooterLink(link.id, { href: event.target.value })
                      }
                    />
                  </div>
                  <ImageUploadField
                    label={`Icone de ${link.label || `item ${index + 1}`}`}
                    value={link.iconUrl}
                    alt=""
                    recommendation="Obrigatorio quando o texto estiver vazio; prefira imagem quadrada com fundo transparente"
                    variant="icon"
                    disabled={saving}
                    onUploadingChange={(active) =>
                      trackUpload(`footer-${link.id}`, active)
                    }
                    onChange={(upload) =>
                      updateFooterLink(link.id, { iconUrl: upload.url })
                    }
                    onRemove={() => updateFooterLink(link.id, { iconUrl: "" })}
                  />
                </article>
              ))}
            </div>
          ) : (
            <div className="footer-links-editor__empty">
              <Link2 size={20} aria-hidden="true" />
              <p>
                O rodape ficara apenas com a marca e o slogan. Adicione itens
                para contato ou redes sociais.
              </p>
            </div>
          )}
        </section>
        {error ? <p className="error-text">{error}</p> : null}
        <div className="form-actions">
          <Button type="submit" loading={saving} disabled={uploading}>
            <Save size={16} />
            {uploading ? "Enviando imagens" : "Salvar vitrine"}
          </Button>
        </div>
      </section>
      <aside
        className={`appearance-preview appearance-preview--${previewDevice}`}
        data-storefront-font={form.storefrontFont}
        style={
          {
            "--preview-primary": form.primaryColor,
            "--preview-accent": form.accentColor,
            "--preview-footer": form.footerColor,
            "--preview-bg": form.backgroundColor,
            "--preview-home-surface": form.homeSurfaceColor,
            "--preview-home-alt": form.homeAlternateColor,
            "--preview-secondary": form.homeSecondaryTextColor,
            "--preview-border": form.homeBorderColor,
            "--preview-shadow": form.homeShadowColor,
            "--preview-transition-start": form.homeTransitionStartColor,
            "--preview-transition-end": form.homeTransitionEndColor,
            "--preview-transition-opacity": `${form.homeTransitionOpacity}%`,
            "--preview-transition-overlap": `${form.homeTransitionOverlap / 3}px`,
            "--preview-transition-edge-strength": `${Math.min(
              8,
              Math.max(2, form.homeTransitionOpacity / 12),
            )}%`,
            "--preview-manifesto-width": `${form.manifestoMaxWidth / 3}px`,
            "--preview-footer-foreground": accessibleTextColor(
              form.footerColor,
              form.primaryColor,
            ),
            "--preview-hero-eyebrow-color":
              form.homeTextStyles.heroEyebrow.color || form.accentColor,
            "--preview-hero-eyebrow-font-size": `${form.homeTextStyles.heroEyebrow.fontSize}px`,
            "--preview-hero-eyebrow-space": `${form.homeTextStyles.heroEyebrow.spacingAfter}px`,
            "--preview-hero-eyebrow-font": textFontCssValue(
              form.homeTextStyles.heroEyebrow.fontFamily,
              "var(--font-body)",
            ),
            "--preview-hero-title-color":
              form.homeTextStyles.heroTitle.color || form.primaryColor,
            "--preview-hero-title-font-size": `${form.homeTextStyles.heroTitle.fontSize}px`,
            "--preview-hero-title-space": `${form.homeTextStyles.heroTitle.spacingAfter}px`,
            "--preview-hero-title-font": textFontCssValue(
              form.homeTextStyles.heroTitle.fontFamily,
              "var(--font-display)",
            ),
            "--preview-manifesto-color":
              form.homeTextStyles.manifesto.color || form.primaryColor,
            "--preview-manifesto-font-size": `${form.homeTextStyles.manifesto.fontSize}px`,
            "--preview-manifesto-space": `${form.homeTextStyles.manifesto.spacingAfter / 3}px`,
            "--preview-manifesto-font": textFontCssValue(
              form.homeTextStyles.manifesto.fontFamily,
              "var(--font-display)",
            ),
            "--preview-navigation-color":
              form.homeTextStyles.navigation.color || form.primaryColor,
            "--preview-navigation-font-size": `${form.homeTextStyles.navigation.fontSize}px`,
            "--preview-navigation-font": textFontCssValue(
              form.homeTextStyles.navigation.fontFamily,
              "var(--font-body)",
            ),
            "--preview-featured-eyebrow-color":
              form.homeTextStyles.featuredEyebrow.color || form.accentColor,
            "--preview-featured-eyebrow-font-size": `${form.homeTextStyles.featuredEyebrow.fontSize}px`,
            "--preview-featured-eyebrow-space": `${form.homeTextStyles.featuredEyebrow.spacingAfter / 2}px`,
            "--preview-featured-eyebrow-font": textFontCssValue(
              form.homeTextStyles.featuredEyebrow.fontFamily,
              "var(--font-body)",
            ),
            "--preview-featured-title-color":
              form.homeTextStyles.featuredTitle.color || form.primaryColor,
            "--preview-featured-title-font-size": `${form.homeTextStyles.featuredTitle.fontSize}px`,
            "--preview-featured-title-font": textFontCssValue(
              form.homeTextStyles.featuredTitle.fontFamily,
              "var(--font-display)",
            ),
            "--preview-category-eyebrow-color":
              form.homeTextStyles.categoryEyebrow.color || form.accentColor,
            "--preview-category-title-color":
              form.homeTextStyles.categoryTitle.color || form.primaryColor,
            "--preview-category-title-font": textFontCssValue(
              form.homeTextStyles.categoryTitle.fontFamily,
              "var(--font-display)",
            ),
            "--preview-category-body-color":
              form.homeTextStyles.categoryBody.color ||
              form.homeSecondaryTextColor,
            "--preview-commerce-eyebrow-color":
              form.homeTextStyles.commerceEyebrow.color || form.accentColor,
            "--preview-commerce-title-color":
              form.homeTextStyles.commerceTitle.color || form.primaryColor,
            "--preview-commerce-title-font": textFontCssValue(
              form.homeTextStyles.commerceTitle.fontFamily,
              "var(--font-display)",
            ),
            "--preview-commerce-body-color":
              form.homeTextStyles.commerceBody.color ||
              form.homeSecondaryTextColor,
            "--preview-card-title-color":
              form.homeTextStyles.productCardTitle.color || form.primaryColor,
            "--preview-card-title-font-size": `${form.homeTextStyles.productCardTitle.fontSize}px`,
            "--preview-card-title-font": textFontCssValue(
              form.homeTextStyles.productCardTitle.fontFamily,
              "var(--font-display)",
            ),
            "--preview-reviews-background": form.reviewsBackgroundColor,
            "--preview-reviews-card": form.reviewsCardColor,
            "--preview-reviews-eyebrow-color":
              form.homeTextStyles.reviewsEyebrow.color || form.accentColor,
            "--preview-reviews-eyebrow-font-size": `${form.homeTextStyles.reviewsEyebrow.fontSize}px`,
            "--preview-reviews-eyebrow-font": textFontCssValue(
              form.homeTextStyles.reviewsEyebrow.fontFamily,
              "var(--font-body)",
            ),
            "--preview-reviews-title-color":
              form.homeTextStyles.reviewsTitle.color || form.primaryColor,
            "--preview-reviews-title-font-size": `${form.homeTextStyles.reviewsTitle.fontSize}px`,
            "--preview-reviews-title-font": textFontCssValue(
              form.homeTextStyles.reviewsTitle.fontFamily,
              "var(--font-display)",
            ),
            "--preview-reviews-body-color":
              form.homeTextStyles.reviewsBody.color || form.primaryColor,
            "--preview-reviews-body-font-size": `${form.homeTextStyles.reviewsBody.fontSize}px`,
            "--preview-reviews-body-font": textFontCssValue(
              form.homeTextStyles.reviewsBody.fontFamily,
              "var(--font-body)",
            ),
            "--preview-footer-slogan-color":
              form.homeTextStyles.footerSlogan.color ||
              accessibleTextColor(form.footerColor, form.primaryColor),
            "--preview-footer-slogan-font-size": `${form.homeTextStyles.footerSlogan.fontSize}px`,
            "--preview-footer-slogan-space": `${form.homeTextStyles.footerSlogan.spacingAfter / 2}px`,
            "--preview-footer-slogan-font": textFontCssValue(
              form.homeTextStyles.footerSlogan.fontFamily,
              "var(--font-body)",
            ),
          } as CSSProperties
        }
      >
        {(
          ["composition", "sales", "header", "catalog"] as AppearanceTab[]
        ).includes(activeTab) ? (
          <StorefrontLivePreview
            device={previewDevice}
            focusLocation={activeTab === "catalog" ? "catalog" : "top"}
            form={form}
            publicWebUrl={publicWebUrl}
            replayKey={previewKey}
            onDeviceChange={setPreviewDevice}
            onReplay={() => setPreviewKey((current) => current + 1)}
          />
        ) : (
          <>
            <div className="appearance-preview__toolbar">
              <span>
                <Eye size={15} />
                Preview
              </span>
              <div
                className="appearance-preview__devices"
                role="group"
                aria-label="Tamanho do preview"
              >
                {(
                  [
                    ["desktop", "Desktop", Monitor],
                    ["tablet", "Tablet", Tablet],
                    ["mobile", "Celular", Smartphone],
                  ] as const
                ).map(([device, label, Icon]) => (
                  <IconButton
                    aria-pressed={previewDevice === device}
                    className={
                      previewDevice === device ? "is-active" : undefined
                    }
                    key={device}
                    label={label}
                    type="button"
                    onClick={() => setPreviewDevice(device)}
                  >
                    <Icon size={15} />
                  </IconButton>
                ))}
                <IconButton
                  label="Reproduzir animacao do preview"
                  type="button"
                  onClick={() => setPreviewKey((current) => current + 1)}
                >
                  <RotateCcw size={15} />
                </IconButton>
              </div>
            </div>
            <div
              className={`appearance-preview__canvas appearance-preview__canvas--${form.homeTransitionPreset}`}
              key={previewKey}
            >
              <div
                className={`appearance-preview__hero appearance-preview__hero--${form.heroHeight}${
                  form.heroImageUrl.includes("motion=product-drop")
                    ? " appearance-preview__hero--product-drop"
                    : ""
                }`}
              >
                <img src={adminMediaUrl(form.heroImageUrl)} alt="" />
                {form.heroEyebrow.trim() || form.heroTitle.trim() ? (
                  <div>
                    {form.heroEyebrow.trim() ? <p>{form.heroEyebrow}</p> : null}
                    {form.heroTitle.trim() ? <h2>{form.heroTitle}</h2> : null}
                  </div>
                ) : null}
              </div>
              <div className="appearance-preview__composition">
                {form.homeSections
                  .filter((section) => section.enabled)
                  .map((section) => {
                    if (section.id === "manifesto") {
                      return (
                        <div
                          className={`appearance-preview__manifesto appearance-preview__manifesto--${form.manifestoDivider}`}
                          data-mobile-divider-enabled={
                            form.manifestoDividerMobileEnabled
                          }
                          key={section.id}
                        >
                          {form.manifestoItems
                            .filter(
                              (item) => item.enabled && item.content.trim(),
                            )
                            .map((item) => (
                              <span
                                className={`is-${item.type} is-${item.alignment} is-${item.emphasis}`}
                                data-motion-effect={
                                  form.homeMotionEnabled
                                    ? form.homeMotionByBlock.manifesto
                                    : "static"
                                }
                                key={item.id}
                                style={{
                                  fontFamily: textFontCssValue(item.fontFamily),
                                  fontSize: item.fontSize
                                    ? `${Math.max(12, item.fontSize / 3)}px`
                                    : undefined,
                                  marginBottom: `${item.spacingAfter / 3}px`,
                                }}
                              >
                                {item.content}
                              </span>
                            ))}
                        </div>
                      );
                    }
                    if (section.id === "navigation") {
                      return (
                        <div
                          className="appearance-preview__navigation"
                          key={section.id}
                        >
                          {[
                            form.editorialCatalogLabel,
                            form.editorialOrdersLabel,
                            form.editorialAccountLabel,
                            form.editorialSupportLabel,
                          ].map((label) => (
                            <span
                              data-motion-effect={
                                form.homeMotionEnabled
                                  ? form.homeMotionByBlock.navigation
                                  : "static"
                              }
                              key={label}
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      );
                    }
                    if (section.id === "categories") {
                      return (
                        <div
                          className="appearance-preview__categories"
                          data-layout={form.categoryLayout}
                          key={section.id}
                        >
                          {form.categoryEyebrow.trim() ? (
                            <p>{form.categoryEyebrow}</p>
                          ) : null}
                          {form.categoryTitle.trim() ? (
                            <h3>{form.categoryTitle}</h3>
                          ) : null}
                          {form.categoryDescription.trim() ? (
                            <span>{form.categoryDescription}</span>
                          ) : null}
                          <div>
                            {[
                              "Categoria um",
                              "Categoria dois",
                              "Categoria tres",
                            ]
                              .slice(0, Math.min(3, form.categoryLimit))
                              .map((label, index) => (
                                <small key={label}>
                                  <b>{String(index + 1).padStart(2, "0")}</b>
                                  {label}
                                </small>
                              ))}
                          </div>
                        </div>
                      );
                    }
                    if (section.id === "commerce") {
                      return (
                        <div
                          className="appearance-preview__commerce"
                          key={section.id}
                        >
                          <div>
                            {form.commerceEyebrow.trim() ? (
                              <p>{form.commerceEyebrow}</p>
                            ) : null}
                            {form.commerceTitle.trim() ? (
                              <h3>{form.commerceTitle}</h3>
                            ) : null}
                            {form.commerceDescription.trim() ? (
                              <span>{form.commerceDescription}</span>
                            ) : null}
                          </div>
                          <div>
                            <strong>{form.commerceWhatsappTitle}</strong>
                            <small>{form.commerceWhatsappDescription}</small>
                            <strong>{form.commerceOnlineTitle}</strong>
                            <small>{form.commerceOnlineDescription}</small>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div
                        className="appearance-preview__section"
                        key={section.id}
                      >
                        <p
                          data-motion-effect={
                            form.homeMotionEnabled
                              ? form.homeMotionByBlock.featuredHeading
                              : "static"
                          }
                        >
                          <Star aria-hidden="true" size={12} />
                          <span>{form.featuredEyebrow}</span>
                        </p>
                        <div>
                          <h3
                            data-motion-effect={
                              form.homeMotionEnabled
                                ? form.homeMotionByBlock.featuredHeading
                                : "static"
                            }
                          >
                            {form.featuredTitle}
                          </h3>
                          <span className="appearance-preview__featured-link">
                            {form.featuredLinkLabel}
                          </span>
                        </div>
                        <article
                          className={`appearance-preview__card appearance-preview__card--${form.productCardStyle}`}
                          data-motion-effect={
                            form.homeMotionEnabled
                              ? form.homeMotionByBlock.productCards
                              : "static"
                          }
                        >
                          <div
                            className={`appearance-preview__card-media appearance-preview__card-media--${form.imageFit}`}
                          >
                            <img
                              src={adminMediaUrl(form.heroImageUrl)}
                              alt=""
                            />
                          </div>
                          <div>
                            <Badge>Categoria</Badge>
                            <h4>Produto de exemplo</h4>
                            <p className="appearance-preview__card-description">
                              {formatProductCardDescription(
                                "Descricao apresentada no card.\n° Beneficio principal\n° Informacao complementar",
                              )}
                            </p>
                            <strong>R$ 289,00</strong>
                            <span className="appearance-preview__card-button">
                              <ShoppingBag aria-hidden="true" size={13} />
                              {form.featuredAddButtonLabel}
                            </span>
                          </div>
                        </article>
                      </div>
                    );
                  })}
              </div>
              {form.reviewsEnabled &&
              form.reviewsItems.some(
                (item) =>
                  item.enabled && item.author.trim() && item.content.trim(),
              ) ? (
                <div
                  className="appearance-preview__reviews"
                  data-motion-effect={
                    form.homeMotionEnabled
                      ? form.homeMotionByBlock.reviews
                      : "static"
                  }
                >
                  <div className="appearance-preview__reviews-heading">
                    {form.reviewsEyebrow.trim() ? (
                      <p>{form.reviewsEyebrow}</p>
                    ) : null}
                    {form.reviewsTitle.trim() ? (
                      <h3>{form.reviewsTitle}</h3>
                    ) : null}
                  </div>
                  <div className="appearance-preview__reviews-track">
                    {form.reviewsItems
                      .filter(
                        (item) =>
                          item.enabled &&
                          item.author.trim() &&
                          item.content.trim(),
                      )
                      .slice(0, 3)
                      .map((item) => (
                        <article key={item.id}>
                          <span aria-hidden="true">
                            {"\u2605".repeat(item.rating)}
                          </span>
                          <p>{item.content}</p>
                          <strong>{item.author}</strong>
                        </article>
                      ))}
                  </div>
                </div>
              ) : null}
              <div className="appearance-preview__footer">
                <div className="appearance-preview__footer-main">
                  <div className="appearance-preview__footer-brand-column">
                    {form.logoOnDarkUrl ||
                    form.logoUrl ||
                    form.footerShowBrandName ? (
                      <div className="appearance-preview__footer-brand">
                        {form.logoOnDarkUrl || form.logoUrl ? (
                          <PreviewBrandLogo
                            fallbackText={form.brandName}
                            src={form.logoOnDarkUrl || form.logoUrl}
                          />
                        ) : null}
                        {form.footerShowBrandName ? (
                          <strong>{form.brandName}</strong>
                        ) : null}
                      </div>
                    ) : null}
                    {form.footerSlogan ? (
                      <p
                        data-motion-effect={
                          form.homeMotionEnabled
                            ? form.homeMotionByBlock.footer
                            : "static"
                        }
                      >
                        {form.footerSlogan}
                      </p>
                    ) : null}
                    {form.footerWhatsappButtonLabel ? (
                      <span className="appearance-preview__footer-button">
                        <MessageCircle size={13} />
                        {form.footerWhatsappButtonLabel}
                      </span>
                    ) : null}
                  </div>
                  <div className="appearance-preview__footer-column">
                    {form.footerHeading ? <b>{form.footerHeading}</b> : null}
                    <div className="appearance-preview__footer-navs">
                      {customFooterLinks.length ? (
                        <nav aria-label="Contato e redes sociais">
                          {customFooterLinks.map((link) => (
                            <span key={link.id}>
                              {link.iconUrl ? (
                                <img src={adminMediaUrl(link.iconUrl)} alt="" />
                              ) : null}
                              {link.label || null}
                            </span>
                          ))}
                        </nav>
                      ) : null}
                      {systemFooterLinks.length ? (
                        <nav aria-label="Paginas da loja">
                          {systemFooterLinks.map((link) => (
                            <span key={link.id}>
                              {link.iconUrl ? (
                                <img src={adminMediaUrl(link.iconUrl)} alt="" />
                              ) : null}
                              {link.label}
                            </span>
                          ))}
                        </nav>
                      ) : null}
                    </div>
                  </div>
                  <div className="appearance-preview__footer-column">
                    {form.footerServiceHeading ? (
                      <b>{form.footerServiceHeading}</b>
                    ) : null}
                    {form.footerServiceLineOne ? (
                      <span>{form.footerServiceLineOne}</span>
                    ) : null}
                    {form.footerServiceLineTwo ? (
                      <span>{form.footerServiceLineTwo}</span>
                    ) : null}
                    {form.footerWhatsappLinkLabel ? (
                      <strong className="appearance-preview__footer-action">
                        {form.footerWhatsappLinkLabel} →
                      </strong>
                    ) : null}
                  </div>
                </div>
                <div className="appearance-preview__footer-bottom">
                  {form.footerCopyrightText ? (
                    <span>
                      {formatFooterCopyright(
                        form.footerCopyrightText,
                        form.brandName,
                      )}
                    </span>
                  ) : null}
                  {form.footerSecurityText ? (
                    <span>{form.footerSecurityText}</span>
                  ) : null}
                </div>
              </div>
            </div>
          </>
        )}
      </aside>
    </form>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function orderMonthKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function orderDayKey(value: string) {
  const date = new Date(value);
  return `${orderMonthKey(value)}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatMonthKey(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year!, month! - 1, 1));
}

function formatDayKey(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date(`${value}T12:00:00`));
}

function groupOrdersByMonthAndDay(orders: OrderSummary[]) {
  const months = new Map<string, Map<string, OrderSummary[]>>();
  for (const order of orders) {
    const monthKey = orderMonthKey(order.createdAt);
    const dayKey = orderDayKey(order.createdAt);
    const days = months.get(monthKey) ?? new Map<string, OrderSummary[]>();
    days.set(dayKey, [...(days.get(dayKey) ?? []), order]);
    months.set(monthKey, days);
  }
  return [...months.entries()].sort(([left], [right]) =>
    right.localeCompare(left),
  );
}

function RevenueByChannelChart({ overview }: { overview?: AdminOverview }) {
  const online = overview?.revenueByChannel?.online ?? 0;
  const whatsapp = overview?.revenueByChannel?.whatsapp ?? 0;
  const maximum = Math.max(online, whatsapp, 1);

  if (online === 0 && whatsapp === 0) {
    return (
      <EmptyState
        title="Nenhuma receita confirmada"
        body="Pagamentos aprovados e vendas confirmadas pelo WhatsApp aparecerao aqui."
      />
    );
  }

  return (
    <div className="bar-chart" aria-label="Receita confirmada por canal">
      {[
        ["Online", online],
        ["WhatsApp", whatsapp],
      ].map(([label, value]) => (
        <span
          key={label}
          style={{
            height: `${Math.max(16, (Number(value) / maximum) * 100)}%`,
          }}
          title={`${label}: ${formatMoney(Number(value))}`}
        >
          <b>{label}</b>
          <small>{formatMoney(Number(value))}</small>
        </span>
      ))}
    </div>
  );
}

function OrderHistory({
  loading,
  orders,
  revenuePendingReference,
  onManage,
  onToggleWhatsappRevenue,
}: {
  loading: boolean;
  orders: OrderSummary[];
  revenuePendingReference?: string;
  onManage?: (order: OrderSummary) => void;
  onToggleWhatsappRevenue?: (order: OrderSummary) => void;
}) {
  if (loading) return <Skeleton className="table-skeleton" />;
  if (!orders.length) {
    return (
      <EmptyState
        title="Sem pedidos neste historico"
        body="Novos pedidos aparecerao organizados pela data em que foram criados."
      />
    );
  }

  return (
    <div className="order-history">
      {groupOrdersByMonthAndDay(orders).map(([month, days], monthIndex) => {
        const monthOrders = [...days.values()].flat();
        return (
          <details
            className="order-history__month"
            key={month}
            open={monthIndex === 0}
          >
            <summary>
              <span>
                <strong>{formatMonthKey(month)}</strong>
                <small>
                  {monthOrders.length}{" "}
                  {monthOrders.length === 1 ? "pedido" : "pedidos"}
                </small>
              </span>
              <b>
                {formatMoney(
                  monthOrders.reduce(
                    (sum, order) => sum + order.totalInCents,
                    0,
                  ),
                )}
              </b>
            </summary>
            <div className="order-history__days">
              {[...days.entries()]
                .sort(([left], [right]) => right.localeCompare(left))
                .map(([day, dayOrders], dayIndex) => (
                  <details
                    className="order-history__day"
                    key={day}
                    open={dayIndex === 0}
                  >
                    <summary>
                      <span>{formatDayKey(day)}</span>
                      <small>
                        {dayOrders.length}{" "}
                        {dayOrders.length === 1 ? "pedido" : "pedidos"}
                      </small>
                    </summary>
                    <DataTable
                      columns={[
                        "Referencia",
                        "Cliente",
                        "Status",
                        "Canal",
                        "Produtos",
                        "Total",
                        "Receita",
                        "Acoes",
                      ]}
                      rows={dayOrders.map((order) => [
                        order.publicReference,
                        order.customerEmail
                          ? maskEmail(order.customerEmail)
                          : (order.customerName ?? "Compra assistida"),
                        order.status,
                        paymentMethodLabel(order),
                        order.items.reduce(
                          (sum, item) => sum + item.quantity,
                          0,
                        ),
                        formatMoney(order.totalInCents),
                        order.revenueConfirmedAt
                          ? `Confirmada em ${formatDate(order.revenueConfirmedAt)}`
                          : "Nao confirmada",
                        <div
                          className="order-history__actions"
                          key={order.publicReference}
                        >
                          {order.salesChannel === "online" && onManage ? (
                            <IconButton
                              label={`Gerenciar entrega de ${order.publicReference}`}
                              onClick={() => onManage(order)}
                            >
                              <Edit3 size={16} />
                            </IconButton>
                          ) : null}
                          {order.salesChannel === "whatsapp" &&
                          onToggleWhatsappRevenue ? (
                            <Button
                              loading={
                                revenuePendingReference ===
                                order.publicReference
                              }
                              type="button"
                              variant="secondary"
                              onClick={() => onToggleWhatsappRevenue(order)}
                            >
                              {order.revenueConfirmedAt ? (
                                <RotateCcw size={16} />
                              ) : (
                                <CheckCircle2 size={16} />
                              )}
                              {order.revenueConfirmedAt
                                ? "Desfazer receita"
                                : "Confirmar venda"}
                            </Button>
                          ) : null}
                        </div>,
                      ])}
                    />
                  </details>
                ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}

function HistoryArchiveConfirmation({
  archived,
  count,
  pending,
  onCancel,
  onConfirm,
}: {
  archived: boolean;
  count: number;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <section
      className="panel delete-confirmation"
      aria-labelledby="history-confirmation-title"
    >
      <div>
        <p className="panel-eyebrow">Confirmacao</p>
        <h2 id="history-confirmation-title">
          {archived ? "Restaurar historico?" : "Arquivar historico atual?"}
        </h2>
        <p>
          {count}{" "}
          {count === 1 ? "pedido sera atualizado" : "pedidos serao atualizados"}
          . Nenhum registro financeiro sera apagado.
        </p>
      </div>
      <div className="delete-confirmation__actions">
        <Button
          disabled={pending}
          type="button"
          variant="secondary"
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button
          loading={pending}
          type="button"
          variant={archived ? "primary" : "danger"}
          onClick={onConfirm}
        >
          {archived ? <RotateCcw size={16} /> : <Archive size={16} />}
          Confirmar
        </Button>
      </div>
    </section>
  );
}

function Customers() {
  return (
    <Placeholder
      title="Clientes"
      body="Listas devem mascarar PII por padrao e exigir permissao para revelar dados sensiveis."
    />
  );
}

function Payments() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PixSettings | null>(null);
  const [notice, setNotice] = useState("");
  const [pendingDecision, setPendingDecision] = useState<{
    order: OrderSummary;
    status: "approved" | "rejected";
  } | null>(null);
  const settings = useQuery({
    queryKey: ["admin-pix-settings"],
    queryFn: getPixSettings,
  });
  const orders = useQuery({
    queryKey: ["admin-orders", false],
    queryFn: () => getOrders(false),
  });

  useEffect(() => {
    if (settings.data) setForm(settings.data);
  }, [settings.data]);

  const save = useMutation({
    mutationFn: updatePixSettings,
    onSuccess(data) {
      setForm(data);
      setNotice(
        data.enabled ? "Pix ativado e salvo." : "Pix desativado e salvo.",
      );
      void queryClient.invalidateQueries({ queryKey: ["admin-pix-settings"] });
    },
  });
  const review = useMutation({
    mutationFn: ({
      reference,
      status,
    }: {
      reference: string;
      status: "approved" | "rejected";
    }) => setPixPaymentStatus(reference, status),
    onSuccess(order) {
      setNotice(
        order.paymentStatus === "approved"
          ? `Pagamento ${order.publicReference} confirmado.`
          : `Pagamento ${order.publicReference} rejeitado.`,
      );
      setPendingDecision(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
  });
  const pixOrders = (orders.data?.items ?? []).filter(
    (order) => order.paymentMethod === "pix_manual",
  );
  const pendingPixOrders = pixOrders.filter(
    (order) => order.paymentStatus === "pending",
  ).length;

  return (
    <section className="admin-page">
      <PageTitle
        eyebrow="Financeiro"
        title="Pagamentos"
        body="Configure o Pix da loja e confirme manualmente somente depois de conferir o comprovante e o recebimento na conta."
        action={
          <Button
            loading={orders.isFetching}
            type="button"
            variant="secondary"
            onClick={() => orders.refetch()}
          >
            <RefreshCw size={16} /> Atualizar pedidos
          </Button>
        }
      />
      {notice ? (
        <p className="notice-text" role="status">
          <CheckCircle2 size={16} /> {notice}
        </p>
      ) : null}
      {settings.isLoading ? <Skeleton className="table-skeleton" /> : null}
      {settings.isError ? (
        <EmptyState
          title="Falha ao carregar o Pix"
          body="Confirme a conexao com a API e tente novamente."
          action={
            <Button onClick={() => settings.refetch()}>Tentar novamente</Button>
          }
        />
      ) : null}
      {form ? (
        <form
          className="panel pix-settings"
          onSubmit={(event) => {
            event.preventDefault();
            setNotice("");
            save.mutate(form);
          }}
        >
          <div className="pix-settings__heading">
            <div>
              <p className="panel-eyebrow">Pix copia e cola</p>
              <h2>Dados do recebedor</h2>
              <p>
                O QR Code e gerado pela propria loja. A confirmacao do pagamento
                continua manual nesta primeira versao.
              </p>
            </div>
            <button
              aria-pressed={form.enabled}
              className="pix-settings__toggle"
              data-enabled={form.enabled}
              type="button"
              onClick={() => setForm({ ...form, enabled: !form.enabled })}
            >
              <Power aria-hidden="true" size={18} />
              <span>{form.enabled ? "Pix ativado" : "Pix desativado"}</span>
            </button>
          </div>
          <div className="pix-settings__grid">
            <TextField
              label="Chave Pix"
              maxLength={77}
              required={form.enabled}
              value={form.key}
              onChange={(event) =>
                setForm({ ...form, key: event.target.value })
              }
            />
            <TextField
              label="Nome do recebedor"
              maxLength={100}
              required={form.enabled}
              value={form.receiverName}
              onChange={(event) =>
                setForm({ ...form, receiverName: event.target.value })
              }
            />
            <TextField
              label="Cidade do recebedor"
              maxLength={100}
              required={form.enabled}
              value={form.receiverCity}
              onChange={(event) =>
                setForm({ ...form, receiverCity: event.target.value })
              }
            />
          </div>
          <p className="pix-settings__note">
            Aceita chave por CPF/CNPJ, telefone, e-mail ou chave aleatoria. Os
            dados sao normalizados para o padrao BR Code ao gerar o pedido.
          </p>
          {save.isError ? (
            <p className="error-text" role="alert">
              {save.error.message}
            </p>
          ) : null}
          <div className="pix-settings__actions">
            <Button loading={save.isPending} type="submit">
              <Save size={16} /> Salvar configuracao Pix
            </Button>
          </div>
        </form>
      ) : null}

      <section className="panel pix-orders" aria-labelledby="pix-orders-title">
        <div className="pix-orders__heading">
          <div>
            <p className="panel-eyebrow">Revisao manual</p>
            <h2 id="pix-orders-title">Pedidos pagos via Pix</h2>
            <p>
              {pendingPixOrders
                ? `${pendingPixOrders} aguardando conferencia.`
                : "Nenhum pagamento Pix aguardando conferencia."}
            </p>
          </div>
          <QrCode aria-hidden="true" size={24} />
        </div>
        {orders.isError ? (
          <p className="error-text" role="alert">
            Nao foi possivel carregar os pedidos.
          </p>
        ) : null}
        {orders.isLoading ? <Skeleton className="table-skeleton" /> : null}
        {pendingDecision ? (
          <div className="pix-review-confirmation" role="alert">
            <div>
              <strong>
                {pendingDecision.status === "approved"
                  ? "Confirmar recebimento?"
                  : "Rejeitar este pagamento?"}
              </strong>
              <span>
                {pendingDecision.order.publicReference} -{" "}
                {formatMoney(pendingDecision.order.totalInCents)}
              </span>
            </div>
            <div>
              <Button
                disabled={review.isPending}
                type="button"
                variant="secondary"
                onClick={() => setPendingDecision(null)}
              >
                Cancelar
              </Button>
              <Button
                loading={review.isPending}
                type="button"
                variant={
                  pendingDecision.status === "approved" ? "primary" : "danger"
                }
                onClick={() =>
                  review.mutate({
                    reference: pendingDecision.order.publicReference,
                    status: pendingDecision.status,
                  })
                }
              >
                {pendingDecision.status === "approved"
                  ? "Confirmar Pix"
                  : "Rejeitar Pix"}
              </Button>
            </div>
          </div>
        ) : null}
        {review.isError ? (
          <p className="error-text" role="alert">
            {review.error.message}
          </p>
        ) : null}
        {!orders.isLoading && !pixOrders.length ? (
          <EmptyState
            title="Nenhum pedido Pix"
            body="Os pedidos aparecerao aqui assim que o cliente gerar um pagamento Pix."
          />
        ) : null}
        {pixOrders.length ? (
          <DataTable
            columns={[
              "Pedido",
              "Cliente",
              "Criado em",
              "Valor",
              "Status",
              "Acoes",
            ]}
            rows={pixOrders.map((order) => [
              order.publicReference,
              order.customerEmail
                ? maskEmail(order.customerEmail)
                : (order.customerName ?? "Cliente"),
              formatDate(order.createdAt),
              formatMoney(order.totalInCents),
              order.paymentStatus === "approved"
                ? "Confirmado"
                : order.paymentStatus === "rejected"
                  ? "Rejeitado"
                  : "Aguardando confirmacao",
              order.paymentStatus === "pending" ? (
                <div
                  className="pix-orders__actions"
                  key={order.publicReference}
                >
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      setPendingDecision({ order, status: "rejected" })
                    }
                  >
                    Rejeitar
                  </Button>
                  <Button
                    type="button"
                    onClick={() =>
                      setPendingDecision({ order, status: "approved" })
                    }
                  >
                    <CheckCircle2 size={16} /> Confirmar
                  </Button>
                </div>
              ) : (
                "Revisado"
              ),
            ])}
          />
        ) : null}
      </section>
    </section>
  );
}

function Whatsapp() {
  const queryClient = useQueryClient();
  const storefront = useQuery({
    queryKey: ["admin-storefront"],
    queryFn: getStorefront,
  });
  const [notice, setNotice] = useState("");
  const save = useMutation({
    mutationFn: updateStorefront,
    onSuccess() {
      setNotice("Mensagens de atendimento salvas.");
      void queryClient.invalidateQueries({ queryKey: ["admin-storefront"] });
    },
  });

  return (
    <section className="admin-page">
      <PageTitle
        eyebrow="Atendimento"
        title="Mensagens do WhatsApp"
        body="Edite somente a orientacao complementar. Produtos, quantidades, valores e referencias sao adicionados automaticamente pelo sistema."
      />
      {notice ? (
        <p className="notice-text">
          <CheckCircle2 size={16} /> {notice}
        </p>
      ) : null}
      {storefront.isLoading ? <Skeleton className="table-skeleton" /> : null}
      {storefront.isError ? (
        <EmptyState
          title="Falha ao carregar mensagens"
          body="Confirme a conexao com a API e tente novamente."
          action={
            <Button onClick={() => storefront.refetch()}>
              Tentar novamente
            </Button>
          }
        />
      ) : null}
      {storefront.data ? (
        <WhatsappMessageEditor
          key={`${storefront.data.whatsappNumber}-${storefront.data.whatsappPurchaseMessage}-${storefront.data.postPaymentWhatsappMessage}`}
          settings={storefront.data}
          saving={save.isPending}
          error={save.error?.message}
          onSave={(settings) => {
            setNotice("");
            save.mutate(settings);
          }}
        />
      ) : null}
    </section>
  );
}

function WhatsappMessageEditor({
  settings,
  saving,
  error,
  onSave,
}: {
  settings: StorefrontSettings;
  saving: boolean;
  error?: string;
  onSave: (settings: StorefrontSettings) => void;
}) {
  const [form, setForm] = useState(settings);
  return (
    <form
      className="message-management"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(form);
      }}
    >
      <div className="message-management__editor">
        <section className="panel message-editor-section">
          <div>
            <p className="panel-eyebrow">Canal</p>
            <h2>Numero da loja</h2>
            <p>Use apenas codigo do pais, DDD e numero.</p>
          </div>
          <TextField
            label="WhatsApp"
            inputMode="numeric"
            pattern="[0-9]{10,15}"
            placeholder="5511999999999"
            value={form.whatsappNumber}
            onChange={(event) =>
              setForm({
                ...form,
                whatsappNumber: event.target.value
                  .replace(/\D/g, "")
                  .slice(0, 15),
              })
            }
          />
        </section>
        <section className="panel message-editor-section">
          <div>
            <p className="panel-eyebrow">Compra assistida</p>
            <h2>Comprar pelo WhatsApp</h2>
            <p>Complemento exibido depois do resumo automatico do carrinho.</p>
          </div>
          <TextAreaField
            label="Mensagem complementar"
            rows={5}
            maxLength={600}
            required
            value={form.whatsappPurchaseMessage}
            onChange={(event) =>
              setForm({ ...form, whatsappPurchaseMessage: event.target.value })
            }
          />
          <small>{form.whatsappPurchaseMessage.length}/600 caracteres</small>
        </section>
        <section className="panel message-editor-section">
          <div>
            <p className="panel-eyebrow">Pagamento confirmado</p>
            <h2>Continuar depois do Mercado Pago</h2>
            <p>
              Complemento liberado somente quando a API registrar o pagamento
              aprovado.
            </p>
          </div>
          <TextAreaField
            label="Mensagem complementar"
            rows={5}
            maxLength={600}
            required
            value={form.postPaymentWhatsappMessage}
            onChange={(event) =>
              setForm({
                ...form,
                postPaymentWhatsappMessage: event.target.value,
              })
            }
          />
          <small>{form.postPaymentWhatsappMessage.length}/600 caracteres</small>
        </section>
        {error ? <p className="error-text">{error}</p> : null}
        <Button type="submit" loading={saving}>
          <Save size={16} /> Salvar mensagens
        </Button>
      </div>
      <aside className="message-preview" aria-label="Previa das mensagens">
        <div className="message-preview__heading">
          <Eye size={18} />
          <div>
            <p className="panel-eyebrow">Previa protegida</p>
            <h2>Estrutura automatica</h2>
          </div>
        </div>
        <MessagePreview
          title="Compra pelo WhatsApp"
          reference="WSP-EXEMPLO"
          complement={form.whatsappPurchaseMessage}
          paid={false}
        />
        <MessagePreview
          title="Apos pagamento"
          reference="ORD-EXEMPLO"
          complement={form.postPaymentWhatsappMessage}
          paid
        />
        <p className="message-preview__note">
          Os blocos em cinza sao gerados no servidor e nao podem ser editados.
        </p>
      </aside>
    </form>
  );
}

function MessagePreview({
  title,
  reference,
  complement,
  paid,
}: {
  title: string;
  reference: string;
  complement: string;
  paid: boolean;
}) {
  return (
    <section className="message-preview__card">
      <strong>{title}</strong>
      <div aria-label="Conteudo automatico e protegido">
        <span>Referencia: {reference}</span>
        <span>Produto demonstrativo x1</span>
        <span>{paid ? "Total pago" : "Subtotal"}: R$ 120,00</span>
        <span>Frete: a combinar pelo WhatsApp</span>
      </div>
      <p>{complement}</p>
    </section>
  );
}

function Appearance() {
  const queryClient = useQueryClient();
  const storefront = useQuery({
    queryKey: ["admin-storefront"],
    queryFn: getStorefront,
  });
  const runtime = useQuery({
    queryKey: ["admin-runtime"],
    queryFn: getAdminRuntime,
    retry: false,
  });
  const [notice, setNotice] = useState("");
  const save = useMutation({
    mutationFn: updateStorefront,
    onSuccess(settings) {
      setNotice("Configuracoes da vitrine salvas.");
      queryClient.setQueryData(["admin-storefront"], settings);
      void queryClient.invalidateQueries({ queryKey: ["admin-storefront"] });
    },
  });

  return (
    <section className="admin-page">
      <PageTitle
        eyebrow="Vitrine"
        title="Aparencia"
        body="Controle a identidade, capa, chamadas, cards e rodape da pagina publica a partir do painel."
      />
      {notice ? (
        <p className="notice-text">
          <CheckCircle2 size={16} />
          {notice}
        </p>
      ) : null}
      {storefront.isLoading ? <Skeleton className="table-skeleton" /> : null}
      {storefront.isError ? (
        <EmptyState
          title="Falha ao carregar vitrine"
          body="Confirme se a API esta ativa e se o MySQL esta acessivel. A API cria as tabelas automaticamente na primeira consulta."
          action={
            <Button onClick={() => storefront.refetch()}>
              Tentar novamente
            </Button>
          }
        />
      ) : null}
      {storefront.data ? (
        <StorefrontEditor
          key={`${storefront.data.brandName}-${storefront.data.heroImageUrl}`}
          initial={storefront.data}
          publicWebUrl={runtime.data?.publicWebUrl}
          saving={save.isPending}
          error={save.error?.message}
          onSubmit={(payload) => {
            setNotice("");
            save.mutate(payload);
          }}
        />
      ) : null}
    </section>
  );
}

function Reports() {
  const overview = useQuery({
    queryKey: ["admin-overview"],
    queryFn: getOverview,
  });
  const orders = useQuery({
    queryKey: ["admin-orders", false],
    queryFn: () => getOrders(false),
  });
  const products = useQuery({
    queryKey: ["admin-products"],
    queryFn: getProducts,
  });
  const orderItems = orders.data?.items ?? [];
  const productItems = products.data?.items ?? [];
  const activeProductItems = productItems.filter(
    (product) => product.status === "active",
  );
  const inactiveProductCount = productItems.length - activeProductItems.length;
  const monthlyRevenue = overview.data?.monthlyRevenue ?? [];
  const hasErrors = overview.isError || orders.isError || products.isError;

  return (
    <section className="admin-page">
      <PageTitle
        eyebrow="Loja"
        title="Relatorios"
        body="Baixe arquivos operacionais para conciliar vendas, estoque e indicadores sem esperar modulo externo."
        action={
          <div className="page-title__actions">
            <Button
              loading={
                overview.isFetching || orders.isFetching || products.isFetching
              }
              type="button"
              variant="secondary"
              onClick={() => {
                void overview.refetch();
                void orders.refetch();
                void products.refetch();
              }}
            >
              <RefreshCw size={16} />
              Atualizar
            </Button>
            <Link
              className="ds-button ds-button--secondary admin-link-button"
              to="/pedidos"
            >
              <span>
                <Archive size={16} />
                Organizar historico
              </span>
            </Link>
            <Button
              disabled={orders.isLoading || orderItems.length === 0}
              type="button"
              variant="secondary"
              onClick={() => exportOrdersCsv(orderItems, "relatorio")}
            >
              <Download size={16} />
              Vendas CSV
            </Button>
            <Button
              disabled={products.isLoading || activeProductItems.length === 0}
              type="button"
              variant="secondary"
              onClick={() => exportProductsCsv(activeProductItems, "relatorio")}
            >
              <Download size={16} />
              Produtos ativos CSV
            </Button>
          </div>
        }
      />
      {hasErrors ? (
        <p className="error-text" role="alert">
          Alguns dados nao carregaram. As exportacoes ficam disponiveis conforme
          cada fonte responder.
        </p>
      ) : null}
      {overview.data ? (
        <div className="metric-grid">
          <Metric
            label="Receita confirmada"
            value={formatMoney(overview.data.metrics.confirmedRevenueInCents)}
            hint="Pagamentos aprovados"
          />
          <Metric
            label="Pedidos pendentes"
            value={String(overview.data.metrics.pendingOrders)}
            hint="Aguardando pagamento"
            tone="warning"
          />
          <Metric
            label="Estoque baixo"
            value={String(overview.data.metrics.lowStockCount)}
            hint="Produtos que pedem reposicao"
            tone="warning"
          />
          <Metric
            label="Produtos ativos"
            value={String(overview.data.metrics.activeProducts)}
            hint={`${overview.data.metrics.activeStockUnits ?? 0} unidades disponíveis`}
          />
          <Metric
            label="Valor do estoque ativo"
            value={formatMoney(overview.data.metrics.inventoryValueInCents)}
            hint="Preço atual × quantidade disponível"
          />
        </div>
      ) : overview.isLoading ? (
        <div className="metric-grid">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="metric-card" />
          ))}
        </div>
      ) : null}
      {overview.data ? (
        <section className="panel monthly-revenue">
          <div className="monthly-revenue__header">
            <div>
              <p className="panel-eyebrow">Faturamento por competencia</p>
              <h2>Receita confirmada por mes</h2>
              <p>
                Compras online entram apos a confirmacao do Mercado Pago ou a
                revisao manual do Pix. WhatsApp entra apos a confirmacao manual
                da venda.
              </p>
            </div>
            <Button
              disabled={monthlyRevenue.length === 0}
              type="button"
              variant="secondary"
              onClick={() => exportMonthlyRevenueCsv(overview.data!)}
            >
              <Download size={16} />
              Receita mensal CSV
            </Button>
          </div>
          <DataTable
            columns={["Mes", "Online", "WhatsApp", "Total confirmado"]}
            rows={monthlyRevenue.map((row) => [
              formatMonthKey(row.month),
              formatMoney(row.onlineInCents),
              formatMoney(row.whatsappInCents),
              <strong key={row.month}>{formatMoney(row.totalInCents)}</strong>,
            ])}
          />
        </section>
      ) : null}
      <section className="panel report-export-panel">
        <div className="report-export-panel__header">
          <div>
            <p className="panel-eyebrow">Exportacoes</p>
            <h2>Arquivos para conferencia</h2>
            <p>
              Os CSVs operacionais usam os dados atuais. Produtos inativos
              permanecem somente no historico e nao entram no estoque ativo.
            </p>
          </div>
          <Button
            disabled={!overview.data}
            type="button"
            variant="secondary"
            onClick={() => overview.data && exportOverviewCsv(overview.data)}
          >
            <Download size={16} />
            Resumo CSV
          </Button>
        </div>
        <div className="report-export-actions">
          <div>
            <strong>{orderItems.length}</strong>
            <span>{orderItems.length === 1 ? "pedido" : "pedidos"}</span>
          </div>
          <div>
            <strong>{activeProductItems.length}</strong>
            <span>
              {activeProductItems.length === 1
                ? "produto ativo"
                : "produtos ativos"}
            </span>
            {inactiveProductCount > 0 ? (
              <small>
                {inactiveProductCount} preservado
                {inactiveProductCount === 1 ? "" : "s"} somente no historico
              </small>
            ) : null}
          </div>
        </div>
      </section>
      <section className="report-order-history">
        <div>
          <p className="panel-eyebrow">Historico operacional</p>
          <h2>Pedidos por mes e dia</h2>
        </div>
        <OrderHistory loading={orders.isLoading} orders={orderItems} />
      </section>
    </section>
  );
}

function Audit() {
  return (
    <Placeholder
      title="Auditoria"
      body="Alteracoes administrativas registram ator, acao, entidade, requestId e justificativa."
    />
  );
}

function SettingsPage() {
  return (
    <Placeholder
      title="Configuracoes"
      body="Variaveis secretas permanecem no back end e nunca aparecem neste painel."
    />
  );
}

function PageTitle({
  eyebrow,
  title,
  body,
  action,
}: {
  eyebrow: string;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <p>{eyebrow}</p>
        <h1>{title}</h1>
        {body ? <span>{body}</span> : null}
      </div>
      {action}
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "neutral" | "warning";
}) {
  const valueDensity =
    value.length > 16 ? "dense" : value.length > 11 ? "compact" : "default";

  return (
    <article className="metric-card">
      <div>
        <span>{label}</span>
        {tone === "warning" ? <Badge tone="warning">Atencao</Badge> : null}
      </div>
      <strong
        className={`metric-card__value metric-card__value--${valueDensity}`}
      >
        {value}
      </strong>
      <p>{hint}</p>
    </article>
  );
}

function DataTable({
  columns,
  rows,
  loading = false,
}: {
  columns: string[];
  rows: ReactNode[][];
  loading?: boolean;
}) {
  if (loading) {
    return <Skeleton className="table-skeleton" />;
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title="Sem registros"
        body="Nenhum item corresponde aos filtros atuais."
      />
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, index) => (
                <td data-label={columns[index]} key={index}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Placeholder({ title, body }: { title: string; body: string }) {
  return (
    <section className="admin-page">
      <PageTitle
        eyebrow="Modulo"
        title={title}
        body="Area em preparacao. A estrutura visual ja indica o formato do modulo, mas as acoes ainda nao estao liberadas."
        action={<Badge tone="warning">Em preparacao</Badge>}
      />
      <div className="panel placeholder-module">
        <div className="placeholder-module__heading">
          <div>
            <p className="panel-eyebrow">Proxima etapa</p>
            <h2>{title}</h2>
          </div>
          <Badge tone="warning">Nao operacional</Badge>
        </div>
        <p className="muted">{body}</p>
        <p className="placeholder-module__note">
          Os controles abaixo estao desativados para nao sugerir filtros ou
          acoes que ainda nao alteram dados reais.
        </p>
        <div className="filters-row placeholder-module__filters">
          <TextField
            disabled
            label="Pesquisar"
            placeholder="Disponivel quando o modulo for liberado"
          />
          <SelectField disabled label="Periodo" defaultValue="30">
            <option value="7">7 dias</option>
            <option value="30">30 dias</option>
            <option value="90">90 dias</option>
          </SelectField>
          <Button disabled variant="secondary">
            Aplicar
          </Button>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <AdminAuthGate>
      {({ session, logout, logoutError, logoutPending }) => (
        <Shell
          adminEmail={session.admin.email}
          logout={logout}
          logoutError={logoutError}
          logoutPending={logoutPending}
        />
      )}
    </AdminAuthGate>
  );
}
