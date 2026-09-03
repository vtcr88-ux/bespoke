import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  Check,
  ChevronRight,
  CircleAlert,
  CircleDashed,
  ClipboardCheck,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  ServerCog,
  ShieldCheck,
  Store,
  X,
} from "lucide-react";
import { NavLink, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import {
  controlInstanceInputSchema,
  type ControlInstance,
  type ControlInstanceInput,
  type ControlInstanceStatus,
} from "@bespoke/contracts";
import { Badge, Button, EmptyState, IconButton, Skeleton, TextField } from "@bespoke/design-system";
import {
  ControlApiError,
  createInstance,
  getEvents,
  getInstance,
  getOverview,
  getReadiness,
  listInstances,
  login,
  logout,
  prepareInstance,
  session,
  type ControlSession,
} from "./api";
import { slugFromName } from "./helpers";

const statusContent: Record<ControlInstanceStatus, { label: string; tone: "neutral" | "success" | "warning" | "danger" }> = {
  draft: { label: "Rascunho", tone: "neutral" },
  prepared: { label: "Preparada", tone: "success" },
  provisioning: { label: "Provisionando", tone: "warning" },
  active: { label: "Ativa", tone: "success" },
  failed: { label: "Atencao", tone: "danger" },
  suspended: { label: "Suspensa", tone: "danger" },
};

export default function App() {
  const sessionQuery = useQuery({ queryKey: ["control-session"], queryFn: session, retry: false });
  if (sessionQuery.isPending) return <LoadingScreen />;
  if (sessionQuery.isError) return <FatalState retry={() => void sessionQuery.refetch()} />;
  if (!sessionQuery.data) return <LoginPage onAuthenticated={(value) => sessionQuery.refetch().then(() => value)} />;
  return <AuthenticatedApp session={sessionQuery.data} />;
}

function AuthenticatedApp({ session: activeSession }: { session: ControlSession }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const queryClient = useQueryClient();
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => queryClient.setQueryData(["control-session"], null),
  });
  return (
    <div className="control-shell">
      <header className="control-mobile-header">
        <Brand />
        <IconButton label={menuOpen ? "Fechar menu" : "Abrir menu"} onClick={() => setMenuOpen((value) => !value)}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </IconButton>
      </header>
      <aside className={`control-sidebar${menuOpen ? " is-open" : ""}`}>
        <Brand />
        <nav aria-label="Navegacao principal" onClick={() => setMenuOpen(false)}>
          <NavLink to="/" end><LayoutDashboard size={18} /> Visao geral</NavLink>
          <NavLink to="/lojas"><Building2 size={18} /> Lojas</NavLink>
          <NavLink to="/lojas/nova"><Plus size={18} /> Nova loja</NavLink>
        </nav>
        <div className="control-sidebar__account">
          <span>Operador da plataforma</span>
          <strong>{activeSession.admin.email}</strong>
          <Button variant="ghost" onClick={() => logoutMutation.mutate()} loading={logoutMutation.isPending}>
            <LogOut size={16} aria-hidden="true" /> Sair
          </Button>
        </div>
      </aside>
      {menuOpen ? <button className="control-backdrop" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} /> : null}
      <main className="control-main">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="lojas" element={<InstancesPage />} />
          <Route path="lojas/nova" element={<NewInstancePage />} />
          <Route path="lojas/:id" element={<InstancePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function Brand() {
  return (
    <div className="control-brand" aria-label="Bespoke Control">
      <span>B</span>
      <div><strong>Bespoke</strong><small>Control</small></div>
    </div>
  );
}

function LoginPage({ onAuthenticated }: { onAuthenticated: (session: ControlSession) => unknown }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const mutation = useMutation({ mutationFn: () => login(email, password), onSuccess: onAuthenticated });
  return (
    <main className="control-login">
      <section className="control-login__panel">
        <Brand />
        <div>
          <p className="control-eyebrow">Acesso interno</p>
          <h1>Painel da plataforma</h1>
          <p>Prepare e acompanhe lojas isoladas a partir de uma unica base de codigo.</p>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}>
          <TextField label="E-mail" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
          <TextField label="Senha" type="password" autoComplete="current-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} />
          {mutation.isError ? <InlineError error={mutation.error} /> : null}
          <Button type="submit" loading={mutation.isPending}>Entrar no painel</Button>
        </form>
      </section>
    </main>
  );
}

function Dashboard() {
  const overview = useQuery({ queryKey: ["overview"], queryFn: getOverview });
  const instances = useQuery({ queryKey: ["instances"], queryFn: listInstances });
  return (
    <Page title="Visao geral" description="Acompanhe o preparo das lojas sem acessar dados comerciais de cada operacao." action={<ButtonLink to="/lojas/nova"><Plus size={16} /> Nova loja</ButtonLink>}>
      {overview.isPending ? <MetricSkeleton /> : overview.isError ? <InlineError error={overview.error} /> : (
        <section className="control-metrics" aria-label="Resumo das lojas">
          <Metric label="Total de lojas" value={overview.data.total} icon={<Building2 />} />
          <Metric label="Aguardando preparo" value={overview.data.draft} icon={<CircleDashed />} />
          <Metric label="Templates prontos" value={overview.data.prepared} icon={<ClipboardCheck />} />
          <Metric label="Precisam de atencao" value={overview.data.attention} icon={<CircleAlert />} />
        </section>
      )}
      <section className="control-section">
        <SectionHeader title="Lojas recentes" link="/lojas" />
        {instances.isPending ? <ListSkeleton /> : instances.isError ? <InlineError error={instances.error} /> : instances.data.length ? (
          <InstanceList items={instances.data.slice(0, 5)} />
        ) : <NoInstances />}
      </section>
    </Page>
  );
}

function InstancesPage() {
  const query = useQuery({ queryKey: ["instances"], queryFn: listInstances });
  return (
    <Page title="Lojas" description="Cadastro operacional e estado de preparo de cada instancia." action={<ButtonLink to="/lojas/nova"><Plus size={16} /> Nova loja</ButtonLink>}>
      <section className="control-section">
        {query.isPending ? <ListSkeleton /> : query.isError ? <InlineError error={query.error} /> : query.data.length ? <InstanceList items={query.data} /> : <NoInstances />}
      </section>
    </Page>
  );
}

function NewInstancePage() {
  const navigate = useNavigate();
  const [slugEdited, setSlugEdited] = useState(false);
  const [form, setForm] = useState<ControlInstanceInput>({
    slug: "", name: "", publicDomain: "", adminDomain: "", apiDomain: "", ownerEmail: "", whatsappPhone: "", notes: "",
  });
  const [validationError, setValidationError] = useState("");
  const mutation = useMutation({
    mutationFn: createInstance,
    onSuccess: (instance) => navigate(`/lojas/${instance.id}`),
  });
  function update<K extends keyof ControlInstanceInput>(key: K, value: ControlInstanceInput[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "name" && !slugEdited) next.slug = slugFromName(String(value));
      if (key === "publicDomain") {
        const domain = String(value).replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
        if (!current.adminDomain || current.adminDomain === `admin.${current.publicDomain}`) next.adminDomain = domain ? `admin.${domain}` : "";
        if (!current.apiDomain || current.apiDomain === `api.${current.publicDomain}`) next.apiDomain = domain ? `api.${domain}` : "";
      }
      return next;
    });
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = controlInstanceInputSchema.safeParse(form);
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Revise os campos informados.");
      return;
    }
    setValidationError("");
    mutation.mutate(parsed.data);
  }
  return (
    <Page title="Nova loja" description="Primeiro cadastre a identidade operacional. O preparo dos arquivos acontece na etapa seguinte." back="/lojas">
      <form className="control-form" onSubmit={submit}>
        <FormSection number="1" title="Identidade" description="Nome publico e identificador tecnico estavel.">
          <div className="control-form-grid">
            <TextField label="Nome da loja" required value={form.name} onChange={(event) => update("name", event.target.value)} />
            <TextField label="Identificador" required value={form.slug} onChange={(event) => { setSlugEdited(true); update("slug", event.target.value.toLowerCase()); }} pattern="[a-z0-9][a-z0-9-]{2,62}" />
          </div>
        </FormSection>
        <FormSection number="2" title="Dominios" description="Informe somente o dominio, sem https ou caminhos.">
          <div className="control-form-grid">
            <TextField label="Pagina publica" required placeholder="loja.exemplo.com.br" value={form.publicDomain} onChange={(event) => update("publicDomain", event.target.value)} />
            <TextField label="Painel da loja" required placeholder="admin.loja.exemplo.com.br" value={form.adminDomain} onChange={(event) => update("adminDomain", event.target.value)} />
            <TextField label="API da loja" required placeholder="api.loja.exemplo.com.br" value={form.apiDomain} onChange={(event) => update("apiDomain", event.target.value)} />
          </div>
        </FormSection>
        <FormSection number="3" title="Responsavel" description="Contato administrativo; nenhuma senha da loja e armazenada aqui.">
          <div className="control-form-grid">
            <TextField label="E-mail do proprietario" type="email" required value={form.ownerEmail} onChange={(event) => update("ownerEmail", event.target.value)} />
            <TextField label="WhatsApp da loja (opcional)" inputMode="numeric" placeholder="5511999999999" value={form.whatsappPhone} onChange={(event) => update("whatsappPhone", event.target.value.replace(/\D/g, ""))} />
          </div>
          <label className="control-textarea"><span>Observacoes internas (opcional)</span><textarea maxLength={500} value={form.notes} onChange={(event) => update("notes", event.target.value)} /></label>
        </FormSection>
        {validationError ? <p className="control-error" role="alert">{validationError}</p> : null}
        {mutation.isError ? <InlineError error={mutation.error} /> : null}
        <div className="control-form-actions"><Button type="submit" loading={mutation.isPending}><Plus size={16} /> Criar cadastro</Button></div>
      </form>
    </Page>
  );
}

function InstancePage() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const instance = useQuery({ queryKey: ["instance", id], queryFn: () => getInstance(id), enabled: Boolean(id) });
  const readiness = useQuery({ queryKey: ["readiness", id], queryFn: () => getReadiness(id), enabled: Boolean(id) });
  const events = useQuery({ queryKey: ["events", id], queryFn: () => getEvents(id), enabled: Boolean(id) });
  const prepare = useMutation({
    mutationFn: () => prepareInstance(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["instance", id] }),
        queryClient.invalidateQueries({ queryKey: ["readiness", id] }),
        queryClient.invalidateQueries({ queryKey: ["events", id] }),
        queryClient.invalidateQueries({ queryKey: ["instances"] }),
        queryClient.invalidateQueries({ queryKey: ["overview"] }),
      ]);
    },
  });
  if (instance.isPending) return <Page title="Carregando loja" description=""><ListSkeleton /></Page>;
  if (instance.isError) return <Page title="Loja indisponivel" description=""><InlineError error={instance.error} /></Page>;
  const item = instance.data;
  return (
    <Page title={item.name} description={`Instancia ${item.slug}`} back="/lojas" action={
      item.status === "prepared" ? <Badge tone="success">Templates preparados</Badge> : <Button onClick={() => prepare.mutate()} loading={prepare.isPending}><ServerCog size={16} /> Preparar arquivos</Button>
    }>
      {prepare.isError ? <InlineError error={prepare.error} /> : null}
      <section className="control-detail-grid">
        <div className="control-section">
          <SectionHeader title="Dados operacionais" />
          <dl className="control-definition-list">
            <Definition label="Estado"><StatusBadge status={item.status} /></Definition>
            <Definition label="Porta reservada"><code>{item.apiPort}</code></Definition>
            <Definition label="Proprietario">{item.ownerEmail}</Definition>
            <Definition label="Pagina publica"><Domain value={item.publicDomain} /></Definition>
            <Definition label="Painel da loja"><Domain value={item.adminDomain} /></Definition>
            <Definition label="API"><Domain value={item.apiDomain} /></Definition>
          </dl>
        </div>
        <div className="control-section">
          <SectionHeader title="Prontidao" />
          {readiness.isPending ? <ListSkeleton /> : readiness.isError ? <InlineError error={readiness.error} /> : (
            <ul className="control-readiness">
              {readiness.data.items.map((check) => (
                <li key={check.key} data-status={check.status}>
                  {check.status === "ready" ? <Check /> : check.status === "blocked" ? <CircleAlert /> : <CircleDashed />}
                  <div><strong>{check.label}</strong><span>{check.detail}</span></div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      <section className="control-section">
        <SectionHeader title="Historico" />
        {events.isPending ? <ListSkeleton /> : events.isError ? <InlineError error={events.error} /> : (
          <ol className="control-timeline">
            {events.data.map((event) => <li key={event.id}><span /><div><strong>{event.message}</strong><time>{formatDate(event.createdAt)}</time></div></li>)}
          </ol>
        )}
      </section>
    </Page>
  );
}

function Page({ title, description, action, back, children }: { title: string; description: string; action?: ReactNode; back?: string; children: ReactNode }) {
  return <div className="control-page">
    <header className="control-page-header">
      <div>{back ? <NavLink className="control-back" to={back}><ArrowLeft size={16} /> Voltar</NavLink> : null}<p className="control-eyebrow">Bespoke Control</p><h1>{title}</h1>{description ? <p>{description}</p> : null}</div>
      {action ? <div className="control-page-header__action">{action}</div> : null}
    </header>
    {children}
  </div>;
}

function InstanceList({ items }: { items: ControlInstance[] }) {
  return <div className="control-instance-list">{items.map((item) => (
    <NavLink to={`/lojas/${item.id}`} key={item.id} className="control-instance-row">
      <span className="control-instance-icon"><Store size={19} /></span>
      <span className="control-instance-main"><strong>{item.name}</strong><small>{item.publicDomain}</small></span>
      <span className="control-instance-owner">{item.ownerEmail}</span>
      <StatusBadge status={item.status} />
      <ChevronRight size={18} aria-hidden="true" />
    </NavLink>
  ))}</div>;
}

function StatusBadge({ status }: { status: ControlInstanceStatus }) {
  const content = statusContent[status];
  return <Badge tone={content.tone}>{content.label}</Badge>;
}

function Metric({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return <article className="control-metric"><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></article>;
}

function FormSection({ number, title, description, children }: { number: string; title: string; description: string; children: ReactNode }) {
  return <section className="control-form-section"><header><span>{number}</span><div><h2>{title}</h2><p>{description}</p></div></header>{children}</section>;
}

function Definition({ label, children }: { label: string; children: ReactNode }) {
  return <div><dt>{label}</dt><dd>{children}</dd></div>;
}

function Domain({ value }: { value: string }) {
  return <a href={`https://${value}`} target="_blank" rel="noreferrer">{value}<ExternalLink size={13} /></a>;
}

function SectionHeader({ title, link }: { title: string; link?: string }) {
  return <header className="control-section-header"><h2>{title}</h2>{link ? <NavLink to={link}>Ver todas <ChevronRight size={15} /></NavLink> : null}</header>;
}

function ButtonLink({ to, children }: { to: string; children: ReactNode }) {
  return <NavLink className="control-button-link" to={to}>{children}</NavLink>;
}

function NoInstances() {
  return <EmptyState title="Nenhuma loja cadastrada" body="Crie o primeiro cadastro para reservar dominios e preparar os arquivos isolados." action={<ButtonLink to="/lojas/nova"><Plus size={16} /> Criar primeira loja</ButtonLink>} />;
}

function InlineError({ error }: { error: unknown }) {
  const message = error instanceof ControlApiError || error instanceof Error ? error.message : "Nao foi possivel carregar os dados.";
  return <p className="control-error" role="alert"><CircleAlert size={17} /> {message}</p>;
}

function LoadingScreen() { return <main className="control-loading"><ShieldCheck size={30} /><span>Validando acesso seguro...</span></main>; }
function FatalState({ retry }: { retry: () => void }) { return <main className="control-loading"><CircleAlert size={30} /><strong>O painel nao conseguiu acessar a API.</strong><Button onClick={retry}>Tentar novamente</Button></main>; }
function MetricSkeleton() { return <div className="control-metrics">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="control-metric-skeleton" />)}</div>; }
function ListSkeleton() { return <div className="control-list-skeleton"><Skeleton /><Skeleton /><Skeleton /></div>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
