import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { KeyRound, Truck, Loader2, Info } from "lucide-react";
import { OrderPipelineItem } from "@/types/orderPipeline";

interface ReturnCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderPipelineItem | null;
  targetStageName?: string;
  onConfirm: (code: string | null) => Promise<void>;
}

export const ReturnCodeModal: React.FC<ReturnCodeModalProps> = ({
  open,
  onOpenChange,
  order,
  targetStageName = "Entrega Hoje",
  onConfirm,
}) => {
  const [returnCode, setReturnCode] = useState("");
  const [hasNoCode, setHasNoCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicializar com código existente se o pedido já possuir
  useEffect(() => {
    if (open && order) {
      const existing =
        order.return_code ||
        order.raw?.devolucao_codigo ||
        order.raw?.codigo_recebimento ||
        "";
      if (existing) {
        setReturnCode(existing);
        setHasNoCode(false);
      } else {
        setReturnCode("");
        setHasNoCode(false);
      }
    }
  }, [open, order]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    try {
      setIsSubmitting(true);
      const finalCode = hasNoCode ? null : returnCode.trim() || null;
      await onConfirm(finalCode);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] p-6">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-2xs">
              <KeyRound className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                Informe o Código de Devolução
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Pedido #{order?.order_number} • Movendo para {targetStageName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Caixa de Contexto Informativa */}
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-950 dark:text-amber-200 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[12px] leading-relaxed">
              O fornecedor precisará deste código (palavra ou números) para autorizar e receber a encomenda entregue pela transportadora hoje.
            </div>
          </div>

          {/* Campo de Código */}
          <div className="space-y-1.5">
            <Label htmlFor="return-code-input" className="text-xs font-semibold text-foreground">
              Código / Palavra de Recebimento
            </Label>
            <Input
              id="return-code-input"
              value={returnCode}
              onChange={(e) => setReturnCode(e.target.value)}
              disabled={hasNoCode || isSubmitting}
              placeholder="Ex: 8392, AZUL-49 ou palavra-chave..."
              className="text-sm font-mono tracking-wider font-semibold uppercase h-10 border-border focus-visible:ring-amber-500"
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground">
              Pode ser um número ou uma palavra informada pelo marketplace ou transportadora.
            </p>
          </div>

          {/* Checkbox: Não tem código */}
          <div className="flex items-center space-x-2 pt-1 border-t border-border/50">
            <Checkbox
              id="no-code-checkbox"
              checked={hasNoCode}
              onCheckedChange={(checked) => {
                const val = Boolean(checked);
                setHasNoCode(val);
                if (val) setReturnCode("");
              }}
              disabled={isSubmitting}
            />
            <label
              htmlFor="no-code-checkbox"
              className="text-xs font-medium text-foreground cursor-pointer select-none"
            >
              Não tem código de devolução / Não é exigido pela transportadora
            </label>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || (!hasNoCode && !returnCode.trim())}
              className="text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Truck className="w-3.5 h-3.5 mr-1.5" />
                  Confirmar e Mudar Etapa
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
