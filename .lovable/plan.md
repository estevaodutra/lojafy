

# Alterar Banner Desktop para 8:3

## Resumo

Atualizar a proporção do banner desktop de **12:9** para **8:3** em toda a plataforma.

---

## Alterações

### 1. Constantes - `src/constants/imageDimensions.ts`

- De: 1920x1440 (12:9)
- Para: **1920x720 (8:3)**

### 2. Upload Revendedor - `src/components/reseller/ResellerBannerUpload.tsx`

Dimensões desktop de 1920x1440 para **1920x720**, descrição para "8:3".

### 3. Exibição - 5 arquivos (aspect-[12/9] para aspect-[8/3])

- `src/components/Hero.tsx`
- `src/components/FeaturedBanners.tsx`
- `src/components/public-store/PublicStoreBannerCarousel.tsx`
- `src/components/public-store/PublicStoreHero.tsx`
- `src/components/public-store/PublicStoreFeaturedBanners.tsx`

### 4. Automáticos

`BannerUpload.tsx` e `CourseBannerUpload.tsx` atualizam via `imageDimensions.ts`.

---

## Detalhe Técnico

```typescript
BANNER: {
  width: 1920,
  height: 720,
  aspectRatio: 8 / 3,
  description: "Banner promocional (proporção 8:3)",
  recommendedFormat: "JPG ou PNG"
}
```

Classes Tailwind: `aspect-[4/5] md:aspect-[8/3]`

