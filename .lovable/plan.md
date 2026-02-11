

# Alterar Proporcoes de Banners e Logo

## Resumo

Atualizar as proporcoes de imagens em toda a plataforma:
- **Banner Desktop**: de 2:1 (1200x600) para **16:9 (1920x1080)**
- **Banner Mobile**: de 2:1 (768x384) para **4:5 (800x1000)**
- **Logo**: de ~3.33:1 (200x60) para **3:1 (300x100)**

---

## Arquivos a Alterar

### 1. Constantes centrais - `src/constants/imageDimensions.ts`

Atualizar as dimensoes base:

| Tipo | Antes | Depois |
|------|-------|--------|
| LOGO | 200x60 (3.33:1) | 300x100 (3:1) |
| BANNER | 1200x600 (2:1) | 1920x1080 (16:9) |

### 2. Upload de Banners Desktop - `src/components/admin/BannerUpload.tsx`

Ja usa `IMAGE_DIMENSIONS.BANNER` - atualiza automaticamente.

### 3. Upload de Banners Mobile - `src/components/admin/MobileBannerUpload.tsx`

Alterar de 768x432 (16:9) para **800x1000 (4:5)**.

### 4. Upload de Banners Revendedor - `src/components/reseller/ResellerBannerUpload.tsx`

Alterar dimensoes hardcoded:
- Desktop: 1200x600 (2:1) para **1920x1080 (16:9)**
- Mobile: 768x384 (2:1) para **800x1000 (4:5)**

### 5. Exibicao: Carrossel principal - `src/components/Hero.tsx`

No mobile, usar `aspect-[4/5]` ao inves de viewport heights. No desktop, usar `aspect-[16/9]`.

### 6. Exibicao: Carrossel loja publica - `src/components/public-store/PublicStoreBannerCarousel.tsx`

Mesma logica: `aspect-[4/5]` mobile, `aspect-[16/9]` desktop.

### 7. Exibicao: Hero loja publica - `src/components/public-store/PublicStoreHero.tsx`

Atualizar proporcoes de exibicao do banner.

### 8. Exibicao: Banners destaque - `src/components/FeaturedBanners.tsx`

Alterar `aspect-[2/1]` para `aspect-[16/9]`.

### 9. Exibicao: Banners destaque loja publica - `src/components/public-store/PublicStoreFeaturedBanners.tsx`

Alterar `aspect-[2/1]` para `aspect-[16/9]`.

---

## Detalhes Tecnicos

### imageDimensions.ts

```typescript
LOGO: {
  width: 300,
  height: 100,
  aspectRatio: 3,
  description: "Logomarca da loja (proporcao 3:1)",
  ...
},
BANNER: {
  width: 1920,
  height: 1080,
  aspectRatio: 16 / 9,
  description: "Banner promocional (proporcao 16:9)",
  ...
},
MOBILE_BANNER: {  // Novo tipo
  width: 800,
  height: 1000,
  aspectRatio: 4 / 5,
  description: "Banner mobile (proporcao 4:5)",
  ...
}
```

### CSS dos banners (Hero, PublicStoreBannerCarousel, PublicStoreHero)

Substituir alturas fixas com viewport por aspect-ratio responsivo:

```html
<!-- Mobile: 4:5, Desktop: 16:9 -->
<div className="w-full aspect-[4/5] md:aspect-[16/9] relative overflow-hidden rounded-lg bg-muted">
  <picture>
    <source media="(max-width: 768px)" srcSet={mobileUrl} />
    <img src={desktopUrl} className="w-full h-full object-cover" />
  </picture>
</div>
```

### MobileBannerUpload.tsx

Alterar dimensoes de 768x432 para 800x1000 com aspect ratio 4/5.

### ResellerBannerUpload.tsx

Desktop: 1920x1080 (16:9). Mobile: 800x1000 (4:5).

---

## Arquivos Modificados

| Arquivo | Tipo |
|---------|------|
| `src/constants/imageDimensions.ts` | Editar |
| `src/components/admin/MobileBannerUpload.tsx` | Editar |
| `src/components/reseller/ResellerBannerUpload.tsx` | Editar |
| `src/components/Hero.tsx` | Editar |
| `src/components/public-store/PublicStoreBannerCarousel.tsx` | Editar |
| `src/components/public-store/PublicStoreHero.tsx` | Editar |
| `src/components/FeaturedBanners.tsx` | Editar |
| `src/components/public-store/PublicStoreFeaturedBanners.tsx` | Editar |

Os componentes `BannerUpload.tsx`, `LogoUpload.tsx` e `CourseBannerUpload.tsx` ja importam de `imageDimensions.ts` e atualizam automaticamente.

