import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { ApiError } from "../../lib/apiClient";
import { MessageBar } from "../../ui/MessageBar";
import { IconFilm } from "../../ui/icons";
import { useAuth } from "./AuthContext";
import "./auth.css";

export function LoginPage() {
  const { user, login, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && user && user.registered) {
    const destination = user.role === "gate" ? "/gate" : user.role === "organizer" ? "/organizer" : "/tickets";
    return <Navigate to={destination} replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível entrar. Tente novamente.");
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "calc(100vh - var(--header-height))",
        display: "grid",
        gridTemplateColumns: "1fr",
        alignItems: "stretch",
      }}
      className="login-grid"
    >
      <section className="login-hero">
        <IconFilm width={40} height={40} color="var(--color-accent)" />
        <h1>
          O assento certo,
          <br />
          sem fila e sem susto.
        </h1>
        <p>
          Escolha o lugar num mapa ao vivo, pague em segundos e leve o ingresso no bolso — com QR pronto pra
          entrada.
        </p>
      </section>

      <section style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-6)" }}>
        <form onSubmit={handleSubmit} className="surface" style={{ width: "100%", maxWidth: 380, padding: "var(--space-6)" }}>
          <h2 style={{ marginBottom: "var(--space-2)" }}>Entrar</h2>
          <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-5)" }}>
            Já comprou antes? Entre com o e-mail cadastrado no checkout. Portaria e organizador usam as
            credenciais pre cadastradas (ver README).
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="field">
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
              />
            </div>

            {error && <MessageBar tone="danger">{error}</MessageBar>}

            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy ? "Entrando…" : "Entrar"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
