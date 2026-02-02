import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

// Status aceitos pela API (português)
const VALID_STATUSES = [
  'pendente',
  'em_preparacao',
  'despachado',
  'finalizado',
  'cancelado',
  'reembolsado'
];

// Mapeamento PT -> EN (para salvar no banco)
const STATUS_PT_TO_EN: Record<string, string> = {
  'pendente': 'pending',
  'em_preparacao': 'processing',
  'despachado': 'shipped',
  'finalizado': 'delivered',
  'cancelado': 'cancelled',
  'reembolsado': 'refunded'
};

// Mapeamento EN -> PT (para retornar na API)
const STATUS_EN_TO_PT: Record<string, string> = {
  'pending': 'pendente',
  'processing': 'em_preparacao',
  'shipped': 'despachado',
  'delivered': 'finalizado',
  'cancelled': 'cancelado',
  'refunded': 'reembolsado'
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow PUT method
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

    // Verify API Key and get permissions
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('id, user_id, permissions, active')
      .eq('api_key', apiKey)
      .single();

    if (keyError || !keyData) {
      console.error('API Key validation error:', keyError);
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

    // Check pedidos.write permission
    const permissions = keyData.permissions as Record<string, any> || {};
    const hasPedidosWrite = permissions?.pedidos?.write === true;

    if (!hasPedidosWrite) {
      return new Response(
        JSON.stringify({ success: false, error: 'Permissão pedidos.write não concedida' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last_used timestamp
    await supabase
      .from('api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('id', keyData.id);

    // Parse request body
    const body = await req.json();
    const { order_number, status, tracking_number, notes } = body;

    // Validate required fields
    if (!order_number || !status) {
      return new Response(
        JSON.stringify({ success: false, error: 'order_number e status são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate status (deve ser em português)
    if (!VALID_STATUSES.includes(status)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Status inválido. Use: ${VALID_STATUSES.join(', ')}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Converter status PT -> EN para salvar no banco
    const internalStatus = STATUS_PT_TO_EN[status];

    // Find order by order_number
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, status, tracking_number, updated_at')
      .eq('order_number', order_number)
      .single();

    if (orderError || !order) {
      console.error('Order lookup error:', orderError);
      return new Response(
        JSON.stringify({ success: false, error: 'Pedido não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const previousStatusEN = order.status;
    // Converter status anterior EN -> PT para resposta
    const previousStatusPT = STATUS_EN_TO_PT[previousStatusEN] || previousStatusEN;

    // Prepare update data
    const updateData: Record<string, any> = {
      status: internalStatus, // Salvar em inglês
      updated_at: new Date().toISOString()
    };

    // Add tracking_number if provided
    if (tracking_number) {
      updateData.tracking_number = tracking_number;
    }

    // Update order
    const { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', order.id);

    if (updateError) {
      console.error('Order update error:', updateError);
      
      // Check for constraint violation
      if (updateError.code === '23514') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Status inválido para o banco de dados. Contate o suporte.` 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao atualizar pedido' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert into order_status_history (salvar status interno em inglês)
    const { error: historyError } = await supabase
      .from('order_status_history')
      .insert({
        order_id: order.id,
        status: internalStatus, // Status interno em inglês
        notes: notes || `Status atualizado via API: ${previousStatusPT} → ${status}`
      });

    if (historyError) {
      console.warn('History insert warning:', historyError);
      // Don't fail the request, just log the warning
    }

    console.log(`Order ${order_number} status updated: ${previousStatusEN} -> ${internalStatus} (API: ${previousStatusPT} -> ${status})`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Status do pedido atualizado com sucesso',
        data: {
          order_id: order.id,
          order_number: order_number,
          previous_status: previousStatusPT, // Retornar em português
          new_status: status, // Retornar em português (como recebido)
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
