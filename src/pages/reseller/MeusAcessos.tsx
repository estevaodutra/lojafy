import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, 
  Rocket, 
  Target,
  Clock,
  ChevronRight,
  Star,
  Zap,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const MeusAcessos: React.FC = () => {
  const navigate = useNavigate();

  const accessItems = [
    {
      id: 'top-produtos',
      title: 'Top 10 Produtos Vencedores',
      subtitle: 'Missão 24h - 11 Produtos Ativos',
      description: 'Desafio gamificado para publicar 11 produtos vencedores em marketplaces e começar a vender!',
      icon: Trophy,
      badge: 'Novo',
      badgeColor: 'bg-amber-500',
      gradient: 'from-amber-500 via-orange-500 to-red-500',
      route: '/minha-conta/meus-acessos/top-produtos',
      stats: [
        { label: 'Produtos', value: '11' },
        { label: 'Tempo', value: '24h' },
      ]
    },
    // Future items can be added here
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Rocket className="w-8 h-8 text-primary" />
          Meus Acessos
        </h1>
        <p className="text-muted-foreground mt-2">
          Acesse materiais exclusivos, missões e treinamentos para impulsionar suas vendas.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">1</p>
                <p className="text-xs text-muted-foreground">Missões Ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Trophy className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">11</p>
                <p className="text-xs text-muted-foreground">Produtos p/ Publicar</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">6</p>
                <p className="text-xs text-muted-foreground">Estratégias</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Zap className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">∞</p>
                <p className="text-xs text-muted-foreground">Potencial</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Access Items */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-500" />
          Materiais Disponíveis
        </h2>
        
        {accessItems.map((item) => (
          <Card 
            key={item.id}
            className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group border-2 hover:border-primary/30"
            onClick={() => navigate(item.route)}
          >
            <div className={`h-2 bg-gradient-to-r ${item.gradient}`} />
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${item.gradient} text-white flex-shrink-0`}>
                  <item.icon className="w-8 h-8" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    {item.badge && (
                      <Badge className={`${item.badgeColor} text-white`}>
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm font-medium text-primary mb-2">
                    {item.subtitle}
                  </p>
                  
                  <p className="text-muted-foreground text-sm mb-4">
                    {item.description}
                  </p>
                  
                  <div className="flex items-center gap-4">
                    {item.stats.map((stat, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">
                          <strong>{stat.value}</strong> {stat.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <Button variant="ghost" size="icon" className="group-hover:bg-primary/10">
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Coming Soon */}
      <Card className="border-dashed border-2 bg-muted/30">
        <CardContent className="pt-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Rocket className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Mais materiais em breve!</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Estamos preparando novos conteúdos exclusivos para impulsionar ainda mais suas vendas. 
            Fique de olho!
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MeusAcessos;
