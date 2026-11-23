import { useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMercadoLivreIntegration } from '@/hooks/useMercadoLivreIntegration';
import { Button } from '@/components/ui/button';
import { calculateOnboardingMlPrice } from '../../../supabase/functions/_shared/onboardingPrice';

export type OnboardingProduct = {
  id: string;
  name: string;
  sku?: string | null;
  price: number;
  main_image_url?: string | null;
  image_url?: string | null;
  imported?: boolean;
  published?: boolean;
  custom_price?: number | null;
  permalink?: string | null;
};

type Props = {
  stage: 'import-top10' | 'publish-ml';
  preview?: boolean;
  previewProducts?: OnboardingProduct[];
  onPreviewProducts?: (products: OnboardingProduct[]) => void;
  onComplete: () => void | Promise<void>;
};

const suggestedPrice = (price: number) => Number(price) > 0 ? calculateOnboardingMlPrice(Number(price)) : 0;
const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const EMPTY_PRODUCTS: OnboardingProduct[] = [];

async function callProducts(action: string, productId?: string) {
  const { data, error } = await supabase.functions.invoke('partner-onboarding', { body: { action, ...(productId ? { product_id: productId } : {}) } });
  if (error) {
    let message = error.message;
    if ('context' in error && error.context instanceof Response) {
      const details = await error.context.clone().json().catch(() => null);
      if (typeof details?.error === 'string') message = details.error;
    }
    throw new Error(message);
  }
  return data;
}

async function previewTop10(): Promise<OnboardingProduct[]> {
  const { data: feature, error: featureError } = await supabase.from('features').select('id').eq('slug', 'top_10_produtos').maybeSingle();
  if (featureError || !feature) throw new Error('Top 10 não configurado.');
  const { data: rows, error: rowsError } = await supabase.from('feature_produtos').select('produto_id')
    .eq('feature_id', feature.id).eq('ativo', true).order('ordem', { ascending: true }).limit(10);
  if (rowsError || !rows?.length) throw new Error('Nenhum produto Top 10 disponível.');
  const ids = rows.map(item => item.produto_id);
  const { data: products, error: productsError } = await supabase.from('products')
    .select('id, name, sku, price, main_image_url, image_url').in('id', ids).eq('active', true);
  if (productsError) throw productsError;
  const map = new Map((products ?? []).map(product => [product.id, product]));
  return ids.map(id => map.get(id)).filter((item): item is NonNullable<typeof item> => !!item).map(item => ({ ...item, price: Number(item.price) }));
}

export function OnboardingCommerceStep({ stage, preview = false, previewProducts = EMPTY_PRODUCTS, onPreviewProducts, onComplete }: Props) {
  const { publishProductAsync } = useMercadoLivreIntegration();
  const [products, setProducts] = useState<OnboardingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [started, setStarted] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const previewList = stage === 'publish-ml' ? previewProducts : undefined;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrors({});
    setMessage('');
    const load = async () => {
      try {
        const list = preview
          ? stage === 'import-top10' ? await previewTop10() : previewList?.length ? previewList : await previewTop10()
          : (await callProducts(stage === 'import-top10' ? 'catalog' : 'store_products')).products as OnboardingProduct[];
        if (active) {
          setProducts(list.map(product => ({ ...product, price: Number(product.price) })));
          setStarted(stage === 'publish-ml' || list.some(product => product.imported));
        }
      } catch (reason) {
        if (active) setMessage(reason instanceof Error ? reason.message : 'Não foi possível carregar os produtos.');
      } finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [stage, preview, previewList]);

  const done = products.length > 0 && products.every(product => stage === 'import-top10' ? product.imported : product.published);

  const process = async () => {
    if (running || loading || !products.length) return;
    setRunning(true);
    setStarted(true);
    setMessage('');
    setErrors({});
    const failures: Record<string, string> = {};
    const next = [...products];
    for (let index = 0; index < next.length; index++) {
      const product = next[index];
      if (stage === 'import-top10' ? product.imported : product.published) continue;
      setCurrentId(product.id);
      try {
        if (preview) await new Promise(resolve => setTimeout(resolve, 260));
        else if (stage === 'import-top10') await callProducts('import_one', product.id);
        else {
          const result = await callProducts('price_one', product.id);
          product.custom_price = Number(result.price);
          await publishProductAsync(product.id);
        }
        if (stage === 'import-top10') product.imported = true;
        else product.published = true;
        setProducts([...next]);
      } catch (reason) {
        failures[product.id] = reason instanceof Error ? reason.message : 'Falha no processamento.';
        setErrors({ ...failures });
      }
    }
    setCurrentId(null);
    setRunning(false);
    if (preview && stage === 'import-top10') onPreviewProducts?.(next);
    if (Object.keys(failures).length) setMessage('Alguns produtos precisam de atenção. Você pode tentar novamente; os concluídos serão preservados.');
    else setMessage(stage === 'import-top10' ? 'Importação concluída para dentro da sua loja.' : 'Publicação concluída no Mercado Livre.');
  };

  const continueJourney = async () => {
    if (advancing) return;
    setAdvancing(true);
    try { await onComplete(); } finally { setAdvancing(false); }
  };

  return <div className="space-y-4">
    {stage === 'publish-ml' && <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-200">Margem líquida alvo: <strong>30%</strong>. O preço considera a taxa Clássico de 14% do Mercado Livre.</p>}
    {!loading && !running && !done && products.length > 0 && <Button onClick={() => void process()}>{stage === 'import-top10' ? 'Agora vamos importar os Top 10 produtos' : 'Publicar produtos no Mercado Livre'}</Button>}
    {loading && <div className="flex items-center gap-2 text-sm" role="status"><Loader2 className="h-5 w-5 animate-spin" />Carregando produtos...</div>}
    {products.length > 0 && (stage === 'publish-ml' || started || done) && <div className="space-y-2 max-h-72 overflow-y-auto" aria-live="polite">{products.map(product => {
      const complete = stage === 'import-top10' ? product.imported : product.published;
      return <div key={product.id} className="flex items-center gap-3 rounded-md border p-2">
        <img src={product.main_image_url || product.image_url || '/placeholder.svg'} alt="" className="h-12 w-12 shrink-0 rounded object-contain" />
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{product.name}</p><p className="text-xs text-muted-foreground">{stage === 'publish-ml' ? product.published ? `Publicado · ${money(product.custom_price || suggestedPrice(product.price))}` : `30% de margem alvo · ${money(suggestedPrice(product.price))}` : product.sku || 'Top 10'}</p>{errors[product.id] && <p className="text-xs text-destructive">{errors[product.id]}</p>}</div>
        {currentId === product.id ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" /> : complete ? <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" /> : <span className="text-xs text-muted-foreground">Pendente</span>}
        {product.published && product.permalink && <a href={product.permalink} target="_blank" rel="noopener noreferrer" aria-label={`Ver anúncio de ${product.name}`}><ExternalLink className="h-4 w-4" /></a>}
      </div>;
    })}</div>}
    {message && <p role="status" className={Object.keys(errors).length ? 'text-sm text-destructive' : 'text-sm text-green-700'}>{message}</p>}
    {done && !running && <Button disabled={advancing} onClick={() => void continueJourney()}>{advancing ? 'Avançando...' : stage === 'import-top10' ? 'Continuar para publicação' : 'Continuar para a aula'}</Button>}
  </div>;
}
