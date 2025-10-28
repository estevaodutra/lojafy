import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FinancialTransaction {
  id: string;
  user_id: string;
  order_id?: string;
  transaction_type: string;
  amount: number;
  net_amount: number;
  fee_amount: number;
  status: string;
  description?: string;
  created_at: string;
  processed_at?: string;
  available_at?: string;
}

export const useFinancialTransactions = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["financial-transactions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as FinancialTransaction[];
    },
    enabled: !!user?.id,
  });
};
