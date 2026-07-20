import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Route, Routes, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Menu,
  MessageCircle,
  Minus,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Trash2,
  UserRound,
  X
} from "lucide-react";
import type { Product } from "@bespoke/contracts";
import { Badge, Button, EmptyState, IconButton, SelectField, Skeleton, TextField } from "@bespoke/design-system";
import {
  createCheckout,
  createWhatsappRequest,
  getProduct,
  getStorefrontSettings,
  getSupportWhatsappUrl,
  listProducts,
  priceCart
} from "../lib/api";
import { formatMoney } from "../lib/format";
import { useCartStore } from "../stores/cart";

const heroImage =
  "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1800&q=82";

function productToCart(product: Product) {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    sku: product.sku,
    priceInCents: product.priceInCents,
    imageUrl: product.images[0]!.url
  };
}

function BrandMark({ compact = false, logoUrl = "" }: { compact?: boolean; logoUrl?: string }) {
  if (!logoUrl) return null;

  return (
    <span className={`brand__mark ${compact ? "brand__mark--compact" : ""}`} aria-hidden="true">
      <img src={logoUrl} alt="" />
    </span>
  );
}

function Layout() {
  const [open, setOpen] = useState(false);
  const count = useCartStore((state) => state.items.reduce((total, item) => total + item.quantity, 0));
  const { data: storefront } = useQuery({ queryKey: ["storefront-settings"], queryFn: getStorefrontSettings });
  const brandName = storefront?.brandName ?? "Bespoke";
  const shellStyle = storefront
    ? ({
        "--color-brand-primary": storefront.primaryColor,
        "--color-brand-accent": storefront.accentColor,
        "--color-background": storefront.backgroundColor
      } as CSSProperties)
    : undefined;

  return (
    <div className="store-shell" style={shellStyle}>
      <a className="skip-link" href="#main">
        Ir para o conteudo
      </a>
      <header className="site-header">
        <Link className="brand" to="/" aria-label={`${brandName} inicio`}>
          <BrandMark logoUrl={storefront?.logoUrl} />
          <span className="brand__wordmark">
            <strong>{brandName}</strong>
          </span>
        </Link>
        <nav className={open ? "main-nav main-nav--open" : "main-nav"} aria-label="Principal">
          <NavLink to="/catalogo">Catalogo</NavLink>
          <NavLink to="/pedidos">Pedidos</NavLink>
          <NavLink to="/conta">Conta</NavLink>
          <NavLink to="/suporte">Suporte</NavLink>
        </nav>
        <div className="header-actions">
          <Link className="cart-link" to="/carrinho" aria-label={`Carrinho com ${count} itens`}>
            <ShoppingBag size={20} />
            <span>{count}</span>
          </Link>
          <IconButton label={open ? "Fechar menu" : "Abrir menu"} className="menu-button" onClick={() => setOpen((value) => !value)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </IconButton>
        </div>
      </header>
      <main id="main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/catalogo" element={<CatalogPage />} />
          <Route path="/produto/:slug" element={<ProductPage />} />
          <Route path="/carrinho" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/conta" element={<AccountPage />} />
          <Route path="/pedidos" element={<OrdersPage />} />
          <Route path="/suporte" element={<SupportPage />} />
          <Route path="/privacidade" element={<PrivacyPage />} />
          <Route path="/checkout/sandbox" element={<CheckoutReturnPage />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <div className="site-footer__inner">
          <div className="site-footer__brand">
            <div className="brand brand--footer">
              <BrandMark compact logoUrl={storefront?.logoUrl} />
              <span className="brand__wordmark brand__wordmark--footer">
                <strong>{brandName}</strong>
              </span>
            </div>
            <p>Curadoria reservada, cuidado impecavel e escolhas feitas para poucos.</p>
          </div>
          <nav className="site-footer__nav" aria-label="Rodape">
            <Link to="/privacidade">Privacidade</Link>
            <Link to="/catalogo">Catalogo</Link>
            <Link to="/suporte">Suporte</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function HomePage() {
  const { data: storefront } = useQuery({ queryKey: ["storefront-settings"], queryFn: getStorefrontSettings });
  const image = storefront?.heroImageUrl ?? heroImage;

  return (
    <>
      <section className="hero" style={{ "--hero-image": `url(${image})` } as CSSProperties}>
        <div className="hero__content">
          <h1>{storefront?.heroTitle ?? "Bespoke"}</h1>
          <p className="hero__lede">
            {storefront?.heroSubtitle ??
              "Uma experiencia exclusiva, sofisticada e cuidadosamente selecionada para quem valoriza presenca, beleza e atendimento impecavel."}
          </p>
          <div className="hero__actions">
            <Link className="store-button store-button--primary" to="/catalogo">
              Explorar catalogo <ArrowRight size={16} />
            </Link>
            <Link className="store-button store-button--secondary" to="/suporte">
              Atendimento exclusivo
            </Link>
          </div>
         </div>
      </section>
      <CatalogPreview />
    </>
  );
}

function CatalogPreview() {
  const { data, isLoading } = useQuery({ queryKey: ["home-products"], queryFn: () => listProducts(new URLSearchParams("limit=4")) });
  return (
    <section className="section">
      <div className="section-heading">
        <div>
          <p>Selecao inicial</p>
          <h2>Produtos em destaque</h2>
        </div>
        <Link className="store-button store-button--ghost" to="/catalogo">Ver todos</Link>
      </div>
      <div className="product-grid product-grid--preview">
        {isLoading
          ? Array.from({ length: 4 }, (_, index) => <ProductSkeleton key={index} />)
          : data?.items.map((product) => <ProductCard product={product} key={product.id} />)}
      </div>
    </section>
  );
}

function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const queryKey = ["catalog", params.toString()];
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => listProducts(params, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined
  });
  const products = query.data?.pages.flatMap((page) => page.items) ?? [];

  useEffect(() => {
    if (!loadMoreRef.current || !query.hasNextPage || query.isFetchingNextPage) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) void query.fetchNextPage();
    });
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);

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

  const categoryLabels: Record<string, string> = {
    rituais: "Rituais",
    acessorios: "Acessorios",
    consultoria: "Consultoria"
  };
  const sortLabels: Record<string, string> = {
    featured: "Destaques",
    price_asc: "Menor preco",
    price_desc: "Maior preco",
    newest: "Recentes"
  };
  const searchValue = params.get("search")?.trim() ?? "";
  const categoryValue = params.get("category") ?? "";
  const sortValue = params.get("sort") ?? "featured";
  const activeFilters = [
    searchValue ? { key: "search", label: `Busca: ${searchValue}` } : null,
    categoryValue ? { key: "category", label: `Categoria: ${categoryLabels[categoryValue] ?? categoryValue}` } : null,
    sortValue !== "featured" ? { key: "sort", label: `Ordem: ${sortLabels[sortValue] ?? sortValue}` } : null
  ].filter((filter): filter is { key: string; label: string } => Boolean(filter));
  const activeFilterCount = activeFilters.length;

  return (
    <section className={`catalog-layout catalog-layout--infinite ${filtersCollapsed ? "catalog-layout--filters-collapsed" : ""}`}>
      {filtersCollapsed ? (
        <button className={activeFilterCount ? "filters-rail filters-rail--active" : "filters-rail"} type="button" onClick={() => setFiltersCollapsed(false)}>
          <PanelLeftOpen size={18} />
          <span>Filtros</span>
          {activeFilterCount ? <small>{activeFilterCount}</small> : null}
        </button>
      ) : (
        <aside className={filtersOpen ? "filters filters--open" : "filters"} aria-label="Filtros do catalogo">
          <div className="filters__header">
            <h1>Catalogo</h1>
            <div className="filters__header-actions">
              <IconButton label="Ocultar filtros" className="filters__collapse" onClick={() => setFiltersCollapsed(true)}>
                <PanelLeftClose size={18} />
              </IconButton>
              <IconButton label="Fechar filtros" className="filters__close" onClick={() => setFiltersOpen(false)}>
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
          <SelectField label="Categoria" value={params.get("category") ?? ""} onChange={(event) => updateParam("category", event.target.value)}>
            <option value="">Todas</option>
            <option value="rituais">Rituais</option>
            <option value="acessorios">Acessorios</option>
            <option value="consultoria">Consultoria</option>
          </SelectField>
          <SelectField label="Ordenacao" value={params.get("sort") ?? "featured"} onChange={(event) => updateParam("sort", event.target.value)}>
            <option value="featured">Destaques</option>
            <option value="price_asc">Menor preco</option>
            <option value="price_desc">Maior preco</option>
            <option value="newest">Recentes</option>
          </SelectField>
          <div className="active-filters" aria-live="polite">
            <div className="active-filters__header">
              <span>{activeFilterCount ? "Filtros ativos" : "Sem filtros ativos"}</span>
              {activeFilterCount ? (
                <button type="button" onClick={clearFilters}>
                  Limpar filtros
                </button>
              ) : null}
            </div>
            {activeFilterCount ? (
              <div className="active-filters__list">
                {activeFilters.map((filter) => (
                  <button type="button" key={filter.key} onClick={() => updateParam(filter.key, "")}>
                    {filter.label}
                    <X size={14} />
                  </button>
                ))}
              </div>
            ) : (
              <p className="filters__hint">Use busca, categoria ou ordenacao para refinar o catalogo.</p>
            )}
          </div>
          <Button type="button" variant="ghost" className="filters__done" onClick={() => setFiltersCollapsed(true)}>
            <PanelLeftClose size={16} />
            Ocultar filtros
          </Button>
        </aside>
      )}
      <div className="catalog-results">
        <div className="catalog-toolbar">
          <div>
            <p>Loja Bespoke</p>
            <h1>Catalogo</h1>
          </div>
          <IconButton
            label="Abrir filtros"
            className={activeFilterCount ? "filters-button filters-button--active" : "filters-button"}
            onClick={() => {
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
                <button type="button" key={filter.key} onClick={() => updateParam(filter.key, "")}>
                  {filter.label}
                  <X size={14} />
                </button>
              ))}
            </div>
            <button type="button" onClick={clearFilters}>Limpar filtros</button>
          </div>
        ) : null}
        {query.isError ? (
          <EmptyState title="Nao foi possivel carregar" body="Verifique a conexao com a API e tente novamente." action={<Button onClick={() => query.refetch()}>Tentar novamente</Button>} />
        ) : null}
        <div className="product-grid infinite-feed" aria-live="polite">
          {query.isLoading ? Array.from({ length: 8 }, (_, index) => <ProductSkeleton key={index} />) : null}
          {products.map((product) => (
            <ProductCard product={product} key={product.id} />
          ))}
        </div>
        {!query.isLoading && products.length === 0 ? <EmptyState title="Nada encontrado" body="Ajuste os filtros para ver outras opcoes." /> : null}
        <div ref={loadMoreRef} className="load-more">
          {query.hasNextPage ? (
            <Button variant="secondary" loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
              Carregar mais
            </Button>
          ) : products.length > 0 ? (
            <p>Todos os produtos foram carregados.</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ProductCard({ product }: { product: Product }) {
  const add = useCartStore((state) => state.add);
  const lowStock = product.stock <= product.lowStockThreshold;
  return (
    <article className="product-card">
      <Link to={`/produto/${product.slug}`} className="product-card__image">
        <img loading="lazy" src={product.images[0]!.url} alt={product.images[0]!.alt} />
      </Link>
      <div className="product-card__body">
        <div className="product-card__content">
          <div className="product-card__meta">
            <Badge tone={lowStock ? "warning" : "neutral"}>{lowStock ? "Estoque baixo" : product.category.name}</Badge>
            <span>Curadoria</span>
          </div>
          <h2>
            <Link to={`/produto/${product.slug}`}>{product.name}</Link>
          </h2>
          <p>{product.subtitle}</p>
        </div>
        <div className="product-card__footer">
          <div className="product-card__price">
            <span>Valor</span>
            <strong>{formatMoney(product.priceInCents)}</strong>
          </div>
          <Button type="button" className="product-card__button" onClick={() => add(productToCart(product))}>
            Adicionar
          </Button>
        </div>
      </div>
    </article>
  );
}

function ProductSkeleton() {
  return (
    <article className="product-card">
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
  const add = useCartStore((state) => state.add);
  const { data: product, isLoading, isError } = useQuery({ queryKey: ["product", slug], queryFn: () => getProduct(slug) });

  if (isLoading) return <section className="section"><ProductSkeleton /></section>;
  if (isError || !product) return <section className="section"><EmptyState title="Produto indisponivel" body="Este produto nao esta disponivel no momento." /></section>;

  return (
    <section className="product-detail">
      <div className="product-detail__media">
        <img src={product.images[0]!.url} alt={product.images[0]!.alt} />
      </div>
      <div className="product-detail__info">
        <Badge tone={product.stock <= product.lowStockThreshold ? "warning" : "neutral"}>{product.category.name}</Badge>
        <h1>{product.name}</h1>
        <p>{product.description}</p>
        <strong>{formatMoney(product.priceInCents)}</strong>
        <div className="detail-actions">
          <Button onClick={() => add(productToCart(product))}>Adicionar ao carrinho</Button>
          <Link className="store-button store-button--secondary" to="/carrinho">Ver carrinho</Link>
        </div>
      </div>
    </section>
  );
}

function CartPage() {
  const navigate = useNavigate();
  const items = useCartStore((state) => state.items);
  const update = useCartStore((state) => state.update);
  const remove = useCartStore((state) => state.remove);
  const [destinationPostalCode, setDestinationPostalCode] = useState("");
  const cartInput = useMemo(() => items.map((item) => ({ productId: item.id, quantity: item.quantity })), [items]);
  const normalizedPostalCode = destinationPostalCode.replace(/\D/g, "");
  const quotePostalCode = normalizedPostalCode.length === 8 ? normalizedPostalCode : undefined;
  const priced = useQuery({
    queryKey: ["cart-price", cartInput, quotePostalCode],
    queryFn: () => priceCart(cartInput, quotePostalCode),
    enabled: items.length > 0
  });
  const fallbackSubtotalInCents = items.reduce((total, item) => total + item.priceInCents * item.quantity, 0);
  const subtotalInCents = priced.data?.subtotalInCents ?? fallbackSubtotalInCents;
  const onlineShippingInCents = quotePostalCode ? priced.data?.shippingInCents : undefined;
  const onlineTotalInCents = quotePostalCode && priced.data ? priced.data.totalInCents : subtotalInCents;
  const whatsapp = useMutation({ mutationFn: () => createWhatsappRequest({ items: cartInput }) });

  async function continueOnWhatsapp() {
    const result = await whatsapp.mutateAsync();
    window.location.assign(result.url);
  }

  if (items.length === 0) {
    return <section className="section"><EmptyState title="Seu carrinho esta vazio" body="Escolha produtos no catalogo para iniciar sua compra." action={<Button onClick={() => navigate("/catalogo")}>Ir ao catalogo</Button>} /></section>;
  }

  return (
    <section className="cart-page">
      <div>
        <h1>Carrinho</h1>
        <div className="cart-lines">
          {items.map((item) => (
            <article className="cart-line" key={item.id}>
              <img src={item.imageUrl} alt="" />
              <div>
                <h2>{item.name}</h2>
                <p>{item.sku}</p>
                <strong>{formatMoney(item.priceInCents)}</strong>
              </div>
              <div className="quantity-control" aria-label={`Quantidade de ${item.name}`}>
                <IconButton label="Diminuir quantidade" onClick={() => update(item.id, item.quantity - 1)}>
                  <Minus size={16} />
                </IconButton>
                <span>{item.quantity}</span>
                <IconButton label="Aumentar quantidade" onClick={() => update(item.id, item.quantity + 1)}>
                  <Plus size={16} />
                </IconButton>
              </div>
              <IconButton label={`Remover ${item.name}`} onClick={() => remove(item.id)}>
                <Trash2 size={17} />
              </IconButton>
            </article>
          ))}
        </div>
      </div>
      <aside className="summary" aria-label="Resumo do pedido">
        <h2>Resumo</h2>
        <dl>
          <div><dt>Produtos</dt><dd>{formatMoney(subtotalInCents)}</dd></div>
          {onlineShippingInCents != null ? <div><dt>Frete online</dt><dd>{formatMoney(onlineShippingInCents)}</dd></div> : null}
          <div><dt>{quotePostalCode ? "Total online" : "Total sem frete"}</dt><dd>{formatMoney(onlineTotalInCents)}</dd></div>
        </dl>
        <div className="checkout-choice">
          <Button onClick={() => navigate(`/checkout${quotePostalCode ? `?cep=${quotePostalCode}` : ""}`)}>
            Comprar online <ArrowRight size={16} />
          </Button>
          <Button variant="secondary" loading={whatsapp.isPending} onClick={continueOnWhatsapp}>
            <MessageCircle size={16} />
            Comprar pelo WhatsApp
          </Button>
        </div>
        {whatsapp.isError ? <p className="error-text">{whatsapp.error.message}</p> : null}
        <div className="shipping-calculator">
          <TextField
            label="CEP para frete online"
            inputMode="numeric"
            value={destinationPostalCode}
            onChange={(event) => setDestinationPostalCode(event.target.value)}
            placeholder="00000-000"
          />
          {priced.isFetching && quotePostalCode ? <Skeleton /> : null}
          {priced.isError ? <p className="error-text">Nao foi possivel validar o carrinho.</p> : null}
          {priced.data?.shipping.message ? <p className="shipping-note">{priced.data.shipping.message}</p> : null}
        </div>
      </aside>
    </section>
  );
}

function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const items = useCartStore((state) => state.items);
  const clear = useCartStore((state) => state.clear);
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "" });
  const [destinationPostalCode, setDestinationPostalCode] = useState(searchParams.get("cep") ?? "");
  const cartInput = useMemo(() => items.map((item) => ({ productId: item.id, quantity: item.quantity })), [items]);
  const subtotalInCents = items.reduce((total, item) => total + item.priceInCents * item.quantity, 0);
  const totalItems = items.reduce((total, item) => total + item.quantity, 0);
  const previewItems = items.slice(0, 3);
  const whatsapp = useMutation({ mutationFn: () => createWhatsappRequest({ items: cartInput }) });
  const checkout = useMutation({
    mutationFn: () =>
      createCheckout({
        customer,
        shipping: { destinationPostalCode },
        items: cartInput
      }),
    onSuccess(data) {
      clear();
      window.location.assign(data.checkoutUrl);
    }
  });

  if (items.length === 0) {
    return (
      <section className="section">
        <EmptyState
          title="Seu carrinho esta vazio"
          body="Escolha produtos no catalogo antes de iniciar o checkout."
          action={<Link className="store-button store-button--primary" to="/catalogo">Ir ao catalogo</Link>}
        />
      </section>
    );
  }

  return (
    <section className="checkout-page">
      <div className="checkout-main">
        <div className="checkout-intro">
          <p>Compra segura</p>
          <h1>Finalize com acompanhamento Bespoke</h1>
          <p className="checkout-intro__copy">Revise seus dados e siga para um pagamento protegido. Se preferir, nossa consultoria conclui a compra com voce pelo WhatsApp.</p>
        </div>
        <form
          className="checkout-form"
          onSubmit={(event) => {
            event.preventDefault();
            checkout.mutate();
          }}
        >
          <section className="checkout-step" aria-labelledby="checkout-contact">
            <div className="checkout-step__heading">
              <span>1</span>
              <div>
                <h2 id="checkout-contact">Contato</h2>
                <p>Usamos estes dados apenas para confirmar o pedido e acompanhar o atendimento.</p>
              </div>
            </div>
            <div className="checkout-field-grid">
              <TextField label="Nome completo" required value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} />
              <TextField label="E-mail" required type="email" value={customer.email} onChange={(event) => setCustomer({ ...customer, email: event.target.value })} />
              <TextField label="Telefone" required value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} />
            </div>
          </section>
          <section className="checkout-step" aria-labelledby="checkout-delivery">
            <div className="checkout-step__heading">
              <span>2</span>
              <div>
                <h2 id="checkout-delivery">Entrega</h2>
                <p>Informe o CEP para preparar a entrega com o mesmo cuidado da curadoria.</p>
              </div>
            </div>
            <TextField
              label="CEP de entrega"
              required
              inputMode="numeric"
              value={destinationPostalCode}
              onChange={(event) => setDestinationPostalCode(event.target.value)}
              placeholder="00000-000"
            />
          </section>
          <section className="checkout-step" aria-labelledby="checkout-payment">
            <div className="checkout-step__heading">
              <span>3</span>
              <div>
                <h2 id="checkout-payment">Pagamento</h2>
                <p>Voce sera redirecionado para concluir o pagamento em ambiente seguro.</p>
              </div>
            </div>
            {whatsapp.isError ? <p className="error-text">{whatsapp.error.message}</p> : null}
            {checkout.isError ? <p className="error-text">{checkout.error.message}</p> : null}
            <div className="checkout-actions">
              <Button type="submit" loading={checkout.isPending}>
                Continuar para pagamento seguro
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
              + {items.length - previewItems.length} {items.length - previewItems.length === 1 ? "item adicional" : "itens adicionais"}
            </p>
          ) : null}
        </div>
        <dl>
          <div><dt>Itens</dt><dd>{totalItems}</dd></div>
          <div><dt>Produtos</dt><dd>{formatMoney(subtotalInCents)}</dd></div>
          <div><dt>Entrega</dt><dd>Calculada apos o CEP</dd></div>
          <div><dt>Total parcial</dt><dd>{formatMoney(subtotalInCents)}</dd></div>
        </dl>
        <ul className="checkout-reassurance" aria-label="Garantias do checkout">
          <li>Pagamento protegido fora do catalogo.</li>
          <li>Contato usado somente para pedido e entrega.</li>
          <li>Atendimento Bespoke disponivel antes da finalizacao.</li>
        </ul>
      </aside>
    </section>
  );
}

function AccountPage() {
  return <InfoPanel icon={<UserRound />} title="Conta do cliente" body="Area preparada para perfil, enderecos e preferencias com autorizacao por recurso." />;
}

function OrdersPage() {
  return <InfoPanel icon={<ShoppingBag />} title="Historico de pedidos" body="Os pedidos serao exibidos por referencia publica e somente para o cliente autenticado." />;
}

function SupportPage() {
  const support = useQuery({ queryKey: ["support-whatsapp"], queryFn: getSupportWhatsappUrl });

  return (
    <InfoPanel
      icon={<MessageCircle />}
      title="Suporte Bespoke"
      body="Atendimento para duvidas de produto, entrega e compra assistida."
      action={
        <a className="store-button store-button--primary" href={support.data?.url ?? "#"} aria-disabled={!support.data}>
          <MessageCircle size={16} />
          Falar no WhatsApp
        </a>
      }
    />
  );
}

function PrivacyPage() {
  return <InfoPanel icon={<Search />} title="Privacidade" body="Dados pessoais devem ser usados apenas para atendimento, pedidos, seguranca e obrigacoes legais." />;
}

function CheckoutReturnPage() {
  return <InfoPanel icon={<ShoppingBag />} title="Pedido recebido" body="Esta pagina é informativa" />;
}

function InfoPanel({ title, body, icon, action }: { title: string; body: string; icon: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="info-panel">
      <div aria-hidden="true">{icon}</div>
      <h1>{title}</h1>
      <p>{body}</p>
      {action ?? <Link className="store-button store-button--secondary" to="/catalogo">Voltar ao catalogo</Link>}
    </section>
  );
}

export default function App() {
  return <Layout />;
}
