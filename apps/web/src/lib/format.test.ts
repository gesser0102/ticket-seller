import { describe, expect, it } from "vitest";
import { centsToReaisInput, formatCents, formatCountdown, parseReaisToCents } from "./format";

function normalizeSpaces(value: string): string {
  return value.replace(/\s/g, " ");
}

describe("formatCents", () => {
  it("formata centavos como moeda BRL", () => {
    expect(normalizeSpaces(formatCents(4500))).toBe("R$ 45,00");
    expect(normalizeSpaces(formatCents(100))).toBe("R$ 1,00");
    expect(normalizeSpaces(formatCents(0))).toBe("R$ 0,00");
  });

  it("arredonda centavos fracionários corretamente na exibição", () => {
    expect(normalizeSpaces(formatCents(4501))).toBe("R$ 45,01");
  });
});

describe("parseReaisToCents / centsToReaisInput são inversas", () => {
  it("converte string em reais (vírgula) para centavos inteiros", () => {
    expect(parseReaisToCents("45,00")).toBe(4500);
    expect(parseReaisToCents("45,50")).toBe(4550);
    expect(parseReaisToCents("0,01")).toBe(1);
  });

  it("centsToReaisInput produz o texto com vírgula que parseReaisToCents entende de volta", () => {
    for (const cents of [0, 1, 100, 4500, 4550, 999999]) {
      expect(parseReaisToCents(centsToReaisInput(cents))).toBe(cents);
    }
  });
});

describe("formatCountdown", () => {
  it("formata minutos:segundos com segundos preenchidos com zero à esquerda", () => {
    expect(formatCountdown(65_000)).toBe("1:05");
    expect(formatCountdown(600_000)).toBe("10:00");
    expect(formatCountdown(5_000)).toBe("0:05");
  });

  it("nunca fica negativo — tempo já esgotado vira 0:00", () => {
    expect(formatCountdown(-5000)).toBe("0:00");
    expect(formatCountdown(0)).toBe("0:00");
  });

  it("arredonda para baixo dentro do segundo corrente", () => {
    expect(formatCountdown(1_999)).toBe("0:01");
  });
});
