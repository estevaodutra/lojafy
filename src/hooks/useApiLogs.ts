import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';

export type LogEventType = 'all' | 'order.paid' | 'user.created' | 'user.inactive.7d' | 'user.inactive.15d' | 'user.inactive.30d';
export type LogPeriod = '24h' | '7d' | '30d' | 'all';
export type LogStatus = 'all' | 'success' | 'error';

interface UseApiLogsParams {
  eventType?: LogEventType;
  period?: LogPeriod;
  status?: LogStatus;
  page?: number;
  pageSize?: number;
}

interface WebhookLog {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  status_code: number | null;
  response_body: string | null;
  error_message: string | null;
  dispatched_at: string;
  webhook_url: string | null;
}

interface UseApiLogsResult {
  logs: WebhookLog[];
  totalCount: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
}

const getPeriodDate = (period: LogPeriod): Date | null => {
  if (period === 'all') return null;
  
  const now = new Date();
  switch (period) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
};

export const useApiLogs = ({
  eventType = 'all',
  period = '7d',
  status = 'all',
  page = 1,
  pageSize = 20,
}: UseApiLogsParams = {}): UseApiLogsResult => {
  const [currentPage, setCurrentPage] = useState(page);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['api-logs', eventType, period, status, currentPage, pageSize],
    queryFn: async () => {
      let query = supabase
        .from('webhook_dispatch_logs')
        .select('*', { count: 'exact' });

      // Filter by event type
      if (eventType !== 'all') {
        query = query.eq('event_type', eventType);
      }

      // Filter by period
      const periodDate = getPeriodDate(period);
      if (periodDate) {
        query = query.gte('dispatched_at', periodDate.toISOString());
      }

      // Filter by status
      if (status === 'success') {
        query = query.gte('status_code', 200).lt('status_code', 300);
      } else if (status === 'error') {
        query = query.or('status_code.gte.400,status_code.is.null');
      }

      // Order and paginate
      query = query
        .order('dispatched_at', { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      const { data: logs, error, count } = await query;

      if (error) throw error;

      return {
        logs: logs as WebhookLog[],
        totalCount: count || 0,
      };
    },
  });

  const totalPages = Math.ceil((data?.totalCount || 0) / pageSize);

  return {
    logs: data?.logs || [],
    totalCount: data?.totalCount || 0,
    isLoading,
    error: error as Error | null,
    refetch,
    page: currentPage,
    setPage: setCurrentPage,
    totalPages,
  };
};
