import { Product, Category } from "@/types";
import { Smartphone, Headphones, Watch, Laptop, Shirt, Home, Palette, Baby, Gamepad2, Music } from "lucide-react";
import productPhone from "@/assets/product-phone.jpg";
import productHeadphones from "@/assets/product-headphones.jpg";
import productWatch from "@/assets/product-watch.jpg";
import productLaptop from "@/assets/product-laptop.jpg";

export const mockProducts: Product[] = [
  {
    id: "1",
    name: "iPhone 15 Pro Max",
    price: 6999,
    originalPrice: 7499,
    image: productPhone,
    images: [productPhone, productPhone, productPhone],
    rating: 4.8,
    badge: "Novo",
    description: "O iPhone 15 Pro Max oferece a experiência definitiva com chip A17 Pro, sistema de câmeras avançado e design em titânio.",
    specifications: {
      "Tela": "6.7 polegadas Super Retina XDR",
      "Processador": "Chip A17 Pro",
      "Armazenamento": "256GB",
      "Câmera": "Sistema triplo 48MP",
      "Bateria": "Até 29 horas de vídeo"
    },
    category: "eletronicos",
    brand: "Apple",
    inStock: true,
    reviews: [
      {
        id: "1",
        userId: "user1",
        userName: "Maria Silva",
        rating: 5,
        comment: "Produto excelente, superou minhas expectativas!",
        date: "2024-01-15"
      }
    ]
  },
  {
    id: "2",
    name: "Fone Sony WH-1000XM4",
    price: 1299,
    originalPrice: 1599,
    image: productHeadphones,
    images: [productHeadphones, productHeadphones, productHeadphones],
    rating: 4.7,
    badge: "Oferta",
    description: "Fone de ouvido premium com cancelamento de ruído líder do setor e qualidade de som excepcional.",
    specifications: {
      "Tipo": "Over-ear com cancelamento de ruído",
      "Conectividade": "Bluetooth 5.0",
      "Bateria": "Até 30 horas",
      "Drivers": "40mm",
      "Peso": "254g"
    },
    category: "audio",
    brand: "Sony",
    inStock: true,
    reviews: []
  },
  {
    id: "3",
    name: "Apple Watch Series 9",
    price: 2999,
    image: productWatch,
    images: [productWatch, productWatch, productWatch],
    rating: 4.9,
    badge: "Popular",
    description: "O Apple Watch mais avançado, com recursos de saúde e fitness revolucionários.",
    specifications: {
      "Tela": "45mm Retina sempre ativa",
      "Processador": "Chip S9",
      "Resistência": "À água até 50 metros",
      "GPS": "Integrado",
      "Sensores": "ECG, Oxigênio no sangue"
    },
    category: "wearables",
    brand: "Apple",
    inStock: true,
    reviews: []
  },
  {
    id: "4",
    name: "MacBook Pro M3",
    price: 12999,
    image: productLaptop,
    images: [productLaptop, productLaptop, productLaptop],
    rating: 4.8,
    description: "O MacBook Pro mais poderoso já criado, com chip M3 revolucionário para performance excepcional.",
    specifications: {
      "Tela": "14 polegadas Liquid Retina XDR",
      "Processador": "Chip M3 Pro",
      "Memória": "18GB RAM unificada",
      "Armazenamento": "512GB SSD",
      "Bateria": "Até 18 horas"
    },
    category: "computadores",
    brand: "Apple",
    inStock: true,
    reviews: []
  }
];

export const mockCategories: Category[] = [
  {
    id: "1",
    name: "Eletrônicos",
    slug: "eletronicos",
    image: productPhone,
    icon: Smartphone,
    color: "bg-gradient-to-r from-blue-500 to-purple-600",
    productCount: 150
  },
  {
    id: "2",
    name: "Áudio",
    slug: "audio",
    image: productHeadphones,
    icon: Headphones,
    color: "bg-gradient-to-r from-green-500 to-teal-600",
    productCount: 89
  },
  {
    id: "3",
    name: "Wearables",
    slug: "wearables",
    image: productWatch,
    icon: Watch,
    color: "bg-gradient-to-r from-purple-500 to-pink-600",
    productCount: 67
  },
  {
    id: "4",
    name: "Computadores",
    slug: "computadores",
    image: productLaptop,
    icon: Laptop,
    color: "bg-gradient-to-r from-orange-500 to-red-600",
    productCount: 124
  },
  {
    id: "5",
    name: "Moda",
    slug: "moda",
    image: productPhone,
    icon: Shirt,
    color: "bg-gradient-to-r from-pink-500 to-rose-600",
    productCount: 203
  },
  {
    id: "6",
    name: "Casa",
    slug: "casa",
    image: productPhone,
    icon: Home,
    color: "bg-gradient-to-r from-indigo-500 to-blue-600",
    productCount: 156
  }
];

export const promotionalProducts = mockProducts.filter(product => product.originalPrice);