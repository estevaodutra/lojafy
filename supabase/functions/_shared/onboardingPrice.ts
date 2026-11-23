// Preço de venda com 14% de taxa Clássico do ML e 30% de margem líquida alvo.
export function calculateOnboardingMlPrice(basePrice: number): number {
  if (!Number.isFinite(basePrice) || basePrice <= 0) throw new Error('Produto sem preço base válido');
  return Math.ceil(basePrice / (1 - 0.14 - 0.30) * 100) / 100;
}
