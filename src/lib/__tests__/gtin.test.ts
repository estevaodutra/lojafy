import { describe, expect, it } from 'vitest';
import { computeGtinCheckDigit, isValidGtin, isValidGtinFormat } from '../gtin';

describe('gtin', () => {
  it('valida GTINs reais de todos os comprimentos', () => {
    expect(isValidGtin('96385074')).toBe(true); // GTIN-8
    expect(isValidGtin('036000291452')).toBe(true); // GTIN-12 (UPC-A)
    expect(isValidGtin('7891234567895')).toBe(true); // GTIN-13
    expect(isValidGtin('17891234567892')).toBe(true); // GTIN-14
  });

  it('rejeita dígito verificador incorreto', () => {
    expect(isValidGtin('96385075')).toBe(false);
    expect(isValidGtin('7891234567890')).toBe(false);
    expect(isValidGtin('036000291453')).toBe(false);
  });

  it('rejeita formatos inválidos', () => {
    expect(isValidGtin('')).toBe(false);
    expect(isValidGtin(null)).toBe(false);
    expect(isValidGtin(undefined)).toBe(false);
    expect(isValidGtin('abc1234567890')).toBe(false);
    expect(isValidGtin('123456789')).toBe(false); // 9 dígitos
    expect(isValidGtin('123456789012345')).toBe(false); // 15 dígitos
    expect(isValidGtinFormat('7891234567895')).toBe(true);
  });

  it('computa o dígito verificador do padrão GS1', () => {
    // exemplo canônico GS1: corpo 629104150021 → dígito 3
    expect(computeGtinCheckDigit('629104150021')).toBe(3);
    expect(computeGtinCheckDigit('789123456789')).toBe(5);
  });

  it('rejeita qualquer código com verificador deslocado (formato do trigger antigo)', () => {
    // pega um GTIN válido e troca o dígito verificador — sempre inválido
    const valid = '7891234567895';
    for (let d = 0; d <= 9; d++) {
      const candidate = valid.slice(0, -1) + String(d);
      expect(isValidGtin(candidate)).toBe(candidate === valid);
    }
  });
});
