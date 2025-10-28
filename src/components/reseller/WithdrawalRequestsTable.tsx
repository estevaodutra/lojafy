import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWithdrawalRequests, WithdrawalRequest } from "@/hooks/useWithdrawalRequests";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, X } from "lucide-react";

const getStatusBadge = (status: WithdrawalRequest["status"]) => {
  const variants: Record<WithdrawalRequest["status"], { variant: any; label: string }> = {
    pending: { variant: "secondary", label: "Pendente" },
    processing: { variant: "default", label: "Processando" },
    approved: { variant: "default", label: "Aprovado" },
    completed: { variant: "default", label: "Concluído" },
    rejected: { variant: "destructive", label: "Rejeitado" },
  };

  const config = variants[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

export const WithdrawalRequestsTable = () => {
  const { withdrawals, isLoading, cancelWithdrawal } = useWithdrawalRequests();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (withdrawals.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma solicitação de saque encontrada
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Método</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {withdrawals.map((withdrawal) => (
            <TableRow key={withdrawal.id}>
              <TableCell>
                {format(new Date(withdrawal.requested_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </TableCell>
              <TableCell className="font-medium">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(withdrawal.amount)}
              </TableCell>
              <TableCell>
                {withdrawal.bank_details.method === "pix" ? "PIX" : "Transferência"}
              </TableCell>
              <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  {withdrawal.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cancelWithdrawal.mutate(withdrawal.id)}
                      disabled={cancelWithdrawal.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
