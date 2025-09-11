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
  cpf: string;
  address: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  paymentMethod: 'pix';
}

export interface MercadoPagoPixResponse {
  id: number;
  status: string;
  payment_method_id: string;
  payment_type_id: string;
  date_created: string;
  date_approved: string | null;
  date_last_updated: string;
  transaction_amount: number;
  currency_id: string;
  description: string;
  external_reference: string;
  payer: {
    id: string;
    email: string;
    identification: {
      type: string;
      number: string;
    };
  };
  point_of_interaction: {
    type: string;
    application_data: {
      name: string;
      version: string;
    };
    transaction_data: {
      qr_code_base64: string;
      qr_code: string;
      ticket_url: string;
    };
  };
}

export interface PixPaymentData {
  payment_id: number;
  status: string;
  qr_code: string;
  qr_code_base64: string;
  ticket_url: string;
  expires_at: string;
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