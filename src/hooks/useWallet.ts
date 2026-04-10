import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Wallet {
  id: string;
  user_id: string;
  saldo: number;
  saldo_bloqueado: number;
  created_at: string;
  updated_at: string;
}

interface WalletTransaction {
  id: string;
  wallet_id: string;
  tipo: string;
  valor: number;
  taxa: number;
  valor_pago: number;
  saldo_anterior: number;
  saldo_posterior: number;
  descricao: string | null;
  referencia_tipo: string | null;
  referencia_id: string | null;
  status: string;
  payment_id: string | null;
  created_at: string;
}

interface WalletSettings {
  carteira_valor_minimo: number;
  carteira_valor_maximo: number;
  carteira_taxa_percentual: number;
  carteira_valores_sugeridos: number[];
  carteira_pagamento_parcial: boolean;
}

export const useWallet = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async (): Promise<Wallet | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Wallet | null;
    },
    enabled: !!user?.id,
  });
};

export const useWalletTransactions = (page = 1, limit = 20) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["wallet-transactions", user?.id, page, limit],
    queryFn: async () => {
      if (!user?.id) return { transactions: [], total: 0 };

      // First get user's wallet
      const { data: wallet } = await supabase
        .from("wallets")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!wallet) return { transactions: [], total: 0 };

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await supabase
        .from("wallet_transactions")
        .select("*", { count: "exact" })
        .eq("wallet_id", wallet.id)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      return {
        transactions: (data || []) as WalletTransaction[],
        total: count || 0,
      };
    },
    enabled: !!user?.id,
  });
};

export const useWalletSettings = () => {
  return useQuery({
    queryKey: ["wallet-settings"],
    queryFn: async (): Promise<WalletSettings> => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select(
          "carteira_valor_minimo, carteira_valor_maximo, carteira_taxa_percentual, carteira_valores_sugeridos, carteira_pagamento_parcial"
        )
        .single();

      if (error) throw error;

      return {
        carteira_valor_minimo: Number(data.carteira_valor_minimo) || 100,
        carteira_valor_maximo: Number(data.carteira_valor_maximo) || 5000,
        carteira_taxa_percentual: Number(data.carteira_taxa_percentual) || 5.5,
        carteira_valores_sugeridos: (data.carteira_valores_sugeridos as number[]) || [100, 200, 300, 500],
        carteira_pagamento_parcial: data.carteira_pagamento_parcial ?? false,
      };
    },
  });
};
