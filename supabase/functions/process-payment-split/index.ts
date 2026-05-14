import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id } = await req.json();

    if (!order_id) {
      return new Response(
        JSON.stringify({ error: 'order_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[split] Processing split for order ${order_id}`);

    // Idempotência: verificar se já foi processado
    const { data: existingSplits } = await supabase
      .from('order_payment_splits')
      .select('id, status')
      .eq('order_id', order_id)
      .eq('status', 'credited');

    if (existingSplits && existingSplits.length > 0) {
      console.log(`[split] Order ${order_id} already processed, skipping`);
      return new Response(
        JSON.stringify({ success: true, message: 'Already processed', splits: existingSplits }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar pedido com itens e produtos
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        total_amount,
        reseller_id,
        payment_status,
        order_items (
          id,
          product_id,
          quantity,
          unit_price,
          product_snapshot
        )
      `)
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      console.error('[split] Order not found:', orderError);
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (order.payment_status !== 'paid') {
      return new Response(
        JSON.stringify({ error: 'Order is not paid yet' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar configurações de split da plataforma
    const { data: settings } = await supabase
      .from('platform_settings')
      .select('split_fornecedor_percentual, split_revendedor_percentual, split_plataforma_percentual')
      .single();

    const splitFornecedorPct = settings?.split_fornecedor_percentual ?? 0;
    const splitRevendedorPct = settings?.split_revendedor_percentual ?? 0;

    // Buscar supplier_id e cost_price de cada produto
    const productIds = [...new Set(order.order_items.map((i: any) => i.product_id).filter(Boolean))];
    const { data: products } = await supabase
      .from('products')
      .select('id, cost_price, supplier_id')
      .in('id', productIds);

    const productsMap = new Map((products ?? []).map((p: any) => [p.id, p]));

    // ── Verificação de saldo do revendedor ────────────────────────────────────
    // Calcular custo total que será debitado do revendedor para pagar fornecedores
    let totalCusto = 0;
    for (const item of order.order_items) {
      const product = productsMap.get(item.product_id);
      if (!product) continue;
      const qty = Number(item.quantity);
      const costPrice = Number(product.cost_price ?? 0);
      const splitPct = splitFornecedorPct > 0 ? splitFornecedorPct / 100 : null;
      totalCusto += splitPct != null
        ? Number(item.unit_price) * qty * splitPct
        : costPrice * qty;
    }
    totalCusto = Math.round(totalCusto * 100) / 100;

    if (totalCusto > 0 && order.reseller_id) {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('saldo')
        .eq('user_id', order.reseller_id)
        .single();

      const saldoAtual = Number(wallet?.saldo ?? 0);

      if (saldoAtual < totalCusto) {
        // Saldo insuficiente — manter pedido como pendente e notificar revendedor
        await supabase.from('notifications').insert({
          user_id: order.reseller_id,
          title: '⚠️ Saldo insuficiente para confirmar pedido',
          message: `Um pedido precisa de R$ ${totalCusto.toFixed(2)} na carteira para pagar o fornecedor. Saldo atual: R$ ${saldoAtual.toFixed(2)}.`,
          type: 'wallet_alert',
          action_url: '/reseller/financeiro',
          action_label: 'Adicionar Saldo',
        });
        console.log(`[split] Insufficient balance for order ${order_id}: need ${totalCusto}, have ${saldoAtual}`);
        return new Response(
          JSON.stringify({ success: false, reason: 'insufficient_balance', required: totalCusto, available: saldoAtual }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Saldo suficiente — debitar revendedor pelo custo total do fornecedor
      const debitResult = await supabase.rpc('debitar_carteira', {
        p_user_id: order.reseller_id,
        p_valor: totalCusto,
        p_descricao: `Pagamento fornecedor - Pedido #${order_id.slice(-8).toUpperCase()}`,
        p_referencia_tipo: 'custo_pedido',
        p_referencia_id: order_id,
      });
      if (debitResult.error || !debitResult.data?.success) {
        console.error('[split] Failed to debit reseller wallet:', debitResult.error || debitResult.data);
        return new Response(
          JSON.stringify({ error: 'Failed to debit reseller wallet' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log(`[split] Debited R$ ${totalCusto} from reseller ${order.reseller_id}`);
    }

    // Calcular splits por item
    type SplitEntry = {
      recipientUserId: string;
      role: 'supplier' | 'reseller';
      valor: number;
      itemId: string;
    };
    const splits: SplitEntry[] = [];

    for (const item of order.order_items) {
      const product = productsMap.get(item.product_id);
      if (!product) continue;

      const unitPrice = Number(item.unit_price);
      const qty = Number(item.quantity);
      const costPrice = Number(product.cost_price ?? 0);

      // Valor fornecedor: cost_price por unidade (ou percentual configurado)
      const valorFornecedor = splitFornecedorPct > 0
        ? unitPrice * qty * (splitFornecedorPct / 100)
        : costPrice * qty;

      // Valor revendedor: margem (unit_price - cost_price) por unidade (ou percentual)
      const valorRevendedor = splitRevendedorPct > 0
        ? unitPrice * qty * (splitRevendedorPct / 100)
        : Math.max(0, (unitPrice - costPrice) * qty);

      if (product.supplier_id && valorFornecedor > 0) {
        splits.push({
          recipientUserId: product.supplier_id,
          role: 'supplier',
          valor: valorFornecedor,
          itemId: item.id,
        });
      }

      if (order.reseller_id && valorRevendedor > 0) {
        splits.push({
          recipientUserId: order.reseller_id,
          role: 'reseller',
          valor: valorRevendedor,
          itemId: item.id,
        });
      }
    }

    if (splits.length === 0) {
      console.log(`[split] No splits to process for order ${order_id}`);
      // Sem splits mas pagamento ok → confirmar pedido
      await supabase.from('orders').update({ status: 'recebido' }).eq('id', order_id);
      await supabase.from('order_status_history').insert({
        order_id,
        status: 'recebido',
        notes: 'Pedido confirmado (sem split aplicável)',
      }).catch(() => {});
      return new Response(
        JSON.stringify({ success: true, message: 'No splits applicable', splits_creditados: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Agrupar splits por recipient + role para crédito único por usuário
    const aggregated = new Map<string, { recipientUserId: string; role: string; valor: number }>();
    for (const s of splits) {
      const key = `${s.recipientUserId}:${s.role}`;
      const existing = aggregated.get(key);
      if (existing) {
        existing.valor += s.valor;
      } else {
        aggregated.set(key, { recipientUserId: s.recipientUserId, role: s.role, valor: s.valor });
      }
    }

    let creditados = 0;
    let falhos = 0;

    for (const entry of aggregated.values()) {
      const valor = Math.round(entry.valor * 100) / 100; // arredondar 2 decimais

      // Registrar split como pending
      const { data: splitRecord, error: insertError } = await supabase
        .from('order_payment_splits')
        .insert({
          order_id,
          recipient_user_id: entry.recipientUserId,
          recipient_role: entry.role,
          valor,
          status: 'pending',
        })
        .select('id')
        .single();

      if (insertError) {
        console.error(`[split] Failed to insert split record:`, insertError);
        falhos++;
        continue;
      }

      // Creditar carteira
      const tipo = entry.role === 'supplier' ? 'pagamento_pedido' : 'cashback';
      const descricao = entry.role === 'supplier'
        ? `Venda de produto - Pedido #${order_id.slice(-8).toUpperCase()}`
        : `Comissão de venda - Pedido #${order_id.slice(-8).toUpperCase()}`;

      const { data: creditResult, error: creditError } = await supabase.rpc('creditar_carteira', {
        p_user_id: entry.recipientUserId,
        p_valor: valor,
        p_taxa: 0,
        p_descricao: descricao,
        p_referencia_tipo: 'venda_pedido',
        p_referencia_id: order_id,
        p_tipo: tipo,
      });

      if (creditError || !creditResult?.success) {
        console.error(`[split] Failed to credit wallet for ${entry.role}:`, creditError || creditResult);
        // Marcar split como failed
        await supabase
          .from('order_payment_splits')
          .update({ status: 'failed', error_message: creditError?.message || 'RPC returned error', processed_at: new Date().toISOString() })
          .eq('id', splitRecord.id);
        falhos++;
        continue;
      }

      // Marcar split como credited
      await supabase
        .from('order_payment_splits')
        .update({
          status: 'credited',
          wallet_transaction_id: creditResult.transaction_id,
          processed_at: new Date().toISOString(),
        })
        .eq('id', splitRecord.id);

      // Notificar o beneficiário
      await supabase.from('notifications').insert({
        user_id: entry.recipientUserId,
        title: entry.role === 'supplier' ? '💰 Pagamento recebido!' : '💰 Comissão creditada!',
        message: `R$ ${valor.toFixed(2)} foi creditado na sua carteira referente a um pedido.`,
        type: 'wallet_credit',
        action_url: entry.role === 'supplier' ? '/supplier' : '/reseller/financeiro',
        action_label: 'Ver Carteira',
      }).catch((e: Error) => console.error('[split] Failed to create notification:', e));

      console.log(`[split] ✅ Credited R$ ${valor} to ${entry.role} ${entry.recipientUserId}`);
      creditados++;
    }

    // Se ao menos algum split foi creditado, confirmar pedido como recebido
    if (creditados > 0) {
      await supabase.from('orders').update({ status: 'recebido' }).eq('id', order_id);
      await supabase.from('order_status_history').insert({
        order_id,
        status: 'recebido',
        notes: 'Saldo confirmado — fornecedor pago e pedido em processamento',
      }).catch(() => {});
    }

    return new Response(
      JSON.stringify({ success: true, splits_creditados: creditados, splits_falhos: falhos }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[split] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
