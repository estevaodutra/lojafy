import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { buildOrderItemsPayload } from '../_shared/build-order-items-payload.ts';
import { getPublicSignedUrl } from '../_shared/get-public-signed-url.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  pendente: 'Pedido Gerado > Aguardando Pagamento',
  pago: 'Pedido Pago > Aguardando Recebimento da Expedição',
  recebido: 'Pedido Recebido > Aguardando Envio',
  embalado: 'Embalado > Aguardando Envio',
  enviado: 'Pedido Enviado',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
  etiqueta_incorreta: 'Erro | Etiqueta Incorreta',
};

function formatCPF(cpf: string): string {
  if (!cpf) return '';
  const cleaned = cpf.replace(/\D/g, '');
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatPhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
}

function parseShippingStatusFilter(statusParam: string | null): string[] {
  if (!statusParam) return [];
  
  const tokens = statusParam.split(',').map(s => s.trim()).filter(Boolean);
  const resolvedStatuses = new Set<string>();

  const KNOWN_STATUSES = [
    'pendente',
    'pago',
    'recebido',
    'embalado',
    'enviado',
    'finalizado',
    'cancelado',
    'etiqueta_incorreta'
  ];

  for (const token of tokens) {
    const lower = token.toLowerCase();

    if (KNOWN_STATUSES.includes(lower)) {
      resolvedStatuses.add(lower);
      continue;
    }

    if (
      lower.includes('pago') || 
      lower.includes('recebimento') || 
      lower.includes('expedição') || 
      lower.includes('expedicao')
    ) {
      resolvedStatuses.add('pago');
    } else if (lower.includes('pendente') || lower.includes('pagamento')) {
      resolvedStatuses.add('pendente');
    } else if (lower.includes('recebido')) {
      resolvedStatuses.add('recebido');
    } else if (lower.includes('embalado')) {
      resolvedStatuses.add('embalado');
    } else if (lower.includes('enviado')) {
      resolvedStatuses.add('enviado');
    } else if (lower.includes('finalizado')) {
      resolvedStatuses.add('finalizado');
    } else if (lower.includes('cancelado')) {
      resolvedStatuses.add('cancelado');
    } else if (lower.includes('etiqueta') || lower.includes('incorreta')) {
      resolvedStatuses.add('etiqueta_incorreta');
    } else {
      resolvedStatuses.add(token);
    }
  }

  return Array.from(resolvedStatuses);
}

function getPeriodFilter(period: string) {
  const now = new Date();
  let startDate: Date;
  let endDate: Date | null = null;
  
  switch(period) {
    case 'today':
      startDate = new Date(now.setHours(0, 0, 0, 0));
      break;
    case 'yesterday':
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      startDate = new Date(yesterday.setHours(0, 0, 0, 0));
      endDate = new Date(yesterday.setHours(23, 59, 59, 999));
      break;
    case '7days':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '14days':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 14);
      break;
    case '30days':
    default:
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30);
      break;
  }
  
  return { startDate, endDate };
}

async function buildOrderWebhookPayload(supabase: any, fullOrder: any): Promise<Record<string, any>> {
  let customerData: any = null;
  if (fullOrder.user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name, phone, cpf')
      .eq('user_id', fullOrder.user_id)
      .single();
    
    let customerEmail: string | null = null;
    try {
      const { data: authUser } = await supabase.auth.admin.getUserById(fullOrder.user_id);
      customerEmail = authUser?.user?.email || null;
    } catch (_e) {
      customerEmail = null;
    }

    const fullName = profile 
      ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') 
      : 'Cliente';

    customerData = {
      user_id: fullOrder.user_id,
      email: customerEmail,
      name: fullName || 'Cliente',
      phone: profile?.phone ? formatPhone(profile.phone) : null,
      cpf: profile?.cpf ? formatCPF(profile.cpf) : null,
    };
  } else {
    customerData = {
      user_id: null,
      email: fullOrder.customer_email || null,
      name: fullOrder.customer_name || 'Cliente',
      phone: fullOrder.customer_phone ? formatPhone(fullOrder.customer_phone) : null,
      cpf: fullOrder.customer_cpf ? formatCPF(fullOrder.customer_cpf) : null,
    };
  }

  let resellerData: any = null;
  if (fullOrder.reseller_id) {
    const { data: resellerStore } = await supabase
      .from('reseller_stores')
      .select('user_id, store_name')
      .eq('user_id', fullOrder.reseller_id)
      .maybeSingle();
    
    if (resellerStore) {
      resellerData = {
        user_id: resellerStore.user_id,
        store_name: resellerStore.store_name,
      };
    }
  }

  let shippingLabel: any = null;
  const { data: shippingFile } = await supabase
    .from('order_shipping_files')
    .select('file_name, file_path, file_size, uploaded_at')
    .eq('order_id', fullOrder.id)
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (shippingFile?.file_path) {
    let { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('shipping-files')
      .createSignedUrl(shippingFile.file_path, 604800);
      
    if (signedUrlError || !signedUrlData?.signedUrl) {
      const fallback = await supabase.storage
        .from('shipping-labels')
        .createSignedUrl(shippingFile.file_path, 604800);
      signedUrlData = fallback.data;
    }
    
    shippingLabel = {
      file_name: shippingFile.file_name,
      file_size: shippingFile.file_size,
      uploaded_at: shippingFile.uploaded_at,
      download_url: getPublicSignedUrl(signedUrlData?.signedUrl) || null,
    };
  }

  const items = await buildOrderItemsPayload(supabase, fullOrder.order_items || []);
  const statusEnvioLabel = ORDER_STATUS_LABELS[fullOrder.status as string] || fullOrder.status;

  return {
    order_id: fullOrder.id,
    order_number: fullOrder.order_number,
    total_amount: fullOrder.total_amount,
    payment_status: fullOrder.payment_status || 'paid',
    payment_method: fullOrder.payment_method || 'pix',
    payment_id: fullOrder.payment_id || null,
    external_reference: fullOrder.external_reference || null,
    status: fullOrder.status,
    shipping_status: fullOrder.status,
    shipping_status_label: statusEnvioLabel,
    status_envio: fullOrder.status,
    status_envio_label: statusEnvioLabel,
    created_at: fullOrder.created_at,
    updated_at: fullOrder.updated_at,
    tracking_number: fullOrder.tracking_number || null,
    customer: customerData,
    reseller: resellerData || { user_id: null, store_name: null },
    items,
    shipping_address: fullOrder.shipping_address || null,
    billing_address: fullOrder.billing_address || null,
    shipping_label: shippingLabel,
    notes: fullOrder.notes || null,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = req.headers.get('X-API-Key') || req.headers.get('x-api-key');
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'API Key é obrigatória. Use o header X-API-Key' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: apiKeyData, error: apiKeyError } = await supabaseClient
      .from('api_keys')
      .select('*')
      .eq('api_key', apiKey)
      .eq('active', true)
      .single();

    if (apiKeyError || !apiKeyData) {
      return new Response(
        JSON.stringify({ success: false, error: 'API Key inválida ou inativa' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const permissions = apiKeyData.permissions || {};
    const hasPermission = permissions.pedidos?.read || permissions.orders?.read;
    
    if (!hasPermission) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Esta API Key não possui permissão de leitura de pedidos' 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabaseClient
      .from('api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('id', apiKeyData.id);

    const url = new URL(req.url);
    const orderNumberParam = url.searchParams.get('order_number');
    const idParam = url.searchParams.get('id');
    const externalRefParam = url.searchParams.get('external_reference');
    const paymentIdParam = url.searchParams.get('payment_id');

    if (orderNumberParam || idParam || externalRefParam || paymentIdParam) {
      let singleQuery = supabaseClient
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            product_id,
            quantity,
            unit_price,
            product_snapshot
          )
        `);

      if (idParam) {
        singleQuery = singleQuery.eq('id', idParam);
      } else if (orderNumberParam) {
        const cleanOrderNumber = orderNumberParam.replace(/^ORD-/i, '');
        if (/^\d+$/.test(cleanOrderNumber)) {
          singleQuery = singleQuery.eq('order_number', parseInt(cleanOrderNumber, 10));
        } else {
          singleQuery = singleQuery.eq('external_reference', orderNumberParam);
        }
      } else if (externalRefParam) {
        singleQuery = singleQuery.eq('external_reference', externalRefParam);
      } else if (paymentIdParam) {
        singleQuery = singleQuery.eq('payment_id', paymentIdParam);
      }

      const { data: singleOrder, error: singleError } = await singleQuery.maybeSingle();

      if (singleError || !singleOrder) {
        return new Response(
          JSON.stringify({ success: false, error: 'Pedido não encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const webhookPayload = await buildOrderWebhookPayload(supabaseClient, singleOrder);

      return new Response(
        JSON.stringify({
          success: true,
          event: 'order.paid',
          data: webhookPayload
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const period = url.searchParams.get('period') || '30days';
    const dateParam = url.searchParams.get('date');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const page = Math.max(parseInt(url.searchParams.get('page') || '1'), 1);
    const shippingStatusParam = url.searchParams.get('shipping_status') || 
                               url.searchParams.get('status_envio') || 
                               url.searchParams.get('status');
    const paymentStatusParam = url.searchParams.get('payment_status') || 'paid';

    const parsedShippingStatuses = parseShippingStatusFilter(shippingStatusParam);

    let startDate: Date;
    let endDate: Date | null = null;

    if (dateParam) {
      const dmyRegex = /^(\d{2})-(\d{2})-(\d{4})$/;
      const ymdRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
      
      let day = 0, month = 0, year = 0;
      let isValidFormat = false;
      
      if (dmyRegex.test(dateParam)) {
        const matches = dateParam.match(dmyRegex)!;
        day = parseInt(matches[1], 10);
        month = parseInt(matches[2], 10) - 1;
        year = parseInt(matches[3], 10);
        isValidFormat = true;
      } else if (ymdRegex.test(dateParam)) {
        const matches = dateParam.match(ymdRegex)!;
        year = parseInt(matches[1], 10);
        month = parseInt(matches[2], 10) - 1;
        day = parseInt(matches[3], 10);
        isValidFormat = true;
      }
      
      if (!isValidFormat) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Formato de data inválido. Use dd-mm-yyyy ou yyyy-mm-dd' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      startDate = new Date(Date.UTC(year, month, day, 3, 0, 0, 0));
      endDate = new Date(Date.UTC(year, month, day + 1, 2, 59, 59, 999));
    } else {
      const periodResult = getPeriodFilter(period);
      startDate = periodResult.startDate;
      endDate = periodResult.endDate;
    }

    const offset = (page - 1) * limit;

    let query = supabaseClient
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_id,
          quantity,
          unit_price,
          product_snapshot
        )
      `, { count: 'exact' });

    if (endDate) {
      query = query
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
    } else {
      query = query.gte('created_at', startDate.toISOString());
    }

    if (paymentStatusParam && paymentStatusParam !== 'all') {
      query = query.eq('payment_status', paymentStatusParam);
    }

    if (parsedShippingStatuses.length === 1) {
      query = query.eq('status', parsedShippingStatuses[0]);
    } else if (parsedShippingStatuses.length > 1) {
      query = query.in('status', parsedShippingStatuses);
    }

    const { data: ordersData, error: ordersError, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (ordersError) {
      throw ordersError;
    }

    const webhookPayloads = await Promise.all(
      (ordersData || []).map(order => buildOrderWebhookPayload(supabaseClient, order))
    );

    const totalPages = count ? Math.ceil(count / limit) : 1;

    return new Response(
      JSON.stringify({
        success: true,
        event: 'order.paid',
        data: webhookPayloads,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        period: dateParam ? null : period,
        date: dateParam || null,
        filters: {
          payment_status: paymentStatusParam,
          shipping_status: shippingStatusParam || null
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[api-webhook-buscar-pedido] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
