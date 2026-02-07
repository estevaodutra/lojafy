

# Novo Endpoint: Listar Tokens ML Expirando

## Resumo

Criar o endpoint `GET /lojafy-integra/mercadolivre/expiring-tokens` que lista integracoes ativas do Mercado Livre com tokens proximos de expirar. O n8n consultara este endpoint a cada 5 horas para renovar tokens antes que expirem (ciclo de 6 horas do ML).

## Alteracoes

### 1. Edge Function (`supabase/functions/lojafy-integra/index.ts`)

Adicionar novo handler para a rota `GET /mercadolivre/expiring-tokens` **antes** do bloco "Endpoint nao encontrado" (linha 460). O roteamento usara `endpoint === 'mercadolivre'` e `subEndpoint === 'expiring-tokens'`.

**Logica do handler:**
1. Ler parametro `minutes` (default: 60) e `include_expired` (default: false)
2. Calcular threshold = agora + X minutos
3. Query em `mercadolivre_integrations` onde `is_active = true` e `expires_at < threshold`
4. Se `include_expired = false`, filtrar tambem `expires_at > now`
5. Enriquecer cada registro com `minutes_until_expiration` e `is_expired`
6. Logar a requisicao e retornar

**Campos retornados por integracao:**
- `id` - UUID da integracao
- `user_id` - UUID do usuario Lojafy
- `ml_user_id` - ID do usuario no Mercado Livre
- `refresh_token` - Token para renovacao (usado pelo n8n)
- `expires_at` - Data/hora de expiracao do access_token
- `is_active` - Status da integracao
- `minutes_until_expiration` - Minutos restantes (negativo se expirado)
- `is_expired` - Boolean indicando se ja expirou

### 2. Documentacao (`src/data/apiEndpointsData.ts`)

Adicionar o endpoint na subcategoria "Mercado Livre" (`integraMLEndpoints`), que atualmente tem apenas 1 endpoint (Salvar Token OAuth). O novo endpoint ficara como segundo item do array.

**Documentacao incluira:**
- Descricao do endpoint
- Headers (X-API-Key)
- Query params: `minutes` (number, default 60) e `include_expired` (boolean, default false)
- Response example com 2 integracoes
- Error examples: nenhum token expirando (array vazio com count 0)

### Arquivos Modificados

1. **`supabase/functions/lojafy-integra/index.ts`** - Adicionar handler `GET /mercadolivre/expiring-tokens` (~50 linhas)
2. **`src/data/apiEndpointsData.ts`** - Adicionar endpoint no array `integraMLEndpoints` (~60 linhas)

## Resposta do Endpoint

```json
{
  "success": true,
  "data": [
    {
      "id": "abc-123-def-456",
      "user_id": "02e09339-0ebb-4fe4-a816-b8aca7294e16",
      "ml_user_id": 1253724320,
      "refresh_token": "TG-69862b0ccbcccce00017dd04b-1253724320",
      "expires_at": "2026-02-07T14:30:00.000Z",
      "is_active": true,
      "minutes_until_expiration": 45,
      "is_expired": false
    }
  ],
  "count": 1,
  "checked_at": "2026-02-07T13:45:00.000Z",
  "threshold_minutes": 60
}
```

Quando nenhum token esta expirando:
```json
{
  "success": true,
  "data": [],
  "count": 0,
  "checked_at": "2026-02-07T13:45:00.000Z",
  "threshold_minutes": 60
}
```

## Fluxo Completo

```text
n8n (Schedule 5h)
       |
       v
GET /mercadolivre/expiring-tokens?minutes=90
       |
       v
Para cada integracao retornada:
  1. POST api.mercadolibre.com/oauth/token (refresh)
  2. PATCH mercadolivre_integrations (novos tokens)
       |
       v
Tokens sempre validos
```

