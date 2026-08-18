import { generateShortCode, SHORT_CODE_PATTERN } from './short-code.util';

describe('short-code.util', () => {
  it('gera um código no formato XXX-XXX', () => {
    const code = generateShortCode();
    expect(code).toMatch(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/);
    expect(code).toHaveLength(7);
  });

  it('nunca usa caracteres ambíguos (I, L, O, 0, 1)', () => {
    for (let i = 0; i < 500; i++) {
      const code = generateShortCode();
      expect(code).not.toMatch(/[ILO01]/);
    }
  });

  it('SHORT_CODE_PATTERN aceita exatamente o formato gerado', () => {
    for (let i = 0; i < 50; i++) {
      expect(SHORT_CODE_PATTERN.test(generateShortCode())).toBe(true);
    }
  });

  it('SHORT_CODE_PATTERN rejeita formatos inválidos', () => {
    expect(SHORT_CODE_PATTERN.test('AB-CDE')).toBe(false);
    expect(SHORT_CODE_PATTERN.test('ABCDEF')).toBe(false);
    expect(SHORT_CODE_PATTERN.test('ABC-DEF ')).toBe(false);
    expect(SHORT_CODE_PATTERN.test('abc-def')).toBe(false);
    expect(SHORT_CODE_PATTERN.test('AB1-DEF')).toBe(false);
    expect(SHORT_CODE_PATTERN.test('AI0-DEF')).toBe(false);
  });

  it('gera códigos distintos em chamadas sucessivas (não é uma constante)', () => {
    const codes = new Set(
      Array.from({ length: 20 }, () => generateShortCode()),
    );
    expect(codes.size).toBeGreaterThan(1);
  });
});
