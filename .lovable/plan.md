
# Plano: Reorganizar Layout dos Botões no Card do Catálogo

## Resumo

Modificar o layout dos botões para que fiquem em duas linhas:
- **Linha 1**: Botões "Adicionar" e "Calcular" lado a lado
- **Linha 2**: Botão "Publicar no Mercado Livre" ocupando largura total

---

## Layout Desejado

```text
┌────────────────────────────────────────────┐
│  [+ Adicionar]  [Calcular]                 │
│  ─────────────────────────────────────     │
│  [Publicar no Mercado Livre]               │
└────────────────────────────────────────────┘
```

---

## Alterações Necessárias

### 1. Modificar `src/pages/reseller/Catalog.tsx`

Reorganizar a estrutura dos botões no CardContent:

**De (atual):**
```jsx
<div className="flex space-x-2">
  [Adicionar] [Calcular] [MercadoLivreButton]
</div>
```

**Para (novo):**
```jsx
<div className="space-y-2">
  <div className="flex space-x-2">
    [Adicionar] [Calcular]
  </div>
  {hasMLIntegration && (
    <MercadoLivreButton ... />
  )}
</div>
```

### 2. Componente `MercadoLivreButton`

O componente já está com `w-full`, então funcionará corretamente na nova estrutura.

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/reseller/Catalog.tsx` | Separar botões em duas linhas dentro de uma div com `space-y-2` |

---

## Resultado Esperado

1. Botões "Adicionar/Remover" e "Calcular" ficam na primeira linha
2. Botão "Publicar no Mercado Livre" fica na segunda linha, ocupando largura total
3. Espaçamento vertical de 8px (space-y-2) entre as linhas
4. Visual limpo e organizado conforme solicitado
