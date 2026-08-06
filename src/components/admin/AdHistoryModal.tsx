import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { History, User, Clock, ShieldCheck } from 'lucide-react';

interface AdHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adId: string | null;
}

export const AdHistoryModal: React.FC<AdHistoryModalProps> = ({
  open,
  onOpenChange,
  adId,
}) => {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['ad-history', adId],
    queryFn: async () => {
      if (!adId) return [];
      const { data, error } = await supabase
        .from('ad_entity_history')
        .select(`
          *,
          user_profile:profiles!ad_entity_history_user_id_fkey(first_name, last_name, role)
        `)
        .eq('entity_id', adId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!adId && open,
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Histórico de Alterações e Auditoria do Anúncio
          </DialogTitle>
          <DialogDescription>
            Registro de todas as ações, edições e transformações realizadas neste anúncio.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="text-xs text-muted-foreground mt-2">Buscando histórico...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Nenhum histórico registrado para este anúncio até o momento.
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item: any) => (
                <div key={item.id} className="p-3 border rounded-lg bg-muted/20 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="font-semibold">
                      {item.action}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDate(item.created_at)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-foreground font-medium pt-1">
                    <User className="h-3.5 w-3.5 text-primary" />
                    <span>
                      {item.user_profile?.first_name || 'Usuário'} ({item.user_role || item.user_profile?.role || 'Sistema'})
                    </span>
                  </div>

                  {item.reason && (
                    <p className="text-muted-foreground italic">Motivo: {item.reason}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
