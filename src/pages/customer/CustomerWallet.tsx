import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, Plus, ArrowDownLeft, ArrowUpRight, RotateCcw, Gift, Settings2, TrendingUp } from "lucide-react";
import { useWallet, useWalletTransactions } from "@/hooks/useWallet";
import { AddBalanceModal } from "@/components/wallet/AddBalanceModal";

const TIPO_CONFIG: Record<string, { label: string; icon: typeof Wallet; color: string; sign: string }> = {
  recarga: { label: "Recarga via PIX", icon: ArrowDownLeft, color: "text-emerald-600", sign: "+" },
  pagamento_pedido: { label: "Pagamento de Pedido", icon: ArrowUpRight, color: "text-red-500", sign: "-" },
  estorno: { label: "Estorno", icon: RotateCcw, color: "text-emerald-600", sign: "+" },
  bonus: { label: "Bônus", icon: Gift, color: "text-emerald-600", sign: "+" },
  ajuste_credito: { label: "Ajuste (Crédito)", icon: TrendingUp, color: "text-emerald-600", sign: "+" },
  ajuste_debito: { label: "Ajuste (Débito)", icon: Settings2, color: "text-red-500", sign: "-" },
  cashback: { label: "Cashback", icon: Gift, color: "text-emerald-600", sign: "+" },
};

const CustomerWallet = () => {
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const [page] = useState(1);
  const { data: txData, isLoading: txLoading } = useWalletTransactions(page, 20);
  const [showAddBalance, setShowAddBalance] = useState(false);

  const formatPrice = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
      " às " +
      d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  if (walletLoading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">Carregando carteira...</div>;
  }

  const saldo = wallet?.saldo ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Wallet className="w-8 h-8" />
          Minha Carteira
        </h1>
        <p className="text-muted-foreground mt-1">Gerencie seu saldo e veja suas transações</p>
      </div>

      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Saldo Disponível</p>
              <p className="text-4xl font-bold text-primary">{formatPrice(saldo)}</p>
              {(wallet?.saldo_bloqueado ?? 0) > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Bloqueado: {formatPrice(wallet!.saldo_bloqueado)}
                </p>
              )}
            </div>
            <Button onClick={() => setShowAddBalance(true)} size="lg" className="gap-2">
              <Plus className="w-5 h-5" />
              Adicionar Saldo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Extrato</CardTitle>
        </CardHeader>
        <CardContent>
          {txLoading ? (
            <p className="text-muted-foreground text-center py-8">Carregando...</p>
          ) : !txData?.transactions.length ? (
            <p className="text-muted-foreground text-center py-8">Nenhuma transação encontrada</p>
          ) : (
            <div className="space-y-3">
              {txData.transactions.map((tx) => {
                const config = TIPO_CONFIG[tx.tipo] || TIPO_CONFIG.recarga;
                const Icon = config.icon;
                return (
                  <div key={tx.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                    <div className={`p-2 rounded-full bg-muted ${config.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{tx.descricao || config.label}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</p>
                      {tx.tipo === "recarga" && tx.taxa > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Taxa: {formatPrice(tx.taxa)} · Pago: {formatPrice(tx.valor_pago)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${config.color}`}>
                        {config.sign}{formatPrice(tx.valor)}
                      </p>
                      <Badge variant={tx.status === "completed" ? "default" : "secondary"} className="text-xs">
                        {tx.status === "completed" ? "Confirmado" : tx.status === "pending" ? "Pendente" : tx.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AddBalanceModal open={showAddBalance} onOpenChange={setShowAddBalance} />
    </div>
  );
};

export default CustomerWallet;
