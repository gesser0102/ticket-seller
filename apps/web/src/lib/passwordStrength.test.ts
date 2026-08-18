import { describe, expect, it } from "vitest";
import { evaluatePasswordStrength } from "./passwordStrength";

describe("evaluatePasswordStrength", () => {
  it('classifica senha curta e simples como "fraca"', () => {
    expect(evaluatePasswordStrength("abc").level).toBe("fraca");
    expect(evaluatePasswordStrength("12345").level).toBe("fraca");
  });

  it('classifica senha de 10+ caracteres, só minúsculas, como "media"', () => {
    expect(evaluatePasswordStrength("abcdefghij").level).toBe("media");
  });

  it('mistura de maiúscula+minúscula+dígito sobe para "forte"', () => {
    expect(evaluatePasswordStrength("Abcdef123").level).toBe("forte");
  });

  it('senha longa com maiúscula, dígito e caractere especial é "muito-forte"', () => {
    expect(evaluatePasswordStrength("Abcdefghij123!@#").level).toBe("muito-forte");
  });

  it("nunca bloqueia — sempre retorna uma classificação, mesmo para string vazia", () => {
    const result = evaluatePasswordStrength("");
    expect(result.level).toBe("fraca");
    expect(result.score).toBe(0);
  });

  it("o score é monotonicamente não decrescente à medida que a senha fica mais forte", () => {
    const weak = evaluatePasswordStrength("abc").score;
    const medium = evaluatePasswordStrength("abcdefghij").score;
    const strong = evaluatePasswordStrength("Abcdefghij123!@#").score;
    expect(weak).toBeLessThanOrEqual(medium);
    expect(medium).toBeLessThanOrEqual(strong);
  });
});
