import { supabase } from '@/integrations/supabase/client';
import { buildCsv, downloadCsv } from '@/lib/csv';

const PAGE_SIZE = 500;

/** Busca paginada de todo o catálogo da org (evita limites de resposta). */
async function fetchAllProducts(organizationId: string) {
  const all: Record<string, unknown>[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from('products')
      .select(
        `id, name, sku, gtin_ean13, description, price, cost_price, stock_quantity,
         brand, category_id, stage, approval_status, active, main_image_url, image_url,
         images, weight, height, width, length, specifications, attributes, created_at`,
      )
      .eq('supplier_organization_id', organizationId)
      .order('created_at')
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    all.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}

/** Backup do catálogo em JSON completo (restauração fiel). */
export async function exportCatalogJson(organizationId: string): Promise<number> {
  const products = await fetchAllProducts(organizationId);
  const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), products }, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `lojafy_catalogo_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return products.length;
}

/** Export tabular em CSV (planilha de conferência/re-importação). */
export async function exportCatalogCsv(organizationId: string): Promise<number> {
  const products = await fetchAllProducts(organizationId);
  const csv = buildCsv(
    [
      'nome', 'sku', 'gtin_ean13', 'preco_venda', 'preco_custo', 'estoque', 'marca',
      'estagio', 'aprovacao', 'ativo', 'imagem_url', 'largura_cm', 'altura_cm',
      'comprimento_cm', 'peso_kg', 'descricao',
    ],
    products.map((p) => [
      p.name as string,
      p.sku as string,
      p.gtin_ean13 as string,
      p.price as number,
      p.cost_price as number,
      p.stock_quantity as number,
      p.brand as string,
      p.stage as string,
      p.approval_status as string,
      p.active ? 'sim' : 'não',
      (p.main_image_url ?? p.image_url) as string,
      p.width as number,
      p.height as number,
      p.length as number,
      p.weight as number,
      p.description as string,
    ]),
  );
  downloadCsv(`lojafy_catalogo_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  return products.length;
}
