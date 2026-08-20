import { describe, expect, it } from "vitest";
import type { SeatDto } from "@ticket-seller/shared";
import { buildSeatMapLayout, SEAT_SIZE } from "./seatLayout";

function seat(row: string, number: number): SeatDto {
  return { id: `${row}${number}`, row, number, status: "available", heldByMe: false, ticketType: null };
}

describe("buildSeatMapLayout", () => {
  it("retorna uma fileira por letra de fileira distinta, ordenadas alfabeticamente", () => {
    const seats = [seat("B", 1), seat("A", 1), seat("C", 1)];
    const layout = buildSeatMapLayout(seats);
    expect(layout.rows.map((r) => r.row)).toEqual(["A", "B", "C"]);
  });

  it("ordena os assentos dentro da fileira por número, não pela ordem de entrada", () => {
    const seats = [seat("A", 3), seat("A", 1), seat("A", 2)];
    const layout = buildSeatMapLayout(seats);
    const numbers = layout.rows[0].seats.map((p) => p.seat.number);
    expect(numbers).toEqual([1, 2, 3]);
  });

  it("cada assento posicionado referencia o SeatDto original (nenhum é perdido ou duplicado)", () => {
    const seats = Array.from({ length: 12 }, (_, i) => seat("A", i + 1));
    const layout = buildSeatMapLayout(seats);
    const ids = layout.rows.flatMap((r) => r.seats.map((p) => p.seat.id));
    expect(new Set(ids).size).toBe(12);
    expect(ids.sort()).toEqual(seats.map((s) => s.id).sort());
  });

  it("assentos consecutivos na mesma fileira não se sobrepõem (distância x >= largura do assento)", () => {
    const seats = Array.from({ length: 6 }, (_, i) => seat("A", i + 1));
    const layout = buildSeatMapLayout(seats);
    const xs = layout.rows[0].seats.map((p) => p.x);
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(SEAT_SIZE);
    }
  });

  it("fileiras mais tarde (cursorY maior) ficam sempre abaixo das anteriores", () => {
    const seats = [seat("A", 1), seat("B", 1), seat("C", 1)];
    const layout = buildSeatMapLayout(seats);
    const rowMinY = layout.rows.map((r) => Math.min(...r.seats.map((p) => p.y)));
    expect(rowMinY[1]).toBeGreaterThan(rowMinY[0]);
    expect(rowMinY[2]).toBeGreaterThan(rowMinY[1]);
  });

  it("a largura e a altura totais cobrem todos os pontos posicionados (nada fica fora do canvas)", () => {
    const seats = [
      ...Array.from({ length: 14 }, (_, i) => seat("A", i + 1)),
      ...Array.from({ length: 8 }, (_, i) => seat("B", i + 1)),
    ];
    const layout = buildSeatMapLayout(seats);
    for (const row of layout.rows) {
      for (const p of row.seats) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x + SEAT_SIZE).toBeLessThanOrEqual(layout.width);
        expect(p.y).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("lista vazia produz um layout vazio sem lançar erro", () => {
    const layout = buildSeatMapLayout([]);
    expect(layout.rows).toEqual([]);
  });

  it("o rótulo da fileira (labelY) acompanha a posição do primeiro assento, não um valor fixo", () => {
    const seats = [seat("A", 1), seat("A", 2), seat("A", 3)];
    const layout = buildSeatMapLayout(seats);
    const [row] = layout.rows;
    expect(row.labelY).toBe(row.seats[0].y + SEAT_SIZE / 2);
  });
  it("no mobile aumenta o assento e o espaco visual entre assentos", () => {
    const seats = Array.from({ length: 6 }, (_, i) => seat("A", i + 1));
    const desktop = buildSeatMapLayout(seats);
    const mobile = buildSeatMapLayout(seats, { mobile: true });

    const desktopGap = desktop.rows[0].seats[1].x - desktop.rows[0].seats[0].x - desktop.seatSize;
    const mobileGap = mobile.rows[0].seats[1].x - mobile.rows[0].seats[0].x - mobile.seatSize;

    expect(mobile.seatSize).toBeGreaterThan(desktop.seatSize);
    expect(mobileGap).toBeGreaterThan(desktopGap);
  });
});
