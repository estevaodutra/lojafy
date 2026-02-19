
## Publicacao em Segundo Plano + Notificacao + Menu "Ver na Loja"

### Resumo

Tres mudancas principais:
1. Publicacao no ML roda em segundo plano (sem bloquear a tela)
2. Ao receber resposta, mostra toast com link "Ver Anuncio" (permalink) e aviso de verificacao
3. Botao "Ver na Loja" vira dropdown com "Ver na Minha Loja" e "Ver no Mercado Livre"

---

### 1. Publicacao em Segundo Plano

**Arquivo: `src/hooks/useMercadoLivreIntegration.ts`**

Atualmente o `publishProduct` usa `mutateAsync` que bloqueia com await. Mudar para `mutate` (fire-and-forget) para que o clique retorne imediatamente e o processo rode em segundo plano.

Alem disso, processar a resposta do webhook para:
- Extrair `permalink` e `ml_item_id` do campo `advertise` da resposta
- Salvar `ml_item_id` e `permalink` na tabela `mercadolivre_published_products`
- Mostrar toast com botao "Ver Anuncio" apontando para o `permalink`

### 2. Adicionar coluna `permalink` na tabela

**Migracao SQL:**

Adicionar coluna `permalink` na tabela `mercadolivre_published_products` para salvar o link do anuncio.

```text
ALTER TABLE mercadolivre_published_products 
ADD COLUMN IF NOT EXISTS permalink TEXT;
```

### 3. Toast com Notificacao de Sucesso

**Arquivo: `src/hooks/useMercadoLivreIntegration.ts`**

No `onSuccess` da mutation, mostrar toast com:
- Titulo: "Seu Produto foi Publicado no Mercado Livre"
- Descricao com aviso: "O anuncio pode levar ate 30min para ficar publico por verificacao do marketplace."
- Botao "Ver Anuncio" com link para o `permalink` retornado

O toast usara `action` do componente shadcn para incluir o botao clicavel.

### 4. Dropdown "Ver na Loja" em Meus Produtos

**Arquivo: `src/pages/reseller/Products.tsx`**

Substituir o botao simples "Ver na Loja" por um `DropdownMenu` com as opcoes:
- "Ver na Minha Loja" - link para `/loja/{slug}/produto/{id}` (sempre visivel quando ativo)
- "Ver no Mercado Livre" - link para o `permalink` salvo (visivel apenas quando publicado no ML)

O hook `useMercadoLivreIntegration` expora uma nova funcao `getProductPermalink(productId)` para obter o permalink salvo.

### 5. Atualizar MercadoLivreButton

**Arquivo: `src/components/reseller/MercadoLivreButton.tsx`**

Remover o estado "Publicando..." que bloqueava o botao. Ao clicar em publicar:
- Mostrar toast rapido "Publicando em segundo plano..."
- O botao volta ao estado normal imediatamente
- Quando a resposta chegar, o toast de sucesso aparece automaticamente

---

### Secao Tecnica

**Arquivos modificados:**
1. Nova migracao SQL - adicionar coluna `permalink` em `mercadolivre_published_products`
2. `src/hooks/useMercadoLivreIntegration.ts` - publicacao async fire-and-forget, parsear resposta, salvar permalink, toast com botao, expor `getProductPermalink`
3. `src/pages/reseller/Products.tsx` - trocar botao "Ver na Loja" por DropdownMenu com opcoes
4. `src/components/reseller/MercadoLivreButton.tsx` - ajustar estados para publicacao em segundo plano

**Fluxo da publicacao:**
1. Usuario clica "Publicar no Mercado Livre"
2. Toast rapido: "Publicando em segundo plano..."
3. Botao volta ao normal, usuario pode navegar
4. Webhook processa e retorna resposta com `advertise.id` e `advertise.permalink`
5. Hook salva `ml_item_id` e `permalink` no banco
6. Toast aparece: "Seu Produto foi Publicado no Mercado Livre" com botao "Ver Anuncio"
7. Botao muda para verde "Publicado" e dropdown "Ver na Loja" ganha opcao "Ver no Mercado Livre"
