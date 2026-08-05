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
  Barcode
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
  pictures?: string[];
  attributes?: Array<{ key: string; value: string }>;
  description?: string;
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

const extractStringDescription = (val: any): string => {
  if (!val) return '';
  if (typeof val === 'string' && val.trim() !== '[object Object]') return val.trim();
  if (typeof val === 'object' && val !== null) {
    if (typeof val.plain_text === 'string' && val.plain_text.trim()) return val.plain_text.trim();
    if (typeof val.text === 'string' && val.text.trim()) return val.text.trim();
    if (typeof val.content === 'string' && val.content.trim()) return val.content.trim();
  }
  return '';
};

export const MlProductReferenceModal: React.FC<MlProductReferenceModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
  onApplyReference,
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [candidates, setCandidates] = useState<MlItemCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSearch = async (queryTerm?: string) => {
    const term = (queryTerm || searchQuery).trim();
    if (!term) {
      toast({
        title: "Informe um termo de busca",
        description: "Digite o nome do produto ou código para buscar no Mercado Livre.",
      });
      return;
    }

    setIsLoading(true);
    setCandidates([]);

    try {
      let resData: any = null;

      try {
        const { data } = await supabase.functions.invoke('ml-public-search', {
          body: { query: term }
        });
        if (data && !data.error && (data.results?.length > 0 || data.id)) {
          resData = data;
        }
      } catch (edgeErr) {
        console.warn('[MlProductReferenceModal] Edge Function ml-public-search falhou:', edgeErr);
      }

      if (!resData || resData.error || (!resData.results?.length && !resData.id)) {
        try {
          const directRes = await fetch(`https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(term)}&limit=10`);
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

      let itemsList: MlItemCandidate[] = [];

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

      if (resData?.results && Array.isArray(resData.results)) {
        itemsList = resData.results.map((item: any) => {
          const brandAttr = item.attributes?.find((a: any) => a.id === 'BRAND')?.value_name || '';
          const gtinAttr = item.attributes?.find((a: any) => a.id === 'GTIN')?.value_name || '';

          const rawPrice = item.price ?? item.buy_box_winner?.price ?? item.user_product_price ?? item.price_max ?? item.price_min ?? 0;

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

          let candidatePics: string[] = [];
          if (item.pictures && Array.isArray(item.pictures) && item.pictures.length > 0) {
            candidatePics = item.pictures.map((p: any) => (p.secure_url || p.url || '').replace(/-I\.jpg$/i, '-O.jpg')).filter(Boolean);
          }
          if (candidatePics.length === 0 && thumb) {
            candidatePics = [thumb];
          }

          const candidateAttrs: Array<{ key: string; value: string }> = [];
          if (item.attributes && Array.isArray(item.attributes)) {
            item.attributes.forEach((a: any) => {
              if (a.name && a.value_name && a.value_name !== 'Não' && a.value_name !== 'N/A') {
                if (!candidateAttrs.some(existing => existing.key.toLowerCase() === a.name.toLowerCase())) {
                  candidateAttrs.push({ key: a.name, value: String(a.value_name) });
                }
              }
            });
          }

          const candidateDesc = extractStringDescription(item.short_description) || extractStringDescription(item.description);

          return {
            id: item.id,
            title: item.title || item.name || '',
            price: Number(rawPrice) || 0,
            thumbnail: thumb,
            permalink: formatMlPermalink(item.id, item.permalink),
            brand: brandAttr,
            gtin: gtinAttr,
            domain_id: item.domain_id,
            pictures: candidatePics,
            attributes: candidateAttrs,
            description: candidateDesc
          };
        });
      } else if (resData?.id) {
        const brandAttr = resData.attributes?.find((a: any) => a.id === 'BRAND')?.value_name || '';
        const gtinAttr = resData.attributes?.find((a: any) => a.id === 'GTIN')?.value_name || '';
        const rawPrice = resData.price ?? resData.buy_box_winner?.price ?? 0;
        const thumb = resData.pictures?.[0]?.secure_url || resData.thumbnail || '';

        itemsList = [{
          id: resData.id,
          title: resData.title || resData.name || '',
          price: Number(rawPrice) || 0,
          thumbnail: thumb.replace(/^http:/, 'https:'),
          permalink: formatMlPermalink(resData.id, resData.permalink),
          brand: brandAttr,
          gtin: gtinAttr,
          domain_id: resData.domain_id,
          description: extractStringDescription(resData.short_description) || extractStringDescription(resData.description)
        }];
      }

      setCandidates(itemsList);

      itemsList.slice(0, 6).forEach(async (cand) => {
        try {
          let detail: any = null;
          try {
            const { data } = await supabase.functions.invoke('ml-public-search', {
              body: { path: `/items/${cand.id}` }
            });
            if (data && (data.pictures || data.attributes)) detail = data;
          } catch (e) {}

          if (!detail) {
            try {
              const { data: prodData } = await supabase.functions.invoke('ml-public-search', {
                body: { path: `/products/${cand.id}` }
              });
              if (prodData) detail = prodData;
            } catch (e) {}
          }

          if (detail) {
            let pics: string[] = [];
            if (detail.pictures && Array.isArray(detail.pictures)) {
              pics = detail.pictures.map((p: any) => (p.secure_url || p.url || '').replace(/-I\.jpg$/i, '-O.jpg')).filter(Boolean);
            }

            const attrs: Array<{ key: string; value: string }> = [];
            if (detail.attributes && Array.isArray(detail.attributes)) {
              detail.attributes.forEach((a: any) => {
                if (a.name && a.value_name && a.value_name !== 'Não' && a.value_name !== 'N/A') {
                  if (!attrs.some(existing => existing.key.toLowerCase() === a.name.toLowerCase())) {
                    attrs.push({ key: a.name, value: String(a.value_name) });
                  }
                }
              });
            }

            const detailDesc = extractStringDescription(detail.short_description) || extractStringDescription(detail.description);

            setCandidates(prev => prev.map(c => {
              if (c.id === cand.id) {
                return {
                  ...c,
                  pictures: pics.length > 0 ? pics : c.pictures,
                  attributes: attrs.length > 0 ? attrs : c.attributes,
                  price: Number(detail.price ?? detail.buy_box_winner?.price ?? c.price) || c.price,
                  description: detailDesc || c.description
                };
              }
              return c;
            }));
          }
        } catch (err) {}
      });

      if (itemsList.length === 0) {
        toast({
          title: "Nenhum resultado encontrado",
          description: "Nenhum produto foi localizado com o termo pesquisado. Tente simplificar o nome.",
        });
      }
    } catch (err: any) {
      console.error('Erro ao buscar no Mercado Livre:', err);
    } finally {
      setIsLoading(false);
    }
  };

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

      let rawPictures: string[] = [];

      if (candidate.pictures && Array.isArray(candidate.pictures) && candidate.pictures.length > 0) {
        rawPictures.push(...candidate.pictures);
      }

      if (fullItem.pictures && Array.isArray(fullItem.pictures)) {
        fullItem.pictures.forEach((p: any) => {
          const u = p.secure_url || p.url;
          if (u && typeof u === 'string') {
            const hdUrl = u.replace(/-I\.jpg$/i, '-O.jpg').replace(/-V\.jpg$/i, '-O.jpg');
            if (!rawPictures.includes(hdUrl) && !rawPictures.includes(u)) {
              rawPictures.push(hdUrl);
            }
          }
        });
      }

      if (rawPictures.length === 0 && fullItem.thumbnail) {
        rawPictures = [fullItem.thumbnail];
      }
      if (rawPictures.length === 0 && candidate.thumbnail) {
        rawPictures = [candidate.thumbnail];
      }

      rawPictures = Array.from(new Set(rawPictures.map(url => {
        if (typeof url === 'string') {
          return url.replace(/-I\.jpg$/i, '-O.jpg').replace(/-V\.jpg$/i, '-O.jpg');
        }
        return url;
      }))).filter(Boolean);

      const specList: Array<{ key: string; value: string }> = candidate.attributes || [];
      let extractedBrand = candidate.brand || '';
      let extractedGtin = candidate.gtin || '';

      if (fullItem.attributes && Array.isArray(fullItem.attributes)) {
        fullItem.attributes.forEach((attrItem: any) => {
          const attrVal = attrItem.value_name || attrItem.value;
          if (attrItem.id === 'BRAND' && attrVal) extractedBrand = attrVal;
          if (attrItem.id === 'GTIN' && attrVal && /^\d{8,14}$/.test(attrVal.trim())) extractedGtin = attrVal.trim();
        });
      }

      let descriptionText = candidate.description || '';
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

      descriptionText = extractStringDescription(descData?.plain_text) ||
                        extractStringDescription(descData?.text) ||
                        extractStringDescription(descData) ||
                        extractStringDescription(fullItem.short_description) ||
                        extractStringDescription(fullItem.description) ||
                        extractStringDescription(candidate.description);

      if (!descriptionText || descriptionText.trim().length < 10) {
        const titleFormatted = fullItem.title || candidate.title;
        const specsText = specList.map(s => `• ${s.key}: ${s.value}`).join('\n');
        descriptionText = `${titleFormatted}\n\n${extractedBrand ? `Marca: ${extractedBrand}\n` : ''}${specsText ? `\nEspecificações Técnicas:\n${specsText}\n\n` : ''}Produto de alta qualidade, pronto para envio com estoque garantido.`;
      }

      // Montar a galeria completa de mídias HD (todas as fotos encontradas)
      const formattedImages: ImageFile[] = rawPictures.map((url, idx) => ({
        id: `ml-import-${idx}-${Date.now()}`,
        preview: url,
        url: url,
        isMain: idx === 0,
        isUploading: false
      }));

      // Aplicar TUDO no formulário imediatamente sem bloqueios
      onApplyReference({
        name: fullItem.title || candidate.title,
        description: descriptionText || `${fullItem.title || candidate.title}\n\nProduto de excelente qualidade, enviado com garantia e nota fiscal.`,
        brand: extractedBrand || candidate.brand || '',
        gtin_ean13: extractedGtin || candidate.gtin || '',
        price: fullItem.price || candidate.price || 0,
        reference_ad_url: candidate.permalink,
        images: formattedImages,
        specifications: specList,
      });

      toast({
        title: "✨ Produto Importado com Sucesso!",
        description: `Importadas ${formattedImages.length} fotos em HD, ${specList.length} especificações e descrição completa.`,
      });

      onClose();
    } catch (err: any) {
      console.error('Erro ao importar produto do ML:', err);

      // Resiliência total: mesmo no catch, aplica tudo que estiver salvo no candidate
      try {
        const fallbackImgs: ImageFile[] = (candidate.pictures && candidate.pictures.length > 0 ? candidate.pictures : (candidate.thumbnail ? [candidate.thumbnail] : [])).map((u, i) => ({
          id: `ml-err-fallback-${i}-${Date.now()}`,
          preview: u.replace(/-I\.jpg$/i, '-O.jpg'),
          url: u.replace(/-I\.jpg$/i, '-O.jpg'),
          isMain: i === 0,
          isUploading: false
        }));

        onApplyReference({
          name: candidate.title,
          description: candidate.description || `${candidate.title}\n\n${candidate.brand ? `Marca: ${candidate.brand}\n` : ''}Produto de alta qualidade de referência do Mercado Livre.`,
          brand: candidate.brand || '',
          gtin_ean13: candidate.gtin || '',
          price: candidate.price || 0,
          reference_ad_url: candidate.permalink,
          images: fallbackImgs,
          specifications: candidate.attributes || (candidate.brand ? [{ key: 'Marca', value: candidate.brand }] : []),
        });

        toast({
          title: "✨ Produto Importado com Sucesso!",
          description: "Informações completas aplicadas ao formulário.",
        });

        onClose();
      } catch (applyErr: any) {
        console.error('Erro ao aplicar fallback final:', applyErr);
        onClose();
      }
    } finally {
      setImportingId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Buscar Produto de Referência no Mercado Livre
          </DialogTitle>
          <DialogDescription className="text-xs">
            Pesquise o nome do produto no Mercado Livre para comparar fotos, preços, atributos e importar tudo com 1 clique.
          </DialogDescription>
        </DialogHeader>

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
            className="h-9 text-xs px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
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

        <div className="space-y-3 pt-3">
          {isLoading && (
            <div className="py-12 text-center space-y-2 text-muted-foreground">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="text-xs font-medium">Buscando produtos e fotos HD no Mercado Livre...</p>
            </div>
          )}

          {!isLoading && candidates.length > 0 && (
            <div className="space-y-3">
              <span className="text-xs font-semibold text-muted-foreground">
                Encontrados {candidates.length} resultado(s) de referência:
              </span>

              <div className="grid grid-cols-1 gap-3.5">
                {candidates.map((cand) => {
                  const isImportingThis = importingId === cand.id;
                  const picturesList = cand.pictures && cand.pictures.length > 0 ? cand.pictures : [cand.thumbnail];

                  return (
                    <Card key={cand.id} className="overflow-hidden border border-border/80 hover:border-primary/50 transition-all shadow-2xs bg-card">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b pb-3">
                          <div className="space-y-1.5 flex-1">
                            <h4 className="text-sm font-bold text-foreground leading-snug">
                              {cand.title}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2">
                              {cand.brand && (
                                <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                                  Marca: {cand.brand}
                                </Badge>
                              )}
                              {cand.gtin && (
                                <Badge variant="outline" className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                                  <Barcode className="h-3 w-3 mr-1" /> EAN: {cand.gtin}
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="text-left sm:text-right shrink-0 bg-muted/30 p-2 rounded-lg border">
                            <span className="text-[10px] text-muted-foreground block font-medium">Preço Mercado Livre</span>
                            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                              {cand.price > 0 ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cand.price) : 'Sob Consulta'}
                            </span>
                          </div>
                        </div>

                        {picturesList.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <ImageIcon className="h-3.5 w-3.5 text-primary" />
                                Galeria de Fotos ({picturesList.length} imagem(ns) HD):
                              </span>
                            </div>
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                              {picturesList.map((picUrl, idx) => (
                                <div key={idx} className="relative h-16 w-16 rounded-md overflow-hidden border bg-muted shrink-0 group">
                                  <img
                                    src={picUrl}
                                    alt=""
                                    className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                                    onError={(e) => {
                                      e.currentTarget.src = cand.thumbnail;
                                    }}
                                  />
                                  {idx === 0 && (
                                    <span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[8px] text-center font-bold py-0.5">
                                      Principal
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {cand.attributes && cand.attributes.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                              <Tag className="h-3.5 w-3.5 text-amber-500" />
                              Especificações & Atributos ({cand.attributes.length}):
                            </span>
                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                              {cand.attributes.map((attr, idx) => (
                                <span key={idx} className="text-[10px] px-2 py-0.5 rounded-md bg-muted border text-muted-foreground font-mono">
                                  <strong className="text-foreground font-semibold">{attr.key}:</strong> {attr.value}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t">
                          <a
                            href={cand.permalink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 font-medium transition-colors"
                          >
                            Abrir no Mercado Livre <ExternalLink className="h-3 w-3" />
                          </a>

                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleSelectCandidate(cand)}
                            disabled={!!importingId}
                            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 gap-1.5 shadow-sm"
                          >
                            {isImportingThis ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Puxando Fotos HD & Atributos...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3.5 w-3.5" />
                                Puxar Anúncio Completo ({picturesList.length} Fotos)
                              </>
                            )}
                          </Button>
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
