import { describe, expect, it } from 'vitest';
import { calculateOnboardingMlPrice } from '../../../supabase/functions/_shared/onboardingPrice';

describe('preço padrão do onboarding no Mercado Livre', () => {
  it('preserva 30% do preço de venda depois da taxa Clássico de 14%', () => {
    const salePrice = calculateOnboardingMlPrice(56);
    expect(salePrice).toBe(100);
    expect((salePrice - 56 - salePrice * 0.14) / salePrice).toBeCloseTo(0.30);
  });

  it('arredonda para cima e rejeita preço base inválido', () => {
    expect(calculateOnboardingMlPrice(8.90)).toBe(15.90);
    expect(() => calculateOnboardingMlPrice(0)).toThrow();
  });
});
