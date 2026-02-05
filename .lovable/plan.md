

# Plano: Renomear Página para "Lojafy Integra"

## Contexto Atual

A rota `/reseller/integracoes` já está **protegida** com `FeatureRoute feature="lojafy_integra"` (implementado anteriormente). A página atual se chama "Integrações" e precisa ser renomeada para "Lojafy Integra".

---

## Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/pages/reseller/Integrations.tsx` | **Renomear** → `LojafyIntegra.tsx` | Renomear arquivo |
| `src/pages/reseller/LojafyIntegra.tsx` | **Editar** | Atualizar título para "Lojafy Integra" |
| `src/App.tsx` | **Editar** | Atualizar import para o novo nome |
| `src/components/layouts/ResellerLayout.tsx` | **Editar** | Atualizar título do menu para "Lojafy Integra" |

---

## Detalhes da Implementação

### 1. Criar Nova Página: `src/pages/reseller/LojafyIntegra.tsx`

Copiar conteúdo de `Integrations.tsx` e atualizar:
- Título: "Integrações" → "Lojafy Integra"
- Descrição: manter ou ajustar conforme necessário
- Nome do componente: `Integrations` → `LojafyIntegra`

### 2. Atualizar `src/App.tsx`

Alterar o import:
```tsx
// De:
import ResellerIntegrations from "./pages/reseller/Integrations";

// Para:
import ResellerLojafyIntegra from "./pages/reseller/LojafyIntegra";
```

Atualizar a rota:
```tsx
<Route path="integracoes" element={
  <FeatureRoute feature="lojafy_integra">
    <ResellerLojafyIntegra />
  </FeatureRoute>
} />
```

### 3. Atualizar `src/components/layouts/ResellerLayout.tsx`

Alterar o título no menu:
```tsx
// De:
{ title: 'Integrações', url: '/reseller/integracoes', icon: Plug }

// Para:
{ title: 'Lojafy Integra', url: '/reseller/integracoes', icon: Plug }
```

---

## Comportamento Final

| Situação | Menu | Página |
|----------|------|--------|
| **Sem feature `lojafy_integra`** | ❌ Menu oculto | ❌ Tela de bloqueio |
| **Com feature `lojafy_integra`** | ✅ "Lojafy Integra" visível | ✅ Página acessível |
| **Super Admin** | ✅ "Lojafy Integra" visível | ✅ Página acessível (bypass) |

---

## Resumo das Ações

1. Criar arquivo `LojafyIntegra.tsx` com título atualizado
2. Atualizar import e rota no `App.tsx`
3. Atualizar título do menu no `ResellerLayout.tsx`
4. Remover arquivo antigo `Integrations.tsx`

