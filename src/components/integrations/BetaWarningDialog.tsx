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
import { AlertTriangle, FlaskConical, Bug, RefreshCw, Link as LinkIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BetaWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  marketplaceName: string;
  authUrl?: string;
}

export function BetaWarningDialog({
  open,
  onOpenChange,
  onConfirm,
  marketplaceName,
  authUrl,
}: BetaWarningDialogProps) {
  const [accepted, setAccepted] = useState(false);
  const { toast } = useToast();

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
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-amber-900 dark:text-amber-100">Atenção: Versão Beta</p>
                <p className="text-sm text-amber-800 dark:text-amber-200 mt-1 break-words">
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
                <span className="flex-1 min-w-0 break-words">Erros temporários na sincronização de produtos</span>
              </li>
              <li className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="flex-1 min-w-0 break-words">Necessidade de reconectar a integração ocasionalmente</span>
              </li>
              <li className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="flex-1 min-w-0 break-words">Atrasos na atualização de pedidos ou estoque</span>
              </li>
            </ul>
          </div>

          {/* Reassurance */}
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 dark:bg-emerald-950/30 dark:border-emerald-700">
            <p className="text-sm text-emerald-800 dark:text-emerald-200 break-words">
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
            className="mt-0.5 shrink-0"
          />
          <label htmlFor="beta-accept" className="text-sm leading-tight cursor-pointer flex-1 min-w-0 break-words">
            Estou ciente de que esta é uma versão Beta e aceito que podem ocorrer instabilidades durante o uso.
          </label>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row flex-wrap sm:justify-between gap-3 mt-4 w-full">
          {authUrl ? (
            <Button 
              variant="outline" 
              className="w-full sm:w-auto text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 order-2 sm:order-1"
              onClick={() => {
                navigator.clipboard.writeText(authUrl);
                toast({
                  title: "Link copiado!",
                  description: "Envie este link para a pessoa que irá autorizar a integração.",
                });
              }}
            >
              <LinkIcon className="mr-2 h-4 w-4 shrink-0" />
              Copiar Link
            </Button>
          ) : <div className="hidden sm:block" />}
          
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto order-1 sm:order-2 flex-1 sm:flex-none justify-end">
            <Button variant="outline" className="w-full sm:w-auto" onClick={handleClose}>Cancelar</Button>
            <Button className="w-full sm:w-auto" onClick={handleConfirm} disabled={!accepted}>
              <FlaskConical className="mr-2 h-4 w-4 shrink-0" />
              Continuar com Beta
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
