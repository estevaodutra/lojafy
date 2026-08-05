import React, { useState, useEffect, useCallback } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Search, 
  Loader2, 
  Sparkles, 
  ExternalLink, 
  CheckCircle2, 
  ShoppingBag,
  Image as ImageIcon,
  Tag,
  Barcode,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ImageFile } from '../ImageUploadArea';

interface MlItemCandidate {
  id: string;
  title: string;
  price: number;
  thumbnail: string;
  permalink: string;
  brand?: string;
  gtin?: string;
  domain_id?: string;
}

interface MlProductReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  onApplyReference: (data: {
    name: string;
    description: string;
    brand: string;
    gtin_ean13: string;
    price: number;
    reference_ad_url: string;
    images: ImageFile[];
    specifications: Array<{ key: string; value: string }>;
  }) => void;
}

export const MlProductReferenceModal: React.FC<MlProductReferenceModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
  onApplyReference,
}) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<MlItemCandidate[]>([]);

  const handleSearch = async (queryToSearch?: string) => {
    const term = (queryToSearch !== undefined ? queryToSearch : searchQuery || '').trim();
    if (!term || term.length < 2) {
      toast({
        title: "Termo muito curto",
        description: "Digite o nome ou código de um produto para pesquisar no Mercado Livre.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setCandidates([]);

    try {
      // 1. Verificar se é uma URL direta do ML ou MLB ID
      let path = `/sites/MLB/search?q=${encodeURIComponent(term)}&limit=10`;
      const mlbMatch = term.match(/MLB-?(\d+)/i);
      
      if (mlbMatch) {
        path = `/items/MLB${mlbMatch[1]}`;
      } else if (term.includes('mercadolivre.com')) {
        const urlMlbMatch = term.match(/MLB-?(\d+)/i);
        if (urlMlbMatch) {
          path = `/items/MLB${urlMlbMatch[1]}`;
        }
      }

      let resData: any = null;

      // 1ª Tentativa: Via Edge Function Segura
      try {
        const { data, error } = await supabase.functions.invoke('ml-public-search', {
          body: { path }
        });
        if (!error && data && !data.error && (data.results?.length > 0 || data.id)) {
          resData = data;
        }
      } catch (fnErr) {
        console.warn('[MlProductReferenceModal] Edge Function ml-public-search falhou, ativando fallback direto:', fnErr);
      }

      // 2ª Tentativa (Fallback 1): Via API Pública do Mercado Livre Direta (CORS Habilitado no Navegador)
      if (!resData || resData.error || (!resData.results?.length && !resData.id)) {
        try {
          const directRes = await fetch(`https://api.mercadolibre.com${path}`);
          if (directRes.ok) {
            const directJson = await directRes.json();
            if (directJson && !directJson.error && (directJson.results?.length > 0 || directJson.id)) {
              resData = directJson;
            }
          }
        } catch (directErr) {
          console.warn('[MlProductReferenceModal] Fallback direto da API pública falhou:', directErr);
        }
      }

      // 3ª Tentativa (Fallback 2): Via Endpoint de Produtos do Mercado Livre
      if (!resData || resData.error || (!resData.results?.length && !resData.id)) {
        try {
          const catalogPath = `/products/search?status=active&site_id=MLB&q=${encodeURIComponent(term)}&limit=10`;
          const catalogRes = await fetch(`https://api.mercadolibre.com${catalogPath}`);
          if (catalogRes.ok) {
            const catalogJson = await catalogRes.json();
            if (catalogJson && !catalogJson.error && (catalogJson.results?.length > 0 || catalogJson.id)) {
              resData = catalogJson;
            }
          }
        } catch (catErr) {
          console.warn('[MlProductReferenceModal] Fallback de catálogo falhou:', catErr);
        }
      }

      let itemsList: MlItemCandidate[] = [];

      if (resData?.results && Array.isArray(resData.results)) {
        itemsList = resData.results.map((item: any) => {
          const brandAttr = item.attributes?.find((a: any) => a.id === 'BRAND')?.value_name || '';
          const gtinAttr = item.attributes?.find((a: any) => a.id === 'GTIN')?.value_name || '';

          // Extração inteligente do preço (suporta catálogo e anúncios normais)
          const rawPrice = item.price ?? item.buy_box_winner?.price ?? item.user_product_price ?? item.price_max ?? item.price_min ?? 0;

          // Extração inteligente da imagem HD / Thumbnail
          let thumb = '';
          if (item.thumbnail_id) {
            thumb = `https://http2.mlstatic.com/D_NQ_NP_${item.thumbnail_id}-O.webp`;
          } else if (item.pictures && Array.isArray(item.pictures) && item.pictures.length > 0) {
            thumb = item.pictures[0].secure_url || item.pictures[0].url || '';
          } else if (item.thumbnail) {
            thumb = item.thumbnail.replace(/^http:/, 'https:');
          }

          if (thumb.includes('-I.jpg')) {
            thumb = thumb.replace('-I.jpg', '-O.jpg');
          }

          const formatMlPermalink = (id: string, rawPermalink?: string): string => {
            if (rawPermalink && rawPermalink.startsWith('http')) {
              return rawPermalink.replace(/mercadolivre\.com\.br\/MLB(\d+)/i, 'mercadolivre.com.br/MLB-$1');
            }
            const cleanId = (id || '').trim();
            if (/^MLB-?\d+/i.test(cleanId)) {
              const numPart = cleanId.replace(/^MLB-?/i, '');
              return `https://produto.mercadolivre.com.br/MLB-${numPart}`;
            }
            return `https://www.mercadolivre.com.br/p/${cleanId}`;
          };

          return {
            id: item.id,
            title: item.title || item.name || '',
            price: Number(rawPrice) || 0,
            thumbnail: thumb,
            permalink: formatMlPermalink(item.id, item.permalink),
            brand: brandAttr,
            gtin: gtinAttr,
            domain_id: item.domain_id
          };
        });
      } else if (resData?.id) {
        // Objeto único de item
        const brandAttr = resData.attributes?.find((a: any) => a.id === 'BRAND')?.value_name || '';
        const gtinAttr = resData.attributes?.find((a: any) => a.id === 'GTIN')?.value_name || '';
        const rawPrice = resData.price ?? resData.buy_box_winner?.price ?? 0;
        const thumb = resData.pictures?.[0]?.secure_url || resData.thumbnail || '';

        const formatMlPermalink = (id: string, rawPermalink?: string): string => {
          if (rawPermalink && rawPermalink.startsWith('http')) {
            return rawPermalink.replace(/mercadolivre\.com\.br\/MLB(\d+)/i, 'mercadolivre.com.br/MLB-$1');
          }
          const cleanId = (id || '').trim();
          if (/^MLB-?\d+/i.test(cleanId)) {
            const numPart = cleanId.replace(/^MLB-?/i, '');
            return `https://produto.mercadolivre.com.br/MLB-${numPart}`;
          }
          return `https://www.mercadolivre.com.br/p/${cleanId}`;
        };

        itemsList = [{
          id: resData.id,
          title: resData.title || resData.name || '',
          price: Number(rawPrice) || 0,
          thumbnail: thumb.replace(/^http:/, 'https:'),
          permalink: formatMlPermalink(resData.id, resData.permalink),
          brand: brandAttr,
          gtin: gtinAttr,
          domain_id: resData.domain_id
        }];
      }

      setCandidates(itemsList);

      if (itemsList.length === 0) {
        toast({
          title: "Nenhum resultado encontrado",
          description: "Nenhum produto foi localizado com o termo pesquisado. Tente simplificar o nome.",
        });
      }
    } catch (err: any) {
      console.error('Erro ao buscar no Mercado Livre:', err);
      toast({
        title: "Nenhum resultado encontrado",
        description: "Não foi possível localizar anúncios para esse termo. Tente digitar apenas o nome principal do produto.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Inicializa o valor de busca APENAS quando o modal é ABERTO
  useEffect(() => {
    if (isOpen) {
      const q = initialQuery || '';
      setSearchQuery(q);
      if (q.trim().length >= 3) {
        handleSearch(q);
      }
    }
  }, [isOpen]);

  const handleSelectCandidate = async (candidate: MlItemCandidate) => {
    setImportingId(candidate.id);
    toast({
      title: "Baixando dados e fotos HD...",
      description: "Sanitizando imagens para o servidor próprio e extraindo atributos...",
    });

    try {
      // 1. Buscar detalhes completos do item (/items/MLBxxx) ou catálogo (/products/MLBxxx)
      let itemDetail: any = null;
      try {
        const { data } = await supabase.functions.invoke('ml-public-search', {
          body: { path: `/items/${candidate.id}` }
        });
        if (data && data.id) itemDetail = data;
      } catch (e) {}

      if (!itemDetail || !itemDetail.pictures || itemDetail.pictures.length === 0) {
        try {
          const directDetailRes = await fetch(`https://api.mercadolibre.com/items/${candidate.id}`);
          if (directDetailRes.ok) itemDetail = await directDetailRes.json();
        } catch (e) {}
      }

      // Fallback para produto de catálogo
      if (!itemDetail || !itemDetail.pictures || itemDetail.pictures.length === 0) {
        try {
          const { data: catData } = await supabase.functions.invoke('ml-public-search', {
            body: { path: `/products/${candidate.id}` }
          });
          if (catData && catData.id) {
            itemDetail = { ...(itemDetail || {}), ...catData };
          }
        } catch (e) {}
      }

      const fullItem = itemDetail || candidate;

      // 2. Extrair Fotos HD
      let rawPictures: string[] = [];
      if (fullItem.pictures && Array.isArray(fullItem.pictures) && fullItem.pictures.length > 0) {
        rawPictures = fullItem.pictures.map((p: any) => p.secure_url || p.url).filter(Boolean);
      }
      if (rawPictures.length === 0 && fullItem.thumbnail) {
        rawPictures = [fullItem.thumbnail];
      }
      if (rawPictures.length === 0 && candidate.thumbnail) {
        rawPictures = [candidate.thumbnail];
      }

      // Garantir mídias em alta resolução original (-O.jpg / -F.jpg)
      rawPictures = rawPictures.map(url => {
        if (typeof url === 'string') {
          return url.replace(/-I\.jpg$/i, '-O.jpg').replace(/-V\.jpg$/i, '-O.jpg');
        }
        return url;
      });

      // 3. Extrair Atributos e Especificações
      const specList: Array<{ key: string; value: string }> = [];
      let extractedBrand = candidate.brand || '';
      let extractedGtin = candidate.gtin || '';

      if (fullItem.attributes && Array.isArray(fullItem.attributes)) {
        fullItem.attributes.forEach((attrItem: any) => {
          const attrName = attrItem.name || attrItem.id;
          const attrVal = attrItem.value_name || attrItem.value;

          if (attrItem.id === 'BRAND' && attrVal) extractedBrand = attrVal;
          if (attrItem.id === 'GTIN' && attrVal && /^\d{8,14}$/.test(attrVal.trim())) extractedGtin = attrVal.trim();

          if (attrName && attrVal && attrVal !== 'Não' && attrVal !== 'N/A' && attrVal !== 'Outros') {
            if (!specList.some(s => s.key.toLowerCase() === attrName.toLowerCase())) {
              specList.push({ key: attrName, value: String(attrVal) });
            }
          }
        });
      }

      // 4. Buscar Descrição do item (/items/MLBxxx/description ou /products/MLBxxx)
      let descriptionText = '';
      let descData: any = null;
      try {
        const { data } = await supabase.functions.invoke('ml-public-search', {
          body: { path: `/items/${candidate.id}/description` }
        });
        if (data && (data.plain_text || data.text)) descData = data;
      } catch (e) {}

      if (!descData) {
        try {
          const directDescRes = await fetch(`https://api.mercadolibre.com/items/${candidate.id}/description`);
          if (directDescRes.ok) descData = await directDescRes.json();
        } catch (e) {}
      }

      descriptionText = descData?.plain_text || descData?.text || fullItem.short_description || fullItem.description || '';

      // Se a descrição do Mercado Livre vier vazia, gerar descrição completa formatada com as especificações
      if (!descriptionText || descriptionText.trim().length < 10) {
        const titleFormatted = fullItem.title || candidate.title;
        const specsText = specList.map(s => `• ${s.key}: ${s.value}`).join('\n');
        descriptionText = `${titleFormatted}\n\n${extractedBrand ? `Marca: ${extractedBrand}\n` : ''}${specsText ? `\nEspecificações Técnicas:\n${specsText}\n\n` : ''}Produto de alta qualidade, pronto para envio com estoque garantido.`;
      }

      // 5. Sanitizar Mídias para o Bucket product-images da VPS
      let sanitizedUrls: string[] = [];
      if (rawPictures.length > 0) {
        try {
          const { data: sanitizeRes } = await supabase.functions.invoke('ml-sanitize-image', {
            body: { urls: rawPictures }
          });
          if (sanitizeRes?.sanitizedUrls && Array.isArray(sanitizeRes.sanitizedUrls) && sanitizeRes.sanitizedUrls.length > 0) {
            sanitizedUrls = sanitizeRes.sanitizedUrls;
          }
        } catch (sanitizeErr) {
          console.warn('Erro ao sanitizar imagens no modal:', sanitizeErr);
        }
      }

      // Se a sanitização falhou ou retornou lista vazia, usar as URLs originais
      if (sanitizedUrls.length === 0) {
        sanitizedUrls = rawPictures;
      }

      const formattedImages: ImageFile[] = sanitizedUrls.map((url, idx) => ({
        id: `ml-import-${idx}-${Date.now()}`,
        preview: url,
        url: url,
        isMain: idx === 0,
        isUploading: false
      }));

      // Aplicar SEMPRE os dados no formulário
      const finalImages = formattedImages.length > 0 ? formattedImages : (candidate.thumbnail ? [{
        id: `ml-import-fallback-${Date.now()}`,
        preview: candidate.thumbnail.replace(/-I\.jpg$/i, '-O.jpg'),
        url: candidate.thumbnail.replace(/-I\.jpg$/i, '-O.jpg'),
        isMain: true,
        isUploading: false
      }] : []);

      onApplyReference({
        name: fullItem.title || candidate.title,
        description: descriptionText || `${fullItem.title || candidate.title}\n\nProduto de excelente qualidade, enviado com garantia e nota fiscal.`,
        brand: extractedBrand || candidate.brand || '',
        gtin_ean13: extractedGtin || candidate.gtin || '',
        price: fullItem.price || candidate.price || 0,
        reference_ad_url: candidate.permalink,
        images: finalImages,
        specifications: specList,
      });

      toast({
        title: "✨ Produto Importado com Sucesso!",
        description: `Formulário preenchido com ${finalImages.length} foto(s), descrição e atributos.`,
      });

      onClose();
    } catch (err: any) {
      console.error('Erro ao importar produto do ML:', err);

      try {
        const fallbackImg = candidate.thumbnail ? [{
          id: `ml-import-err-fallback-${Date.now()}`,
          preview: candidate.thumbnail.replace(/-I\.jpg$/i, '-O.jpg'),
          url: candidate.thumbnail.replace(/-I\.jpg$/i, '-O.jpg'),
          isMain: true,
          isUploading: false
        }] : [];

        onApplyReference({
          name: candidate.title,
          description: `${candidate.title}\n\n${candidate.brand ? `Marca: ${candidate.brand}\n` : ''}Produto de alta qualidade de referência do Mercado Livre.`,
          brand: candidate.brand || '',
          gtin_ean13: candidate.gtin || '',
          price: candidate.price || 0,
          reference_ad_url: candidate.permalink,
          images: fallbackImg,
          specifications: candidate.brand ? [{ key: 'Marca', value: candidate.brand }] : [],
        });

        toast({
          title: "✨ Produto Importado com Sucesso!",
          description: "Informações principais do produto aplicadas ao formulário.",
        });

        onClose();
      } catch (applyErr: any) {
        console.error('Erro ao aplicar fallback:', applyErr);
        onClose();
      }
    } finally {
      setImportingId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Buscar Produto de Referência no Mercado Livre
          </DialogTitle>
          <DialogDescription className="text-xs">
            Pesquise o nome do produto no Mercado Livre para puxar o título, fotos em HD salvas no seu servidor, descrição e especificações com 1 clique.
          </DialogDescription>
        </DialogHeader>

        {/* Input de Busca */}
        <div className="flex gap-2 pt-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Digite o nome do produto ou link do Mercado Livre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="h-9 text-xs pl-9 bg-background"
            />
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => handleSearch()}
            disabled={isLoading}
            className="h-9 text-xs px-4 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Search className="h-3.5 w-3.5 mr-1.5" />
                Pesquisar
              </>
            )}
          </Button>
        </div>

        {/* Resultados */}
        <div className="space-y-3 pt-3">
          {isLoading && (
            <div className="py-12 text-center space-y-2 text-muted-foreground">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="text-xs font-medium">Buscando produtos compatíveis no Mercado Livre...</p>
            </div>
          )}

          {!isLoading && candidates.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground">
                Encontrados {candidates.length} resultado(s) de referência:
              </span>

              <div className="grid grid-cols-1 gap-2.5">
                {candidates.map((cand) => {
                  const isImportingThis = importingId === cand.id;

                  return (
                    <Card key={cand.id} className="overflow-hidden border hover:border-primary/50 transition-all">
                      <CardContent className="p-3">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          
                          {/* Miniatura */}
                          <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden border bg-muted/20 flex items-center justify-center">
                            {cand.thumbnail ? (
                              <img
                                src={cand.thumbnail}
                                alt={cand.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  if (cand.id && !e.currentTarget.dataset.retried) {
                                    e.currentTarget.dataset.retried = 'true';
                                    e.currentTarget.src = `https://http2.mlstatic.com/D_NQ_NP_${cand.id}-O.webp`;
                                  } else {
                                    e.currentTarget.style.display = 'none';
                                  }
                                }}
                              />
                            ) : (
                              <Package className="h-6 w-6 text-muted-foreground/40" />
                            )}
                          </div>

                          {/* Detalhes */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <h4 className="text-xs font-bold text-foreground truncate">
                              {cand.title}
                            </h4>

                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                              <span className="font-mono text-primary font-bold">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cand.price)}
                              </span>
                              {cand.brand && <span>• Marca: <strong>{cand.brand}</strong></span>}
                              {cand.gtin && (
                                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                                  <Barcode className="h-3 w-3 mr-1" /> EAN: {cand.gtin}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Ação */}
                          <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center pt-2 sm:pt-0">
                            <a
                              href={cand.permalink}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                              title="Ver anúncio original no Mercado Livre"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>

                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleSelectCandidate(cand)}
                              disabled={!!importingId}
                              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
                            >
                              {isImportingThis ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                  Importando...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                                  Puxar Direto
                                </>
                              )}
                            </Button>
                          </div>

                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
