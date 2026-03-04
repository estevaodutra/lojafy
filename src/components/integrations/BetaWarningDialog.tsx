import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, FlaskConical, Bug, RefreshCw } from "lucide-react";

interface BetaWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  marketplaceName: string;
}

export function BetaWarningDialog({
  open,
  onOpenChange,
  onConfirm,
  marketplaceName,
}: BetaWarningDialogProps) {
  const [accepted, setAccepted] = useState(false);

  const handleConfirm = () => {
    if (accepted) {
      onConfirm();
      onOpenChange(false);
      setAccepted(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setAccepted(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100">
              <FlaskConical className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <DialogTitle className="flex items-center gap-2">
                Integração {marketplaceName}
                <Badge className="bg-amber-500 hover:bg-amber-600 text-xs">Beta</Badge>
              </DialogTitle>
              <DialogDescription>Funcionalidade em fase de testes</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Warning alert */}
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:bg-amber-950/30 dark:border-amber-700">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-100">Atenção: Versão Beta</p>
                <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                  Esta integração está em fase de desenvolvimento e testes. Algumas funcionalidades podem apresentar comportamentos inesperados.
                </p>
              </div>
            </div>
          </div>

          {/* Possible issues */}
          <div className="space-y-2">
            <p className="text-sm font-medium">O que pode acontecer:</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Bug className="h-4 w-4 text-amber-500 shrink-0" />
                Erros temporários na sincronização de produtos
              </li>
              <li className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-amber-500 shrink-0" />
                Necessidade de reconectar a integração ocasionalmente
              </li>
              <li className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                Atrasos na atualização de pedidos ou estoque
              </li>
            </ul>
          </div>

          {/* Reassurance */}
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 dark:bg-emerald-950/30 dark:border-emerald-700">
            <p className="text-sm text-emerald-800 dark:text-emerald-200">
              ✅ Nossa equipe monitora ativamente e corrige problemas rapidamente. Em caso de dúvidas, entre em contato pelo suporte.
            </p>
          </div>
        </div>

        {/* Checkbox */}
        <div className="flex items-start gap-2 mt-2">
          <Checkbox
            id="beta-accept"
            checked={accepted}
            onCheckedChange={(checked) => setAccepted(checked === true)}
          />
          <label htmlFor="beta-accept" className="text-sm leading-tight cursor-pointer">
            Estou ciente de que esta é uma versão Beta e aceito que podem ocorrer instabilidades durante o uso.
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!accepted}>
            <FlaskConical className="mr-2 h-4 w-4" />
            Continuar com Beta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
