
# Plano: Corrigir Loop Infinito no Download de Imagens

## Problema Identificado

A função `handleDownloadPhotos` não possui proteção contra múltiplos cliques ou execuções simultâneas. Isso pode causar:
1. Usuário clicando múltiplas vezes no botão enquanto o download está em andamento
2. Re-renders do componente que podem disparar a função novamente

---

## Solução

Adicionar um estado `isDownloading` para:
1. Desabilitar o botão durante o download
2. Prevenir execuções simultâneas da função

---

## Alterações

### Arquivo: `src/pages/Produto.tsx`

#### 1. Adicionar estado de controle

```typescript
const [isDownloading, setIsDownloading] = useState(false);
```

#### 2. Modificar a função handleDownloadPhotos

```typescript
const handleDownloadPhotos = async () => {
  // Prevenir execução se já estiver baixando
  if (isDownloading) return;
  
  setIsDownloading(true);
  
  toast({
    title: "Baixando fotos...",
    description: `Preparando ${productImages.length} imagem(ns) para download.`,
  });

  try {
    for (let i = 0; i < productImages.length; i++) {
      // ... lógica existente de download ...
    }

    toast({
      title: "Download concluído!",
      description: `${productImages.length} foto(s) baixada(s) com sucesso.`,
    });
  } catch (error) {
    toast({
      title: "Erro no download",
      description: "Algumas imagens podem não ter sido baixadas.",
      variant: "destructive",
    });
  } finally {
    setIsDownloading(false);
  }
};
```

#### 3. Modificar o botão para mostrar estado de loading

```tsx
<Button
  variant="outline"
  size="sm"
  onClick={handleDownloadPhotos}
  disabled={isDownloading}
  className="w-full sm:w-auto gap-2"
>
  {isDownloading ? (
    <>
      <Loader2 className="h-4 w-4 animate-spin" />
      Baixando...
    </>
  ) : (
    <>
      <Download className="h-4 w-4" />
      Baixar {productImages.length > 1 ? `${productImages.length} Fotos` : 'Foto'}
    </>
  )}
</Button>
```

---

## Resumo das Alterações

| Local | Alteração |
|-------|-----------|
| Estado | Adicionar `isDownloading` |
| Função | Guard clause no início + try/finally |
| Botão | `disabled={isDownloading}` + feedback visual |

---

## Benefícios

1. **Previne loops** - Botão desabilitado durante download
2. **Feedback visual** - Usuário sabe que o download está em andamento
3. **Tratamento de erro** - Finally garante que o estado será resetado
