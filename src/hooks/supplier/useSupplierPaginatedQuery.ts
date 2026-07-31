import { useQuery, keepPreviousData, type QueryKey } from '@tanstack/react-query';

export interface PaginatedResult<T> {
  rows: T[];
  count: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

interface PaginatedQueryOptions<T> {
  queryKey: QueryKey;
  page: number;
  pageSize: number;
  enabled?: boolean;
  /** Executa a query já com .range() aplicado e count: 'exact'. */
  fetcher: (from: number, to: number) => Promise<{ data: T[] | null; count: number | null; error: unknown }>;
}

/**
 * Helper compartilhado de paginação server-side (.range + count exact).
 * Substitui o padrão fetch-all-then-filter do módulo antigo.
 */
export function useSupplierPaginatedQuery<T>({
  queryKey,
  page,
  pageSize,
  enabled = true,
  fetcher,
}: PaginatedQueryOptions<T>) {
  return useQuery<PaginatedResult<T>>({
    queryKey,
    enabled,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, count, error } = await fetcher(from, to);
      if (error) throw error;
      const total = count ?? 0;
      return {
        rows: data ?? [],
        count: total,
        page,
        pageSize,
        pageCount: Math.max(1, Math.ceil(total / pageSize)),
      };
    },
  });
}
