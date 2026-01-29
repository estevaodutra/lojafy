
# Plano: Adicionar Feature "Top 10 Produtos Vencedores"

## Resumo

Criar uma nova feature `top_10_produtos` no sistema de funcionalidades da plataforma que controla a visibilidade da seção "Top 10 Produtos Vencedores" na página "Meus Acessos".

---

## Problema Atual

1. A página "Meus Acessos" (`/minha-conta/meus-acessos`) exibe o card "Top 10 Produtos Vencedores" para **todos os usuários**
2. Deveria ser exibido apenas para usuários que possuem a feature `top_10_produtos` ativa
3. O erro "Edge Function returned a non-2xx status code" ocorre porque a feature não existe no catálogo

---

## Alterações Necessárias

### 1. Criar a Feature no Banco de Dados

Executar SQL via migration para inserir a feature:

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
  roles_permitidas
) VALUES (
  'top_10_produtos',
  'Top 10 Produtos Vencedores',
  'Acesso à missão gamificada de 24h com 11 produtos selecionados para publicação',
  'Trophy',
  'acessos',
  1,
  0,
  0,
  0,
  0,
  true,
  false,
  ARRAY['reseller', 'customer']
);
```

### 2. Modificar `src/pages/reseller/MeusAcessos.tsx`

Envolver o card "Top 10 Produtos" com `FeatureGate`:

```typescript
import { FeatureGate } from '@/components/auth/FeatureGate';
import { useUserFeatures } from '@/hooks/useUserFeatures';

// Dentro do componente:
const { features } = useUserFeatures();

// No array accessItems - filtrar baseado na feature
const accessItems = [
  // Condicionalmente incluir o item se tiver a feature
];

// Ou usar FeatureGate direto no render:
<FeatureGate feature="top_10_produtos">
  <Card>...</Card>
</FeatureGate>
```

### 3. Modificar `src/pages/reseller/TopProdutosVencedores.tsx`

Adicionar proteção na página direta:

```typescript
import { FeatureGate } from '@/components/auth/FeatureGate';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useFeature } from '@/hooks/useFeature';

const TopProdutosVencedores = () => {
  const navigate = useNavigate();
  const { hasFeature, isLoading } = useFeature('top_10_produtos');
  
  useEffect(() => {
    if (!isLoading && !hasFeature) {
      navigate('/minha-conta/meus-acessos');
    }
  }, [hasFeature, isLoading, navigate]);
  
  if (isLoading) return <LoadingSkeleton />;
  if (!hasFeature) return null;
  
  return (/* conteúdo atual */);
};
```

---

## Fluxo de Funcionamento

```text
SuperAdmin atribui feature "top_10_produtos" ao usuário
                         ↓
Usuário acessa /minha-conta/meus-acessos
                         ↓
    ┌────────────────────────────────────────┐
    │ Tem feature "top_10_produtos"?         │
    │   ✓ Sim → Exibe card "Top 10"          │
    │   ✗ Não → Esconde card                 │
    └────────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/migrations/[timestamp]_add_top_10_produtos_feature.sql` | Criar feature no banco |
| `src/pages/reseller/MeusAcessos.tsx` | Filtrar items baseado em features |
| `src/pages/reseller/TopProdutosVencedores.tsx` | Proteger acesso direto à página |

---

## Comportamento Esperado

| Cenário | Resultado |
|---------|-----------|
| Usuário SEM feature | Não vê o card na página Meus Acessos |
| Usuário COM feature | Vê o card e pode acessar a página |
| Acesso direto à URL sem feature | Redirecionado para /meus-acessos |
| SuperAdmin | Sempre vê (bypass automático) |
