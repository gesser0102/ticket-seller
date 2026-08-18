import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import type { Role } from "@ticket-seller/shared";
import { useAuth } from "./AuthContext";
import { Spinner } from "../../ui/Spinner";

export function RequireRole({
  roles,
  requireRegistered = false,
  children,
}: {
  roles: Role[];
  requireRegistered?: boolean;
  children: ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) return <Spinner label="Carregando sessão…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  if (requireRegistered && !user.registered) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
