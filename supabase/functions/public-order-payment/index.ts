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

function formatCpf(cpf: string): string {
  if (!cpf) return '';
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `${cleaned.substring(0, 3)}.***.***-${cleaned.substring(9)}`;
  }
  return cpf;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let orderIdentifier = '';

    if (req.method === 'GET') {
      const url = new URL(req.url);
      orderIdentifier = url.searchParams.get('id') || url.searchParams.get('order_id') || url.searchParams.get('order_number') || '';
    } else {
      const body = await req.json().catch(() => ({}));
      orderIdentifier = body.order_id || body.id || body.order_number || '';
    }

    if (!orderIdentifier) {
      return new Response(
        JSON.stringify({ error: 'Identificador do pedido (id ou order_number) é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar pedido completo (usando service role key - seguro para anon publico pois sanitizamos a saida)
    let query = supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        payment_status,
        payment_method,
        total_amount,
        created_at,
        payment_expires_at,
        pix_qr_code,
        pix_qr_code_base64,
        shipping_address,
        user_id,
        order_items (
          id,
          product_id,
          quantity,
          unit_price,
          total_price,
          product_snapshot
        )
      `);

    // Checar se e UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderIdentifier);
    if (isUuid) {
      query = query.eq('id', orderIdentifier);
    } else {
      query = query.eq('order_number', orderIdentifier);
    }

    const { data: order, error: orderError } = await query.maybeSingle();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: 'Pedido não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitizar dados do cliente a partir de shipping_address ou profile
    const shippingAddr = (order.shipping_address as Record<string, any>) || {};
    let customerName = shippingAddr.name || shippingAddr.receiver_name || '';
    let customerCpf = shippingAddr.cpf || shippingAddr.document || '';

    if (!customerName && order.user_id) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, cpf')
          .eq('user_id', order.user_id)
          .maybeSingle();
        if (profile) {
          customerName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Cliente';
          if (!customerCpf && profile.cpf) customerCpf = profile.cpf;
        }
      } catch {}
    }

    if (!customerName) customerName = 'Cliente';

    // Itens sanitizados - NENHUM dado de fornecedor ou custos internos
    const items = ((order.order_items as any[]) || []).map((it) => {
      const snap = it.product_snapshot || {};
      return {
        id: it.id,
        product_id: it.product_id,
        name: snap.name || snap.title || 'Produto',
        sku: snap.sku || null,
        quantity: it.quantity,
        unit_price: it.unit_price,
        total_price: it.total_price || (it.unit_price * it.quantity),
        image_url: snap.image_url || (Array.isArray(snap.images) ? snap.images[0] : null) || null,
      };
    });

    const copyPaste = order.pix_qr_code || null;
    const base64 = order.pix_qr_code_base64 || null;
    const qrImageUrl = copyPaste
      ? `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(copyPaste)}`
      : (base64 ? `data:image/png;base64,${base64}` : null);

    const isPaid = order.payment_status === 'paid' || order.status === 'pago' || order.status === 'recebido' || order.status === 'enviado';

    return new Response(
      JSON.stringify({
        success: true,
        order: {
          id: order.id,
          order_number: order.order_number,
          status: order.status,
          payment_status: isPaid ? 'paid' : (order.payment_status || 'pending'),
          payment_method: order.payment_method || 'pix',
          total_amount: order.total_amount,
          created_at: order.created_at,
          payment_expires_at: order.payment_expires_at || null,
          customer: {
            name: customerName,
            cpf_masked: formatCpf(customerCpf),
            city: shippingAddr.city || null,
            state: shippingAddr.state || null,
            neighborhood: shippingAddr.neighborhood || null,
          },
          items,
          pix: {
            copy_paste_code: copyPaste,
            qr_code_base64: base64,
            qr_code_image_url: qrImageUrl,
            expires_at: order.payment_expires_at || null,
          },
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[public-order-payment] Erro inesperado:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Erro interno ao consultar pagamento' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
