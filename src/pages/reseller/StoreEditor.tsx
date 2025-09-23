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
import { BannerUpload } from '@/components/admin/BannerUpload';
import { useResellerStore } from '@/hooks/useResellerStore';
import { useToast } from '@/hooks/use-toast';
import { StorePreviewModal } from '@/components/reseller/StorePreviewModal';
import { QRCodeGenerator } from '@/components/reseller/QRCodeGenerator';
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
  Loader2,
  Check,
  X,
  Pencil
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
    storeName: store?.store_name || 'Minha Loja',
    storeSlug: store?.store_slug || '',
    logoUrl: store?.logo_url || null,
    primaryColor: store?.primary_color || '#000000',
    secondaryColor: store?.secondary_color || '#f3f4f6',
    accentColor: store?.accent_color || '#3b82f6',
    bannerTitle: store?.banner_title || 'Bem-vindos à nossa loja',
    bannerSubtitle: store?.banner_subtitle || 'Os melhores produtos com preços especiais',
    bannerImageUrl: store?.banner_image_url || null,
    contactPhone: store?.contact_phone || '',
    contactEmail: store?.contact_email || '',
    contactAddress: store?.contact_address || '',
    whatsapp: store?.whatsapp || ''
  });

  const [activeTab, setActiveTab] = useState('visual');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);

  const handleColorChange = (colorType: string, color: string) => {
    setStoreConfig(prev => ({
      ...prev,
      [colorType]: color
    }));
  };

  const toggleProductActive = async (productId: string, newStatus: boolean) => {
    try {
      await updateProductStatus(productId, newStatus);
      toast({
        title: newStatus ? "Produto ativado" : "Produto desativado",
        description: `Produto foi ${newStatus ? 'adicionado à' : 'removido da'} loja.`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o produto.",
        variant: "destructive",
      });
    }
  };

  const handlePriceEdit = (productId: string, currentPrice: string) => {
    setEditingPrice(productId);
    setNewPrice(currentPrice);
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
        store_name: storeConfig.storeName,
        store_slug: storeConfig.storeSlug,
        logo_url: storeConfig.logoUrl,
        primary_color: storeConfig.primaryColor,
        secondary_color: storeConfig.secondaryColor,
        accent_color: storeConfig.accentColor,
        banner_title: storeConfig.bannerTitle,
        banner_subtitle: storeConfig.bannerSubtitle,
        banner_image_url: storeConfig.bannerImageUrl,
        contact_phone: storeConfig.contactPhone,
        contact_email: storeConfig.contactEmail,
        contact_address: storeConfig.contactAddress,
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
    const Icon = device === 'desktop' ? Monitor : Smartphone;
    return <Icon className="h-4 w-4" />;
  };

  const storeUrl = storeConfig.storeSlug 
    ? `${window.location.origin}/loja/${storeConfig.storeSlug}` 
    : `${window.location.origin}/loja/minha-loja`;

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
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setPreviewDevice(previewDevice === 'desktop' ? 'mobile' : 'desktop')}>
              {getDeviceIcon(previewDevice)}
              <span className="ml-2 capitalize">{previewDevice}</span>
            </Button>
            <Button onClick={() => setShowPreview(true)}>
              Preview da Loja
            </Button>
          </div>
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

      <div className="grid grid-cols-1 gap-6">
        <div className="flex gap-6">
          {/* Editor Panel */}
          <div className="flex-1 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                  Config
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
                          onImageUploaded={(url) => handleColorChange('logoUrl', url)}
                          currentImage={storeConfig.logoUrl}
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
                        onChange={(e) => handleColorChange('bannerTitle', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="bannerSubtitle">Subtítulo</Label>
                      <Input
                        id="bannerSubtitle"
                        value={storeConfig.bannerSubtitle}
                        onChange={(e) => handleColorChange('bannerSubtitle', e.target.value)}
                      />
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label>Banner da Loja</Label>
                        <div className="mt-2">
                          <BannerUpload
                            onImageUploaded={(url) => handleColorChange('bannerImageUrl', url)}
                            currentImage={storeConfig.bannerImageUrl}
                          />
                        </div>
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
                    <div className="space-y-4">
                      {products.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>Nenhum produto adicionado à sua loja ainda.</p>
                          <p className="text-sm mt-1">Vá para o Catálogo para adicionar produtos.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4">
                          {products.map((product) => (
                            <Card key={product.id} className="p-4">
                              <div className="flex items-start gap-4">
                                <div className="w-20 h-20 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                                  {product.product?.main_image_url ? (
                                    <img 
                                      src={product.product.main_image_url} 
                                      alt={product.product.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/20 flex items-center justify-center">
                                      <span className="text-xs text-muted-foreground">Sem foto</span>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-base mb-2 line-clamp-2">
                                    {product.product?.name}
                                  </h4>
                                  
                                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                                    <div>
                                      <span className="text-muted-foreground">Preço Original:</span>
                                      <p className="font-medium">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.product?.price || 0)}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Seu Preço:</span>
                                      {editingPrice === product.id ? (
                                        <div className="flex gap-1 mt-1">
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={newPrice}
                                            onChange={(e) => setNewPrice(e.target.value)}
                                            className="h-8 text-sm"
                                            placeholder="0,00"
                                          />
                                          <Button
                                            size="sm"
                                            onClick={() => handlePriceSave(product.id)}
                                            className="h-8 px-2"
                                          >
                                            <Check className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setEditingPrice(null)}
                                            className="h-8 px-2"
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2 mt-1">
                                          <p className="font-bold text-primary">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.custom_price || 0)}
                                          </p>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handlePriceEdit(product.id, product.custom_price?.toString() || '')}
                                            className="h-6 w-6 p-0"
                                          >
                                            <Pencil className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex flex-col gap-2">
                                  <Button
                                    size="sm"
                                    variant={product.active ? "default" : "outline"}
                                    onClick={() => toggleProductActive(product.id, !product.active)}
                                    className="text-xs px-3"
                                  >
                                    {product.active ? "✅ Ativo" : "❌ Inativo"}
                                  </Button>
                                  <Badge variant={product.active ? "default" : "secondary"} className="text-xs text-center">
                                    {product.active ? "Visível" : "Oculto"}
                                  </Badge>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
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
                          value={storeConfig.storeName}
                          onChange={(e) => handleColorChange('storeName', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="storeSlug">URL da Loja</Label>
                        <Input
                          id="storeSlug"
                          value={storeConfig.storeSlug}
                          onChange={(e) => handleColorChange('storeSlug', e.target.value)}
                          className="font-mono"
                        />
                         <p className="text-xs text-muted-foreground mt-1">
                           Será: {window.location.host}/loja/{storeConfig.storeSlug || 'sua-loja'}
                         </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phone">Telefone</Label>
                        <Input
                          id="phone"
                          value={storeConfig.contactPhone}
                          onChange={(e) => handleColorChange('contactPhone', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          value={storeConfig.contactEmail}
                          onChange={(e) => handleColorChange('contactEmail', e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="address">Endereço</Label>
                      <Textarea
                        id="address"
                        value={storeConfig.contactAddress}
                        onChange={(e) => handleColorChange('contactAddress', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="whatsapp">WhatsApp (com DDI)</Label>
                      <Input
                        id="whatsapp"
                        value={storeConfig.whatsapp}
                        onChange={(e) => handleColorChange('whatsapp', e.target.value)}
                        placeholder="5511999999999"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Store Tab */}
              <TabsContent value="store" className="space-y-6">
                <QRCodeGenerator 
                  storeUrl={storeUrl}
                  storeName={storeConfig.storeName || 'Minha Loja'}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Preview Panel - Only show in Visual tab */}
          {activeTab === 'visual' && (
            <div className="w-1/2 border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Preview da Loja</h3>
              <div className="border rounded-lg overflow-hidden bg-background min-h-[500px]">
                {/* Header simulado */}
                <div 
                  className="h-16 flex items-center justify-between px-6"
                  style={{ backgroundColor: storeConfig.primaryColor || '#000000' }}
                >
                  {storeConfig.logoUrl ? (
                    <img 
                      src={storeConfig.logoUrl} 
                      alt="Logo" 
                      className="h-8 object-contain"
                    />
                  ) : (
                    <div 
                      className="h-8 w-24 rounded flex items-center justify-center text-sm font-medium"
                      style={{ 
                        backgroundColor: storeConfig.secondaryColor || '#f3f4f6',
                        color: storeConfig.primaryColor || '#000000'
                      }}
                    >
                      {storeConfig.storeName || 'Logo'}
                    </div>
                  )}
                  <div className="text-white text-sm">
                    {storeConfig.storeName || 'Minha Loja'}
                  </div>
                </div>

                {/* Banner simulado */}
                <div 
                  className="h-48 flex items-center justify-center"
                  style={{
                    backgroundColor: storeConfig.secondaryColor || '#f3f4f6',
                    backgroundImage: storeConfig.bannerImageUrl ? `url(${storeConfig.bannerImageUrl})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  <div className="text-center">
                    <h1 
                      className="text-2xl font-bold mb-2"
                      style={{ color: storeConfig.primaryColor || '#000000' }}
                    >
                      {storeConfig.bannerTitle || 'Bem-vindos à nossa loja'}
                    </h1>
                    <p 
                      className="text-lg"
                      style={{ color: storeConfig.primaryColor || '#000000' }}
                    >
                      {storeConfig.bannerSubtitle || 'Os melhores produtos com preços especiais'}
                    </p>
                  </div>
                </div>

                {/* Produtos simulados */}
                <div className="p-6">
                  <h2 
                    className="text-xl font-semibold mb-4"
                    style={{ color: storeConfig.primaryColor || '#000000' }}
                  >
                    Produtos em Destaque
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {products.slice(0, 6).map((product, i) => (
                      <div key={product.id} className="border rounded-lg p-3 bg-background">
                        <div className="aspect-square bg-muted rounded mb-2 overflow-hidden">
                          {product.product?.main_image_url ? (
                            <img 
                              src={product.product.main_image_url} 
                              alt={product.product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/20"></div>
                          )}
                        </div>
                        <h3 className="font-medium text-sm mb-1 line-clamp-2">
                          {product.product?.name || `Produto ${i + 1}`}
                        </h3>
                        <p 
                          className="font-bold text-sm"
                          style={{ color: storeConfig.accentColor || '#3b82f6' }}
                        >
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.custom_price || 99.90)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <StorePreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        storeConfig={storeConfig}
        storeUrl={storeUrl}
      />
    </div>
  );
};

export default ResellerStoreEditor;