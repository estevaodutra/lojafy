

# Otimização do Layout Mobile - Página de Produto

## Problema Identificado

Com base na imagem de referência, o layout mobile atual tem algumas áreas que podem ser melhoradas:
1. Espaçamentos muito grandes entre elementos
2. Botões de ações (carrinho, favoritos, compartilhar) com layout inconsistente
3. Área de quantidade com espaçamento irregular
4. Botões de ação secundários ocupando muito espaço vertical

---

## Alterações Propostas

### 1. Otimizar Área de Quantidade (Linha ~565-577)

**Antes:** Quantidade com label separada e espaçamento grande
**Depois:** Layout mais compacto e alinhado

```text
┌──────────────────────────────────────────┐
│ Quantidade:                              │
│ ┌───┬───────────┬───┐                    │
│ │ - │     1     │ + │                    │
│ └───┴───────────┴───┘                    │
└──────────────────────────────────────────┘
```

### 2. Reorganizar Botões de Ação (Linha ~579-598)

**Antes:** Botões carrinho, favoritos e compartilhar em linha com tamanhos variados
**Depois:** 
- Botão do carrinho em largura total
- Favoritos e compartilhar em linha abaixo, menores e discretos

```text
Mobile Layout:
┌──────────────────────────────────────────┐
│        🛒 (largura total)                │  <- Carrinho
└──────────────────────────────────────────┘
┌───────────┐  ┌───────────┐
│    🤍     │  │    ↗️     │                   <- Favoritos | Compartilhar
└───────────┘  └───────────┘
┌──────────────────────────────────────────┐
│         Comprar Agora                    │
└──────────────────────────────────────────┘
```

### 3. Reduzir Espaçamentos Verticais no Mobile

- Reduzir `space-y-6` para `space-y-4` no mobile
- Reduzir padding das seções de benefícios
- Compactar área de preço

### 4. Otimizar Seção de Benefícios (Linha ~626-639)

**Antes:** Grid 3 colunas muito largo no mobile
**Depois:** Grid mais compacto com ícones menores

---

## Código das Alterações

### Arquivo: `src/pages/Produto.tsx`

#### Alteração 1: Espaçamento da Seção de Informações (Linha ~363)

```typescript
// ANTES:
<div className="space-y-6">

// DEPOIS:
<div className="space-y-4 md:space-y-6">
```

#### Alteração 2: Otimizar Área de Quantidade (Linha ~565-577)

```typescript
// ANTES:
<div className="space-y-4">
  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
    <label className="font-medium">Quantidade:</label>
    <div className="flex items-center border rounded-lg w-fit">
      ...
    </div>
  </div>

// DEPOIS:
<div className="space-y-3 md:space-y-4">
  <div className="flex items-center gap-3">
    <label className="font-medium text-sm md:text-base">Quantidade:</label>
    <div className="flex items-center border rounded-lg">
      <Button size="sm" variant="ghost" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1} className="h-9 w-9 md:h-10 md:w-10">
        <Minus className="h-4 w-4" />
      </Button>
      <span className="px-3 py-2 min-w-[50px] md:min-w-[60px] text-center text-base md:text-lg">{quantity}</span>
      <Button size="sm" variant="ghost" onClick={() => setQuantity(quantity + 1)} className="h-9 w-9 md:h-10 md:w-10">
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  </div>
```

#### Alteração 3: Reorganizar Botões de Ação (Linha ~579-598)

```typescript
// ANTES:
<div className="flex flex-col sm:flex-row gap-3">
  <Button size="lg" variant="outline" onClick={handleAddToCart} ... className="flex-1 h-12">
    <span className="text-xl">🛒</span>
    <span className="hidden sm:inline ml-2">Adicionar ao Carrinho</span>
  </Button>
  <Button size="lg" variant="outline" onClick={handleAddToWishlist} className={`h-12 w-12 sm:w-auto ...`}>
    ...
  </Button>
  <Button size="lg" variant="outline" className="h-12 w-12 sm:w-auto">
    ...
  </Button>
</div>

// DEPOIS:
<div className="space-y-2">
  {/* Botão do carrinho - largura total no mobile */}
  <Button 
    size="lg" 
    variant="outline" 
    onClick={handleAddToCart} 
    disabled={(product.stock_quantity || 0) <= 0 || (variants.length > 0 && !selectedVariant)} 
    className="w-full h-11 md:h-12"
  >
    <span className="text-xl">🛒</span>
  </Button>
  
  {/* Favoritos e Compartilhar lado a lado */}
  <div className="flex gap-2">
    <Button 
      size="lg" 
      variant="outline" 
      onClick={handleAddToWishlist} 
      className={`flex-1 h-10 md:h-12 ${isFavorite(product.id) ? "text-destructive border-destructive" : ""}`}
    >
      <span className="text-lg md:text-xl">{isFavorite(product.id) ? '❤️' : '🤍'}</span>
    </Button>
    <Button size="lg" variant="outline" className="flex-1 h-10 md:h-12">
      <Share2 className="h-4 w-4 md:h-5 md:w-5" />
    </Button>
  </div>
</div>
```

#### Alteração 4: Botão Comprar Agora (Linha ~600-609)

```typescript
// ANTES:
<Button size="lg" ... className="w-full btn-buy-now h-12 ...">

// DEPOIS:
<Button size="lg" ... className="w-full btn-buy-now h-11 md:h-12 ...">
```

#### Alteração 5: Otimizar Benefícios (Linha ~626-639)

```typescript
// ANTES:
<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
  <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-zinc-200">
    <span className="text-2xl">🚚💨</span>
    <p className="text-sm font-medium">Envio em 24hrs</p>
  </div>
  ...
</div>

// DEPOIS:
<div className="grid grid-cols-3 gap-2 md:gap-3">
  <div className="flex flex-col items-center justify-center gap-1 md:gap-2 p-2 md:p-4 rounded-lg bg-zinc-200">
    <span className="text-xl md:text-2xl">🚚💨</span>
    <p className="text-xs md:text-sm font-medium text-center">Envio 24h</p>
  </div>
  <div className="flex flex-col items-center justify-center gap-1 md:gap-2 p-2 md:p-4 rounded-lg bg-zinc-200">
    <span className="text-xl md:text-2xl">🛡️</span>
    <p className="text-xs md:text-sm font-medium text-center">Garantia</p>
  </div>
  <div className="flex flex-col items-center justify-center gap-1 md:gap-2 p-2 md:p-4 rounded-lg bg-zinc-200">
    <span className="text-xl md:text-2xl">🔄</span>
    <p className="text-xs md:text-sm font-medium text-center">Troca Fácil</p>
  </div>
</div>
```

#### Alteração 6: Otimizar Seção de Preço (Linha ~403-441)

```typescript
// Reduzir tamanho do preço no mobile
<p className="text-3xl md:text-4xl font-bold text-primary">
  {formatPrice(effectivePrice)}
</p>
```

---

## Resultado Visual Esperado

| Elemento | Antes | Depois |
|----------|-------|--------|
| Quantidade | Label separada, botões grandes | Inline, botões compactos |
| Carrinho | Apenas ícone pequeno | Largura total no mobile |
| Favoritos/Compartilhar | Quadrados isolados | Lado a lado, menores |
| Benefícios | Coluna única no mobile | 3 colunas compactas |
| Espaçamentos | Fixos em 24px | 16px mobile, 24px desktop |
| Preço | 4xl fixo | 3xl mobile, 4xl desktop |

---

## Comparação de Layout

```text
ANTES (Mobile):                    DEPOIS (Mobile):
┌────────────────────┐            ┌────────────────────┐
│ Quantidade:        │            │ Quantidade: [- 1 +]│
│ ┌──────────────┐   │            ├────────────────────┤
│ │  [- 1 +]     │   │            │      🛒            │  <- Full width
│ └──────────────┘   │            ├──────────┬─────────┤
├────────────────────┤            │    🤍    │    ↗️   │  <- 50/50
│ 🛒                 │            ├──────────┴─────────┤
├────┬────┬──────────┤            │   Comprar Agora    │
│ 🤍 │ ↗️ │          │            ├──────────────────────┤
├────┴────┴──────────┤            │[🚚24h][🛡️][🔄]    │  <- 3 cols
│   Comprar Agora    │            └────────────────────┘
├────────────────────┤
│ 🚚 Envio 24hrs     │
├────────────────────┤
│ 🛡️ Garantia        │
├────────────────────┤
│ 🔄 Troca Fácil     │
└────────────────────┘
```

---

## Seção Técnica

### Classes Responsivas Utilizadas

| Classe | Mobile | Desktop |
|--------|--------|---------|
| `h-9 md:h-10` | 36px | 40px |
| `h-10 md:h-12` | 40px | 48px |
| `h-11 md:h-12` | 44px | 48px |
| `text-3xl md:text-4xl` | 30px | 36px |
| `text-xs md:text-sm` | 12px | 14px |
| `p-2 md:p-4` | 8px | 16px |
| `gap-2 md:gap-3` | 8px | 12px |
| `space-y-4 md:space-y-6` | 16px | 24px |

### Arquivo a Modificar

| Arquivo | Linhas Afetadas |
|---------|-----------------|
| `src/pages/Produto.tsx` | ~363, ~565-577, ~579-598, ~600-609, ~626-639, ~403-441 |

