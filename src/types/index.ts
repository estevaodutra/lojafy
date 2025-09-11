export interface ProductVariant {
  id: string;
  name: string;
  type: 'size' | 'color' | 'model';
  value: string;
  priceModifier?: number;
  image?: string;
  inStock: boolean;
}

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
  variants?: ProductVariant[];
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

export interface CheckoutForm {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  paymentMethod: 'credit' | 'debit' | 'pix' | 'boleto';
  cardNumber?: string;
  cardName?: string;
  cardExpiry?: string;
  cardCvv?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  quantity: number;
  variants?: Record<string, string>;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}