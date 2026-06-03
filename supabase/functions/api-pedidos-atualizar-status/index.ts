import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

const VALID_STATUSES = [
  'pendente',
  'pago',
  'recebido',
  'enviado',
  'etiqueta_incorreta'
];

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
      order_number, status, tracking_number, notes, previsao_envio, motivo
    } = body;

    if (!order_number || !status) {
      return new Response(
        JSON.stringify({ success: false, error: 'order_number e status são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!VALID_STATUSES.includes(status)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Status inválido. Use: ${VALID_STATUSES.join(', ')}` 
        }),
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
        notes: notes || motivo || `Status atualizado via API: ${previousStatus} → ${status}`
      });

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
