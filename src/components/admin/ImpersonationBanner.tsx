import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { useImpersonation } from '@/hooks/useImpersonation';

export const ImpersonationBanner: React.FC = () => {
  const { isImpersonating, impersonationData, stopImpersonation } = useImpersonation();

  if (!isImpersonating || !impersonationData) {
    return null;
  }

  return (
    <div className="bg-yellow-500 text-yellow-900 px-4 py-3 shadow-sm border-b border-yellow-600">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" />
          <div className="text-sm font-medium">
            <span>Modo Impersonação Ativo: </span>
            <span className="font-bold">
              {impersonationData.targetUserName || 'Usuário'}
            </span>
            {impersonationData.targetRole && (
              <span className="ml-2 text-xs bg-yellow-600 text-yellow-100 px-2 py-1 rounded">
                {impersonationData.targetRole}
              </span>
            )}
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={stopImpersonation}
          className="bg-yellow-600 border-yellow-700 text-yellow-100 hover:bg-yellow-700 hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Super Admin
        </Button>
      </div>
    </div>
  );
};