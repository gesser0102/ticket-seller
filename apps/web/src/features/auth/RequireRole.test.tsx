import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { SessionUserDto } from "@ticket-seller/shared";
import { RequireRole } from "./RequireRole";

const useAuthMock = vi.fn();
vi.mock("./AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

function renderProtected(roles: SessionUserDto["role"][], requireRegistered = false) {
  return render(
    <MemoryRouter initialEntries={["/protegida"]}>
      <Routes>
        <Route
          path="/protegida"
          element={
            <RequireRole roles={roles} requireRegistered={requireRegistered}>
              <div>Conteúdo protegido</div>
            </RequireRole>
          }
        />
        <Route path="/login" element={<div>Página de login</div>} />
        <Route path="/" element={<div>Cartaz público</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const client: SessionUserDto = { id: "1", email: "c@c.com", name: "C", role: "client", registered: true };

describe("RequireRole", () => {
  it("mostra o spinner de carregamento enquanto a sessão ainda está resolvendo", () => {
    useAuthMock.mockReturnValue({ user: null, loading: true });
    renderProtected(["client"]);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("Conteúdo protegido")).not.toBeInTheDocument();
  });

  it("redireciona para /login quando não há usuário logado", () => {
    useAuthMock.mockReturnValue({ user: null, loading: false });
    renderProtected(["client"]);
    expect(screen.getByText("Página de login")).toBeInTheDocument();
  });

  it("redireciona para / quando o papel do usuário não está na lista permitida", () => {
    useAuthMock.mockReturnValue({
      user: { ...client, role: "organizer" },
      loading: false,
    });
    renderProtected(["client"]);
    expect(screen.getByText("Cartaz público")).toBeInTheDocument();
  });

  it("renderiza o conteúdo protegido quando o papel bate", () => {
    useAuthMock.mockReturnValue({ user: client, loading: false });
    renderProtected(["client"]);
    expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();
  });

  it("com requireRegistered, redireciona pro login um cliente anônimo (ainda não cadastrado)", () => {
    useAuthMock.mockReturnValue({
      user: { ...client, registered: false, email: null, name: null },
      loading: false,
    });
    renderProtected(["client"], true);
    expect(screen.getByText("Página de login")).toBeInTheDocument();
  });

  it("com requireRegistered, libera um cliente já cadastrado", () => {
    useAuthMock.mockReturnValue({ user: client, loading: false });
    renderProtected(["client"], true);
    expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();
  });
});
