

# Adicionar Botões de Download e Cópia na Página de Produto

## Resumo

Implementar três novos botões na página de produto:
1. **Botão para baixar todas as fotos** - download em ZIP ou individual
2. **Botão discreto para copiar a descrição** - ao lado do texto da descrição
3. **Botão discreto para copiar o título** - ao lado do título do produto

---

## Localização dos Novos Elementos

```text
┌─────────────────────────────────────────────────────────────────────┐
│  📷 IMAGENS                │  INFORMAÇÕES DO PRODUTO               │
│  ┌────────────────────┐   │                                        │
│  │                    │   │  Nome do Produto Aqui        [📋]     │ ← Copiar título
│  │    Imagem Principal│   │  Marca: XYZ                            │
│  │                    │   │                                        │
│  │         [🔍]       │   │  ⭐⭐⭐⭐⭐ 4.5 (10 avaliações)         │
│  └────────────────────┘   │                                        │
│                            │  R$ 199,90                             │
│  [📸] [📸] [📸] [📸]      │                                        │
│                            │  📦 SKU: PROD-001                      │
│  [📥 Baixar Fotos]         │                                        │ ← Novo botão
│                            │  Descrição:                   [📋]    │ ← Copiar descrição
│                            │  Lorem ipsum dolor sit amet...         │
│                            │                                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Alterações Necessárias

### Arquivo: `src/pages/Produto.tsx`

#### 1. Adicionar Import do Ícone `Copy` e `Download`

```typescript
// Linha 13 - adicionar Copy e Download aos imports
import { 
  ChevronRight, Star, Heart, ShoppingCart, Truck, Shield, 
  RotateCcw, Plus, Minus, Share2, ZoomIn, Package, Info, 
  ExternalLink, Copy, Download  // ← Adicionar estes
} from "lucide-react";
```

#### 2. Criar Funções de Cópia e Download

Adicionar após a função `handleBuyNow` (linha ~241):

```typescript
// Copiar título para clipboard
const handleCopyTitle = async () => {
  try {
    await navigator.clipboard.writeText(product.name);
    toast({
      title: "Título copiado!",
      description: "O nome do produto foi copiado para a área de transferência.",
    });
  } catch (err) {
    toast({
      title: "Erro ao copiar",
      description: "Não foi possível copiar o título.",
      variant: "destructive",
    });
  }
};

// Copiar descrição para clipboard
const handleCopyDescription = async () => {
  if (!product.description) return;
  try {
    await navigator.clipboard.writeText(product.description);
    toast({
      title: "Descrição copiada!",
      description: "A descrição do produto foi copiada para a área de transferência.",
    });
  } catch (err) {
    toast({
      title: "Erro ao copiar",
      description: "Não foi possível copiar a descrição.",
      variant: "destructive",
    });
  }
};

// Baixar todas as fotos do produto
const handleDownloadPhotos = async () => {
  toast({
    title: "Baixando fotos...",
    description: `Preparando ${productImages.length} imagem(ns) para download.`,
  });

  for (let i = 0; i < productImages.length; i++) {
    const imageUrl = productImages[i];
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const extension = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
      link.download = `${product.name.replace(/[^a-z0-9]/gi, '_')}_${i + 1}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao baixar imagem:', err);
    }
  }

  toast({
    title: "Download concluído!",
    description: `${productImages.length} foto(s) baixada(s) com sucesso.`,
  });
};
```

#### 3. Adicionar Botão de Copiar ao Título (Linha ~284)

```typescript
// ANTES (linha 284-289):
<h1 className="text-2xl md:text-3xl font-bold mb-2 line-clamp-2 flex items-start gap-3">
  <span className="line-clamp-2">{product.name}</span>
  {product.high_rotation && !storeSlug && <span ...>⚠️</span>}
</h1>

// DEPOIS:
<div className="flex items-start justify-between gap-2">
  <h1 className="text-2xl md:text-3xl font-bold mb-2 line-clamp-2 flex items-start gap-3">
    <span className="line-clamp-2">{product.name}</span>
    {product.high_rotation && !storeSlug && <span ...>⚠️</span>}
  </h1>
  <Button
    variant="ghost"
    size="icon"
    onClick={handleCopyTitle}
    className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-foreground"
    title="Copiar título"
  >
    <Copy className="h-4 w-4" />
  </Button>
</div>
```

#### 4. Adicionar Botão de Copiar à Descrição (Linha ~418-452)

```typescript
// ANTES:
{product.description && (
  <div>
    <div className="text-muted-foreground ...">
      <ReactMarkdown ...>
        {product.description}
      </ReactMarkdown>
    </div>
  </div>
)}

// DEPOIS:
{product.description && (
  <div>
    <div className="flex items-center justify-between mb-2">
      <h3 className="font-medium text-sm text-muted-foreground">Descrição</h3>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopyDescription}
        className="h-7 px-2 text-muted-foreground hover:text-foreground gap-1"
        title="Copiar descrição"
      >
        <Copy className="h-3.5 w-3.5" />
        <span className="text-xs">Copiar</span>
      </Button>
    </div>
    <div className="text-muted-foreground ...">
      <ReactMarkdown ...>
        {product.description}
      </ReactMarkdown>
    </div>
  </div>
)}
```

#### 5. Adicionar Botão de Download de Fotos (Após thumbnails, linha ~278)

```typescript
// ANTES (linha 274-278):
<div className="flex gap-2 overflow-x-auto pb-2">
  {productImages.map((image, index) => ...)}
</div>

// DEPOIS:
<div className="flex gap-2 overflow-x-auto pb-2">
  {productImages.map((image, index) => ...)}
</div>

{productImages.length > 0 && (
  <Button
    variant="outline"
    size="sm"
    onClick={handleDownloadPhotos}
    className="w-full sm:w-auto gap-2"
  >
    <Download className="h-4 w-4" />
    Baixar {productImages.length > 1 ? `${productImages.length} Fotos` : 'Foto'}
  </Button>
)}
```

---

## Resultado Visual Esperado

| Elemento | Localização | Aparência |
|----------|-------------|-----------|
| 📋 Copiar título | Ao lado direito do nome do produto | Ícone pequeno e discreto |
| 📋 Copiar descrição | No cabeçalho da seção de descrição | Link "Copiar" com ícone pequeno |
| 📥 Baixar Fotos | Abaixo das miniaturas | Botão outline com texto |

---

## Comportamento

| Ação | Resultado | Feedback |
|------|-----------|----------|
| Clique em "Copiar título" | Copia nome do produto para clipboard | Toast: "Título copiado!" |
| Clique em "Copiar descrição" | Copia descrição (markdown puro) para clipboard | Toast: "Descrição copiada!" |
| Clique em "Baixar Fotos" | Inicia download de todas as imagens | Toast durante e após o download |

---

## Seção Técnica

### Download de Múltiplas Imagens

Como navegadores não permitem múltiplos downloads simultâneos facilmente, as imagens serão baixadas sequencialmente. Cada arquivo será nomeado usando o padrão:

```
NomeDoProduto_1.jpg
NomeDoProduto_2.png
...
```

### Clipboard API

Usamos `navigator.clipboard.writeText()` que é suportado em todos os navegadores modernos. Em caso de erro (ex: navegador antigo ou falta de permissão), exibimos uma mensagem de erro.

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Produto.tsx` | Adicionar imports, funções e botões |

