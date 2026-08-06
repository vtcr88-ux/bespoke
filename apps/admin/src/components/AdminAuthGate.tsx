import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, LockKeyhole, LogIn, ShieldCheck } from "lucide-react";
import { Button, IconButton, TextField } from "@bespoke/design-system";
import adminLogo from "../assets/bespoke-admin-logo.png";
import {
  AdminApiError,
  type AdminSession,
  adminUnauthorizedEvent,
  clearAdminSession,
  getAdminSession,
  loginAdmin,
  logoutAdmin,
} from "../lib/api";

type AuthState =
  | { status: "checking" }
  | { status: "signed_out"; message?: string }
  | { status: "authenticated"; session: AdminSession };

type AdminAuthGateProps = {
  children: (context: {
    session: AdminSession;
    logout: () => Promise<void>;
    logoutError: string;
    logoutPending: boolean;
  }) => ReactNode;
};

export function AdminAuthGate({ children }: AdminAuthGateProps) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ status: "checking" });
  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    let active = true;
    void getAdminSession()
      .then((session) => {
        if (active) setState({ status: "authenticated", session });
      })
      .catch((error: unknown) => {
        if (!active) return;
        clearAdminSession();
        setState({
          status: "signed_out",
          message:
            error instanceof AdminApiError && error.status === 401
              ? undefined
              : sessionCheckMessage(error),
        });
      });

    const handleUnauthorized = () => {
      clearAdminSession();
      queryClient.clear();
      setState((current) =>
        current.status === "authenticated"
          ? {
              status: "signed_out",
              message: "Sua sessao expirou. Entre novamente.",
            }
          : current,
      );
    };
    window.addEventListener(adminUnauthorizedEvent, handleUnauthorized);
    return () => {
      active = false;
      window.removeEventListener(adminUnauthorizedEvent, handleUnauthorized);
    };
  }, [queryClient]);

  if (state.status === "checking") {
    return <AdminAuthLoading />;
  }

  if (state.status === "signed_out") {
    return (
      <AdminLogin
        initialMessage={state.message}
        onAuthenticated={(session) => {
          queryClient.clear();
          setLogoutError("");
          setState({ status: "authenticated", session });
        }}
      />
    );
  }

  const logout = async () => {
    setLogoutPending(true);
    setLogoutError("");
    try {
      await logoutAdmin();
      queryClient.clear();
      setState({ status: "signed_out" });
    } catch (error) {
      if (error instanceof AdminApiError && error.status === 401) {
        clearAdminSession();
        queryClient.clear();
        setState({ status: "signed_out" });
        return;
      }
      setLogoutError("Nao foi possivel encerrar a sessao. Tente novamente.");
    } finally {
      setLogoutPending(false);
    }
  };

  return children({
    session: state.session,
    logout,
    logoutError,
    logoutPending,
  });
}

function AdminLogin({
  initialMessage,
  onAuthenticated,
}: {
  initialMessage?: string;
  onAuthenticated: (session: AdminSession) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(initialMessage ?? "");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    try {
      onAuthenticated(await loginAdmin({ email, password }));
    } catch (requestError) {
      setError(loginErrorMessage(requestError));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="admin-auth-page">
      <main className="admin-auth-card" aria-labelledby="admin-login-title">
        <header className="admin-auth-card__header">
          <span className="admin-auth-logo-frame">
            <img src={adminLogo} alt="Painel administrativo" />
          </span>
          <div>
            <p>Acesso administrativo</p>
            <h1 id="admin-login-title">Entrar no painel</h1>
            <span>Use as credenciais seguras configuradas para esta loja.</span>
          </div>
        </header>

        <form className="admin-auth-form" onSubmit={submit} noValidate>
          <TextField
            autoComplete="email"
            autoFocus
            disabled={pending}
            label="E-mail"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@sualoja.com.br"
            required
            type="email"
            value={email}
          />
          <div className="admin-auth-password">
            <TextField
              autoComplete="current-password"
              disabled={pending}
              label="Senha"
              minLength={8}
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type={passwordVisible ? "text" : "password"}
              value={password}
            />
            <IconButton
              className="admin-auth-password__toggle"
              label={passwordVisible ? "Ocultar senha" : "Mostrar senha"}
              onClick={() => setPasswordVisible((visible) => !visible)}
              type="button"
            >
              {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
            </IconButton>
          </div>
          {error ? (
            <p className="admin-auth-error" role="alert">
              {error}
            </p>
          ) : null}
          <Button className="admin-auth-submit" loading={pending} type="submit">
            <LogIn size={17} />
            {pending ? "Validando acesso" : "Entrar"}
          </Button>
        </form>

        <footer className="admin-auth-card__footer">
          <ShieldCheck size={17} aria-hidden="true" />
          <span>Sessao protegida e acesso restrito.</span>
        </footer>
      </main>
    </div>
  );
}

function AdminAuthLoading() {
  return (
    <div className="admin-auth-page">
      <main className="admin-auth-card admin-auth-card--loading" role="status">
        <LockKeyhole size={24} aria-hidden="true" />
        <strong>Validando acesso</strong>
        <span>Aguarde um instante.</span>
      </main>
    </div>
  );
}

function loginErrorMessage(error: unknown) {
  if (error instanceof AdminApiError) {
    if (error.code === "SESSION_COOKIE_UNAVAILABLE") {
      return "Nao foi possivel manter a sessao. Atualize a pagina e tente novamente.";
    }
    if (error.status === 401) return "E-mail ou senha invalidos.";
    if (error.status === 429) return error.message;
    if (error.status === 400) return "Revise o e-mail e a senha informados.";
  }
  if (isNetworkError(error)) {
    return "Nao foi possivel conectar ao servidor admin. Confirme se a API esta ativa e se este endereco do painel esta liberado.";
  }
  return "Nao foi possivel entrar agora. Tente novamente em instantes.";
}

function sessionCheckMessage(error: unknown) {
  if (isNetworkError(error)) {
    return "Nao foi possivel validar a sessao. Confirme se a API esta ativa e se este endereco do painel esta liberado.";
  }
  return "Nao foi possivel validar a sessao. Tente novamente em instantes.";
}

function isNetworkError(error: unknown) {
  return error instanceof TypeError;
}
