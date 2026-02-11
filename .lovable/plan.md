

# Alterar Banner Desktop para 12:9

## Resumo

Atualizar a proporção do banner desktop de **16:9** para **12:9** em toda a plataforma.

---

## Alterações

### 1. Constantes - `src/constants/imageDimensions.ts`

Atualizar `BANNER`:
- De: 1920x1080 (16:9)
- Para: **1920x1440 (12:9 = 4:3)**

### 2. Upload Revendedor - `src/components/reseller/ResellerBannerUpload.tsx`

Atualizar dimensões hardcoded do desktop de 1920x1080 para **1920x1440**.

### 3. Exibição - 5 arquivos

Atualizar classes Tailwind de `aspect-[16/9]` para `aspect-[12/9]`:

- `src/components/Hero.tsx`
- `src/components/FeaturedBanners.tsx`
- `src/components/public-store/PublicStoreBannerCarousel.tsx`
- `src/components/public-store/PublicStoreHero.tsx`
- `src/components/public-store/PublicStoreFeaturedBanners.tsx`

### 4. Componentes automáticos

`BannerUpload.tsx` e `CourseBannerUpload.tsx` importam de `imageDimensions.ts` e atualizam automaticamente.

---

## Detalhe Técnico

```typescript
// imageDimensions.ts
BANNER: {
  width: 1920,
  height: 1440,
  aspectRatio: 12 / 9,
  description: "Banner promocional (proporção 12:9)",
  recommendedFormat: "JPG ou PNG"
}
```

```html
<!-- Tailwind: mobile 4:5, desktop 12:9 -->
<div className="aspect-[4/5] md:aspect-[12/9]">
```

