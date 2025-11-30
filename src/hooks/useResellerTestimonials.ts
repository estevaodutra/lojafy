import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ResellerTestimonial {
  id: string;
  reseller_id: string;
  customer_name: string;
  customer_avatar_url?: string;
  customer_initials?: string;
  rating: number;
  comment: string;
  product_purchased?: string;
  position: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const useResellerTestimonials = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const testimonialsQuery = useQuery({
    queryKey: ["reseller-testimonials", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reseller_testimonials")
        .select("*")
        .eq("reseller_id", user?.id)
        .order("position", { ascending: true });

      if (error) throw error;
      return data as ResellerTestimonial[];
    },
    enabled: !!user?.id,
  });

  const createTestimonial = useMutation({
    mutationFn: async (testimonial: Omit<ResellerTestimonial, "id" | "reseller_id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("reseller_testimonials")
        .insert([{ ...testimonial, reseller_id: user?.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reseller-testimonials"] });
      toast.success("Depoimento criado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar depoimento");
    },
  });

  const updateTestimonial = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ResellerTestimonial> & { id: string }) => {
      const { data, error } = await supabase
        .from("reseller_testimonials")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reseller-testimonials"] });
      toast.success("Depoimento atualizado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar depoimento");
    },
  });

  const deleteTestimonial = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("reseller_testimonials")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reseller-testimonials"] });
      toast.success("Depoimento excluído com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao excluir depoimento");
    },
  });

  return {
    testimonials: testimonialsQuery.data || [],
    isLoading: testimonialsQuery.isLoading,
    createTestimonial,
    updateTestimonial,
    deleteTestimonial,
  };
};