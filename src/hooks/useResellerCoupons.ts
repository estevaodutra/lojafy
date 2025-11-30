import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ResellerCoupon {
  id: string;
  reseller_id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_value: number;
  max_uses?: number;
  current_uses: number;
  starts_at?: string;
  expires_at?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const useResellerCoupons = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const couponsQuery = useQuery({
    queryKey: ["reseller-coupons", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reseller_coupons")
        .select("*")
        .eq("reseller_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ResellerCoupon[];
    },
    enabled: !!user?.id,
  });

  const createCoupon = useMutation({
    mutationFn: async (coupon: Omit<ResellerCoupon, "id" | "reseller_id" | "current_uses" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("reseller_coupons")
        .insert([{ ...coupon, reseller_id: user?.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reseller-coupons"] });
      toast.success("Cupom criado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar cupom");
    },
  });

  const updateCoupon = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ResellerCoupon> & { id: string }) => {
      const { data, error } = await supabase
        .from("reseller_coupons")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reseller-coupons"] });
      toast.success("Cupom atualizado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar cupom");
    },
  });

  const deleteCoupon = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("reseller_coupons")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reseller-coupons"] });
      toast.success("Cupom excluído com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao excluir cupom");
    },
  });

  return {
    coupons: couponsQuery.data || [],
    isLoading: couponsQuery.isLoading,
    createCoupon,
    updateCoupon,
    deleteCoupon,
  };
};