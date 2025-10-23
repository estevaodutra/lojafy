import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Calculator, Loader2 } from 'lucide-react';

interface RecalculatePricesButtonProps {
  onRecalculate: () => void;
  isRecalculating: boolean;
  productCount?: number;
  platformFeeValue: number;
  platformFeeType: 'percentage' | 'fixed';
  gatewayFeePercentage: number;
  additionalCostsCount: number;
}

export const RecalculatePricesButton: React.FC<RecalculatePricesButtonProps> = ({
  onRecalculate,
  isRecalculating,
  productCount = 0,
  platformFeeValue,
  platformFeeType,
  gatewayFeePercentage,
  additionalCostsCount,
}) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleConfirm = () => {
    setShowConfirmDialog(false);
    onRecalculate();
  };

  return (
    <>
      <Button
        onClick={() => setShowConfirmDialog(true)}
        disabled={isRecalculating}
        variant="default"
        size="lg"
        className="w-full md:w-auto"
      >
        {isRecalculating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Recalculando...
          </>
        ) : (
          <>
            <Calculator className="mr-2 h-4 w-4" />
            Recalcular Preços de Todos os Produtos
          </>
        )}
      </Button>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Confirmar Recálculo de Preços</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-semibold">
                Esta ação irá recalcular o preço de <span className="text-primary">{productCount} produtos ativos</span> com base nas configurações atuais:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Margem de lucro: {platformFeeValue}{platformFeeType === 'percentage' ? '%' : ' (fixo)'}</li>
                <li>Taxa de gateway: {gatewayFeePercentage}%</li>
                <li>Custos adicionais ativos: {additionalCostsCount}</li>
              </ul>
              <p className="text-destructive font-medium mt-4">
                ⚠️ Os preços atuais serão SUBSTITUÍDOS pelos novos valores calculados automaticamente.
              </p>
              <p className="text-muted-foreground text-xs mt-2">
                Nota: Apenas produtos com "custo base" definido serão afetados.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} className="bg-primary">
              Sim, Recalcular Agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
