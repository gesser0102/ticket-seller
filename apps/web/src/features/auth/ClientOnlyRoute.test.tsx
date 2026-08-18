import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { SessionUserDto } from "@ticket-seller/shared";
import { ClientOnlyRoute } from "./ClientOnlyRoute";

const useAuthMock = vi.fn();
vi.mock("./AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={["/sessoes/1/assentos"]}>
      <Routes>
        <Route
          path="/sessoes/1/assentos"
          element={
            <ClientOnlyRoute>
              <div>Mapa de assentos</div>
            </ClientOnlyRoute>
          }
        />
        <Route path="/organizer" element={<div>Painel do organizador</div>} />
        <Route path="/gate" element={<div>Console da portaria</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ClientOnlyRoute", () => {
  it("mostra o spinner enquanto a sessão carrega", () => {
    useAuthMock.mockReturnValue({ user: null, loading: true });
    renderRoute();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("libera o fluxo de compra pra visitante anônimo (sem conta ainda)", () => {
    useAuthMock.mockReturnValue({ user: null, loading: false });
    renderRoute();
    expect(screen.getByText("Mapa de assentos")).toBeInTheDocument();
  });

  it("libera o fluxo de compra pra um cliente logado", () => {
    const client: SessionUserDto = {
      id: "1",
      email: "c@c.com",
      name: "C",
      role: "client",
      registered: true,
    };
    useAuthMock.mockReturnValue({ user: client, loading: false });
    renderRoute();
    expect(screen.getByText("Mapa de assentos")).toBeInTheDocument();
  });

  it("redireciona um organizador logado de volta pro próprio painel", () => {
    const organizer: SessionUserDto = {
      id: "1",
      email: "o@o.com",
      name: "O",
      role: "organizer",
      registered: true,
    };
    useAuthMock.mockReturnValue({ user: organizer, loading: false });
    renderRoute();
    expect(screen.getByText("Painel do organizador")).toBeInTheDocument();
  });

  it("redireciona um operador de portaria logado de volta pro próprio console", () => {
    const gate: SessionUserDto = {
      id: "1",
      email: "g@g.com",
      name: "G",
      role: "gate",
      registered: true,
    };
    useAuthMock.mockReturnValue({ user: gate, loading: false });
    renderRoute();
    expect(screen.getByText("Console da portaria")).toBeInTheDocument();
  });
});
