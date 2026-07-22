import { supabase } from '@/integrations/supabase/client';

export const WalletService = {
  async getWalletBalance(userId: string) {
    const { data, error } = await supabase
      .from('wallets' as any)
      .select('saldo, saldo_bloqueado, saldo_reservado_saque')
      .eq('user_id', userId)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        // Wallet not found - return defaults
        return { saldo: 0, saldo_bloqueado: 0, saldo_reservado_saque: 0 };
      }
      throw new Error(error.message);
    }
    
    return data;
  },

  async requestWithdrawal(amount: number, pixKey: string, pixKeyType: string, holderName: string, holderDocument: string) {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw new Error(userError.message);
    
    // Check local balance first for UX
    const wallet = await this.getWalletBalance(userData.user.id);
    if (wallet.saldo < amount) {
      throw new Error('Saldo disponível insuficiente para este saque.');
    }

    // Call RPC to perform atomic withdrawal request
    const { data, error } = await supabase.rpc('solicitar_saque', {
      p_user_id: userData.user.id,
      p_valor: amount,
      p_pix_key: pixKey,
      p_pix_key_type: pixKeyType,
      p_holder_name: holderName,
      p_holder_document: holderDocument
    });

    if (error) throw new Error(error.message);
    
    if (data && typeof data === 'object' && 'success' in data && data.success === false) {
      throw new Error((data as any).error || 'Erro ao solicitar saque');
    }
    
    return data;
  },

  async confirmWithdrawalPayment(requestId: string, transactionId: string, proofUrl: string) {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw new Error(userError.message);

    const { data, error } = await supabase.rpc('concluir_saque', {
      p_admin_id: userData.user.id,
      p_request_id: requestId,
      p_transaction_id: transactionId,
      p_proof_url: proofUrl
    });

    if (error) throw new Error(error.message);
    if (data && typeof data === 'object' && 'success' in data && data.success === false) {
      throw new Error((data as any).error || 'Erro ao concluir saque');
    }
    return data;
  },

  async rejectWithdrawal(requestId: string, reason: string) {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw new Error(userError.message);

    const { data, error } = await supabase.rpc('rejeitar_saque', {
      p_admin_id: userData.user.id,
      p_request_id: requestId,
      p_reason: reason
    });

    if (error) throw new Error(error.message);
    if (data && typeof data === 'object' && 'success' in data && data.success === false) {
      throw new Error((data as any).error || 'Erro ao rejeitar saque');
    }
    return data;
  },

  async getWithdrawalRequests(status?: string) {
    let query = supabase
      .from('withdrawal_requests' as any)
      .select('*, profiles(business_name, full_name)')
      .order('requested_at', { ascending: false });
      
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  },
  
  async approveSupplierCreditAndFundWallet(returnRequestId: string, supplierCreditId: string) {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw new Error(userError.message);
    
    const { data, error } = await supabase.rpc('aprovar_credito_fornecedor', {
      p_admin_id: userData.user.id,
      p_return_request_id: returnRequestId,
      p_supplier_credit_id: supplierCreditId
    });
    
    if (error) throw new Error(error.message);
    if (data && typeof data === 'object' && 'success' in data && data.success === false) {
      throw new Error((data as any).error || 'Erro ao aprovar crédito do fornecedor');
    }
    return data;
  }
};
