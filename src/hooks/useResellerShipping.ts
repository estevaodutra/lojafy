import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ResellerShippingRules {
  id: string;
  reseller_id: string;
  free_shipping_enabled: boolean;
  free_shipping_min_value: number;
  additional_days: number;
  regional_rates: Record<string, number>;
  enabled_shipping_methods: string[];
  created_at: string;
  updated_at: string;
}

export const useResellerShipping = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const shippingQuery = useQuery({
    queryKey: ["reseller-shipping", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reseller_shipping_rules")
        .select("*")
        .eq("reseller_id", user?.id)
        .maybeSingle();

      if (error) throw error;
      return data as ResellerShippingRules | null;
    },
    enabled: !!user?.id,
  });

  const saveShippingRules = useMutation({
    mutationFn: async (rules: Omit<ResellerShippingRules, "id" | "reseller_id" | "created_at" | "updated_at">) => {
      const existingRules = shippingQuery.data;

      if (existingRules) {
        // Update existing
        const { data, error } = await supabase
          .from("reseller_shipping_rules")
          .update(rules)
          .eq("reseller_id", user?.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new
        const { data, error } = await supabase
          .from("reseller_shipping_rules")
          .insert([{ ...rules, reseller_id: user?.id }])
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reseller-shipping"] });
      toast.success("Configurações de frete salvas com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao salvar configurações");
    },
  });

  return {
    shippingRules: shippingQuery.data,
    isLoading: shippingQuery.isLoading,
    saveShippingRules,
  };
};