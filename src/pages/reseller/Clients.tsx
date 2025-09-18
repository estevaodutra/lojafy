import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Phone, Mail, MessageCircle, Star } from "lucide-react";

export default function ResellerClients() {
  const clients = [
    {
      id: 1,
      name: "Ana Costa Silva",
      email: "ana.costa@email.com",
      phone: "(11) 99999-1111",
      totalPurchases: "R$ 4.567,00",
      orders: 8,
      lastPurchase: "2024-01-15",
      status: "VIP",
      rating: 5
    },
    {
      id: 2,
      name: "Pedro Alves Santos",
      email: "pedro.alves@email.com", 
      phone: "(11) 99999-2222",
      totalPurchases: "R$ 2.899,00",
      orders: 3,
      lastPurchase: "2024-01-14",
      status: "Regular",
      rating: 4
    },
    {
      id: 3,
      name: "Carla Lima Oliveira",
      email: "carla.lima@email.com",
      phone: "(11) 99999-3333", 
      totalPurchases: "R$ 1.234,00",
      orders: 2,
      lastPurchase: "2024-01-10",
      status: "Novo",
      rating: 5
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VIP':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">VIP</Badge>;
      case 'Regular':
        return <Badge variant="default">Regular</Badge>;
      case 'Novo':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Novo</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-3 h-3 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
        }`}
      />
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Meus Clientes</h1>
        <p className="text-muted-foreground">Gerencie seu relacionamento com os clientes</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">67</div>
            <p className="text-xs text-muted-foreground">+5 novos este mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes VIP</CardTitle>
            <Star className="w-4 h-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Acima de R$ 3.000 em compras</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 543</div>
            <p className="text-xs text-muted-foreground">Por cliente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfação</CardTitle>
            <Star className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.8/5</div>
            <p className="text-xs text-muted-foreground">Avaliação média</p>
          </CardContent>
        </Card>
      </div>

      {/* Clients List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          <CardDescription>
            Seus clientes e histórico de relacionamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {clients.map((client) => (
              <div key={client.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium">{client.name}</h3>
                      <div className="flex items-center space-x-1 mt-1">
                        {renderStars(client.rating)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(client.status)}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                  <div>
                    <p className="text-muted-foreground">Total Compras</p>
                    <p className="font-medium">{client.totalPurchases}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pedidos</p>
                    <p className="font-medium">{client.orders}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Última Compra</p>
                    <p className="font-medium">{client.lastPurchase}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Contato</p>
                    <p className="font-medium text-xs">{client.email}</p>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" size="sm">
                    <Phone className="w-4 h-4 mr-2" />
                    Ligar
                  </Button>
                  <Button variant="outline" size="sm">
                    <Mail className="w-4 h-4 mr-2" />
                    E-mail
                  </Button>
                  <Button variant="outline" size="sm">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Client Insights */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Segmentação de Clientes</CardTitle>
            <CardDescription>Distribuição por categoria</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Clientes VIP</span>
                <span className="text-sm font-medium">18%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '18%' }} />
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Clientes Regulares</span>
                <span className="text-sm font-medium">64%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '64%' }} />
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Clientes Novos</span>
                <span className="text-sm font-medium">18%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '18%' }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Oportunidades</CardTitle>
            <CardDescription>Ações recomendadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-sm">3 clientes sem compras há 30+ dias</h4>
                <p className="text-xs text-muted-foreground">Considere enviar uma oferta especial</p>
              </div>
              
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-sm">5 clientes próximos ao status VIP</h4>
                <p className="text-xs text-muted-foreground">Faltam menos de R$ 500 para upgrade</p>
              </div>
              
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-sm">Aniversariantes do mês</h4>
                <p className="text-xs text-muted-foreground">4 clientes fazem aniversário este mês</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}