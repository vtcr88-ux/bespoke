import type {
  CSSProperties,
  KeyboardEvent,
  ReactNode,
  SyntheticEvent,
  TextareaHTMLAttributes,
} from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
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
  PanelBottom,
  Plus,
  Power,
  RotateCcw,
  Save,
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
  defaultFooterLinks,
  defaultHomeMotionByBlock,
  defaultHomeSections,
  defaultManifestoItems,
  defaultStorefrontTextStyles,
  formatFooterCopyright,
  isSystemFooterLink,
  orderFooterLinks,
  type AdminProductInput,
  type AdminOrderUpdate,
  type AdminProductRow,
  type Category,
  type OrderSummary,
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
  createCategory,
  createProduct,
  deleteProduct,
  getAdminRuntime,
  getCategories,
  getOrders,
  getOverview,
  getProducts,
  getStorefront,
  updateProduct,
  updateOrder,
  updateStorefront,
} from "../lib/api";
import { formatMoney, maskEmail } from "../lib/format";
import { ImageUploadField } from "../components/ImageUploadField";
import { HexColorField } from "../components/HexColorField";
import { AdminAuthGate } from "../components/AdminAuthGate";
import adminLogo from "../assets/bespoke-admin-logo.png";

type StorefrontPaletteKey =
  | "primaryColor"
  | "accentColor"
  | "footerColor"
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
  { key: "footerColor", label: "Cor do rodape" },
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
      "Pagamento",
      "Frete",
      "Atendimento",
      "Canal",
      "Subtotal",
      "Desconto",
      "Total",
      "Atualizado em",
    ],
    orders.map((order) => [
      order.publicReference,
      order.customerName ?? "",
      order.customerEmail ?? "",
      order.customerPhone ?? "",
      order.status,
      order.paymentStatus ?? "nao aplicavel",
      order.shippingStatus ?? "nao iniciado",
      order.contactStatus ?? "nao iniciado",
      order.salesChannel,
      formatMoney(order.subtotalInCents),
      formatMoney(order.discountInCents),
      formatMoney(order.totalInCents),
      formatDate(order.updatedAt),
    ]),
  );
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
      [
        "Valor em estoque",
        formatMoney(overview.metrics.inventoryValueInCents),
        "",
      ],
    ],
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
  const location = useLocation();
  const storefront = useQuery({
    queryKey: ["admin-storefront"],
    queryFn: getStorefront,
    retry: false,
  });
  const brandName = storefront.data?.brandName?.trim();
  const operationTitle = brandName ? `Operacao ${brandName}` : "Operacao da loja";

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
                <TextField
                  disabled
                  label="Buscar"
                  placeholder="Busca global em preparacao"
                />
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
          <Link
            className="ds-button ds-button--primary admin-link-button"
            to="/produtos"
          >
            <span>
              <Plus size={16} />
              Novo produto
            </span>
          </Link>
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
          Array.from({ length: 4 }, (_, index) => (
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
              hint={formatMoney(overview.data.metrics.inventoryValueInCents)}
            />
          </>
        )}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <h2>Receita por canal</h2>
          <div className="bar-chart" aria-label="Receita por canal">
            <span style={{ height: "28%" }}>
              <b>Online</b>
            </span>
            <span style={{ height: "12%" }}>
              <b>WhatsApp</b>
            </span>
            <span style={{ height: "4%" }}>
              <b>Reembolso</b>
            </span>
          </div>
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
            ].some((value) =>
              value.toLocaleLowerCase("pt-BR").includes(search),
            )
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
  const orders = useQuery({ queryKey: ["admin-orders"], queryFn: getOrders });
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
    },
  });

  return (
    <section className="admin-page">
      <PageTitle
        eyebrow="Operacao"
        title="Pedidos"
        action={
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
        }
      />
      {orders.isError ? (
        <p className="error-text" role="alert">
          Nao foi possivel carregar os pedidos. Tente novamente.
        </p>
      ) : null}
      <DataTable
        columns={[
          "Referencia",
          "Cliente",
          "Status",
          "Canal",
          "Total",
          "Frete",
          "Atualizado",
          "Acoes",
        ]}
        loading={orders.isLoading}
        rows={orderItems.map((order) => [
          order.publicReference,
          order.customerEmail
            ? maskEmail(order.customerEmail)
            : "Compra assistida",
          order.status,
          order.salesChannel,
          formatMoney(order.totalInCents),
          order.shippingAmountInCents == null
            ? "A combinar"
            : formatMoney(order.shippingAmountInCents),
          formatDate(order.updatedAt),
          order.salesChannel === "online" ? (
            <IconButton
              label={`Gerenciar entrega de ${order.publicReference}`}
              onClick={() => setSelected(order)}
            >
              <Edit3 size={16} />
            </IconButton>
          ) : (
            "Atendimento direto"
          ),
        ])}
      />
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
          <p>Pagamento: {order.paymentStatus ?? "nao aplicavel"}</p>
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
  editorialCatalogLabel: "Explorar catalogo",
  editorialSupportLabel: "Atendimento exclusivo",
  editorialOrdersLabel: "Acompanhar pedidos",
  editorialAccountLabel: "Minha conta",
  editorialNavigationMobileEnabled: false,
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
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
}) {
  const errorId = error ? `${props.id ?? props.name}-error` : undefined;
  return (
    <label className={`ds-field ${className ?? ""}`}>
      <span>{label}</span>
      <textarea
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        {...props}
      />
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
              <img src={form.imageUrl} alt="" />
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
              {form.description ||
                "Descricao breve do produto para revisar o card antes de salvar."}
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
                indeterminate={
                  selectedVisibleCount > 0 && !allVisibleSelected
                }
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
                  <img src={product.imageUrl} alt="" />
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
          value={value.fontFamily}
          onChange={(event) =>
            onChange({
              ...value,
              fontFamily: event.target
                .value as StorefrontTextStyle["fontFamily"],
            })
          }
        >
          <option value="inherit">Padrao deste bloco</option>
          <option value="display">Editorial da marca</option>
          <option value="body">Leitura da marca</option>
          <option value="modern">Sans moderna</option>
          <option value="classic">Serif classica</option>
        </SelectField>
      </div>
    </fieldset>
  );
}

type AppearanceTab =
  "brand" | "content" | "composition" | "motion" | "footer" | "seo";
type PreviewDevice = "desktop" | "tablet" | "mobile";
type PreviewLocation = "top" | "footer";

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
  const canInspectPixels =
    src.startsWith("data:") ||
    src.startsWith("blob:") ||
    src.includes("/uploads/");

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
  }, [canInspectPixels, src]);

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
        src={src}
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

function resolveStorefrontPreviewUrl(publicWebUrl?: string) {
  const configured =
    publicWebUrl?.trim() || import.meta.env.VITE_STOREFRONT_PREVIEW_URL?.trim();
  const previewUrl = configured
    ? new URL(configured, window.location.origin)
    : new URL(window.location.origin);

  if (!configured && previewUrl.port === "5174") previewUrl.port = "5173";
  previewUrl.searchParams.set("storefront-preview", "admin");
  return previewUrl.toString();
}

function StorefrontLivePreview({
  device,
  form,
  publicWebUrl,
  replayKey,
  onDeviceChange,
  onReplay,
}: {
  device: PreviewDevice;
  form: StorefrontSettings;
  publicWebUrl?: string;
  replayKey: number;
  onDeviceChange: (device: PreviewDevice) => void;
  onReplay: () => void;
}) {
  const frameHostRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewUrl = useMemo(
    () => resolveStorefrontPreviewUrl(publicWebUrl),
    [publicWebUrl],
  );
  const [scale, setScale] = useState(0.25);
  const [status, setStatus] = useState<
    "connecting" | "syncing" | "synced" | "invalid"
  >("connecting");
  const [previewLocation, setPreviewLocation] =
    useState<PreviewLocation>("top");
  const configuration = previewDevices[device];
  const previewOrigin = new URL(previewUrl).origin;

  const navigatePreview = (location: PreviewLocation) => {
    setPreviewLocation(location);
    iframeRef.current?.contentWindow?.postMessage(
      { type: storefrontPreviewLocationType, location },
      previewOrigin,
    );
  };

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
    previewLocation === "footer"
      ? Math.min(configuration.height, device === "desktop" ? 360 : 440)
      : configuration.height;
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
            <strong>Home em tempo real</strong>
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
            <iframe
              key={replayKey}
              ref={iframeRef}
              data-preview-device={device}
              height={configuration.height}
              loading="eager"
              referrerPolicy="same-origin"
              sandbox="allow-same-origin allow-scripts"
              src={previewUrl}
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

const homeSectionLabels: Record<
  StorefrontSettings["homeSections"][number]["id"],
  string
> = {
  manifesto: "Manifesto editorial",
  navigation: "Atalhos da loja",
  featured: "Produtos em destaque",
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
  featuredHeading: {
    title: "Cabecalho dos destaques",
    description: "Etiqueta, titulo e link da selecao de produtos.",
  },
  productCards: {
    title: "Cards de produtos",
    description: "Entrada coordenada dos itens em destaque.",
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

function textFontCssValue(font: StorefrontTextStyle["fontFamily"]) {
  const fonts = {
    inherit: "inherit",
    display: "var(--font-display)",
    body: "var(--font-body)",
    modern: 'Aptos, "Segoe UI", Arial, sans-serif',
    classic: 'Georgia, "Times New Roman", serif',
  } as const;
  return fonts[font];
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
  const [form, setForm] = useState<StorefrontSettings>({
    ...storefrontEditorDefaults,
    ...initial,
  });
  const [activeUploads, setActiveUploads] = useState<Record<string, boolean>>(
    {},
  );
  const [activeTab, setActiveTab] = useState<AppearanceTab>("brand");
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");
  const [previewKey, setPreviewKey] = useState(0);
  const [heroMissing, setHeroMissing] = useState(false);
  const uploading = Object.values(activeUploads).some(Boolean);

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
            onClick={() =>
              setForm({
                ...storefrontEditorDefaults,
                footerLinks: defaultFooterLinks.map((link) => ({ ...link })),
              })
            }
          >
            <RotateCcw size={16} />
            Restaurar base
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
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="appearance-tabs__index">
                  {index + 1}
                </span>
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
              label="Estilo dos cards"
              value={form.productCardStyle}
              onChange={(event) =>
                setForm({
                  ...form,
                  productCardStyle: event.target
                    .value as StorefrontSettings["productCardStyle"],
                })
              }
            >
              <option value="minimal">Minimalista</option>
              <option value="boutique">Boutique</option>
              <option value="editorial">Editorial</option>
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
            ),
            "--preview-hero-title-color":
              form.homeTextStyles.heroTitle.color || form.primaryColor,
            "--preview-hero-title-font-size": `${form.homeTextStyles.heroTitle.fontSize}px`,
            "--preview-hero-title-space": `${form.homeTextStyles.heroTitle.spacingAfter}px`,
            "--preview-hero-title-font": textFontCssValue(
              form.homeTextStyles.heroTitle.fontFamily,
            ),
            "--preview-manifesto-color":
              form.homeTextStyles.manifesto.color || form.primaryColor,
            "--preview-manifesto-font-size": `${form.homeTextStyles.manifesto.fontSize}px`,
            "--preview-manifesto-space": `${form.homeTextStyles.manifesto.spacingAfter / 3}px`,
            "--preview-manifesto-font": textFontCssValue(
              form.homeTextStyles.manifesto.fontFamily,
            ),
            "--preview-navigation-color":
              form.homeTextStyles.navigation.color || form.primaryColor,
            "--preview-navigation-font-size": `${form.homeTextStyles.navigation.fontSize}px`,
            "--preview-navigation-font": textFontCssValue(
              form.homeTextStyles.navigation.fontFamily,
            ),
            "--preview-featured-eyebrow-color":
              form.homeTextStyles.featuredEyebrow.color || form.accentColor,
            "--preview-featured-eyebrow-font-size": `${form.homeTextStyles.featuredEyebrow.fontSize}px`,
            "--preview-featured-eyebrow-space": `${form.homeTextStyles.featuredEyebrow.spacingAfter / 2}px`,
            "--preview-featured-eyebrow-font": textFontCssValue(
              form.homeTextStyles.featuredEyebrow.fontFamily,
            ),
            "--preview-featured-title-color":
              form.homeTextStyles.featuredTitle.color || form.primaryColor,
            "--preview-featured-title-font-size": `${form.homeTextStyles.featuredTitle.fontSize}px`,
            "--preview-featured-title-font": textFontCssValue(
              form.homeTextStyles.featuredTitle.fontFamily,
            ),
            "--preview-card-title-color":
              form.homeTextStyles.productCardTitle.color || form.primaryColor,
            "--preview-card-title-font-size": `${form.homeTextStyles.productCardTitle.fontSize}px`,
            "--preview-card-title-font": textFontCssValue(
              form.homeTextStyles.productCardTitle.fontFamily,
            ),
            "--preview-footer-slogan-color":
              form.homeTextStyles.footerSlogan.color ||
              accessibleTextColor(form.footerColor, form.primaryColor),
            "--preview-footer-slogan-font-size": `${form.homeTextStyles.footerSlogan.fontSize}px`,
            "--preview-footer-slogan-space": `${form.homeTextStyles.footerSlogan.spacingAfter / 2}px`,
            "--preview-footer-slogan-font": textFontCssValue(
              form.homeTextStyles.footerSlogan.fontFamily,
            ),
          } as CSSProperties
        }
      >
        {activeTab === "composition" ? (
          <StorefrontLivePreview
            device={previewDevice}
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
                <img src={form.heroImageUrl} alt="" />
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
                            <img src={form.heroImageUrl} alt="" />
                          </div>
                          <div>
                            <Badge>Categoria</Badge>
                            <h4>Produto de exemplo</h4>
                            <p className="appearance-preview__card-description">
                              Descricao do produto apresentada no card.
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
                                <img src={link.iconUrl} alt="" />
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
                                <img src={link.iconUrl} alt="" />
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

function Customers() {
  return (
    <Placeholder
      title="Clientes"
      body="Listas devem mascarar PII por padrao e exigir permissao para revelar dados sensiveis."
    />
  );
}

function Payments() {
  return (
    <Placeholder
      title="Pagamentos"
      body="Status financeiro somente por dados oficiais do provedor e webhooks verificados."
    />
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
  const orders = useQuery({ queryKey: ["admin-orders"], queryFn: getOrders });
  const products = useQuery({
    queryKey: ["admin-products"],
    queryFn: getProducts,
  });
  const orderItems = orders.data?.items ?? [];
  const productItems = products.data?.items ?? [];
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
              disabled={orders.isLoading || orderItems.length === 0}
              type="button"
              variant="secondary"
              onClick={() => exportOrdersCsv(orderItems, "relatorio")}
            >
              <Download size={16} />
              Vendas CSV
            </Button>
            <Button
              disabled={products.isLoading || productItems.length === 0}
              type="button"
              variant="secondary"
              onClick={() => exportProductsCsv(productItems, "relatorio")}
            >
              <Download size={16} />
              Produtos CSV
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
            hint={formatMoney(overview.data.metrics.inventoryValueInCents)}
          />
        </div>
      ) : overview.isLoading ? (
        <div className="metric-grid">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="metric-card" />
          ))}
        </div>
      ) : null}
      <section className="panel report-export-panel">
        <div className="report-export-panel__header">
          <div>
            <p className="panel-eyebrow">Exportacoes</p>
            <h2>Arquivos para conferencia</h2>
            <p>
              Os CSVs respeitam os dados carregados agora no painel e podem ser
              abertos em planilhas.
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
            <strong>{productItems.length}</strong>
            <span>{productItems.length === 1 ? "produto" : "produtos"}</span>
          </div>
        </div>
      </section>
      <DataTable
        columns={["Referencia", "Cliente", "Canal", "Total", "Atualizado"]}
        loading={orders.isLoading}
        rows={orderItems.slice(0, 8).map((order) => [
          order.publicReference,
          order.customerEmail
            ? maskEmail(order.customerEmail)
            : order.customerName ?? "Compra assistida",
          order.salesChannel,
          formatMoney(order.totalInCents),
          formatDate(order.updatedAt),
        ])}
      />
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
  return (
    <article className="metric-card">
      <div>
        <span>{label}</span>
        {tone === "warning" ? <Badge tone="warning">Atencao</Badge> : null}
      </div>
      <strong>{value}</strong>
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
