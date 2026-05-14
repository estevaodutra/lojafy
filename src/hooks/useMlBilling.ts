import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MlBillingPeriod {
  id: string;
  date_from: string;
  date_to: string;
  status: string;
}

export interface MlCharge {
  id: string;
  type: string;           // commission, listing, advertising, shipping
  detail: string;
  amount: number;
  currency_id: string;
  date: string;
  order_id?: string;
}

export interface MlBillingInfo {
  doc_type: string;
  doc_number: string;
  business_name: string;
  address?: string;
}

export interface MlOrderForBilling {
  id: number;
  date_created: string;
  total_amount: number;
  status: string;
  buyer_nickname: string;
  items: Array<{ title: string; quantity: number; unit_price: number }>;
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

export function useMlBilling(resellerUserId?: string) {
  const { user } = useAuth();
  const targetUserId = resellerUserId ?? user?.id;
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);

  // Períodos de cobrança disponíveis
  const { data: periods = [], isLoading: loadingPeriods } = useQuery({
    queryKey: ['ml-billing-periods', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];
      const data = await mlCall('/billing/periods', resellerUserId);
      return (data?.results ?? []) as MlBillingPeriod[];
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!targetUserId,
  });

  // Taxas do período selecionado
  const activePeriod = selectedPeriodId ?? periods[0]?.id;
  const { data: charges = [], isLoading: loadingCharges } = useQuery({
    queryKey: ['ml-billing-charges', targetUserId, activePeriod],
    queryFn: async () => {
      if (!targetUserId || !activePeriod) return [];
      const mlUserId = await getMlUserId(targetUserId);
      if (!mlUserId) return [];
      const data = await mlCall(
        `/billing/companies/${mlUserId}/charges?period=${activePeriod}&limit=100`,
        resellerUserId
      );
      return (data?.results ?? []) as MlCharge[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!targetUserId && !!activePeriod,
  });

  // Dados fiscais do vendedor
  const { data: billingInfo } = useQuery({
    queryKey: ['ml-billing-info', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;
      const mlUserId = await getMlUserId(targetUserId);
      if (!mlUserId) return null;
      const data = await mlCall(`/users/${mlUserId}/billing_info`, resellerUserId);
      return data as MlBillingInfo | null;
    },
    staleTime: 30 * 60 * 1000,
    enabled: !!targetUserId,
  });

  // Pedidos do período para calcular receita
  const { data: periodOrders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['ml-billing-orders', targetUserId, activePeriod],
    queryFn: async () => {
      if (!targetUserId || !activePeriod) return [];
      const mlUserId = await getMlUserId(targetUserId);
      if (!mlUserId) return [];

      // Buscar período selecionado para datas
      const period = periods.find(p => p.id === activePeriod);
      if (!period) return [];

      const dateFrom = period.date_from.split('T')[0];
      const dateTo = period.date_to.split('T')[0];

      const data = await mlCall(
        `/orders/search?seller=${mlUserId}&order.date_created.from=${dateFrom}&order.date_created.to=${dateTo}&sort=date_desc&limit=100`,
        resellerUserId
      );
      return (data?.results ?? []) as MlOrderForBilling[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!targetUserId && !!activePeriod && periods.length > 0,
  });

  // Cálculos financeiros
  const paidOrders = periodOrders.filter(o => o.status === 'paid' || o.status === 'delivered');
  const grossRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total_amount ?? 0), 0);
  const totalCharges = charges.reduce((sum, c) => sum + Number(c.amount ?? 0), 0);
  const netIncome = grossRevenue - totalCharges;

  // Resumo de taxas por tipo
  const chargesByType = charges.reduce<Record<string, number>>((acc, c) => {
    const type = c.type ?? 'other';
    acc[type] = (acc[type] ?? 0) + Number(c.amount ?? 0);
    return acc;
  }, {});

  return {
    periods,
    activePeriod,
    selectPeriod: setSelectedPeriodId,
    charges,
    chargesByType,
    billingInfo,
    paidOrders,
    grossRevenue,
    totalCharges,
    netIncome,
    isLoading: loadingPeriods || loadingCharges || loadingOrders,
  };
}
