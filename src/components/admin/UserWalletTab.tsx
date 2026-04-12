import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Wallet, Plus, Loader2, ArrowDownCircle, ArrowUpCircle, RefreshCw, Gift, AlertTriangle, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdminWalletAdjustModal } from "./AdminWalletAdjustModal";

const PAGE_SIZE = 20;

const TRANSACTION_TYPES: Record<string, { emoji: string; label: string; color: string; sign: "+" | "-" }> = {
  recarga: { emoji: "📥", label: "Recarga via PIX", color: "text-green-600", sign: "+" },
  pagamento_pedido: { emoji: "📦", label: "Pagamento Pedido", color: "text-red-600", sign: "-" },
  estorno: { emoji: "🔄", label: "Estorno", color: "text-green-600", sign: "+" },
  ajuste_credito: { emoji: "🎁", label: "Crédito Manual", color: "text-green-600", sign: "+" },
  ajuste_debito: { emoji: "⚠️", label: "Débito Manual", color: "text-red-600", sign: "-" },
  cashback: { emoji: "💚", label: "Cashback", color: "text-green-600", sign: "+" },
  reembolso: { emoji: "🔄", label: "Reembolso", color: "text-green-600", sign: "+" },
};

interface UserWalletTabProps {
  userId: string;
  userName: string;
}

export const UserWalletTab = ({ userId, userName }: UserWalletTabProps) => {
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const { data: wallet, isLoading: walletLoading, refetch: refetchWallet } = useQuery({
    queryKey: ["admin-user-wallet", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: txData, isLoading: txLoading, refetch: refetchTx } = useQuery({
    queryKey: ["admin-user-wallet-tx", userId, wallet?.id, limit],
    queryFn: async () => {
      if (!wallet?.id) return { transactions: [], total: 0 };
      const { data, error, count } = await supabase
        .from("wallet_transactions")
        .select("*", { count: "exact" })
        .eq("wallet_id", wallet.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return { transactions: data || [], total: count || 0 };
    },
    enabled: !!wallet?.id,
  });

  const transactions = txData?.transactions || [];
  const totalTx = txData?.total || 0;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const handleAdjustSuccess = () => {
    refetchWallet();
    refetchTx();
  };

  if (walletLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <Wallet className="w-8 h-8 mx-auto mb-2 opacity-50" />
        Este usuário não possui carteira
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Balance Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Saldo Disponível</p>
              <p className="text-2xl font-bold">{formatCurrency(Number(wallet.saldo))}</p>
              {Number(wallet.saldo_bloqueado) > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Bloqueado: {formatCurrency(Number(wallet.saldo_bloqueado))}
                </p>
              )}
            </div>
            <Button size="sm" onClick={() => setAdjustOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Ajustar Saldo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions */}
      <div>
        <h4 className="text-sm font-medium mb-3">Histórico de Transações</h4>
        {txLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma transação</p>
        ) : (
          <div className="space-y-1">
            {transactions.map((tx: any) => {
              const typeConfig = TRANSACTION_TYPES[tx.tipo] || {
                emoji: "💳",
                label: tx.tipo,
                color: "text-foreground",
                sign: tx.valor > 0 ? "+" : "-",
              };
              return (
                <div key={tx.id} className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {typeConfig.emoji} {tx.descricao || typeConfig.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(tx.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      {tx.taxa > 0 && ` · Taxa: ${formatCurrency(Number(tx.taxa))}`}
                      {tx.valor_pago > 0 && tx.valor_pago !== tx.valor && ` · Pago: ${formatCurrency(Number(tx.valor_pago))}`}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold ${typeConfig.color} shrink-0`}>
                    {typeConfig.sign === "+" ? "+" : "-"}
                    {formatCurrency(Math.abs(Number(tx.valor)))}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {transactions.length < totalTx && (
          <div className="text-center mt-3">
            <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
              Carregar mais ({totalTx - transactions.length} restantes)
            </Button>
          </div>
        )}
      </div>

      <AdminWalletAdjustModal
        isOpen={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        userId={userId}
        userName={userName}
        currentBalance={Number(wallet.saldo)}
        onSuccess={handleAdjustSuccess}
      />
    </div>
  );
};
