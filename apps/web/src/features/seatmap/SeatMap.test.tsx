import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SeatMap } from "./SeatMap";
import { makeSeat } from "../../test/fixtures";

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

describe("SeatMap", () => {
  beforeEach(() => {
    stubMatchMedia(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renderiza fileiras e assentos no layout mobile sem perder labels", () => {
    render(
      <SeatMap
        seats={[
          makeSeat({ id: "a1", row: "A", number: 1 }),
          makeSeat({ id: "a2", row: "A", number: 2 }),
          makeSeat({ id: "b1", row: "B", number: 1, status: "sold" }),
        ]}
        pendingSeatId={null}
        onSeatClick={vi.fn()}
      />,
    );

    expect(screen.getByRole("group", { name: "Mapa de assentos" })).toHaveClass("seatmap-svg");
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("permite selecionar assento disponivel via teclado", () => {
    const onSeatClick = vi.fn();
    render(
      <SeatMap
        seats={[makeSeat({ id: "a1", row: "A", number: 1 })]}
        pendingSeatId={null}
        onSeatClick={onSeatClick}
      />,
    );

    const seat = screen.getByRole("button", { name: /Assento A1.*dispon/ });
    fireEvent.keyDown(seat, { key: "Enter" });

    expect(onSeatClick).toHaveBeenCalledWith(expect.objectContaining({ id: "a1" }));
  });

  it("nao transforma assento vendido em controle clicavel", () => {
    render(
      <SeatMap
        seats={[makeSeat({ id: "a1", row: "A", number: 1, status: "sold" })]}
        pendingSeatId={null}
        onSeatClick={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: /vendido/ })).not.toBeInTheDocument();
  });
});
