import type { CSSProperties, TextareaHTMLAttributes } from "react";
import { useState } from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BarChart3,
  Boxes,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Edit3,
  Eye,
  Image as ImageIcon,
  LayoutDashboard,
  Link2,
  MessageCircle,
  Maximize2,
  Minimize2,
  PackagePlus,
  Palette,
  Plus,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
  Trash2,
  Users
} from "lucide-react";
import type { AdminProductInput, AdminProductRow, StorefrontSettings } from "@bespoke/contracts";
import { Badge, Button, EmptyState, IconButton, SelectField, Skeleton, TextField } from "@bespoke/design-system";
import {
  createProduct,
  deleteProduct,
  getOrders,
  getOverview,
  getProducts,
  getStorefront,
  updateProduct,
  updateStorefront
} from "../lib/api";
import { formatMoney, maskEmail } from "../lib/format";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/produtos", label: "Produtos", icon: PackagePlus },
  { to: "/estoque", label: "Estoque", icon: Boxes },
  { to: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/pagamentos", label: "Pagamentos", icon: CreditCard },
  { to: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { to: "/aparencia", label: "Vitrine", icon: Palette },
  { to: "/relatorios", label: "Relatorios", icon: BarChart3 },
  { to: "/auditoria", label: "Auditoria", icon: ShieldCheck },
  { to: "/configuracoes", label: "Config", icon: Settings }
];

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`sidebar__mark ${compact ? "sidebar__mark--compact" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 64 64" role="presentation" focusable="false">
        <rect x="8" y="8" width="48" height="48" rx="17" fill="none" stroke="currentColor" strokeWidth="2.4" />
        <path d="M21 17h22" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
        <path d="M22 42V27c0-4 3-7 7-7h6c4 0 7 3 7 7v15" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
        <circle cx="32" cy="31" r="4.8" fill="currentColor" opacity="0.2" />
      </svg>
    </span>
  );
}

function Shell() {
  const [topbarCollapsed, setTopbarCollapsed] = useState(false);

  return (
    <div className="admin-shell">
      <aside className="sidebar" aria-label="Navegacao administrativa">
        <div className="sidebar__brand">
          <BrandMark />
          <div className="sidebar__wordmark">
            <strong>Bespoke</strong>
            <span>Admin</span>
          </div>
        </div>
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.to === "/"}>
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
      <div className="admin-main">
        <header className={`admin-topbar ${topbarCollapsed ? "admin-topbar--collapsed" : ""}`}>
          <div className="admin-topbar__title">
            <p>Portal administrativo</p>
            <strong>Operacao Bespoke</strong>
          </div>
          <div className="topbar-actions">
            {!topbarCollapsed ? (
              <>
                <TextField label="Buscar" placeholder="Pedido, SKU, cliente" />
                <IconButton label="Status da plataforma">
                  <Activity size={18} />
                </IconButton>
              </>
            ) : null}
            <IconButton
              label={topbarCollapsed ? "Expandir portal administrativo" : "Minimizar portal administrativo"}
              className="topbar-toggle"
              onClick={() => setTopbarCollapsed((value) => !value)}
            >
              {topbarCollapsed ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
            </IconButton>
          </div>
        </header>
        <main>
          <Routes>
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
        </main>
      </div>
    </div>
  );
}

function Dashboard() {
  const overview = useQuery({ queryKey: ["admin-overview"], queryFn: getOverview });

  return (
    <section className="admin-page">
      <PageTitle
        eyebrow="Visao geral"
        title="Dashboard"
        action={
          <Link className="ds-button ds-button--primary admin-link-button" to="/produtos">
            <span>
              <Plus size={16} />
              Novo produto
            </span>
          </Link>
        }
      />
      {overview.isError ? <EmptyState title="Falha ao carregar" body="Confirme se a API esta ativa e se a sessao admin e valida." /> : null}
      <div className="metric-grid">
        {overview.isLoading || !overview.data ? (
          Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="metric-card" />)
        ) : (
          <>
            <Metric label="Receita confirmada" value={formatMoney(overview.data.metrics.confirmedRevenueInCents)} hint="Somente pagamentos confirmados" />
            <Metric label="Pedidos pendentes" value={String(overview.data.metrics.pendingOrders)} hint="Aguardando pagamento" />
            <Metric label="Estoque baixo" value={String(overview.data.metrics.lowStockCount)} hint="Precisa revisao" tone="warning" />
            <Metric label="Produtos ativos" value={String(overview.data.metrics.activeProducts)} hint={formatMoney(overview.data.metrics.inventoryValueInCents)} />
          </>
        )}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <h2>Receita por canal</h2>
          <div className="bar-chart" aria-label="Receita por canal">
            <span style={{ height: "28%" }}><b>Online</b></span>
            <span style={{ height: "12%" }}><b>WhatsApp</b></span>
            <span style={{ height: "4%" }}><b>Reembolso</b></span>
          </div>
        </section>
        <section className="panel">
          <h2>Alertas</h2>
          {overview.data?.alerts.length ? (
            overview.data.alerts.map((alert) => <p className="alert" key={alert.message}>{alert.message}</p>)
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
  const products = useQuery({ queryKey: ["admin-products"], queryFn: getProducts });
  const [editing, setEditing] = useState<AdminProductRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState("");
  const [filters, setFilters] = useState({ search: "", status: "active", category: "" });
  const saveProduct = useMutation({
    mutationFn: (payload: AdminProductInput) => (editing ? updateProduct(editing.id, payload) : createProduct(payload)),
    onSuccess() {
      setNotice(editing ? "Produto atualizado e pronto para a vitrine." : "Produto criado e adicionado ao catalogo.");
      setCreating(false);
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    }
  });
  const removeProduct = useMutation({
    mutationFn: deleteProduct,
    onSuccess() {
      setNotice("Produto removido da lista ativa do catalogo.");
      void queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    }
  });
  const showForm = creating || editing != null;
  const allProducts = products.data?.items ?? [];
  const filteredProducts = allProducts.filter((product) => {
    const search = filters.search.trim().toLocaleLowerCase("pt-BR");
    const matchesSearch = search
      ? [product.name, product.sku, product.slug, product.subtitle ?? ""].some((value) => value.toLocaleLowerCase("pt-BR").includes(search))
      : true;
    const matchesStatus = filters.status === "all" ? true : product.status === filters.status;
    const matchesCategory = filters.category ? product.categorySlug === filters.category : true;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <section className="admin-page">
      <PageTitle
        eyebrow="Catalogo"
        title="Produtos"
        body="Cadastre, edite, publique ou remova produtos com imagem, preco e estoque sem depender de codigo."
        action={
          <Button
            onClick={() => {
              setCreating(true);
              setEditing(null);
              setNotice("");
            }}
          >
            <Plus size={16} />
            Novo produto
          </Button>
        }
      />
      {notice ? (
        <p className="notice-text">
          <CheckCircle2 size={16} />
          {notice}
        </p>
      ) : null}
      <div className="filters-row">
        <TextField
          label="Filtro"
          placeholder="SKU, slug ou nome"
          value={filters.search}
          onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
        />
        <SelectField label="Status" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
          <option value="all">Todos</option>
        </SelectField>
        <SelectField label="Categoria" value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}>
          <option value="">Todas</option>
          {categoryOptions.map((category) => (
            <option value={category.value} key={category.value}>{category.label}</option>
          ))}
        </SelectField>
        <div className="filters-row__summary" aria-live="polite">
          <strong>{filteredProducts.length}</strong>
          <span>{filteredProducts.length === 1 ? "produto exibido" : "produtos exibidos"}</span>
        </div>
      </div>
      {showForm ? (
        <ProductEditor
          key={editing?.id ?? "new"}
          initial={editing ? productRowToInput(editing) : emptyProductInput()}
          mode={editing ? "edit" : "create"}
          saving={saveProduct.isPending}
          error={saveProduct.error?.message}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSubmit={(payload) => saveProduct.mutate(payload)}
        />
      ) : null}
      {removeProduct.error ? <p className="error-text">{removeProduct.error.message}</p> : null}
      <ProductsTable
        loading={products.isLoading}
        products={filteredProducts}
        deletingId={removeProduct.variables}
        onEdit={(product) => {
          setCreating(false);
          setEditing(product);
          setNotice("");
        }}
        onDelete={(product) => {
          if (window.confirm(`Apagar ${product.name} do catalogo? Produtos com historico de pedido serao arquivados para preservar auditoria.`)) {
            removeProduct.mutate(product.id);
          }
        }}
      />
    </section>
  );
}

function Inventory() {
  return <Placeholder title="Estoque" body="Movimentacoes atomicas, historico e ajustes com justificativa obrigatoria." />;
}

function Orders() {
  const orders = useQuery({ queryKey: ["admin-orders"], queryFn: getOrders });

  return (
    <section className="admin-page">
      <PageTitle eyebrow="Operacao" title="Pedidos" action={<Button variant="secondary">Exportar</Button>} />
      <DataTable
        columns={["Referencia", "Cliente", "Status", "Canal", "Total", "Atualizado"]}
        loading={orders.isLoading}
        rows={(orders.data?.items ?? []).map((order) => [
          order.publicReference,
          order.customerEmail ? maskEmail(order.customerEmail) : "Compra assistida",
          order.status,
          order.salesChannel,
          formatMoney(order.totalInCents),
          formatDate(order.updatedAt)
        ])}
      />
    </section>
  );
}

const categoryOptions = [
  { value: "rituais", label: "Rituais" },
  { value: "acessorios", label: "Acessorios" },
  { value: "consultoria", label: "Consultoria" }
];

const storefrontEditorDefaults: StorefrontSettings = {
  brandName: "Bespoke",
  logoUrl: "",
  heroImageUrl: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1800&q=82",
  heroEyebrow: "Loja Bespoke",
  heroTitle: "Bespoke",
  heroSubtitle: "Uma experiencia exclusiva, sofisticada e cuidadosamente selecionada para quem valoriza presenca, beleza e atendimento impecavel.",
  heroPrimaryCtaLabel: "Explorar catalogo",
  heroSecondaryCtaLabel: "Atendimento exclusivo",
  heroHeight: "balanced",
  featuredEyebrow: "Selecao inicial",
  featuredTitle: "Produtos em destaque",
  featuredLinkLabel: "Ver todos",
  homeLayout: "editorial",
  productCardStyle: "boutique",
  imageFit: "contain",
  footerSlogan: "Curadoria reservada, cuidado impecavel e escolhas feitas para poucos.",
  footerPrivacyLabel: "Privacidade",
  footerCatalogLabel: "Catalogo",
  footerSupportLabel: "Suporte",
  primaryColor: "#090907",
  accentColor: "#c9a76d",
  backgroundColor: "#ffffff"
};

function emptyProductInput(): AdminProductInput {
  return {
    sku: "",
    name: "",
    subtitle: "",
    description: "Descricao completa do produto com detalhes, acabamento e indicacao de uso.",
    categorySlug: "rituais",
    priceInCents: 0,
    compareAtPriceInCents: null,
    stock: 0,
    lowStockThreshold: 3,
    imageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=82",
    imageAlt: "Produto Bespoke",
    isActive: true
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
    imageUrl: product.imageUrl,
    imageAlt: product.imageAlt,
    isActive: product.status === "active"
  };
}

function currencyInputFromCents(value: number) {
  return (value / 100).toFixed(2).replace(".", ",");
}

function currencyInputToCents(value: string) {
  const clean = value.trim().replace(/[R$\s]/g, "");
  const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100)) : 0;
}

function TextAreaField({ label, error, className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string }) {
  const errorId = error ? `${props.id ?? props.name}-error` : undefined;
  return (
    <label className={`ds-field ${className ?? ""}`}>
      <span>{label}</span>
      <textarea aria-invalid={Boolean(error)} aria-describedby={errorId} {...props} />
      {error ? <small id={errorId}>{error}</small> : null}
    </label>
  );
}

function ProductEditor({
  initial,
  mode,
  saving,
  error,
  onCancel,
  onSubmit
}: {
  initial: AdminProductInput;
  mode: "create" | "edit";
  saving: boolean;
  error?: string;
  onCancel: () => void;
  onSubmit: (payload: AdminProductInput) => void;
}) {
  const [form, setForm] = useState<AdminProductInput>(initial);
  const [price, setPrice] = useState(currencyInputFromCents(initial.priceInCents));
  const [comparePrice, setComparePrice] = useState(initial.compareAtPriceInCents ? currencyInputFromCents(initial.compareAtPriceInCents) : "");
  const categoryLabel = categoryOptions.find((category) => category.value === form.categorySlug)?.label ?? form.categorySlug;
  const payloadPreviewPrice = currencyInputToCents(price);

  return (
    <form
      className="panel editor-form product-editor"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          ...form,
          sku: form.sku.trim(),
          slug: form.slug?.trim() ? form.slug.trim() : undefined,
          name: form.name.trim(),
          subtitle: form.subtitle?.trim() ? form.subtitle.trim() : null,
          description: form.description.trim(),
          imageUrl: form.imageUrl.trim(),
          imageAlt: form.imageAlt.trim(),
          priceInCents: payloadPreviewPrice,
          compareAtPriceInCents: comparePrice.trim() ? currencyInputToCents(comparePrice) : null
        });
      }}
    >
      <div className="editor-form__header">
        <div>
          <p>{mode === "create" ? "Novo item de catalogo" : "Edicao de catalogo"}</p>
          <h2>{mode === "create" ? "Cadastrar produto" : "Editar produto"}</h2>
          <span>Imagem, descricao, preco e estoque saem daqui para a operacao.</span>
        </div>
        <Badge tone={form.isActive ? "success" : "warning"}>{form.isActive ? "Publicado" : "Oculto"}</Badge>
      </div>
      <div className="product-editor__layout">
        <div className="product-editor__fields">
          <section className="editor-section">
            <div className="editor-section__title">
              <Store size={18} />
              <h3>Identidade do produto</h3>
            </div>
            <div className="editor-form__grid">
              <TextField label="SKU" required value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} />
              <TextField label="Slug publico" value={form.slug ?? ""} onChange={(event) => setForm({ ...form, slug: event.target.value || undefined })} />
              <TextField label="Nome" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              <TextField label="Subtitulo" value={form.subtitle ?? ""} onChange={(event) => setForm({ ...form, subtitle: event.target.value })} />
              <SelectField label="Categoria" value={form.categorySlug} onChange={(event) => setForm({ ...form, categorySlug: event.target.value })}>
                {categoryOptions.map((category) => (
                  <option value={category.value} key={category.value}>{category.label}</option>
                ))}
              </SelectField>
              <SelectField
                label="Status"
                value={form.isActive ? "active" : "inactive"}
                onChange={(event) => setForm({ ...form, isActive: event.target.value === "active" })}
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
                onChange={(event) => setForm({ ...form, stock: Number(event.target.value) })}
              />
              <TextField
                label="Aviso de estoque baixo"
                required
                type="number"
                min={0}
                value={form.lowStockThreshold}
                onChange={(event) => setForm({ ...form, lowStockThreshold: Number(event.target.value) })}
              />
            </div>
          </section>
          <section className="editor-section">
            <div className="editor-section__title">
              <ImageIcon size={18} />
              <h3>Imagem e descricao</h3>
            </div>
            <div className="editor-form__grid">
              <TextField label="URL da imagem principal" required value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} />
              <TextField label="Texto alternativo da imagem" required value={form.imageAlt} onChange={(event) => setForm({ ...form, imageAlt: event.target.value })} />
              <TextAreaField
                label="Descricao completa"
                required
                minLength={20}
                rows={5}
                className="editor-form__wide"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </div>
          </section>
        </div>
        <aside className="product-editor__preview" aria-label="Previa do produto">
          <div className="product-editor__preview-media">
            {form.imageUrl ? <img src={form.imageUrl} alt="" /> : <ImageIcon size={32} />}
          </div>
          <div className="product-editor__preview-body">
            <div>
              <Badge>{categoryLabel}</Badge>
              <span>{form.isActive ? "Publicado" : "Oculto"}</span>
            </div>
            <h3>{form.name || "Nome do produto"}</h3>
            <p>{form.subtitle || form.description || "Descricao breve do produto para revisar o card antes de salvar."}</p>
            <strong>{formatMoney(payloadPreviewPrice)}</strong>
          </div>
        </aside>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="form-actions">
        <Button type="submit" loading={saving}>
          <Save size={16} />
          {mode === "create" ? "Cadastrar produto" : "Salvar alteracoes"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  );
}

function ProductsTable({
  products,
  loading,
  deletingId,
  onEdit,
  onDelete
}: {
  products: AdminProductRow[];
  loading: boolean;
  deletingId?: string;
  onEdit: (product: AdminProductRow) => void;
  onDelete: (product: AdminProductRow) => void;
}) {
  if (loading) return <Skeleton className="table-skeleton" />;
  if (products.length === 0) return <EmptyState title="Sem produtos" body="Nenhum produto cadastrado." />;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">Produto</th>
            <th scope="col">Categoria</th>
            <th scope="col">Preco</th>
            <th scope="col">Estoque</th>
            <th scope="col">Status</th>
            <th scope="col">Acoes</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
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
              <td data-label="Estoque">{product.lowStock ? `${product.stock} - baixo` : product.stock}</td>
              <td data-label="Status"><Badge tone={product.status === "active" ? "success" : "neutral"}>{product.status === "active" ? "Ativo" : "Inativo"}</Badge></td>
              <td data-label="Acoes">
                <div className="table-actions">
                  <IconButton label={`Editar ${product.name}`} onClick={() => onEdit(product)}>
                    <Edit3 size={16} />
                  </IconButton>
                  <IconButton label={`Apagar ${product.name}`} onClick={() => onDelete(product)} disabled={deletingId === product.id}>
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

function StorefrontEditor({
  initial,
  saving,
  error,
  onSubmit
}: {
  initial: StorefrontSettings;
  saving: boolean;
  error?: string;
  onSubmit: (payload: StorefrontSettings) => void;
}) {
  const [form, setForm] = useState<StorefrontSettings>({ ...storefrontEditorDefaults, ...initial });

  return (
    <form
      className="appearance-workspace"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(form);
      }}
    >
      <section className="panel storefront-form">
        <div className="editor-form__header">
          <div>
            <p>Controle visual</p>
            <h2>Vitrine publica</h2>
            <span>Marca, capa, chamadas, cards e rodape centralizados para manutencao pelo admin.</span>
          </div>
          <Button type="button" variant="secondary" onClick={() => setForm(storefrontEditorDefaults)}>
            <RotateCcw size={16} />
            Restaurar base
          </Button>
        </div>
        <section className="editor-section">
          <div className="editor-section__title">
            <Store size={18} />
            <h3>Marca e logo</h3>
          </div>
          <div className="editor-form__grid">
            <TextField label="Nome da marca" required value={form.brandName} onChange={(event) => setForm({ ...form, brandName: event.target.value })} />
            <TextField label="URL da logo" value={form.logoUrl} onChange={(event) => setForm({ ...form, logoUrl: event.target.value })} />
            <TextField label="Imagem da capa" required value={form.heroImageUrl} onChange={(event) => setForm({ ...form, heroImageUrl: event.target.value })} />
            <TextField label="Preto da marca" required type="color" value={form.primaryColor} onChange={(event) => setForm({ ...form, primaryColor: event.target.value })} />
            <TextField label="Dourado champagne" required type="color" value={form.accentColor} onChange={(event) => setForm({ ...form, accentColor: event.target.value })} />
            <TextField label="Fundo principal" required type="color" value={form.backgroundColor} onChange={(event) => setForm({ ...form, backgroundColor: event.target.value })} />
          </div>
        </section>
        <section className="editor-section">
          <div className="editor-section__title">
            <ImageIcon size={18} />
            <h3>Capa da home</h3>
          </div>
          <div className="editor-form__grid">
            <TextField label="Etiqueta da capa" required value={form.heroEyebrow} onChange={(event) => setForm({ ...form, heroEyebrow: event.target.value })} />
            <TextField label="Titulo da capa" required value={form.heroTitle} onChange={(event) => setForm({ ...form, heroTitle: event.target.value })} />
            <TextAreaField
              label="Texto da capa"
              required
              rows={4}
              className="editor-form__wide"
              value={form.heroSubtitle}
              onChange={(event) => setForm({ ...form, heroSubtitle: event.target.value })}
            />
            <TextField label="Botao principal" required value={form.heroPrimaryCtaLabel} onChange={(event) => setForm({ ...form, heroPrimaryCtaLabel: event.target.value })} />
            <TextField label="Botao secundario" required value={form.heroSecondaryCtaLabel} onChange={(event) => setForm({ ...form, heroSecondaryCtaLabel: event.target.value })} />
            <SelectField label="Altura da capa" value={form.heroHeight} onChange={(event) => setForm({ ...form, heroHeight: event.target.value as StorefrontSettings["heroHeight"] })}>
              <option value="compact">Compacta</option>
              <option value="balanced">Equilibrada</option>
              <option value="immersive">Imersiva</option>
            </SelectField>
          </div>
        </section>
        <section className="editor-section">
          <div className="editor-section__title">
            <Eye size={18} />
            <h3>Home, catalogo e cards</h3>
          </div>
          <div className="editor-form__grid">
            <TextField label="Etiqueta dos destaques" required value={form.featuredEyebrow} onChange={(event) => setForm({ ...form, featuredEyebrow: event.target.value })} />
            <TextField label="Titulo dos destaques" required value={form.featuredTitle} onChange={(event) => setForm({ ...form, featuredTitle: event.target.value })} />
            <TextField label="Link de catalogo" required value={form.featuredLinkLabel} onChange={(event) => setForm({ ...form, featuredLinkLabel: event.target.value })} />
            <SelectField label="Layout da home" value={form.homeLayout} onChange={(event) => setForm({ ...form, homeLayout: event.target.value as StorefrontSettings["homeLayout"] })}>
              <option value="editorial">Editorial</option>
              <option value="compact">Compacto</option>
              <option value="showcase">Showcase</option>
            </SelectField>
            <SelectField label="Estilo dos cards" value={form.productCardStyle} onChange={(event) => setForm({ ...form, productCardStyle: event.target.value as StorefrontSettings["productCardStyle"] })}>
              <option value="minimal">Minimalista</option>
              <option value="boutique">Boutique</option>
              <option value="editorial">Editorial</option>
            </SelectField>
            <SelectField label="Enquadramento das imagens" value={form.imageFit} onChange={(event) => setForm({ ...form, imageFit: event.target.value as StorefrontSettings["imageFit"] })}>
              <option value="contain">Produto inteiro</option>
              <option value="cover">Preencher area</option>
            </SelectField>
          </div>
        </section>
        <section className="editor-section">
          <div className="editor-section__title">
            <Link2 size={18} />
            <h3>Rodape</h3>
          </div>
          <div className="editor-form__grid">
            <TextAreaField
              label="Slogan do rodape"
              required
              rows={3}
              className="editor-form__wide"
              value={form.footerSlogan}
              onChange={(event) => setForm({ ...form, footerSlogan: event.target.value })}
            />
            <TextField label="Link privacidade" required value={form.footerPrivacyLabel} onChange={(event) => setForm({ ...form, footerPrivacyLabel: event.target.value })} />
            <TextField label="Link catalogo" required value={form.footerCatalogLabel} onChange={(event) => setForm({ ...form, footerCatalogLabel: event.target.value })} />
            <TextField label="Link suporte" required value={form.footerSupportLabel} onChange={(event) => setForm({ ...form, footerSupportLabel: event.target.value })} />
          </div>
        </section>
        {error ? <p className="error-text">{error}</p> : null}
        <div className="form-actions">
          <Button type="submit" loading={saving}>
            <Save size={16} />
            Salvar vitrine
          </Button>
        </div>
      </section>
      <aside className="appearance-preview" style={{ "--preview-primary": form.primaryColor, "--preview-accent": form.accentColor, "--preview-bg": form.backgroundColor } as CSSProperties}>
        <div className="appearance-preview__toolbar">
          <span>
            <Eye size={15} />
            Preview
          </span>
          <Badge>{form.homeLayout}</Badge>
        </div>
        <div className={`appearance-preview__hero appearance-preview__hero--${form.heroHeight}`}>
          <img src={form.heroImageUrl} alt="" />
          <div>
            <p>{form.heroEyebrow}</p>
            <h2>{form.heroTitle}</h2>
            <span>{form.heroSubtitle}</span>
            <div className="appearance-preview__actions">
              <button type="button">{form.heroPrimaryCtaLabel}</button>
              <button type="button">{form.heroSecondaryCtaLabel}</button>
            </div>
          </div>
        </div>
        <div className="appearance-preview__brand-strip">
          {form.logoUrl ? <img src={form.logoUrl} alt="" /> : <Sparkles size={18} />}
          <strong>{form.brandName}</strong>
        </div>
        <div className="appearance-preview__section">
          <p>{form.featuredEyebrow}</p>
          <div>
            <h3>{form.featuredTitle}</h3>
            <span>{form.featuredLinkLabel}</span>
          </div>
          <article className={`appearance-preview__card appearance-preview__card--${form.productCardStyle}`}>
            <div className={`appearance-preview__card-media appearance-preview__card-media--${form.imageFit}`}>
              <img src={form.heroImageUrl} alt="" />
            </div>
            <div>
              <Badge>Boutique</Badge>
              <h4>Produto de exemplo</h4>
              <span>Preview do card salvo no painel.</span>
              <strong>R$ 289,00</strong>
            </div>
          </article>
        </div>
        <div className="appearance-preview__footer">
          <strong>{form.brandName}</strong>
          <p>{form.footerSlogan}</p>
          <nav>
            <span>{form.footerPrivacyLabel}</span>
            <span>{form.footerCatalogLabel}</span>
            <span>{form.footerSupportLabel}</span>
          </nav>
        </div>
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
    minute: "2-digit"
  }).format(new Date(value));
}

function Customers() {
  return <Placeholder title="Clientes" body="Listas devem mascarar PII por padrao e exigir permissao para revelar dados sensiveis." />;
}

function Payments() {
  return <Placeholder title="Pagamentos" body="Status financeiro somente por dados oficiais do provedor e webhooks verificados." />;
}

function Whatsapp() {
  return <Placeholder title="WhatsApp" body="Solicitacoes assistidas nao sao receita ate conversao e pagamento confirmado." />;
}

function Appearance() {
  const queryClient = useQueryClient();
  const storefront = useQuery({ queryKey: ["admin-storefront"], queryFn: getStorefront });
  const [notice, setNotice] = useState("");
  const save = useMutation({
    mutationFn: updateStorefront,
    onSuccess() {
      setNotice("Configuracoes da vitrine salvas.");
      void queryClient.invalidateQueries({ queryKey: ["admin-storefront"] });
    }
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
          action={<Button onClick={() => storefront.refetch()}>Tentar novamente</Button>}
        />
      ) : null}
      {storefront.data ? (
        <StorefrontEditor
          key={`${storefront.data.brandName}-${storefront.data.heroImageUrl}`}
          initial={storefront.data}
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
  return <Placeholder title="Relatorios" body="Metricas de receita usam apenas pagamentos confirmados e canais separados." />;
}

function Audit() {
  return <Placeholder title="Auditoria" body="Alteracoes administrativas registram ator, acao, entidade, requestId e justificativa." />;
}

function SettingsPage() {
  return <Placeholder title="Configuracoes" body="Variaveis secretas permanecem no back end e nunca aparecem neste painel." />;
}

function PageTitle({ eyebrow, title, body, action }: { eyebrow: string; title: string; body?: string; action?: React.ReactNode }) {
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

function Metric({ label, value, hint, tone = "neutral" }: { label: string; value: string; hint: string; tone?: "neutral" | "warning" }) {
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

function DataTable({ columns, rows, loading = false }: { columns: string[]; rows: string[][]; loading?: boolean }) {
  if (loading) {
    return <Skeleton className="table-skeleton" />;
  }

  if (rows.length === 0) {
    return <EmptyState title="Sem registros" body="Nenhum item corresponde aos filtros atuais." />;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("-")}>
              {row.map((cell, index) => <td data-label={columns[index]} key={`${cell}-${index}`}>{cell}</td>)}
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
      <PageTitle eyebrow="Modulo" title={title} />
      <div className="panel">
        <h2>{title}</h2>
        <p className="muted">{body}</p>
        <div className="filters-row">
          <TextField label="Pesquisar" placeholder="Digite para filtrar" />
          <SelectField label="Periodo" defaultValue="30">
            <option value="7">7 dias</option>
            <option value="30">30 dias</option>
            <option value="90">90 dias</option>
          </SelectField>
          <Button variant="secondary">Aplicar</Button>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  return <Shell />;
}
