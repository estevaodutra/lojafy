import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface SupportAlerts {
  criticalTickets: number; // >2 dias
  urgentTickets: number; // 1-2 dias
  pendingQuestions: number;
  avgResponseTime: number; // em minutos
  aiResolutionRate: number; // %
}

export const useSupportAlerts = () => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['support-alerts'],
    queryFn: async (): Promise<SupportAlerts> => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Tickets críticos (>2 dias aguardando admin)
      const { count: criticalCount } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting_admin')
        .lt('updated_at', twoDaysAgo.toISOString());

      // Tickets urgentes (1-2 dias)
      const { count: urgentCount } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting_admin')
        .gte('updated_at', twoDaysAgo.toISOString())
        .lt('updated_at', oneDayAgo.toISOString());

      // Perguntas pendentes sem resposta
      const { count: pendingQuestionsCount } = await supabase
        .from('ai_pending_questions')
        .select('*', { count: 'exact', head: true })
        .is('admin_answer', null);

      // Tempo médio de resposta (últimos 7 dias)
      const { data: recentTickets } = await supabase
        .from('support_tickets')
        .select('created_at, updated_at')
        .gte('created_at', sevenDaysAgo.toISOString())
        .neq('created_at', 'updated_at')
        .limit(100);

      let avgResponseTime = 0;
      if (recentTickets && recentTickets.length > 0) {
        const totalMinutes = recentTickets.reduce((sum, ticket) => {
          const created = new Date(ticket.created_at);
          const updated = new Date(ticket.updated_at);
          const diff = (updated.getTime() - created.getTime()) / (1000 * 60);
          return sum + diff;
        }, 0);
        avgResponseTime = Math.round(totalMinutes / recentTickets.length);
      }

      // Taxa de resolução da IA (tickets que não escalaram)
      const { count: totalTickets } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString());

      const { count: escalatedTickets } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting_admin')
        .gte('created_at', sevenDaysAgo.toISOString());

      const aiResolutionRate = totalTickets && totalTickets > 0
        ? Math.round(((totalTickets - (escalatedTickets || 0)) / totalTickets) * 100)
        : 0;

      return {
        criticalTickets: criticalCount || 0,
        urgentTickets: urgentCount || 0,
        pendingQuestions: pendingQuestionsCount || 0,
        avgResponseTime,
        aiResolutionRate
      };
    },
    refetchInterval: 30000 // Atualizar a cada 30s
  });

  // Real-time subscription para atualizar quando status mudar
  useEffect(() => {
    const channel = supabase
      .channel('support-alerts-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets'
        },
        () => {
          refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_pending_questions'
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  return { data, isLoading, refetch };
};
