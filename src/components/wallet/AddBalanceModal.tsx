import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useWalletSettings } from "@/hooks/useWallet";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { ModernPixPayment } from "@/components/ModernPixPayment";
import { Loader2 } from "lucide-react";

interface AddBalanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddBalanceModal = ({ open, onOpenChange }: AddBalanceModalProps) => {
  const { data: settings, isLoading: settingsLoading } = useWalletSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedValue, setSelectedValue] = useState<number | null>(null);
  const [customValue, setCustomValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [pixData, setPixData] = useState<{
    qr_code: string;
    qr_code_base64: string;
    payment_id: string;
    amount: number;
  } | null>(null);

  const taxaPercentual = settings?.carteira_taxa_percentual ?? 5.5;
  const minimo = settings?.carteira_valor_minimo ?? 100;
  const maximo = settings?.carteira_valor_maximo ?? 5000;
  const sugeridos = settings?.carteira_valores_sugeridos ?? [100, 200, 300, 500];

  const valor = selectedValue ?? (customValue ? parseFloat(customValue) : 0);
  const taxa = valor * (taxaPercentual / 100);
  const totalPagar = valor + taxa;

  const isValidValue = valor >= minimo && valor <= maximo;

  const formatPrice = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleSelectValue = (v: number) => {
    setSelectedValue(v);
    setCustomValue("");
  };

  const handleCustomChange = (v: string) => {
    setCustomValue(v);
    setSelectedValue(null);
  };

  const handleGeneratePix = async () => {
    if (!isValidValue) return;
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("wallet-recharge", {
        body: { valor },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao gerar recarga");

      setPixData({
        qr_code: data.qr_code,
        qr_code_base64: data.qr_code_base64,
        payment_id: data.payment_id,
        amount: totalPagar,
      });

      toast({ title: "PIX gerado!", description: "Escaneie o QR Code para adicionar saldo." });
    } catch (err: any) {
      console.error("Error generating wallet recharge:", err);
      toast({
        title: "Erro ao gerar PIX",
        description: err.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePaymentConfirmed = () => {
    queryClient.invalidateQueries({ queryKey: ["wallet"] });
    queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
    toast({ title: "Saldo adicionado!", description: `${formatPrice(valor)} foi creditado na sua carteira.` });
    setPixData(null);
    setSelectedValue(null);
    setCustomValue("");
    onOpenChange(false);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setPixData(null);
      setSelectedValue(null);
      setCustomValue("");
    }
    onOpenChange(isOpen);
  };

  if (settingsLoading) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{pixData ? "Pague via PIX" : "Adicionar Saldo"}</DialogTitle>
        </DialogHeader>

        {pixData ? (
          <div className="overflow-y-auto max-h-[70vh] pr-1 -mr-1">
            <ModernPixPayment
              qrCode={pixData.qr_code}
              qrCodeBase64={pixData.qr_code_base64}
              amount={pixData.amount}
              paymentId={pixData.payment_id}
              onPaymentConfirmed={handlePaymentConfirmed}
            />
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <Label className="text-sm font-medium">Quanto você quer adicionar?</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {sugeridos.map((v) => (
                  <Button
                    key={v}
                    variant={selectedValue === v ? "default" : "outline"}
                    onClick={() => handleSelectValue(v)}
                    className="text-sm"
                  >
                    {formatPrice(v)}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="custom-value">Ou digite um valor:</Label>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-medium">R$</span>
                <Input
                  id="custom-value"
                  type="number"
                  min={minimo}
                  max={maximo}
                  step="0.01"
                  value={customValue}
                  onChange={(e) => handleCustomChange(e.target.value)}
                  placeholder={`Mínimo ${formatPrice(minimo)}`}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Mín: {formatPrice(minimo)} · Máx: {formatPrice(maximo)}
              </p>
            </div>

            {valor > 0 && (
              <>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Saldo a adicionar:</span>
                    <span className="font-medium">{formatPrice(valor)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Taxa de serviço ({taxaPercentual}%):</span>
                    <span>{formatPrice(taxa)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-base">
                    <span>Total a pagar:</span>
                    <span>{formatPrice(totalPagar)}</span>
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
              <Button
                className="flex-1 gap-2"
                disabled={!isValidValue || isGenerating}
                onClick={handleGeneratePix}
              >
                {isGenerating && <Loader2 className="w-4 h-4 animate-spin" />}
                Gerar PIX
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
