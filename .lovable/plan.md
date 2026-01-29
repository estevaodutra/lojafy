

# Plano: Categoria "Features" na API

## Visão Geral

Adicionar uma nova categoria **"Features"** na documentação da API com dois endpoints:
1. **Listar Features** - Retorna todas as features disponíveis no catálogo
2. **Atribuir Feature** - Atribui uma feature a um usuário específico

---

## Arquitetura dos Endpoints

```text
┌─────────────────────────────────────────────────────────────┐
│                     Features API                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  GET /api-features-listar                                   │
│  ├─ Auth: X-API-Key                                         │
│  ├─ Query: active, categoria                                │
│  └─ Response: Lista de features com contadores              │
│                                                             │
│  POST /api-features-atribuir                                │
│  ├─ Auth: X-API-Key                                         │
│  ├─ Body: user_id, feature_slug, tipo_periodo, motivo       │
│  └─ Response: Confirmação + data de expiração               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Edge Function: `api-features-listar`

### Especificação

| Campo | Valor |
|-------|-------|
| Método | GET |
| Autenticação | X-API-Key |
| Permissão | `features.read` |

### Query Parameters

| Parâmetro | Descrição | Exemplo |
|-----------|-----------|---------|
| `active` | Filtrar por status ativo | `true` |
| `categoria` | Filtrar por categoria | `loja` |

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "slug": "loja_propria",
      "nome": "Loja Completa",
      "descricao": "Permite criar e gerenciar uma loja personalizada",
      "icone": "Store",
      "categoria": "loja",
      "ativo": true,
      "preco_mensal": 49.90,
      "preco_anual": 479.00,
      "preco_vitalicio": 1499.00,
      "trial_dias": 7,
      "usuarios_ativos": 15
    }
  ],
  "summary": {
    "total": 2,
    "por_categoria": { "loja": 1, "recursos": 1 }
  }
}
```

---

## 2. Edge Function: `api-features-atribuir`

### Especificação

| Campo | Valor |
|-------|-------|
| Método | POST |
| Autenticação | X-API-Key |
| Permissão | `features.write` |

### Request Body

```json
{
  "user_id": "uuid-do-usuario",
  "feature_slug": "loja_propria",
  "tipo_periodo": "mensal",
  "motivo": "Parceria comercial"
}
```

### Tipos de Período

| Tipo | Duração | Descrição |
|------|---------|-----------|
| `trial` | feature.trial_dias | Período de teste gratuito |
| `mensal` | 30 dias | Assinatura mensal |
| `anual` | 365 dias | Assinatura anual |
| `vitalicio` | Sem expiração | Acesso permanente |
| `cortesia` | Sem expiração | Cortesia administrativa |

### Response

```json
{
  "success": true,
  "message": "Feature atribuída com sucesso",
  "data": {
    "user_id": "uuid",
    "feature_slug": "loja_propria",
    "status": "ativo",
    "tipo_periodo": "mensal",
    "data_inicio": "2026-01-29T00:00:00Z",
    "data_expiracao": "2026-02-28T00:00:00Z"
  }
}
```

### Validações

- Verifica se a feature existe e está ativa
- Verifica se o usuário existe
- Valida dependências (`requer_features`)
- Registra transação para auditoria

---

## 3. Documentação da API

### Nova Categoria

Adicionar ao `apiEndpointsData.ts`:

```typescript
const featuresEndpoints: EndpointData[] = [
  {
    title: 'Listar Features',
    method: 'GET',
    url: '/functions/v1/api-features-listar',
    description: 'Retorna a lista de features disponíveis no catálogo.',
    queryParams: [
      { name: 'active', description: 'Filtrar por status ativo', example: 'true' },
      { name: 'categoria', description: 'Filtrar por categoria', example: 'loja' }
    ],
    responseExample: {
      success: true,
      data: [{ slug: 'loja_propria', nome: 'Loja Completa' }],
      summary: { total: 2 }
    }
  },
  {
    title: 'Atribuir Feature',
    method: 'POST',
    url: '/functions/v1/api-features-atribuir',
    description: 'Atribui uma feature a um usuário específico.',
    requestBody: {
      user_id: 'uuid-usuario',
      feature_slug: 'loja_propria',
      tipo_periodo: 'mensal',
      motivo: 'Parceria comercial'
    },
    responseExample: {
      success: true,
      message: 'Feature atribuída com sucesso',
      data: { status: 'ativo', data_expiracao: '2026-02-28' }
    }
  }
];
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/functions/api-features-listar/index.ts` | **Criar** |
| `supabase/functions/api-features-atribuir/index.ts` | **Criar** |
| `src/data/apiEndpointsData.ts` | **Modificar** - Adicionar categoria Features |
| `supabase/config.toml` | **Modificar** - Registrar novas funções |

---

## Permissões na API Key

As novas edge functions verificarão permissões no objeto `permissions` da API key:

```json
{
  "features": {
    "read": true,
    "write": true
  }
}
```

---

## Ordem das Categorias na Documentação

1. Catálogo
2. Pedidos
3. Ranking & Demo
4. **Features** (nova)
5. Academy

