

# Plano: Reorganizar Features da Plataforma

## Estado Atual das Features

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
| loja | loja_propria | Loja Própria | ✏️ Renomear para "Loja Completa" |
| loja | loja_dominio_custom | Domínio Personalizado | ❌ Remover |
| loja | loja_tema_premium | Tema Premium | ❌ Remover |
| suporte | suporte_prioritario | Suporte Prioritário | ❌ Remover |
| - | top_10_produtos | Top 10 Produtos Vencedores | ✅ Adicionar |

---

## Estado Final Desejado

| Categoria | Slug | Nome |
|-----------|------|------|
| loja | loja_completa | Loja Completa |
| acessos | top_10_produtos | Top 10 Produtos Vencedores |

---

## Migrations SQL

### 1. Remover Features Indesejadas

```sql
DELETE FROM features 
WHERE slug IN (
  'academy_acesso',
  'academy_certificado',
  'analytics_basico',
  'analytics_avancado',
  'automacao_carrinho',
  'integracao_whatsapp',
  'integracao_email',
  'integracao_api',
  'loja_dominio_custom',
  'loja_tema_premium',
  'suporte_prioritario'
);
```

### 2. Atualizar "Loja Própria" para "Loja Completa"

```sql
UPDATE features 
SET 
  slug = 'loja_completa',
  nome = 'Loja Completa',
  descricao = 'Acesso completo à sua loja online com todos os recursos incluídos',
  requer_features = ARRAY[]::text[]
WHERE slug = 'loja_propria';
```

### 3. Adicionar "Top 10 Produtos Vencedores"

```sql
INSERT INTO features (
  slug,
  nome,
  descricao,
  icone,
  categoria,
  ordem_exibicao,
  preco_mensal,
  preco_anual,
  preco_vitalicio,
  trial_dias,
  ativo,
  visivel_catalogo,
  roles_permitidas,
  requer_features
) VALUES (
  'top_10_produtos',
  'Top 10 Produtos Vencedores',
  'Desafio gamificado para publicar 11 produtos vencedores em marketplaces e começar a vender!',
  'Trophy',
  'acessos',
  1,
  0.00,
  0.00,
  0.00,
  0,
  true,
  false,
  ARRAY['reseller', 'customer'],
  ARRAY[]::text[]
);
```

---

## Verificações Importantes

Antes de executar, verificar se há usuários com features que serão removidas:

```sql
SELECT uf.user_id, f.slug, f.nome
FROM user_features uf
JOIN features f ON f.id = uf.feature_id
WHERE f.slug IN (
  'academy_acesso', 'academy_certificado', 
  'analytics_basico', 'analytics_avancado',
  'automacao_carrinho', 'integracao_whatsapp',
  'integracao_email', 'integracao_api',
  'loja_dominio_custom', 'loja_tema_premium',
  'suporte_prioritario'
);
```

Se houver registros, será necessário limpar `user_features` antes de deletar as features.

---

## Atualização do Frontend

### Arquivo: `src/pages/admin/Features.tsx`

Atualizar o `categoryLabels`:

```typescript
const categoryLabels: Record<string, string> = {
  loja: '🏪 Loja',
  acessos: '🔓 Acessos',
  geral: '⚙️ Geral',
};
```

### Arquivo: `src/components/admin/FeatureCard.tsx`

Adicionar ícone Trophy ao iconMap:

```typescript
import { Trophy } from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  Store,
  Trophy,
  Sparkles,
  // ... outros
};
```

---

## Resultado Final

Após as alterações:

```text
Features da Plataforma
├── 🏪 Loja
│   └── Loja Completa
└── 🔓 Acessos
    └── Top 10 Produtos Vencedores
```

---

## Ordem de Execução

1. Verificar usuários com features a serem removidas
2. Limpar `user_features` se necessário
3. Executar DELETE das features indesejadas
4. Executar UPDATE para renomear Loja Própria → Loja Completa
5. Executar INSERT para Top 10 Produtos Vencedores
6. Atualizar frontend (categoryLabels e iconMap)

