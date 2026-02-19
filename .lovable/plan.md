

## Corrigir cache do PWA servindo conteudo desatualizado

### Problema
O Service Worker (PWA) esta cacheando todos os arquivos JS/CSS/HTML e servindo a versao antiga ao abrir o app. Mesmo com `registerType: "autoUpdate"`, ha um delay entre abrir o app e o SW atualizar, fazendo o usuario sempre ver a versao anterior na primeira abertura.

### Solucao

**Arquivo: `vite.config.ts`**

Adicionar `skipWaiting: true` e `clientsClaim: true` na configuracao do workbox para forcar o Service Worker a ativar imediatamente sem esperar o usuario fechar e reabrir a aba.

```text
workbox: {
  skipWaiting: true,
  clientsClaim: true,
  maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
  globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
  runtimeCaching: [...]
}
```

### O que muda
- `skipWaiting: true` - O novo Service Worker assume controle imediatamente, sem esperar a aba fechar
- `clientsClaim: true` - O novo SW toma controle de todas as abas abertas assim que ativado

### Secao Tecnica
- Apenas 2 linhas adicionadas no objeto `workbox` dentro da config do `VitePWA`
- Nenhum outro arquivo precisa ser alterado
- Isso resolve o cenario onde o usuario abre o app e ve conteudo antigo ate dar refresh manual
