import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ResellerSalesData {
  sales_this_month: number;
  sales_last_month: number;
  commissions_this_month: number;
  commissions_last_month: number;
  total_customers: number;
  conversion_rate: number;
}

export const useResellerSales = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["reseller-sales", user?.id],
    queryFn: async (): Promise<ResellerSalesData> => {
      if (!user?.id) {
        return {
          sales_this_month: 0,
          sales_last_month: 0,
          commissions_this_month: 0,
          commissions_last_month: 0,
          total_customers: 0,
          conversion_rate: 0,
        };
      }

      // Fetch sales data from financial_transactions
      const { data: transactions, error } = await supabase
        .from("financial_transactions")
        .select("*")
        .eq("user_id", user.id)
        .eq("transaction_type", "commission");

      if (error) throw error;

      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const thisMonthTransactions = transactions?.filter(
        (t) => new Date(t.created_at) >= thisMonthStart
      ) || [];

      const lastMonthTransactions = transactions?.filter(
        (t) => new Date(t.created_at) >= lastMonthStart && new Date(t.created_at) <= lastMonthEnd
      ) || [];

      // Count unique orders
      const sales_this_month = new Set(
        thisMonthTransactions.filter((t) => t.order_id).map((t) => t.order_id)
      ).size;

      const sales_last_month = new Set(
        lastMonthTransactions.filter((t) => t.order_id).map((t) => t.order_id)
      ).size;

      // Sum commissions
      const commissions_this_month = thisMonthTransactions.reduce(
        (sum, t) => sum + (Number(t.net_amount) || 0),
        0
      );

      const commissions_last_month = lastMonthTransactions.reduce(
        (sum, t) => sum + (Number(t.net_amount) || 0),
        0
      );

      // Get unique customers from orders
      const orderIds = transactions?.filter((t) => t.order_id).map((t) => t.order_id) || [];
      
      let total_customers = 0;
      if (orderIds.length > 0) {
        const { data: orders } = await supabase
          .from("orders")
          .select("user_id")
          .in("id", orderIds);

        total_customers = new Set(orders?.map((o) => o.user_id)).size;
      }

      // Calculate conversion rate (mock for now - would need store visits data)
      const conversion_rate = sales_this_month > 0 ? 3.2 : 0;

      return {
        sales_this_month,
        sales_last_month,
        commissions_this_month,
        commissions_last_month,
        total_customers,
        conversion_rate,
      };
    },
    enabled: !!user?.id,
  });
};
