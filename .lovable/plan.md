
## Diagnóstico (confirmado agora)
Não. As features solicitadas **ainda não foram removidas** no ambiente **Test** do Supabase.

Consulta no banco retornou que ainda existem:
- `academy_acesso`, `academy_certificado`
- `analytics_basico`, `analytics_avancado`
- `automacao_carrinho`
- `integracao_whatsapp`, `integracao_email`, `integracao_api`
- `loja_dominio_custom`, `loja_tema_premium`
- `suporte_prioritario`
- e ainda está como `loja_propria` (não renomeou para `loja_completa`)
- `top_10_produtos` ainda não foi inserida

Isso indica que o SQL do plano **não foi executado** no banco (ou foi executado em outro ambiente/projeto).

---

## O que vamos fazer (execução definitiva)
### Parte A — Executar as alterações no banco (dados)
Como isso é **operação de dados (DELETE/UPDATE/INSERT)**, deve ser executado no **SQL Editor** do Supabase (ambiente Test), não como migration de schema.

1) Abrir o **SQL Editor** do Supabase e garantir que está no projeto correto `bbrmjrjorcgsgeztzbsr` e no ambiente **Test**.

2) Rodar este SQL (na ordem, em um único script):

```sql
-- 0) (Opcional) Ver o que será afetado
select slug, nome, categoria from features
where slug in (
  'academy_acesso','academy_certificado',
  'analytics_basico','analytics_avancado',
  'automacao_carrinho',
  'integracao_whatsapp','integracao_email','integracao_api',
  'loja_dominio_custom','loja_tema_premium',
  'suporte_prioritario',
  'loja_propria',
  'top_10_produtos'
);

-- 1) Limpar vínculos de usuários com as features que serão removidas
delete from user_features
where feature_id in (
  select id from features where slug in (
    'academy_acesso', 'academy_certificado',
    'analytics_basico', 'analytics_avancado',
    'automacao_carrinho',
    'integracao_whatsapp', 'integracao_email', 'integracao_api',
    'loja_dominio_custom', 'loja_tema_premium',
    'suporte_prioritario'
  )
);

-- 2) Deletar features indesejadas
delete from features
where slug in (
  'academy_acesso', 'academy_certificado',
  'analytics_basico', 'analytics_avancado',
  'automacao_carrinho',
  'integracao_whatsapp', 'integracao_email', 'integracao_api',
  'loja_dominio_custom', 'loja_tema_premium',
  'suporte_prioritario'
);

-- 3) Renomear loja_propria -> loja_completa
update features
set
  slug = 'loja_completa',
  nome = 'Loja Completa',
  descricao = 'Acesso completo à sua loja online com todos os recursos',
  requer_features = array[]::text[],
  categoria = 'loja'
where slug = 'loja_propria';

-- 4) Criar top_10_produtos (se ainda não existir)
insert into features (
  slug, nome, descricao, icone, categoria, ordem_exibicao,
  preco_mensal, preco_anual, preco_vitalicio, trial_dias,
  ativo, visivel_catalogo, roles_permitidas, requer_features
)
select
  'top_10_produtos',
  'Top 10 Produtos Vencedores',
  'Desafio gamificado para publicar 11 produtos vencedores!',
  'Trophy',
  'acessos',
  1,
  0.00, 0.00, 0.00,
  0,
  true,
  false,
  array['reseller','customer'],
  array[]::text[]
where not exists (
  select 1 from features where slug = 'top_10_produtos'
);
```

3) Validar o resultado:
```sql
select slug, nome, categoria
from features
order by categoria, slug;
```
Esperado:
- Deve existir `loja_completa`
- Deve existir `top_10_produtos` (categoria `acessos`)
- Não devem existir as features removidas

4) Recarregar a página `/super-admin/features` (hard refresh) para a UI refletir as mudanças.

---

### Parte B — Ajustes no Frontend (para refletir as novas categorias e ícone)
Depois que o banco estiver correto, implementar no código:

1) `src/pages/admin/Features.tsx`
- Simplificar `categoryLabels` para conter apenas:
  - `loja`, `acessos`, `geral`
- (Opcional) garantir ordem e apresentação consistente (ex.: mostrar “Loja” e “Acessos”, e “Geral” só se tiver itens).

2) `src/components/admin/FeatureCard.tsx`
- Importar `Trophy` do `lucide-react`
- Adicionar `Trophy` no `iconMap` para que `feature.icone = 'Trophy'` renderize corretamente.

---

## Por que não aconteceu antes (prováveis causas)
- O SQL não foi rodado no Supabase (ou foi rodado no ambiente Live em vez do Test, ou em outro projeto).
- O script falhou por depender de `user_features` (por isso incluímos a limpeza antes do DELETE).

---

## Checklist de confirmação (rápido)
- [ ] Executei o SQL no Supabase **Test**
- [ ] A consulta final mostra apenas `loja_completa` e `top_10_produtos` (além das demais que devem permanecer)
- [ ] Recarreguei `/super-admin/features` e a lista ficou enxuta

