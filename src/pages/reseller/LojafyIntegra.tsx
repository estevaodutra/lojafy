import { ShoppingBag, Store, Package, Link2, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

const marketplaces = [
  {
    name: 'Shopee',
    icon: ShoppingBag,
    description: 'Sincronize produtos, gerencie pedidos e estoque automaticamente',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    progress: 65,
  },
  {
    name: 'Mercado Livre',
    icon: Store,
    description: 'Integre com o maior marketplace da América Latina',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    progress: 58,
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
  {
    icon: '🔄',
    title: 'Sincronização automática',
    description: 'Produtos atualizados em tempo real',
  },
  {
    icon: '📦',
    title: 'Gestão de pedidos',
    description: 'Receba pedidos de todos os canais em um só lugar',
  },
  {
    icon: '📊',
    title: 'Estoque unificado',
    description: 'Controle de estoque centralizado',
  },
  {
    icon: '💰',
    title: 'Precificação inteligente',
    description: 'Margens ajustadas por marketplace',
  },
];

const LojafyIntegra = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">Lojafy Integra</h1>
          <Badge className="bg-amber-500 hover:bg-amber-600">Em breve</Badge>
        </div>
        <p className="text-muted-foreground">
          Conecte sua loja aos maiores marketplaces do Brasil
        </p>
      </div>

      {/* Alert informativo */}
      <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
        <Sparkles className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-900 dark:text-amber-100">Novidades chegando!</AlertTitle>
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          Estamos trabalhando para trazer as melhores integrações com marketplaces para sua loja.
          Em breve você poderá gerenciar tudo em um só lugar.
        </AlertDescription>
      </Alert>


      {/* Benefícios */}
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

      {/* Grid de marketplaces */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Marketplaces Disponíveis em Breve</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {marketplaces.map((marketplace) => (
            <Card key={marketplace.name} className="opacity-75 hover:opacity-90 transition-opacity">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-lg ${marketplace.bgColor}`}>
                    <marketplace.icon className={`h-8 w-8 ${marketplace.color}`} />
                  </div>
                  <Badge variant="outline" className="text-amber-600 border-amber-600">
                    Em breve
                  </Badge>
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
                  <Link2 className="mr-2 h-4 w-4" />
                  Conectar
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LojafyIntegra;
