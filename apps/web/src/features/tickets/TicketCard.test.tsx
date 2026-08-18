import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TicketCard } from "./TicketCard";
import { makeTicket } from "../../test/fixtures";

function stubClipboard(): { writeText: ReturnType<typeof vi.fn> } {
  const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
  Object.defineProperty(navigator, "clipboard", { value: clipboard, configurable: true });
  return clipboard;
}

describe("TicketCard", () => {
  beforeEach(() => {
    stubClipboard();
  });

  it("mostra o badge de status para um ingresso válido", () => {
    render(<TicketCard ticket={makeTicket({ status: "valid" })} />);
    expect(screen.getByText("Válido")).toBeInTheDocument();
  });

  it("não mostra o badge de topo para um ingresso utilizado, mas mostra a faixa", () => {
    render(<TicketCard ticket={makeTicket({ status: "used" })} />);
    expect(screen.queryByText("Válido")).not.toBeInTheDocument();
    expect(screen.getByText("Utilizado")).toBeInTheDocument();
  });

  it("mostra filme, sala, assento e tipo de ingresso", () => {
    render(
      <TicketCard
        ticket={makeTicket({
          screening: {
            movieTitle: "Clube da Luta",
            moviePosterUrl: "x",
            venue: "Sala 3",
            startsAt: "2026-08-20T20:00:00.000Z",
          },
          seat: { row: "E", number: 5 },
          type: "meia",
        })}
      />,
    );
    expect(screen.getByText("Clube da Luta")).toBeInTheDocument();
    expect(screen.getByText("Sala 3")).toBeInTheDocument();
    expect(screen.getByText(/Fileira E · Assento 5 · Meia/)).toBeInTheDocument();
  });

  it('mostra "Inteira" quando o tipo não é meia', () => {
    render(<TicketCard ticket={makeTicket({ type: "inteira" })} />);
    expect(screen.getByText(/Inteira/)).toBeInTheDocument();
  });

  it("mostra quando o ingresso foi utilizado, se houver usedAt", () => {
    render(<TicketCard ticket={makeTicket({ status: "used", usedAt: "2026-08-20T21:00:00.000Z" })} />);
    expect(screen.getByText(/Utilizado em/)).toBeInTheDocument();
  });

  it("mostra o botão de compartilhar por padrão", () => {
    render(<TicketCard ticket={makeTicket()} />);
    expect(screen.getByRole("button", { name: /Compartilhar ingresso/ })).toBeInTheDocument();
  });

  it("esconde o botão de compartilhar quando allowShare é false", () => {
    render(<TicketCard ticket={makeTicket()} allowShare={false} />);
    expect(screen.queryByRole("button", { name: /Compartilhar ingresso/ })).not.toBeInTheDocument();
  });

  it("copia o link do ingresso pro clipboard e mostra feedback ao clicar em compartilhar", async () => {
    const user = userEvent.setup();
    const clipboard = stubClipboard();
    render(<TicketCard ticket={makeTicket({ token: "meu-token" })} />);

    await user.click(screen.getByRole("button", { name: /Compartilhar ingresso/ }));

    expect(clipboard.writeText).toHaveBeenCalledWith(`${window.location.origin}/i/meu-token`);
    expect(await screen.findByText("Link copiado")).toBeInTheDocument();
  });

  it("usa window.prompt como alternativa quando o clipboard falha", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error("nope")) },
      configurable: true,
    });
    const promptSpy = vi.spyOn(window, "prompt").mockImplementation(() => null);
    render(<TicketCard ticket={makeTicket({ token: "meu-token" })} />);

    await user.click(screen.getByRole("button", { name: /Compartilhar ingresso/ }));

    expect(promptSpy).toHaveBeenCalledWith(
      "Copie o link do ingresso:",
      `${window.location.origin}/i/meu-token`,
    );
  });

  it("mostra o código curto no QR", () => {
    render(<TicketCard ticket={makeTicket({ shortCode: "XYZ-789" })} />);
    expect(screen.getByText("XYZ-789")).toBeInTheDocument();
  });
});
