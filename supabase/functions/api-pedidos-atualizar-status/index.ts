import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

const VALID_STATUSES = [
  'pendente',
  'pago',
  'recebido',
  'embalado',
  'enviado',
  'finalizado',
  'em_reposicao',
  'em_falta',
  'cancelamento_solicitado',
  'cancelado',
  'devolucao_andamento',
  'devolucao_recebida',
  'devolucao_analise',
  'devolucao_aprovada',
  'reembolsado'
];

const REASONS_REQUIRING_OBSERVATION = ['erro_pedido', 'fraude', 'devolucao_negada', 'outro'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'PUT') {
    return new Response(
      JSON.stringify({ success: false, error: 'Método não permitido. Use PUT.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate API Key
    const apiKey = req.headers.get('X-API-Key') || req.headers.get('x-api-key');
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'API Key não fornecida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('id, user_id, permissions, active')
      .eq('api_key', apiKey)
      .single();

    if (keyError || !keyData) {
      return new Response(
        JSON.stringify({ success: false, error: 'API Key inválida ou inativa' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!keyData.active) {
      return new Response(
        JSON.stringify({ success: false, error: 'API Key inativa' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const permissions = keyData.permissions as Record<string, any> || {};
    if (!permissions?.pedidos?.write) {
      return new Response(
        JSON.stringify({ success: false, error: 'Permissão pedidos.write não concedida' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabase
      .from('api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('id', keyData.id);

    const body = await req.json();
    const { 
      order_number, status, tracking_number, notes, previsao_envio, motivo,
      cancelamento_motivo, cancelamento_observacao,
      devolucao_motivo, devolucao_observacao,
      motivo_atraso, motivo_falta
    } = body;

    if (!order_number || !status) {
      return new Response(
        JSON.stringify({ success: false, error: 'order_number e status são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch valid statuses dynamically from order_pipeline_columns table
    const { data: pipelineCols, error: colsError } = await supabase
      .from('order_pipeline_columns')
      .select('status_key');

    let dynamicValidStatuses = VALID_STATUSES;
    if (!colsError && pipelineCols && pipelineCols.length > 0) {
      dynamicValidStatuses = pipelineCols.map((col: any) => col.status_key);
    } else if (colsError) {
      console.error('Error fetching valid statuses from database, falling back to static list:', colsError);
    }

    if (!dynamicValidStatuses.includes(status)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Status inválido. Statuses permitidos: ${dynamicValidStatuses.join(', ')}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate em_reposicao requires previsao_envio and motivo_atraso
    if (status === 'em_reposicao' && !previsao_envio) {
      return new Response(
        JSON.stringify({ success: false, error: 'previsao_envio é obrigatório para status em_reposicao' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (status === 'em_falta' && !motivo_falta && !motivo) {
      return new Response(
        JSON.stringify({ success: false, error: 'motivo_falta é obrigatório para status em_falta' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate cancelado requires cancelamento_motivo
    if (status === 'cancelado' && !cancelamento_motivo) {
      return new Response(
        JSON.stringify({ success: false, error: 'cancelamento_motivo é obrigatório para status cancelado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate cancelamento_observacao required for certain reasons
    if (status === 'cancelado' && REASONS_REQUIRING_OBSERVATION.includes(cancelamento_motivo) && !cancelamento_observacao) {
      return new Response(
        JSON.stringify({ success: false, error: 'cancelamento_observacao é obrigatório quando motivo é erro_pedido, fraude, devolucao_negada ou outro' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate devolucao_andamento requires devolucao_motivo
    if (status === 'devolucao_andamento' && !devolucao_motivo) {
      return new Response(
        JSON.stringify({ success: false, error: 'devolucao_motivo é obrigatório para status devolucao_andamento' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, status, tracking_number, updated_at')
      .eq('order_number', order_number)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ success: false, error: 'Pedido não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const previousStatus = order.status;

    // Prepare update data
    const updateData: Record<string, any> = {
      status,
      updated_at: new Date().toISOString()
    };

    // If status is 'pago', calculate shipping estimate
    if (status === 'pago') {
      updateData.pago_em = new Date().toISOString();

      // Fetch platform shipping cutoff settings
      const { data: platformSettings } = await supabase
        .from('platform_settings')
        .select('horario_corte_envio, dias_envio')
        .single();

      const horarioCorte = platformSettings?.horario_corte_envio || '11:00';
      const diasEnvio: number[] = (platformSettings?.dias_envio as number[]) || [1, 2, 3, 4, 5];

      // Calculate in Brasilia timezone
      const now = new Date();
      const brasiliaStr = now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
      const brasilia = new Date(brasiliaStr);

      const [corteH, corteM] = String(horarioCorte).split(':').map(Number);
      const hora = brasilia.getHours();
      const minuto = brasilia.getMinutes();
      const diaSemana = brasilia.getDay();

      const diaEnvioMap = diaSemana === 0 ? 7 : diaSemana;
      const antesDoCorte = hora < corteH || (hora === corteH && minuto < corteM);
      const ehDiaEnvio = diasEnvio.includes(diaEnvioMap);

      if (antesDoCorte && ehDiaEnvio) {
        updateData.envio_mesmo_dia = true;
        updateData.estimated_shipping_date = brasilia.toISOString().split('T')[0];
      } else {
        updateData.envio_mesmo_dia = false;
        const next = new Date(brasilia);
        next.setDate(next.getDate() + 1);
        while (!diasEnvio.includes(next.getDay() === 0 ? 7 : next.getDay())) {
          next.setDate(next.getDate() + 1);
        }
        updateData.estimated_shipping_date = next.toISOString().split('T')[0];
      }

      console.log(`Shipping estimate for order ${order_number}: date=${updateData.estimated_shipping_date}, same_day=${updateData.envio_mesmo_dia}`);
    }

    if (tracking_number) updateData.tracking_number = tracking_number;
    if (previsao_envio) updateData.estimated_shipping_date = previsao_envio;
    if (motivo) updateData.status_reason = motivo;
    if (cancelamento_motivo) updateData.cancelamento_motivo = cancelamento_motivo;
    if (cancelamento_observacao) updateData.cancelamento_observacao = cancelamento_observacao;
    if (devolucao_motivo) updateData.devolucao_motivo = devolucao_motivo;
    if (devolucao_observacao) updateData.devolucao_observacao = devolucao_observacao;
    if (motivo_atraso) updateData.motivo_atraso = motivo_atraso;
    if (motivo_falta) updateData.motivo_falta = motivo_falta;

    // Set timestamp fields
    if (status === 'cancelamento_solicitado') updateData.cancelamento_solicitado_em = new Date().toISOString();
    if (status === 'cancelado') updateData.cancelado_em = new Date().toISOString();
    if (status === 'devolucao_andamento') updateData.devolucao_iniciada_em = new Date().toISOString();
    if (status === 'devolucao_recebida') updateData.devolucao_recebida_em = new Date().toISOString();
    if (status === 'devolucao_analise') updateData.devolucao_analisada_em = new Date().toISOString();
    if (status === 'devolucao_aprovada') updateData.devolucao_aprovada_em = new Date().toISOString();
    if (status === 'reembolsado') updateData.reembolsado_em = new Date().toISOString();

    // Update order
    const { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', order.id);

    if (updateError) {
      console.error('Order update error:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao atualizar pedido' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert status history
    await supabase
      .from('order_status_history')
      .insert({
        order_id: order.id,
        status,
        notes: notes || motivo || motivo_atraso || motivo_falta || `Status atualizado via API: ${previousStatus} → ${status}`
      });

    // If em_falta, deactivate products
    if (status === 'em_falta') {
      const { data: items } = await supabase
        .from('order_items')
        .select('product_id')
        .eq('order_id', order.id);

      if (items && items.length > 0) {
        const productIds = items.map(i => i.product_id);
        await supabase
          .from('products')
          .update({ active: false })
          .in('id', productIds);
      }
    }

    console.log(`Order ${order_number} status updated: ${previousStatus} -> ${status}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Status do pedido atualizado com sucesso',
        data: {
          order_id: order.id,
          order_number,
          previous_status: previousStatus,
          new_status: status,
          tracking_number: tracking_number || order.tracking_number || null,
          updated_at: updateData.updated_at
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
