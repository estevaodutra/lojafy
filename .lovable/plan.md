

# Plano: Otimizar disposição dos cards de categorias no chat de suporte

## Problema

O seletor de categorias do chat de suporte tem 12 categorias exibidas em um grid 2x2 com ícone grande, nome e descrição. Isso causa:
- Cards grandes demais para o espaço do widget (400x600px)
- Descrições cortadas (`line-clamp-2`)
- Muito scroll necessário para ver todas as categorias
- Layout visualmente pesado

## Solução

Reorganizar os cards com um layout mais compacto e eficiente:

### Alterações no `src/components/support/ChatInterface.tsx`

1. **Reduzir padding dos cards** de `p-4` para `p-3`
2. **Layout horizontal nos cards** - ícone ao lado do texto (em linha), em vez de ícone em cima e texto embaixo (em coluna)
3. **Reduzir tamanho do ícone** de `h-6 w-6` para `h-5 w-5`
4. **Reduzir gap do grid** de `gap-3` para `gap-2`
5. **Limitar descrição a 1 linha** - trocar `line-clamp-2` para `line-clamp-1`
6. **Reduzir espaçamento geral** do container de `p-6 space-y-6` para `p-4 space-y-4`

### Resultado visual esperado

Cada card ficará mais compacto com layout horizontal:

```text
+------------------+------------------+
| [icon] Pedidos   | [icon] Entrega   |
| Dúvidas sobre... | Rastreamento,... |
+------------------+------------------+
| [icon] Pagamento | [icon] Produtos  |
| Problemas com... | Informações s... |
+------------------+------------------+
```

Isso permitirá que mais categorias fiquem visíveis sem scroll, mantendo a usabilidade e legibilidade.

## Detalhes Técnicos

No grid de categorias (linhas 172-192), as mudanças serão:

**Container:**
- `p-6 space-y-6` para `p-4 space-y-4`
- `grid grid-cols-2 gap-3` para `grid grid-cols-2 gap-2`

**Cards (Button):**
- `h-auto p-4 flex flex-col items-start gap-2` para `h-auto p-3 flex flex-row items-start gap-2`

**Ícone:**
- `h-6 w-6` para `h-5 w-5 shrink-0 mt-0.5`

**Descrição:**
- `line-clamp-2` para `line-clamp-1`

