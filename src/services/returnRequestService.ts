import { supabase } from '@/integrations/supabase/client';

export interface ReturnRequestInput {
  order_id: string;
  reseller_id: string;
  supplier_id: string;
  request_type: string;
  reason: string;
  description?: string;
  requested_amount: number;
  items: {
    order_item_id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    requested_amount: number;
    condition?: string;
  }[];
}

export const ReturnRequestService = {
  async createReturnRequest(input: ReturnRequestInput) {
    const protocol = `DEV-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Insert Return Request
    const { data: request, error: requestError } = await supabase
      .from('return_requests' as any)
      .insert({
        protocol,
        order_id: input.order_id,
        reseller_id: input.reseller_id,
        supplier_id: input.supplier_id,
        request_type: input.request_type,
        reason: input.reason,
        description: input.description,
        requested_amount: input.requested_amount,
        status: 'solicitacao_aberta'
      })
      .select()
      .single();

    if (requestError) throw new Error(requestError.message);

    // Insert Items
    const itemsToInsert = input.items.map(item => ({
      ...item,
      return_request_id: request.id
    }));

    const { error: itemsError } = await supabase
      .from('return_request_items' as any)
      .insert(itemsToInsert);

    if (itemsError) throw new Error(itemsError.message);

    // Create Audit Event
    const { error: eventError } = await supabase
      .from('return_request_events' as any)
      .insert({
        return_request_id: request.id,
        event_type: 'created',
        new_status: 'solicitacao_aberta',
        metadata: { action: 'Solicitação inicial' }
      });

    if (eventError) throw new Error(eventError.message);

    return request;
  },

  async getSupplierReturnRequests(supplierId: string) {
    const { data, error } = await supabase
      .from('return_requests' as any)
      .select(`
        *,
        return_request_items:return_request_items(*),
        orders:order_id(order_number, total_amount, created_at)
      `)
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  },

  async getResellerReturnRequests(resellerId: string) {
    const { data, error } = await supabase
      .from('return_requests' as any)
      .select(`
        *,
        return_request_items:return_request_items(*),
        orders:order_id(order_number, total_amount, created_at)
      `)
      .eq('reseller_id', resellerId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  },

  async confirmSupplierCredit(returnRequestId: string, supplierId: string, amount: number, notes?: string) {
    // 1. Criar o crédito
    const { data: credit, error: creditError } = await supabase
      .from('supplier_credits' as any)
      .insert({
        supplier_id: supplierId,
        return_request_id: returnRequestId,
        amount,
        credit_type: 'devolucao',
        status: 'pendente',
        notes
      })
      .select()
      .single();

    if (creditError) throw new Error(creditError.message);

    // 2. Atualizar a devolução
    const { error: updateError } = await supabase
      .from('return_requests' as any)
      .update({ status: 'credito_pendente' })
      .eq('id', returnRequestId);

    if (updateError) throw new Error(updateError.message);

    // 3. Gerar evento
    await supabase.from('return_request_events' as any).insert({
      return_request_id: returnRequestId,
      event_type: 'supplier_credit_informed',
      previous_status: 'analise_fornecedor',
      new_status: 'credito_pendente',
      metadata: { amount, notes }
    });

    return credit;
  }
};
