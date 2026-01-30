import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone, Download, Share, ChevronRight, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallPWAStepProps {
  onComplete: () => void;
}

export const InstallPWAStep = ({ onComplete }: InstallPWAStepProps) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    setInstalling(true);
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        toast.success('Lojafy instalado com sucesso! 🎉');
      }
      
      setDeferredPrompt(null);
      onComplete();
    } catch (error) {
      console.error('Error installing PWA:', error);
      onComplete();
    } finally {
      setInstalling(false);
    }
  };

  // If already installed, skip to complete
  if (isStandalone) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Lojafy já instalado!</CardTitle>
          <CardDescription>
            O aplicativo já está na sua tela inicial
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onComplete} className="w-full" size="lg">
            Continuar para o Painel
          </Button>
        </CardContent>
      </Card>
    );
  }

  // iOS instructions
  if (isIOS) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Smartphone className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Instale a Lojafy</CardTitle>
          <CardDescription>
            Adicione o app na sua tela inicial para acesso rápido
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-muted p-4 rounded-lg space-y-4">
            <p className="text-sm font-medium text-center mb-2">
              Siga os passos abaixo:
            </p>
            
            <div className="flex items-center gap-3 p-3 bg-background rounded-md">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-primary">
                1
              </div>
              <div className="flex-1">
                <p className="text-sm">
                  Toque no botão <Share className="h-4 w-4 inline text-primary" /> Compartilhar
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-background rounded-md">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-primary">
                2
              </div>
              <div className="flex-1">
                <p className="text-sm">
                  Role e toque em "Adicionar à Tela de Início"
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-background rounded-md">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-primary">
                3
              </div>
              <div className="flex-1">
                <p className="text-sm">
                  Toque em "Adicionar" para confirmar
                </p>
              </div>
            </div>
          </div>

          <Button onClick={onComplete} variant="ghost" className="w-full">
            Continuar sem instalar
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Android / Desktop with install prompt
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Smartphone className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Instale a Lojafy</CardTitle>
        <CardDescription>
          Adicione o app na sua tela inicial para acesso rápido e uma experiência ainda melhor
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="bg-muted/50 p-4 rounded-lg text-center">
          <div className="flex justify-center mb-3">
            <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-2xl font-bold text-primary-foreground">L</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Acesse suas vendas, pedidos e catálogo com um toque
          </p>
        </div>

        {deferredPrompt ? (
          <Button 
            onClick={handleInstall} 
            className="w-full" 
            size="lg"
            disabled={installing}
          >
            <Download className="h-4 w-4 mr-2" />
            {installing ? 'Instalando...' : 'Instalar Lojafy'}
          </Button>
        ) : (
          <div className="text-center text-sm text-muted-foreground">
            <p>O navegador ainda está carregando...</p>
            <p className="mt-1">Você pode instalar mais tarde nas configurações</p>
          </div>
        )}

        <Button onClick={onComplete} variant="ghost" className="w-full">
          Continuar sem instalar
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
};
