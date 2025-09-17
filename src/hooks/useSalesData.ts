import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format } from 'date-fns';

export interface SalesData {
  date: string;
  sales: number;
}

export const useSalesData = (days: number = 7) => {
  return useQuery({
    queryKey: ['sales-data', days],
    queryFn: async (): Promise<SalesData[]> => {
      const startDate = subDays(new Date(), days - 1);
      
      const { data, error } = await supabase
        .from('orders')
        .select('created_at, total_amount')
        .eq('payment_status', 'paid')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by date and sum sales
      const salesByDate: Record<string, number> = {};
      
      // Initialize all dates with 0
      for (let i = 0; i < days; i++) {
        const date = subDays(new Date(), days - 1 - i);
        const dateKey = format(date, 'yyyy-MM-dd');
        salesByDate[dateKey] = 0;
      }

      // Add actual sales data
      data?.forEach((order) => {
        const dateKey = format(new Date(order.created_at), 'yyyy-MM-dd');
        salesByDate[dateKey] = (salesByDate[dateKey] || 0) + Number(order.total_amount);
      });

      return Object.entries(salesByDate).map(([date, sales]) => ({
        date: format(new Date(date), 'dd/MM'),
        sales: Math.round(sales)
      }));
    },
  });
};