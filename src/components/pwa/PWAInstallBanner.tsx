import React, { useState, useEffect } from 'react';
import { Download, X, Share, Plus, MoreVertical, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check standalone mode
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    if (standalone) return;

    // Detect OS
    const ua = navigator.userAgent;
    const iosDevice = /iPad|iPhone|iPod/.test(ua);
    const androidDevice = /Android/.test(ua);
    const isMobile = iosDevice || androidDevice || window.innerWidth < 768;
    setIsIOS(iosDevice);

    if (!isMobile) return;

    // Check dismissal cooldown (3 days)
    const dismissedUntil = localStorage.getItem('lojafy_pwa_dismissed_until');
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) {
      return;
    }

    // Capture install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // On iOS or browsers where prompt event doesn't fire immediately, still suggest after 2s
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    // Suppress for 3 days
    localStorage.setItem(
      'lojafy_pwa_dismissed_until',
      String(Date.now() + 3 * 24 * 60 * 60 * 1000)
    );
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsVisible(false);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error('Error prompting PWA install:', err);
        setShowInstructions(true);
      }
    } else {
      setShowInstructions(true);
    }
  };

  if (isStandalone || !isVisible) {
    return null;
  }

  return (
    <>
      {/* Floating Bottom Banner */}
      <div className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-4 z-[9999] max-w-sm sm:w-96 animate-in slide-in-from-bottom-5 duration-300">
        <div className="bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm flex-shrink-0 bg-white p-0.5 border border-slate-100 dark:border-slate-800">
            <img
              src="/icons/icon-192.png"
              alt="Lojafy"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-foreground truncate">
              Instale o app Lojafy
            </h4>
            <p className="text-xs text-muted-foreground truncate">
              Acesso rápido na sua tela inicial
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button
              size="sm"
              onClick={handleInstallClick}
              className="h-8 px-3 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Instalar
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Manual Instructions Modal (Fallback for iOS or browser restrictions) */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="max-w-sm rounded-2xl p-6">
          <DialogHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl overflow-hidden bg-white p-1 shadow-md border">
              <img
                src="/icons/icon-192.png"
                alt="Lojafy"
                className="w-full h-full object-contain"
              />
            </div>
            <DialogTitle className="text-xl">Como instalar a Lojafy</DialogTitle>
            <DialogDescription className="text-xs">
              Siga os passos abaixo para adicionar o app direto na sua tela inicial
            </DialogDescription>
          </DialogHeader>

          {isIOS ? (
            <div className="space-y-3 py-2 text-sm">
              <div className="flex items-center gap-3 p-3 bg-muted/60 rounded-xl">
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                  1
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <span>Toque em</span>
                  <Share className="w-4 h-4 text-primary" />
                  <span className="font-semibold">Compartilhar</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/60 rounded-xl">
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                  2
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <span>Selecione</span>
                  <Plus className="w-4 h-4 text-primary" />
                  <span className="font-semibold">"Adicionar à Tela de Início"</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 py-2 text-sm">
              <div className="flex items-start gap-3 p-3 bg-muted/60 rounded-xl">
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  1
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">No menu do Google Chrome:</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Toque nos <strong>três pontinhos (⋮)</strong> no canto superior direito.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/60 rounded-xl">
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">Toque em "Instalar aplicativo"</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Se não aparecer direto, toque em <strong>Compartilhar</strong> e depois em <strong>"Adicionar à tela inicial"</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={() => setShowInstructions(false)}
            className="w-full mt-2"
          >
            Entendi
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};
