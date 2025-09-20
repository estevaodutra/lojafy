import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ColorPicker } from '@/components/admin/ColorPicker';
import { LogoUpload } from '@/components/admin/LogoUpload';
import { useResellerStore } from '@/hooks/useResellerStore';
import { useToast } from '@/hooks/use-toast';
import { 
  Store, 
  Palette, 
  Package, 
  Settings, 
  Eye, 
  ExternalLink,
  Upload,
  Save,
  Smartphone,
  Monitor,
  Tablet,
  Edit,
  Loader2
} from 'lucide-react';

const ResellerStoreEditor = () => {
  const { toast } = useToast();
  const { 
    store, 
    products, 
    isLoading, 
    createOrUpdateStore, 
    updateProductStatus, 
    updateProductPrice 
  } = useResellerStore();

  const [storeConfig, setStoreConfig] = useState({
    name: store?.store_name || 'Minha Loja',
    slug: store?.store_slug || '',
    logo: store?.logo_url || null,
    primaryColor: store?.primary_color || '#000000',
    secondaryColor: store?.secondary_color || '#f3f4f6',
    accentColor: store?.accent_color || '#3b82f6',
    bannerTitle: store?.banner_title || 'Bem-vindos à nossa loja',
    bannerSubtitle: store?.banner_subtitle || 'Os melhores produtos com preços especiais',
    bannerImage: store?.banner_image_url || null,
    phone: store?.contact_phone || '',
    email: store?.contact_email || '',
    address: store?.contact_address || '',
    whatsapp: store?.whatsapp || ''
  });

  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState('');

  const handleColorChange = (colorType: string, color: string) => {
    setStoreConfig(prev => ({
      ...prev,
      [colorType]: color
    }));
  };

  const toggleProductActive = async (productId: string) => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) return;
      
      await updateProductStatus(product.id, !product.active);
      toast({
        title: product.active ? "Produto desativado" : "Produto ativado",
        description: `${product.product?.name} foi ${product.active ? 'removido da' : 'adicionado à'} loja.`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o produto.",
        variant: "destructive",
      });
    }
  };

  const handlePriceEdit = (productId: string, currentPrice: number) => {
    setEditingPrice(productId);
    setNewPrice(currentPrice.toString());
  };

  const handlePriceSave = async (productId: string) => {
    try {
      const price = parseFloat(newPrice);
      if (isNaN(price) || price <= 0) {
        toast({
          title: "Erro",
          description: "Preço inválido",
          variant: "destructive",
        });
        return;
      }

      await updateProductPrice(productId, price);
      setEditingPrice(null);
      setNewPrice('');
      
      toast({
        title: "Preço atualizado!",
        description: "O preço do produto foi atualizado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o preço.",
        variant: "destructive",
      });
    }
  };

  const handleSaveStore = async () => {
    try {
      await createOrUpdateStore({
        store_name: storeConfig.name,
        store_slug: storeConfig.slug,
        logo_url: storeConfig.logo,
        primary_color: storeConfig.primaryColor,
        secondary_color: storeConfig.secondaryColor,
        accent_color: storeConfig.accentColor,
        banner_title: storeConfig.bannerTitle,
        banner_subtitle: storeConfig.bannerSubtitle,
        banner_image_url: storeConfig.bannerImage,
        contact_phone: storeConfig.phone,
        contact_email: storeConfig.email,
        contact_address: storeConfig.address,
        whatsapp: storeConfig.whatsapp,
      });
      
      toast({
        title: "Loja salva!",
        description: "As configurações da sua loja foram salvas com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    }
  };

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Editor da Minha Loja</h1>
          <p className="text-muted-foreground">
            Personalize sua loja e gerencie seus produtos
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleSaveStore} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Alterações
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor Panel */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="visual" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="visual">
                <Palette className="h-4 w-4 mr-2" />
                Visual
              </TabsTrigger>
              <TabsTrigger value="products">
                <Package className="h-4 w-4 mr-2" />
                Produtos
              </TabsTrigger>
              <TabsTrigger value="config">
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </TabsTrigger>
              <TabsTrigger value="store">
                <Store className="h-4 w-4 mr-2" />
                Loja
              </TabsTrigger>
            </TabsList>

            {/* Visual Tab */}
            <TabsContent value="visual" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Identidade Visual</CardTitle>
                  <CardDescription>
                    Personalize as cores e logo da sua loja
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label>Logo da Loja</Label>
                    <div className="mt-2">
                      <LogoUpload
                        onImageUploaded={(url) => 
                          setStoreConfig(prev => ({ ...prev, logo: url }))
                        }
                        currentImage={storeConfig.logo}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Cor Primária</Label>
                      <ColorPicker
                        color={storeConfig.primaryColor}
                        onChange={(color) => handleColorChange('primaryColor', color)}
                      />
                    </div>
                    <div>
                      <Label>Cor Secundária</Label>
                      <ColorPicker
                        color={storeConfig.secondaryColor}
                        onChange={(color) => handleColorChange('secondaryColor', color)}
                      />
                    </div>
                    <div>
                      <Label>Cor de Destaque</Label>
                      <ColorPicker
                        color={storeConfig.accentColor}
                        onChange={(color) => handleColorChange('accentColor', color)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Banner Principal</CardTitle>
                  <CardDescription>
                    Configure o banner de destaque da sua loja
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="bannerTitle">Título do Banner</Label>
                    <Input
                      id="bannerTitle"
                      value={storeConfig.bannerTitle}
                      onChange={(e) => 
                        setStoreConfig(prev => ({ ...prev, bannerTitle: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="bannerSubtitle">Subtítulo</Label>
                    <Input
                      id="bannerSubtitle"
                      value={storeConfig.bannerSubtitle}
                      onChange={(e) => 
                        setStoreConfig(prev => ({ ...prev, bannerSubtitle: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Imagem do Banner</Label>
                    <div className="mt-2">
                      <Button variant="outline" className="w-full">
                        <Upload className="h-4 w-4 mr-2" />
                        Fazer Upload da Imagem
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Products Tab */}
            <TabsContent value="products" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Produtos da Loja</CardTitle>
                  <CardDescription>
                    Gerencie os produtos ativos na sua loja
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : products.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-medium mb-2">Nenhum produto na loja</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Vá para o catálogo e adicione alguns produtos à sua loja.
                      </p>
                      <Button variant="outline">
                        <Package className="h-4 w-4 mr-2" />
                        Ir para o Catálogo
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {products.map((resellerProduct) => (
                        <div 
                          key={resellerProduct.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex items-center space-x-4">
                            <img 
                              src={resellerProduct.product?.main_image_url || '/api/placeholder/300/300'}
                              alt={resellerProduct.product?.name || 'Produto'}
                              className="h-16 w-16 object-cover rounded-lg"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">{resellerProduct.product?.name}</h4>
                              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                <span>Preço sugerido: R$ {resellerProduct.product?.price?.toFixed(2)}</span>
                                <span>•</span>
                                {editingPrice === resellerProduct.id ? (
                                  <div className="flex items-center gap-2">
                                    <span>Meu preço: R$</span>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={newPrice}
                                      onChange={(e) => setNewPrice(e.target.value)}
                                      className="w-24 h-6 text-sm"
                                    />
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => handlePriceSave(resellerProduct.id)}
                                    >
                                      <Save className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span>Meu preço: R$ {resellerProduct.custom_price?.toFixed(2)}</span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handlePriceEdit(resellerProduct.id, resellerProduct.custom_price || 0)}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <Badge variant={resellerProduct.active ? "default" : "secondary"}>
                              {resellerProduct.active ? "Ativo" : "Inativo"}
                            </Badge>
                            <Switch
                              checked={resellerProduct.active}
                              onCheckedChange={() => toggleProductActive(resellerProduct.id)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Config Tab */}
            <TabsContent value="config" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Informações da Loja</CardTitle>
                  <CardDescription>
                    Configure dados básicos da sua loja
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="storeName">Nome da Loja</Label>
                      <Input
                        id="storeName"
                        value={storeConfig.name}
                        onChange={(e) => 
                          setStoreConfig(prev => ({ ...prev, name: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="storeSlug">URL da Loja</Label>
                      <Input
                        id="storeSlug"
                        value={storeConfig.slug}
                        onChange={(e) => 
                          setStoreConfig(prev => ({ ...prev, slug: e.target.value }))
                        }
                        className="font-mono"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Será: loja.com/{storeConfig.slug}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        value={storeConfig.phone}
                        onChange={(e) => 
                          setStoreConfig(prev => ({ ...prev, phone: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        value={storeConfig.email}
                        onChange={(e) => 
                          setStoreConfig(prev => ({ ...prev, email: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address">Endereço</Label>
                    <Textarea
                      id="address"
                      value={storeConfig.address}
                      onChange={(e) => 
                        setStoreConfig(prev => ({ ...prev, address: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="whatsapp">WhatsApp (com DDI)</Label>
                    <Input
                      id="whatsapp"
                      value={storeConfig.whatsapp}
                      onChange={(e) => 
                        setStoreConfig(prev => ({ ...prev, whatsapp: e.target.value }))
                      }
                      placeholder="5511999999999"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Store Tab */}
            <TabsContent value="store" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sua Loja Online</CardTitle>
                  <CardDescription>
                    Acesse e compartilhe sua loja personalizada
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">URL da sua loja:</p>
                        <p className="text-sm text-muted-foreground font-mono">
                          https://loja.com/{storeConfig.slug}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Abrir Loja
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>QR Code da Loja</Label>
                    <div className="flex items-center justify-center p-8 border-2 border-dashed rounded-lg">
                      <div className="text-center">
                        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          QR Code será gerado aqui
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline">Baixar QR Code</Button>
                    <Button variant="outline">Compartilhar</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Preview da Loja</CardTitle>
                <div className="flex space-x-1">
                  {['mobile', 'tablet', 'desktop'].map((device) => (
                    <Button
                      key={device}
                      variant={previewDevice === device ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPreviewDevice(device)}
                    >
                      {getDeviceIcon(device)}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`
                border rounded-lg overflow-hidden transition-all
                ${previewDevice === 'mobile' ? 'max-w-sm mx-auto' : ''}
                ${previewDevice === 'tablet' ? 'max-w-md mx-auto' : ''}
              `}>
                <div 
                  className="h-64 bg-gradient-to-r from-primary/20 to-accent/20 flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${storeConfig.primaryColor}20, ${storeConfig.accentColor}20)`
                  }}
                >
                  <div className="text-center text-white">
                    <h3 className="text-lg font-bold">{storeConfig.bannerTitle}</h3>
                    <p className="text-sm opacity-90">{storeConfig.bannerSubtitle}</p>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {products.filter(p => p.active).slice(0, 4).map((resellerProduct) => (
                      <div key={resellerProduct.id} className="text-center">
                        <div className="h-16 bg-muted rounded mb-2"></div>
                        <p className="text-xs font-medium truncate">{resellerProduct.product?.name}</p>
                        <p className="text-xs text-green-600">R$ {resellerProduct.custom_price?.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <Button className="w-full mt-4" variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                Preview Completo
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ResellerStoreEditor;