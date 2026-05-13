import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, Clock, RefreshCw, DollarSign, TrendingUp, Users, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useAdminWithdrawalRequests,
  useApproveWithdrawal,
  useRejectWithdrawal,
  useAdminFinancialTransactions,
  type AdminWithdrawalRequest,
} from "@/hooks/useAdminWithdrawalRequests";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending:    { label: "Pendente",     variant: "secondary" },
  processing: { label: "Processando",  variant: "default" },
  approved:   { label: "Aprovado",     variant: "default" },
  rejected:   { label: "Rejeitado",    variant: "destructive" },
  completed:  { label: "Concluído",    variant: "outline" },
};

const TIPO_LABELS: Record<string, string> = {
  recarga:          "Recarga",
  pagamento_pedido: "Pagamento",
  estorno:          "Estorno",
  bonus:            "Bônus",
  ajuste_credito:   "Ajuste +",
  ajuste_debito:    "Ajuste -",
  cashback:         "Cashback",
};

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function userName(req: AdminWithdrawalRequest) {
  const p = req.profile;
  if (!p) return "Usuário";
  return [p.first_name, p.last_name].filter(Boolean).join(" ") || "Usuário";
}

// ── Aba 1: Solicitações de Saque ──────────────────────────────────────────────

function WithdrawalsTab() {
  const [statusFilter, setStatusFilter] = useState("pending");
  const [rejectTarget, setRejectTarget] = useState<AdminWithdrawalRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: requests = [], isLoading, refetch } = useAdminWithdrawalRequests(statusFilter);
  const approveWithdrawal = useApproveWithdrawal();
  const rejectWithdrawal = useRejectWithdrawal();

  function handleApprove(req: AdminWithdrawalRequest) {
    approveWithdrawal.mutate(req.id);
  }

  function handleRejectConfirm() {
    if (!rejectTarget || !rejectReason.trim()) return;
    rejectWithdrawal.mutate(
      { withdrawalId: rejectTarget.id, reason: rejectReason.trim() },
      { onSuccess: () => { setRejectTarget(null); setRejectReason(""); } }
    );
  }

  const pendingCount = requests.filter(r => r.status === "pending").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="processing">Processando</SelectItem>
              <SelectItem value="approved">Aprovados</SelectItem>
              <SelectItem value="rejected">Rejeitados</SelectItem>
              <SelectItem value="completed">Concluídos</SelectItem>
            </SelectContent>
          </Select>
          {pendingCount > 0 && (
            <Badge variant="destructive">{pendingCount} pendentes</Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <CheckCircle className="h-10 w-10 mb-3 opacity-40" />
            <p>Nenhuma solicitação encontrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Taxa</TableHead>
                <TableHead>Líquido</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => {
                const net = req.net_amount ?? (req.amount - (req.fee ?? 0));
                const st = STATUS_LABELS[req.status] ?? { label: req.status, variant: "outline" as const };
                const method = req.bank_details?.method === "pix" ? "PIX" : "Transferência";
                const canAct = req.status === "pending" || req.status === "processing";
                return (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{userName(req)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {req.profile?.role ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>{method}</TableCell>
                    <TableCell>{formatBRL(req.amount)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatBRL(req.fee ?? 0)}</TableCell>
                    <TableCell className="font-semibold text-green-600">{formatBRL(net)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(req.requested_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {canAct && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            disabled={approveWithdrawal.isPending}
                            onClick={() => handleApprove(req)}
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive hover:text-white"
                            disabled={rejectWithdrawal.isPending}
                            onClick={() => setRejectTarget(req)}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Rejeitar
                          </Button>
                        </div>
                      )}
                      {req.status === "rejected" && req.rejection_reason && (
                        <span className="text-xs text-muted-foreground">{req.rejection_reason}</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modal de rejeição */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => { if (!o) { setRejectTarget(null); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Solicitação de Saque</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição. O usuário será notificado.
            </DialogDescription>
          </DialogHeader>
          {rejectTarget && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted p-3 text-sm">
                <p><strong>{userName(rejectTarget)}</strong> — {formatBRL(rejectTarget.amount)}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rejection-reason">Motivo *</Label>
                <Textarea
                  id="rejection-reason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ex: Dados bancários inválidos, saldo insuficiente..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectReason(""); }}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || rejectWithdrawal.isPending}
              onClick={handleRejectConfirm}
            >
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Aba 2: Histórico de Transações ────────────────────────────────────────────

function TransactionsTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminFinancialTransactions(page, 30);
  const transactions = data?.transactions ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 30);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{total} transações no total</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : transactions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ArrowUpDown className="h-10 w-10 mb-3 opacity-40" />
            <p>Nenhuma transação encontrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Taxa</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx: any) => {
                const isCredit = ["recarga", "estorno", "bonus", "ajuste_credito", "cashback", "pagamento_pedido"].includes(tx.tipo);
                return (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <Badge variant="outline">{TIPO_LABELS[tx.tipo] ?? tx.tipo}</Badge>
                    </TableCell>
                    <TableCell className={isCredit ? "text-green-600 font-medium" : "text-destructive font-medium"}>
                      {isCredit ? "+" : "-"}{formatBRL(Math.abs(tx.valor))}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {tx.taxa > 0 ? formatBRL(tx.taxa) : "—"}
                    </TableCell>
                    <TableCell className="text-sm max-w-xs truncate">{tx.descricao}</TableCell>
                    <TableCell>
                      <Badge variant={tx.status === "completed" ? "outline" : "secondary"}>
                        {tx.status === "completed" ? "Confirmado" : "Pendente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(tx.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Aba 3: Configurações Financeiras ─────────────────────────────────────────

function SettingsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['platform-settings-financial'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select(`
          carteira_taxa_percentual,
          carteira_valor_minimo,
          carteira_valor_maximo,
          saque_valor_minimo,
          saque_taxa_percentual,
          split_fornecedor_percentual,
          split_revendedor_percentual,
          split_plataforma_percentual
        `)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState<Record<string, string>>({});

  const updateMutation = useMutation({
    mutationFn: async (updates: Record<string, number>) => {
      const { error } = await supabase
        .from('platform_settings')
        .update(updates)
        .not('id', 'is', null);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings-financial'] });
      toast({ title: 'Configurações salvas' });
      setForm({});
    },
    onError: (e: Error) => {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: e.message });
    },
  });

  if (isLoading) {
    return <div className="space-y-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }

  const val = (key: string) => form[key] ?? String(settings?.[key as keyof typeof settings] ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const updates: Record<string, number> = {};
    for (const [k, v] of Object.entries(form)) {
      const n = parseFloat(v);
      if (!isNaN(n)) updates[k] = n;
    }
    if (Object.keys(updates).length === 0) return;
    updateMutation.mutate(updates);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recarga de Carteira</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          {[
            { key: "carteira_valor_minimo", label: "Valor mínimo (R$)" },
            { key: "carteira_valor_maximo", label: "Valor máximo (R$)" },
            { key: "carteira_taxa_percentual", label: "Taxa de recarga (%)" },
          ].map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                type="number"
                step="0.01"
                value={val(key)}
                onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saques</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          {[
            { key: "saque_valor_minimo", label: "Valor mínimo de saque (R$)" },
            { key: "saque_taxa_percentual", label: "Taxa de saque (%)" },
          ].map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                type="number"
                step="0.01"
                value={val(key)}
                onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Split de Pagamento</CardTitle>
          <CardDescription>
            Define como o valor do pedido é distribuído. Use 0 para calcular automaticamente
            pela margem (preço venda − custo).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          {[
            { key: "split_fornecedor_percentual", label: "Fornecedor (%)" },
            { key: "split_revendedor_percentual", label: "Revendedor (%)" },
            { key: "split_plataforma_percentual", label: "Plataforma (%)" },
          ].map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={val(key)}
                onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Button type="submit" disabled={updateMutation.isPending || Object.keys(form).length === 0}>
        {updateMutation.isPending ? "Salvando..." : "Salvar Configurações"}
      </Button>
    </form>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function AdminFinanceiro() {
  const { data: stats } = useQuery({
    queryKey: ['admin-financeiro-stats'],
    queryFn: async () => {
      const [{ count: pending }, { count: total }, { data: wallets }] = await Promise.all([
        supabase.from('withdrawal_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('withdrawal_requests').select('id', { count: 'exact', head: true }),
        supabase.from('wallets').select('saldo'),
      ]);
      const circulacao = (wallets ?? []).reduce((sum: number, w: any) => sum + Number(w.saldo), 0);
      return { pending: pending ?? 0, total: total ?? 0, circulacao };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Financeiro</h1>
        <p className="text-muted-foreground">Gerencie saques, transações e configurações financeiras</p>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <Clock className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{stats?.pending ?? "—"}</p>
              <p className="text-sm text-muted-foreground">Saques pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <Users className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{stats?.total ?? "—"}</p>
              <p className="text-sm text-muted-foreground">Total de solicitações</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <DollarSign className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">
                {stats ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(stats.circulacao) : "—"}
              </p>
              <p className="text-sm text-muted-foreground">Saldo em circulação</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="withdrawals" className="space-y-6">
        <TabsList>
          <TabsTrigger value="withdrawals" className="relative">
            Solicitações de Saque
            {(stats?.pending ?? 0) > 0 && (
              <span className="ml-2 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] text-white leading-none">
                {stats!.pending}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="transactions">Histórico de Transações</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="withdrawals">
          <WithdrawalsTab />
        </TabsContent>

        <TabsContent value="transactions">
          <TransactionsTab />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
