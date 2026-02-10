
# Corrigir Imagem de Compartilhamento (Open Graph)

## Problema

Quando o link da Lojafy e compartilhado no WhatsApp (ou outras redes sociais), aparece um screenshot de uma pagina interna (tela de instalacao do PWA) ao inves da logo. Isso acontece porque a imagem OG configurada no `index.html` aponta para uma URL do Google Cloud Storage que esta em branco/quebrada.

## Solucao

### 1. Copiar a logo para a pasta `public`

Copiar `src/assets/lojafy-logo-new.png` para `public/og-image.png`. Imagens referenciadas em meta tags OG precisam estar na pasta `public` com URL absoluta, pois crawlers de redes sociais (WhatsApp, Facebook, Twitter) nao executam JavaScript -- eles leem apenas o HTML estatico.

### 2. Atualizar meta tags no `index.html`

Substituir as URLs quebradas do Google Cloud Storage por URLs absolutas apontando para o arquivo local:

**Alteracoes na linha 22:**
```
Antes:  <meta property="og:image" content="https://storage.googleapis.com/...">
Depois: <meta property="og:image" content="https://lojafy.lovable.app/og-image.png">
```

**Alteracoes na linha 26:**
```
Antes:  <meta name="twitter:image" content="https://storage.googleapis.com/...">
Depois: <meta name="twitter:image" content="https://lojafy.lovable.app/og-image.png">
```

Tambem adicionar a tag `og:url` para garantir que o link correto seja exibido:
```html
<meta property="og:url" content="https://lojafy.lovable.app">
```

### Arquivos Modificados

1. **`public/og-image.png`** - Nova copia da logo (a partir de `src/assets/lojafy-logo-new.png`)
2. **`index.html`** - Atualizar URLs das meta tags `og:image` e `twitter:image`

### Observacao

Apos publicar, o cache do WhatsApp pode levar algum tempo para atualizar. Para forcar a atualizacao, voce pode usar a ferramenta de debug do Facebook: https://developers.facebook.com/tools/debug/ e colar a URL `https://lojafy.lovable.app` para limpar o cache.
