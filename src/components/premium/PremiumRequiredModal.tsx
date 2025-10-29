import { Crown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface PremiumRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  paymentUrl?: string;
}

export const PremiumRequiredModal = ({
  isOpen,
  onClose,
  title = 'Torne-se Premium',
  message = 'Esta funcionalidade está disponível apenas no plano Premium. Faça upgrade agora e desbloqueie todos os recursos!',
  paymentUrl = 'https://kwfy.app/c/Qeuh5bFm',
}: PremiumRequiredModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
            <Crown className="w-8 h-8 text-white" />
          </div>
          
          <DialogTitle className="text-2xl font-bold">
            {title}
          </DialogTitle>
          
          <p className="text-muted-foreground">
            {message}
          </p>
          
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <h4 className="font-semibold mb-2">Benefícios Premium:</h4>
            <ul className="text-sm text-left space-y-1">
              <li>✅ Loja pública visível para todos</li>
              <li>✅ Importação ilimitada de produtos</li>
              <li>✅ Processamento de pedidos</li>
              <li>✅ Domínio personalizado</li>
              <li>✅ Suporte prioritário</li>
            </ul>
          </div>
          
          <Button 
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
            onClick={() => window.open(paymentUrl, '_blank')}
          >
            <Crown className="mr-2 h-5 w-5" />
            Assinar Plano Premium
          </Button>
          
          <Button variant="ghost" onClick={onClose} className="w-full">
            Continuar no Plano Free
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
