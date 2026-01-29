

# Plano: Atualizar Documentação API - Lógica de Expiração Features

## Mudança na Documentação

Atualizar a seção **Features** em `src/data/apiEndpointsData.ts` para refletir que a expiração agora é vinculada ao perfil do usuário.

---

## Alterações no Endpoint "Atribuir Feature"

### Descrição Atual
> "Atribui uma feature a um usuário específico com validação de dependências."

### Nova Descrição
> "Atribui uma feature a um usuário. A expiração é controlada pela data do perfil (subscription_expires_at). Períodos vitalício/cortesia nunca expiram."

### Request Body - Atualizar Comentário

| Campo | Descrição Atualizada |
|-------|---------------------|
| `tipo_periodo` | Define o tipo de assinatura. Para mensal/anual/trial, a expiração usa a data do perfil. |

### Response Example - Atualizar

**Atual:**
```json
{
  "data": {
    "data_expiracao": "2026-02-28T00:00:00Z"
  }
}
```

**Novo:**
```json
{
  "data": {
    "tipo_periodo": "mensal",
    "usa_expiracao_perfil": true,
    "expiracao_perfil": "2026-02-28T00:00:00Z"
  }
}
```

---

## Alterações no Endpoint "Listar Features"

Adicionar campo `expiracao_info` na resposta para documentar a lógica.

---

## Arquivo Modificado

| Arquivo | Alteração |
|---------|-----------|
| `src/data/apiEndpointsData.ts` | Atualizar descrições, request body e response examples |

---

## Código Final - Seção Features

```typescript
const featuresEndpoints: EndpointData[] = [
  {
    title: 'Listar Features',
    method: 'GET',
    url: '/functions/v1/api-features-listar',
    description: 'Retorna a lista de features disponíveis no catálogo com contagem de usuários ativos.',
    // ... headers e queryParams mantidos
    responseExample: {
      success: true,
      data: [
        {
          id: 'uuid',
          slug: 'loja_propria',
          nome: 'Loja Completa',
          descricao: 'Permite criar e gerenciar uma loja personalizada',
          icone: 'Store',
          categoria: 'loja',
          ativo: true,
          preco_mensal: 49.90,
          preco_anual: 479.00,
          trial_dias: 7,
          usuarios_ativos: 15
        }
      ],
      summary: {
        total: 2,
        por_categoria: { loja: 1, recursos: 1 }
      },
      expiracao_info: {
        nota: 'A expiração das features é controlada por profiles.subscription_expires_at',
        excecoes: ['vitalicio', 'cortesia']
      }
    },
    // ... errorExamples mantidos
  },
  {
    title: 'Atribuir Feature',
    method: 'POST',
    url: '/functions/v1/api-features-atribuir',
    description: 'Atribui uma feature a um usuário. A expiração é controlada pela data do perfil do usuário (subscription_expires_at). Períodos vitalício e cortesia nunca expiram.',
    // ... headers mantidos
    requestBody: {
      user_id: 'uuid-do-usuario',
      feature_slug: 'loja_propria',
      tipo_periodo: 'mensal',
      motivo: 'Parceria comercial',
      _nota: 'tipo_periodo define classificação, não data de expiração individual'
    },
    responseExample: {
      success: true,
      message: 'Feature atribuída com sucesso',
      data: {
        user_id: 'uuid',
        feature_slug: 'loja_propria',
        status: 'ativo',
        tipo_periodo: 'mensal',
        data_inicio: '2026-01-29T00:00:00Z',
        usa_expiracao_perfil: true,
        expiracao_perfil: '2026-02-28T00:00:00Z',
        dias_restantes: 30
      },
      expiracao_info: {
        fonte: 'profiles.subscription_expires_at',
        nota: 'Features expiram junto com a assinatura do perfil',
        excecoes: 'tipo_periodo vitalicio ou cortesia nunca expiram'
      }
    },
    // ... errorExamples mantidos
  }
];
```

---

## Tabela de Expiração (para documentação)

| Tipo Período | Fonte de Expiração | Comportamento |
|--------------|-------------------|---------------|
| `trial` | `profiles.subscription_expires_at` | Expira junto com perfil |
| `mensal` | `profiles.subscription_expires_at` | Expira junto com perfil |
| `anual` | `profiles.subscription_expires_at` | Expira junto com perfil |
| `vitalicio` | N/A | Nunca expira |
| `cortesia` | N/A | Nunca expira |

