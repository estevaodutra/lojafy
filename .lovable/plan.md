
## Primeira imagem sempre sera a principal

### Resumo
Simplificar a logica de imagem principal: a primeira imagem do array `images` sera sempre considerada a principal. Isso remove a necessidade do botao "marcar como principal" e garante consistencia em todo o sistema.

### Alteracoes

**1. `src/components/admin/ProductForm.tsx` - Salvamento**
- Na funcao `onSubmit` (linha ~392-416): em vez de buscar `images.find(img => img.isMain)`, usar sempre `images[0]` como imagem principal
- Na inicializacao do estado `images` (linha ~84-130): marcar sempre o primeiro item como `isMain: true`, independente do valor de `main_image_url`

**2. `src/components/admin/ImageUploadArea.tsx` - Upload e gerenciamento**
- Remover o botao "marcar como principal" (StarOff) da UI
- Remover a funcao `setMainImage`
- Ao remover ou reordenar imagens, a primeira sempre sera a principal automaticamente
- Simplificar a logica: `isMain` sera derivado de `index === 0`
- Manter o badge "Principal" apenas na primeira imagem

**3. `supabase/functions/api-produtos-cadastrar/index.ts` - API de cadastro**
- Se `imagem_principal` nao for enviada mas `imagens` tiver itens, usar `imagens[0]` como `main_image_url`
- Garantir que `main_image_url` sempre seja `images[0]` ao salvar

**4. `supabase/functions/products/index.ts` - API de update**
- Na logica de update (linha ~395-399): se `images` for enviado e tiver itens, definir `main_image_url = images[0]` e `image_url = images[0]` automaticamente

### Comportamento resultante
- Ao adicionar imagens, a primeira e automaticamente a principal
- Para trocar a imagem principal, basta arrastar/reordenar (ou remover a primeira)
- Todas as APIs garantem que `main_image_url = images[0]`
- O badge "Principal" aparece apenas na primeira imagem, sem botao de selecao manual
