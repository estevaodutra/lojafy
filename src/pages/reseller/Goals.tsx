import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, TrendingUp, Award, Calendar, Trophy, Star } from "lucide-react";

export default function ResellerGoals() {
  const monthlyGoals = [
    {
      id: 1,
      title: "Meta de Vendas",
      target: "R$ 25.000",
      current: "R$ 18.450",
      progress: 74,
      type: "sales",
      reward: "Bônus de R$ 500",
      deadline: "31/01/2024"
    },
    {
      id: 2,
      title: "Novos Clientes",
      target: "10 clientes",
      current: "7 clientes",
      progress: 70,
      type: "clients",
      reward: "Comissão extra 2%",
      deadline: "31/01/2024"
    },
    {
      id: 3,
      title: "Taxa de Conversão",
      target: "5%",
      current: "3.2%",
      progress: 64,
      type: "conversion",
      reward: "Certificado de Performance",
      deadline: "31/01/2024"
    }
  ];

  const achievements = [
    {
      id: 1,
      title: "Vendedor do Mês",
      description: "Maior volume de vendas em Dezembro",
      date: "Dezembro 2023",
      badge: "gold"
    },
    {
      id: 2,
      title: "Meta Batida",
      description: "Atingiu 150% da meta em Novembro",
      date: "Novembro 2023", 
      badge: "silver"
    },
    {
      id: 3,
      title: "Cliente Fiel",
      description: "10+ clientes recorrentes conquistados",
      date: "Outubro 2023",
      badge: "bronze"
    }
  ];

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return "bg-green-500";
    if (progress >= 70) return "bg-blue-500";
    if (progress >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getBadgeIcon = (badge: string) => {
    switch (badge) {
      case 'gold':
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 'silver':
        return <Award className="w-5 h-5 text-gray-400" />;
      case 'bronze':
        return <Star className="w-5 h-5 text-amber-600" />;
      default:
        return <Target className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sales':
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'clients':
        return <Target className="w-5 h-5 text-blue-600" />;
      case 'conversion':
        return <Award className="w-5 h-5 text-purple-600" />;
      default:
        return <Target className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Metas e Conquistas</h1>
        <p className="text-muted-foreground">Acompanhe seu progresso e objetivos</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Metas Ativas</CardTitle>
            <Target className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Para este mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progresso Médio</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">69%</div>
            <p className="text-xs text-muted-foreground">Das metas atuais</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conquistas</CardTitle>
            <Award className="w-4 h-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-xs text-muted-foreground">Nos últimos 6 meses</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Goals */}
      <Card>
        <CardHeader>
          <CardTitle>Metas do Mês</CardTitle>
          <CardDescription>
            Suas metas para Janeiro 2024 e progresso atual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {monthlyGoals.map((goal) => (
              <div key={goal.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {getTypeIcon(goal.type)}
                    <div>
                      <h3 className="font-medium">{goal.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Prazo: {goal.deadline}
                      </p>
                    </div>
                  </div>
                  <Badge variant={goal.progress >= 70 ? "default" : "secondary"}>
                    {goal.progress}%
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progresso: {goal.current} / {goal.target}</span>
                    <span className="font-medium">{goal.progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getProgressColor(goal.progress)}`}
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                </div>
                
                <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm">
                    <strong>Recompensa:</strong> {goal.reward}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle>Conquistas Recentes</CardTitle>
          <CardDescription>
            Suas últimas conquistas e reconhecimentos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {achievements.map((achievement) => (
              <div key={achievement.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                    {getBadgeIcon(achievement.badge)}
                  </div>
                  <div>
                    <h3 className="font-medium">{achievement.title}</h3>
                    <p className="text-sm text-muted-foreground">{achievement.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{achievement.date}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Goals Planning */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Próximas Metas</CardTitle>
            <CardDescription>Planejamento para Fevereiro 2024</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 border rounded-lg">
                <h4 className="font-medium text-sm">Vendas: R$ 30.000</h4>
                <p className="text-xs text-muted-foreground">Aumento de 20% vs mês anterior</p>
              </div>
              
              <div className="p-3 border rounded-lg">
                <h4 className="font-medium text-sm">15 Novos Clientes</h4>
                <p className="text-xs text-muted-foreground">Expansão da base de clientes</p>
              </div>
              
              <div className="p-3 border rounded-lg">
                <h4 className="font-medium text-sm">Taxa Conversão: 6%</h4>
                <p className="text-xs text-muted-foreground">Melhoria na eficiência</p>
              </div>
              
              <Button className="w-full mt-4" variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                Definir Novas Metas
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dicas para Atingir Metas</CardTitle>
            <CardDescription>Estratégias para melhorar performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-sm">📞 Follow-up com clientes</h4>
                <p className="text-xs text-muted-foreground">Entre em contato com clientes inativos</p>
              </div>
              
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-sm">🎯 Foque em produtos premium</h4>
                <p className="text-xs text-muted-foreground">Aumente seu ticket médio</p>
              </div>
              
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <h4 className="font-medium text-sm">📱 Use redes sociais</h4>
                <p className="text-xs text-muted-foreground">Divulgue produtos nas suas redes</p>
              </div>
              
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-sm">🤝 Indicações</h4>
                <p className="text-xs text-muted-foreground">Peça indicações aos clientes satisfeitos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}