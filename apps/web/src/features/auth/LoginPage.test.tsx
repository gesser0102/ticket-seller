import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { SessionUserDto } from "@ticket-seller/shared";
import { LoginPage } from "./LoginPage";
import { ApiError } from "../../lib/apiClient";

const useAuthMock = vi.fn();
vi.mock("./AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/tickets" element={<div>Meus ingressos</div>} />
        <Route path="/gate" element={<div>Console da portaria</div>} />
        <Route path="/organizer" element={<div>Painel do organizador</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const anonymousClient: SessionUserDto = {
  id: "anon-1",
  email: null,
  name: null,
  role: "client",
  registered: false,
};

describe("LoginPage", () => {
  it(
    "regressão: uma sessão anônima (client, ainda não cadastrada) NÃO é redirecionada — " +
      "isso já causou um loop infinito de redirect antes da correção",
    () => {
      useAuthMock.mockReturnValue({ user: anonymousClient, loading: false, login: vi.fn() });
      renderLoginPage();
      expect(screen.getByRole("heading", { name: "Entrar" })).toBeInTheDocument();
    },
  );

  it("não redireciona enquanto a sessão ainda está carregando, mesmo com usuário presente", () => {
    const registeredClient: SessionUserDto = { ...anonymousClient, registered: true, email: "c@c.com" };
    useAuthMock.mockReturnValue({ user: registeredClient, loading: true, login: vi.fn() });
    renderLoginPage();
    expect(screen.getByRole("heading", { name: "Entrar" })).toBeInTheDocument();
  });

  it("redireciona um cliente já cadastrado para /tickets", () => {
    const registeredClient: SessionUserDto = { ...anonymousClient, registered: true, email: "c@c.com" };
    useAuthMock.mockReturnValue({ user: registeredClient, loading: false, login: vi.fn() });
    renderLoginPage();
    expect(screen.getByText("Meus ingressos")).toBeInTheDocument();
  });

  it("redireciona a portaria para /gate", () => {
    const gate: SessionUserDto = { id: "g", email: "g@g.com", name: "G", role: "gate", registered: true };
    useAuthMock.mockReturnValue({ user: gate, loading: false, login: vi.fn() });
    renderLoginPage();
    expect(screen.getByText("Console da portaria")).toBeInTheDocument();
  });

  it("redireciona o organizador para /organizer", () => {
    const organizer: SessionUserDto = {
      id: "o",
      email: "o@o.com",
      name: "O",
      role: "organizer",
      registered: true,
    };
    useAuthMock.mockReturnValue({ user: organizer, loading: false, login: vi.fn() });
    renderLoginPage();
    expect(screen.getByText("Painel do organizador")).toBeInTheDocument();
  });

  it("envia e-mail e senha digitados para login()", async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    useAuthMock.mockReturnValue({ user: null, loading: false, login });
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText("E-mail"), "cliente@teste.dev");
    await user.type(screen.getByLabelText("Senha"), "senha123");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(login).toHaveBeenCalledWith("cliente@teste.dev", "senha123");
  });

  it("mostra a mensagem de erro do servidor quando o login falha", async () => {
    const login = vi.fn().mockRejectedValue(new ApiError("Credenciais inválidas.", 401));
    useAuthMock.mockReturnValue({ user: null, loading: false, login });
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText("E-mail"), "cliente@teste.dev");
    await user.type(screen.getByLabelText("Senha"), "senhaerrada");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Credenciais inválidas.")).toBeInTheDocument();
  });
});
