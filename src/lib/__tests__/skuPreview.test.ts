import { describe, expect, it } from 'vitest';
import { isInternalSku, skuPrefix, skuPreview } from '../skuPreview';

describe('skuPreview', () => {
  it('monta prefixo com org_code e fallback ADM', () => {
    expect(skuPrefix('FN')).toBe('LJFFN');
    expect(skuPrefix(null)).toBe('LJFADM');
  });

  it('prévia mostra o padrão com sequência mascarada', () => {
    expect(skuPreview('A1B2')).toBe('LJFA1B2######');
  });

  it('reconhece SKUs internos apenas alfanuméricos com 6 dígitos de sequência', () => {
    expect(isInternalSku('LJFA1B2000042')).toBe(true);
    expect(isInternalSku('LJFADM000001')).toBe(true);
    expect(isInternalSku('LJF-ADM-000001')).toBe(false); // contém traço
    expect(isInternalSku('CAM-PREM-001')).toBe(false); // contém traço
    expect(isInternalSku(null)).toBe(false);
  });
});
