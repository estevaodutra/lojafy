import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSupplierPendingProducts, useSupplierApprovalStats } from "@/hooks/useSupplierPendingProducts";
import { Clock, CheckCircle, XCircle, Package } from "lucide-react";
import ProductApprovalCard from "@/components/supplier/ProductApprovalCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

const ProductApproval = () => {
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { data: products = [], isLoading, refetch } = useSupplierPendingProducts();
  const { data: stats } = useSupplierApprovalStats();
  
  const approvedProducts = products.filter(p => p.approval_status === 'approved');
  const rejectedProducts = products.filter(p => p.approval_status === 'rejected');
  const waitingProducts = products.filter(p => p.approval_status === 'pending_approval');
  
  const handleViewProduct = (product: any) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Aprovação de Produtos</h1>
        <p className="text-muted-foreground mt-2">
          Revise e aprove produtos atribuídos à sua conta
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aguardando Aprovação</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.pending || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Produtos pendentes</p>
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

      {/* Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            <Clock className="w-4 h-4 mr-2" />
            Pendentes ({waitingProducts.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            <CheckCircle className="w-4 h-4 mr-2" />
            Aprovados ({approvedProducts.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            <XCircle className="w-4 h-4 mr-2" />
            Rejeitados ({rejectedProducts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {waitingProducts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum produto aguardando aprovação</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {waitingProducts.map(product => (
                <ProductApprovalCard
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
          {approvedProducts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum produto aprovado ainda</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {approvedProducts.map(product => (
                <ProductApprovalCard
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
          {rejectedProducts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <XCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum produto rejeitado</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rejectedProducts.map(product => (
                <ProductApprovalCard
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

      {/* Modal de Detalhes */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Detalhes do Produto
              {selectedProduct && (
                selectedProduct.approval_status === 'pending_approval' ? (
                  <Badge variant="outline" className="bg-yellow-50"><Clock className="w-3 h-3 mr-1" />Aguardando</Badge>
                ) : selectedProduct.approval_status === 'approved' ? (
                  <Badge variant="outline" className="bg-green-50"><CheckCircle className="w-3 h-3 mr-1" />Aprovado</Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-50"><XCircle className="w-3 h-3 mr-1" />Rejeitado</Badge>
                )
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedProduct && (
            <ScrollArea className="max-h-[calc(90vh-120px)]">
              <div className="space-y-4">
                {/* Imagem Principal */}
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

                {selectedProduct.specifications && Object.keys(selectedProduct.specifications).length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold mb-2">Especificações</h4>
                      <dl className="grid grid-cols-2 gap-2">
                        {Object.entries(selectedProduct.specifications).map(([key, value]) => (
                          <div key={key} className="flex flex-col">
                            <dt className="text-xs text-muted-foreground">{key}</dt>
                            <dd className="text-sm font-medium">{String(value)}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </>
                )}

                {selectedProduct.rejection_reason && (
                  <>
                    <Separator />
                    <div className="bg-red-50 p-4 rounded-md">
                      <h4 className="font-semibold mb-2 text-red-900">Motivo da Rejeição</h4>
                      <p className="text-sm text-red-800">{selectedProduct.rejection_reason}</p>
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
