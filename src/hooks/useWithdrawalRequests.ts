import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  status: "pending" | "processing" | "approved" | "rejected" | "completed";
  bank_details: {
    method: "pix" | "transfer";
    pix_key?: string;
    bank_name?: string;
    agency?: string;
    account?: string;
    account_type?: string;
  };
  requested_at: string;
  processed_at?: string;
  processed_by?: string;
  rejection_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const useWithdrawalRequests = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["withdrawal-requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as WithdrawalRequest[];
    },
    enabled: !!user?.id,
  });

  const createWithdrawal = useMutation({
    mutationFn: async (params: {
      amount: number;
      bank_details: WithdrawalRequest["bank_details"];
    }) => {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .insert({
          user_id: user?.id,
          amount: params.amount,
          bank_details: params.bank_details,
        })
        .select()
        .single();

      if (error) throw error;

      // Create financial transaction
      await supabase.from("financial_transactions").insert({
        user_id: user?.id,
        transaction_type: "withdrawal",
        amount: params.amount,
        net_amount: params.amount,
        status: "pending",
        description: `Solicitação de saque - ID: ${data.id}`,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["withdrawal-requests"] });
      queryClient.invalidateQueries({ queryKey: ["financial-balance"] });
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      toast.success("Solicitação de saque criada com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar solicitação de saque");
    },
  });

  const cancelWithdrawal = useMutation({
    mutationFn: async (withdrawalId: string) => {
      const { error } = await supabase
        .from("withdrawal_requests")
        .delete()
        .eq("id", withdrawalId)
        .eq("status", "pending");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["withdrawal-requests"] });
      queryClient.invalidateQueries({ queryKey: ["financial-balance"] });
      toast.success("Solicitação cancelada com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao cancelar solicitação");
    },
  });

  return {
    withdrawals: query.data || [],
    isLoading: query.isLoading,
    createWithdrawal,
    cancelWithdrawal,
  };
};
