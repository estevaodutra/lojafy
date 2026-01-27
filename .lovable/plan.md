

# Restringir Botões de Download e Cópia para Revendedores

## Resumo

Atualmente, os botões de baixar fotos, copiar título e copiar descrição estão visíveis para todos os usuários. A alteração irá **ocultar esses botões** para usuários que não sejam revendedores (`reseller`).

---

## Lógica de Restrição

| Usuário | Botão Baixar Fotos | Botão Copiar Título | Botão Copiar Descrição |
|---------|-------------------|---------------------|------------------------|
| Revendedor (`reseller`) | Visível | Visível | Visível |
| Super Admin | Oculto | Oculto | Oculto |
| Admin | Oculto | Oculto | Oculto |
| Fornecedor (`supplier`) | Oculto | Oculto | Oculto |
| Cliente (`customer`) | Oculto | Oculto | Oculto |
| Visitante (não logado) | Oculto | Oculto | Oculto |

---

## Alterações Necessárias

### Arquivo: `src/pages/Produto.tsx`

#### 1. Importar o Hook de Role

Adicionar import do hook `useUserRole`:

```typescript
import { useUserRole } from "@/hooks/useUserRole";
```

#### 2. Usar o Hook no Componente

Dentro do componente `Produto`, adicionar:

```typescript
const { isReseller } = useUserRole();
```

#### 3. Condicionar Botão de Copiar Título (Linha ~370-378)

```typescript
// ANTES:
<Button
  variant="ghost"
  size="icon"
  onClick={handleCopyTitle}
  className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-foreground"
  title="Copiar título"
>
  <Copy className="h-4 w-4" />
</Button>

// DEPOIS:
{isReseller() && (
  <Button
    variant="ghost"
    size="icon"
    onClick={handleCopyTitle}
    className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-foreground"
    title="Copiar título"
  >
    <Copy className="h-4 w-4" />
  </Button>
)}
```

#### 4. Condicionar Botão de Baixar Fotos (Linha ~347-357)

```typescript
// ANTES:
{productImages.length > 0 && (
  <Button ...>
    <Download className="h-4 w-4" />
    Baixar {productImages.length > 1 ? `${productImages.length} Fotos` : 'Foto'}
  </Button>
)}

// DEPOIS:
{productImages.length > 0 && isReseller() && (
  <Button ...>
    <Download className="h-4 w-4" />
    Baixar {productImages.length > 1 ? `${productImages.length} Fotos` : 'Foto'}
  </Button>
)}
```

#### 5. Condicionar Botão de Copiar Descrição (Linha ~513-523)

```typescript
// ANTES:
<div className="flex items-center justify-between mb-2">
  <h3 className="font-medium text-sm text-muted-foreground">Descrição</h3>
  <Button
    variant="ghost"
    size="sm"
    onClick={handleCopyDescription}
    ...
  >
    <Copy className="h-3.5 w-3.5" />
    <span className="text-xs">Copiar</span>
  </Button>
</div>

// DEPOIS:
<div className="flex items-center justify-between mb-2">
  <h3 className="font-medium text-sm text-muted-foreground">Descrição</h3>
  {isReseller() && (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopyDescription}
      ...
    >
      <Copy className="h-3.5 w-3.5" />
      <span className="text-xs">Copiar</span>
    </Button>
  )}
</div>
```

---

## Resultado Esperado

| Cenário | Comportamento |
|---------|--------------|
| Revendedor visualizando produto | Vê todos os 3 botões (baixar fotos, copiar título, copiar descrição) |
| Cliente visualizando produto | Não vê nenhum dos botões de download/cópia |
| Visitante (não logado) | Não vê nenhum dos botões de download/cópia |
| Admin/Super Admin | Não vê os botões (funcionalidade específica para revendedores) |

---

## Seção Técnica

### Hook Utilizado

O hook `useUserRole` já existe no projeto (`src/hooks/useUserRole.ts`) e fornece a função `isReseller()` que retorna `true` apenas quando o usuário logado tem role = `'reseller'`.

### Segurança

Esta é uma validação de UI apenas. As funções de cópia e download continuam existindo no código, mas os botões não são renderizados para usuários não-revendedores. Como são operações client-side (copiar para clipboard e baixar imagens públicas), não há risco de segurança adicional.

### Arquivo a Modificar

| Arquivo | Alterações |
|---------|-----------|
| `src/pages/Produto.tsx` | Adicionar import do hook e condicionar renderização dos 3 botões |

