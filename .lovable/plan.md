

# Fix: 404 persistente na rota `/top_10_produtos`

## Diagnóstico

Analisei o código completo e a rota está **corretamente definida** na linha 224 do `App.tsx`. O import e export do componente estão corretos. Nenhum guard ou redirect interfere nesta rota.

O problema é quase certamente o **Service Worker em cache** — ele ainda está servindo uma versão antiga do app (antes da rota ser adicionada). O `navigateFallback` foi adicionado ao config, mas o SW precisa ser atualizado no browser do usuário.

## Solução

### 1. Forçar atualização do Service Worker no código

Adicionar um mecanismo no `main.tsx` ou `App.tsx` para forçar o unregister de service workers antigos e garantir que o app mais recente seja carregado:

```typescript
// No início do App ou main.tsx
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => registration.unregister());
  });
}
```

### 2. Alternativa mais suave — verificar se a rota funciona sem SW

Adicionar `self.__WB_MANIFEST` check e garantir que `skipWaiting` + `clientsClaim` estejam funcionando. Já estão no config, mas podemos verificar se o build está aplicando corretamente.

### 3. Ação imediata recomendada

Além da mudança no código, o usuário pode testar imediatamente abrindo o DevTools > Application > Service Workers > Unregister, ou abrindo em aba anônima sem cache.

A mudança de código garantirá que futuros visitantes não tenham esse problema.

