import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { IconTicket } from "./icons";
import { UserMenu } from "./UserMenu";
import { ToastHost } from "./ToastHost";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const hasAccount = Boolean(user?.registered);

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          height: "var(--header-height)",
          display: "flex",
          alignItems: "center",
          position: "sticky",
          top: 0,
          background: "var(--color-primary-strong)",
          boxShadow: "0 1px 0 rgba(0, 0, 0, 0.08)",
          zIndex: 40,
        }}
      >
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#fff" }}>
            <IconTicket width={24} height={24} color="#fff" />
            <span style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", letterSpacing: "0.03em" }}>
              BILHETERIA
            </span>
          </Link>

          <nav style={{ display: "flex", alignItems: "center", gap: "var(--space-5)" }}>
            <Link to="/" className="header-nav-link">
              Em cartaz
            </Link>

            {hasAccount && user ? (
              <UserMenu user={user} onLogout={handleLogout} />
            ) : (
              <Link to="/login" className="header-nav-link">
                Entrar
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main style={{ flex: 1 }}>{children}</main>
      <ToastHost />
    </div>
  );
}
