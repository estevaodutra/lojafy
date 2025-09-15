import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Copy, Trash2, Eye, Search, Filter, ExternalLink, Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface ProductTableProps {
  products: any[];
  loading: boolean;
  onEdit: (product: any) => void;
  onDuplicate: (product: any) => void;
  onRefresh: () => void;
  emptyMessage?: string;
}

const ProductTable: React.FC<ProductTableProps> = ({
  products,
  loading,
  onEdit,
  onDuplicate,
  onRefresh,
  emptyMessage = "Nenhum produto encontrado."
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [isSelectAllChecked, setIsSelectAllChecked] = useState(false);
  const itemsPerPage = 10;
  const { toast } = useToast();

  // Filter products based on search and filters
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase()) ||
                         (product.sku && product.sku.toLowerCase().includes(search.toLowerCase())) ||
                         (product.description && product.description.toLowerCase().includes(search.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'all' || 
                           (product.categories && product.categories.name === categoryFilter);
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && product.active) ||
                         (statusFilter === 'inactive' && !product.active);
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  // Mass selection functions
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(currentProducts.map(p => p.id));
      setIsSelectAllChecked(true);
    } else {
      setSelectedProducts([]);
      setIsSelectAllChecked(false);
    }
  };

  const handleSelectProduct = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts(prev => [...prev, productId]);
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId));
      setIsSelectAllChecked(false);
    }
  };

  const handleBulkDelete = async () => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .in('id', selectedProducts);

      if (error) throw error;

      toast({
        title: "Produtos excluídos",
        description: `${selectedProducts.length} produto(s) removido(s) com sucesso.`,
      });

      setSelectedProducts([]);
      setIsSelectAllChecked(false);
      onRefresh();
    } catch (error) {
      console.error('Error bulk deleting products:', error);
      toast({
        title: "Erro ao excluir produtos",
        description: "Ocorreu um erro ao tentar excluir os produtos selecionados.",
        variant: "destructive",
      });
    }
  };

  const handleBulkToggleStatus = async (newStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ 
          active: newStatus,
          updated_at: new Date().toISOString()
        })
        .in('id', selectedProducts);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: `${selectedProducts.length} produto(s) ${newStatus ? 'ativado(s)' : 'desativado(s)'} com sucesso.`,
      });

      setSelectedProducts([]);
      setIsSelectAllChecked(false);
      onRefresh();
    } catch (error) {
      console.error('Error bulk updating products:', error);
      toast({
        title: "Erro ao atualizar status",
        description: "Ocorreu um erro ao tentar atualizar o status dos produtos.",
        variant: "destructive",
      });
    }
  };

  // Update select all checkbox state when products change
  useEffect(() => {
    if (selectedProducts.length === 0) {
      setIsSelectAllChecked(false);
    } else if (selectedProducts.length === currentProducts.length && currentProducts.length > 0) {
      setIsSelectAllChecked(true);
    }
  }, [selectedProducts, currentProducts]);

  // Get unique categories for filter
  const categories = [...new Set(products.map(p => p.categories?.name).filter(Boolean))];

  const handleDeleteProduct = async (productId: string, productName: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: "Produto excluído",
        description: `${productName} foi removido com sucesso.`,
      });

      onRefresh();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Erro ao excluir produto",
        description: "Ocorreu um erro ao tentar excluir o produto.",
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async (product: any) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ 
          active: !product.active,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: `Produto ${product.active ? 'desativado' : 'ativado'} com sucesso.`,
      });

      onRefresh();
    } catch (error) {
      console.error('Error updating product status:', error);
      toast({
        title: "Erro ao atualizar status",
        description: "Ocorreu um erro ao tentar atualizar o status do produto.",
        variant: "destructive",
      });
    }
  };

  const getStockIndicator = (product: any) => {
    if (product.stock_quantity === 0) {
      return (
        <div 
          className="w-3 h-3 rounded-full bg-red-500" 
          title="Sem estoque"
        />
      );
    } else if (product.stock_quantity <= (product.min_stock_level || 5)) {
      return (
        <div 
          className="w-3 h-3 rounded-full bg-yellow-500" 
          title={`Estoque baixo (${product.stock_quantity} unidades)`}
        />
      );
    }
    return (
      <div 
        className="w-3 h-3 rounded-full bg-green-500" 
        title={`Estoque adequado (${product.stock_quantity} unidades)`}
      />
    );
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carregando produtos...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, SKU ou descrição..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Bar */}
      {selectedProducts.length > 0 && (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium">
                  {selectedProducts.length} produto(s) selecionado(s)
                </span>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkToggleStatus(true)}
                    className="h-8"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Ativar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkToggleStatus(false)}
                    className="h-8"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Desativar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão em massa</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir {selectedProducts.length} produto(s) selecionado(s)? 
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleBulkDelete}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir Todos
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedProducts([]);
                  setIsSelectAllChecked(false);
                }}
                className="h-8"
              >
                Cancelar Seleção
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Produtos ({filteredProducts.length})</CardTitle>
          <CardDescription>
            {currentPage} de {totalPages} páginas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentProducts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{emptyMessage}</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={isSelectAllChecked}
                          onCheckedChange={handleSelectAll}
                          aria-label="Selecionar todos"
                        />
                      </TableHead>
                      <TableHead className="w-[100px]">Imagem</TableHead>
                      <TableHead className="w-[200px]">Produto</TableHead>
                      <TableHead className="w-[100px]">SKU</TableHead>
                      <TableHead className="w-[120px]">Categoria</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Estoque</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedProducts.includes(product.id)}
                            onCheckedChange={(checked) => handleSelectProduct(product.id, !!checked)}
                            aria-label={`Selecionar ${product.name}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                            {product.main_image_url || product.image_url ? (
                              <img 
                                src={product.main_image_url || product.image_url} 
                                alt={product.name}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <span className="text-muted-foreground text-xs">Sem imagem</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium truncate max-w-[200px]" title={product.name}>
                              {product.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {product.brand || 'Marca não informada'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded whitespace-nowrap">
                            {product.sku || 'N/A'}
                          </code>
                        </TableCell>
                        <TableCell>
                          <span className="truncate max-w-[120px] block" title={product.categories?.name || 'Sem categoria'}>
                            {product.categories?.name || 'Sem categoria'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{formatPrice(product.price)}</p>
                            {product.original_price && product.original_price > product.price && (
                              <p className="text-xs text-muted-foreground line-through">
                                {formatPrice(product.original_price)}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium">{product.stock_quantity}</p>
                            {getStockIndicator(product)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.active ? "default" : "secondary"}>
                            {product.active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              <DropdownMenuItem asChild>
                                <Link to={`/produto/${product.id}`} className="flex items-center">
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  Visualizar Produto
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => onEdit(product)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onDuplicate(product)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleToggleStatus(product)}>
                                <Eye className="mr-2 h-4 w-4" />
                                {product.active ? 'Desativar' : 'Ativar'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem 
                                    className="text-destructive focus:text-destructive"
                                    onSelect={(e) => e.preventDefault()}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Excluir
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir o produto "{product.name}"? 
                                      Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteProduct(product.id, product.name)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {startIndex + 1} a {Math.min(endIndex, filteredProducts.length)} de {filteredProducts.length} produtos
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {currentPage} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      Próximo
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductTable;