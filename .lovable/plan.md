

# Adicionar campo de referência externa (Mercado Livre) no card de produto

## O que será feito

Adicionar um novo campo no card de cada produto na lista "Top Produtos" para o revendedor informar/visualizar o link de referência externa do anúncio (ex: link do Mercado Livre). Esse campo ficará entre o "Produto Base" e o "Seu Anúncio".

## Alterações

### `src/pages/reseller/TopProdutosVencedores.tsx`

1. **Atualizar o estado do checklist** para incluir `referenceLink` além de `completed` e `userLink`
2. **Adicionar handler** `handleUpdateReferenceLink` para salvar o link de referência no localStorage
3. **Adicionar novo campo no card** entre "Produto Base" e "Seu Anúncio":
   - Label: "Referência Externa:" (com ícone do Mercado Livre ou link externo)
   - Input para colar o link do anúncio de referência
   - Botão para abrir o link em nova aba (quando preenchido)
4. **Atualizar o `useMemo`** para incluir `referenceLink` do checklist

O layout do card ficará:
```
[checkbox] [número] Nome do Produto
PRODUTO BASE: Abrir Lojafy 🔗 📋
REFERÊNCIA EXTERNA: [input: Cole o link de referência (ex: Mercado Livre)] 🔗
SEU ANÚNCIO: [input: Cole o link do seu anúncio aqui]
```

