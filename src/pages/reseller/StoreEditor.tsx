import React, { useState, useEffect } from 'react';
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
  Settings, 
  Eye, 
  ExternalLink,
  Upload,
  Save,
  Smartphone,
  Monitor,
  Tablet,
  Loader2
} from 'lucide-react';

const ResellerStoreEditor = () => {
  const { toast } = useToast();
  const { 
    store, 
    products,
    isLoading, 
    createOrUpdateStore,
    updateAllProductsMargin
  } = useResellerStore();

  const [storeConfig, setStoreConfig] = useState({
    storeName: 'Minha Loja',
    storeSlug: '',
    logoUrl: null,
    primaryColor: '#000000',
    secondaryColor: '#f3f4f6',
    accentColor: '#3b82f6',
    bannerTitle: 'Bem-vindos à nossa loja',
    bannerSubtitle: 'Os melhores produtos com preços especiais',
    bannerImageUrl: null,
    contactPhone: '',
    contactEmail: '',
    contactAddress: '',
    whatsapp: '',
    defaultMargin: 30
  });
  
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);

  // Sync storeConfig with loaded store data
  useEffect(() => {
    if (store) {
      setStoreConfig({
        storeName: store.store_name || 'Minha Loja',
        storeSlug: store.store_slug || '',
        logoUrl: store.logo_url || null,
        primaryColor: store.primary_color || '#000000',
        secondaryColor: store.secondary_color || '#f3f4f6',
        accentColor: store.accent_color || '#3b82f6',
        bannerTitle: store.banner_title || 'Bem-vindos à nossa loja',
        bannerSubtitle: store.banner_subtitle || 'Os melhores produtos com preços especiais',
        bannerImageUrl: store.banner_image_url || null,
        contactPhone: store.contact_phone || '',
        contactEmail: store.contact_email || '',
        contactAddress: store.contact_address || '',
        whatsapp: store.whatsapp || '',
        defaultMargin: store.default_margin || 30
      });
    }
  }, [store]);

  const [activeTab, setActiveTab] = useState('visual');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [showPreview, setShowPreview] = useState(false);

  const handleColorChange = (colorType: string, color: string) => {
    setStoreConfig(prev => ({
      ...prev,
      [colorType]: color
    }));
  };

  const handleNumberChange = (field: string, value: number) => {
    setStoreConfig(prev => ({
      ...prev,
      [field]: value
    }));
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
        default_margin: storeConfig.defaultMargin,
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

  const handleApplyMarginToAll = async () => {
    if (!storeConfig.defaultMargin || storeConfig.defaultMargin <= 0) {
      toast({
        title: "Erro",
        description: "Informe uma margem válida (maior que 0%)",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingPrices(true);
    
    try {
      await updateAllProductsMargin(storeConfig.defaultMargin);
      
      toast({
        title: "Preços atualizados!",
        description: `Margem de ${storeConfig.defaultMargin}% aplicada a todos os produtos.`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar os preços.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPrices(false);
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
            Personalize sua loja online
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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="visual">
                  <Palette className="h-4 w-4 mr-2" />
                  Visual
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

                <Card>
                  <CardHeader>
                    <CardTitle>Configuração de Preços</CardTitle>
                    <CardDescription>
                      Configure a margem de lucro padrão para todos os produtos
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="defaultMargin">Margem de Lucro Padrão (%)</Label>
                        <Input
                          id="defaultMargin"
                          type="number"
                          min="0"
                          max="1000"
                          value={storeConfig.defaultMargin}
                          onChange={(e) => handleNumberChange('defaultMargin', Number(e.target.value))}
                          placeholder="30"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Margem que será aplicada sobre o preço original dos produtos
                        </p>
                      </div>
                      <div className="flex flex-col justify-end">
                        <Button 
                          onClick={handleApplyMarginToAll}
                          disabled={isUpdatingPrices || !products.length}
                          variant="outline"
                        >
                          {isUpdatingPrices ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : null}
                          Aplicar a todos os produtos ({products.length})
                        </Button>
                      </div>
                    </div>

                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Como funciona:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• A margem é calculada sobre o preço original do produto</li>
                        <li>• Exemplo: Produto R$ 100 + 30% = R$ 130</li>
                        <li>• Todos os preços customizados serão sobrescritos</li>
                        <li>• Esta ação não pode ser desfeita</li>
                      </ul>
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

                {/* Produtos de exemplo para preview */}
                <div className="p-6">
                  <h2 
                    className="text-xl font-semibold mb-4"
                    style={{ color: storeConfig.primaryColor || '#000000' }}
                  >
                    Produtos em Destaque
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="border rounded-lg p-3 bg-background">
                        <div className="aspect-square bg-muted rounded mb-2 overflow-hidden">
                          <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/20 flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">Produto</span>
                          </div>
                        </div>
                        <h3 className="font-medium text-sm mb-1">
                          Produto Exemplo {i}
                        </h3>
                        <p 
                          className="font-bold text-sm"
                          style={{ color: storeConfig.accentColor || '#3b82f6' }}
                        >
                          R$ {(99.90 + i * 10).toFixed(2)}
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