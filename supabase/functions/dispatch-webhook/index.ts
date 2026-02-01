import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, any>;
}

async function generateHmacSignature(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const payloadData = encoder.encode(payload);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, payloadData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Fetch last paid order with customer, reseller, items and shipping label
async function fetchLastPaidOrder(supabase: any): Promise<Record<string, any> | null> {
  console.log('[dispatch-webhook] Buscando último pedido pago...');
  
  // Get last paid order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      total_amount,
      payment_method,
      user_id,
      reseller_id,
      created_at
    `)
    .eq('payment_status', 'paid')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (orderError || !order) {
    console.log('[dispatch-webhook] Nenhum pedido pago encontrado:', orderError?.message);
    return null;
  }

  // Get users with email using RPC (includes auth.users data)
  const { data: usersWithEmail } = await supabase.rpc('get_users_with_email');
  
  // Find customer data
  const customerData = usersWithEmail?.find((u: any) => u.user_id === order.user_id);
  const customerEmail = customerData?.email || null;
  const customerProfile = customerData ? {
    first_name: customerData.first_name,
    last_name: customerData.last_name,
    phone: customerData.phone,
  } : null;
  
  // Get reseller store info
  let resellerData = null;
  if (order.reseller_id) {
    const { data: store } = await supabase
      .from('reseller_stores')
      .select('store_name')
      .eq('user_id', order.reseller_id)
      .single();
    
    if (store) {
      resellerData = {
        user_id: order.reseller_id,
        store_name: store.store_name,
      };
    }
  }

  // Get order items with product_snapshot (JSONB)
  const { data: items } = await supabase
    .from('order_items')
    .select(`
      product_id,
      quantity,
      unit_price,
      product_snapshot
    `)
    .eq('order_id', order.id);

  // Get shipping label
  const { data: shippingFile } = await supabase
    .from('order_shipping_files')
    .select('file_name, file_path, file_size, uploaded_at')
    .eq('order_id', order.id)
    .limit(1)
    .maybeSingle();

  let shippingLabel = null;
  if (shippingFile?.file_path) {
    // Generate signed URL (valid for 1 hour)
    const { data: signedUrlData } = await supabase.storage
      .from('shipping-files')
      .createSignedUrl(shippingFile.file_path, 3600);
    
    shippingLabel = {
      file_name: shippingFile.file_name,
      file_size: shippingFile.file_size,
      uploaded_at: shippingFile.uploaded_at,
      download_url: signedUrlData?.signedUrl || null,
    };
  }

  const customerName = customerProfile 
    ? `${customerProfile.first_name || ''} ${customerProfile.last_name || ''}`.trim() || 'Cliente'
    : 'Cliente';

  return {
    order_id: order.id,
    order_number: order.order_number,
    total_amount: order.total_amount,
    payment_method: order.payment_method,
    customer: {
      user_id: order.user_id,
      email: customerEmail || 'email@exemplo.com',
      name: customerName,
      phone: customerProfile?.phone || null,
    },
    reseller: resellerData || {
      user_id: null,
      store_name: null,
    },
    items: (items || []).map((item: any) => ({
      product_id: item.product_id,
      name: item.product_snapshot?.name || 'Produto',
      sku: item.product_snapshot?.sku || null,
      image_url: item.product_snapshot?.image_url || null,
      quantity: item.quantity,
      unit_price: item.unit_price,
    })),
    shipping_label: shippingLabel,
  };
}

// Fetch last created user
async function fetchLastCreatedUser(supabase: any): Promise<Record<string, any> | null> {
  console.log('[dispatch-webhook] Buscando último usuário criado...');
  
  // Use RPC to get users with email (already ordered by created_at DESC)
  const { data: usersWithEmail, error } = await supabase.rpc('get_users_with_email');

  if (error || !usersWithEmail || usersWithEmail.length === 0) {
    console.log('[dispatch-webhook] Nenhum usuário encontrado:', error?.message);
    return null;
  }

  const lastUser = usersWithEmail[0];
  const userName = `${lastUser.first_name || ''} ${lastUser.last_name || ''}`.trim() || 'Usuário';

  return {
    user_id: lastUser.user_id,
    email: lastUser.email || 'email@exemplo.com',
    name: userName,
    phone: lastUser.phone || null,
    role: lastUser.role || 'customer',
    origin: {
      type: 'manual',
      store_id: null,
      store_name: null,
    },
    created_at: lastUser.created_at,
  };
}

// Fetch inactive user by days
async function fetchInactiveUser(supabase: any, days: number): Promise<Record<string, any> | null> {
  console.log(`[dispatch-webhook] Buscando usuário inativo há ${days}+ dias...`);
  
  // Calculate the date threshold
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - days);
  
  // Use RPC to get users with email and last_sign_in_at from auth.users
  const { data: usersWithEmail, error } = await supabase.rpc('get_users_with_email');

  if (error || !usersWithEmail) {
    console.log(`[dispatch-webhook] Erro ao buscar usuários:`, error?.message);
    return null;
  }

  // Filter users inactive for X+ days based on last_sign_in_at
  const inactiveUsers = usersWithEmail.filter((u: any) => {
    if (!u.last_sign_in_at) return false;
    const lastActivity = new Date(u.last_sign_in_at);
    return lastActivity < thresholdDate;
  });

  if (inactiveUsers.length === 0) {
    console.log(`[dispatch-webhook] Nenhum usuário inativo há ${days}+ dias encontrado`);
    return null;
  }

  // Sort by last_sign_in_at ascending to get the most inactive first
  inactiveUsers.sort((a: any, b: any) => 
    new Date(a.last_sign_in_at).getTime() - new Date(b.last_sign_in_at).getTime()
  );

  const user = inactiveUsers[0];
  const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Usuário';
  
  // Calculate actual days inactive
  const lastActivity = new Date(user.last_sign_in_at);
  const now = new Date();
  const daysInactive = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

  return {
    user_id: user.user_id,
    email: user.email || 'email@exemplo.com',
    name: userName,
    role: user.role || 'customer',
    last_sign_in_at: user.last_sign_in_at,
    days_inactive: daysInactive,
    created_at: user.created_at,
  };
}

// Main function to fetch real test data based on event type
async function fetchRealTestData(supabase: any, eventType: string): Promise<{ data: Record<string, any> | null; error: string | null }> {
  switch (eventType) {
    case 'order.paid':
      const orderData = await fetchLastPaidOrder(supabase);
      return {
        data: orderData,
        error: orderData ? null : 'Nenhum pedido pago encontrado para teste',
      };
    
    case 'user.created':
      const userData = await fetchLastCreatedUser(supabase);
      return {
        data: userData,
        error: userData ? null : 'Nenhum usuário encontrado para teste',
      };
    
    case 'user.inactive.7days':
      const inactive7 = await fetchInactiveUser(supabase, 7);
      return {
        data: inactive7,
        error: inactive7 ? null : 'Nenhum usuário inativo há 7+ dias encontrado',
      };
    
    case 'user.inactive.15days':
      const inactive15 = await fetchInactiveUser(supabase, 15);
      return {
        data: inactive15,
        error: inactive15 ? null : 'Nenhum usuário inativo há 15+ dias encontrado',
      };
    
    case 'user.inactive.30days':
      const inactive30 = await fetchInactiveUser(supabase, 30);
      return {
        data: inactive30,
        error: inactive30 ? null : 'Nenhum usuário inativo há 30+ dias encontrado',
      };
    
    default:
      return {
        data: null,
        error: `Evento ${eventType} não suporta dados reais de teste`,
      };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { event_type, payload: providedPayload, is_test = false, use_real_data = false } = body;

    if (!event_type) {
      return new Response(
        JSON.stringify({ success: false, error: 'event_type é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[dispatch-webhook] Disparando evento: ${event_type}, is_test: ${is_test}, use_real_data: ${use_real_data}`);

    // Fetch real data if requested for test
    let payload = providedPayload;
    if (is_test && use_real_data) {
      console.log(`[dispatch-webhook] Buscando dados reais para teste de ${event_type}...`);
      const { data: realData, error: realDataError } = await fetchRealTestData(supabase, event_type);
      
      if (realDataError || !realData) {
        console.log(`[dispatch-webhook] Erro ao buscar dados reais: ${realDataError}`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: realDataError || 'Nenhum dado encontrado para teste' 
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      payload = realData;
      console.log(`[dispatch-webhook] Dados reais encontrados para ${event_type}`);
    }

    // Buscar configuração do webhook
    const { data: webhookConfig, error: configError } = await supabase
      .from('webhook_settings')
      .select('*')
      .eq('event_type', event_type)
      .single();

    if (configError || !webhookConfig) {
      console.error(`[dispatch-webhook] Configuração não encontrada para: ${event_type}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Configuração de webhook não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se está ativo
    if (!webhookConfig.active && !is_test) {
      console.log(`[dispatch-webhook] Webhook ${event_type} está inativo, ignorando`);
      return new Response(
        JSON.stringify({ success: false, error: 'Webhook desativado' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se tem URL configurada
    if (!webhookConfig.webhook_url) {
      console.log(`[dispatch-webhook] Webhook ${event_type} sem URL configurada`);
      return new Response(
        JSON.stringify({ success: false, error: 'URL do webhook não configurada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Montar payload final
    const webhookPayload: WebhookPayload = {
      event: event_type,
      timestamp: new Date().toISOString(),
      data: payload || {},
    };

    if (is_test) {
      webhookPayload.data._test = true;
      webhookPayload.data._test_message = use_real_data 
        ? 'Dados reais do banco de dados (teste)' 
        : 'Este é um evento de teste';
    }

    const payloadString = JSON.stringify(webhookPayload);

    // Gerar assinatura HMAC
    let signature = '';
    if (webhookConfig.secret_token) {
      signature = await generateHmacSignature(webhookConfig.secret_token, payloadString);
    }

    console.log(`[dispatch-webhook] Enviando para: ${webhookConfig.webhook_url}`);

    // Enviar webhook com timeout de 10 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let statusCode = 0;
    let responseBody = '';
    let errorMessage = '';

    try {
      const response = await fetch(webhookConfig.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event_type,
          'X-Webhook-Timestamp': webhookPayload.timestamp,
        },
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      statusCode = response.status;
      responseBody = await response.text().catch(() => '');
      
      console.log(`[dispatch-webhook] Resposta: ${statusCode}`);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        errorMessage = 'Timeout: webhook não respondeu em 10 segundos';
        statusCode = 408;
      } else {
        errorMessage = fetchError.message || 'Erro ao conectar com webhook';
        statusCode = 0;
      }
      console.error(`[dispatch-webhook] Erro no fetch:`, errorMessage);
    }

    // Atualizar status no webhook_settings
    await supabase
      .from('webhook_settings')
      .update({
        last_triggered_at: new Date().toISOString(),
        last_status_code: statusCode,
        last_error_message: errorMessage || null,
      })
      .eq('event_type', event_type);

    // Registrar no log
    await supabase
      .from('webhook_dispatch_logs')
      .insert({
        event_type,
        payload: webhookPayload,
        status_code: statusCode,
        response_body: responseBody.substring(0, 1000), // Limitar tamanho
        error_message: errorMessage || null,
      });

    const success = statusCode >= 200 && statusCode < 300;

    return new Response(
      JSON.stringify({
        success,
        event_type,
        status_code: statusCode,
        error: errorMessage || undefined,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[dispatch-webhook] Erro inesperado:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
