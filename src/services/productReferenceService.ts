import { supabase } from '@/integrations/supabase/client';
import { computeCompatibilityScore } from '@/lib/referenceScoring';
import { isValidGtin } from '@/lib/gtin';
import type { Database } from '@/integrations/supabase/types';

// Busca pública na API do Mercado Livre direto do navegador — mesmo padrão
// já comprovado em AdminProductImport (CORS liberado nos endpoints públicos).
const ML_API = 'https://api.mercadolibre.com';

export type ReferenceCandidate = Database['public']['Tables']['product_reference_candidates']['Row'];
export type ReferenceImport = Database['public']['Tables']['product_reference_imports']['Row'];

interface MlSearchResult {
  id: string;
  title: string;
  price: number;
  thumbnail: string;
  category_id: string;
  attributes?: { id: string; value_name: string | null }[];
}

interface MlItemDetail {
  id: string;
  title: string;
  price: number;
  category_id: string;
  domain_id?: string;
  thumbnail?: string;
  pictures?: { secure_url?: string; url?: string }[];
  attributes?: { id: string; name?: string; value_name: string | null }[];
}

export interface ScoredCandidate {
  mlItemId: string;
  title: string;
  price: number | null;
  imageUrl: string | null;
  mlCategoryId: string | null;
  brand: string | null;
  model: string | null;
  attributeCount: number;
  hasGtin: boolean;
  score: number;
  rawData: Record<string, unknown>;
}

/** Extrai palavras-chave do título do Estágio 1 para a busca. */
export function extractSearchKeywords(name: string): string {
  return name
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2)
    .slice(0, 8)
    .join(' ');
}

const attr = (attributes: MlItemDetail['attributes'], id: string): string | null =>
  attributes?.find((a) => a.id === id)?.value_name ?? null;

// Função helper para buscar do proxy seguro da Edge Function
async function fetchFromMlProxy(path: string): Promise<any> {
  const { data, error } = await supabase.functions.invoke('ml-public-search', {
    body: { path }
  });
  if (error) {
    throw new Error(error.message || 'Erro na chamada do proxy do Mercado Livre');
  }
  return {
    ok: true,
    json: async () => data,
  };
}

/**
 * Busca candidatos no ML e enriquece com detalhes (atributos, GTIN).
 * Detalhes são buscados em paralelo; falha de um item não derruba a busca.
 */
export async function searchMlCandidates(product: {
  name: string;
  price: number;
}): Promise<ScoredCandidate[]> {
  const query = product.name.trim();
  const searchRes = await fetchFromMlProxy(
    `/products/search?status=active&site_id=MLB&q=${encodeURIComponent(query)}&limit=15`,
  );
  if (!searchRes.ok) throw new Error('Falha ao buscar anúncios no Mercado Livre');
  const searchData = await searchRes.json();
  const results: MlSearchResult[] = searchData.results ?? [];

  const detailed = await Promise.all(
    results.map(async (result) => {
      try {
        const detailRes = await fetchFromMlProxy(`/products/${result.id}`);
        if (!detailRes.ok) return null;
        const detail: any = await detailRes.json();
        let description = ''; // Produtos de catálogo não possuem descrição separada

        const gtin = attr(detail.attributes, 'GTIN');
        const image =
          detail.pictures?.[0]?.secure_url ||
          detail.pictures?.[0]?.url ||
          (detail.thumbnail ? detail.thumbnail.replace(/^http:/, 'https:') : null);

        const candidate: ScoredCandidate = {
          mlItemId: detail.id,
          title: detail.name || detail.title,
          price: detail.price ?? null,
          imageUrl: image,
          mlCategoryId: detail.category_id ?? null,
          brand: attr(detail.attributes, 'BRAND'),
          model: attr(detail.attributes, 'MODEL'),
          attributeCount: detail.attributes?.length ?? 0,
          hasGtin: !!gtin && isValidGtin(gtin),
          score: 0,
          rawData: {
            gtin: gtin && isValidGtin(gtin) ? gtin : null,
            description,
            attributes: detail.attributes ?? [],
            domain_id: detail.domain_id ?? null,
            permalink: `https://www.mercadolivre.com.br/p/${detail.id}`,
          },
        };
        candidate.score = computeCompatibilityScore(
          { name: product.name, price: product.price },
          {
            title: candidate.title,
            price: candidate.price,
            attributeCount: candidate.attributeCount,
            hasGtin: candidate.hasGtin,
          },
        );
        return candidate;
      } catch {
        return null;
      }
    }),
  );

  return detailed
    .filter((c): c is ScoredCandidate => c !== null)
    .sort((a, b) => b.score - a.score);
}

/** Persiste os candidatos antes de qualquer import (import só aplica de candidato armazenado). */
export async function persistCandidates(
  productId: string,
  searchQuery: string,
  candidates: ScoredCandidate[],
): Promise<ReferenceCandidate[]> {
  const rows = candidates.map((c) => ({
    product_id: productId,
    ml_item_id: c.mlItemId,
    title: c.title,
    price: c.price,
    image_url: c.imageUrl,
    ml_category_id: c.mlCategoryId,
    brand: c.brand,
    model: c.model,
    attribute_count: c.attributeCount,
    has_gtin: c.hasGtin,
    compatibility_score: c.score,
    search_query: searchQuery,
    raw_data: c.rawData as never,
  }));

  const { data, error } = await supabase
    .from('product_reference_candidates')
    .upsert(rows, { onConflict: 'product_id,ml_item_id' })
    .select();

  if (error) throw error;
  return data ?? [];
}

export async function fetchCandidates(productId: string): Promise<ReferenceCandidate[]> {
  const { data, error } = await supabase
    .from('product_reference_candidates')
    .select('*')
    .eq('product_id', productId)
    .order('compatibility_score', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export interface ImportOverrides {
  apply_image?: boolean;
  apply_price?: boolean;
  category_id?: string;
}

export async function importReference(
  productId: string,
  candidateId: string,
  overrides: ImportOverrides = {},
): Promise<{ success: boolean; error?: string; stage?: string }> {
  const { data, error } = await supabase.rpc('import_reference_data', {
    p_product_id: productId,
    p_candidate_id: candidateId,
    p_overrides: overrides as never,
  });
  if (error) throw error;
  return data as { success: boolean; error?: string; stage?: string };
}

export async function fetchImports(productId: string): Promise<ReferenceImport[]> {
  const { data, error } = await supabase
    .from('product_reference_imports')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function restoreImport(importId: string): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('restore_reference_import', { p_import_id: importId });
  if (error) throw error;
  return data as { success: boolean; error?: string };
}
