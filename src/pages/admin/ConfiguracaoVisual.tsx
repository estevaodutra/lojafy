import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Palette, Image, Settings, Star, Package, Loader2 } from 'lucide-react';
import { ColorPicker } from '@/components/admin/ColorPicker';
import { SimpleImageUpload } from '@/components/admin/SimpleImageUpload';

interface StoreConfig {
  id: string;
  header_message: string;
  header_message_color: string;
  header_background_color: string;
  logo_url: string | null;
  store_name: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  buy_button_color: string;
  buy_button_text_color: string;
  product_info_color: string;
  benefits_config: any[];
  order_summary_highlight_color: string;
  order_summary_highlight_text: string;
  active: boolean;
}

const ConfiguracaoVisual = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('header');

  const { data: config, isLoading } = useQuery({
    queryKey: ['store-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_config')
        .select('*')
        .eq('active', true)
        .single();
      
      if (error) throw error;
      return data as StoreConfig;
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (updates: Partial<StoreConfig>) => {
      if (!config) throw new Error('No config found');
      
      const { error } = await supabase
        .from('store_config')
        .update(updates)
        .eq('id', config.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-config'] });
      toast({
        title: "Configuração salva",
        description: "As mudanças foram aplicadas com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    },
  });

  const handleSave = (updates: Partial<StoreConfig>) => {
    updateConfigMutation.mutate(updates);
  };

  const handleBenefitUpdate = (benefits: any[]) => {
    handleSave({ benefits_config: benefits });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center p-8">
        <p>Configuração não encontrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Palette className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Configuração Visual</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="header">Header & Logo</TabsTrigger>
          <TabsTrigger value="cores">Cores Principais</TabsTrigger>
          <TabsTrigger value="botoes">Botões & Produtos</TabsTrigger>
          <TabsTrigger value="vantagens">Vantagens</TabsTrigger>
          <TabsTrigger value="resumo">Resumo Pedido</TabsTrigger>
        </TabsList>

        <TabsContent value="header" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Header & Logo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="storeName">Nome da Loja</Label>
                <Input
                  id="storeName"
                  value={config.store_name}
                  onChange={(e) => handleSave({ store_name: e.target.value })}
                  placeholder="Nome da sua loja"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="headerMessage">Mensagem da Faixa Superior</Label>
                <Input
                  id="headerMessage"
                  value={config.header_message}
                  onChange={(e) => handleSave({ header_message: e.target.value })}
                  placeholder="Ex: Frete grátis para todo o Brasil acima de R$ 199"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cor de Fundo da Faixa</Label>
                  <ColorPicker
                    color={config.header_background_color}
                    onChange={(color) => handleSave({ header_background_color: color })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor do Texto da Faixa</Label>
                  <ColorPicker
                    color={config.header_message_color}
                    onChange={(color) => handleSave({ header_message_color: color })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Logo da Loja</Label>
                <SimpleImageUpload
                  onImageUploaded={(url) => handleSave({ logo_url: url })}
                  currentImage={config.logo_url}
                  accept="image/*"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cores" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Cores Principais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cor Primária</Label>
                  <ColorPicker
                    color={config.primary_color}
                    onChange={(color) => handleSave({ primary_color: color })}
                  />
                  <p className="text-sm text-muted-foreground">Usada em botões principais e links</p>
                </div>
                <div className="space-y-2">
                  <Label>Cor Secundária</Label>
                  <ColorPicker
                    color={config.secondary_color}
                    onChange={(color) => handleSave({ secondary_color: color })}
                  />
                  <p className="text-sm text-muted-foreground">Usada em backgrounds e superfícies</p>
                </div>
                <div className="space-y-2">
                  <Label>Cor de Destaque</Label>
                  <ColorPicker
                    color={config.accent_color}
                    onChange={(color) => handleSave({ accent_color: color })}
                  />
                  <p className="text-sm text-muted-foreground">Usada em badges e elementos especiais</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="botoes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Botões & Produtos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cor do Botão "Comprar"</Label>
                  <ColorPicker
                    color={config.buy_button_color}
                    onChange={(color) => handleSave({ buy_button_color: color })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor do Texto do Botão</Label>
                  <ColorPicker
                    color={config.buy_button_text_color}
                    onChange={(color) => handleSave({ buy_button_text_color: color })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor das Informações do Produto</Label>
                  <ColorPicker
                    color={config.product_info_color}
                    onChange={(color) => handleSave({ product_info_color: color })}
                  />
                  <p className="text-sm text-muted-foreground">Usada em preços e avaliações</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vantagens" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Vantagens da Loja
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {config.benefits_config.map((benefit, index) => (
                <div key={benefit.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{benefit.title}</h3>
                    <Switch
                      checked={benefit.active}
                      onCheckedChange={(checked) => {
                        const updated = [...config.benefits_config];
                        updated[index].active = checked;
                        handleBenefitUpdate(updated);
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Título</Label>
                      <Input
                        value={benefit.title}
                        onChange={(e) => {
                          const updated = [...config.benefits_config];
                          updated[index].title = e.target.value;
                          handleBenefitUpdate(updated);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Input
                        value={benefit.description}
                        onChange={(e) => {
                          const updated = [...config.benefits_config];
                          updated[index].description = e.target.value;
                          handleBenefitUpdate(updated);
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cor</Label>
                    <ColorPicker
                      color={benefit.color}
                      onChange={(color) => {
                        const updated = [...config.benefits_config];
                        updated[index].color = color;
                        handleBenefitUpdate(updated);
                      }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resumo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Resumo do Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="highlightText">Texto do Destaque</Label>
                <Input
                  id="highlightText"
                  value={config.order_summary_highlight_text}
                  onChange={(e) => handleSave({ order_summary_highlight_text: e.target.value })}
                  placeholder="Ex: Economize com o frete grátis!"
                />
              </div>
              <div className="space-y-2">
                <Label>Cor do Destaque</Label>
                <ColorPicker
                  color={config.order_summary_highlight_color}
                  onChange={(color) => handleSave({ order_summary_highlight_color: color })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConfiguracaoVisual;