
# Plano: Corrigir URLs 404 nos Botões de Configuração de Passos

## Diagnóstico

Os botões de configuração do checklist de 6 passos estão retornando erro 404 porque as URLs definidas nos hooks não correspondem às rotas reais do sistema.

## Análise Comparativa

### Hook `useSetupProgress.ts` (URLs ERRADAS):

| Passo | URL Atual (ERRADA) | Rota Real (CORRETA) |
|-------|-------------------|---------------------|
| Criar nome da loja | `/reseller/editor` | `/reseller/loja` |
| Personalizar visual | `/reseller/editor` | `/reseller/loja` |
| Adicionar contatos | `/reseller/editor` | `/reseller/loja` |
| Importar produtos | `/reseller/catalog` | `/reseller/catalogo` |
| Ativar produtos | `/reseller/products` | `/reseller/produtos` |
| Adicionar vantagens | `/reseller/editor` | `/reseller/vantagens` |

### Hook `useResellerOnboarding.ts` (URLs ERRADAS):

| Passo | URL Atual (ERRADA) | Rota Real (CORRETA) |
|-------|-------------------|---------------------|
| Configure sua Loja | `/reseller/loja` | OK |
| Adicione Produtos | `/reseller/produtos` | OK |
| Configure Pagamento | `/reseller/financeiro` | OK |
| Compartilhe sua Loja | `/reseller/loja#share` | OK |
| Conheça a Academia | `/minha-conta/academy` | OK |
| Faça sua Primeira Venda | `/reseller/vendas` | OK |

O hook `useResellerOnboarding.ts` já está com as rotas corretas.

---

## Arquivos a Modificar

### 1. `src/hooks/useSetupProgress.ts`

Corrigir as URLs dos passos para corresponder às rotas reais:

**Alterações:**

```typescript
const steps: SetupStep[] = [
  {
    id: "store-name",
    title: "Criar nome da loja",
    description: "Defina o nome e URL da sua loja",
    completed: !!store?.store_name && !!store?.store_slug,
    actionUrl: "/reseller/loja",  // ✅ Corrigido
    actionLabel: "Configurar",
  },
  {
    id: "store-design",
    title: "Personalizar visual",
    description: "Escolha cores e adicione logo",
    completed: !!store?.primary_color || !!store?.logo_url,
    actionUrl: "/reseller/loja",  // ✅ Corrigido
    actionLabel: "Personalizar",
  },
  {
    id: "contact-info",
    title: "Adicionar contatos",
    description: "WhatsApp, email e telefone",
    completed: !!store?.whatsapp || !!store?.contact_email,
    actionUrl: "/reseller/loja",  // ✅ Corrigido
    actionLabel: "Adicionar",
  },
  {
    id: "add-products",
    title: "Importar produtos",
    description: "Adicione pelo menos 3 produtos",
    completed: (products?.length || 0) >= 3,
    actionUrl: "/reseller/catalogo",  // ✅ Corrigido
    actionLabel: "Importar",
  },
  {
    id: "activate-products",
    title: "Ativar produtos",
    description: "Ative produtos para venda",
    completed: activeProducts.length >= 1,
    actionUrl: "/reseller/produtos",  // ✅ Corrigido
    actionLabel: "Ativar",
  },
  {
    id: "add-benefits",
    title: "Adicionar vantagens",
    description: "Mostre os benefícios da sua loja",
    completed: hasBenefits,
    actionUrl: "/reseller/vantagens",  // ✅ Corrigido
    actionLabel: "Configurar",
  },
];
```

---

## Resumo das Correções

| Arquivo | Linha | De | Para |
|---------|-------|----|----|
| `useSetupProgress.ts` | 51 | `/reseller/editor` | `/reseller/loja` |
| `useSetupProgress.ts` | 59 | `/reseller/editor` | `/reseller/loja` |
| `useSetupProgress.ts` | 67 | `/reseller/editor` | `/reseller/loja` |
| `useSetupProgress.ts` | 75 | `/reseller/catalog` | `/reseller/catalogo` |
| `useSetupProgress.ts` | 83 | `/reseller/products` | `/reseller/produtos` |
| `useSetupProgress.ts` | 91 | `/reseller/editor` | `/reseller/vantagens` |

---

## Rotas Disponíveis de Referência

Baseado no `App.tsx`, as rotas válidas para revendedores são:

- `/reseller` - Dashboard principal
- `/reseller/dashboard` - Dashboard
- `/reseller/loja` - Editor de loja
- `/reseller/catalogo` - Catálogo para importar produtos
- `/reseller/produtos` - Produtos importados
- `/reseller/vantagens` - Configurar benefícios
- `/reseller/banners` - Gerenciar banners
- `/reseller/paginas` - Editor de páginas
- `/reseller/cupons` - Gerenciar cupons
- `/reseller/frete` - Configurar frete
- `/reseller/depoimentos` - Gerenciar depoimentos
- `/reseller/vendas` - Histórico de vendas
- `/reseller/relatorios` - Relatórios
- `/reseller/clientes` - Gerenciar clientes
- `/reseller/financeiro` - Financeiro e saques
- `/reseller/metas` - Metas de vendas
- `/reseller/integracoes` - Integrações

---

## Resultado Esperado

Após a correção, todos os botões de configuração do checklist de 6 passos redirecionarão para as páginas corretas:

1. **Configurar** (nome da loja) → `/reseller/loja`
2. **Personalizar** (visual) → `/reseller/loja`
3. **Adicionar** (contatos) → `/reseller/loja`
4. **Importar** (produtos) → `/reseller/catalogo`
5. **Ativar** (produtos) → `/reseller/produtos`
6. **Configurar** (vantagens) → `/reseller/vantagens`
