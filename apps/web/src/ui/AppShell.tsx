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
    <div className="app-shell">
      <header className="app-header">
        <div className="container app-header-inner">
          <Link to="/" className="app-brand" aria-label="Primeira Fila - inicio">
            <span className="app-brand-mark">
              <IconTicket width={23} height={23} />
            </span>
            <span className="app-brand-label">
              <span className="app-brand-name">Primeira Fila</span>
              <span className="app-brand-subtitle">Cinema sem fila</span>
            </span>
          </Link>

          <nav className="app-nav">
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
      <main className="app-main">{children}</main>
      <ToastHost />
    </div>
  );
}
