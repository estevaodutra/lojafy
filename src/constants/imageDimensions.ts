// Image dimension constants for different types
export const IMAGE_DIMENSIONS = {
  LOGO: {
    width: 300,
    height: 100,
    aspectRatio: 3,
    description: "Logomarca da loja (proporção 3:1)",
    recommendedFormat: "PNG com fundo transparente"
  },
  BANNER: {
    width: 1920,
    height: 720,
    aspectRatio: 8 / 3,
    description: "Banner promocional (proporção 8:3)",
    recommendedFormat: "JPG ou PNG"
  },
  MOBILE_BANNER: {
    width: 800,
    height: 1000,
    aspectRatio: 4 / 5,
    description: "Banner mobile (proporção 4:5)",
    recommendedFormat: "JPG ou PNG"
  },
  PRODUCT: {
    width: 400,
    height: 400,
    aspectRatio: 1,
    description: "Imagem de produto",
    recommendedFormat: "JPG ou PNG"
  },
  TESTIMONIAL_AVATAR: {
    width: 96,
    height: 96,
    aspectRatio: 1,
    description: "Foto do cliente",
    recommendedFormat: "JPG ou PNG"
  },
  BENEFIT_ICON: {
    width: 48,
    height: 48,
    aspectRatio: 1,
    description: "Ícone de benefício",
    recommendedFormat: "PNG com fundo transparente"
  },
  COURSE_BANNER: {
    width: 1600,
    height: 900,
    aspectRatio: 16 / 9,
    description: "Banner do curso (ideal para mobile e desktop)",
    recommendedFormat: "JPG ou PNG"
  }
} as const;

export type ImageType = keyof typeof IMAGE_DIMENSIONS;