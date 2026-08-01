import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { Loader2, Save, Key, Globe, Copy, Check, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const MercadoLivreSettings = () => {
  const { toast } = useToast();
  const { settings, updateSettings, isUpdating, isLoading } = usePlatformSettings();
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [appUrl, setAppUrl] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load values when settings are fetched
  useEffect(() => {
    if (settings) {
      setClientId(settings.ml_client_id || '');
      setClientSecret(settings.ml_client_secret || '');
      setAppUrl(settings.app_url || '');
    }
  }, [settings]);

  // Construct the Redirect URI based on current app configuration / supabaseUrl
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const redirectUri = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/ml-oauth-callback`;

  const handleCopyRedirectUri = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopied(true);
    toast({
      title: "Copiado!",
      description: "Redirect URI copiado para a área de transferência.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings({
        ml_client_id: clientId.trim() || undefined,
        ml_client_secret: clientSecret.trim() || undefined,
        app_url: appUrl.trim() || undefined,
      });
    } catch (error) {
      console.error('Error saving ML integration settings:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Carregando configurações...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Formulário de Configuração */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-muted">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl font-bold">
                <Key className="h-5 w-5 text-yellow-500" />
                Credenciais da Aplicação Mercado Livre
              </CardTitle>
              <CardDescription>
                Insira as credenciais geradas na sua conta de desenvolvedor do Mercado Livre para conectar seus revendedores.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="ml_client_id" className="font-semibold text-sm">Client ID (App ID)</Label>
                  <Input
                    id="ml_client_id"
                    placeholder="Ex: 2003351424267574"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="h-10"
                  />
                  <p className="text-xs text-muted-foreground">
                    O ID numérico que identifica exclusivamente a sua aplicação no Mercado Livre.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ml_client_secret" className="font-semibold text-sm">Client Secret (Secret Key)</Label>
                  <div className="relative">
                    <Input
                      id="ml_client_secret"
                      type={showSecret ? "text" : "password"}
                      placeholder="Ex: xxhhZC2YUeAi2GWMM222aPstgCfu0GTL"
                      value={clientSecret}
                      onChange={(e) => setClientSecret(e.target.value)}
                      className="pr-10 h-10 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A chave secreta usada para autenticar de forma segura os pedidos de autorização.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="app_url" className="font-semibold text-sm">URL do Aplicativo (App URL)</Label>
                  <div className="relative">
                    <Input
                      id="app_url"
                      type="url"
                      placeholder="Ex: https://lojafy.app"
                      value={appUrl}
                      onChange={(e) => setAppUrl(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    URL base da sua plataforma (utilizada para redirecionamentos e retornos da autenticação).
                  </p>
                </div>

                <div className="pt-2">
                  <Button type="submit" disabled={isUpdating} className="w-full sm:w-auto px-6 h-10 gap-2">
                    {isUpdating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Salvar Credenciais
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Guia de Configuração e Instruções */}
        <div className="space-y-6">
          <Card className="h-full border-muted bg-slate-50/50 dark:bg-slate-900/10">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <Globe className="h-4 w-4 text-primary" />
                Configurando no Mercado Livre
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-relaxed">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold mt-0.5">1</span>
                  <p>Acesse o painel do <a href="https://developers.mercadolibre.com.br/devcenter" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">ML Developers <ExternalLink className="h-3 w-3" /></a> e crie uma nova aplicação.</p>
                </div>
                
                <div className="flex gap-2">
                  <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold mt-0.5">2</span>
                  <div className="space-y-2 flex-1">
                    <p>Configure a **URL de Retorno (Redirect URI)** obrigatória com o valor abaixo:</p>
                    <div className="flex items-center gap-1.5 p-2 rounded-md bg-white dark:bg-slate-950 border border-muted text-xs font-mono break-all relative group">
                      <span className="flex-1 pr-6">{redirectUri}</span>
                      <button
                        onClick={handleCopyRedirectUri}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                        title="Copiar URL"
                      >
                        {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold mt-0.5">3</span>
                  <p>Adicione escopos de escrita e leitura para itens e vendas na aba de permissões (permissões padrão já bastam para publicação básica).</p>
                </div>

                <div className="flex gap-2">
                  <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold mt-0.5">4</span>
                  <p>Copie o **ID da Aplicação** e o **Client Secret** gerados e salve-os no formulário ao lado.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
};
