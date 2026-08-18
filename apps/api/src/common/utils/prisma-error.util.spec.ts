import { isUniqueConstraintError } from './prisma-error.util';

describe('isUniqueConstraintError', () => {
  it('reconhece um erro Prisma P2002 (violação de unicidade)', () => {
    expect(isUniqueConstraintError({ code: 'P2002' })).toBe(true);
  });

  it('rejeita outros códigos de erro Prisma', () => {
    expect(isUniqueConstraintError({ code: 'P2025' })).toBe(false);
  });

  it('rejeita erros genéricos sem campo code', () => {
    expect(isUniqueConstraintError(new Error('algo deu errado'))).toBe(false);
  });

  it('rejeita valores não-objeto (null, undefined, string, número)', () => {
    expect(isUniqueConstraintError(null)).toBe(false);
    expect(isUniqueConstraintError(undefined)).toBe(false);
    expect(isUniqueConstraintError('P2002')).toBe(false);
    expect(isUniqueConstraintError(2002)).toBe(false);
  });
});
