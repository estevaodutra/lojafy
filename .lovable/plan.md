
# Plano: Nova Feature "Lojafy Integra"

## Objetivo

Criar uma nova funcionalidade (feature) chamada **"Lojafy Integra"** que controlará o acesso à página de Integrações para revendedores, seguindo o mesmo padrão já utilizado para `lojafy_academy` e `top_10_produtos`.

---

## Arquitetura Atual de Features

O sistema já possui uma arquitetura robusta de features:

```text
┌─────────────────────────────────────────────────────────────┐
│  Tabela: features                                           │
│  - Define funcionalidades disponíveis (slug, nome, etc)     │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Tabela: user_features                                      │
│  - Vincula usuários às features                             │
│  - Controla status (ativo/trial/expirado)                   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Componentes React:                                         │
│  - useFeature(slug) → hasFeature                            │
│  - FeatureGate → oculta/mostra elementos                    │
│  - FeatureRoute → protege rotas                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| **Banco de dados** | **INSERT** | Adicionar feature `lojafy_integra` na tabela `features` |
| `src/components/layouts/ResellerLayout.tsx` | **Editar** | Condicionar menu "Integrações" à feature |
| `src/App.tsx` | **Editar** | Proteger rota `/reseller/integracoes` com FeatureRoute |

---

## Detalhes da Implementação

### 1. Inserir Feature no Banco de Dados

Executar SQL para criar a nova feature:

```sql
INSERT INTO features (
  slug,
  nome,
  descricao,
  icone,
  categoria,
  ordem_exibicao,
  ativo,
  visivel_catalogo
) VALUES (
  'lojafy_integra',
  'Lojafy Integra',
  'Acesso à página de integrações com marketplaces (Shopee, Mercado Livre, Amazon)',
  'Plug',
  'recursos',
  30,
  true,
  true
);
```

### 2. Modificar ResellerLayout.tsx

Adicionar verificação da feature para o item de menu "Integrações":

- Importar o hook `useFeature` para verificar `lojafy_integra`
- Remover o item "Integrações" do array estático `menuGroups`
- Adicionar condicionalmente o item no `filteredMenuGroups` (igual ao padrão Academy)
- Manter badge "Em breve" para usuários sem a feature que vejam referências

**Alterações específicas:**

1. Adicionar: `const { hasFeature: hasIntegraFeature } = useFeature('lojafy_integra');`
2. Remover do `menuGroups` o item "Integrações" da seção "Avançado"
3. No `filteredMenuGroups`, adicionar condição para incluir a seção "Avançado" somente se `hasIntegraFeature` for true

### 3. Modificar App.tsx

Proteger a rota `/reseller/integracoes` com `FeatureRoute`:

```tsx
<Route path="integracoes" element={
  <FeatureRoute feature="lojafy_integra">
    <ResellerIntegrations />
  </FeatureRoute>
} />
```

---

## Comportamento Esperado

| Usuário | Menu "Integrações" | Acesso Rota |
|---------|-------------------|-------------|
| **Sem feature** | ❌ Oculto | ❌ Bloqueado (tela de recurso bloqueado) |
| **Com feature** | ✅ Visível | ✅ Permitido |
| **Super Admin** | ✅ Visível (bypass) | ✅ Permitido (bypass) |

---

## Resumo das Ações

1. **Banco**: Inserir nova feature `lojafy_integra` via migration
2. **ResellerLayout.tsx**: Condicionar exibição do menu "Integrações" à feature
3. **App.tsx**: Envolver rota com `FeatureRoute`
4. **Testar**: Verificar que menu aparece/desaparece conforme feature atribuída

---

## Notas Técnicas

- O slug `lojafy_integra` segue o padrão snake_case das outras features
- O ícone `Plug` já é utilizado na página de integrações
- A categoria `recursos` agrupa com outras funcionalidades premium
- Super admins têm bypass automático via função `user_has_feature_or_superadmin`
