// Score de compatibilidade entre o produto do Estágio 1 e um anúncio de
// referência do Mercado Livre. Determinístico e monotônico em cada dimensão:
// mais similaridade/atributos/GTIN ⇒ score maior.

export interface ReferenceCandidateInput {
  title: string;
  price: number | null;
  attributeCount: number;
  hasGtin: boolean;
  categoryMatches?: boolean;
}

export interface ProductBasics {
  name: string;
  price: number;
}

/** Similaridade de títulos por sobreposição de tokens (0..1). */
export function titleSimilarity(a: string, b: string): number {
  const tokenize = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length > 2),
    );
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let common = 0;
  ta.forEach((t) => {
    if (tb.has(t)) common += 1;
  });
  return common / Math.max(ta.size, tb.size);
}

/** Proximidade de preço (0..1): 1 quando igual, caindo com a razão. */
export function priceProximity(productPrice: number, candidatePrice: number | null): number {
  if (!candidatePrice || candidatePrice <= 0 || productPrice <= 0) return 0;
  const ratio = Math.min(productPrice, candidatePrice) / Math.max(productPrice, candidatePrice);
  return ratio;
}

/** Riqueza de atributos (0..1), saturando em 20 atributos. */
export function attributeRichness(count: number): number {
  return Math.min(Math.max(count, 0), 20) / 20;
}

/**
 * Score final 0..100.
 * Pesos: título 40, preço 20, atributos 20, GTIN 15, categoria 5.
 */
export function computeCompatibilityScore(
  product: ProductBasics,
  candidate: ReferenceCandidateInput,
): number {
  const score =
    titleSimilarity(product.name, candidate.title) * 40 +
    priceProximity(product.price, candidate.price) * 20 +
    attributeRichness(candidate.attributeCount) * 20 +
    (candidate.hasGtin ? 15 : 0) +
    (candidate.categoryMatches ? 5 : 0);
  return Math.round(score * 10) / 10;
}
