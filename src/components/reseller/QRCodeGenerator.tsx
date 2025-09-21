import React from 'react';
import QRCode from 'react-qr-code';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Share2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QRCodeGeneratorProps {
  storeUrl: string;
  storeName: string;
}

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  storeUrl,
  storeName
}) => {
  const { toast } = useToast();

  const downloadQRCode = () => {
    const svg = document.getElementById('qr-code') as any;
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `qr-code-${storeName.toLowerCase().replace(/\s+/g, '-')}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    
    toast({
      title: "QR Code baixado",
      description: "O QR Code foi salvo no seu dispositivo.",
    });
  };

  const shareStore = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: storeName,
          text: `Confira minha loja: ${storeName}`,
          url: storeUrl
        });
      } catch (error) {
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(storeUrl);
    toast({
      title: "Link copiado",
      description: "O link da sua loja foi copiado para a área de transferência.",
    });
  };

  const openStore = () => {
    window.open(storeUrl, '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>QR Code da Loja</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center p-4 bg-white rounded-lg">
          <QRCode
            id="qr-code"
            value={storeUrl}
            size={200}
            style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
            viewBox="0 0 256 256"
          />
        </div>
        
        <div className="text-center text-sm text-muted-foreground">
          {storeUrl}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Button onClick={downloadQRCode} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Baixar QR
          </Button>
          
          <Button onClick={shareStore} variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Compartilhar
          </Button>
          
          <Button onClick={openStore} variant="outline" size="sm">
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir Loja
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};