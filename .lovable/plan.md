

# Fix: 404 na rota `/top_10_produtos`

## Diagnóstico

A rota está corretamente definida no `src/App.tsx` (linha 224). O problema é o **PWA Service Worker** (vite-plugin-pwa/Workbox). O Workbox está configurado sem `navigateFallback`, então quando o usuário navega diretamente para `/top_10_produtos`, o service worker não sabe redirecionar para `index.html` (necessário para SPA routing) e retorna 404.

## Solução

### `vite.config.ts` — Adicionar `navigateFallback` ao Workbox

Adicionar a propriedade `navigateFallback: '/index.html'` dentro do bloco `workbox`, para que o service worker redirecione todas as rotas de navegação para o `index.html`, permitindo que o React Router resolva a rota corretamente.

```ts
workbox: {
  skipWaiting: true,
  clientsClaim: true,
  navigateFallback: '/index.html',  // ← adicionar
  maximumFileSizeToCacheInBytes: ...
}
```

Isso resolve o 404 para `/top_10_produtos` e qualquer outra rota SPA que possa ter o mesmo problema.

