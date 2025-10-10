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
  onConfirm?: () => void;
  allowContinue?: boolean;
}

export const HighRotationAlert: React.FC<HighRotationAlertProps> = ({
  isOpen,
  onClose,
  onConfirm,
  allowContinue = false,
}) => {
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-orange-600">
            ⚠️ Produto de Alta Rotatividade Detectado
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 text-left">
            <p className="text-sm font-semibold text-destructive">
              Pagamento via PIX não disponível para este carrinho.
            </p>
            
            <p className="text-sm">
              Seu carrinho contém produtos de <strong>Alta Rotatividade</strong>.
              Por política da loja, não é possível gerar PIX para estes produtos.
            </p>
            
            <p className="text-sm">
              <strong>Motivo:</strong> Devido à alta demanda e rotatividade de estoque,
              precisamos garantir disponibilidade imediata antes de processar o pagamento.
            </p>
            
            {!allowContinue && (
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm text-muted-foreground">
                  💡 <strong>Sugestão:</strong> Entre em contato conosco para verificar
                  métodos de pagamento alternativos ou disponibilidade do produto.
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-2">
          <AlertDialogCancel 
            onClick={onClose}
            className="flex-1"
          >
            ❌ Voltar ao Carrinho
          </AlertDialogCancel>
          
          {allowContinue && onConfirm && (
            <AlertDialogAction 
              onClick={handleConfirm}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              ✔️ Entendi e desejo continuar
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};