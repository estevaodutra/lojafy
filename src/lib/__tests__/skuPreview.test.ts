import { describe, expect, it } from 'vitest';
import { isInternalSku, skuCategoryFragment, skuPrefix, skuPreview } from '../skuPreview';

describe('skuPreview', () => {
  it('gera fragmento de categoria de 3 letras', () => {
    expect(skuCategoryFragment('Eletrônicos')).toBe('ELE');
    expect(skuCategoryFragment('Moda e Acessórios')).toBe('MOD');
    expect(skuCategoryFragment(null)).toBe('GEN');
    expect(skuCategoryFragment('123')).toBe('GEN');
  });

  it('monta prefixo com org_code e fallback ADM', () => {
    expect(skuPrefix('A1B2', 'Casa')).toBe('LJF-A1B2-CAS');
    expect(skuPrefix(null)).toBe('LJF-ADM-GEN');
  });

  it('prévia mostra o padrão com sequência mascarada', () => {
    expect(skuPreview('A1B2')).toBe('LJF-A1B2-GEN-#####');
  });

  it('reconhece SKUs internos', () => {
    expect(isInternalSku('LJF-A1B2-ELE-00042')).toBe(true);
    expect(isInternalSku('LJF-ADM-GEN-00001')).toBe(true);
    expect(isInternalSku('CAM-PREM-001')).toBe(false);
    expect(isInternalSku(null)).toBe(false);
  });
});
