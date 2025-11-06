import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Check, X, Clock, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

interface ProductApprovalCardProps {
  product: any;
  onView: () => void;
  onRefresh: () => void;
}

const ProductApprovalCard = ({ product, onView, onRefresh }: ProductApprovalCardProps) => {
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('products')
        .update({
          approval_status: 'approved',
          approved_by: userData.user?.id,
          approved_at: new Date().toISOString(),
          active: true
        })
        .eq('id', product.id);

      if (error) throw error;

      // Registrar no histórico
      await supabase.from('product_approval_history').insert({
        product_id: product.id,
        action: 'approved',
        performed_by: userData.user?.id,
        previous_status: 'pending_approval',
        new_status: 'approved'
      });

      // Notificar super admin
      if (product.created_by) {
        await supabase.from('notifications').insert({
          user_id: product.created_by,
          title: '✅ Produto Aprovado',
          message: `O produto "${product.name}" foi aprovado pelo fornecedor.`,
          type: 'product_approved',
          action_url: '/super-admin/catalogo',
          metadata: {
            product_id: product.id,
            supplier_id: product.supplier_id
          }
        });
      }

      toast.success('Produto aprovado com sucesso!');
      onRefresh();
    } catch (error) {
      console.error('Error approving product:', error);
      toast.error('Erro ao aprovar produto');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Por favor, informe o motivo da rejeição');
      return;
    }

    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('products')
        .update({
          approval_status: 'rejected',
          rejection_reason: rejectionReason,
          rejected_at: new Date().toISOString(),
          active: false
        })
        .eq('id', product.id);

      if (error) throw error;

      // Registrar no histórico
      await supabase.from('product_approval_history').insert({
        product_id: product.id,
        action: 'rejected',
        performed_by: userData.user?.id,
        previous_status: 'pending_approval',
        new_status: 'rejected',
        notes: rejectionReason
      });

      // Notificar super admin
      if (product.created_by) {
        await supabase.from('notifications').insert({
          user_id: product.created_by,
          title: '❌ Produto Rejeitado',
          message: `O produto "${product.name}" foi rejeitado pelo fornecedor.`,
          type: 'product_rejected',
          action_url: '/super-admin/catalogo',
          metadata: {
            product_id: product.id,
            supplier_id: product.supplier_id,
            rejection_reason: rejectionReason
          }
        });
      }

      toast.success('Produto rejeitado');
      setIsRejectDialogOpen(false);
      setRejectionReason("");
      onRefresh();
    } catch (error) {
      console.error('Error rejecting product:', error);
      toast.error('Erro ao rejeitar produto');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (product.approval_status) {
      case 'pending_approval':
        return <Badge variant="outline" className="bg-yellow-50"><Clock className="w-3 h-3 mr-1" />Aguardando</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50"><CheckCircle className="w-3 h-3 mr-1" />Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50"><XCircle className="w-3 h-3 mr-1" />Rejeitado</Badge>;
      default:
        return null;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="aspect-square relative overflow-hidden rounded-md bg-muted">
            <img
              src={product.main_image_url || product.images?.[0] || '/placeholder.svg'}
              alt={product.name}
              className="object-cover w-full h-full"
            />
          </div>
          <div className="flex items-start justify-between mt-4">
            <CardTitle className="text-lg line-clamp-2 flex-1">{product.name}</CardTitle>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Preço:</span>
              <span className="font-bold">R$ {product.price?.toFixed(2)}</span>
            </div>
            {product.categories && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Categoria:</span>
                <span className="text-sm">{product.categories.name}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Estoque:</span>
              <span className="text-sm">{product.stock_quantity || 0} un.</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onView} className="flex-1">
              <Eye className="w-4 h-4 mr-1" />
              Ver Detalhes
            </Button>
          </div>

          {product.approval_status === 'pending_approval' && (
            <div className="flex gap-2 pt-2 border-t">
              <Button 
                size="sm" 
                variant="default" 
                onClick={handleApprove} 
                className="flex-1"
                disabled={isLoading}
              >
                <Check className="w-4 h-4 mr-1" />
                Aprovar
              </Button>
              <Button 
                size="sm" 
                variant="destructive" 
                onClick={() => setIsRejectDialogOpen(true)} 
                className="flex-1"
                disabled={isLoading}
              >
                <X className="w-4 h-4 mr-1" />
                Rejeitar
              </Button>
            </div>
          )}

          {product.approval_status === 'rejected' && product.rejection_reason && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">Motivo da rejeição:</p>
              <p className="text-sm mt-1">{product.rejection_reason}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar Produto</AlertDialogTitle>
            <AlertDialogDescription>
              Por favor, informe o motivo da rejeição deste produto. Esta informação será enviada ao administrador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Ex: Preço muito alto, descrição incompleta, imagens de baixa qualidade..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={4}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} disabled={isLoading || !rejectionReason.trim()}>
              Confirmar Rejeição
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ProductApprovalCard;
