

## Clonar Dados de Marketplace - Plano de Implementacao

### Resumo

Criar componente `CloneFromMarketplace` que permite colar a URL de um anuncio de marketplace (Mercado Livre, Amazon, Shopee, Magalu) e enviar para o webhook n8n para importar os dados do anuncio para o produto atual.

---

### 1. Criar Componente CloneFromMarketplace

**Novo arquivo: `src/components/admin/CloneFromMarketplace.tsx`**

- Select para escolher marketplace (Mercado Livre, Amazon, Shopee, Magazine Luiza)
- Input para colar URL do anuncio com validacao por regex
- Checkbox "Aguardar resposta" (resultado imediato vs assincrono)
- Botao "Clonar Dados do Anuncio"
- Exibicao de resultado (sucesso/erro) com icones
- Aviso sobre substituicao dos dados atuais

**Fluxo:**
1. Usuario seleciona marketplace e cola URL
2. Validacao da URL pelo padrao do marketplace
3. Busca token de integracao ativo na tabela `mercadolivre_integrations` (por enquanto so ML tem integracao)
4. Verifica se token nao expirou
5. Envia payload completo para webhook `https://n8n-n8n.nuwfic.easypanel.host/webhook/clone_advertise`
6. Exibe resultado (toast + badge inline)

**Payload enviado ao webhook:**
- Dados do produto atual (id, name, description, price, images, attributes, sku, gtin, etc.)
- Marketplace e URL do anuncio
- Token de integracao (access_token, refresh_token, ml_user_id)
- user_id e timestamp

---

### 2. Integrar na Pagina de Edicao

**Arquivo modificado: `src/pages/admin/Products.tsx`**

- Importar `CloneFromMarketplace`
- Renderizar abaixo do `ProductComparisonView` dentro do Dialog de edicao
- Visivel apenas quando editando produto existente (`editingProduct?.id`)
- Callback `onCloneSuccess` chama `refetchProducts` para recarregar dados

---

### Secao Tecnica

**Arquivos criados:**
1. `src/components/admin/CloneFromMarketplace.tsx`

**Arquivos modificados:**
1. `src/pages/admin/Products.tsx` - adicionar import e renderizacao do componente

**Nenhuma alteracao de banco de dados necessaria** - o componente usa tabelas existentes (`mercadolivre_integrations`) e envia dados para webhook externo (n8n).

**Dependencias utilizadas:** Todos os componentes UI ja existem no projeto (Card, Select, Input, Button, Checkbox, toast/sonner).

**Auth:** Usa `useAuth` de `@/contexts/AuthContext` para obter `user.id`.
