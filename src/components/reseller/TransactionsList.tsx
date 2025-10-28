import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useFinancialTransactions } from "@/hooks/useFinancialTransactions";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    commission: "Comissão",
    withdrawal: "Saque",
    refund: "Estorno",
    bonus: "Bônus",
  };
  return labels[type] || type;
};

const getStatusBadge = (status: string) => {
  const variants: Record<string, { variant: any; label: string }> = {
    pending: { variant: "secondary", label: "Pendente" },
    processing: { variant: "default", label: "Processando" },
    completed: { variant: "default", label: "Concluído" },
    rejected: { variant: "destructive", label: "Rejeitado" },
  };

  const config = variants[status] || { variant: "secondary", label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

export const TransactionsList = () => {
  const { data: transactions, isLoading } = useFinancialTransactions();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma transação encontrada
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => {
            const isNegative = transaction.transaction_type === "withdrawal";
            const amount = isNegative ? -transaction.amount : transaction.net_amount;

            return (
              <TableRow key={transaction.id}>
                <TableCell>
                  {format(new Date(transaction.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </TableCell>
                <TableCell>{getTypeLabel(transaction.transaction_type)}</TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {transaction.description || "-"}
                </TableCell>
                <TableCell className={`font-medium ${isNegative ? "text-red-600" : "text-green-600"}`}>
                  {isNegative ? "- " : "+ "}
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(Math.abs(amount))}
                </TableCell>
                <TableCell>{getStatusBadge(transaction.status)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
