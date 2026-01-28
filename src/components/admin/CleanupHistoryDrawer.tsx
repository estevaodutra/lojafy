import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar, Clock, Activity, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface CleanupLog {
  id: string;
  email: string;
  action: string;
  reason: string;
  days_inactive: number;
  performed_at: string;
}

interface CleanupHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CleanupHistoryDrawer = ({ isOpen, onClose }: CleanupHistoryDrawerProps) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const queryClient = useQueryClient();

  // Fetch cleanup logs
  const { data: cleanupLogs, isLoading } = useQuery({
    queryKey: ['cleanup-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_cleanup_logs')
        .select('*')
        .order('performed_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as CleanupLog[];
    },
    enabled: isOpen,
  });

  // Execute cleanup mutation
  const executeCleanup = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('cleanup-inactive-users');

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success('Limpeza concluída', {
        description: `${data.result.disabled_count} usuários desativados, ${data.result.deleted_count} excluídos`,
      });
      queryClient.invalidateQueries({ queryKey: ['inactive-users'] });
      queryClient.invalidateQueries({ queryKey: ['cleanup-logs'] });
      queryClient.invalidateQueries({ queryKey: ['users-management'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao executar limpeza', {
        description: error.message,
      });
    },
    onSettled: () => {
      setIsExecuting(false);
    },
  });

  const handleExecuteCleanup = () => {
    setIsExecuting(true);
    executeCleanup.mutate();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Limpeza Automática de Usuários
          </SheetTitle>
          <SheetDescription>
            Gerencie a limpeza automática de usuários inativos
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Rules Info */}
          <Card className="p-4 bg-muted/50">
            <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Regras de Limpeza
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="font-bold min-w-[55px] text-warning">30 dias:</span>
                <span>Usuários que nunca acessaram são desativados automaticamente</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold min-w-[55px] text-destructive">60 dias:</span>
                <span>Usuários desativados são excluídos permanentemente</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold min-w-[55px] text-primary">Proteção:</span>
                <span>Super admins e admins nunca são afetados</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold min-w-[55px] text-accent-foreground">Automático:</span>
                <span>Executa todos os dias às 3h da manhã</span>
              </li>
            </ul>
          </Card>

          {/* Execute Button */}
          <Button
            onClick={handleExecuteCleanup}
            disabled={isExecuting}
            variant="destructive"
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isExecuting ? 'Executando...' : 'Executar Limpeza Agora'}
          </Button>

          <Separator />

          {/* Cleanup Logs */}
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Logs de Limpeza
            </h3>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando histórico...
              </div>
            ) : cleanupLogs && cleanupLogs.length > 0 ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {cleanupLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge
                        variant={
                          log.action === 'deleted'
                            ? 'destructive'
                            : log.action === 'disabled'
                            ? 'secondary'
                            : 'default'
                        }
                        className="shrink-0"
                      >
                        {log.action === 'deleted' ? 'Excluído' : 'Desativado'}
                      </Badge>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{log.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {log.days_inactive} dias inativo
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground shrink-0 ml-2">
                      {new Date(log.performed_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma limpeza realizada ainda
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
