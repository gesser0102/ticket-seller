import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { SessionUserDto } from "@ticket-seller/shared";
import { IconChevronDown, IconUser } from "./icons";
import "./usermenu.css";

const ROLE_LABEL: Record<SessionUserDto["role"], string> = {
  client: "Cliente",
  organizer: "Organizador",
  gate: "Portaria",
};

function initialsFrom(name: string | null): string | null {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  const initials = (first + last).toUpperCase();
  return initials || null;
}

export function UserMenu({ user, onLogout }: { user: SessionUserDto; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const initials = initialsFrom(user.name);
  const displayName = user.name ?? ROLE_LABEL[user.role];

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        type="button"
        className="user-menu-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu da conta"
      >
        <span className="user-menu-avatar">
          {initials ?? <IconUser width={18} height={18} />}
        </span>
        <IconChevronDown
          width={16}
          height={16}
          className={`user-menu-chevron ${open ? "user-menu-chevron-open" : ""}`}
        />
      </button>

      {open && (
        <div className="user-menu-dropdown" role="menu">
          <div className="user-menu-header">
            <strong>{displayName}</strong>
            {user.email && <span className="user-menu-email">{user.email}</span>}
          </div>
          <div className="user-menu-divider" />

          {user.role === "client" && user.registered && (
            <>
              <Link to="/tickets" className="user-menu-item" role="menuitem" onClick={() => setOpen(false)}>
                Meus ingressos
              </Link>
              <Link to="/conta" className="user-menu-item" role="menuitem" onClick={() => setOpen(false)}>
                Minha conta
              </Link>
            </>
          )}
          {user.role === "gate" && (
            <Link to="/gate" className="user-menu-item" role="menuitem" onClick={() => setOpen(false)}>
              Portaria
            </Link>
          )}
          {user.role === "organizer" && (
            <Link to="/organizer" className="user-menu-item" role="menuitem" onClick={() => setOpen(false)}>
              Painel do organizador
            </Link>
          )}

          <div className="user-menu-divider" />
          <button
            type="button"
            className="user-menu-item user-menu-item-danger"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
