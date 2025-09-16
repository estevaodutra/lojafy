import { useRecentOrdersDemo } from './useRecentOrdersDemo';

export interface RecentOrder {
  id: string;
  order_number: string;
  created_at: string;
  status: string;
  total_amount: number;
  customer_name: string;
  product_name: string;
  product_image: string;
  unit_price: number;
  quantity: number;
  profit: number;
}

export const useRecentOrders = () => {
  // Always use demo data (fictional data)
  return useRecentOrdersDemo();
};