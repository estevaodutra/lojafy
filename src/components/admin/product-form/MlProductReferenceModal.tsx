import React, { useState, useEffect } from 'react';
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

  const handleSearch = useCallback(async (queryToSearch?: string) => {
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

      const { data: resData, error } = await supabase.functions.invoke('ml-public-search', {
        body: { path }
      });

      if (error) throw error;

      let itemsList: MlItemCandidate[] = [];

      if (resData?.results && Array.isArray(resData.results)) {
        itemsList = resData.results.map((item: any) => {
          const brandAttr = item.attributes?.find((a: any) => a.id === 'BRAND')?.value_name || '';
          const gtinAttr = item.attributes?.find((a: any) => a.id === 'GTIN')?.value_name || '';
          return {
            id: item.id,
            title: item.title || item.name || '',
            price: item.price || 0,
            thumbnail: item.thumbnail ? item.thumbnail.replace(/^http:/, 'https:') : '',
            permalink: item.permalink || `https://produto.mercadolivre.com.br/${item.id}`,
            brand: brandAttr,
            gtin: gtinAttr,
            domain_id: item.domain_id
          };
        });
      } else if (resData?.id) {
        // Objeto único de item
        const brandAttr = resData.attributes?.find((a: any) => a.id === 'BRAND')?.value_name || '';
        const gtinAttr = resData.attributes?.find((a: any) => a.id === 'GTIN')?.value_name || '';
        itemsList = [{
          id: resData.id,
          title: resData.title || resData.name || '',
          price: resData.price || 0,
          thumbnail: resData.pictures?.[0]?.secure_url || resData.thumbnail || '',
          permalink: resData.permalink || `https://produto.mercadolivre.com.br/${resData.id}`,
          brand: brandAttr,
          gtin: gtinAttr,
          domain_id: resData.domain_id
        }];
      }

      setCandidates(itemsList);

      if (itemsList.length === 0) {
        toast({
          title: "Nenhum resultado encontrado",
          description: "Tente pesquisar com outro termo ou nome de produto.",
        });
      }
    } catch (err) {
      console.error('Erro ao buscar no Mercado Livre:', err);
      toast({
        title: "Erro na busca do Mercado Livre",
        description: "Não foi possível consultar os anúncios de referência.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, toast]);

  useEffect(() => {
    if (isOpen) {
      const q = initialQuery || '';
      setSearchQuery(q);
      if (q.trim().length >= 3) {
        handleSearch(q);
      }
    }
  }, [isOpen, initialQuery, handleSearch]);

  const handleSelectCandidate = async (candidate: MlItemCandidate) => {
    setImportingId(candidate.id);
    toast({
      title: "Baixando dados e fotos HD...",
      description: "Sanitizando imagens para o servidor próprio e extraindo atributos...",
    });

    try {
      // 1. Buscar detalhes completos do item (/items/MLBxxx)
      const { data: itemDetail } = await supabase.functions.invoke('ml-public-search', {
        body: { path: `/items/${candidate.id}` }
      });

      const fullItem = itemDetail || candidate;

      // 2. Buscar Descrição do item (/items/MLBxxx/description)
      let descriptionText = '';
      try {
        const { data: descData } = await supabase.functions.invoke('ml-public-search', {
          body: { path: `/items/${candidate.id}/description` }
        });
        descriptionText = descData?.plain_text || descData?.text || '';
      } catch (e) {
        console.warn('Descrição não encontrada:', e);
      }

      // 3. Extrair Fotos HD
      let rawPictures: string[] = [];
      if (fullItem.pictures && Array.isArray(fullItem.pictures)) {
        rawPictures = fullItem.pictures.map((p: any) => p.secure_url || p.url).filter(Boolean);
      }
      if (rawPictures.length === 0 && candidate.thumbnail) {
        rawPictures = [candidate.thumbnail.replace('-I.jpg', '-O.jpg')];
      }

      // 4. Sanitizar Mídias para o Bucket product-images da VPS
      let sanitizedUrls: string[] = [];
      if (rawPictures.length > 0) {
        try {
          const { data: sanitizeRes } = await supabase.functions.invoke('ml-sanitize-image', {
            body: { urls: rawPictures }
          });
          if (sanitizeRes?.sanitizedUrls && Array.isArray(sanitizeRes.sanitizedUrls)) {
            sanitizedUrls = sanitizeRes.sanitizedUrls;
          }
        } catch (sanitizeErr) {
          console.warn('Erro ao sanitizar imagens no modal:', sanitizeErr);
          sanitizedUrls = rawPictures;
        }
      }

      const formattedImages: ImageFile[] = sanitizedUrls.map((url, idx) => ({
        id: `ml-import-${idx}-${Date.now()}`,
        preview: url,
        url: url,
        isMain: idx === 0,
        isUploading: false
      }));

      // 5. Extrair Atributos e Especificações
      const specList: Array<{ key: string; value: string }> = [];
      let extractedBrand = candidate.brand || '';
      let extractedGtin = candidate.gtin || '';

      if (fullItem.attributes && Array.isArray(fullItem.attributes)) {
        fullItem.attributes.forEach((attrItem: any) => {
          const attrName = attrItem.name || attrItem.id;
          const attrVal = attrItem.value_name || attrItem.value;

          if (attrItem.id === 'BRAND' && attrVal) extractedBrand = attrVal;
          if (attrItem.id === 'GTIN' && attrVal && /^\d{12,14}$/.test(attrVal.trim())) extractedGtin = attrVal.trim();

          if (attrName && attrVal && attrVal !== 'Não' && attrVal !== 'N/A') {
            specList.push({ key: attrName, value: attrVal });
          }
        });
      }

      // Aplicar os dados no formulário
      onApplyReference({
        name: fullItem.title || candidate.title,
        description: descriptionText,
        brand: extractedBrand,
        gtin_ean13: extractedGtin,
        price: fullItem.price || candidate.price || 0,
        reference_ad_url: candidate.permalink,
        images: formattedImages,
        specifications: specList,
      });

      toast({
        title: "✨ Produto Importado com Sucesso!",
        description: "Formulário preenchido com fotos HD tratadas, descrição e especificações.",
      });

      onClose();
    } catch (err) {
      console.error('Erro ao importar produto do ML:', err);
      toast({
        title: "Erro ao importar dados do produto",
        description: "Não foi possível puxar os detalhes completos.",
        variant: "destructive"
      });
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
                          <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden border bg-muted/20">
                            <img
                              src={cand.thumbnail}
                              alt={cand.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = 'https://lojafy-supabase.d2x.site/storage/v1/object/public/system/placeholder.png';
                              }}
                            />
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
