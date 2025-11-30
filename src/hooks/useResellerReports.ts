import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfDay, endOfDay, subDays } from "date-fns";

interface DateRange {
  from: Date;
  to: Date;
}

export const useResellerReports = (dateRange: DateRange) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["reseller-reports", user?.id, dateRange],
    queryFn: async () => {
      const fromDate = startOfDay(dateRange.from).toISOString();
      const toDate = endOfDay(dateRange.to).toISOString();

      // Buscar pedidos do período
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            product_id,
            quantity,
            total_price,
            products (name)
          )
        `)
        .eq("reseller_id", user?.id)
        .gte("created_at", fromDate)
        .lte("created_at", toDate)
        .in("status", ["confirmed", "processing", "shipped", "delivered"]);

      if (ordersError) throw ordersError;

      // Calcular métricas
      const totalSales = orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;
      const totalOrders = orders?.length || 0;
      const avgTicket = totalOrders > 0 ? totalSales / totalOrders : 0;

      // Agrupar vendas por dia
      const salesByDay = orders?.reduce((acc: any, order) => {
        const date = new Date(order.created_at).toLocaleDateString("pt-BR");
        if (!acc[date]) {
          acc[date] = { date, total: 0, count: 0 };
        }
        acc[date].total += Number(order.total_amount);
        acc[date].count += 1;
        return acc;
      }, {});

      // Top produtos
      const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
      orders?.forEach(order => {
        order.order_items?.forEach((item: any) => {
          const productId = item.product_id;
          if (!productSales[productId]) {
            productSales[productId] = {
              name: item.products?.name || "Produto",
              quantity: 0,
              revenue: 0
            };
          }
          productSales[productId].quantity += item.quantity;
          productSales[productId].revenue += Number(item.total_price);
        });
      });

      const topProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Status distribution
      const statusDistribution = orders?.reduce((acc: any, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {});

      return {
        totalSales,
        totalOrders,
        avgTicket,
        salesByDay: Object.values(salesByDay || {}),
        topProducts,
        statusDistribution,
      };
    },
    enabled: !!user?.id,
  });
};