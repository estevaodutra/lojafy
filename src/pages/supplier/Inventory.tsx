import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";

export default function SupplierInventory() {
  const inventoryItems: any[] = [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'low':
        return <Badge variant="destructive">Estoque Baixo</Badge>;
      case 'ok':
        return <Badge variant="default">Normal</Badge>;
      case 'high':
        return <Badge variant="secondary">Alto</Badge>;
      default:
        return <Badge variant="secondary">Normal</Badge>;
    }
  };

  const getStockPercentage = (current: number, min: number, max: number) => {
    if (max === min) return 0;
    return ((current - min) / (max - min)) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Controle de Estoque</h1>
        <p className="text-muted-foreground">Monitore seus níveis de inventário</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
            <Package className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Em todos os produtos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Produtos críticos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entradas Hoje</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Unidades recebidas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saídas Hoje</CardTitle>
            <TrendingDown className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Unidades vendidas</p>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Movimentação de Estoque</CardTitle>
          <CardDescription>
            Visualize o status atual do seu inventário
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {inventoryItems.length > 0 ? (
              inventoryItems.map((item) => (
                <div key={item.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-medium">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                    </div>
                    {getStatusBadge(item.status)}
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Estoque Atual</p>
                      <p className="font-medium">{item.currentStock} unidades</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Mínimo/Máximo</p>
                      <p className="font-medium">{item.minStock} / {item.maxStock}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Última Movimentação</p>
                      <p className="font-medium">{item.lastMovement}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Data</p>
                      <p className="font-medium">{item.date}</p>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Nível do Estoque</span>
                      <span>{Math.round(getStockPercentage(item.currentStock, item.minStock, item.maxStock))}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          item.status === 'low' 
                            ? 'bg-destructive' 
                            : 'bg-primary'
                        }`}
                        style={{
                          width: `${Math.max(10, getStockPercentage(item.currentStock, item.minStock, item.maxStock))}%`
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2 mt-3">
                    <Button variant="outline" size="sm">
                      Ajustar Estoque
                    </Button>
                    <Button variant="outline" size="sm">
                      Histórico
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhum item em estoque no momento.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}