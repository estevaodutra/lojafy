import { useTopProductsDemo } from './useTopProductsDemo';

export interface TopProduct {
  id: string;
  name: string;
  image_url: string;
  main_image_url: string;
  cost_price: number;
  price: number;
  total_sales: number;
  avg_price: number;
  avg_profit: number;
  days_with_sales: number;
}

export const useTopProducts = () => {
  // Always use demo data (fictional data)
  return useTopProductsDemo();
};