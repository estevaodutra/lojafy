

## Plano: Criar e documentar endpoint "Buscar Pedido"

### Objetivo
Criar um novo endpoint REST para buscar **um pedido específico** (com todos os detalhes do payload completo do `api-pedidos-listar`, incluindo cliente, itens enriquecidos, breakdown financeiro e variações) e adicioná-lo na documentação da API.

### Investigação realizada
- Já existem `api-pedidos-listar` (lista paginada), `api-pedidos-recentes` (recentes) e `api-pedidos-atualizar-status` (PUT)
- **Não existe** endpoint para buscar 1 pedido específico — vamos criar `api-pedidos-buscar`
- Padrão de autenticação: header `X-API-Key`, validação na tabela `api_keys`, permissão `pedidos.read` ou `orders.read`
- Estrutura de retorno vai espelhar o item retornado pelo `api-pedidos-listar` (mesmo enriquecimento financeiro, customer formatado, items com breakdown)

### Solução

#### 1. Criar Edge Function `supabase/functions/api-pedidos-buscar/index.ts`
- Método: `GET`
- Aceita query params (qualquer um identifica o pedido):
  - `order_number` → busca por número (ex: `ORD-12345`)
  - `id` → busca por UUID
  - `external_reference` → busca por referência externa (Mercado Pago)
  - `payment_id` → busca por ID de pagamento
- Validação: **pelo menos um** identificador deve ser fornecido
- Reaproveita as funções `formatCPF`, `formatPhone`, `calculatePriceBreakdown`, `calculateFinancialSummary` (mesmo padrão do `api-pedidos-listar`)
- Retorna `404` quando não encontrar
- Retorna o mesmo objeto enriquecido (single, não array)

#### 2. Registrar a função em `supabase/config.toml`
- Adicionar `[functions.api-pedidos-buscar]` com `verify_jwt = false` (autentica por X-API-Key)

#### 3. Documentar em `src/data/apiEndpointsData.ts`
- Adicionar novo endpoint na categoria de pedidos (após "Listar Pedidos Completos"):
  - Título: "Buscar Pedido"
  - Method: `GET`
  - URL: `/functions/v1/api-pedidos-buscar`
  - QueryParams: `order_number`, `id`, `external_reference`, `payment_id` (todos opcionais, mas pelo menos um obrigatório)
  - Headers: `X-API-Key`
  - responseExample: pedido completo (customer, items com `image_url`/`product_url`/`cost_price`/`variation`, financial_summary)
  - errorExamples: 400 (sem identificador), 401 (api key), 403 (sem permissão), 404 (não encontrado)

### Estrutura do retorno (resumo)
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "order_number": "ORD-12345",
    "status": "confirmed",
    "payment_status": "approved",
    "total_amount": 299.90,
    "customer": { "full_name": "...", "cpf": "...", "phone": "..." },
    "shipping_address": {...},
    "items": [{ "product_id": "...", "product_url": "...", "image_url": "...", "cost_price": 12.5, "variation": {...}, "price_breakdown": {...} }],
    "financial_summary": {...}
  }
}
```

### Arquivos
| Arquivo | Ação |
|---|---|
| `supabase/functions/api-pedidos-buscar/index.ts` | criar (Edge Function) |
| `supabase/config.toml` | registrar função (`verify_jwt = false`) |
| `src/data/apiEndpointsData.ts` | adicionar entrada de documentação |

