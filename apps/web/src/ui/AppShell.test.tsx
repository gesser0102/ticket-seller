import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { SessionUserDto } from "@ticket-seller/shared";
import { AppShell } from "./AppShell";

const useAuthMock = vi.fn();
vi.mock("../features/auth/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

function renderShell() {
  return render(
    <MemoryRouter>
      <AppShell>
        <p>Conteúdo da página</p>
      </AppShell>
    </MemoryRouter>,
  );
}

describe("AppShell", () => {
  it("renderiza o logo e o conteúdo filho", () => {
    useAuthMock.mockReturnValue({ user: null, logout: vi.fn() });
    renderShell();
    expect(screen.getByText("Primeira Fila")).toBeInTheDocument();
    expect(screen.getByText("Conteúdo da página")).toBeInTheDocument();
  });

  it('sem usuário logado, mostra o link "Entrar"', () => {
    useAuthMock.mockReturnValue({ user: null, logout: vi.fn() });
    renderShell();
    expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute("href", "/login");
  });

  it("cliente ainda não cadastrado (anônimo) também vê o link Entrar, não o menu de conta", () => {
    const anonymous: SessionUserDto = {
      id: "1",
      email: null,
      name: null,
      role: "client",
      registered: false,
    };
    useAuthMock.mockReturnValue({ user: anonymous, logout: vi.fn() });
    renderShell();
    expect(screen.getByRole("link", { name: "Entrar" })).toBeInTheDocument();
  });

  it("cliente já cadastrado vê o menu de conta (avatar), não o link Entrar", () => {
    const registered: SessionUserDto = {
      id: "1",
      email: "c@c.com",
      name: "Cliente",
      role: "client",
      registered: true,
    };
    useAuthMock.mockReturnValue({ user: registered, logout: vi.fn() });
    renderShell();
    expect(screen.getByRole("button", { name: "Menu da conta" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Entrar" })).not.toBeInTheDocument();
  });

  it("logout chama a função de logout do contexto", async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    const registered: SessionUserDto = {
      id: "1",
      email: "c@c.com",
      name: "Cliente",
      role: "client",
      registered: true,
    };
    useAuthMock.mockReturnValue({ user: registered, logout });
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole("button", { name: "Menu da conta" }));
    await user.click(screen.getByRole("menuitem", { name: "Sair" }));
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
