import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Monitor, Tablet, Smartphone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface StorePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeConfig: any;
  storeUrl: string;
}

export const StorePreviewModal: React.FC<StorePreviewModalProps> = ({
  isOpen,
  onClose,
  storeConfig,
  storeUrl
}) => {
  const [previewDevice, setPreviewDevice] = React.useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'desktop': return Monitor;
      case 'tablet': return Tablet;
      case 'mobile': return Smartphone;
      default: return Monitor;
    }
  };

  const getDeviceClass = () => {
    switch (previewDevice) {
      case 'desktop': return 'w-full h-[600px]';
      case 'tablet': return 'w-[768px] h-[600px] mx-auto';
      case 'mobile': return 'w-[375px] h-[600px] mx-auto';
      default: return 'w-full h-[600px]';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Preview da Loja
            <div className="flex gap-2">
              {(['desktop', 'tablet', 'mobile'] as const).map((device) => {
                const Icon = getDeviceIcon(device);
                return (
                  <Button
                    key={device}
                    variant={previewDevice === device ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewDevice(device)}
                    className="p-2"
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                );
              })}
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden bg-muted/50 rounded-lg p-4">
          <div className={`border rounded-lg bg-background transition-all duration-300 ${getDeviceClass()}`}>
            <div className="h-full rounded-lg overflow-hidden">
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
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border rounded-lg p-3 bg-background">
                      <div className="aspect-square bg-muted rounded mb-2"></div>
                      <h3 className="font-medium text-sm mb-1">Produto {i}</h3>
                      <p 
                        className="font-bold"
                        style={{ color: storeConfig.accentColor || '#3b82f6' }}
                      >
                        R$ 99,90
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rodapé simulado */}
              <div 
                className="mt-auto p-6 text-center text-sm"
                style={{ 
                  backgroundColor: storeConfig.primaryColor || '#000000',
                  color: 'white'
                }}
              >
                <p>{storeConfig.contactPhone && `📱 ${storeConfig.contactPhone}`}</p>
                <p>{storeConfig.contactEmail && `📧 ${storeConfig.contactEmail}`}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4">
          <Badge variant="outline">
            URL: {storeUrl}
          </Badge>
          <Button onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};