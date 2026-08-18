import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SharedTicketPage } from "./SharedTicketPage";
import { apiClient, ApiError } from "../../lib/apiClient";
import { makeTicket } from "../../test/fixtures";

vi.mock("../../lib/apiClient", async () => {
  const actual = await vi.importActual<typeof import("../../lib/apiClient")>("../../lib/apiClient");
  return { ApiError: actual.ApiError, apiClient: { get: vi.fn() } };
});

function renderAt(token: string) {
  return render(
    <MemoryRouter initialEntries={[`/i/${token}`]}>
      <Routes>
        <Route path="/i/:token" element={<SharedTicketPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SharedTicketPage", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
  });

  it("mostra o spinner enquanto carrega", () => {
    vi.mocked(apiClient.get).mockReturnValue(new Promise(() => undefined));
    renderAt("tok123");
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("busca o ingresso pelo token da URL", () => {
    vi.mocked(apiClient.get).mockReturnValue(new Promise(() => undefined));
    renderAt("meu-token-especifico");
    expect(apiClient.get).toHaveBeenCalledWith("/tickets/share/meu-token-especifico");
  });

  it("mostra o ingresso sem o botão de compartilhar", async () => {
    vi.mocked(apiClient.get).mockResolvedValue(makeTicket({ screening: { movieTitle: "Filme Público", moviePosterUrl: "x", venue: "S1", startsAt: "2026-08-20T20:00:00.000Z" } }));
    renderAt("tok123");
    expect(await screen.findByText("Filme Público")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Compartilhar/ })).not.toBeInTheDocument();
  });

  it("mostra estado de não encontrado quando o token é inválido", async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new ApiError("Ingresso não encontrado.", 404));
    renderAt("token-invalido");
    expect(await screen.findByText("Ingresso não encontrado")).toBeInTheDocument();
  });
});
