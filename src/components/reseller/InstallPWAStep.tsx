import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone, Download, Share, ChevronRight, CheckCircle, Plus, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallPWAStepProps {
  onComplete: () => void;
}

type Platform = 'ios' | 'android' | 'desktop';
type Browser = 'safari' | 'chrome' | 'samsung' | 'edge' | 'firefox' | 'other';

const detectPlatform = (): Platform => {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
};

const detectBrowser = (): Browser => {
  const ua = navigator.userAgent;
  if (/SamsungBrowser/.test(ua)) return 'samsung';
  if (/Edg/.test(ua)) return 'edge';
  if (/Chrome/.test(ua)) return 'chrome';
  if (/Firefox/.test(ua)) return 'firefox';
  if (/Safari/.test(ua)) return 'safari';
  return 'other';
};

export const InstallPWAStep = ({ onComplete }: InstallPWAStepProps) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [platform] = useState<Platform>(detectPlatform);
  const [browser] = useState<Browser>(detectBrowser);

  useEffect(() => {
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

  // iOS Safari instructions
  if (platform === 'ios') {
    const isInSafari = browser === 'safari';

    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 rounded-2xl overflow-hidden mb-4 shadow-lg">
            <img 
              src="/icons/icon-192.png" 
              alt="Lojafy" 
              className="w-full h-full object-cover"
            />
          </div>
          <CardTitle className="text-2xl">Instale a Lojafy</CardTitle>
          <CardDescription>
            {isInSafari 
              ? 'Adicione o app na sua tela inicial para acesso rápido'
              : 'Abra no Safari para instalar o aplicativo'
            }
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {!isInSafari ? (
            <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
              <p className="text-sm text-amber-700 dark:text-amber-300 text-center">
                Para instalar, copie o link e abra no <strong>Safari</strong>
              </p>
            </div>
          ) : (
            <>
              {/* Explicação sobre limitação do iOS */}
              <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300 text-center">
                  No iPhone, a instalação é feita manualmente seguindo os passos abaixo
                </p>
              </div>

              {/* Instruções visuais */}
              <div className="bg-muted p-4 rounded-lg space-y-4">
                <div className="flex items-center gap-3 p-3 bg-background rounded-md">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-primary">
                    1
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <p className="text-sm">
                      Toque no botão
                    </p>
                    <div className="w-6 h-6 bg-primary/10 rounded flex items-center justify-center">
                      <Share className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-sm">Compartilhar</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-background rounded-md">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-primary">
                    2
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <p className="text-sm">Toque em</p>
                    <div className="w-6 h-6 bg-primary/10 rounded flex items-center justify-center">
                      <Plus className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-sm">"Tela de Início"</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-background rounded-md">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-primary">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      Toque em <strong>"Adicionar"</strong> para confirmar
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Botão de confirmação (só aparece no Safari) */}
          {isInSafari && (
            <Button onClick={onComplete} className="w-full" variant="default" size="lg">
              <CheckCircle className="h-4 w-4 mr-2" />
              Já instalei o app
            </Button>
          )}

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
        <div className="mx-auto w-20 h-20 rounded-2xl overflow-hidden mb-4 shadow-lg">
          <img 
            src="/icons/icon-192.png" 
            alt="Lojafy" 
            className="w-full h-full object-cover"
          />
        </div>
        <CardTitle className="text-2xl">Instale a Lojafy</CardTitle>
        <CardDescription>
          Adicione o app na sua tela inicial para acesso rápido e uma experiência ainda melhor
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="bg-muted/50 p-4 rounded-lg text-center">
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
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <p className="text-sm font-medium text-center">
                Para instalar manualmente:
              </p>
              
              {platform === 'android' && (browser === 'chrome' || browser === 'samsung' || browser === 'edge') && (
                <div className="flex items-center gap-3 p-3 bg-background rounded-md">
                  <div className="w-6 h-6 bg-primary/10 rounded flex items-center justify-center">
                    <MoreVertical className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-sm flex-1">
                    Toque no menu <strong>(⋮)</strong> e selecione <strong>"Instalar app"</strong>
                  </p>
                </div>
              )}
              
              {platform === 'desktop' && (
                <p className="text-sm text-center text-muted-foreground">
                  Clique no ícone de instalação na barra de endereço do navegador
                </p>
              )}
            </div>
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
