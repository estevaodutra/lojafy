import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface FinancialBalance {
  available: number;
  blocked: number;
  pending: number;
  totalWithdrawn: number;
}

export const useFinancialBalance = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["financial-balance", user?.id],
    queryFn: async (): Promise<FinancialBalance> => {
      if (!user?.id) {
        return { available: 0, blocked: 0, pending: 0, totalWithdrawn: 0 };
      }

      // Calculate available balance
      const { data: availableData, error: availableError } = await supabase.rpc(
        "calculate_available_balance",
        { p_user_id: user.id }
      );

      if (availableError) throw availableError;

      // Calculate blocked balance
      const { data: blockedData, error: blockedError } = await supabase.rpc(
        "calculate_blocked_balance",
        { p_user_id: user.id }
      );

      if (blockedError) throw blockedError;

      // Calculate pending withdrawals
      const { data: pendingData, error: pendingError } = await supabase.rpc(
        "calculate_pending_withdrawals",
        { p_user_id: user.id }
      );

      if (pendingError) throw pendingError;

      // Calculate total withdrawn
      const { data: withdrawnData, error: withdrawnError } = await supabase.rpc(
        "calculate_total_withdrawn",
        { p_user_id: user.id }
      );

      if (withdrawnError) throw withdrawnError;

      return {
        available: Number(availableData) || 0,
        blocked: Number(blockedData) || 0,
        pending: Number(pendingData) || 0,
        totalWithdrawn: Number(withdrawnData) || 0,
      };
    },
    enabled: !!user?.id,
  });
};
