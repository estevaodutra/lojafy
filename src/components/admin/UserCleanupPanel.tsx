import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  AlertCircle, 
  Trash2, 
  UserX, 
  Activity,
  Clock,
  Calendar
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface InactiveUser {
  user_id: string;
  email: string;
  created_at: string;
  days_since_creation: number;
  action_needed: string;
  is_banned: boolean;
}

interface CleanupLog {
  id: string;
  email: string;
  action: string;
  reason: string;
  days_inactive: number;
  performed_at: string;
}

export const UserCleanupPanel = () => {
  const [isExecuting, setIsExecuting] = useState(false);
  const queryClient = useQueryClient();

  // Fetch inactive users
  const { data: inactiveUsers, isLoading: loadingUsers } = useQuery({
    queryKey: ["inactive-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_inactive_users_for_cleanup");
      
      if (error) throw error;
      return data as InactiveUser[];
    },
  });

  // Fetch cleanup logs
  const { data: cleanupLogs } = useQuery({
    queryKey: ["cleanup-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_cleanup_logs")
        .select("*")
        .order("performed_at", { ascending: false })
        .limit(10);
      
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
      queryClient.invalidateQueries({ queryKey: ["users-with-email"] });
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

  const toDisable = inactiveUsers?.filter(u => u.action_needed === 'disable' && !u.is_banned) || [];
  const toDelete = inactiveUsers?.filter(u => u.action_needed === 'delete') || [];
  const alreadyBanned = inactiveUsers?.filter(u => u.is_banned) || [];

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Limpeza Automática de Usuários Inativos
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencia usuários que nunca acessaram a plataforma
            </p>
          </div>
          <Button
            onClick={handleExecuteCleanup}
            disabled={isExecuting || loadingUsers}
            variant="destructive"
            size="sm"
          >
            {isExecuting ? "Executando..." : "Executar Limpeza Agora"}
          </Button>
        </div>

        <Separator className="my-4" />

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                  Serão Desativados
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  30+ dias sem acesso
                </p>
              </div>
              <div className="flex items-center gap-2">
                <UserX className="h-5 w-5 text-yellow-600" />
                <span className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                  {toDisable.length}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-red-200 bg-red-50 dark:bg-red-950/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-900 dark:text-red-100">
                  Serão Excluídos
                </p>
                <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                  60+ dias sem acesso
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-600" />
                <span className="text-2xl font-bold text-red-900 dark:text-red-100">
                  {toDelete.length}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-gray-200 bg-gray-50 dark:bg-gray-950/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Já Desativados
                </p>
                <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                  Aguardando exclusão
                </p>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-gray-600" />
                <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {alreadyBanned.length}
                </span>
              </div>
            </div>
          </Card>
        </div>

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
          </ul>
        </Card>
      </Card>

      {/* Recent Cleanup Logs */}
      {cleanupLogs && cleanupLogs.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Histórico de Limpezas Recentes
          </h3>
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
                      {log.days_inactive} dias inativo
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(log.performed_at).toLocaleString("pt-BR")}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
