import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Calendar, Clock, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface CleanupLog {
  id: string;
  email: string;
  action: string;
  reason: string;
  days_inactive: number;
  performed_at: string;
}

export const CleanupHistoryTab = () => {
  const [isExecuting, setIsExecuting] = useState(false);
  const queryClient = useQueryClient();

  // Fetch cleanup logs
  const { data: cleanupLogs, isLoading } = useQuery({
    queryKey: ["cleanup-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_cleanup_logs")
        .select("*")
        .order("performed_at", { ascending: false });
      
      if (error) throw error;
      return data as CleanupLog[];
    },
  });

  // Execute cleanup mutation
  const executeCleanup = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "cleanup-inactive-users"
      );
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Limpeza concluída", {
        description: `${data.result.disabled_count} usuários desativados, ${data.result.deleted_count} excluídos`,
      });
      queryClient.invalidateQueries({ queryKey: ["inactive-users"] });
      queryClient.invalidateQueries({ queryKey: ["cleanup-logs"] });
      queryClient.invalidateQueries({ queryKey: ["users-management"] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao executar limpeza", {
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
    <div className="space-y-6">
      {/* Header with Execute Button */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Histórico de Limpezas
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Registro completo de todas as limpezas de usuários inativos
            </p>
          </div>
          <Button
            onClick={handleExecuteCleanup}
            disabled={isExecuting}
            variant="destructive"
            size="sm"
          >
            {isExecuting ? "Executando..." : "Executar Limpeza Agora"}
          </Button>
        </div>

        <Separator className="my-4" />

        {/* Rules Info */}
        <Card className="p-4 bg-muted/50">
          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Regras de Limpeza Automática
          </h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-yellow-600 font-bold">30 dias:</span>
              <span>Usuários que nunca acessaram são desativados automaticamente</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600 font-bold">60 dias:</span>
              <span>Usuários desativados são excluídos permanentemente</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">Proteção:</span>
              <span>Super admins e admins nunca são afetados pela limpeza</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">Automático:</span>
              <span>O sistema executa a limpeza automaticamente todos os dias às 3h da manhã</span>
            </li>
          </ul>
        </Card>
      </Card>

      {/* Cleanup Logs */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Logs de Limpeza
        </h3>
        
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando histórico...
          </div>
        ) : cleanupLogs && cleanupLogs.length > 0 ? (
          <div className="space-y-2">
            {cleanupLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      log.action === "deleted"
                        ? "destructive"
                        : log.action === "disabled"
                        ? "secondary"
                        : "default"
                    }
                  >
                    {log.action === "deleted" ? "Excluído" : "Desativado"}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium">{log.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.days_inactive} dias inativo • {log.reason}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(log.performed_at).toLocaleString("pt-BR")}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma limpeza realizada ainda
          </div>
        )}
      </Card>
    </div>
  );
};