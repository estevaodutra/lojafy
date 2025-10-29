import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { 
  AlertCircle, 
  Trash2, 
  UserX
} from "lucide-react";

interface InactiveUser {
  user_id: string;
  email: string;
  created_at: string;
  days_since_creation: number;
  action_needed: string;
  is_banned: boolean;
}


export const UserCleanupPanel = () => {
  // Fetch inactive users
  const { data: inactiveUsers } = useQuery({
    queryKey: ["inactive-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_inactive_users_for_cleanup");
      
      if (error) throw error;
      return data as InactiveUser[];
    },
  });

  const toDisable = inactiveUsers?.filter(u => u.action_needed === 'disable' && !u.is_banned) || [];
  const toDelete = inactiveUsers?.filter(u => u.action_needed === 'delete') || [];
  const alreadyBanned = inactiveUsers?.filter(u => u.is_banned) || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
  );
};
