# API de Cadastro de Produtos

## Endpoint
`POST /api-produtos-cadastrar`

## Autenticação
Esta API requer autenticação via API Key no header `X-API-Key`.

## Campos da Requisição

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `nome` | string | ✅ Sim | Nome do produto |
| `descricao` | string | ❌ Não | Descrição detalhada do produto |
| `preco` | number | ✅ Sim | Preço de venda do produto |
| `preco_promocional` | number | ❌ Não | Preço promocional (deve ser menor que `preco`) |
| `preco_custo` | number | ❌ Não | Preço de custo (deve ser menor que `preco`) |
| `estoque` | number | ❌ Não | Quantidade em estoque (padrão: 0) |
| `nivel_minimo_estoque` | number | ❌ Não | Nível mínimo de estoque (padrão: 5) |
| `alerta_estoque_baixo` | boolean | ❌ Não | Ativa alerta de estoque baixo |
| `sku` | string | ❌ Não | SKU do produto (auto-gerado se vazio) |
| `gtin` | string | ❌ Não | GTIN/EAN-13 do produto (auto-gerado se vazio) |
| `categoria_id` | string (UUID) | ❌ Não | ID da categoria do produto |
| `subcategoria_id` | string (UUID) | ❌ Não | ID da subcategoria (deve pertencer à categoria) |
| `imagens` | array | ❌ Não | Array de URLs de imagens do produto |
| `imagem_principal` | string | ❌ Não | URL da imagem principal |
| `marca` | string | ❌ Não | Marca do produto |
| `especificacoes` | object | ❌ Não | Objeto com especificações técnicas |
| `peso` | number | ❌ Não | Peso do produto em kg |
| `largura` | number | ❌ Não | Largura do produto em cm |
| `altura` | number | ❌ Não | Altura do produto em cm |
| `comprimento` | number | ❌ Não | Comprimento do produto em cm |
| `produto_destaque` | boolean | ❌ Não | Marca o produto como destaque |
| `badge` | string | ❌ Não | Etiqueta/badge do produto (ex: "Novo", "Promoção") |
| `alta_rotatividade` | boolean | ❌ Não | Marca produto com alta rotatividade |
| **`anuncio_referencia`** | string (URL) | ❌ Não | **Link para anúncio de referência externo** |
| **`fornecedor_id`** | string (UUID) | ❌ Não | **ID do fornecedor ao qual o produto será atribuído** |
| **`requer_aprovacao`** | boolean | ❌ Não | **Se `true`, produto fica pendente até fornecedor aprovar (padrão: `false`)** |

## 📝 Formatação da Descrição com Markdown

A descrição do produto (`descricao`) suporta formatação **Markdown** para melhor apresentação visual na página do produto.

### Recursos suportados:

**Negrito**: `**texto em negrito**` ou `__texto em negrito__`
- Resultado: **texto em negrito**

**Itálico**: `*texto em itálico*` ou `_texto em itálico_`
- Resultado: *texto em itálico*

**Quebra de linha**: Use `\n` para quebrar linha
```json
{
  "descricao": "Primeira linha\nSegunda linha\nTerceira linha"
}
```

**Listas não ordenadas**:
```json
{
  "descricao": "Características:\n- Item 1\n- Item 2\n- Item 3"
}
```

**Listas ordenadas**:
```json
{
  "descricao": "Passo a passo:\n1. Primeiro passo\n2. Segundo passo\n3. Terceiro passo"
}
```

**Links**: `[texto do link](https://exemplo.com)` - links abrem automaticamente em nova aba
```json
{
  "descricao": "Veja mais em [nosso site](https://exemplo.com)"
}
```

**Combinação completa**:
```json
{
  "descricao": "**Notebook de alta performance**\n\nCaracterísticas principais:\n- Processador Intel i7\n- 16GB RAM DDR5\n- SSD 512GB NVMe\n\n*Ideal para jogos e trabalho pesado*\n\nMais informações: [clique aqui](https://exemplo.com)"
}
```

### ⚠️ Observações importantes:
- ✅ Texto simples sem Markdown continua funcionando normalmente
- ✅ Links sempre abrem em nova aba (atributo `target="_blank"` e `rel="noopener noreferrer"`)
- ✅ Quebras de linha (`\n`) são respeitadas
- ⚠️ HTML inline NÃO é suportado por questões de segurança
- ⚠️ Títulos (#, ##, ###) são suportados mas devem ser usados com moderação na descrição

---

## Campo Especial: `anuncio_referencia`

### Descrição
Link para um anúncio de referência externo onde o produto está disponível (geralmente mais barato).

### Comportamento Automático
⚠️ **IMPORTANTE**: Quando o campo `anuncio_referencia` é preenchido com uma URL válida:
- O produto é **AUTOMATICAMENTE** marcado como destaque (`produto_destaque = true`)
- O produto aparecerá nos carrosséis de produtos em destaque
- Um botão "Ver Anúncio de Referência" será exibido na página do produto

### Validação
- Deve ser uma URL válida (formato: `https://...`)
- Pode ser vazio ou nulo

### Exemplo de Uso
```json
{
  "nome": "Fone de Ouvido Bluetooth",
  "preco": 89.90,
  "anuncio_referencia": "https://www.mercadolivre.com.br/fone-bluetooth-exemplo",
  "categoria_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Resultado**: O produto será criado e automaticamente marcado como destaque, independente do valor de `produto_destaque`.

---

## 🔐 Sistema de Aprovação de Produtos por Fornecedor

### Fluxo de Cadastro - Diagrama

```
┌─────────────────────────────────────────┐
│   CADASTRO VIA API (Super Admin)       │
└───────────────┬─────────────────────────┘
                │
                ├─────────────────────────────────────────────────────┐
                │                                                     │
        ┌───────▼────────┐                               ┌───────────▼──────────┐
        │  CENÁRIO 1     │                               │     CENÁRIO 2        │
        │  COM Aprovação │                               │  SEM Aprovação       │
        └───────┬────────┘                               └──────────┬───────────┘
                │                                                   │
     fornecedor_id ✅                                    fornecedor_id ✅
     requer_aprovacao: true                             requer_aprovacao: false
                │                                                   │
        ┌───────▼────────┐                               ┌──────────▼───────────┐
        │ approval_status│                               │  approval_status     │
        │ 'pending_approval'                             │  'draft'             │
        │ active: false  │                               │  active: true        │
        └───────┬────────┘                               └──────────────────────┘
                │                                                   │
        Notificação ao                                    Produto publicado
        fornecedor                                        diretamente
                │
    ┌───────────▼────────────┐
    │  Fornecedor decide     │
    └───────────┬────────────┘
                │
        ┌───────┴───────┐
        │               │
   ┌────▼─────┐   ┌────▼──────┐
   │ APROVAR  │   │ REJEITAR  │
   └────┬─────┘   └────┬──────┘
        │              │
   active: true   rejection_reason
   Publicado      preenchido
        │              │
   Notifica       Notifica
   Super Admin    Super Admin

                ┌───────────────────────────────────┐
                │        CENÁRIO 3                  │
                │     Produto Normal (Sem Fornecedor)│
                └───────────────┬───────────────────┘
                                │
                     fornecedor_id: null
                     requer_aprovacao: false
                                │
                    ┌───────────▼────────────┐
                    │  approval_status       │
                    │  'draft'               │
                    │  active: true          │
                    └────────────────────────┘
                                │
                    Produto publicado normalmente
```

---

### 📊 Tabela de Cenários de Cadastro

| Cenário | fornecedor_id | requer_aprovacao | approval_status | active | Comportamento |
|---------|---------------|------------------|-----------------|--------|---------------|
| **1. Com Aprovação** | ✅ UUID válido | `true` | `pending_approval` | `false` | Produto aguarda aprovação do fornecedor. Notificação enviada. |
| **2. Fornecedor Direto** | ✅ UUID válido | `false` ou ausente | `draft` | `true` | Produto publicado diretamente para o fornecedor. |
| **3. Produto Normal** | ❌ null/ausente | `false` ou ausente | `draft` | `true` | Produto normal sem fornecedor atribuído. |

---

### 🔑 Campos Somente Leitura (Retornados na Resposta)

Estes campos são calculados automaticamente pelo sistema e **NÃO** devem ser enviados no payload da requisição:

| Campo | Tipo | Descrição | Quando é preenchido |
|-------|------|-----------|---------------------|
| `approval_status` | string | Status de aprovação | Calculado automaticamente no cadastro |
| `approved_by` | UUID | ID do usuário que aprovou | Quando o fornecedor aprova o produto |
| `approved_at` | timestamp | Data/hora da aprovação | Quando o fornecedor aprova o produto |
| `rejection_reason` | string | Motivo da rejeição | Quando o fornecedor rejeita o produto |
| `rejected_at` | timestamp | Data/hora da rejeição | Quando o fornecedor rejeita o produto |
| `created_by` | UUID | ID do usuário que criou | Automaticamente (user_id da API key) |

**Estados possíveis de `approval_status`:**
- `draft`: Produto em rascunho (padrão para produtos normais)
- `pending_approval`: Aguardando aprovação do fornecedor
- `approved`: Aprovado pelo fornecedor e publicado
- `rejected`: Rejeitado pelo fornecedor com motivo

---

### 📝 Exemplos Práticos Completos

#### **Exemplo 1: Produto COM Aprovação (Cenário 1)**

Produto enviado ao fornecedor para aprovação antes de ser publicado.

**Requisição:**
```bash
curl -X POST https://lojafy.6ksfuf.easypanel.host/functions/v1/api-produtos-cadastrar \
  -H "X-API-Key: sua-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Mouse Gamer RGB Pro",
    "descricao": "Mouse gamer com 7 botões programáveis e iluminação RGB",
    "preco": 149.90,
    "preco_custo": 89.90,
    "estoque": 50,
    "marca": "TechGear",
    "categoria_id": "550e8400-e29b-41d4-a716-446655440001",
    "fornecedor_id": "550e8400-e29b-41d4-a716-446655440000",
    "requer_aprovacao": true
  }'
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "message": "Produto criado com sucesso e enviado para aprovação do fornecedor",
  "data": {
    "id": "abc-123-def-456",
    "nome": "Mouse Gamer RGB Pro",
    "preco": 149.90,
    "estoque": 50,
    "fornecedor_id": "550e8400-e29b-41d4-a716-446655440000",
    "requer_aprovacao": true,
    "approval_status": "pending_approval",
    "active": false,
    "created_by": "user-uuid-da-api-key",
    "created_at": "2025-11-06T12:00:00Z",
    "approved_by": null,
    "approved_at": null,
    "rejection_reason": null
  }
}
```

**O que acontece após o cadastro:**
1. ✅ Fornecedor recebe notificação instantânea
2. ✅ Produto aparece em `/supplier/produtos/aprovacao` (Painel do Fornecedor)
3. ⏳ Produto NÃO aparece na loja pública até aprovação
4. ✅ Fornecedor pode APROVAR ou REJEITAR
5. ✅ Super Admin recebe notificação da decisão

---

#### **Exemplo 2: Produto SEM Aprovação (Cenário 2)**

Produto atribuído ao fornecedor mas publicado diretamente sem aprovação.

**Requisição:**
```bash
curl -X POST https://lojafy.6ksfuf.easypanel.host/functions/v1/api-produtos-cadastrar \
  -H "X-API-Key: sua-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Teclado Mecânico RGB",
    "descricao": "Teclado mecânico com switches blue e iluminação RGB personalizável",
    "preco": 299.90,
    "preco_custo": 189.90,
    "estoque": 30,
    "marca": "KeyMaster",
    "categoria_id": "550e8400-e29b-41d4-a716-446655440001",
    "fornecedor_id": "550e8400-e29b-41d4-a716-446655440000",
    "requer_aprovacao": false
  }'
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "message": "Produto criado com sucesso",
  "data": {
    "id": "xyz-789-abc-012",
    "nome": "Teclado Mecânico RGB",
    "preco": 299.90,
    "estoque": 30,
    "fornecedor_id": "550e8400-e29b-41d4-a716-446655440000",
    "requer_aprovacao": false,
    "approval_status": "draft",
    "active": true,
    "created_by": "user-uuid-da-api-key",
    "created_at": "2025-11-06T12:00:00Z"
  }
}
```

**O que acontece após o cadastro:**
1. ✅ Produto publicado IMEDIATAMENTE na loja
2. ✅ Aparece nos catálogos públicos
3. ✅ Fornecedor pode gerenciar estoque e editar
4. ❌ Não envia notificação de aprovação (não requer)

---

#### **Exemplo 3: Produto Normal SEM Fornecedor (Cenário 3)**

Produto cadastrado sem fornecedor (gestão interna).

**Requisição:**
```bash
curl -X POST https://lojafy.6ksfuf.easypanel.host/functions/v1/api-produtos-cadastrar \
  -H "X-API-Key: sua-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Headset Bluetooth Premium",
    "descricao": "Headset com cancelamento de ruído ativo e 40h de bateria",
    "preco": 199.90,
    "preco_custo": 120.00,
    "estoque": 100,
    "marca": "SoundPro",
    "categoria_id": "550e8400-e29b-41d4-a716-446655440001",
    "badge": "Mais Vendido"
  }'
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "message": "Produto criado com sucesso",
  "data": {
    "id": "def-456-ghi-789",
    "nome": "Headset Bluetooth Premium",
    "preco": 199.90,
    "estoque": 100,
    "fornecedor_id": null,
    "requer_aprovacao": false,
    "approval_status": "draft",
    "active": true,
    "created_by": "user-uuid-da-api-key",
    "created_at": "2025-11-06T12:00:00Z"
  }
}
```

**O que acontece após o cadastro:**
1. ✅ Produto publicado IMEDIATAMENTE
2. ✅ Sem fornecedor atribuído (gestão interna)
3. ✅ Aparece nos catálogos públicos
4. ✅ Gerenciado diretamente pelo Admin

---

### 🔍 O Que Acontece no Fluxo de Aprovação?

#### **Passo 1: Cadastro** (via API)
- Super Admin envia produto com `fornecedor_id` + `requer_aprovacao: true`
- Sistema cria produto com `approval_status: 'pending_approval'` e `active: false`
- Notificação criada na tabela `notifications` para o fornecedor

#### **Passo 2: Notificação ao Fornecedor**
- Fornecedor vê notificação no sino 🔔 do dashboard
- Contador de produtos pendentes aparece no menu lateral
- Link direto para `/supplier/produtos/aprovacao`

#### **Passo 3: Análise do Fornecedor**
No painel `/supplier/produtos/aprovacao`, o fornecedor pode:
- 📋 Ver todos os detalhes do produto
- 💰 Avaliar preços e margens
- 📦 Verificar especificações
- ✅ **APROVAR** → Produto vai para `approved` e `active: true`
- ❌ **REJEITAR** → Fornecedor deve fornecer `rejection_reason`

#### **Passo 4: Notificação ao Super Admin**
Após decisão do fornecedor:
- Super Admin recebe notificação da decisão
- Se aprovado: Produto publicado automaticamente
- Se rejeitado: Super Admin vê o motivo da rejeição

---

### 🚨 Troubleshooting - Erros Comuns

#### **❌ Erro: "Campo fornecedor_id é obrigatório quando requer_aprovacao=true"**

**Causa:** Tentou criar produto com aprovação mas sem fornecedor.

**Solução:**
```json
{
  "nome": "Produto Exemplo",
  "preco": 100.00,
  "fornecedor_id": "550e8400-e29b-41d4-a716-446655440000",  // ✅ Adicionar UUID válido
  "requer_aprovacao": true
}
```

---

#### **❌ Erro: "Fornecedor não encontrado, inativo ou não possui role de fornecedor"**

**Causas possíveis:**
1. UUID não existe na tabela `profiles`
2. Usuário não tem `role = 'supplier'`
3. Usuário está com `is_active = false`

**Solução:**
```sql
-- Verificar fornecedor no banco
SELECT id, email, role, is_active 
FROM profiles 
WHERE id = '550e8400-e29b-41d4-a716-446655440000';

-- Resultado esperado:
-- role: 'supplier'
-- is_active: true
```

---

#### **❌ Erro: "Formato de UUID inválido"**

**Causa:** UUID mal formatado.

**❌ Formato incorreto:**
```json
{
  "fornecedor_id": "123456"  // ❌ Muito curto
}
```

**✅ Formato correto:**
```json
{
  "fornecedor_id": "550e8400-e29b-41d4-a716-446655440000"  // ✅ UUID completo
}
```

**Padrão UUID:** `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` (32 caracteres + 4 hífens)

---

#### **❌ Erro: "Preço promocional deve ser menor que o preço regular"**

**Causa:** `preco_promocional` maior ou igual a `preco`.

**❌ Incorreto:**
```json
{
  "preco": 100.00,
  "preco_promocional": 150.00  // ❌ Maior que preco
}
```

**✅ Correto:**
```json
{
  "preco": 150.00,
  "preco_promocional": 100.00  // ✅ Menor que preco
}
```

---

#### **❌ Erro: "Preço de custo não pode ser maior ou igual ao preço de venda"**

**Causa:** `preco_custo` >= `preco`.

**❌ Incorreto:**
```json
{
  "preco": 100.00,
  "preco_custo": 120.00  // ❌ Sem margem de lucro
}
```

**✅ Correto:**
```json
{
  "preco": 150.00,
  "preco_custo": 100.00  // ✅ Margem de 50%
}
```

---

#### **❌ Erro: "Subcategoria não pertence à categoria fornecida"**

**Causa:** `subcategoria_id` não é filha da `categoria_id`.

**Solução:**
```sql
-- Verificar relacionamento
SELECT s.id, s.nome, s.categoria_id 
FROM subcategorias s 
WHERE s.id = 'uuid-da-subcategoria';

-- categoria_id deve corresponder ao valor enviado na requisição
```

---

### 📚 Documentação Relacionada

Para entender melhor o sistema completo de aprovação:

- **[Documentação do Sistema de Aprovação](/docs/ProductApprovalSystem.md)** - Fluxo completo, tabelas do banco, RLS policies
- **[Painel do Fornecedor](/docs/SupplierPanel.md)** - Interface de aprovação/rejeição
- **Rota do Painel:** `/supplier/produtos/aprovacao` - Onde fornecedores gerenciam aprovações

---

### ⚙️ Integrações e Notificações

#### **Tabela de Notificações (`notifications`)**

Quando um produto entra em aprovação, é criado um registro:

```sql
INSERT INTO notifications (
  user_id,              -- UUID do fornecedor
  type,                 -- 'product_approval_request'
  title,                -- "Novo produto para aprovação"
  message,              -- "Produto [nome] requer sua aprovação"
  related_id,           -- UUID do produto
  created_at
) VALUES (...);
```

#### **Webhooks (Futuro)**

Em breve será possível configurar webhooks para:
- ✅ Produto enviado para aprovação
- ✅ Produto aprovado
- ❌ Produto rejeitado
- ⏰ Produto expirou sem aprovação (timeout configurável)

---

### ⚠️ Regras de Negócio Importantes

| Regra | Comportamento |
|-------|---------------|
| **Fornecedor + Aprovação** | Produto fica inativo até aprovação |
| **Fornecedor sem Aprovação** | Produto publicado imediatamente |
| **Sem Fornecedor** | Produto publicado como gestão interna |
| **Notificações** | Apenas para produtos com `requer_aprovacao: true` |
| **RLS Policies** | Fornecedores veem apenas SEUS produtos |
| **Super Admin** | Pode ver e gerenciar TODOS os produtos |

---

## Exemplo de Requisição Completa

```bash
curl -X POST https://seu-projeto.supabase.co/functions/v1/api-produtos-cadastrar \
  -H "X-API-Key: sua-api-key-aqui" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Notebook Dell Inspiron 15",
    "descricao": "Notebook com processador Intel Core i5, 8GB RAM, 256GB SSD",
    "preco": 3499.90,
    "preco_promocional": 2999.90,
    "preco_custo": 2500.00,
    "estoque": 10,
    "nivel_minimo_estoque": 3,
    "marca": "Dell",
    "categoria_id": "123e4567-e89b-12d3-a456-426614174000",
    "peso": 1.8,
    "largura": 35.8,
    "altura": 2.3,
    "comprimento": 24.9,
    "badge": "Oferta Relâmpago",
    "anuncio_referencia": "https://www.magazineluiza.com.br/notebook-dell-exemplo",
    "especificacoes": {
      "Processador": "Intel Core i5 11ª Geração",
      "Memória RAM": "8GB DDR4",
      "Armazenamento": "SSD 256GB",
      "Tela": "15.6 polegadas Full HD"
    }
  }'
```

## Resposta de Sucesso

```json
{
  "success": true,
  "message": "Produto criado com sucesso",
  "data": {
    "id": "produto-uuid",
    "nome": "Notebook Dell Inspiron 15",
    "sku": "DELL-NOT-001",
    "gtin": "7891234567890",
    "produto_destaque": true,
    "anuncio_referencia": "https://www.magazineluiza.com.br/notebook-dell-exemplo",
    "criado_em": "2025-01-01T10:00:00Z"
  }
}
```

## Respostas de Erro

### URL Inválida
```json
{
  "error": "anuncio_referencia deve ser uma URL válida",
  "received": {
    "anuncio_referencia": "url-invalida"
  }
}
```

### Campos Obrigatórios Faltando
```json
{
  "error": "Campos obrigatórios: nome, preco",
  "received": {
    "nome": null,
    "preco": null
  }
}
```

### Validação de Preço
```json
{
  "error": "Preço promocional deve ser menor que o preço regular",
  "received": {
    "preco": 100.00,
    "preco_promocional": 150.00
  }
}
```

## Comportamento de Campos Auto-gerados

- **SKU**: Se não fornecido, será gerado automaticamente baseado na categoria e marca
- **GTIN/EAN-13**: Se não fornecido, será gerado automaticamente
- **produto_destaque**: Será `true` se `anuncio_referencia` estiver preenchido, caso contrário seguirá o valor enviado

## Notas Importantes

1. ✅ Sempre forneça URLs completas (incluindo `https://`) para `anuncio_referencia`
2. ✅ O campo `anuncio_referencia` ativa automaticamente o destaque do produto
3. ✅ Produtos com anúncio de referência aparecem nas categorias e em destaque
4. ✅ Um botão especial é exibido na página do produto para acessar o anúncio externo
5. ⚠️ A validação de `subcategoria_id` verifica se pertence à `categoria_id` fornecida
