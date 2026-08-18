import { describe, expect, it } from "vitest";
import { formatCpf, formatPhone, onlyDigits } from "./masks";

describe("onlyDigits", () => {
  it("remove tudo que não é dígito", () => {
    expect(onlyDigits("123.456.789-00")).toBe("12345678900");
    expect(onlyDigits("(11) 9 8765-4321")).toBe("11987654321");
    expect(onlyDigits("abc")).toBe("");
  });
});

describe("formatCpf", () => {
  it("formata progressivamente enquanto o usuário digita", () => {
    expect(formatCpf("1")).toBe("1");
    expect(formatCpf("12")).toBe("12");
    expect(formatCpf("123")).toBe("123");
    expect(formatCpf("1234")).toBe("123.4");
    expect(formatCpf("123456")).toBe("123.456");
    expect(formatCpf("123456789")).toBe("123.456.789");
    expect(formatCpf("12345678900")).toBe("123.456.789-00");
  });

  it("ignora dígitos além do 11º", () => {
    expect(formatCpf("123456789001234")).toBe("123.456.789-00");
  });

  it("aceita entrada já mascarada (re-digitar sobre o valor formatado)", () => {
    expect(formatCpf("123.456.789-00")).toBe("123.456.789-00");
  });
});

describe("formatPhone", () => {
  it("formata progressivamente com DDD + 9º dígito + resto", () => {
    expect(formatPhone("")).toBe("");
    expect(formatPhone("1")).toBe("(1");
    expect(formatPhone("11")).toBe("(11) ");
    expect(formatPhone("119")).toBe("(11) 9");
    expect(formatPhone("11987")).toBe("(11) 9 87");
    expect(formatPhone("11987654321")).toBe("(11) 9 8765-4321");
  });

  it("ignora dígitos além do 11º", () => {
    expect(formatPhone("119876543219999")).toBe("(11) 9 8765-4321");
  });
});
