import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useWithdrawalRequests } from "@/hooks/useWithdrawalRequests";
import { useFinancialBalance } from "@/hooks/useFinancialBalance";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { toast } from "sonner";

interface WithdrawalRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WithdrawalRequestModal = ({ open, onOpenChange }: WithdrawalRequestModalProps) => {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"pix" | "transfer">("pix");
  const [pixKey, setPixKey] = useState("");
  const [bankName, setBankName] = useState("");
  const [agency, setAgency] = useState("");
  const [account, setAccount] = useState("");
  const [accountType, setAccountType] = useState<"checking" | "savings">("checking");

  const { createWithdrawal } = useWithdrawalRequests();
  const { data: balance } = useFinancialBalance();
  const { settings } = usePlatformSettings();

  const calculateFee = () => {
    const amountNum = parseFloat(amount) || 0;
    if (settings?.reseller_withdrawal_fee_type === "percentage") {
      return (amountNum * (settings.reseller_withdrawal_fee_value / 100));
    }
    return settings?.reseller_withdrawal_fee_value || 0;
  };

  const fee = calculateFee();
  const netAmount = (parseFloat(amount) || 0) - fee;

  const handleSubmit = () => {
    const amountNum = parseFloat(amount);

    if (!amountNum || amountNum < 50) {
      toast.error("O valor mínimo de saque é R$ 50,00");
      return;
    }

    if (amountNum > (balance?.available || 0)) {
      toast.error("Saldo insuficiente para este saque");
      return;
    }

    if (method === "pix" && !pixKey) {
      toast.error("Informe a chave PIX");
      return;
    }

    if (method === "transfer" && (!bankName || !agency || !account)) {
      toast.error("Preencha todos os dados bancários");
      return;
    }

    const bank_details = method === "pix"
      ? { method: "pix" as const, pix_key: pixKey }
      : { method: "transfer" as const, bank_name: bankName, agency, account, account_type: accountType };

    createWithdrawal.mutate(
      { amount: amountNum, bank_details },
      {
        onSuccess: () => {
          onOpenChange(false);
          setAmount("");
          setPixKey("");
          setBankName("");
          setAgency("");
          setAccount("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Solicitar Saque</DialogTitle>
          <DialogDescription>
            Saldo disponível: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(balance?.available || 0)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Valor do Saque</Label>
            <Input
              id="amount"
              type="number"
              min="50"
              step="0.01"
              placeholder="R$ 0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">Valor mínimo: R$ 50,00</p>
          </div>

          {amount && parseFloat(amount) >= 50 && (
            <div className="p-4 bg-muted rounded-lg space-y-1">
              <div className="flex justify-between text-sm">
                <span>Valor solicitado:</span>
                <span className="font-medium">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseFloat(amount))}
                </span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Taxa de saque:</span>
                <span>- {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(fee)}</span>
              </div>
              <div className="flex justify-between font-medium pt-2 border-t">
                <span>Valor líquido:</span>
                <span className="text-green-600">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(netAmount)}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Método de Recebimento</Label>
            <RadioGroup value={method} onValueChange={(v) => setMethod(v as "pix" | "transfer")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pix" id="pix" />
                <Label htmlFor="pix" className="font-normal cursor-pointer">PIX</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="transfer" id="transfer" />
                <Label htmlFor="transfer" className="font-normal cursor-pointer">Transferência Bancária</Label>
              </div>
            </RadioGroup>
          </div>

          {method === "pix" ? (
            <div className="space-y-2">
              <Label htmlFor="pixKey">Chave PIX</Label>
              <Input
                id="pixKey"
                placeholder="CPF, E-mail, Telefone ou Chave Aleatória"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">Banco</Label>
                <Input
                  id="bankName"
                  placeholder="Nome do banco"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="agency">Agência</Label>
                  <Input
                    id="agency"
                    placeholder="0000"
                    value={agency}
                    onChange={(e) => setAgency(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account">Conta</Label>
                  <Input
                    id="account"
                    placeholder="00000-0"
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Conta</Label>
                <RadioGroup value={accountType} onValueChange={(v) => setAccountType(v as "checking" | "savings")}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="checking" id="checking" />
                    <Label htmlFor="checking" className="font-normal cursor-pointer">Conta Corrente</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="savings" id="savings" />
                    <Label htmlFor="savings" className="font-normal cursor-pointer">Conta Poupança</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={createWithdrawal.isPending}>
            {createWithdrawal.isPending ? "Solicitando..." : "Solicitar Saque"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
