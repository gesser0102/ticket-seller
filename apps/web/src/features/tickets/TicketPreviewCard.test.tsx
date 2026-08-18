import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TicketPreviewCard } from "./TicketPreviewCard";
import { makeTicket } from "../../test/fixtures";

describe("TicketPreviewCard", () => {
  it("mostra título, sala, data e assento", () => {
    render(
      <TicketPreviewCard
        ticket={makeTicket({
          screening: {
            movieTitle: "Batman",
            moviePosterUrl: "x",
            venue: "Sala 2",
            startsAt: "2026-08-20T20:00:00.000Z",
          },
          seat: { row: "B", number: 7 },
        })}
        onClick={vi.fn()}
      />,
    );
    expect(screen.getByText("Batman")).toBeInTheDocument();
    expect(screen.getByText("Sala 2")).toBeInTheDocument();
    expect(screen.getByText(/Fileira B · Assento 7/)).toBeInTheDocument();
  });

  it("mostra o badge de status pra um ingresso válido", () => {
    render(<TicketPreviewCard ticket={makeTicket({ status: "valid" })} onClick={vi.fn()} />);
    expect(screen.getByText("Válido")).toBeInTheDocument();
  });

  it("mostra a faixa e não o badge pra um ingresso utilizado", () => {
    render(<TicketPreviewCard ticket={makeTicket({ status: "used" })} onClick={vi.fn()} />);
    expect(screen.queryByText("Válido")).not.toBeInTheDocument();
    expect(screen.getByText("Utilizado")).toBeInTheDocument();
  });

  it("chama onClick ao clicar no card", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<TicketPreviewCard ticket={makeTicket()} onClick={onClick} />);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("usa o pôster do filme como imagem", () => {
    const { container } = render(
      <TicketPreviewCard
        ticket={makeTicket({
          screening: {
            movieTitle: "X",
            moviePosterUrl: "https://example.com/poster-especifico.jpg",
            venue: "Sala 1",
            startsAt: "2026-08-20T20:00:00.000Z",
          },
        })}
        onClick={vi.fn()}
      />,
    );
    expect(container.querySelector("img")).toHaveAttribute("src", "https://example.com/poster-especifico.jpg");
  });
});
