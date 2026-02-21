

## Ajustar Container do Banner Mobile ao Tamanho da Imagem

### Problema

O container do banner mobile tem um aspect ratio fixo (`aspect-[4/5]`) e a imagem usa `object-contain`, o que cria espaco em branco ao redor quando a imagem e menor que o container. O usuario nao quer esticar a imagem para preencher -- quer que o container se ajuste ao tamanho real da imagem.

### Correcao

**Arquivo:** `src/components/Hero.tsx`

1. **Banner unico (linha 100):** Remover o aspect ratio fixo no mobile e deixar a imagem definir a altura naturalmente. Manter o aspect ratio no desktop.

```
// ANTES:
<div className="w-full aspect-[4/5] md:aspect-[8/3] rounded-lg overflow-hidden bg-muted">
  <img className="w-full h-full object-contain md:object-cover" />

// DEPOIS:
<div className="w-full md:aspect-[8/3] rounded-lg overflow-hidden bg-muted">
  <img className="w-full h-auto md:h-full md:object-cover" />
```

2. **Carousel (linhas ~218-230):** Aplicar a mesma logica nos slides do carousel com banner tipo imagem.

```
// ANTES:
<div className="w-full aspect-[4/5] md:aspect-[8/3] rounded-lg overflow-hidden bg-muted">
  <img className="w-full h-full object-cover" />

// DEPOIS:
<div className="w-full md:aspect-[8/3] rounded-lg overflow-hidden bg-muted">
  <img className="w-full h-auto md:h-full md:object-cover" />
```

### Resultado

No mobile, o container vai se ajustar ao tamanho real da imagem, eliminando o espaco em branco. No desktop, o aspect ratio 8:3 continua sendo mantido.
