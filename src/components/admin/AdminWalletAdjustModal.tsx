import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AdminWalletAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  currentBalance: number;
  onSuccess: () => void;
}

export const AdminWalletAdjustModal = ({
  isOpen,
  onClose,
  userId,
  userName,
  currentBalance,
  onSuccess,
}: AdminWalletAdjustModalProps) => {
  const [tipo, setTipo] = useState<"credito" | "debito">("credito");
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [cobrarTaxa, setCobrarTaxa] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const valorNum = parseFloat(valor) || 0;
  const novoSaldo = tipo === "credito" ? currentBalance + valorNum : currentBalance - valorNum;
  const isDebitoExcede = tipo === "debito" && valorNum > currentBalance;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const handleSubmit = async () => {
    if (!valor || valorNum <= 0 || !motivo.trim()) return;
    if (isDebitoExcede) return;

    setSaving(true);
    try {
      if (tipo === "credito") {
        const taxa = cobrarTaxa ? valorNum * 0.055 : 0;
        const { data, error } = await supabase.rpc("creditar_carteira" as any, {
          p_user_id: userId,
          p_valor: valorNum,
          p_taxa: taxa,
          p_valor_pago: valorNum + taxa,
          p_descricao: motivo.trim(),
          p_referencia_tipo: "ajuste_credito",
          p_referencia_id: null,
          p_payment_id: null,
        });
        if (error) throw error;
        const result = typeof data === "string" ? JSON.parse(data) : data;
        if (!result?.success) throw new Error(result?.error || "Erro ao creditar");
      } else {
        const { data, error } = await supabase.rpc("debitar_carteira" as any, {
          p_user_id: userId,
          p_valor: valorNum,
          p_descricao: motivo.trim(),
          p_referencia_tipo: "ajuste_debito",
          p_referencia_id: null,
        });
        if (error) throw error;
        const result = typeof data === "string" ? JSON.parse(data) : data;
        if (!result?.success) throw new Error(result?.error || "Erro ao debitar");
      }

      toast({ title: "Sucesso!", description: `Saldo ${tipo === "credito" ? "creditado" : "debitado"} com sucesso` });
      onSuccess();
      resetAndClose();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const resetAndClose = () => {
    setValor("");
    setMotivo("");
    setCobrarTaxa(false);
    setTipo("credito");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar Saldo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm">
            <span className="text-muted-foreground">Usuário:</span>{" "}
            <span className="font-medium">{userName}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Saldo Atual:</span>{" "}
            <span className="font-medium">{formatCurrency(currentBalance)}</span>
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <Label>Tipo de Operação *</Label>
            <RadioGroup value={tipo} onValueChange={(v) => setTipo(v as "credito" | "debito")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="credito" id="credito" />
                <Label htmlFor="credito" className="font-normal">Crédito (adicionar saldo)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="debito" id="debito" />
                <Label htmlFor="debito" className="font-normal">Débito (remover saldo)</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Valor */}
          <div className="space-y-2">
            <Label>Valor *</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
            {isDebitoExcede && (
              <p className="text-xs text-destructive">Saldo insuficiente para este débito</p>
            )}
          </div>

          {/* Motivo */}
          <div className="space-y-2">
            <Label>Motivo *</Label>
            <Input
              placeholder="Ex: Bônus de boas-vindas"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>

          {/* Taxa */}
          {tipo === "credito" && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="taxa"
                checked={cobrarTaxa}
                onCheckedChange={(v) => setCobrarTaxa(!!v)}
              />
              <Label htmlFor="taxa" className="font-normal text-sm">
                Cobrar taxa de 5,5%
              </Label>
            </div>
          )}

          {/* Preview */}
          {valorNum > 0 && !isDebitoExcede && (
            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Novo Saldo</p>
              <p className="text-lg font-bold">{formatCurrency(novoSaldo)}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || valorNum <= 0 || !motivo.trim() || isDebitoExcede}
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
