import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface AiVariationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  selectedAds: any[];
  onSuccess: () => void;
}

export const AiVariationModal: React.FC<AiVariationModalProps> = ({
  open,
  onOpenChange,
  productId,
  selectedAds,
  onSuccess
}) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [quantity, setQuantity] = useState('3');
  const [objective, setObjective] = useState('Aumentar conversão');
  const [marketplace, setMarketplace] = useState('mercadolivre');
  const [apiKey, setApiKey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVariations, setGeneratedVariations] = useState<any[]>([]);

  const handleGenerate = async () => {
    if (selectedAds.length === 0) {
      toast({ variant: 'destructive', title: 'Selecione ao menos 1 anúncio de referência.' });
      return;
    }

    setIsGenerating(true);
    setGeneratedVariations([]);

    try {
      const { data, error } = await supabase.functions.invoke('ai-generate-ad-variants', {
        body: {
          product_id: productId,
          source_ads: selectedAds.map(a => ({
            internal_name: a.internal_name,
            public_title: a.variant_title,
            description: a.variant_description,
            price: a.price,
            visits: a.visits,
            sales: a.sales,
            marketplace: a.marketplace
          })),
          objective,
          requested_quantity: parseInt(quantity, 10),
          marketplace,
          apiKey: apiKey.trim() || undefined
        }
      });

      if (error) throw error;

      if (data?.success && Array.isArray(data.variations)) {
        setGeneratedVariations(data.variations);
        toast({ title: '🤖 Variações geradas com sucesso pela IA!' });

        // Salvar log de geração em ad_ai_generations
        await supabase.from('ad_ai_generations').insert({
          product_id: productId,
          requested_by: user?.id,
          objective,
          marketplace,
          requested_quantity: parseInt(quantity, 10),
          source_ad_ids: selectedAds.map(a => a.id),
          status: 'completed'
        });
      } else {
        throw new Error(data?.error || 'Falha ao processar variações');
      }

    } catch (e: any) {
      console.error('Error generating AI variants:', e);
      toast({ 
        variant: 'destructive', 
        title: 'Erro na geração por IA', 
        description: e.message || 'Verifique sua chave da OpenAI e tente novamente.' 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApproveAll = async () => {
    if (generatedVariations.length === 0) return;

    try {
      const newAdsPayload = generatedVariations.map(v => ({
        product_id: productId,
        user_id: user!.id,
        internal_name: v.internal_name,
        variant_title: v.public_title,
        variant_description: v.public_description,
        price: selectedAds[0]?.price || 0,
        status: 'draft',
        origin_type: 'ai_generated',
        origin_user_id: user!.id,
        marketplace,
        is_official_model: false
      }));

      const { error } = await supabase.from('ml_listing_variants').insert(newAdsPayload);
      if (error) throw error;

      toast({ title: '✨ Todas as variações geradas por IA foram salvas como Rascunho!' });
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao aprovar rascunhos', description: e.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Sparkles className="h-5 w-5 text-emerald-500" />
            Gerador de Variações de Anúncios com IA
          </DialogTitle>
          <DialogDescription>
            Crie novas variações campeãs baseadas na análise visual e performance dos anúncios selecionados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Anúncios de Referência */}
          <div className="bg-muted/40 p-3 rounded-lg border">
            <span className="text-xs font-semibold text-muted-foreground block mb-2">
              Anúncios de Referência Selecionados ({selectedAds.length}):
            </span>
            <div className="flex flex-wrap gap-2">
              {selectedAds.map(ad => (
                <Badge key={ad.id} variant="secondary" className="text-xs">
                  {ad.internal_name || ad.variant_title}
                </Badge>
              ))}
            </div>
          </div>

          {/* Configurações da IA */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Quantidade de Variações</Label>
              <Select value={quantity} onValueChange={setQuantity}>
                <SelectTrigger>
                  <SelectValue placeholder="Qtd" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 variações</SelectItem>
                  <SelectItem value="5">5 variações</SelectItem>
                  <SelectItem value="10">10 variações</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Objetivo Principal</Label>
              <Select value={objective} onValueChange={setObjective}>
                <SelectTrigger>
                  <SelectValue placeholder="Objetivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aumentar conversão">Aumentar Conversão</SelectItem>
                  <SelectItem value="Aumentar cliques">Aumentar Cliques</SelectItem>
                  <SelectItem value="Aumentar margem de lucro">Aumentar Margem</SelectItem>
                  <SelectItem value="Testar novos ângulos de venda">Testar Novos Ângulos</SelectItem>
                  <SelectItem value="Adaptar para o marketplace">Adaptar Canal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Marketplace Alvo</Label>
              <Select value={marketplace} onValueChange={setMarketplace}>
                <SelectTrigger>
                  <SelectValue placeholder="Marketplace" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mercadolivre">Mercado Livre (Máx 60 chars)</SelectItem>
                  <SelectItem value="shopee">Shopee</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Chave de API OpenAI Personalizada (Opcional) */}
          <div>
            <Label className="text-xs text-muted-foreground">Chave OpenAI API (Opcional - usa a padrão do servidor se vazio)</Label>
            <Input
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="text-xs"
            />
          </div>

          {/* Resultados Gerados */}
          {generatedVariations.length > 0 && (
            <div className="space-y-4 pt-2">
              <h4 className="font-bold text-sm text-foreground flex items-center justify-between">
                <span>Resultados Gerados em Rascunho ({generatedVariations.length})</span>
                <Button size="sm" onClick={handleApproveAll} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <CheckCircle2 className="h-4 w-4 mr-1.5" /> Aprovar e Salvar Todos
                </Button>
              </h4>

              <div className="space-y-3">
                {generatedVariations.map((varItem, idx) => (
                  <Card key={idx} className="p-4 border border-emerald-200 dark:border-emerald-900 bg-emerald-50/20 dark:bg-emerald-950/10">
                    <CardContent className="p-0 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge className="bg-emerald-600 text-white text-[11px]">
                          {varItem.internal_name}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">Rascunho IA #{idx + 1}</span>
                      </div>

                      <div className="font-semibold text-sm text-foreground">
                        {varItem.public_title}
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {varItem.public_description}
                      </p>

                      {varItem.rationale && (
                        <div className="text-[11px] bg-background p-2 rounded border italic text-muted-foreground">
                          💡 <strong>Justificativa da IA:</strong> {varItem.rationale}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            {isGenerating ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Gerando Variações...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> {generatedVariations.length > 0 ? 'Regerar Variações' : 'Gerar Variações por IA'}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
