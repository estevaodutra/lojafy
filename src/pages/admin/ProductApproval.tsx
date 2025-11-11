import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminPendingProducts, useAdminApprovalStats } from "@/hooks/useAdminPendingProducts";
import { Clock, CheckCircle, XCircle, Package, Search, X, Users, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SuperAdminProductApprovalCard } from "@/components/admin/SuperAdminProductApprovalCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const ProductApproval = () => {
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");
  
  const { data: products = [], isLoading, refetch } = useAdminPendingProducts();
  const { data: stats } = useAdminApprovalStats();
  
  const approvedProducts = products.filter(p => p.approval_status === 'approved');
  const rejectedProducts = products.filter(p => p.approval_status === 'rejected');
  const waitingProducts = products.filter(p => p.approval_status === 'pending_approval');
  
  const suppliers = Array.from(
    new Set(
      products
        .filter(p => p.supplier_id)
        .map(p => p.supplier_id)
    )
  ).map(id => ({ id, label: `Fornecedor ${id.substring(0, 8)}...` }));
  
  const filterProducts = (productList: any[]) => {
    let filtered = productList;
    
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(product => 
        product.name?.toLowerCase().includes(search) ||
        product.sku?.toLowerCase().includes(search)
      );
    }
    
    if (selectedSupplier !== 'all') {
      filtered = filtered.filter(p => p.supplier_id === selectedSupplier);
    }
    
    return filtered;
  };

  const filteredApprovedProducts = filterProducts(approvedProducts);
  const filteredRejectedProducts = filterProducts(rejectedProducts);
  const filteredWaitingProducts = filterProducts(waitingProducts);
  
  const handleViewProduct = (product: any) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Aprovação de Produtos</h2>
        <p className="text-muted-foreground mt-1">
          Revise e aprove produtos de todos os fornecedores
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Em processo de aprovação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aguardando</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.pending || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Pendentes de aprovação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.approved || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Produtos publicados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejeitados</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.rejected || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Produtos recusados</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por nome do produto ou SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-input rounded-md text-sm bg-background"
              >
                <option value="all">Todos os fornecedores ({suppliers.length})</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.label}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            <Clock className="w-4 h-4 mr-2" />
            Pendentes ({filteredWaitingProducts.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            <CheckCircle className="w-4 h-4 mr-2" />
            Aprovados ({filteredApprovedProducts.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            <XCircle className="w-4 h-4 mr-2" />
            Rejeitados ({filteredRejectedProducts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {filteredWaitingProducts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                {searchTerm || selectedSupplier !== 'all' ? (
                  <>
                    <Search className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Nenhum produto encontrado com os filtros aplicados
                    </p>
                    <Button 
                      variant="link" 
                      onClick={() => {
                        setSearchTerm("");
                        setSelectedSupplier("all");
                      }}
                      className="mt-2"
                    >
                      Limpar filtros
                    </Button>
                  </>
                ) : (
                  <>
                    <Package className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhum produto aguardando aprovação</p>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredWaitingProducts.map(product => (
                <SuperAdminProductApprovalCard
                  key={product.id}
                  product={product}
                  onView={() => handleViewProduct(product)}
                  onRefresh={refetch}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved">
          {filteredApprovedProducts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum produto aprovado encontrado</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredApprovedProducts.map(product => (
                <SuperAdminProductApprovalCard
                  key={product.id}
                  product={product}
                  onView={() => handleViewProduct(product)}
                  onRefresh={refetch}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rejected">
          {filteredRejectedProducts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <XCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum produto rejeitado encontrado</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRejectedProducts.map(product => (
                <SuperAdminProductApprovalCard
                  key={product.id}
                  product={product}
                  onView={() => handleViewProduct(product)}
                  onRefresh={refetch}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Detalhes do Produto
              {selectedProduct && (
                <>
                  {selectedProduct.approval_status === 'pending_approval' ? (
                    <Badge variant="outline" className="bg-yellow-50"><Clock className="w-3 h-3 mr-1" />Aguardando</Badge>
                  ) : selectedProduct.approval_status === 'approved' ? (
                    <Badge variant="outline" className="bg-green-50"><CheckCircle className="w-3 h-3 mr-1" />Aprovado</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-50"><XCircle className="w-3 h-3 mr-1" />Rejeitado</Badge>
                  )}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedProduct && (
            <ScrollArea className="max-h-[calc(90vh-120px)]">
              <div className="space-y-4">
                {selectedProduct.supplier_id && (
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
                    <Avatar>
                      <AvatarFallback>
                        F
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">Fornecedor</p>
                      <p className="text-xs text-muted-foreground">
                        ID: {selectedProduct.supplier_id.substring(0, 8)}...
                      </p>
                    </div>
                  </div>
                )}

                <div className="aspect-video relative overflow-hidden rounded-md bg-muted">
                  <img
                    src={selectedProduct.main_image_url || selectedProduct.images?.[0] || '/placeholder.svg'}
                    alt={selectedProduct.name}
                    className="object-contain w-full h-full"
                  />
                </div>

                <div>
                  <h3 className="text-2xl font-bold">{selectedProduct.name}</h3>
                  <p className="text-3xl font-bold text-primary mt-2">
                    R$ {selectedProduct.price?.toFixed(2)}
                  </p>
                  {selectedProduct.cost_price && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Custo: R$ {selectedProduct.cost_price?.toFixed(2)} • 
                      Margem: {((selectedProduct.price - selectedProduct.cost_price) / selectedProduct.price * 100).toFixed(1)}%
                    </p>
                  )}
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">SKU</p>
                    <p className="font-medium">{selectedProduct.sku || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Estoque</p>
                    <p className="font-medium">{selectedProduct.stock_quantity || 0} unidades</p>
                  </div>
                  {selectedProduct.brand && (
                    <div>
                      <p className="text-sm text-muted-foreground">Marca</p>
                      <p className="font-medium">{selectedProduct.brand}</p>
                    </div>
                  )}
                  {selectedProduct.categories && (
                    <div>
                      <p className="text-sm text-muted-foreground">Categoria</p>
                      <p className="font-medium">{selectedProduct.categories.name}</p>
                    </div>
                  )}
                </div>

                {selectedProduct.description && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold mb-2">Descrição</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedProduct.description}
                      </p>
                    </div>
                  </>
                )}

                {selectedProduct.reference_url && (
                  <>
                    <Separator />
                    <div className="bg-red-50 p-4 rounded-md">
                      <h4 className="font-semibold mb-2 text-red-900">Informações de Rejeição</h4>
                      <a
                        href={selectedProduct.reference_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        Ver URL de referência <ExternalLink className="w-3 h-3" />
                      </a>
                      {selectedProduct.suggested_price && (
                        <p className="text-sm text-red-800 mt-2">
                          Preço sugerido: R$ {selectedProduct.suggested_price.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductApproval;
