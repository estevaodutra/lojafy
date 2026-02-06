
# Plano: Reorganizar Botões na Coluna Lateral do Card

## Resumo

Mover o botão "Mercado Livre" para dentro da coluna de ações lateral, junto com os outros botões, eliminando a linha separada no rodapé do card.

---

## Layout Desejado

```text
┌──────────────────────────────────────────────────────────────────┐
│  [Img]  │  Nome do Produto                     │  [Ativo]       │
│         │  SKU: XXX                            │                │
│         │  Preço Original  |  Seu Preço        │  [Desativar  ] │
│         │                                      │  [Ver na Loja] │
│         │                                      │  [Mercado Livre]│
│         │                                      │  [Remover     ] │
└──────────────────────────────────────────────────────────────────┘
```

Todos os 4 botões na mesma coluna vertical, com largura uniforme.

---

## Alterações Necessárias

### Arquivo: `src/pages/reseller/Products.tsx`

1. **Remover seção separada do Mercado Livre** (linhas 397-409)
   - Eliminar a `div` com `mt-4 pt-4 border-t` que contém o `MercadoLivreButton`

2. **Adicionar botão ML na coluna de ações** (após "Ver na Loja", antes de "Remover")
   - Inserir `MercadoLivreButton` dentro da `div className="flex flex-col gap-2"` (linha 336)
   - Usar versão compacta do botão para caber na coluna

3. **Padronizar largura dos botões**
   - Adicionar `min-w-[130px]` à div container
   - Aplicar `w-full` a todos os botões para largura uniforme

---

## Código Atual vs Novo

**Antes (coluna de botões):**
```jsx
<div className="flex flex-col gap-2">
  <Button>Desativar</Button>
  <Button>Ver na Loja</Button>
  <Button>Remover</Button>
</div>
// ... separado:
<div className="mt-4 pt-4 border-t">
  <MercadoLivreButton />
</div>
```

**Depois (todos na mesma coluna):**
```jsx
<div className="flex flex-col gap-2 min-w-[130px]">
  <Button className="w-full">Desativar</Button>
  <Button className="w-full">Ver na Loja</Button>
  {hasActiveIntegration && product.product && (
    <MercadoLivreButton compact />
  )}
  <Button className="w-full">Remover</Button>
</div>
```

---

## Modificação do MercadoLivreButton

Adicionar prop `compact` para versão menor com texto curto:
- Normal: "Publicar no Mercado Livre"
- Compact: "Mercado Livre"

Atualizar `src/components/reseller/MercadoLivreButton.tsx`:
```tsx
interface MercadoLivreButtonProps {
  // ... props existentes
  compact?: boolean;
}

// No render:
{compact ? "Mercado Livre" : "Publicar no Mercado Livre"}
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/reseller/Products.tsx` | Mover botão ML para coluna lateral, padronizar larguras |
| `src/components/reseller/MercadoLivreButton.tsx` | Adicionar prop `compact` para versão curta |

---

## Resultado Esperado

1. Todos os 4 botões (Desativar, Ver na Loja, Mercado Livre, Remover) na mesma coluna
2. Largura uniforme de 130px mínimo
3. Card sem linha separada no rodapé
4. Visual limpo e organizado conforme solicitado
