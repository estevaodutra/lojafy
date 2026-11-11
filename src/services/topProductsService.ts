import { supabase } from '@/integrations/supabase/client';

export interface TopProductCandidate {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost_price: number | null;
  image_url: string | null;
  total_sales_quantity: number;
  total_revenue: number;
  orders_count: number;
}

export interface WeeklyUpdateConfig {
  auto_update_weekly: boolean;
  limit: number;
  notify_on_update: boolean;
  last_updated_at: string | null;
  updated_by?: string;
}

/**
 * Busca os produtos mais vendidos da plataforma com base no processamento de pedidos.
 * Métrica: Quantidade vendida (SUM(quantity)) em pedidos com status de processamento concluído/em andamento.
 */
export async function fetchTopSellingProducts(
  limit: number = 10,
  periodDays?: number
): Promise<TopProductCandidate[]> {
  try {
    let orderItemsQuery = supabase
      .from('order_items')
      .select(`
        product_id,
        quantity,
        unit_price,
        orders!inner (
          id,
          status,
          created_at
        )
      `)
      .in('orders.status', [
        'confirmed',
        'processing',
        'shipped',
        'delivered',
        'approved',
        'paid',
        'concluido',
        'enviado'
      ]);

    if (periodDays && periodDays > 0) {
      const pastDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();
      orderItemsQuery = orderItemsQuery.gte('orders.created_at', pastDate);
    }

    const { data: orderItems, error: itemsError } = await orderItemsQuery;

    if (itemsError) {
      console.warn('Erro ao buscar order_items para ranking:', itemsError);
    }

    // Agrega quantidade e faturamento por produto
    const productSalesMap = new Map<
      string,
      { total_qty: number; total_revenue: number; orderIds: Set<string> }
    >();

    (orderItems || []).forEach((item: any) => {
      if (!item.product_id) return;
      const qty = Number(item.quantity) || 1;
      const price = Number(item.unit_price) || 0;
      const existing = productSalesMap.get(item.product_id) || {
        total_qty: 0,
        total_revenue: 0,
        orderIds: new Set<string>(),
      };
      existing.total_qty += qty;
      existing.total_revenue += qty * price;
      if (item.orders?.id) existing.orderIds.add(item.orders.id);
      productSalesMap.set(item.product_id, existing);
    });

    // Se temos itens vendidos em pedidos reais, ordena por quantidade decrescente
    const sortedProductEntries = Array.from(productSalesMap.entries()).sort(
      (a, b) => b[1].total_qty - a[1].total_qty
    );

    const topProductIds = sortedProductEntries.slice(0, limit).map(([id]) => id);

    let foundProducts: TopProductCandidate[] = [];

    if (topProductIds.length > 0) {
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, sku, price, cost_price, image_url, main_image_url')
        .in('id', topProductIds);

      const productsById = new Map((productsData || []).map((p: any) => [p.id, p]));

      foundProducts = topProductIds
        .map((pid) => {
          const p = productsById.get(pid);
          if (!p) return null;
          const stats = productSalesMap.get(pid)!;
          return {
            id: p.id,
            name: p.name || 'Produto sem nome',
            sku: p.sku || '',
            price: Number(p.price) || 0,
            cost_price: p.cost_price ? Number(p.cost_price) : null,
            image_url: p.image_url || p.main_image_url || null,
            total_sales_quantity: stats.total_qty,
            total_revenue: stats.total_revenue,
            orders_count: stats.orderIds.size,
          };
        })
        .filter(Boolean) as TopProductCandidate[];
    }

    // Se a quantidade de produtos com vendas for menor que o limite solicitado,
    // preenche com produtos ativos mais recentes/destacados para completar a lista
    if (foundProducts.length < limit) {
      const remainingLimit = limit - foundProducts.length;
      const excludeIds = foundProducts.map((p) => p.id);

      let fallbackQuery = supabase
        .from('products')
        .select('id, name, sku, price, cost_price, image_url, main_image_url')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(remainingLimit + 5);

      if (excludeIds.length > 0) {
        fallbackQuery = fallbackQuery.not('id', 'in', `(${excludeIds.join(',')})`);
      }

      const { data: fallbackProducts } = await fallbackQuery;

      (fallbackProducts || []).slice(0, remainingLimit).forEach((p: any) => {
        foundProducts.push({
          id: p.id,
          name: p.name || 'Produto sem nome',
          sku: p.sku || '',
          price: Number(p.price) || 0,
          cost_price: p.cost_price ? Number(p.cost_price) : null,
          image_url: p.image_url || p.main_image_url || null,
          total_sales_quantity: 0,
          total_revenue: 0,
          orders_count: 0,
        });
      });
    }

    return foundProducts.slice(0, limit);
  } catch (error) {
    console.error('Erro em fetchTopSellingProducts:', error);
    throw error;
  }
}

/**
 * Aplica os produtos calculados à tabela feature_produtos.
 * Suporta 'replace' (substituir lista completa com ordenação 1..N)
 * ou 'merge' (manter os produtos já vinculados e adicionar os novos).
 */
export async function applyTopProductsToFeature({
  featureId,
  products,
  mode = 'replace',
}: {
  featureId: string;
  products: { id: string; reference_link?: string | null }[];
  mode?: 'replace' | 'merge';
}): Promise<{ inserted: number }> {
  try {
    // 1. Recupera links de referência existentes para não perder personalizações feitas pelo admin
    const { data: existingRows } = await supabase
      .from('feature_produtos')
      .select('id, produto_id, reference_link, ordem')
      .eq('feature_id', featureId);

    const existingRefMap = new Map<string, string | null>(
      (existingRows || []).map((r: any) => [r.produto_id, r.reference_link])
    );

    if (mode === 'replace') {
      // Remove produtos atuais da feature
      const { error: deleteError } = await supabase
        .from('feature_produtos')
        .delete()
        .eq('feature_id', featureId);

      if (deleteError) throw deleteError;

      // Insere os novos produtos com ordenação 1..N
      const rowsToInsert = products.map((item, index) => ({
        feature_id: featureId,
        produto_id: item.id,
        ordem: index + 1,
        ativo: true,
        reference_link: item.reference_link || existingRefMap.get(item.id) || null,
      }));

      if (rowsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('feature_produtos')
          .insert(rowsToInsert);
        if (insertError) throw insertError;
      }

      return { inserted: rowsToInsert.length };
    } else {
      // Modo 'merge': apenas insere produtos que ainda não estão vinculados
      const existingProductIds = new Set((existingRows || []).map((r: any) => r.produto_id));
      const maxOrdem = (existingRows || []).reduce(
        (max: number, r: any) => Math.max(max, r.ordem || 0),
        0
      );

      const newProducts = products.filter((p) => !existingProductIds.has(p.id));
      const rowsToInsert = newProducts.map((item, index) => ({
        feature_id: featureId,
        produto_id: item.id,
        ordem: maxOrdem + index + 1,
        ativo: true,
        reference_link: item.reference_link || null,
      }));

      if (rowsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('feature_produtos')
          .insert(rowsToInsert);
        if (insertError) throw insertError;
      }

      return { inserted: rowsToInsert.length };
    }
  } catch (error) {
    console.error('Erro em applyTopProductsToFeature:', error);
    throw error;
  }
}

/**
 * Envia notificação para todos os usuários da plataforma sobre a atualização do ranking semanal.
 */
export async function broadcastWeeklyTopProductsNotification(
  limit: number = 10
): Promise<{ success: boolean; sentCount?: number }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const title = `🏆 Top ${limit} Produtos da Semana Atualizado!`;
    const message = `O ranking dos produtos mais vendidos da plataforma foi atualizado com base nos pedidos processados. Confira as novidades em alta!`;
    const type = 'system';
    const action_url = '/ranking';
    const action_label = 'Ver Ranking';
    const metadata = {
      feature: 'top_10_produtos',
      limit,
      updated_at: new Date().toISOString(),
    };

    // 1. Tenta disparar via campanha de notificação do admin
    try {
      if (user) {
        const { data: campaign, error: campaignError } = await supabase
          .from('notification_campaigns')
          .insert({
            created_by: user.id,
            title,
            message,
            type,
            target_audience: 'all',
            action_url,
            action_label,
            metadata,
          })
          .select('id')
          .single();

        if (!campaignError && campaign?.id) {
          const { data: count, error: rpcError } = await supabase.rpc(
            'send_notification_campaign',
            {
              p_campaign_id: campaign.id,
              p_title: title,
              p_message: message,
              p_type: type,
              p_target_audience: 'all',
              p_target_user_ids: [],
              p_action_url: action_url,
              p_action_label: action_label,
              p_metadata: metadata,
            }
          );

          if (!rpcError) {
            return { success: true, sentCount: count || 0 };
          }
        }
      }
    } catch (campaignErr) {
      console.warn('Campanha falhou, utilizando inserção direta em notificações:', campaignErr);
    }

    // 2. Fallback: Busca todos os perfis ativos e insere diretamente na tabela notifications
    const { data: profiles, error: profError } = await supabase
      .from('profiles')
      .select('id');

    if (profError || !profiles || profiles.length === 0) {
      return { success: true, sentCount: 0 };
    }

    const notifRows = profiles.map((p) => ({
      user_id: p.id,
      title,
      message,
      type,
      action_url,
      action_label,
      metadata,
      is_read: false,
    }));

    // Inserção em lotes de 100 para evitar payload grande
    const batchSize = 100;
    for (let i = 0; i < notifRows.length; i += batchSize) {
      const batch = notifRows.slice(i, i + batchSize);
      await supabase.from('notifications').insert(batch);
    }

    return { success: true, sentCount: notifRows.length };
  } catch (error) {
    console.error('Erro ao enviar notificações de ranking:', error);
    return { success: false };
  }
}

/**
 * Executa a atualização periódica/semanal completa:
 * 1. Calcula o ranking com base nos pedidos processados.
 * 2. Atualiza a tabela feature_produtos.
 * 3. Grava o timestamp de atualização nos metadados da feature.
 * 4. Opcionalmente envia a notificação para todos os usuários.
 */
export async function executeWeeklyRankingUpdate({
  featureId,
  limit = 10,
  notify = true,
}: {
  featureId: string;
  limit?: number;
  notify?: boolean;
}): Promise<{
  success: boolean;
  productsUpdated: number;
  notificationsSent: boolean;
}> {
  try {
    // 1. Busca os top produtos mais vendidos em pedidos processados
    const topProducts = await fetchTopSellingProducts(limit);

    if (topProducts.length === 0) {
      throw new Error('Nenhum produto encontrado para gerar o ranking.');
    }

    // 2. Aplica à feature
    const { inserted } = await applyTopProductsToFeature({
      featureId,
      products: topProducts.map((p) => ({ id: p.id })),
      mode: 'replace',
    });

    // 3. Atualiza os metadados da feature com a data da última execução
    const { data: currentFeature } = await supabase
      .from('features')
      .select('metadata')
      .eq('id', featureId)
      .single();

    const currentMetadata = (currentFeature?.metadata as Record<string, any>) || {};
    const updatedConfig: WeeklyUpdateConfig = {
      auto_update_weekly: currentMetadata?.top_ranking_config?.auto_update_weekly ?? true,
      limit,
      notify_on_update: notify,
      last_updated_at: new Date().toISOString(),
      updated_by: 'system',
    };

    await supabase
      .from('features')
      .update({
        metadata: {
          ...currentMetadata,
          top_ranking_config: updatedConfig,
        },
      })
      .eq('id', featureId);

    // 4. Envia notificação a todos os usuários se solicitado
    let notificationsSent = false;
    if (notify) {
      const notifResult = await broadcastWeeklyTopProductsNotification(limit);
      notificationsSent = notifResult.success;
    }

    return {
      success: true,
      productsUpdated: inserted,
      notificationsSent,
    };
  } catch (error) {
    console.error('Erro ao executar atualização semanal do ranking:', error);
    throw error;
  }
}

/**
 * Cadastra um novo produto manual (ex: escalado em outra conta/plataforma externa)
 * e o vincula diretamente à feature de top produtos.
 */
export async function createAndLinkManualProduct({
  featureId,
  productData,
  position = 'end', // 'start' (#1) | 'end' (última posição)
}: {
  featureId: string;
  productData: {
    name: string;
    sku?: string;
    price: number;
    cost_price?: number | null;
    image_url?: string | null;
    reference_link?: string | null;
    description?: string | null;
  };
  position?: 'start' | 'end';
}): Promise<{ product: any; featureProduct: any }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Gera um SKU amigável caso não tenha sido preenchido
    const sku =
      productData.sku?.trim() ||
      `MAN-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    // 1. Cadastra o produto na tabela products para manter integridade de dados e FKs
    const { data: newProduct, error: prodError } = await supabase
      .from('products')
      .insert({
        name: productData.name.trim(),
        sku,
        price: Number(productData.price) || 0,
        cost_price: productData.cost_price ? Number(productData.cost_price) : null,
        image_url: productData.image_url?.trim() || null,
        main_image_url: productData.image_url?.trim() || null,
        description: productData.description?.trim() || null,
        active: true,
        approval_status: 'approved',
        created_by: user?.id || null,
      })
      .select()
      .single();

    if (prodError) throw prodError;

    // 2. Calcula a ordem de inserção
    const { data: existingRows } = await supabase
      .from('feature_produtos')
      .select('id, ordem')
      .eq('feature_id', featureId)
      .order('ordem', { ascending: true });

    let targetOrdem = 1;
    if (position === 'start') {
      targetOrdem = 1;
      // Empurra todos os existentes para baixo
      for (const row of existingRows || []) {
        await supabase
          .from('feature_produtos')
          .update({ ordem: (row.ordem || 0) + 1 })
          .eq('id', row.id);
      }
    } else {
      const maxOrdem = (existingRows || []).reduce(
        (max: number, r: any) => Math.max(max, r.ordem || 0),
        0
      );
      targetOrdem = maxOrdem + 1;
    }

    // 3. Insere em feature_produtos
    const { data: fpData, error: fpError } = await supabase
      .from('feature_produtos')
      .insert({
        feature_id: featureId,
        produto_id: newProduct.id,
        ordem: targetOrdem,
        ativo: true,
        reference_link: productData.reference_link?.trim() || null,
      })
      .select()
      .single();

    if (fpError) throw fpError;

    return {
      product: newProduct,
      featureProduct: fpData,
    };
  } catch (error) {
    console.error('Erro ao cadastrar e vincular produto manual:', error);
    throw error;
  }
}
