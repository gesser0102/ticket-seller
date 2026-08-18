import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MyTicketsPage } from "./MyTicketsPage";
import { apiClient } from "../../lib/apiClient";
import { makeTicket } from "../../test/fixtures";

vi.mock("../../lib/apiClient", () => ({
  apiClient: { get: vi.fn() },
  ApiError: class ApiError extends Error {},
}));

describe("MyTicketsPage", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
  });

  it("mostra o spinner enquanto carrega", () => {
    vi.mocked(apiClient.get).mockReturnValue(new Promise(() => undefined));
    render(<MyTicketsPage />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("mostra o estado vazio quando não há ingressos", async () => {
    vi.mocked(apiClient.get).mockResolvedValue([]);
    render(<MyTicketsPage />);
    expect(await screen.findByText("Você ainda não tem ingressos")).toBeInTheDocument();
  });

  it("mostra um card por ingresso", async () => {
    vi.mocked(apiClient.get).mockResolvedValue([
      makeTicket({ id: "t1", screening: { movieTitle: "Filme A", moviePosterUrl: "x", venue: "S1", startsAt: "2026-08-20T20:00:00.000Z" } }),
      makeTicket({ id: "t2", screening: { movieTitle: "Filme B", moviePosterUrl: "x", venue: "S2", startsAt: "2026-08-21T20:00:00.000Z" } }),
    ]);
    render(<MyTicketsPage />);
    expect(await screen.findByText("Filme A")).toBeInTheDocument();
    expect(screen.getByText("Filme B")).toBeInTheDocument();
  });

  it("abre o modal com o QR ao clicar num card", async () => {
    vi.mocked(apiClient.get).mockResolvedValue([makeTicket({ shortCode: "QRC-ODE1" })]);
    const user = userEvent.setup();
    render(<MyTicketsPage />);

    const card = await screen.findByRole("button", { name: /Filme Teste/ });
    await user.click(card);

    expect(screen.getByRole("dialog", { name: "Ingresso" })).toBeInTheDocument();
    expect(screen.getByText("QRC-ODE1")).toBeInTheDocument();
  });

  it("fecha o modal ao clicar em fechar", async () => {
    vi.mocked(apiClient.get).mockResolvedValue([makeTicket()]);
    const user = userEvent.setup();
    render(<MyTicketsPage />);

    await user.click(await screen.findByRole("button", { name: /Filme Teste/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("busca em /tickets/mine", () => {
    vi.mocked(apiClient.get).mockResolvedValue([]);
    render(<MyTicketsPage />);
    expect(apiClient.get).toHaveBeenCalledWith("/tickets/mine");
  });
});
