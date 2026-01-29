

# Plano: Reorganizar Features da Plataforma

## Estado Atual (Confirmado no Banco)

| Categoria | Slug | Nome | Ação |
|-----------|------|------|------|
| academy | academy_acesso | Acesso Academy | ❌ Remover |
| academy | academy_certificado | Certificados | ❌ Remover |
| analytics | analytics_basico | Analytics Básico | ❌ Remover |
| analytics | analytics_avancado | Analytics Avançado | ❌ Remover |
| automacao | automacao_carrinho | Recuperação de Carrinho | ❌ Remover |
| integracoes | integracao_whatsapp | Integração WhatsApp | ❌ Remover |
| integracoes | integracao_email | Integração E-mail | ❌ Remover |
| integracoes | integracao_api | API de Integração | ❌ Remover |
| loja | loja_propria | Loja Própria | ✏️ Renomear → "Loja Completa" |
| loja | loja_dominio_custom | Domínio Personalizado | ❌ Remover |
| loja | loja_tema_premium | Tema Premium | ❌ Remover |
| suporte | suporte_prioritario | Suporte Prioritário | ❌ Remover |
| - | top_10_produtos | (não existe) | ✅ Adicionar |

---

## Dependências Encontradas

1 usuário possui a feature `academy_acesso` - será desvinculado antes da remoção.

---

## Estado Final Desejado

| Categoria | Slug | Nome |
|-----------|------|------|
| loja | loja_completa | Loja Completa |
| acessos | top_10_produtos | Top 10 Produtos Vencedores |

---

## Alterações Necessárias

### 1. Banco de Dados (SQL)

```sql
-- Passo 1: Limpar user_features
DELETE FROM user_features 
WHERE feature_id IN (
  SELECT id FROM features WHERE slug IN (
    'academy_acesso', 'academy_certificado',
    'analytics_basico', 'analytics_avancado',
    'automacao_carrinho',
    'integracao_whatsapp', 'integracao_email', 'integracao_api',
    'loja_dominio_custom', 'loja_tema_premium',
    'suporte_prioritario'
  )
);

-- Passo 2: Deletar features indesejadas
DELETE FROM features WHERE slug IN (
  'academy_acesso', 'academy_certificado',
  'analytics_basico', 'analytics_avancado',
  'automacao_carrinho',
  'integracao_whatsapp', 'integracao_email', 'integracao_api',
  'loja_dominio_custom', 'loja_tema_premium',
  'suporte_prioritario'
);

-- Passo 3: Renomear loja_propria → loja_completa
UPDATE features SET 
  slug = 'loja_completa',
  nome = 'Loja Completa',
  descricao = 'Acesso completo à sua loja online com todos os recursos',
  requer_features = ARRAY[]::text[]
WHERE slug = 'loja_propria';

-- Passo 4: Adicionar Top 10 Produtos Vencedores
INSERT INTO features (
  slug, nome, descricao, icone, categoria, ordem_exibicao,
  preco_mensal, preco_anual, preco_vitalicio, trial_dias,
  ativo, visivel_catalogo, roles_permitidas, requer_features
) VALUES (
  'top_10_produtos',
  'Top 10 Produtos Vencedores',
  'Desafio gamificado para publicar 11 produtos vencedores!',
  'Trophy', 'acessos', 1,
  0.00, 0.00, 0.00, 0,
  true, false,
  ARRAY['reseller', 'customer'],
  ARRAY[]::text[]
);
```

### 2. Frontend

**Arquivo: `src/pages/admin/Features.tsx`**

Simplificar `categoryLabels`:

```typescript
const categoryLabels: Record<string, string> = {
  loja: '🏪 Loja',
  acessos: '🔓 Acessos',
  geral: '⚙️ Geral',
};
```

**Arquivo: `src/components/admin/FeatureCard.tsx`**

Adicionar ícone Trophy no iconMap.

---

## Resultado Final

```text
Features da Plataforma
├── 🏪 Loja
│   └── Loja Completa
└── 🔓 Acessos
    └── Top 10 Produtos Vencedores
```

