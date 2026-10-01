import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subHours, subDays } from 'date-fns';

export interface AuditChangeItem {
  field: string;
  label: string;
  before: any;
  after: any;
}

export interface PlatformAuditLog {
  id: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  action_type: string;
  action_label: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  actor_role: string | null;
  changes: AuditChangeItem[];
  metadata?: Record<string, any>;
  created_at: string;
}

export type AuditPeriod = '24h' | '7d' | '30d' | 'all';
export type AuditActionType = 'all' | 'status_change' | 'stock_change' | 'price_change' | 'product_update' | 'product_create' | 'product_delete';

interface UsePlatformAuditLogsOptions {
  search?: string;
  actionType?: AuditActionType;
  period?: AuditPeriod;
  page?: number;
  pageSize?: number;
}

export function usePlatformAuditLogs({
  search = '',
  actionType = 'all',
  period = 'all',
  page = 1,
  pageSize = 15,
}: UsePlatformAuditLogsOptions = {}) {
  const [currentPage, setCurrentPage] = useState(page);

  const queryKey = ['platform-audit-logs', { search, actionType, period, page: currentPage, pageSize }];

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey,
    queryFn: async () => {
      let query = (supabase as any)
        .from('platform_audit_logs')
        .select('*', { count: 'exact' });

      // Filtro por tipo de ação
      if (actionType && actionType !== 'all') {
        query = query.eq('action_type', actionType);
      }

      // Filtro por período
      if (period === '24h') {
        const date24h = subHours(new Date(), 24).toISOString();
        query = query.gte('created_at', date24h);
      } else if (period === '7d') {
        const date7d = subDays(new Date(), 7).toISOString();
        query = query.gte('created_at', date7d);
      } else if (period === '30d') {
        const date30d = subDays(new Date(), 30).toISOString();
        query = query.gte('created_at', date30d);
      }

      // Filtro por busca de texto (nome do produto, quem alterou, email)
      if (search.trim()) {
        const term = search.trim();
        query = query.or(`entity_name.ilike.%${term}%,actor_name.ilike.%${term}%,actor_email.ilike.%${term}%,action_label.ilike.%${term}%`);
      }

      // Ordenação decrescente (mais recentes primeiro)
      query = query.order('created_at', { ascending: false });

      // Paginação
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error('Erro ao buscar logs de auditoria:', error);
        throw error;
      }

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / pageSize) || 1;

      return {
        logs: (data as PlatformAuditLog[]) || [],
        totalCount,
        totalPages,
      };
    },
  });

  return {
    logs: data?.logs || [],
    totalCount: data?.totalCount || 0,
    totalPages: data?.totalPages || 1,
    currentPage,
    setCurrentPage,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  };
}

/**
 * Função utilitária para registrar manualmente um log de auditoria no frontend, se necessário
 */
export async function logPlatformAction({
  entityType = 'product',
  entityId,
  entityName,
  actionType,
  actionLabel,
  changes = [],
  metadata = {},
}: {
  entityType?: string;
  entityId?: string;
  entityName?: string;
  actionType: string;
  actionLabel: string;
  changes?: AuditChangeItem[];
  metadata?: Record<string, any>;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    let actorName = 'Usuário';
    let actorRole = 'user';
    let actorEmail = user?.email || null;

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile) {
        const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ');
        if (fullName) actorName = fullName;
        if (profile.role) actorRole = profile.role;
      }
    }

    const { error } = await (supabase as any).from('platform_audit_logs').insert({
      entity_type: entityType,
      entity_id: entityId || null,
      entity_name: entityName || null,
      action_type: actionType,
      action_label: actionLabel,
      actor_id: user?.id || null,
      actor_name: actorName,
      actor_email: actorEmail,
      actor_role: actorRole,
      changes,
      metadata,
    });

    if (error) {
      console.warn('Não foi possível gravar log de auditoria via frontend:', error);
    }
  } catch (err) {
    console.warn('Erro ao disparar log de auditoria:', err);
  }
}
