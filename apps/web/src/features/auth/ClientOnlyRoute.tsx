import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { Spinner } from "../../ui/Spinner";

export function ClientOnlyRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <Spinner label="Carregando sessão…" />;
  if (user && user.role !== "client") {
    return <Navigate to={user.role === "organizer" ? "/organizer" : "/gate"} replace />;
  }

  return <>{children}</>;
}
