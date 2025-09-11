export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  badge?: string;
  description: string;
  specifications: Record<string, string>;
  category: string;
  brand: string;
  inStock: boolean;
  images: string[];
  reviews: Review[];
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string;
  icon: any;
  color: string;
  productCount: number;
}

export interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
}