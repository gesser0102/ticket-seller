import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SessionUserDto } from "@ticket-seller/shared";
import { AuthProvider, useAuth } from "./AuthContext";
import { ApiError, apiClient } from "../../lib/apiClient";

vi.mock("../../lib/apiClient", async () => {
  const actual = await vi.importActual<typeof import("../../lib/apiClient")>("../../lib/apiClient");
  return {
    ApiError: actual.ApiError,
    apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  };
});

const client: SessionUserDto = { id: "1", email: "c@c.com", name: "C", role: "client", registered: true };

function Probe() {
  const { user, loading, login, logout, completeRegistration } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.email : "null"}</span>
      <button onClick={() => login("c@c.com", "senha123").catch(() => undefined)}>login</button>
      <button onClick={() => logout()}>logout</button>
      <button onClick={() => completeRegistration(client)}>completar</button>
    </div>
  );
}

describe("AuthProvider / useAuth", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
    vi.mocked(apiClient.post).mockReset();
  });

  it("começa carregando e resolve o usuário a partir de /auth/me", async () => {
    vi.mocked(apiClient.get).mockResolvedValue(client);
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(screen.getByTestId("loading")).toHaveTextContent("true");
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("user")).toHaveTextContent("c@c.com");
    expect(apiClient.get).toHaveBeenCalledWith("/auth/me");
  });

  it("sem sessão válida (/auth/me falha), termina o carregamento com usuário nulo", async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new ApiError("Sessão inválida.", 401));
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("user")).toHaveTextContent("null");
  });

  it("login atualiza o usuário em memória com o que o servidor retornou", async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new ApiError("Sem sessão.", 401));
    vi.mocked(apiClient.post).mockResolvedValue(client);
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));

    await user.click(screen.getByText("login"));
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("c@c.com"));
    expect(apiClient.post).toHaveBeenCalledWith("/auth/login", { email: "c@c.com", password: "senha123" });
  });

  it("logout limpa o usuário mesmo que a chamada ao servidor falhe com ApiError", async () => {
    vi.mocked(apiClient.get).mockResolvedValue(client);
    vi.mocked(apiClient.post).mockRejectedValue(new ApiError("Sessão já expirada.", 401));
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("c@c.com"));

    await user.click(screen.getByText("logout"));
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("null"));
  });

  it("completeRegistration substitui o usuário em memória sem nova chamada de rede", async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new ApiError("Sem sessão.", 401));
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));

    const callsBefore = vi.mocked(apiClient.post).mock.calls.length;
    await user.click(screen.getByText("completar"));
    expect(screen.getByTestId("user")).toHaveTextContent("c@c.com");
    expect(vi.mocked(apiClient.post).mock.calls.length).toBe(callsBefore);
  });
});
