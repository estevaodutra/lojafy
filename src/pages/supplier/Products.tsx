import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Plus, Edit, Eye, AlertTriangle } from "lucide-react";

export default function SupplierProducts() {
  const products = [
    {
      id: 1,
      name: "Smartphone XYZ Pro",
      sku: "SM-XYZ-001",
      stock: 45,
      price: "R$ 1.299,00",
      status: "Ativo",
      lowStock: false
    },
    {
      id: 2,
      name: "Notebook ABC Gaming",
      sku: "NB-ABC-002", 
      stock: 3,
      price: "R$ 2.899,00",
      status: "Ativo",
      lowStock: true
    },
    {
      id: 3,
      name: "Headphones DEF Wireless",
      sku: "HP-DEF-003",
      stock: 28,
      price: "R$ 399,00",
      status: "Ativo",
      lowStock: false
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Meus Produtos</h1>
          <p className="text-muted-foreground">Gerencie seus produtos e estoque</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
            <Package className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">127</div>
            <p className="text-xs text-muted-foreground">+3 novos este mês</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos Ativos</CardTitle>
            <Package className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">118</div>
            <p className="text-xs text-muted-foreground">9 inativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
            <AlertTriangle className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">8</div>
            <p className="text-xs text-muted-foreground">Produtos precisam reposição</p>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Produtos</CardTitle>
          <CardDescription>
            Visualize e gerencie todos os seus produtos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {products.map((product) => (
              <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="font-medium">{product.price}</p>
                    <p className="text-sm text-muted-foreground">Estoque: {product.stock}</p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {product.lowStock && (
                      <Badge variant="destructive">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Baixo
                      </Badge>
                    )}
                    <Badge variant={product.status === 'Ativo' ? 'default' : 'secondary'}>
                      {product.status}
                    </Badge>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}