import { useRecentOrdersReal } from './useRecentOrdersReal';
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
  const realOrders = useRecentOrdersReal();
  const demoOrders = useRecentOrdersDemo();
  
  // Priorizar dados reais, usar demo como fallback
  const hasRealData = realOrders.data && realOrders.data.length > 0;
  
  return {
    data: hasRealData ? realOrders.data : demoOrders.data,
    isLoading: hasRealData ? realOrders.isLoading : demoOrders.isLoading,
    error: hasRealData ? realOrders.error : demoOrders.error,
    isRealData: hasRealData
  };
};