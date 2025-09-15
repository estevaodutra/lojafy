import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Palette, Image, Settings, Star, Package, Loader2, Save, ShoppingCart, Layout } from 'lucide-react';
import { ColorPicker } from '@/components/admin/ColorPicker';
import { LogoUpload } from '@/components/admin/LogoUpload';

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
  cart_button_color: string;
  cart_button_text_color: string;
  buy_now_button_color: string;
  buy_now_button_text_color: string;
  checkout_button_color: string;
  checkout_button_text_color: string;
  order_highlight_bg_color: string;
  security_text_color: string;
  continue_shopping_text_color: string;
  footer_description: string | null;
  company_cnpj: string | null;
  company_address: string | null;
  company_phone: string | null;
  company_email: string | null;
  business_hours: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  twitter_url: string | null;
  youtube_url: string | null;
  footer_developed_text: string | null;
  active: boolean;
}

const ConfiguracaoVisual = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('header');
  const [localConfig, setLocalConfig] = useState<StoreConfig | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

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

  // Update local config when server config changes
  useEffect(() => {
    if (config && !localConfig) {
      setLocalConfig(config);
    }
  }, [config]);

  const updateConfigMutation = useMutation({
    mutationFn: async (updates: Partial<StoreConfig>) => {
      if (!localConfig) throw new Error('No config found');
      
      const { error } = await supabase
        .from('store_config')
        .update(updates)
        .eq('id', localConfig.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-config'] });
      setHasChanges(false);
      toast({
        title: "Configurações salvas",
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

  const handleLocalChange = (updates: Partial<StoreConfig>) => {
    if (localConfig) {
      setLocalConfig({ ...localConfig, ...updates });
      setHasChanges(true);
    }
  };

  const handleSave = () => {
    if (localConfig && config) {
      const changes: Partial<StoreConfig> = {};
      (Object.keys(localConfig) as Array<keyof StoreConfig>).forEach(key => {
        if (localConfig[key] !== config[key]) {
          (changes as any)[key] = localConfig[key];
        }
      });
      
      if (Object.keys(changes).length > 0) {
        updateConfigMutation.mutate(changes);
      }
    }
  };

  const handleBenefitUpdate = (benefits: any[]) => {
    handleLocalChange({ benefits_config: benefits });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!localConfig) {
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
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="header">Header & Logo</TabsTrigger>
          <TabsTrigger value="cores">Cores Principais</TabsTrigger>
          <TabsTrigger value="botoes">Botões & Produtos</TabsTrigger>
          <TabsTrigger value="ecommerce">E-commerce</TabsTrigger>
          <TabsTrigger value="vantagens">Vantagens</TabsTrigger>
          <TabsTrigger value="resumo">Resumo Pedido</TabsTrigger>
          <TabsTrigger value="footer">Footer</TabsTrigger>
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
                  value={localConfig.store_name}
                  onChange={(e) => handleLocalChange({ store_name: e.target.value })}
                  placeholder="Nome da sua loja"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="headerMessage">Mensagem da Faixa Superior</Label>
                <Input
                  id="headerMessage"
                  value={localConfig.header_message}
                  onChange={(e) => handleLocalChange({ header_message: e.target.value })}
                  placeholder="Ex: Frete grátis para todo o Brasil acima de R$ 199"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cor de Fundo da Faixa</Label>
                  <ColorPicker
                    color={localConfig.header_background_color}
                    onChange={(color) => handleLocalChange({ header_background_color: color })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor do Texto da Faixa</Label>
                  <ColorPicker
                    color={localConfig.header_message_color}
                    onChange={(color) => handleLocalChange({ header_message_color: color })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Logo da Loja</Label>
                <LogoUpload
                  onImageUploaded={(url) => handleLocalChange({ logo_url: url })}
                  currentImage={localConfig.logo_url}
                />
              </div>
              
              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSave} 
                  disabled={!hasChanges || updateConfigMutation.isPending}
                >
                  {updateConfigMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar Configurações
                </Button>
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
                    color={localConfig.primary_color}
                    onChange={(color) => handleLocalChange({ primary_color: color })}
                  />
                  <p className="text-sm text-muted-foreground">Usada em botões principais e links</p>
                </div>
                <div className="space-y-2">
                  <Label>Cor Secundária</Label>
                  <ColorPicker
                    color={localConfig.secondary_color}
                    onChange={(color) => handleLocalChange({ secondary_color: color })}
                  />
                  <p className="text-sm text-muted-foreground">Usada em backgrounds e superfícies</p>
                </div>
                <div className="space-y-2">
                  <Label>Cor de Destaque</Label>
                  <ColorPicker
                    color={localConfig.accent_color}
                    onChange={(color) => handleLocalChange({ accent_color: color })}
                  />
                  <p className="text-sm text-muted-foreground">Usada em badges e elementos especiais</p>
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSave} 
                  disabled={!hasChanges || updateConfigMutation.isPending}
                >
                  {updateConfigMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar Configurações
                </Button>
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
                    color={localConfig.buy_button_color}
                    onChange={(color) => handleLocalChange({ buy_button_color: color })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor do Texto do Botão</Label>
                  <ColorPicker
                    color={localConfig.buy_button_text_color}
                    onChange={(color) => handleLocalChange({ buy_button_text_color: color })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor das Informações do Produto</Label>
                  <ColorPicker
                    color={localConfig.product_info_color}
                    onChange={(color) => handleLocalChange({ product_info_color: color })}
                  />
                  <p className="text-sm text-muted-foreground">Usada em preços e avaliações</p>
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSave} 
                  disabled={!hasChanges || updateConfigMutation.isPending}
                >
                  {updateConfigMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar Configurações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ecommerce" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Botões E-commerce
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure as cores dos botões de carrinho e checkout
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Botões do Produto</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cor do Botão "Adicionar ao Carrinho"</Label>
                    <ColorPicker
                      color={localConfig.cart_button_color}
                      onChange={(color) => handleLocalChange({ cart_button_color: color })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cor do Texto "Adicionar ao Carrinho"</Label>
                    <ColorPicker
                      color={localConfig.cart_button_text_color}
                      onChange={(color) => handleLocalChange({ cart_button_text_color: color })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cor do Botão "Comprar Agora"</Label>
                    <ColorPicker
                      color={localConfig.buy_now_button_color}
                      onChange={(color) => handleLocalChange({ buy_now_button_color: color })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cor do Texto "Comprar Agora"</Label>
                    <ColorPicker
                      color={localConfig.buy_now_button_text_color}
                      onChange={(color) => handleLocalChange({ buy_now_button_text_color: color })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Botões de Checkout</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cor do Botão "Finalizar Compra"</Label>
                    <ColorPicker
                      color={localConfig.checkout_button_color}
                      onChange={(color) => handleLocalChange({ checkout_button_color: color })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cor do Texto "Finalizar Compra"</Label>
                    <ColorPicker
                      color={localConfig.checkout_button_text_color}
                      onChange={(color) => handleLocalChange({ checkout_button_text_color: color })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Textos e Áreas</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cor de Fundo das Áreas Destacadas</Label>
                    <ColorPicker
                      color={localConfig.order_highlight_bg_color}
                      onChange={(color) => handleLocalChange({ order_highlight_bg_color: color })}
                    />
                    <p className="text-sm text-muted-foreground">Fundo de informações especiais</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Cor do Texto de Segurança</Label>
                    <ColorPicker
                      color={localConfig.security_text_color}
                      onChange={(color) => handleLocalChange({ security_text_color: color })}
                    />
                    <p className="text-sm text-muted-foreground">"Compra 100% segura"</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Cor do Link "Continuar Comprando"</Label>
                    <ColorPicker
                      color={localConfig.continue_shopping_text_color}
                      onChange={(color) => handleLocalChange({ continue_shopping_text_color: color })}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSave} 
                  disabled={!hasChanges || updateConfigMutation.isPending}
                >
                  {updateConfigMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar Configurações
                </Button>
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
              {localConfig.benefits_config.map((benefit, index) => (
                <div key={benefit.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{benefit.title}</h3>
                      <Switch
                        checked={benefit.active}
                        onCheckedChange={(checked) => {
                          const updated = [...localConfig.benefits_config];
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
                          const updated = [...localConfig.benefits_config];
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
                          const updated = [...localConfig.benefits_config];
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
                        const updated = [...localConfig.benefits_config];
                        updated[index].color = color;
                        handleBenefitUpdate(updated);
                      }}
                    />
                  </div>
                </div>
                ))}
                
                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={handleSave} 
                    disabled={!hasChanges || updateConfigMutation.isPending}
                  >
                    {updateConfigMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Salvar Configurações
                  </Button>
                </div>
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
                  value={localConfig.order_summary_highlight_text}
                  onChange={(e) => handleLocalChange({ order_summary_highlight_text: e.target.value })}
                  placeholder="Ex: Economize com o frete grátis!"
                />
              </div>
              <div className="space-y-2">
                <Label>Cor do Destaque</Label>
                <ColorPicker
                  color={localConfig.order_summary_highlight_color}
                  onChange={(color) => handleLocalChange({ order_summary_highlight_color: color })}
                />
              </div>
              
              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSave} 
                  disabled={!hasChanges || updateConfigMutation.isPending}
                >
                  {updateConfigMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar Configurações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="footer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layout className="h-5 w-5" />
                Configurações do Footer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Company Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Informações da Empresa</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="footer_description">Descrição da Empresa</Label>
                    <textarea
                      id="footer_description"
                      placeholder="Sua loja online de confiança..."
                      className="min-h-[80px] w-full px-3 py-2 border border-input bg-background text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
                      value={localConfig.footer_description || ''}
                      onChange={(e) => handleLocalChange({ footer_description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_cnpj">CNPJ</Label>
                    <Input
                      id="company_cnpj"
                      placeholder="12.345.678/0001-90"
                      value={localConfig.company_cnpj || ''}
                      onChange={(e) => handleLocalChange({ company_cnpj: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_address">Endereço Completo</Label>
                    <Input
                      id="company_address"
                      placeholder="Rua das Flores, 123 - Centro - São Paulo/SP"
                      value={localConfig.company_address || ''}
                      onChange={(e) => handleLocalChange({ company_address: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_phone">Telefone</Label>
                    <Input
                      id="company_phone"
                      placeholder="(11) 99999-9999"
                      value={localConfig.company_phone || ''}
                      onChange={(e) => handleLocalChange({ company_phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_email">E-mail</Label>
                    <Input
                      id="company_email"
                      type="email"
                      placeholder="contato@suaempresa.com"
                      value={localConfig.company_email || ''}
                      onChange={(e) => handleLocalChange({ company_email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business_hours">Horário de Funcionamento</Label>
                    <Input
                      id="business_hours"
                      placeholder="Seg-Sex: 8h às 18h | Sáb: 8h às 14h"
                      value={localConfig.business_hours || ''}
                      onChange={(e) => handleLocalChange({ business_hours: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Social Media */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Redes Sociais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="facebook_url">Facebook URL</Label>
                    <Input
                      id="facebook_url"
                      placeholder="https://facebook.com/suaempresa"
                      value={localConfig.facebook_url || ''}
                      onChange={(e) => handleLocalChange({ facebook_url: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instagram_url">Instagram URL</Label>
                    <Input
                      id="instagram_url"
                      placeholder="https://instagram.com/suaempresa"
                      value={localConfig.instagram_url || ''}
                      onChange={(e) => handleLocalChange({ instagram_url: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="twitter_url">Twitter/X URL</Label>
                    <Input
                      id="twitter_url"
                      placeholder="https://twitter.com/suaempresa"
                      value={localConfig.twitter_url || ''}
                      onChange={(e) => handleLocalChange({ twitter_url: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="youtube_url">YouTube URL</Label>
                    <Input
                      id="youtube_url"
                      placeholder="https://youtube.com/@suaempresa"
                      value={localConfig.youtube_url || ''}
                      onChange={(e) => handleLocalChange({ youtube_url: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Custom Texts */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Textos Personalizados</h3>
                <div className="space-y-2">
                  <Label htmlFor="footer_developed_text">Texto "Desenvolvido por"</Label>
                  <Input
                    id="footer_developed_text"
                    placeholder="Desenvolvido com ❤️ para você"
                    value={localConfig.footer_developed_text || ''}
                    onChange={(e) => handleLocalChange({ footer_developed_text: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={handleSave}
                  disabled={!hasChanges || updateConfigMutation.isPending}
                  className="min-w-[150px]"
                >
                  {updateConfigMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar Configurações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConfiguracaoVisual;