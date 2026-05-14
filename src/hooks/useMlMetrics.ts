import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MlReputation {
  level_id: string;           // 1=novato, 2=bronze, 3=silver, 4=gold, 5=platinum
  power_seller_status: string | null; // 'gold', 'platinum', null
  transactions: {
    total: number;
    completed: number;
    canceled: number;
    period: string;
    ratings: { positive: number; negative: number; neutral: number };
  };
  metrics: {
    sales: { period: string; completed: number; total: number };
    claims: { period: string; rate: number; value: number };
    delayed_handling_time: { period: string; rate: number; value: number };
    cancellations: { period: string; rate: number; value: number };
  };
}

export interface MlOrderSummary {
  id: number;
  status: string;
  date_created: string;
  total_amount: number;
  buyer: { id: number; nickname: string };
  order_items: Array<{ item: { id: string; title: string }; quantity: number; unit_price: number }>;
}

export interface MlMetrics {
  reputation: MlReputation | null;
  recentOrders: MlOrderSummary[];
  activeListings: number;
  totalSales30d: number;
  totalRevenue30d: number;
  salesByDay: Array<{ date: string; sales: number; revenue: number }>;
}

async function mlCall(mlPath: string, resellerUserId?: string) {
  const { data, error } = await supabase.functions.invoke('ml-proxy', {
    body: { ml_path: mlPath, method: 'GET', reseller_user_id: resellerUserId },
  });
  if (error) throw error;
  return data?.data;
}

async function getMlUserId(userId: string): Promise<number | null> {
  const { data } = await supabase
    .from('mercadolivre_integrations')
    .select('ml_user_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();
  return data?.ml_user_id ?? null;
}

export function useMlMetrics(resellerUserId?: string) {
  const { user } = useAuth();
  const targetUserId = resellerUserId ?? user?.id;

  return useQuery({
    queryKey: ['ml-metrics', targetUserId],
    queryFn: async (): Promise<MlMetrics> => {
      if (!targetUserId) throw new Error('No user');
      const mlUserId = await getMlUserId(targetUserId);
      if (!mlUserId) throw new Error('ML not connected');

      const [userProfile, reputation, ordersRes, activeItemsRes] = await Promise.allSettled([
        mlCall(`/users/${mlUserId}`, resellerUserId),
        mlCall(`/users/${mlUserId}/reputation`, resellerUserId),
        mlCall(`/orders/search?seller=${mlUserId}&sort=date_desc&limit=50`, resellerUserId),
        mlCall(`/users/${mlUserId}/items/search?status=active&limit=1`, resellerUserId),
      ]);

      const recentOrders: MlOrderSummary[] =
        ordersRes.status === 'fulfilled' ? (ordersRes.value?.results ?? []) : [];

      const activeListings: number =
        activeItemsRes.status === 'fulfilled' ? (activeItemsRes.value?.paging?.total ?? 0) : 0;

      // Filtrar pedidos dos últimos 30 dias
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const orders30d = recentOrders.filter(o => new Date(o.date_created) >= cutoff);

      const totalSales30d = orders30d.filter(o => o.status === 'paid' || o.status === 'delivered').length;
      const totalRevenue30d = orders30d
        .filter(o => o.status === 'paid' || o.status === 'delivered')
        .reduce((sum, o) => sum + Number(o.total_amount ?? 0), 0);

      // Agrupar vendas por dia (últimos 30d)
      const dayMap = new Map<string, { sales: number; revenue: number }>();
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        dayMap.set(key, { sales: 0, revenue: 0 });
      }
      for (const order of orders30d) {
        if (order.status !== 'paid' && order.status !== 'delivered') continue;
        const day = order.date_created.split('T')[0];
        if (dayMap.has(day)) {
          const cur = dayMap.get(day)!;
          dayMap.set(day, { sales: cur.sales + 1, revenue: cur.revenue + Number(order.total_amount ?? 0) });
        }
      }
      const salesByDay = Array.from(dayMap.entries()).map(([date, v]) => ({ date, ...v }));

      const reputationData = reputation.status === 'fulfilled' ? reputation.value : null;

      return {
        reputation: reputationData,
        recentOrders,
        activeListings,
        totalSales30d,
        totalRevenue30d,
        salesByDay,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 min
    enabled: !!targetUserId,
  });
}
