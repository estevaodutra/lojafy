import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AdminWithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  fee: number;
  net_amount: number | null;
  status: 'pending' | 'processing' | 'approved' | 'rejected' | 'completed';
  bank_details: {
    method: 'pix' | 'transferencia';
    pix_key?: string;
    pix_key_type?: string;
    bank_name?: string;
    agency?: string;
    account?: string;
    account_type?: string;
  };
  rejection_reason: string | null;
  notes: string | null;
  requested_at: string;
  processed_at: string | null;
  processed_by: string | null;
  // joined from profiles
  profile?: {
    first_name: string | null;
    last_name: string | null;
    role: string;
  };
}

export function useAdminWithdrawalRequests(statusFilter?: string) {
  return useQuery({
    queryKey: ['admin-withdrawal-requests', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('withdrawal_requests')
        .select(`
          *,
          profile:profiles!withdrawal_requests_user_id_fkey(first_name, last_name, role)
        `)
        .order('requested_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as AdminWithdrawalRequest[];
    },
  });
}

export function useApproveWithdrawal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (withdrawalId: string) => {
      const { data, error } = await supabase.functions.invoke('process-withdrawal', {
        body: { withdrawal_id: withdrawalId, action: 'approve' },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Approval failed');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-withdrawal-requests'] });
      toast({ title: 'Saque aprovado', description: 'O saldo foi debitado e o usuário notificado.' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao aprovar saque',
        description: error.message,
      });
    },
  });
}

export function useRejectWithdrawal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ withdrawalId, reason }: { withdrawalId: string; reason: string }) => {
      const { data, error } = await supabase.functions.invoke('process-withdrawal', {
        body: { withdrawal_id: withdrawalId, action: 'reject', rejection_reason: reason },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Rejection failed');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-withdrawal-requests'] });
      toast({ title: 'Saque rejeitado', description: 'O usuário foi notificado.' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao rejeitar saque',
        description: error.message,
      });
    },
  });
}

export function useAdminFinancialTransactions(page = 1, limit = 30) {
  return useQuery({
    queryKey: ['admin-financial-transactions', page, limit],
    queryFn: async () => {
      const offset = (page - 1) * limit;
      const { data, error, count } = await supabase
        .from('wallet_transactions')
        .select(`
          *,
          wallet:wallets!wallet_transactions_wallet_id_fkey(user_id),
          profile:wallets!wallet_transactions_wallet_id_fkey(
            profiles!wallets_user_id_fkey(first_name, last_name, role)
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return { transactions: data ?? [], total: count ?? 0 };
    },
  });
}
