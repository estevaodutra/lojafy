// Prévia client-side do SKU interno gerado pelo banco
// (public.next_internal_sku): LJF-{org_code|ADM}-{CAT|GEN}-{SEQ}.
// A numeração real só é conhecida no INSERT; aqui mostramos o padrão.

export function skuCategoryFragment(categoryName: string | null | undefined): string {
  const cleaned = (categoryName ?? '').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 3);
  return cleaned || 'GEN';
}

export function skuPrefix(orgCode: string | null | undefined, categoryName?: string | null): string {
  return `LJF-${orgCode || 'ADM'}-${skuCategoryFragment(categoryName)}`;
}

export function skuPreview(orgCode: string | null | undefined, categoryName?: string | null): string {
  return `${skuPrefix(orgCode, categoryName)}-#####`;
}

/** Confere se um SKU segue o formato interno. */
export function isInternalSku(sku: string | null | undefined): boolean {
  return !!sku && /^LJF-[A-Z0-9]{2,4}-[A-Z]{3}-\d{5}$/.test(sku);
}
