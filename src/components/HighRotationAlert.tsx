import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface HighRotationAlertProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const HighRotationAlert: React.FC<HighRotationAlertProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-orange-600">
            ⚠️ Atenção: Produto de Alta Rotatividade
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 text-left">
            <p className="text-sm">
              Este produto está marcado como de <strong>Alta Rotatividade</strong>.
              Devido à alta demanda, não há garantia imediata de envio.
            </p>
            
            <p className="text-sm">
              Ao prosseguir com a compra, você declara estar ciente de que:
            </p>
            
            <ul className="list-disc list-inside space-y-1 text-sm ml-4">
              <li>Podem ocorrer atrasos no processamento do pedido</li>
              <li>Existe a possibilidade de cancelamento por indisponibilidade de estoque</li>
              <li>Em caso de cancelamento, o valor será reembolsado integralmente em até 7 dias úteis</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-2">
          <AlertDialogCancel 
            onClick={onClose}
            className="flex-1"
          >
            ❌ Cancelar
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            ✔️ Entendi e desejo continuar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};