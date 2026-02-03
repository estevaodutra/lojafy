import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';

export type LogSource = 'all' | 'webhook' | 'api_request';
export type LogEventType = 'all' | 'order.paid' | 'user.created' | 'user.inactive.7d' | 'user.inactive.15d' | 'user.inactive.30d' | 'api.request';
export type LogPeriod = '24h' | '7d' | 'all';
export type LogStatus = 'all' | 'success' | 'error';

interface UseApiLogsParams {
  source?: LogSource;
  eventType?: LogEventType;
  period?: LogPeriod;
  status?: LogStatus;
  page?: number;
  pageSize?: number;
}

interface UnifiedLog {
  id: string;
  source: 'webhook' | 'api_request';
  event_type: string;
  function_name?: string;
  method?: string;
  payload?: Record<string, unknown>;
  query_params?: Record<string, unknown>;
  status_code: number | null;
  response_body?: string | null;
  error_message: string | null;
  duration_ms?: number | null;
  timestamp: string;
  webhook_url?: string | null;
}

interface UseApiLogsResult {
  logs: UnifiedLog[];
  totalCount: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
  metrics: {
    totalRequests: number;
    successRate: number;
    avgDuration: number;
  };
}

const getPeriodDate = (period: LogPeriod): Date | null => {
  if (period === 'all') return null;
  
  const now = new Date();
  switch (period) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
};

export const useApiLogs = ({
  source = 'all',
  eventType = 'all',
  period = '7d',
  status = 'all',
  page = 1,
  pageSize = 20,
}: UseApiLogsParams = {}): UseApiLogsResult => {
  const [currentPage, setCurrentPage] = useState(page);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['api-logs', source, eventType, period, status, currentPage, pageSize],
    queryFn: async () => {
      const periodDate = getPeriodDate(period);
      const logs: UnifiedLog[] = [];
      let webhookCount = 0;
      let apiCount = 0;

      // Fetch webhook logs if needed
      if (source === 'all' || source === 'webhook') {
        let webhookQuery = supabase
          .from('webhook_dispatch_logs')
          .select('*', { count: 'exact' });

        if (eventType !== 'all' && eventType !== 'api.request') {
          webhookQuery = webhookQuery.eq('event_type', eventType);
        }

        if (periodDate) {
          webhookQuery = webhookQuery.gte('dispatched_at', periodDate.toISOString());
        }

        if (status === 'success') {
          webhookQuery = webhookQuery.gte('status_code', 200).lt('status_code', 300);
        } else if (status === 'error') {
          webhookQuery = webhookQuery.or('status_code.gte.400,status_code.is.null');
        }

        const { data: webhookLogs, count: wCount } = await webhookQuery
          .order('dispatched_at', { ascending: false })
          .limit(source === 'webhook' ? pageSize : 100);

        webhookCount = wCount || 0;

        webhookLogs?.forEach(log => {
          logs.push({
            id: log.id,
            source: 'webhook',
            event_type: log.event_type,
            payload: log.payload as Record<string, unknown>,
            status_code: log.status_code,
            response_body: log.response_body,
            error_message: log.error_message,
            timestamp: log.dispatched_at,
            webhook_url: (log as any).webhook_url || null,
          });
        });
      }

      // Fetch API request logs if needed
      if (source === 'all' || source === 'api_request') {
        let apiQuery = supabase
          .from('api_request_logs')
          .select('*', { count: 'exact' });

        if (periodDate) {
          apiQuery = apiQuery.gte('created_at', periodDate.toISOString());
        }

        if (status === 'success') {
          apiQuery = apiQuery.gte('status_code', 200).lt('status_code', 300);
        } else if (status === 'error') {
          apiQuery = apiQuery.or('status_code.gte.400,status_code.is.null');
        }

        const { data: apiLogs, count: aCount } = await apiQuery
          .order('created_at', { ascending: false })
          .limit(source === 'api_request' ? pageSize : 100);

        apiCount = aCount || 0;

        apiLogs?.forEach(log => {
          logs.push({
            id: log.id,
            source: 'api_request',
            event_type: `api.${log.function_name}`,
            function_name: log.function_name,
            method: log.method,
            query_params: log.query_params as Record<string, unknown>,
            status_code: log.status_code,
            error_message: log.error_message,
            duration_ms: log.duration_ms,
            timestamp: log.created_at,
          });
        });
      }

      // Sort combined logs by timestamp
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Apply pagination
      const totalCount = source === 'webhook' ? webhookCount : source === 'api_request' ? apiCount : webhookCount + apiCount;
      const offset = (currentPage - 1) * pageSize;
      const paginatedLogs = logs.slice(offset, offset + pageSize);

      // Calculate metrics
      const successLogs = logs.filter(l => l.status_code !== null && l.status_code >= 200 && l.status_code < 300);
      const durations = logs.filter(l => l.duration_ms).map(l => l.duration_ms!);
      const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

      return {
        logs: paginatedLogs,
        totalCount,
        metrics: {
          totalRequests: logs.length,
          successRate: logs.length > 0 ? (successLogs.length / logs.length) * 100 : 0,
          avgDuration: Math.round(avgDuration),
        },
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
    metrics: data?.metrics || { totalRequests: 0, successRate: 0, avgDuration: 0 },
  };
};
