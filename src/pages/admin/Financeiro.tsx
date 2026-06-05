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
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw, 
  DollarSign, 
  Users, 
  ArrowUpDown, 
  Search, 
  Coins, 
  Activity
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useAdminWithdrawalRequests,
  useApproveWithdrawal,
  useRejectWithdrawal,
  type AdminWithdrawalRequest,
} from "@/hooks/useAdminWithdrawalRequests";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AdminWalletAdjustModal } from "@/components/admin/AdminWalletAdjustModal";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

// ── Helpers ─────────────────────────────────────────────────────────

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function getOrderNumber(desc?: string) {
  if (!desc) return "—";
  const match = desc.match(/#([A-Za-z0-9-]+)/);
  return match ? `#${match[1]}` : "—";
}

const TIPO_LABELS: Record<string, string> = {
  recarga:          "Recarga",
  pagamento_pedido: "Pagamento",
  estorno:          "Estorno",
  bonus:            "Bônus",
  ajuste_credito:   "Ajuste +",
  ajuste_debito:    "Ajuste -",
  cashback:         "Cashback",
};

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending:    { label: "Pendente",     variant: "secondary" },
  processing: { label: "Processando",  variant: "default" },
  approved:   { label: "Aprovado",     variant: "default" },
  rejected:   { label: "Rejeitado",    variant: "destructive" },
  completed:  { label: "Concluído",    variant: "outline" },
};

function userName(req: AdminWithdrawalRequest) {
  const p = req.profile;
  if (!p) return "Usuário";
  return [p.first_name, p.last_name].filter(Boolean).join(" ") || "Usuário";
}

const getRoleLabel = (role?: string) => {
  switch (role) {
    case "super_admin": return "Super Admin";
    case "admin": return "Admin";
    case "supplier": return "Fornecedor";
    case "reseller": return "Revendedor";
    default: return "Cliente";
  }
};

const getRoleBadgeVariant = (role?: string) => {
  switch (role) {
    case "super_admin": return "destructive" as const;
    case "admin": return "default" as const;
    case "supplier": return "secondary" as const;
    case "reseller": return "outline" as const;
    default: return "outline" as const;
  }
};

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

// ── Aba 2: Histórico de Transações (REMODELADO COMO LISTA DE PEDIDOS) ───────────

function TransactionsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [syncing, setSyncing] = useState(false);

  const limit = 20;

  // Custom fetch to allow search, types, and pagination dynamically
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-transactions-enhanced', page, typeFilter, search],
    queryFn: async () => {
      const offset = (page - 1) * limit;

      let query = supabase
        .from('wallet_transactions')
        .select(`
          *,
          wallet:wallets!wallet_transactions_wallet_id_fkey(user_id),
          profile:wallets!wallet_transactions_wallet_id_fkey(
            profiles!wallets_user_id_fkey(first_name, last_name, role)
          )
        `, { count: 'exact' });

      // Apply type filter
      if (typeFilter !== "all") {
        query = query.eq('tipo', typeFilter);
      }

      // Apply search in description or user name / ID
      if (search.trim()) {
        query = query.ilike('descricao', `%${search.trim()}%`);
      }

      const { data: txs, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return { transactions: txs ?? [], total: count ?? 0 };
    }
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      setSyncing(true);
      const { data, error } = await supabase.rpc('sync_historical_orders_to_wallets');
      if (error) throw error;
      return typeof data === "string" ? JSON.parse(data) : data;
    },
    onSuccess: (res) => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['admin-all-wallets'] });
      queryClient.invalidateQueries({ queryKey: ['admin-financeiro-stats'] });
      toast({
        title: 'Sincronização Concluída',
        description: `Transações históricas sincronizadas com sucesso. Pagos: ${res.orders_paid_synced}, Enviados: ${res.orders_shipped_synced}, Cancelados: ${res.orders_cancelled_synced}`,
      });
      setSyncing(false);
    },
    onError: (e: Error) => {
      toast({ variant: 'destructive', title: 'Erro ao sincronizar', description: e.message });
      setSyncing(false);
    }
  });

  const transactions = data?.transactions ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Filters & Actions */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por descrição ou nº do pedido..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>

          {/* Type filter */}
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Filtrar por Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="recarga">Recarga / Pagamento</SelectItem>
              <SelectItem value="pagamento_pedido">Repasse Fornecedor</SelectItem>
              <SelectItem value="estorno">Estorno / Reembolso</SelectItem>
              <SelectItem value="cashback">Comissão / Cashback</SelectItem>
              <SelectItem value="ajuste_credito">Ajuste +</SelectItem>
              <SelectItem value="ajuste_debito">Ajuste - / Payout</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sync and Refresh actions */}
        <div className="flex gap-2 w-full md:w-auto justify-end">
          <Button 
            variant="outline" 
            className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            onClick={() => syncMutation.mutate()}
            disabled={syncing}
          >
            {syncing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <Activity className="h-4 w-4 mr-2" />
                Sincronizar Pedidos Antigos
              </>
            )}
          </Button>

          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : transactions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ArrowUpDown className="h-10 w-10 mb-3 opacity-40" />
            <p>Nenhuma transação encontrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border overflow-x-auto bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Operação</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Taxa</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx: any) => {
                const isCredit = Number(tx.saldo_posterior ?? 0) > Number(tx.saldo_anterior ?? 0);
                const userObj = tx.profile?.profiles;
                const name = userObj ? [userObj.first_name, userObj.last_name].filter(Boolean).join(" ") : "Usuário";
                return (
                  <TableRow key={tx.id}>
                    <TableCell className="font-mono font-semibold text-sm whitespace-nowrap">
                      {getOrderNumber(tx.descricao)}
                    </TableCell>
                    <TableCell className="font-semibold text-sm">
                      {name}
                      <span className="block font-mono text-[10px] text-muted-foreground font-normal">
                        ID: {tx.wallet?.user_id?.slice(0, 8)}...
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(userObj?.role)}>
                        {getRoleLabel(userObj?.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{TIPO_LABELS[tx.tipo] ?? tx.tipo}</Badge>
                    </TableCell>
                    <TableCell className={isCredit ? "text-green-600 font-semibold text-sm whitespace-nowrap" : "text-destructive font-semibold text-sm whitespace-nowrap"}>
                      {isCredit ? "+" : "-"}{formatBRL(Math.abs(tx.valor))}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {tx.taxa > 0 ? formatBRL(tx.taxa) : "—"}
                    </TableCell>
                    <TableCell className="text-sm max-w-xs truncate" title={tx.descricao}>{tx.descricao}</TableCell>
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
        <div className="flex items-center justify-center gap-2 pt-2">
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

// ── Aba 4: Carteiras por Perfil ──────────────────────────────────────────

interface UserWalletData {
  id: string;
  user_id: string;
  saldo: number;
  saldo_bloqueado: number;
  profile?: {
    first_name: string | null;
    last_name: string | null;
    role: string;
  };
}

function WalletsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<"all" | "super_admin" | "supplier" | "client">("all");
  const [search, setSearch] = useState("");
  const [selectedWalletForAdjust, setSelectedWalletForAdjust] = useState<UserWalletData | null>(null);
  
  // Payout states
  const [payoutWallet, setPayoutWallet] = useState<UserWalletData | null>(null);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutDescription, setPayoutDescription] = useState("Repasse efetuado via PIX");

  // Fetch wallets and profiles
  const { data: wallets = [], isLoading, refetch } = useQuery<UserWalletData[]>({
    queryKey: ['admin-all-wallets'],
    queryFn: async () => {
      const [{ data: walletsData, error: walletsError }, { data: profilesData, error: profilesError }] = await Promise.all([
        supabase.from('wallets').select('*'),
        supabase.from('profiles').select('user_id, first_name, last_name, role'),
      ]);
      if (walletsError) throw walletsError;
      if (profilesError) throw profilesError;

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
      return (walletsData || []).map(w => ({
        ...w,
        profile: profilesMap.get(w.user_id),
      }));
    }
  });

  const payoutMutation = useMutation({
    mutationFn: async ({ userId, amount, description }: { userId: string, amount: number, description: string }) => {
      const { data, error } = await supabase.rpc('debitar_carteira' as any, {
        p_user_id: userId,
        p_valor: amount,
        p_descricao: description,
        p_referencia_tipo: 'payout_fornecedor',
        p_referencia_id: null
      });
      if (error) throw error;
      const result = typeof data === "string" ? JSON.parse(data) : data;
      if (!result?.success) throw new Error(result?.error || "Erro ao debitar");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-wallets'] });
      queryClient.invalidateQueries({ queryKey: ['admin-financeiro-stats'] });
      toast({ title: 'Baixa processada', description: 'O débito de pagamento ao fornecedor foi registrado com sucesso.' });
      closePayoutDialog();
    },
    onError: (e: Error) => {
      toast({ variant: 'destructive', title: 'Erro ao registrar baixa', description: e.message });
    }
  });

  function closePayoutDialog() {
    setPayoutWallet(null);
    setPayoutAmount("");
    setPayoutDescription("Repasse efetuado via PIX");
  }

  function handlePayoutSubmit() {
    if (!payoutWallet || !payoutAmount) return;
    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: 'destructive', title: 'Valor inválido' });
      return;
    }
    payoutMutation.mutate({
      userId: payoutWallet.user_id,
      amount,
      description: payoutDescription.trim(),
    });
  }

  const filteredWallets = wallets.filter(w => {
    const role = w.profile?.role || "customer";
    const name = `${w.profile?.first_name || ''} ${w.profile?.last_name || ''}`.toLowerCase();
    
    // Role filter
    let matchesRole = true;
    if (roleFilter === "super_admin") matchesRole = role === "super_admin" || role === "admin";
    else if (roleFilter === "supplier") matchesRole = role === "supplier";
    else if (roleFilter === "client") matchesRole = role === "customer" || role === "reseller";

    // Search filter
    const matchesSearch = name.includes(search.toLowerCase()) || w.user_id.toLowerCase().includes(search.toLowerCase());

    return matchesRole && matchesSearch;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={roleFilter} onValueChange={(v: any) => setRoleFilter(v)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por Perfil" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Perfis</SelectItem>
              <SelectItem value="super_admin">Super Admins / Admins</SelectItem>
              <SelectItem value="supplier">Fornecedores</SelectItem>
              <SelectItem value="client">Clientes / Revendedores</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
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
      ) : filteredWallets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Users className="h-10 w-10 mb-3 opacity-40" />
            <p>Nenhuma carteira encontrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border overflow-x-auto bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>ID Usuário</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Saldo Disponível</TableHead>
                <TableHead>Saldo Bloqueado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWallets.map((wallet) => {
                const name = [wallet.profile?.first_name, wallet.profile?.last_name].filter(Boolean).join(" ") || "Sem Nome";
                const isSupplier = wallet.profile?.role === "supplier";
                return (
                  <TableRow key={wallet.id}>
                    <TableCell className="font-semibold">{name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{wallet.user_id.slice(0, 8)}...</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(wallet.profile?.role)}>
                        {getRoleLabel(wallet.profile?.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">{formatBRL(Number(wallet.saldo))}</TableCell>
                    <TableCell className="text-muted-foreground">{formatBRL(Number(wallet.saldo_bloqueado))}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedWalletForAdjust(wallet)}
                        >
                          Ajustar Saldo
                        </Button>
                        {isSupplier && (
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            onClick={() => {
                              setPayoutWallet(wallet);
                              setPayoutAmount(String(wallet.saldo));
                            }}
                          >
                            Dar Baixa
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Adjust Modal */}
      {selectedWalletForAdjust && (
        <AdminWalletAdjustModal
          isOpen={!!selectedWalletForAdjust}
          onClose={() => setSelectedWalletForAdjust(null)}
          userId={selectedWalletForAdjust.user_id}
          userName={[selectedWalletForAdjust.profile?.first_name, selectedWalletForAdjust.profile?.last_name].filter(Boolean).join(" ") || "Usuário"}
          currentBalance={Number(selectedWalletForAdjust.saldo)}
          onSuccess={() => {
            refetch();
            queryClient.invalidateQueries({ queryKey: ['admin-financeiro-stats'] });
          }}
        />
      )}

      {/* Payout Dialog */}
      <Dialog open={!!payoutWallet} onOpenChange={(o) => { if (!o) closePayoutDialog(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-600">
              <Coins className="h-5 w-5" />
              Dar Baixa em Pagamento
            </DialogTitle>
            <DialogDescription>
              Registre um repasse efetuado fora da plataforma para descontar a dívida com o fornecedor.
            </DialogDescription>
          </DialogHeader>

          {payoutWallet && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-muted rounded-lg space-y-1.5 text-sm">
                <p><strong>Fornecedor:</strong> {[payoutWallet.profile?.first_name, payoutWallet.profile?.last_name].filter(Boolean).join(" ")}</p>
                <p><strong>Dívida Atual:</strong> <span className="font-semibold text-indigo-600">{formatBRL(Number(payoutWallet.saldo))}</span></p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payout-amount">Valor Pago (R$) *</Label>
                <Input
                  id="payout-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payout-desc">Descrição / Comprovante *</Label>
                <Input
                  id="payout-desc"
                  placeholder="Ex: Pagamento referente a vendas da semana - PIX Banco X"
                  value={payoutDescription}
                  onChange={(e) => setPayoutDescription(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closePayoutDialog}>Cancelar</Button>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white" 
              onClick={handlePayoutSubmit}
              disabled={payoutMutation.isPending || !payoutAmount}
            >
              {payoutMutation.isPending ? "Processando..." : "Confirmar Baixa (Débito)"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function AdminFinanceiro() {
  const navigate = useNavigate();
  const location = useLocation();

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['admin-financeiro-stats'],
    queryFn: async () => {
      const [
        { count: pending }, 
        { count: total }, 
        { data: wallets },
        { data: profiles }
      ] = await Promise.all([
        supabase.from('withdrawal_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('withdrawal_requests').select('id', { count: 'exact', head: true }),
        supabase.from('wallets').select('*'),
        supabase.from('profiles').select('user_id, role')
      ]);

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      let superAdminBalance = 0;
      let supplierBalance = 0;
      let clientBalance = 0;
      let totalCirculacao = 0;

      for (const w of (wallets ?? [])) {
        const val = Number(w.saldo);
        totalCirculacao += val;

        const role = profilesMap.get(w.user_id)?.role || "customer";
        if (role === "super_admin" || role === "admin") {
          superAdminBalance += val;
        } else if (role === "supplier") {
          supplierBalance += val;
        } else {
          clientBalance += val;
        }
      }

      return { 
        pending: pending ?? 0, 
        total: total ?? 0, 
        superAdminBalance,
        supplierBalance,
        clientBalance,
        totalCirculacao
      };
    },
  });

  const currentTab = location.pathname.endsWith("/transacoes")
    ? "transactions"
    : location.pathname.endsWith("/saques")
    ? "withdrawals"
    : location.pathname.endsWith("/configuracoes")
    ? "settings"
    : "wallets";

  const handleTabChange = (value: string) => {
    if (value === "wallets") navigate("/super-admin/financeiro/carteiras");
    else if (value === "transactions") navigate("/super-admin/financeiro/transacoes");
    else if (value === "withdrawals") navigate("/super-admin/financeiro/saques");
    else if (value === "settings") navigate("/super-admin/financeiro/configuracoes");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Painel Financeiro</h1>
          <p className="text-muted-foreground">Gerencie saques, perfis de carteiras, repasses e transações</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchStats()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Recarregar Painel
        </Button>
      </div>

      {/* Cards de resumo (3 Perfis de Carteira + Saques) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-blue-100 bg-blue-50/20">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-900">{formatBRL(stats?.superAdminBalance ?? 0)}</p>
              <p className="text-xs text-muted-foreground font-medium">Carteira Super Admin</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-indigo-100 bg-indigo-50/20">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600">
              <Coins className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-indigo-900">{formatBRL(stats?.supplierBalance ?? 0)}</p>
              <p className="text-xs text-muted-foreground font-medium">Dívida c/ Fornecedores</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-teal-100 bg-teal-50/20">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 bg-teal-100 rounded-lg text-teal-600">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-teal-900">{formatBRL(stats?.clientBalance ?? 0)}</p>
              <p className="text-xs text-muted-foreground font-medium">Carteiras Clientes</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-100 bg-amber-50/20">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="p-3 bg-amber-100 rounded-lg text-amber-600">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-900">{stats?.pending ?? 0} saques</p>
              <p className="text-xs text-muted-foreground font-medium">Solicitações Pendentes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList>
          <TabsTrigger value="wallets">Gestão de Carteiras</TabsTrigger>
          <TabsTrigger value="transactions">Transações</TabsTrigger>
          <TabsTrigger value="withdrawals" className="relative">
            Solicitações de Saque
            {(stats?.pending ?? 0) > 0 && (
              <span className="ml-2 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] text-white leading-none">
                {stats!.pending}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <Outlet />
        </div>
      </Tabs>
    </div>
  );
}

export {
  WalletsTab as FinanceiroWallets,
  TransactionsTab as FinanceiroTransactions,
  WithdrawalsTab as FinanceiroWithdrawals,
  SettingsTab as FinanceiroSettings
};
