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
  Sliders, 
  ArrowRight, 
  Coins, 
  CheckCircle2, 
  Activity, 
  Play, 
  ShieldCheck, 
  Truck,
  RotateCcw
} from "lucide-react";
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
import { AdminWalletAdjustModal } from "@/components/admin/AdminWalletAdjustModal";

// ── Helpers ─────────────────────────────────────────────────────────

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
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

// ── Aba 4: Carteiras por Perfil (NOVO) ──────────────────────────────────────────

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
  
  // Payout states (Dar Baixa)
  const [payoutWallet, setPayoutWallet] = useState<UserWalletData | null>(null);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutDescription, setPayoutDescription] = useState("Repasse efetuado via PIX");
  const [payoutSaving, setPayoutSaving] = useState(false);

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
        <div className="rounded-md border overflow-x-auto">
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
                              setPayoutAmount(String(wallet.saldo)); // Pre-populate with full balance
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

// ── Aba 5: Simulador de Fluxo Financeiro (NOVO) ──────────────────────────────────

function FlowSimulatorTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [syncingHistory, setSyncingHistory] = useState(false);
  const [simulating, setSimulating] = useState(false);

  // Fetch orders for the simulator dropdown list
  const { data: simulatorOrders = [], refetch: refetchSimOrders } = useQuery({
    queryKey: ['admin-simulator-orders-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, status, payment_status, total_amount')
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch complete details of the selected order
  const { data: orderDetails, refetch: refetchOrderDetails } = useQuery({
    queryKey: ['admin-simulator-order-details', selectedOrderId],
    queryFn: async () => {
      if (!selectedOrderId) return null;

      // Parallel queries to construct details safely without complex PostgREST joins
      const [
        { data: order, error: orderErr },
        { data: items, error: itemsErr },
        { data: txs, error: txsErr }
      ] = await Promise.all([
        supabase.from('orders').select('*').eq('id', selectedOrderId).single(),
        supabase.from('order_items').select('*').eq('order_id', selectedOrderId),
        supabase.from('wallet_transactions').select('*').eq('referencia_id', selectedOrderId),
      ]);

      if (orderErr) throw orderErr;
      if (itemsErr) throw itemsErr;
      if (txsErr) throw txsErr;

      // Load products and supplier profiles in memory
      const productIds = items?.map(i => i.product_id).filter(Boolean) || [];
      let products: any[] = [];
      let profiles: any[] = [];

      if (productIds.length > 0) {
        const { data: pData } = await supabase.from('products').select('id, name, cost_price, supplier_id').in('id', productIds);
        products = pData || [];
        
        const supplierUserIds = products.map(p => p.supplier_id).filter(Boolean);
        const buyerUserId = order.user_id;
        const resellerUserId = order.reseller_id;
        
        const uniqueUserIds = [...new Set([...supplierUserIds, buyerUserId, resellerUserId].filter(Boolean))];
        const { data: profData } = await supabase.from('profiles').select('user_id, first_name, last_name, role').in('user_id', uniqueUserIds);
        profiles = profData || [];
      }

      const profilesMap = new Map(profiles.map(p => [p.user_id, p]));
      const productsMap = new Map(products.map(p => [p.id, p]));

      const itemsWithProduct = items?.map(item => {
        const p = productsMap.get(item.product_id);
        const supplierProfile = p ? profilesMap.get(p.supplier_id) : null;
        return {
          ...item,
          product: p,
          supplier: supplierProfile ? `${supplierProfile.first_name || ''} ${supplierProfile.last_name || ''}` : "Fornecedor Desconhecido",
        };
      });

      const buyerProfile = profilesMap.get(order.user_id);
      const resellerProfile = order.reseller_id ? profilesMap.get(order.reseller_id) : null;

      return {
        order,
        items: itemsWithProduct || [],
        transactions: txs || [],
        buyer: buyerProfile ? `${buyerProfile.first_name || ''} ${buyerProfile.last_name || ''}` : "Cliente",
        reseller: resellerProfile ? `${resellerProfile.first_name || ''} ${resellerProfile.last_name || ''}` : null,
      };
    },
    enabled: !!selectedOrderId
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      setSyncingHistory(true);
      const { data, error } = await supabase.rpc('sync_historical_orders_to_wallets');
      if (error) throw error;
      return typeof data === "string" ? JSON.parse(data) : data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-wallets'] });
      queryClient.invalidateQueries({ queryKey: ['admin-financeiro-stats'] });
      if (selectedOrderId) refetchOrderDetails();
      toast({
        title: 'Sincronização Concluída',
        description: `Alinhado com sucesso. Pedidos Pagos: ${data.orders_paid_synced}, Enviados: ${data.orders_shipped_synced}, Cancelados: ${data.orders_cancelled_synced}`,
      });
      setSyncingHistory(false);
    },
    onError: (e: Error) => {
      toast({ variant: 'destructive', title: 'Erro ao sincronizar', description: e.message });
      setSyncingHistory(false);
    }
  });

  async function handleSimulateStatus(targetStatus: string, paymentStatus: string = "paid") {
    if (!selectedOrderId || !orderDetails) return;
    setSimulating(true);
    try {
      // 1. Update order payment_status and status
      const { error } = await supabase
        .from('orders')
        .update({ status: targetStatus, payment_status: paymentStatus })
        .eq('id', selectedOrderId);

      if (error) throw error;

      // 2. Insert into history
      await supabase.from('order_status_history').insert({
        order_id: selectedOrderId,
        status: targetStatus,
        notes: `Simulação de ciclo de vida no painel financeiro (Status -> ${targetStatus})`,
      });

      toast({ title: 'Simulação Executada', description: `Pedido atualizado para ${targetStatus} (${paymentStatus}).` });
      
      // Refresh details and state
      setTimeout(() => {
        refetchOrderDetails();
        refetchSimOrders();
        queryClient.invalidateQueries({ queryKey: ['admin-all-wallets'] });
        queryClient.invalidateQueries({ queryKey: ['admin-financeiro-stats'] });
        setSimulating(false);
      }, 500);

    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro na simulação', description: err.message });
      setSimulating(false);
    }
  }

  // Calculate simulated splits for display
  const calculateSimulatedAllocations = () => {
    if (!orderDetails) return { cost: 0, commission: 0, platform: 0 };
    
    let cost = 0;
    let commission = 0;
    
    for (const item of orderDetails.items) {
      const unit = Number(item.unit_price);
      const qty = Number(item.quantity);
      const costUnit = Number(item.product?.cost_price ?? 0);
      
      cost += costUnit * qty;
      commission += Math.max(0, (unit - costUnit) * qty);
    }

    const total = Number(orderDetails.order.total_amount);
    const platform = Math.max(0, total - cost - (orderDetails.order.reseller_id ? commission : 0));

    return { cost, commission, platform };
  };

  const alloc = calculateSimulatedAllocations();

  return (
    <div className="space-y-6">
      {/* Visual explainer */}
      <Card className="border-indigo-100 bg-indigo-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-indigo-700 flex items-center gap-2">
            <Sliders className="h-5 w-5" />
            Como as movimentações financeiras funcionam?
          </CardTitle>
          <CardDescription className="text-indigo-600/80">
            Abaixo está o ciclo de repasse de valores pelas carteiras da plataforma:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            <div className="p-4 bg-white rounded-lg border border-indigo-100 shadow-sm space-y-2 relative">
              <Badge className="bg-blue-600 text-white mb-1">Passo 1: Pedido Pago</Badge>
              <h4 className="font-semibold text-sm">Entrada no Super Admin</h4>
              <p className="text-xs text-muted-foreground">O cliente efetua o pagamento do pedido. O valor total vai integralmente para a carteira do Super Admin.</p>
              <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 text-indigo-300 z-10">
                <ArrowRight className="h-6 w-6" />
              </div>
            </div>

            <div className="p-4 bg-white rounded-lg border border-indigo-100 shadow-sm space-y-2 relative">
              <Badge className="bg-emerald-600 text-white mb-1">Passo 2: Pedido Enviado</Badge>
              <h4 className="font-semibold text-sm">Distribuição dos Splits</h4>
              <p className="text-xs text-muted-foreground">Quando o fornecedor posta o pedido, o Super Admin debita o custo e repassa ao Fornecedor. A comissão vai para o Revendedor.</p>
              <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 text-indigo-300 z-10">
                <ArrowRight className="h-6 w-6" />
              </div>
            </div>

            <div className="p-4 bg-white rounded-lg border border-indigo-100 shadow-sm space-y-2">
              <Badge className="bg-rose-600 text-white mb-1">Passo 3: Cancelamento</Badge>
              <h4 className="font-semibold text-sm">Estorno & Devolução</h4>
              <p className="text-xs text-muted-foreground">Ao cancelar, o sistema retira automaticamente o saldo do Fornecedor/Revendedor e devolve o reembolso integral ao Cliente.</p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between border-t pt-4 border-indigo-100">
            <div className="text-sm text-indigo-700 font-medium">
              Quer recalcular e aplicar as movimentações para todas as vendas passadas?
            </div>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white" 
              onClick={() => syncMutation.mutate()}
              disabled={syncingHistory}
            >
              {syncingHistory ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sincronizando histórico...
                </>
              ) : (
                <>
                  <Activity className="h-4 w-4 mr-2" />
                  Sincronizar Pedidos Antigos
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Simulator Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Selector & Actions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Play className="h-4 w-4 text-emerald-600" />
              Painel de Simulação
            </CardTitle>
            <CardDescription>Selecione um pedido para simular transições.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Escolha o Pedido</Label>
              <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um pedido recente..." />
                </SelectTrigger>
                <SelectContent>
                  {simulatorOrders.map(o => (
                    <SelectItem key={o.id} value={o.id}>
                      Pedido {o.order_number} ({formatBRL(o.total_amount)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {orderDetails && (
              <div className="space-y-3 pt-3 border-t">
                <Label>Ações de Simulação de Ciclo</Label>
                
                <Button 
                  className="w-full justify-start gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  variant="outline"
                  onClick={() => handleSimulateStatus("recebido", "paid")}
                  disabled={simulating}
                >
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  1. Simular Pedido Pago
                </Button>

                <Button 
                  className="w-full justify-start gap-2 border-purple-200 text-purple-700 hover:bg-purple-50"
                  variant="outline"
                  onClick={() => handleSimulateStatus("enviado", "paid")}
                  disabled={simulating}
                >
                  <Truck className="h-4 w-4 text-purple-600" />
                  2. Simular Pedido Enviado
                </Button>

                <Button 
                  className="w-full justify-start gap-2 border-rose-200 text-rose-700 hover:bg-rose-50"
                  variant="outline"
                  onClick={() => handleSimulateStatus("cancelado", "paid")}
                  disabled={simulating}
                >
                  <RotateCcw className="h-4 w-4 text-rose-600" />
                  3. Simular Cancelamento / Estorno
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Details & Results */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              Detalhamento de Transações do Pedido
            </CardTitle>
            <CardDescription>Veja em tempo real o fluxo financeiro do pedido selecionado.</CardDescription>
          </CardHeader>
          <CardContent>
            {!orderDetails ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm">
                <Sliders className="h-10 w-10 mb-3 opacity-30 animate-pulse" />
                <p>Selecione um pedido na coluna esquerda para ver o fluxo</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Valor Pago</p>
                    <p className="text-sm font-semibold">{formatBRL(Number(orderDetails.order.total_amount))}</p>
                  </div>
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-center">
                    <p className="text-xs text-indigo-600">Fração Fornecedor</p>
                    <p className="text-sm font-semibold text-indigo-700">{formatBRL(alloc.cost)}</p>
                  </div>
                  <div className="p-3 bg-cyan-50 border border-cyan-100 rounded-lg text-center">
                    <p className="text-xs text-cyan-600">Comissão Revendedor</p>
                    <p className="text-sm font-semibold text-cyan-700">{formatBRL(orderDetails.order.reseller_id ? alloc.commission : 0)}</p>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-center">
                    <p className="text-xs text-emerald-600">Taxa Plataforma</p>
                    <p className="text-sm font-semibold text-emerald-700">{formatBRL(alloc.platform)}</p>
                  </div>
                </div>

                {/* Items & Players */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Atores e Itens do Pedido</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Comprador (Cliente):</strong> {orderDetails.buyer}</p>
                    {orderDetails.reseller && <p><strong>Revendedor associado:</strong> {orderDetails.reseller}</p>}
                    <div className="border rounded mt-1.5 p-2 space-y-1.5 bg-muted/30">
                      {orderDetails.items.map((item: any) => (
                        <div key={item.id} className="flex justify-between text-xs">
                          <span>{item.product?.name ?? "Produto"} (x{item.quantity})</span>
                          <span className="text-muted-foreground">Forn: {item.supplier} | Custo: {formatBRL(Number(item.product?.cost_price ?? 0))}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Simulated Ledger */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center justify-between">
                    <span>Razão / Transações de Carteira Efetuadas</span>
                    <Badge variant={orderDetails.order.status === "cancelado" ? "destructive" : "default"} className="capitalize">
                      Status: {orderDetails.order.status}
                    </Badge>
                  </h4>
                  {orderDetails.transactions.length === 0 ? (
                    <p className="text-xs text-muted-foreground bg-muted p-4 rounded text-center border">Nenhuma movimentação de carteira registrada para este pedido. Execute os botões de simulação ao lado.</p>
                  ) : (
                    <div className="rounded border overflow-hidden">
                      <Table className="text-xs">
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead>Conta</TableHead>
                            <TableHead>Operação</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Data</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orderDetails.transactions.map((tx: any) => {
                            const isCredit = ["recarga", "estorno", "bonus", "ajuste_credito", "cashback", "pagamento_pedido"].includes(tx.tipo);
                            return (
                              <TableRow key={tx.id}>
                                <TableCell className="font-mono text-[10px]">{tx.wallet_id.slice(0, 8)}...</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-[10px] px-1 py-0">{TIPO_LABELS[tx.tipo] ?? tx.tipo}</Badge>
                                </TableCell>
                                <TableCell>{tx.descricao}</TableCell>
                                <TableCell className={isCredit ? "text-green-600 font-semibold" : "text-destructive font-semibold"}>
                                  {isCredit ? "+" : "-"}{formatBRL(Math.abs(tx.valor))}
                                </TableCell>
                                <TableCell className="text-muted-foreground text-[10px]">
                                  {format(new Date(tx.created_at), "dd/MM HH:mm", { locale: ptBR })}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function AdminFinanceiro() {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Painel Financeiro</h1>
          <p className="text-muted-foreground">Controle saques, perfis de carteiras, repasses e simulações</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchStats()}>
          <RefreshCw className="h-4 w-4 mr-2 animate-spin-hover" />
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

      <Tabs defaultValue="wallets" className="space-y-6">
        <TabsList>
          <TabsTrigger value="wallets">Carteiras por Perfil</TabsTrigger>
          <TabsTrigger value="simulator" className="flex items-center gap-1.5">
            <Activity className="h-4 w-4" />
            Fluxo & Simulador
          </TabsTrigger>
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

        <TabsContent value="wallets">
          <WalletsTab />
        </TabsContent>

        <TabsContent value="simulator">
          <FlowSimulatorTab />
        </TabsContent>

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
