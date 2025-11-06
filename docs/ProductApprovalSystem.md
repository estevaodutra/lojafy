# Sistema de Aprovação de Produtos por Fornecedor

## 📋 Visão Geral

Sistema completo que permite ao Super Admin cadastrar produtos para fornecedores específicos, que devem aprovar ou rejeitar antes da publicação na loja.

## 🔄 Fluxo Completo

```
1. Super Admin cadastra produto via API
   ↓
2. Fornecedor recebe notificação
   ↓
3. Fornecedor acessa "Produtos para Aprovação"
   ↓
4. Fornecedor revisa e decide:
   • APROVAR → Produto publicado automaticamente
   • REJEITAR → Produto arquivado com motivo
   ↓
5. Super Admin recebe notificação da decisão
```

## 🗄️ Estrutura do Banco de Dados

### Campos adicionados na tabela `products`:

- `approval_status` (TEXT): Status do produto
  - `draft`: Rascunho (padrão)
  - `pending_approval`: Aguardando aprovação
  - `approved`: Aprovado pelo fornecedor
  - `rejected`: Rejeitado pelo fornecedor

- `requires_approval` (BOOLEAN): Se requer aprovação do fornecedor
- `approved_by` (UUID): ID do usuário que aprovou
- `approved_at` (TIMESTAMP): Data/hora da aprovação
- `rejection_reason` (TEXT): Motivo da rejeição
- `rejected_at` (TIMESTAMP): Data/hora da rejeição
- `created_by` (UUID): ID do Super Admin que criou

### Tabela `product_approval_history`:

Registra todo o histórico de aprovações/rejeições:
- `product_id`: ID do produto
- `action`: Ação realizada (submitted, approved, rejected)
- `performed_by`: Quem realizou a ação
- `previous_status`: Status anterior
- `new_status`: Novo status
- `notes`: Observações (ex: motivo de rejeição)
- `created_at`: Timestamp da ação

## 🔌 API - Cadastro de Produtos

### Endpoint: `POST /api-produtos-cadastrar`

### Novos Parâmetros:

```json
{
  "fornecedor_id": "uuid-do-fornecedor",
  "requer_aprovacao": true
}
```

### Exemplo de Requisição:

```bash
curl -X POST https://seu-projeto.supabase.co/functions/v1/api-produtos-cadastrar \
  -H "X-API-Key: sua-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Notebook HP 14",
    "preco": 2999.90,
    "fornecedor_id": "550e8400-e29b-41d4-a716-446655440000",
    "requer_aprovacao": true,
    "categoria_id": "123e4567-e89b-12d3-a456-426614174000"
  }'
```

### Resposta de Sucesso:

```json
{
  "success": true,
  "message": "Produto criado com sucesso e enviado para aprovação do fornecedor",
  "data": {
    "id": "produto-uuid",
    "nome": "Notebook HP 14",
    "fornecedor_id": "550e8400-e29b-41d4-a716-446655440000",
    "status_aprovacao": "pending_approval",
    "requer_aprovacao": true,
    "ativo": false,
    "mensagem": "Produto aguardando aprovação do fornecedor"
  }
}
```

## 📱 Painel do Fornecedor

### Rota: `/supplier/produtos/aprovacao`

### Funcionalidades:

1. **Visualização por Tabs:**
   - Pendentes: Produtos aguardando aprovação
   - Aprovados: Produtos já aprovados
   - Rejeitados: Produtos rejeitados

2. **Métricas em Cards:**
   - Total de produtos pendentes
   - Total de produtos aprovados
   - Total de produtos rejeitados

3. **Ações Disponíveis:**
   - Ver detalhes completos do produto
   - Aprovar produto (publica automaticamente)
   - Rejeitar produto (com campo obrigatório de motivo)

### Card de Produto Pendente:

- Imagem do produto
- Nome e preço
- Categoria
- Quantidade em estoque
- Botões: "Ver Detalhes", "Aprovar", "Rejeitar"

## 🔔 Sistema de Notificações

### Notificação ao Fornecedor (produto atribuído):

```json
{
  "title": "📦 Novo Produto para Aprovação",
  "message": "O produto '{nome}' foi adicionado à sua conta e aguarda aprovação.",
  "type": "product_approval_pending",
  "action_url": "/supplier/produtos/aprovacao",
  "action_label": "Revisar Produto"
}
```

### Notificação ao Super Admin (produto aprovado):

```json
{
  "title": "✅ Produto Aprovado",
  "message": "O produto '{nome}' foi aprovado pelo fornecedor.",
  "type": "product_approved",
  "action_url": "/super-admin/catalogo"
}
```

### Notificação ao Super Admin (produto rejeitado):

```json
{
  "title": "❌ Produto Rejeitado",
  "message": "O produto '{nome}' foi rejeitado pelo fornecedor.",
  "type": "product_rejected",
  "metadata": {
    "rejection_reason": "Motivo da rejeição..."
  }
}
```

## 🔐 Políticas RLS (Row Level Security)

### Fornecedores podem:
- Ver produtos com `supplier_id = auth.uid()` e `approval_status IN ('pending_approval', 'approved', 'rejected')`
- Atualizar apenas produtos pendentes (`approval_status = 'pending_approval'`)
- Mudar status apenas para 'approved' ou 'rejected'

### Super Admins podem:
- Criar produtos para qualquer fornecedor
- Ver e gerenciar todos os produtos
- Forçar aprovação/rejeição se necessário

## ⚠️ Regras de Negócio

### ✅ Comportamentos Válidos:

1. **Produto COM fornecedor_id E requer_aprovacao=true:**
   - Status: `pending_approval`
   - Active: `false`
   - Fornecedor recebe notificação

2. **Produto COM fornecedor_id MAS requer_aprovacao=false:**
   - Status: `draft`
   - Active: `true`
   - Produto publicado normalmente

3. **Produto SEM fornecedor_id:**
   - Status: `draft`
   - Active: `true`
   - Produto normal sem fornecedor específico

### ❌ Comportamentos Inválidos:

1. **requer_aprovacao=true SEM fornecedor_id:**
   - Retorna erro: "Campo fornecedor_id é obrigatório quando requer_aprovacao=true"

2. **fornecedor_id com role diferente de 'supplier':**
   - Retorna erro: "Fornecedor não encontrado ou não possui role de fornecedor"

3. **fornecedor_id inativo (is_active=false):**
   - Retorna erro: "Fornecedor não encontrado, inativo..."

## 📊 Componentes Implementados

### Hooks:
- `useSupplierPendingProducts()`: Lista produtos do fornecedor (todos os status)
- `useSupplierApprovalStats()`: Estatísticas de aprovação (pending, approved, rejected)

### Componentes:
- `ProductApprovalCard`: Card de produto com ações de aprovação/rejeição
- `ProductApproval`: Página principal com tabs e listagem

### Páginas:
- `/supplier/produtos/aprovacao`: Página de aprovação de produtos

## 🧪 Checklist de Testes

- [ ] Super Admin cadastra produto com fornecedor_id + requer_aprovacao=true
- [ ] Fornecedor recebe notificação
- [ ] Produto aparece em "Produtos para Aprovação" (tab Pendentes)
- [ ] Fornecedor consegue ver detalhes completos
- [ ] Fornecedor consegue aprovar → produto fica ativo
- [ ] Super Admin recebe notificação de aprovação
- [ ] Fornecedor consegue rejeitar com motivo
- [ ] Motivo da rejeição é exibido corretamente
- [ ] Super Admin recebe notificação de rejeição
- [ ] Histórico de aprovações é registrado
- [ ] Produto aprovado aparece na tab "Aprovados"
- [ ] Produto rejeitado aparece na tab "Rejeitados"
- [ ] Dashboard do fornecedor mostra contadores corretos

## 🔗 Links Úteis

- **API Documentation:** `supabase/functions/api-produtos-cadastrar/README.md`
- **Supplier Panel Documentation:** `docs/SupplierPanel.md`
- **Database Schema:** Veja tabelas `products` e `product_approval_history`
