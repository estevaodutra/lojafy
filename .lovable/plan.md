

# Plano: Ativar Integração Mercado Livre

## Objetivo

Modificar o card do Mercado Livre na página Lojafy Integra para:
1. Remover o badge "Em breve"
2. Renomear o botão de "Conectar" para "Integrar"
3. Habilitar o botão com link de autenticação OAuth do Mercado Livre
4. Substituir `{USER_ID_LOJAFY}` pelo ID real do usuário logado

---

## Arquivo a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/pages/reseller/LojafyIntegra.tsx` | **Editar** | Customizar card do Mercado Livre |

---

## Detalhes da Implementação

### Mudanças Necessárias

1. **Importar AuthContext** para obter o ID do usuário logado
2. **Refatorar renderização** para tratar Mercado Livre separadamente dos outros marketplaces
3. **Card Mercado Livre**:
   - Remover badge "Em breve"
   - Remover opacity reduzida (manter visual normal)
   - Remover barra de progresso (não faz mais sentido se está disponível)
   - Botão ativo com texto "Integrar"
   - Link dinâmico: `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=2003351424267574&redirect_uri=https://n8n-n8n.nuwfic.easypanel.host/webhook/MercadoLivre_Callback&state={userId}`

### Estrutura do Código

```tsx
import { useAuth } from '@/contexts/AuthContext';

const LojafyIntegra = () => {
  const { user } = useAuth();

  const getMercadoLivreAuthUrl = () => {
    const userId = user?.id || '';
    return `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=2003351424267574&redirect_uri=https://n8n-n8n.nuwfic.easypanel.host/webhook/MercadoLivre_Callback&state=${userId}`;
  };

  // Separar marketplaces: Mercado Livre ativo, outros "em breve"
  const comingSoonMarketplaces = marketplaces.filter(m => m.name !== 'Mercado Livre');
  const mercadoLivre = marketplaces.find(m => m.name === 'Mercado Livre');

  return (
    // ...
    {/* Card Mercado Livre - ATIVO */}
    <Card className="border-green-500/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="p-3 rounded-lg bg-yellow-100">
            <Store className="h-8 w-8 text-yellow-600" />
          </div>
          <Badge className="bg-green-500">Disponível</Badge>
        </div>
        <CardTitle className="mt-4">Mercado Livre</CardTitle>
        <CardDescription>Integre com o maior marketplace da América Latina</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button className="w-full" asChild>
          <a href={getMercadoLivreAuthUrl()} target="_blank" rel="noopener noreferrer">
            <Link2 className="mr-2 h-4 w-4" />
            Integrar
          </a>
        </Button>
      </CardFooter>
    </Card>

    {/* Cards dos outros marketplaces - EM BREVE */}
    {comingSoonMarketplaces.map(...)}
  );
};
```

---

## Resultado Esperado

| Marketplace | Badge | Botão | Estado |
|-------------|-------|-------|--------|
| **Mercado Livre** | "Disponível" (verde) | "Integrar" (ativo, com link) | Funcional |
| Shopee | "Em breve" (amarelo) | "Conectar" (desabilitado) | Em desenvolvimento |
| Amazon | "Em breve" (amarelo) | "Conectar" (desabilitado) | Em desenvolvimento |

---

## Resumo das Ações

1. Importar `useAuth` do AuthContext
2. Criar função `getMercadoLivreAuthUrl()` com o user ID dinâmico
3. Renderizar card do Mercado Livre separadamente com visual ativo
4. Manter outros marketplaces com visual "em breve"

