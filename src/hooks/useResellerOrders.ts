import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ResellerOrder {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
  user_id: string;
  shipping_address: any;
  profiles?: {
    first_name: string;
    last_name: string;
    email?: string;
  };
}

export const useResellerOrders = (statusFilter?: string, searchTerm?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["reseller-orders", user?.id, statusFilter, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("*")
        .eq("reseller_id", user?.id)
        .order("created_at", { ascending: false });

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (searchTerm) {
        query = query.or(`order_number.ilike.%${searchTerm}%`);
      }

      const { data: orders, error } = await query;

      if (error) throw error;

      // Buscar perfis dos usuários
      const userIds = orders?.map(o => o.user_id) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", userIds);

      // Combinar dados
      const ordersWithProfiles = orders?.map(order => ({
        ...order,
        profiles: profiles?.find(p => p.user_id === order.user_id)
      })) || [];

      return ordersWithProfiles as ResellerOrder[];
    },
    enabled: !!user?.id,
  });
};