
## Corrigir Espaco em Branco no Banner Mobile

### Problema

No componente `Hero.tsx`, quando ha apenas 1 banner (sem carousel), a imagem no mobile usa `object-contain` ao inves de `object-cover`. Isso faz com que a imagem encolha para caber dentro do container 4:5, deixando grandes areas em branco acima e abaixo.

O carousel (multiplos banners) ja usa `object-cover` corretamente na linha 225.

### Correcao

**Arquivo:** `src/components/Hero.tsx` (linha 111)

Trocar `object-contain` por `object-cover` para que a imagem preencha todo o container no mobile, igual ao carousel:

```
// ANTES (linha 111):
className="w-full h-full object-contain md:object-cover"

// DEPOIS:
className="w-full h-full object-cover"
```

### Resultado

A imagem do banner mobile preenchera todo o container sem espacos em branco, consistente com o comportamento do carousel.
