import { describe, expect, it } from 'vitest';
import {
  attributeRichness,
  computeCompatibilityScore,
  priceProximity,
  titleSimilarity,
} from '../referenceScoring';

const product = { name: 'Camiseta Algodão Premium Azul', price: 89.9 };

describe('referenceScoring', () => {
  it('titleSimilarity: idêntico = 1, disjunto = 0, acento-insensível', () => {
    expect(titleSimilarity('Camiseta Azul', 'Camiseta Azul')).toBe(1);
    expect(titleSimilarity('Camiseta Azul', 'Furadeira Bosch')).toBe(0);
    expect(titleSimilarity('Camiseta Algodão', 'camiseta algodao')).toBe(1);
  });

  it('priceProximity: 1 quando igual, cai com a distância, 0 sem preço', () => {
    expect(priceProximity(100, 100)).toBe(1);
    expect(priceProximity(100, 50)).toBe(0.5);
    expect(priceProximity(100, null)).toBe(0);
    expect(priceProximity(100, 0)).toBe(0);
  });

  it('attributeRichness satura em 20', () => {
    expect(attributeRichness(0)).toBe(0);
    expect(attributeRichness(10)).toBe(0.5);
    expect(attributeRichness(20)).toBe(1);
    expect(attributeRichness(50)).toBe(1);
  });

  it('score é monotônico em cada dimensão', () => {
    const base = {
      title: 'Camiseta Algodão Premium Azul',
      price: 89.9,
      attributeCount: 5,
      hasGtin: false,
    };
    const withGtin = computeCompatibilityScore(product, { ...base, hasGtin: true });
    const withoutGtin = computeCompatibilityScore(product, base);
    expect(withGtin).toBeGreaterThan(withoutGtin);

    const moreAttrs = computeCompatibilityScore(product, { ...base, attributeCount: 15 });
    expect(moreAttrs).toBeGreaterThan(withoutGtin);

    const worseTitle = computeCompatibilityScore(product, { ...base, title: 'Furadeira Bosch 500W' });
    expect(worseTitle).toBeLessThan(withoutGtin);

    const worsePrice = computeCompatibilityScore(product, { ...base, price: 500 });
    expect(worsePrice).toBeLessThan(withoutGtin);
  });

  it('score máximo fica no teto de 100', () => {
    const perfect = computeCompatibilityScore(product, {
      title: product.name,
      price: product.price,
      attributeCount: 30,
      hasGtin: true,
      categoryMatches: true,
    });
    expect(perfect).toBe(100);
  });
});
