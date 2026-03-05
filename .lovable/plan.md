

# Alterações nos cards de produtos - Top 10

## Resumo das mudanças

Nos cards de produto da página Top Produtos:

1. **Remover** o campo "Seu Anúncio" (input + label)
2. **Transformar** "Referência Externa" de input editável para **botão** "Ver Referência" (abre link em nova aba, visível apenas quando há link cadastrado pelo admin)
3. **Transformar** "Produto Base" (label + botão + copiar) em um **botão único** "Abrir Lojafy" mais limpo

## Alterações em `src/pages/reseller/TopProdutosVencedores.tsx`

### Dentro do card (linhas ~278-312), substituir os 3 blocos por:

```tsx
<div className="flex items-center gap-2 flex-wrap">
  <Button variant="outline" size="sm" className="h-8 text-xs"
    onClick={() => window.open(product.productUrl, '_blank')}>
    Abrir Lojafy <ExternalLink className="w-3 h-3 ml-1" />
  </Button>
  <Button variant="ghost" size="icon" className="h-7 w-7"
    onClick={() => handleCopyLink(product.productUrl, product.id)}>
    {copiedId === product.id ? <Check ... /> : <Copy ... />}
  </Button>
  {product.referenceLink && (
    <Button variant="outline" size="sm" className="h-8 text-xs"
      onClick={() => window.open(product.referenceLink, '_blank')}>
      Ver Referência <ExternalLink className="w-3 h-3 ml-1" />
    </Button>
  )}
</div>
```

### Limpeza
- Remover `handleUpdateLink` e `handleUpdateReferenceLink` (não mais necessários na página do revendedor)
- Remover `userLink` do estado/checklist do revendedor
- Manter `referenceLink` apenas como leitura vindo do banco (via `useFeatureProducts`)

