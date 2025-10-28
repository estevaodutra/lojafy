import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { FinancialSummary } from "@/components/reseller/FinancialSummary";
import { WithdrawalRequestModal } from "@/components/reseller/WithdrawalRequestModal";
import { WithdrawalRequestsTable } from "@/components/reseller/WithdrawalRequestsTable";
import { TransactionsList } from "@/components/reseller/TransactionsList";

export default function ResellerFinanceiro() {
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Financeiro</h1>
          <p className="text-muted-foreground">
            Gerencie seus ganhos, saques e transações financeiras
          </p>
        </div>
        <Button onClick={() => setShowWithdrawalModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Solicitar Saque
        </Button>
      </div>

      <FinancialSummary />

      <Tabs defaultValue="withdrawals" className="space-y-6">
        <TabsList>
          <TabsTrigger value="withdrawals">Solicitações de Saque</TabsTrigger>
          <TabsTrigger value="transactions">Histórico de Transações</TabsTrigger>
        </TabsList>

        <TabsContent value="withdrawals">
          <Card>
            <CardHeader>
              <CardTitle>Minhas Solicitações de Saque</CardTitle>
              <CardDescription>
                Acompanhe o status das suas solicitações de saque
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WithdrawalRequestsTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Transações</CardTitle>
              <CardDescription>
                Visualize todas as suas transações financeiras
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TransactionsList />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <WithdrawalRequestModal
        open={showWithdrawalModal}
        onOpenChange={setShowWithdrawalModal}
      />
    </div>
  );
}