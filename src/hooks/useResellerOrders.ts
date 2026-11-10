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
  reseller_id?: string | null;
  shipping_address: any;
  payment_method?: string;
  ml_shipment_id?: string | null;
  ml_label_url?: string | null;
  tracking_code?: string | null;
  tracking_number?: string | null;
  ml_order_id?: string | null;
  external_reference?: string | null;
  marketplace?: string | null;
  has_shipping_file?: boolean | null;
  shipping_label_status?: string | null;
  pix_qr_code?: string | null;
  pix_qr_code_base64?: string | null;
  payment_expires_at?: string | null;
  notes?: string | null;
  order_items?: any[];
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
        .select(`
          *,
          order_items (
            id,
            product_id,
            quantity,
            unit_price,
            total_price,
            supplier_unit_cost,
            supplier_total_cost,
            product_snapshot,
            supplier_id,
            supplier_organization_id,
            product:products (
              id,
              name,
              image_url,
              images,
              original_images,
              cost_price
            )
          )
        `)
        .eq("reseller_id", user?.id)
        .order("created_at", { ascending: false });

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (searchTerm) {
        query = query.or(
          `order_number.ilike.%${searchTerm}%,ml_order_id.ilike.%${searchTerm}%,tracking_code.ilike.%${searchTerm}%,tracking_number.ilike.%${searchTerm}%`
        );
      }

      const { data: orders, error } = await query;

      if (error) throw error;

      // Buscar perfis dos usuários
      const userIds = orders?.map((o) => o.user_id).filter(Boolean) || [];
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name, business_name")
          .in("user_id", userIds);
        profiles = data || [];
      }

      // Buscar produtos para garantir miniatura mesmo se join falhar
      const productIds = new Set<string>();
      orders?.forEach((o) => {
        o.order_items?.forEach((it: any) => {
          if (it.product_id) productIds.add(it.product_id);
        });
      });

      const prodsMap = new Map<string, any>();
      if (productIds.size > 0) {
        const { data: prods } = await supabase
          .from("products")
          .select("id, name, image_url, images, original_images, cost_price")
          .in("id", Array.from(productIds));
        prods?.forEach((p) => prodsMap.set(p.id, p));
      }

      // Combinar dados
      const ordersWithProfiles =
        orders?.map((order) => ({
          ...order,
          profiles: profiles.find((p) => p.user_id === order.user_id),
          order_items: order.order_items?.map((it: any) => ({
            ...it,
            product: it.product || prodsMap.get(it.product_id) || null,
          })),
        })) || [];

      return ordersWithProfiles as ResellerOrder[];
    },
    enabled: !!user?.id,
  });
};
