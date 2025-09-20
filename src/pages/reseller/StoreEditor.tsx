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
  Tablet
} from 'lucide-react';

const ResellerStoreEditor = () => {
  const [storeConfig, setStoreConfig] = useState({
    name: 'Minha Loja Tech',
    slug: 'loja-tech-pro',
    logo: null,
    primaryColor: '#000000',
    secondaryColor: '#f3f4f6',
    accentColor: '#3b82f6',
    bannerTitle: 'Tecnologia de Ponta',
    bannerSubtitle: 'Os melhores produtos com preços incríveis',
    bannerImage: null,
    phone: '(11) 99999-9999',
    email: 'contato@lojatechpro.com',
    address: 'São Paulo, SP',
    whatsapp: '5511999999999'
  });

  const [activeProducts, setActiveProducts] = useState([
    {
      id: 1,
      name: "Smartphone Galaxy Pro Max",
      image: "/api/placeholder/300/300",
      originalPrice: 1499,
      myPrice: 1399,
      active: true,
      position: 1
    },
    {
      id: 2,
      name: "Notebook Gaming Ultra 16GB", 
      image: "/api/placeholder/300/300",
      originalPrice: 2899,
      myPrice: 2799,
      active: true,
      position: 2
    },
    {
      id: 3,
      name: "Headphone Wireless Premium",
      image: "/api/placeholder/300/300",
      originalPrice: 299,
      myPrice: 279,
      active: false,
      position: 3
    }
  ]);

  const [previewDevice, setPreviewDevice] = useState('desktop');

  const handleColorChange = (colorType: string, color: string) => {
    setStoreConfig(prev => ({
      ...prev,
      [colorType]: color
    }));
  };

  const toggleProductActive = (productId: number) => {
    setActiveProducts(prev =>
      prev.map(product =>
        product.id === productId
          ? { ...product, active: !product.active }
          : product
      )
    );
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
          <Button>
            <Save className="h-4 w-4 mr-2" />
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
                  <div className="space-y-4">
                    {activeProducts.map((product) => (
                      <div 
                        key={product.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center space-x-4">
                          <img 
                            src={product.image}
                            alt={product.name}
                            className="h-16 w-16 object-cover rounded-lg"
                          />
                          <div>
                            <h4 className="font-medium">{product.name}</h4>
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <span>Preço sugerido: R$ {product.originalPrice}</span>
                              <span>•</span>
                              <span>Meu preço: R$ {product.myPrice}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <Badge variant={product.active ? "default" : "secondary"}>
                            {product.active ? "Ativo" : "Inativo"}
                          </Badge>
                          <Switch
                            checked={product.active}
                            onCheckedChange={() => toggleProductActive(product.id)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Button variant="outline" className="w-full mt-4">
                    <Package className="h-4 w-4 mr-2" />
                    Adicionar Mais Produtos
                  </Button>
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
                    {activeProducts.filter(p => p.active).slice(0, 4).map((product) => (
                      <div key={product.id} className="text-center">
                        <div className="h-16 bg-muted rounded mb-2"></div>
                        <p className="text-xs font-medium truncate">{product.name}</p>
                        <p className="text-xs text-green-600">R$ {product.myPrice}</p>
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