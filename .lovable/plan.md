
# Plano: Adicionar Botão "Mercado Livre" no Catálogo de Produtos

## Resumo

Implementar um botão de integração com Mercado Livre em cada card de produto no catálogo do revendedor. O botão permitirá publicar produtos diretamente no Mercado Livre com um clique.

---

## 1. Criar Tabela para Rastrear Produtos Publicados

Precisamos de uma nova tabela para registrar quais produtos já foram publicados no Mercado Livre por cada usuário.

**Nova tabela: `mercadolivre_published_products`**

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Chave primária |
| user_id | UUID | Referência ao usuário que publicou |
| product_id | UUID | Referência ao produto |
| ml_item_id | TEXT | ID do anúncio no Mercado Livre (opcional, para referência futura) |
| published_at | TIMESTAMPTZ | Data/hora da publicação |
| status | TEXT | Status: 'pending', 'published', 'error' |

Políticas RLS:
- Usuários podem ver/inserir seus próprios registros
- Service role pode gerenciar todos

---

## 2. Criar Hook `useMercadoLivreIntegration`

**Novo arquivo: `src/hooks/useMercadoLivreIntegration.ts`**

Este hook irá:
- Verificar se o usuário tem integração ativa com ML
- Buscar lista de produtos já publicados
- Fornecer função para publicar novo produto
- Gerenciar estados de loading

```text
┌─────────────────────────────────────────────────┐
│        useMercadoLivreIntegration               │
├─────────────────────────────────────────────────┤
│ • hasActiveIntegration: boolean                 │
│ • publishedProducts: Set<string>                │
│ • isPublishing: Map<productId, boolean>         │
│ • publishProduct(productId): Promise            │
│ • isProductPublished(productId): boolean        │
│ • isLoading: boolean                            │
└─────────────────────────────────────────────────┘
```

---

## 3. Criar Componente `MercadoLivreButton`

**Novo arquivo: `src/components/reseller/MercadoLivreButton.tsx`**

Componente que renderiza o botão com lógica condicional:

| Estado | Cor | Ícone | Tooltip |
|--------|-----|-------|---------|
| Não publicado | Amarelo/Laranja | Send (avião de papel) | "Publicar no Mercado Livre" |
| Publicando | Amarelo | Loader (spinner) | "Publicando..." |
| Publicado | Verde | Check | "Publicado no Mercado Livre" |

Ação ao clicar (amarelo):
1. Verificar se produto está em "Meus Produtos"
2. Se não estiver, adicionar automaticamente
3. Enviar POST para `https://n8n-n8n.nuwfic.easypanel.host/webhook/MercadoLivre_Advertise`
4. Body: `{ product_id, user_id }`
5. Mostrar spinner durante processamento
6. Ao receber sucesso, inserir registro em `mercadolivre_published_products`
7. Atualizar estado visual para verde com check

---

## 4. Modificar Página do Catálogo

**Arquivo: `src/pages/reseller/Catalog.tsx`**

Alterações:
- Importar o hook `useMercadoLivreIntegration`
- Importar componente `MercadoLivreButton`
- Adicionar TooltipProvider no nível adequado
- Renderizar o botão ML ao lado dos botões existentes (Adicionar/Remover e Calcular)

Posicionamento do botão:
```text
┌────────────────────────────────┐
│       Card do Produto          │
├────────────────────────────────┤
│         [Imagem]               │
│  Nome do Produto               │
│  Custo | Preço Sugerido        │
│  Margem | Estoque              │
├────────────────────────────────┤
│ [Adicionar] [Calcular] [ML 🛫] │
└────────────────────────────────┘
```

---

## 5. Fluxo de Publicação

```text
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Clica no    │────▶│ Produto está em  │────▶│ Enviar POST     │
│  botão ML    │ Não │ "Meus Produtos"? │ Sim │ para webhook    │
└──────────────┘     └──────────────────┘     └─────────────────┘
                            │                         │
                            ▼                         ▼
                     ┌──────────────┐         ┌─────────────────┐
                     │ Adicionar    │         │ Mostrar spinner │
                     │ produto      │────────▶│ no botão        │
                     └──────────────┘         └─────────────────┘
                                                      │
                                                      ▼
                                              ┌─────────────────┐
                                              │ Resposta OK?    │
                                              └─────────────────┘
                                                 │         │
                                                Sim       Não
                                                 ▼         ▼
                                          ┌──────────┐ ┌─────────┐
                                          │ Salvar   │ │ Mostrar │
                                          │ registro │ │ erro    │
                                          │ + botão  │ └─────────┘
                                          │ verde    │
                                          └──────────┘
```

---

## 6. Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/migrations/xxx_create_ml_published_products.sql` | Criar | Tabela + RLS |
| `src/hooks/useMercadoLivreIntegration.ts` | Criar | Hook de integração |
| `src/components/reseller/MercadoLivreButton.tsx` | Criar | Componente do botão |
| `src/pages/reseller/Catalog.tsx` | Modificar | Integrar botão nos cards |

---

## Detalhes Técnicos

### Verificação de Integração ML
```typescript
const { data } = await supabase
  .from('mercadolivre_integrations')
  .select('is_active')
  .eq('user_id', userId)
  .eq('is_active', true)
  .maybeSingle();
```

### Chamada ao Webhook n8n
```typescript
const response = await fetch(
  'https://n8n-n8n.nuwfic.easypanel.host/webhook/MercadoLivre_Advertise',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_id, user_id })
  }
);
```

### Ícones Lucide
- Publicar: `Send` (avião de papel)
- Publicado: `Check`
- Loading: `Loader2` com animação `animate-spin`

---

## Resultado Esperado

Após a implementação:
1. Usuários SEM integração ML ativa não verão o botão
2. Usuários COM integração verão botão amarelo em produtos não publicados
3. Ao clicar, produto é adicionado automaticamente + enviado ao ML
4. Após sucesso, botão fica verde com check
5. Produtos já publicados mostram botão verde desde o início
