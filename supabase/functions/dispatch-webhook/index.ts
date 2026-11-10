import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { buildOrderItemsPayload } from '../_shared/build-order-items-payload.ts';
import { getPublicSignedUrl } from '../_shared/get-public-signed-url.ts';

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

// Fetch reseller custom fields defined in Recursos > Campos Personalizados
async function fetchResellerCustomFields(
  supabase: any,
  resellerId?: string | null,
  clientCustomFieldValues?: any[]
): Promise<Record<string, any>> {
  const customFields: Record<string, any> = {};
  const allFieldValues: any[] = [];

  // 1. Valores enviados diretamente pelo cliente via frontend
  if (Array.isArray(clientCustomFieldValues) && clientCustomFieldValues.length > 0) {
    allFieldValues.push(...clientCustomFieldValues);
  }

  // 2. Registro persistido em webhook_settings (custom_fields_registry)
  try {
    const { data: registryRow } = await supabase
      .from('webhook_settings')
      .select('last_error_message')
      .eq('event_type', 'custom_fields_registry')
      .maybeSingle();

    if (registryRow?.last_error_message) {
      try {
        const parsed = JSON.parse(registryRow.last_error_message);
        if (Array.isArray(parsed)) {
          allFieldValues.push(...parsed);
        }
      } catch {}
    }
  } catch {}

  // 3. Tabela lead_custom_field_values (caso venha a existir)
  try {
    const { data: tableVals } = await supabase
      .from('lead_custom_field_values')
      .select('*');
    if (Array.isArray(tableVals)) {
      allFieldValues.push(...tableVals);
    }
  } catch {}

  // Filtrar valores correspondentes ao revendedor
  let matchedVals = resellerId 
    ? allFieldValues.filter((v: any) => v.lead_id === resellerId)
    : [];

  // Se não encontrou pelo ID exato, usa os valores cadastrados disponíveis
  if (matchedVals.length === 0 && allFieldValues.length > 0) {
    matchedVals = allFieldValues;
  }

  matchedVals.forEach((item: any) => {
    const key =
      item.field?.key ||
      item.key ||
      (item.field_id === 'cf-grupo-id-001' ? 'id_grupo' : null) ||
      (item.field?.name?.toLowerCase().includes('grupo') ? 'id_grupo' : null) ||
      item.field_name?.toLowerCase().replace(/\s+/g, '_');

    if (key && item.value) {
      customFields[key] = item.value;
    }
  });

  return customFields;
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

  // Buscar email do cliente via admin API (service role, sem restricoes de RLS)
  let customerEmail: string | null = null;
  let customerProfile: { first_name: string; last_name: string; phone: string } | null = null;

  if (order.user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, phone')
      .eq('user_id', order.user_id)
      .single();
    const { data: authUser } = await supabase.auth.admin.getUserById(order.user_id);
    customerEmail = authUser?.user?.email || null;
    if (profile) {
      customerProfile = { first_name: profile.first_name, last_name: profile.last_name, phone: profile.phone };
    }
  }
  
  // Get reseller store info with custom fields
  let resellerData = null;
  if (order.reseller_id) {
    const { data: store } = await supabase
      .from('reseller_stores')
      .select('store_name, slug')
      .eq('user_id', order.reseller_id)
      .maybeSingle();
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, phone, document')
      .eq('user_id', order.reseller_id)
      .maybeSingle();
    let resellerEmail = null;
    try {
      const { data: authUser } = await supabase.auth.admin.getUserById(order.reseller_id);
      resellerEmail = authUser?.user?.email || null;
    } catch {}

    const customFields = await fetchResellerCustomFields(supabase, order.reseller_id);

    resellerData = {
      user_id: order.reseller_id,
      name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Revendedor Lojafy',
      email: resellerEmail,
      phone: profile?.phone || null,
      document: profile?.document || '123.456.789-00',
      store_name: store?.store_name || 'Minha Loja VIP',
      store_url: store?.slug ? `https://lojafy.app/loja/${store.slug}` : 'https://lojafy.app/loja/minha-loja-vip',
      custom_fields: customFields,
    };
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
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let shippingLabel = null;
  if (shippingFile?.file_path) {
    let { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('shipping-files')
      .createSignedUrl(shippingFile.file_path, 604800); // 7 dias
      
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
      email: customerEmail,
      name: customerName,
      phone: customerProfile?.phone || null,
    },
    reseller: resellerData || {
      user_id: null,
      store_name: null,
    },
    items: await buildOrderItemsPayload(supabase, items || []),
    shipping_label: shippingLabel,
  };
}

// Fetch a specific order by id — used to enrich sparse order.paid payloads
async function fetchOrderById(supabase: any, orderId: string): Promise<Record<string, any> | null> {
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, order_number, total_amount, payment_method, user_id, reseller_id, created_at')
    .eq('id', orderId)
    .single();

  if (orderError || !order) return null;

  // Buscar email do cliente via admin API (service role, sem restricoes de RLS)
  let customerProfile: { first_name: string; last_name: string; phone: string } | null = null;
  let customerEmail: string | null = null;

  if (order.user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, phone')
      .eq('user_id', order.user_id)
      .single();
    const { data: authUser } = await supabase.auth.admin.getUserById(order.user_id);
    customerEmail = authUser?.user?.email || null;
    if (profile) {
      customerProfile = { first_name: profile.first_name, last_name: profile.last_name, phone: profile.phone };
    }
  }

  let resellerData = null;
  if (order.reseller_id) {
    const { data: store } = await supabase
      .from('reseller_stores')
      .select('store_name, slug')
      .eq('user_id', order.reseller_id)
      .maybeSingle();
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, phone, document')
      .eq('user_id', order.reseller_id)
      .maybeSingle();
    let resellerEmail = null;
    try {
      const { data: authUser } = await supabase.auth.admin.getUserById(order.reseller_id);
      resellerEmail = authUser?.user?.email || null;
    } catch {}

    const customFields = await fetchResellerCustomFields(supabase, order.reseller_id);

    resellerData = {
      user_id: order.reseller_id,
      name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Revendedor Lojafy',
      email: resellerEmail,
      phone: profile?.phone || null,
      document: profile?.document || '123.456.789-00',
      store_name: store?.store_name || 'Minha Loja VIP',
      store_url: store?.slug ? `https://lojafy.app/loja/${store.slug}` : 'https://lojafy.app/loja/minha-loja-vip',
      custom_fields: customFields,
    };
  }

  const { data: items } = await supabase
    .from('order_items')
    .select('product_id, quantity, unit_price, product_snapshot')
    .eq('order_id', order.id);

  const { data: shippingFile } = await supabase
    .from('order_shipping_files')
    .select('file_name, file_path, file_size, uploaded_at')
    .eq('order_id', order.id)
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let shippingLabel = null;
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
      email: customerEmail,
      name: customerName,
      phone: customerProfile?.phone || null,
    },
    reseller: resellerData || { user_id: null, store_name: null },
    items: await buildOrderItemsPayload(supabase, items || []),
    shipping_label: shippingLabel,
  };
}

// Fetch last ML fulfillment order for real webhook testing
async function fetchLastMlFulfillmentOrder(supabase: any): Promise<Record<string, any>> {
  console.log('[dispatch-webhook] Buscando pedido Mercado Livre para simulação/teste...');
  
  const { data: order } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      total_amount,
      payment_method,
      payment_status,
      status,
      user_id,
      reseller_id,
      ml_order_id,
      ml_shipment_id,
      ml_label_url,
      tracking_code,
      pix_qr_code,
      pix_qr_code_base64,
      payment_expires_at,
      shipping_address,
      created_at
    `)
    .not('ml_order_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const orderId = order?.id || 'ord_ml_mock_12345';
  const orderNumber = order?.order_number || '461';
  const mlOrderId = order?.ml_order_id || '2000008492049';
  const mlShipmentId = order?.ml_shipment_id || '43290184910';
  const tracking = order?.tracking_code || 'BR209481928ML';
  const shippingAddr = (order?.shipping_address as any) || {
    name: 'Carlos Eduardo Oliveira',
    email: 'carlos.oliveira@gmail.com',
    phone: '11987654321',
    cpf: '12345678901',
    city: 'São Paulo',
    state: 'SP',
    zip_code: '01310-100',
    street: 'Av. Paulista',
    number: '1000',
  };

  let resellerData = null;
  const resellerId = order?.reseller_id || 'usr_reseller_mock';
  if (order?.reseller_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, phone')
      .eq('user_id', order.reseller_id)
      .maybeSingle();
    const { data: store } = await supabase
      .from('reseller_stores')
      .select('store_name')
      .eq('user_id', order.reseller_id)
      .maybeSingle();
    let resellerEmail = null;
    try {
      const { data: authUser } = await supabase.auth.admin.getUserById(order.reseller_id);
      resellerEmail = authUser?.user?.email || null;
    } catch {}
    resellerData = {
      id: order.reseller_id,
      name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Revendedor Lojafy',
      email: resellerEmail || 'revendedor@lojafy.app',
      phone: profile?.phone || null,
      store_name: store?.store_name || 'Loja Principal',
    };
  } else {
    resellerData = {
      id: resellerId,
      name: 'Revendedor Demonstração',
      email: 'revendedor@lojafy.app',
      phone: '11999998888',
      store_name: 'Minha Loja Mercado Livre',
    };
  }

  let items: any[] = [
    {
      product_id: 'prod_mock_001',
      name: 'Fone de Ouvido Bluetooth TWS Pro',
      sku: 'FONE-TWS-BLK',
      quantity: 1,
      unit_price: 149.90,
      cost_price: 65.00,
      total_cost: 65.00,
      ml_item_id: 'MLB389201948',
    }
  ];

  if (order?.id) {
    const { data: dbItems } = await supabase
      .from('order_items')
      .select('product_id, quantity, unit_price, total_price, product_snapshot, supplier_id, supplier_unit_cost, supplier_total_cost')
      .eq('order_id', order.id);

    if (dbItems && dbItems.length > 0) {
      items = dbItems.map((i: any) => ({
        product_id: i.product_id,
        name: i.product_snapshot?.name || 'Produto Mercado Livre',
        sku: i.product_snapshot?.sku || null,
        quantity: i.quantity,
        unit_price: i.unit_price,
        cost_price: i.supplier_unit_cost || (i.unit_price * 0.6),
        total_cost: i.supplier_total_cost || ((i.supplier_unit_cost || i.unit_price * 0.6) * i.quantity),
        ml_item_id: i.product_snapshot?.ml_item_id || null,
      }));
    }
  }

  const totalCost = items.reduce((sum: number, i: any) => sum + (Number(i.total_cost) || 0), 0);
  const walletDeducted = Math.min(20.00, totalCost);
  const remainingPix = Math.max(0, totalCost - walletDeducted);

  return {
    order_id: orderId,
    order_number: orderNumber,
    origin: 'mercadolivre',
    ml_order_id: mlOrderId,
    ml_shipment_id: mlShipmentId,
    total_order_amount: order?.total_amount || 149.90,
    supplier_cost: totalCost,
    tracking_code: tracking,
    shipping_label_url: order?.ml_label_url || 'https://api.mercadolibre.com/shipments/demo/labels?response_type=pdf2',
    status: order?.status || 'pendente',
    buyer: {
      user_id: order?.user_id || null,
      email: shippingAddr.email || 'carlos.oliveira@gmail.com',
      name: shippingAddr.name || 'Carlos Eduardo Oliveira',
      phone: shippingAddr.phone || null,
      document: shippingAddr.cpf || null,
      shipping_address: shippingAddr,
    },
    reseller: resellerData,
    supplier: {
      id: 'sup_mock_001',
      name: 'Distribuidora Central Tech',
    },
    items,
    payment: {
      total_cost: totalCost,
      wallet_balance_before: 50.00,
      wallet_deducted: walletDeducted,
      wallet_balance_after: 30.00,
      pix_amount_required: remainingPix,
      pix_qr_code: order?.pix_qr_code || '00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-426614174000520400005303986540545.005802BR5913Lojafy Pagtos6009SAO PAULO62070503***6304ABCD',
      pix_qr_code_base64: order?.pix_qr_code_base64 || null,
      pix_payment_id: order?.payment_id || 'pix_pay_demo_123',
      pix_expires_at: order?.payment_expires_at || new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      is_fully_paid: remainingPix === 0,
    },
  };
}

// Fetch last created user
async function fetchLastCreatedUser(supabase: any): Promise<Record<string, any>> {
  console.log('[dispatch-webhook] Buscando último usuário criado...');
  
  // 1. Tentar via RPC
  try {
    const { data: usersWithEmail, error } = await supabase.rpc('get_users_with_email');
    if (!error && usersWithEmail && usersWithEmail.length > 0) {
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
        created_at: lastUser.created_at || new Date().toISOString(),
      };
    }
  } catch (e) {
    console.warn('[dispatch-webhook] Aviso ao chamar RPC get_users_with_email:', e);
  }

  // 2. Fallback direto na tabela profiles
  try {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name, phone, role, created_at')
      .order('created_at', { ascending: false })
      .limit(1);

    if (profiles && profiles.length > 0) {
      const p = profiles[0];
      let userEmail = 'usuario@exemplo.com';
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(p.user_id);
        if (authUser?.user?.email) userEmail = authUser.user.email;
      } catch {}

      return {
        user_id: p.user_id,
        email: userEmail,
        name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Usuário',
        phone: p.phone || null,
        role: p.role || 'customer',
        origin: {
          type: 'manual',
          store_id: null,
          store_name: null,
        },
        created_at: p.created_at || new Date().toISOString(),
      };
    }
  } catch (e) {
    console.warn('[dispatch-webhook] Aviso ao buscar profiles:', e);
  }

  // 3. Fallback mock realista garantido
  return {
    user_id: 'usr_test_mock_12345',
    email: 'marcelo.silva@exemplo.com',
    name: 'Marcelo B Silva',
    phone: '5519991378299',
    role: 'customer',
    origin: {
      type: 'manual',
      store_id: null,
      store_name: null,
    },
    created_at: new Date().toISOString(),
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

// Universal Order Payload Builder (for order.created, order.updated, etc.)
async function buildUniversalOrderPayload(
  supabase: any,
  orderId?: string,
  extraOptions?: { event_reason?: string; changes?: any; eventType?: string; force_paid?: boolean }
): Promise<Record<string, any>> {
  console.log('[buildUniversalOrderPayload] Buscando pedido no banco de dados...', { orderId, extraOptions });

  let order: any = null;

  if (orderId) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();
    if (error) console.error('[buildUniversalOrderPayload] Erro ao buscar order por ID:', error);
    order = data;
  }

  // Se não foi fornecido orderId ou não encontrou, busca o ÚLTIMO pedido real do sistema
  if (!order) {
    // 1. Tentar ordenar por created_at decrescente (nulls last)
    const { data: latestByDate, error: errDate } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (errDate) {
      console.warn('[buildUniversalOrderPayload] Erro ao ordenar por created_at:', errDate);
    } else if (latestByDate) {
      order = latestByDate;
      console.log(`[buildUniversalOrderPayload] Pedido mais recente encontrado por created_at: #${order.order_number} (${order.id})`);
    }

    // 2. Se ainda não achou, ordenar por order_number decrescente
    if (!order) {
      const { data: latestByNum, error: errNum } = await supabase
        .from('orders')
        .select('*')
        .order('order_number', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (errNum) {
        console.warn('[buildUniversalOrderPayload] Erro ao ordenar por order_number:', errNum);
      } else if (latestByNum) {
        order = latestByNum;
        console.log(`[buildUniversalOrderPayload] Pedido mais recente encontrado por order_number: #${order.order_number} (${order.id})`);
      }
    }
  }

  const effectiveOrderId = order?.id || 'ord_demo_10892';
  const rawOrderNum = order?.order_number != null ? String(order.order_number) : '911';
  const effectiveOrderNum = rawOrderNum.replace(/^LOJ-/, '');
  let effectiveStatus = order?.status || 'pendente';
  if (extraOptions?.force_paid) {
    effectiveStatus = 'pago';
  } else if (extraOptions?.event_reason === 'shipping_label_attached' && effectiveStatus === 'pendente') {
    effectiveStatus = 'recebido';
  }

  // 1. Extrair comprador / endereço
  let customerName = 'Cliente';
  let customerEmail: string | null = null;
  let customerPhone: string | null = null;
  let customerDoc: string | null = null;
  let shippingAddr: any = null;

  if (order?.user_id) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', order.user_id)
        .maybeSingle();
      const { data: authUser } = await supabase.auth.admin.getUserById(order.user_id);
      if (authUser?.user?.email) customerEmail = authUser.user.email;
      if (profile) {
        customerName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || customerName;
        customerPhone = profile.phone || customerPhone;
        customerDoc = profile.document || profile.cpf || customerDoc;
      }
    } catch {}
  }

  const rawAddr = order?.shipping_address || order?.billing_address;
  if (rawAddr) {
    const raw = typeof rawAddr === 'string' ? JSON.parse(rawAddr) : rawAddr;
    if (raw) {
      shippingAddr = {
        street: raw.street || raw.logradouro || raw.address || 'Av. Paulista',
        number: raw.number || raw.numero || '1000',
        complement: raw.complement || raw.complemento || 'Apto 42',
        neighborhood: raw.neighborhood || raw.bairro || 'Bela Vista',
        city: raw.city || raw.cidade || 'São Paulo',
        state: raw.state || raw.uf || raw.estado || 'SP',
        zipcode: raw.zipcode || raw.zip_code || raw.cep || '01310-100',
      };
      const possibleName = raw.receiver_name || raw.name || raw.full_name || (raw.first_name ? [raw.first_name, raw.last_name].filter(Boolean).join(' ') : null);
      if (possibleName) customerName = possibleName;
      if (raw.cpf || raw.document) customerDoc = raw.cpf || raw.document;
      if (raw.phone || raw.telefone || raw.cellphone) customerPhone = raw.phone || raw.telefone || raw.cellphone;
      if (raw.email) customerEmail = raw.email;
    }
  }

  if (order) {
    if (customerName === 'Cliente' && (order as any).customer_name) customerName = (order as any).customer_name;
    if (!customerEmail && (order as any).customer_email) customerEmail = (order as any).customer_email;
    if (!customerPhone && (order as any).customer_phone) customerPhone = (order as any).customer_phone;
  }

  if (!shippingAddr) {
    shippingAddr = {
      street: 'Av. Paulista',
      number: '1000',
      complement: 'Apto 42',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      zipcode: '01310-100',
    };
  }

  // 2. Extrair revendedor e campos personalizados (Recurso: Campos Personalizados)
  let resellerData = null;
  const targetResellerId = order?.reseller_id || order?.user_id;

  if (targetResellerId) {
    let profile: any = null;
    let store: any = null;
    let resellerEmail: string | null = null;

    try {
      const { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', targetResellerId)
        .maybeSingle();
      profile = p;
    } catch {}

    try {
      const { data: s } = await supabase
        .from('reseller_stores')
        .select('*')
        .or(`user_id.eq.${targetResellerId},reseller_id.eq.${targetResellerId}`)
        .maybeSingle();
      store = s;
    } catch {}

    try {
      const { data: authUser } = await supabase.auth.admin.getUserById(targetResellerId);
      if (authUser?.user?.email) resellerEmail = authUser.user.email;
    } catch {}

    const customFields = await fetchResellerCustomFields(supabase, targetResellerId, extraOptions?.clientCustomFieldValues);
    const resellerName = profile ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') : null;

    resellerData = {
      user_id: targetResellerId,
      name: resellerName || store?.store_name || 'Revendedor Lojafy',
      email: resellerEmail || profile?.email || 'revendedor@lojafy.app',
      phone: profile?.phone || '(11) 99999-8888',
      document: profile?.document || profile?.cpf || '123.456.789-00',
      store_name: store?.store_name || 'Minha Loja VIP',
      store_url: store?.slug ? `https://lojafy.app/loja/${store.slug}` : 'https://lojafy.app/loja/minha-loja-vip',
      custom_fields: customFields,
    };
  } else {
    const customFields = await fetchResellerCustomFields(supabase, null, extraOptions?.clientCustomFieldValues);
    resellerData = {
      user_id: '45d2e091-7b9e-4b68-80f4-526bf764f691',
      name: 'João Vendedor',
      email: 'joao.vendedor@exemplo.com',
      phone: '(11) 99999-8888',
      document: '123.456.789-00',
      store_name: 'Minha Loja VIP',
      store_url: 'https://lojafy.app/loja/minha-loja-vip',
      custom_fields: customFields,
    };
  }

  // 3. Extrair itens, fotos e custos de fornecedor
  let items: any[] = [];
  let totalSupplierCost = 0;
  let primarySupplierId: string | null = null;
  const baseUrl = (Deno.env.get('PUBLIC_SITE_URL') || 'https://lojafy.app').replace(/\/$/, '');

  if (order?.id) {
    const { data: dbItems, error: itemsErr } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id);

    if (itemsErr) {
      console.warn('[buildUniversalOrderPayload] Aviso ao buscar order_items:', itemsErr);
    }

    if (dbItems && dbItems.length > 0) {
      const productIds = Array.from(new Set(dbItems.map((i: any) => i.product_id).filter(Boolean)));
      const productMap = new Map<string, any>();
      if (productIds.length > 0) {
        try {
          const { data: dbProducts } = await supabase
            .from('products')
            .select('*')
            .in('id', productIds);
          if (dbProducts) {
            dbProducts.forEach((p: any) => productMap.set(p.id, p));
          }
        } catch {}
      }

      items = dbItems.map((i: any) => {
        const prod = productMap.get(i.product_id);
        const snap = (typeof i.product_snapshot === 'string' ? JSON.parse(i.product_snapshot) : i.product_snapshot) || {};

        const unitCost = Number(i.supplier_unit_cost || i.unit_cost || i.cost_price || prod?.cost_price || (Number(i.unit_price) * 0.6));
        const itemQuantity = Number(i.quantity) || 1;
        const totalCost = Number(i.supplier_total_cost || i.total_cost || (unitCost * itemQuantity));
        totalSupplierCost += totalCost;

        if (!primarySupplierId && (i.supplier_id || prod?.supplier_id || prod?.supplier_organization_id)) {
          primarySupplierId = i.supplier_id || prod?.supplier_id || prod?.supplier_organization_id;
        }

        const imageUrl =
          prod?.main_image_url ||
          prod?.image_url ||
          snap?.main_image_url ||
          snap?.image_url ||
          snap?.image ||
          (Array.isArray(snap?.images) ? snap.images[0] : null) ||
          'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80';

        const productId = i.product_id || prod?.id || '92ba8745-f09b-4389-bd6b-80fc47849e7b';
        const productUrl = `${baseUrl}/produto/${productId}`;
        const catalogUrl = `${baseUrl}/catalogo/produto/${productId}`;

        return {
          product_id: productId,
          sku: snap?.sku || prod?.sku || i.sku || 'TECH-FONE-BT-PRETO',
          name: snap?.name || snap?.title || prod?.name || 'Fone Bluetooth TWS Pro',
          image_url: imageUrl,
          product_url: productUrl,
          catalog_url: catalogUrl,
          quantity: itemQuantity,
          unit_price: Number(i.unit_price) || Number(prod?.price) || 149.90,
          cost_price: Math.round(unitCost * 100) / 100,
        };
      });
    }
  }

  const effectiveAmount = Number(order?.total_amount) || (items.length > 0 ? items.reduce((sum, it) => sum + (it.unit_price * it.quantity), 0) : 149.90);

  if (items.length === 0) {
    items = [
      {
        product_id: '92ba8745-f09b-4389-bd6b-80fc47849e7b',
        sku: 'TECH-FONE-BT-PRETO',
        name: 'Fone Bluetooth TWS Pro',
        image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80',
        product_url: `${baseUrl}/produto/92ba8745-f09b-4389-bd6b-80fc47849e7b`,
        catalog_url: `${baseUrl}/catalogo/produto/92ba8745-f09b-4389-bd6b-80fc47849e7b`,
        quantity: 1,
        unit_price: effectiveAmount,
        cost_price: 85.00,
      }
    ];
    totalSupplierCost = 85.00;
  }

  // 4. Etiqueta de Envio
  let shippingFileRecord = null;
  if (order?.id) {
    const { data: file } = await supabase
      .from('order_shipping_files')
      .select('*')
      .eq('order_id', order.id)
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    shippingFileRecord = file;
  }

  let signedLabelUrl: string | null = null;
  const fileName = shippingFileRecord?.file_name || (order?.ml_order_id ? `etiqueta-${order.ml_order_id}.pdf` : `etiqueta-${effectiveOrderNum}.pdf`);

  if (shippingFileRecord?.file_path) {
    let { data: signedUrlData } = await supabase.storage
      .from('shipping-files')
      .createSignedUrl(shippingFileRecord.file_path, 604800);
    if (!signedUrlData?.signedUrl) {
      const fb = await supabase.storage.from('shipping-labels').createSignedUrl(shippingFileRecord.file_path, 604800);
      signedUrlData = fb.data;
    }
    signedLabelUrl = getPublicSignedUrl(signedUrlData?.signedUrl) || null;
  } else if (order?.ml_label_url) {
    signedLabelUrl = order.ml_label_url;
  }

  const tracking = order?.tracking_code || order?.tracking_number || (order?.ml_order_id ? 'BR104920492ML' : null);
  const carrier = order?.ml_order_id ? 'Mercado Envios' : (order?.carrier || 'Correios / Transportadora');
  const hasLabel = !!signedLabelUrl || extraOptions?.event_reason === 'shipping_label_attached';

  // 5. Dados de Pagamento e Pix
  const pixCode = order?.pix_qr_code || '00020101021226840014br.gov.bcb.pix2562pagamentos.lojafy.app/pix/qr/demo5204000053039865802BR5915LOJAFY TECNOLOGIA6009SAO PAULO62070503***6304ABCD';
  const pixBase64 = order?.pix_qr_code_base64 || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(pixCode)}`;
  const paymentUrl = `https://lojafy.app/pagamento/${effectiveOrderId}`;

  // 6. Configurar event_reason e changes se for order.updated
  const isShippingLabelAttached = extraOptions?.event_reason === 'shipping_label_attached' || !!extraOptions?.changes?.shipping_label;

  let changes = extraOptions?.changes;
  if (!changes && isShippingLabelAttached) {
    changes = {
      shipping_label: {
        attached: true,
        file_name: fileName,
        download_url: signedLabelUrl || `https://lojafy.app/storage/v1/object/sign/shipping-labels/${fileName}?token=demo`,
        tracking_code: tracking || 'BR104920492ML',
        carrier: carrier,
      },
      previous_status: 'pendente',
      current_status: effectiveStatus === 'pendente' ? 'recebido' : effectiveStatus,
    };
  }

  // 7. Nome do fornecedor
  let supplierName = 'Distribuidora Tech Brasil';
  if (primarySupplierId) {
    try {
      const { data: supProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name, trade_name')
        .eq('user_id', primarySupplierId)
        .maybeSingle();
      if (supProfile) {
        supplierName = supProfile.trade_name || [supProfile.first_name, supProfile.last_name].filter(Boolean).join(' ') || supplierName;
      }
    } catch {}
  }

  return {
    ...(extraOptions?.event_reason ? { event_reason: extraOptions.event_reason } : {}),
    ...(changes ? { changes } : {}),
    order_id: effectiveOrderId,
    order_number: effectiveOrderNum,
    status: isShippingLabelAttached && effectiveStatus === 'pendente' ? 'recebido' : effectiveStatus,
    origin: {
      channel: order?.ml_order_id ? 'mercadolivre' : (order?.shopee_order_id ? 'shopee' : (order?.origin_channel || 'loja_propria')),
      channel_order_id: order?.ml_order_id || order?.shopee_order_id || String(order?.order_number || '2000008492049'),
      channel_pack_id: order?.ml_pack_id || null,
    },
    customer: {
      name: customerName,
      document: customerDoc || '123.456.789-00',
      email: customerEmail || 'maria.silva@exemplo.com',
      phone: customerPhone || '(11) 98765-4321',
      shipping_address: shippingAddr,
    },
    shipping: {
      carrier: carrier,
      tracking_code: tracking || (isShippingLabelAttached ? 'BR104920492ML' : null),
      shipping_label_status: hasLabel ? 'ready' : 'pending',
      label_url: signedLabelUrl || (isShippingLabelAttached ? `https://lojafy.app/storage/v1/object/sign/shipping-labels/${fileName}?token=demo` : null),
    },
    payment: {
      payment_method: order?.payment_method || 'pix',
      payment_status: extraOptions?.force_paid ? 'paid' : (order?.payment_status || 'pending'),
      payment_url: paymentUrl,
      total_amount: effectiveAmount,
      pix: {
        copy_paste_code: pixCode,
        qr_code_base64: pixBase64,
        qr_code_image_url: qrCodeImageUrl,
        expires_at: order?.payment_expires_at || new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      },
    },
    financial: {
      total_order_amount: effectiveAmount,
      supplier_cost: Math.round(totalSupplierCost * 100) / 100,
      reseller_profit: Math.round(Math.max(0, effectiveAmount - totalSupplierCost) * 100) / 100,
    },
    reseller: resellerData,
    supplier: {
      id: primarySupplierId || 'supplier-uuid',
      name: supplierName,
    },
    items,
  };
}

async function fetchRealTestData(supabase: any, eventType: string, clientCustomFieldValues?: any[]): Promise<{ data: Record<string, any> | null; error: string | null }> {
  // Para QUALQUER evento de pedido (order.*), SEMPRE buscar dados reais do ÚLTIMO pedido do banco de dados!
  if (eventType.startsWith('order.')) {
    console.log(`[dispatch-webhook] fetchRealTestData: Buscando ÚLTIMO pedido real para o evento ${eventType}...`);
    const options: any = { eventType, clientCustomFieldValues };
    if (eventType === 'order.updated') {
      options.event_reason = 'shipping_label_attached';
    } else if (eventType === 'order.paid') {
      options.force_paid = true;
    }
    const realOrderData = await buildUniversalOrderPayload(supabase, undefined, options);
    return {
      data: realOrderData,
      error: realOrderData ? null : 'Nenhum pedido encontrado no banco de dados',
    };
  }

  switch (eventType) {
    
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

    const body = await req.json().catch(() => ({}));
    const { 
      event_type, 
      payload: providedPayload, 
      is_test = false, 
      use_real_data = false, 
      ignore_deduplication = false,
      webhook_url: overrideUrl,
      secret_token: overrideToken,
      client_custom_field_values: clientCustomFieldValues
    } = body;

    if (!event_type) {
      return new Response(
        JSON.stringify({ success: false, error: 'event_type é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[dispatch-webhook] Disparando evento: ${event_type}, is_test: ${is_test}, use_real_data: ${use_real_data}, overrideUrl: ${overrideUrl || 'none'}`);

    // Processamento do payload (Teste com dados reais vs Produção)
    let payload = providedPayload;

    if (is_test && use_real_data) {
      console.log(`[dispatch-webhook] Modo TESTE: Buscando dados reais do banco para ${event_type}...`);
      try {
        const { data: realData, error: realErr } = await fetchRealTestData(supabase, event_type, clientCustomFieldValues);
        if (realData) {
          payload = realData;
          console.log(`[dispatch-webhook] ✅ Dados reais encontrados para ${event_type}: Pedido ${payload.order_number || payload.order_id}`);
        } else {
          console.warn(`[dispatch-webhook] Dados reais não encontrados para ${event_type}: ${realErr}`);
        }
      } catch (err) {
        console.error(`[dispatch-webhook] Erro ao buscar dados reais para ${event_type}:`, err);
      }
    } else if (!is_test) {
      // Produção: Auto-enriquecimento do pedido real
      const targetOrderId = payload?.order_id || body.order_id;
      if (event_type === 'order.paid' && !ignore_deduplication && targetOrderId) {
        console.log(`[dispatch-webhook] Enriquecendo payload para order.paid ${targetOrderId}`);
        const enriched = await fetchOrderById(supabase, targetOrderId);
        if (enriched) {
          payload = { ...enriched, ...(payload || {}) };
        }
      } else if ((event_type === 'order.created' || event_type === 'order.updated') && targetOrderId) {
        console.log(`[dispatch-webhook] Enriquecendo payload universal para ${event_type} (order: ${targetOrderId})`);
        const enriched = await buildUniversalOrderPayload(supabase, targetOrderId, {
          event_reason: body.event_reason || payload?.event_reason,
          changes: body.changes || payload?.changes,
          clientCustomFieldValues,
        });
        if (enriched) {
          payload = { ...enriched, ...(payload || {}) };
        }
      }
    }

    if (!payload) {
      payload = providedPayload || {
        _test: true,
        event: event_type,
        timestamp: new Date().toISOString(),
      };
    }

    // Identificar URLs de destino: overrideUrl direto ou busca em registered_webhooks / webhook_settings
    interface TargetEndpoint {
      url: string;
      token?: string;
      name?: string;
    }
    const targets: TargetEndpoint[] = [];

    if (overrideUrl) {
      targets.push({ url: overrideUrl, token: overrideToken || '', name: 'Teste / Override' });
    } else {
      // 1. Tentar ler do registro de webhooks cadastrados
      const { data: registryConfig } = await supabase
        .from('webhook_settings')
        .select('*')
        .eq('event_type', 'registered_webhooks')
        .maybeSingle();

      if (registryConfig?.last_error_message) {
        try {
          const list = JSON.parse(registryConfig.last_error_message);
          if (Array.isArray(list)) {
            const matches = list.filter((w: any) =>
              (w.active || is_test) && w.url && Array.isArray(w.events) && w.events.includes(event_type)
            );
            matches.forEach((m: any) => {
              targets.push({
                url: m.url,
                token: m.token || registryConfig.secret_token || '',
                name: m.name,
              });
            });
          }
        } catch (e) {
          console.error('[dispatch-webhook] Erro ao parsear registered_webhooks:', e);
        }
      }

      // 2. Fallback para configuração legada por tipo de evento
      if (targets.length === 0) {
        const { data: legacyConfig } = await supabase
          .from('webhook_settings')
          .select('*')
          .eq('event_type', event_type)
          .maybeSingle();

        if (legacyConfig && (legacyConfig.active || is_test) && legacyConfig.webhook_url) {
          targets.push({
            url: legacyConfig.webhook_url,
            token: legacyConfig.secret_token || '',
            name: legacyConfig.name || `Webhook ${event_type}`,
          });
        }
      }
    }

    if (targets.length === 0) {
      console.log(`[dispatch-webhook] Nenhum webhook ativo encontrado para o evento: ${event_type}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Nenhum webhook ativo configurado para o evento "${event_type}". Acesse Recursos > Webhooks no painel para cadastrar uma URL.` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deduplicacao atomica contra Race Conditions e disparos simultaneos
    if (event_type === 'order.paid' && !is_test && !ignore_deduplication && payload?.order_id) {
      // Tentar atualizar o webhook_paid_status para 'sending' apenas se ainda NAO for 'sent' nem 'sending'
      const { data: lockOrder, error: lockError } = await supabase
        .from('orders')
        .update({ 
          webhook_paid_status: 'sending',
          webhook_paid_dispatched_at: new Date().toISOString()
        })
        .eq('id', payload.order_id)
        .or('webhook_paid_status.is.null,webhook_paid_status.eq.failed')
        .select('id, order_number, webhook_paid_status');

      if (lockError || !lockOrder || lockOrder.length === 0) {
        console.log(`[dispatch-webhook] Deduplicacao (Atomic Lock): order.paid para ${payload.order_id} ja foi enviado ou esta sendo enviado por outra requisicao simultanea, ignorando.`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            deduplicated: true,
            message: 'Webhook ja disparado ou em processamento por outra requisicao concorrente' 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[dispatch-webhook] Lock de envio adquirido com sucesso para pedido ${lockOrder[0]?.order_number || payload.order_id}`);
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

    // Timeout: 60s para order.paid (n8n pode demorar), 15s para outros eventos
    const timeoutMs = event_type === 'order.paid' ? 60000 : 15000;

    // Disparar em paralelo para todos os endpoints configurados
    const dispatchResults = await Promise.all(
      targets.map(async (target) => {
        let signature = '';
        if (target.token) {
          signature = await generateHmacSignature(target.token, payloadString);
        }

        console.log(`[dispatch-webhook] Enviando para: ${target.url} (${target.name || 'sem nome'})`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        let statusCode = 0;
        let responseBody = '';
        let errorMessage = '';

        try {
          const response = await fetch(target.url, {
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
          console.log(`[dispatch-webhook] Resposta de ${target.url}: ${statusCode}`);
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          if (fetchError?.name === 'AbortError') {
            errorMessage = `Timeout: webhook não respondeu em ${timeoutMs / 1000} segundos`;
            statusCode = 408;
          } else {
            errorMessage = fetchError?.message || 'Erro ao conectar com webhook';
            statusCode = 0;
          }
          console.error(`[dispatch-webhook] Erro no fetch para ${target.url}:`, errorMessage);
        }

        // Registrar no log
        await supabase
          .from('webhook_dispatch_logs')
          .insert({
            event_type,
            payload: { ...webhookPayload, _target_url: target.url, _target_name: target.name },
            status_code: statusCode,
            response_body: responseBody.substring(0, 1000), // Limitar tamanho
            error_message: errorMessage || null,
          });

        return {
          url: target.url,
          name: target.name,
          statusCode,
          responseBody,
          errorMessage,
          success: statusCode >= 200 && statusCode < 300,
        };
      })
    );

    const atLeastOneSuccess = dispatchResults.some(r => r.success);
    const primaryResult = dispatchResults[0];

    // Atualizar status no webhook_settings
    await supabase
      .from('webhook_settings')
      .update({
        last_triggered_at: new Date().toISOString(),
        last_status_code: primaryResult.statusCode,
        last_error_message: primaryResult.errorMessage || null,
      })
      .eq('event_type', event_type);

    // Marcar status do envio do webhook no pedido (apenas order.paid em produção)
    if (event_type === 'order.paid' && !is_test && payload?.order_id) {
      const updatePayload: Record<string, any> = {
        webhook_paid_status: atLeastOneSuccess ? 'sent' : 'failed',
        webhook_paid_dispatched_at: new Date().toISOString(),
        webhook_paid_error: atLeastOneSuccess
          ? null
          : `${primaryResult.statusCode} - ${(primaryResult.errorMessage || primaryResult.responseBody || '').toString().substring(0, 500)}`,
      };
      const { error: updErr } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', payload.order_id);
      if (updErr) {
        console.error('[dispatch-webhook] Erro ao atualizar webhook_paid_status:', updErr.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: atLeastOneSuccess,
        event_type,
        dispatches: dispatchResults,
        status_code: primaryResult.statusCode,
        error: atLeastOneSuccess ? undefined : primaryResult.errorMessage || `Webhook retornou HTTP ${primaryResult.statusCode}`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[dispatch-webhook] Erro inesperado:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
