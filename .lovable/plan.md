

# Plano: Nova Categoria "Lojafy Integra" na API

## Visão Geral

Criar uma nova categoria na documentação da API chamada **"Lojafy Integra"** com subcategoria **"Mercado Livre"** e um endpoint para receber e armazenar tokens OAuth do Mercado Livre.

---

## Arquitetura

```text
┌─────────────────────────────────────────────────────────────┐
│  OAuth Flow: Mercado Livre                                  │
└─────────────────────────────────────────────────────────────┘
         │
         │ Callback → n8n → Edge Function
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Edge Function: api-integra-ml-token                        │
│  - Recebe access_token, refresh_token, user_id ML           │
│  - Vincula ao user_id Lojafy (via state)                   │
│  - Armazena na tabela mercadolivre_integrations            │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Tabela: mercadolivre_integrations                          │
│  - user_id (FK → profiles)                                  │
│  - access_token, refresh_token                              │
│  - ml_user_id, expires_at, scope                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Criar/Modificar

| Tipo | Arquivo | Ação |
|------|---------|------|
| **Banco** | Migration SQL | Criar tabela `mercadolivre_integrations` |
| **Edge Function** | `supabase/functions/api-integra-ml-token/index.ts` | Criar endpoint para receber tokens |
| **Docs** | `src/data/apiEndpointsData.ts` | Adicionar categoria "Lojafy Integra" |
| **Sidebar** | `src/components/admin/ApiDocsSidebar.tsx` | Adicionar ícone `Plug` para categoria |

---

## 1. Estrutura da Tabela `mercadolivre_integrations`

```sql
CREATE TABLE public.mercadolivre_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dados do OAuth do Mercado Livre
  access_token TEXT NOT NULL,
  token_type TEXT DEFAULT 'Bearer',
  refresh_token TEXT,
  expires_in INTEGER,
  expires_at TIMESTAMPTZ,
  scope TEXT,
  ml_user_id BIGINT NOT NULL,
  
  -- Metadados
  is_active BOOLEAN DEFAULT true,
  last_refreshed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: um usuário só pode ter uma integração ativa por vez
  UNIQUE(user_id)
);

-- RLS
ALTER TABLE public.mercadolivre_integrations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own integrations" 
  ON public.mercadolivre_integrations FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all integrations" 
  ON public.mercadolivre_integrations FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_mercadolivre_integrations_updated_at
  BEFORE UPDATE ON public.mercadolivre_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## 2. Edge Function: `api-integra-ml-token`

**Propósito:** Receber tokens OAuth do Mercado Livre (enviados pelo n8n após callback) e armazená-los vinculados ao usuário Lojafy.

### Fluxo:
1. Receber POST com array de tokens (estrutura enviada pelo n8n)
2. Validar API Key com permissão `integracoes.write`
3. Extrair `user_id` Lojafy do campo `state` ou do body
4. Calcular `expires_at` baseado em `expires_in` (segundos)
5. Upsert na tabela `mercadolivre_integrations`

### Request Body Esperado:
```json
{
  "lojafy_user_id": "uuid-do-usuario-lojafy",
  "access_token": "APP_USR-...",
  "token_type": "Bearer",
  "expires_in": 21600,
  "scope": "read write ...",
  "user_id": 395399092,
  "refresh_token": "TG-..."
}
```

### Response:
```json
{
  "success": true,
  "message": "Integração Mercado Livre salva com sucesso",
  "data": {
    "integration_id": "uuid",
    "lojafy_user_id": "uuid",
    "ml_user_id": 395399092,
    "expires_at": "2026-02-06T06:00:00Z",
    "is_active": true
  }
}
```

---

## 3. Documentação da API: Nova Categoria

Adicionar em `src/data/apiEndpointsData.ts`:

```typescript
// Lojafy Integra - Mercado Livre Endpoints
const integraMLEndpoints: EndpointData[] = [
  {
    title: 'Salvar Token OAuth',
    method: 'POST',
    url: '/functions/v1/api-integra-ml-token',
    description: 'Recebe e armazena os tokens OAuth do Mercado Livre...',
    headers: [...],
    requestBody: {...},
    responseExample: {...}
  }
];

// Export com nova categoria
export const apiEndpointsData: EndpointCategory[] = [
  // ... categorias existentes
  {
    id: 'integra',
    title: 'Lojafy Integra',
    subcategories: [
      { 
        id: 'integra-ml', 
        title: 'Mercado Livre', 
        endpoints: integraMLEndpoints 
      }
    ]
  }
];
```

---

## 4. Sidebar: Adicionar Ícone

Em `src/components/admin/ApiDocsSidebar.tsx`:

```typescript
import { ..., Plug } from 'lucide-react';

const categoryIcons: Record<string, React.ElementType> = {
  catalog: Package,
  orders: ShoppingCart,
  ranking: BarChart3,
  academy: GraduationCap,
  integra: Plug,  // ← Adicionar
};
```

---

## 5. Permissões da API Key

O endpoint usará a permissão `integracoes.write` nas chaves de API. Isso segue o padrão existente de permissões em português (`pedidos`, `categorias`, `features`, etc.).

---

## Resumo das Ações

1. **Migração SQL**: Criar tabela `mercadolivre_integrations` com RLS
2. **Edge Function**: Criar `api-integra-ml-token/index.ts` para receber tokens
3. **apiEndpointsData.ts**: Adicionar categoria "Lojafy Integra" com subcategoria "Mercado Livre"
4. **ApiDocsSidebar.tsx**: Adicionar ícone `Plug` para a categoria
5. **Testar**: Verificar endpoint via documentação e cURL

---

## Notas Técnicas

- O campo `refresh_token` pode vir vazio se a autorização não incluiu escopo offline
- `expires_in` é em segundos (21600 = 6 horas)
- `ml_user_id` é o ID numérico do usuário no Mercado Livre
- O endpoint usa UPSERT para permitir re-autenticação (atualiza token existente)
- RLS permite que usuários vejam apenas suas próprias integrações

