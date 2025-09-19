import React, { useState, useEffect } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ProductDeleteDialogProps {
  product: any;
  onDelete: (productId: string, productName: string) => void;
  onDeactivate: (product: any) => void;
}

const ProductDeleteDialog: React.FC<ProductDeleteDialogProps> = ({
  product,
  onDelete,
  onDeactivate
}) => {
  const [hasOrders, setHasOrders] = useState(false);
  const [orderCount, setOrderCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const checkProductOrders = async () => {
    if (!open) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select('id')
        .eq('product_id', product.id);

      if (error) throw error;
      
      const count = data?.length || 0;
      setHasOrders(count > 0);
      setOrderCount(count);
    } catch (error) {
      console.error('Error checking product orders:', error);
      setHasOrders(false);
      setOrderCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkProductOrders();
  }, [open, product.id]);

  const handleDelete = () => {
    onDelete(product.id, product.name);
    setOpen(false);
  };

  const handleDeactivate = () => {
    onDeactivate(product);
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
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
          <AlertDialogTitle className="flex items-center gap-2">
            {hasOrders && <AlertTriangle className="h-5 w-5 text-amber-500" />}
            {hasOrders ? 'Produto possui pedidos associados' : 'Confirmar exclusão'}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            {loading ? (
              <p>Verificando dependências do produto...</p>
            ) : hasOrders ? (
              <>
                <p>
                  O produto "<strong>{product.name}</strong>" possui <strong>{orderCount}</strong> pedido(s) associado(s) 
                  e não pode ser excluído permanentemente.
                </p>
                <p>
                  <strong>Recomendação:</strong> Desative o produto para preservar o histórico de pedidos 
                  e evitar que ele apareça na loja.
                </p>
              </>
            ) : (
              <p>
                Tem certeza que deseja excluir o produto "<strong>{product.name}</strong>"? 
                Esta ação não pode ser desfeita.
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          {loading ? null : hasOrders ? (
            <AlertDialogAction
              onClick={handleDeactivate}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              Desativar Produto
            </AlertDialogAction>
          ) : (
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Produto
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ProductDeleteDialog;