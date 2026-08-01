// Prévia client-side do SKU interno gerado pelo banco
// (public.next_internal_sku): LJFFORNECECECEDORSEQ.
// A numeração real só é conhecida no INSERT; aqui mostramos o padrão.

export function skuPrefix(orgCode: string | null | undefined): string {
  // Limpa caracteres especiais do código da organização
  const cleanCode = (orgCode || 'ADM').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `LJF${cleanCode}`;
}

export function skuPreview(orgCode: string | null | undefined): string {
  return `${skuPrefix(orgCode)}######`;
}

/** Confere se um SKU segue o formato interno simplificado de apenas letras e números. */
export function isInternalSku(sku: string | null | undefined): boolean {
  return !!sku && /^LJF[A-Z0-9]{2,12}\d{6}$/.test(sku);
}
