
# Plano: Download de Imagens em Formato JPG

## Objetivo

Alterar a funcionalidade de download de fotos do produto para que todas as imagens sejam baixadas no formato JPG, independentemente do formato original.

---

## Alterações

### Arquivo: `src/pages/Produto.tsx`

**Função `handleDownloadPhotos` (linhas 287-304):**

Alterar a lógica para:
1. Converter a imagem para JPG usando Canvas
2. Definir qualidade de 90% para manter boa qualidade
3. Usar extensão `.jpg` no nome do arquivo

**De:**
```typescript
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
```

**Para:**
```typescript
for (let i = 0; i < productImages.length; i++) {
  const imageUrl = productImages[i];
  try {
    // Criar imagem e canvas para conversão
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Preencher fundo branco (para imagens PNG com transparência)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          
          // Converter para JPG com qualidade 90%
          canvas.toBlob((blob) => {
            if (blob) {
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `${product.name.replace(/[^a-z0-9]/gi, '_')}_${i + 1}.jpg`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
            }
            resolve();
          }, 'image/jpeg', 0.9);
        } else {
          reject(new Error('Canvas context not available'));
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
  } catch (err) {
    console.error('Erro ao baixar imagem:', err);
  }
}
```

---

## Detalhes Técnicos

| Aspecto | Implementação |
|---------|---------------|
| Formato de saída | JPEG (`image/jpeg`) |
| Qualidade | 90% (0.9) |
| Fundo transparente | Convertido para branco (#FFFFFF) |
| Extensão do arquivo | `.jpg` |
| Dimensões | Mantém tamanho original da imagem |

---

## Benefícios

1. **Consistência** - Todas as imagens no mesmo formato
2. **Compatibilidade** - JPG é universalmente suportado
3. **Tamanho otimizado** - JPG geralmente tem menor tamanho que PNG
4. **Transparência tratada** - Imagens PNG com fundo transparente recebem fundo branco
