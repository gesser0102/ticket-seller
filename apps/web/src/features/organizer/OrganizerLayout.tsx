import { NavLink, Outlet } from "react-router-dom";
import { IconCalendar, IconDoor, IconFilm, IconGrid } from "../../ui/icons";
import "./organizer.css";

const NAV_ITEMS = [
  { to: "/organizer/visao-geral", label: "Visão geral", Icon: IconGrid },
  { to: "/organizer/filmes", label: "Filmes", Icon: IconFilm },
  { to: "/organizer/salas", label: "Salas", Icon: IconDoor },
  { to: "/organizer/sessoes", label: "Sessões", Icon: IconCalendar },
];

export function OrganizerLayout() {
  return (
    <div className="organizer-shell">
      <aside className="organizer-sidebar">
        <span className="organizer-sidebar-label">PAINEL DO ORGANIZADOR</span>
        <nav className="organizer-nav">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `organizer-nav-link ${isActive ? "active" : ""}`}
            >
              <Icon width={18} height={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="organizer-content">
        <Outlet />
      </main>
    </div>
  );
}
