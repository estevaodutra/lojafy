import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, Store, Package, Link2, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { BetaWarningDialog } from '@/components/integrations/BetaWarningDialog';
import { useMarketplaceCredentials } from '@/hooks/useMarketplaceCredentials';
import { useToast } from '@/hooks/use-toast';
import MlAnuncios from './MlAnuncios';
import MlMensagens from './MlMensagens';
import MlReplicar from './MlReplicar';
import MlMetricas from './MlMetricas';
import MlPromocoes from './MlPromocoes';
import MlPublicidade from './MlPublicidade';
import MlFaturamento from './MlFaturamento';

const comingSoonMarketplaces = [
  {
    name: 'Shopee',
    icon: ShoppingBag,
    description: 'Sincronize produtos, gerencie pedidos e estoque automaticamente',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    progress: 65,
  },
  {
    name: 'Amazon',
    icon: Package,
    description: 'Alcance milhões de clientes na Amazon',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    progress: 52,
  },
];

const benefits = [
  { icon: '🔄', title: 'Sincronização automática', description: 'Produtos atualizados em tempo real' },
  { icon: '📦', title: 'Gestão de pedidos', description: 'Receba pedidos de todos os canais em um só lugar' },
  { icon: '📊', title: 'Estoque unificado', description: 'Controle de estoque centralizado' },
  { icon: '💰', title: 'Precificação inteligente', description: 'Margens ajustadas por marketplace' },
];

const ML_TABS = [
  { value: 'anuncios', label: 'Anúncios' },
  { value: 'mensagens', label: 'Mensagens' },
  { value: 'replicar', label: 'Replicar' },
  { value: 'metricas', label: 'Métricas' },
  { value: 'promocoes', label: 'Promoções' },
  { value: 'publicidade', label: 'Publicidade' },
  { value: 'faturamento', label: 'Faturamento' },
];

const NotConnected = () => (
  <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
    <div className="p-4 rounded-full bg-yellow-100">
      <Store className="h-10 w-10 text-yellow-600" />
    </div>
    <h3 className="text-lg font-semibold">Conta Mercado Livre não conectada</h3>
    <p className="text-sm text-muted-foreground max-w-sm">
      Conecte sua conta ML na aba <strong>Integrações</strong> para acessar esta funcionalidade.
    </p>
  </div>
);

const LojafyIntegra = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { credentials } = useMarketplaceCredentials('mercadolivre');
  const [showBetaWarning, setShowBetaWarning] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'integracoes';

  const { data: mlIntegration } = useQuery({
    queryKey: ['ml-integration-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('mercadolivre_integrations')
        .select('ml_user_id, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const isConnected = !!mlIntegration;

  // Exibir toast descritivo de erro caso redirecionado com ml_error
  useEffect(() => {
    const mlError = searchParams.get('ml_error');
    if (mlError) {
      toast({
        title: 'Falha na Integração Mercado Livre',
        description: `Não foi possível integrar a conta: ${decodeURIComponent(mlError)}`,
        variant: 'destructive',
      });
      // Limpar parâmetro para não redisparar
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete('ml_error');
        return next;
      });
    }
  }, [searchParams, toast, setSearchParams]);

  // Auto-redirect para integracoes se não conectado e tenta acessar aba ML
  useEffect(() => {
    if (!isConnected && activeTab !== 'integracoes') {
      setSearchParams({});
    }
  }, [isConnected, activeTab]);

  const getMercadoLivreAuthUrl = () => {
    const userId = user?.id || '';
    const clientId = credentials?.client_id || import.meta.env.VITE_ML_CLIENT_ID || '2003351424267574';
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const cleanSupabaseUrl = supabaseUrl.replace(/\/$/, '');
    const redirectUri = `${cleanSupabaseUrl}/functions/v1/ml-oauth-callback`;
    return `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${userId}`;
  };

  const handleConfirmBeta = () => {
    window.open(getMercadoLivreAuthUrl(), '_blank');
  };

  const handleTabChange = (value: string) => {
    setSearchParams(value === 'integracoes' ? {} : { tab: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">Lojafy Integra</h1>
          {isConnected && (
            <Badge className="bg-green-500 hover:bg-green-600 gap-1">
              <CheckCircle2 className="h-3 w-3" /> ML Conectado
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground">
          Conecte sua loja aos maiores marketplaces do Brasil
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="integracoes">Integrações</TabsTrigger>
          {ML_TABS.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} disabled={!isConnected}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Aba Integrações ─────────────────────────────── */}
        <TabsContent value="integracoes" className="space-y-6 mt-6">
          {!isConnected && (
            <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-900 dark:text-yellow-100 font-semibold">
                ⚡ Conecte sua conta Mercado Livre
              </AlertTitle>
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                Conecte sua conta ML para desbloquear <strong>Anúncios, Mensagens, Métricas, Promoções</strong> e muito mais.
                Clique em <strong>"Integrar"</strong> no card abaixo para começar.
              </AlertDescription>
            </Alert>
          )}

          {isConnected && (
            <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-900 dark:text-amber-100">Novidades chegando!</AlertTitle>
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                Estamos trabalhando para trazer as melhores integrações com marketplaces para sua loja.
                Em breve você poderá gerenciar tudo em um só lugar.
              </AlertDescription>
            </Alert>
          )}

          <div>
            <h2 className="text-xl font-semibold mb-4">Benefícios das Integrações</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {benefits.map((benefit) => (
                <Card key={benefit.title}>
                  <CardContent className="pt-6">
                    <div className="text-3xl mb-2">{benefit.icon}</div>
                    <h3 className="font-semibold mb-1">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Marketplaces Disponíveis</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className={isConnected ? 'border-green-500/50' : 'border-green-500/50'}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-lg bg-yellow-100">
                      <Store className="h-8 w-8 text-yellow-600" />
                    </div>
                    {isConnected ? (
                      <Badge className="bg-green-500 hover:bg-green-600 gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Conectado
                      </Badge>
                    ) : (
                      <Badge className="bg-green-500 hover:bg-green-600">Disponível</Badge>
                    )}
                  </div>
                  <CardTitle className="mt-4">Mercado Livre</CardTitle>
                  <CardDescription>
                    {isConnected
                      ? `Conta #${mlIntegration?.ml_user_id} conectada`
                      : 'Integre com o maior marketplace da América Latina'}
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={isConnected ? 'outline' : 'default'}
                    onClick={() => setShowBetaWarning(true)}
                  >
                    <Link2 className="mr-2 h-4 w-4" />
                    {isConnected ? 'Reconectar' : 'Integrar'}
                  </Button>
                </CardFooter>
              </Card>

              {comingSoonMarketplaces.map((marketplace) => (
                <Card key={marketplace.name} className="opacity-75 hover:opacity-90 transition-opacity">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-lg ${marketplace.bgColor}`}>
                        <marketplace.icon className={`h-8 w-8 ${marketplace.color}`} />
                      </div>
                      <Badge variant="outline" className="text-amber-600 border-amber-600">Em breve</Badge>
                    </div>
                    <CardTitle className="mt-4">{marketplace.name}</CardTitle>
                    <CardDescription>{marketplace.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="font-medium">{marketplace.progress}%</span>
                      </div>
                      <Progress value={marketplace.progress} className="h-2" />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button disabled className="w-full">
                      <Link2 className="mr-2 h-4 w-4" />Conectar
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── Abas ML ─────────────────────────────────────── */}
        <TabsContent value="anuncios" className="mt-6">
          {isConnected ? <MlAnuncios /> : <NotConnected />}
        </TabsContent>
        <TabsContent value="mensagens" className="mt-6">
          {isConnected ? <MlMensagens /> : <NotConnected />}
        </TabsContent>
        <TabsContent value="replicar" className="mt-6">
          {isConnected ? <MlReplicar /> : <NotConnected />}
        </TabsContent>
        <TabsContent value="metricas" className="mt-6">
          {isConnected ? <MlMetricas /> : <NotConnected />}
        </TabsContent>
        <TabsContent value="promocoes" className="mt-6">
          {isConnected ? <MlPromocoes /> : <NotConnected />}
        </TabsContent>
        <TabsContent value="publicidade" className="mt-6">
          {isConnected ? <MlPublicidade /> : <NotConnected />}
        </TabsContent>
        <TabsContent value="faturamento" className="mt-6">
          {isConnected ? <MlFaturamento /> : <NotConnected />}
        </TabsContent>
      </Tabs>

      <BetaWarningDialog
        open={showBetaWarning}
        onOpenChange={setShowBetaWarning}
        onConfirm={handleConfirmBeta}
        marketplaceName="Mercado Livre"
      />
    </div>
  );
};

export default LojafyIntegra;
