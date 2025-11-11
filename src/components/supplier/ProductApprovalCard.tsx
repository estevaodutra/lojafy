import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Check, X, Clock, CheckCircle, XCircle, ExternalLink, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface ProductApprovalCardProps {
  product: any;
  onView: () => void;
  onRefresh: () => void;
}

const ProductApprovalCard = ({ product, onView, onRefresh }: ProductApprovalCardProps) => {
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [referenceUrl, setReferenceUrl] = useState("");
  const [suggestedPrice, setSuggestedPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [approveAsInactive, setApproveAsInactive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isValidUrl = (url: string): boolean => {
    if (!url.trim()) return false;
    
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const isValidPrice = (price: string): boolean => {
    if (!price.trim()) return false;
    const numericPrice = parseFloat(price.replace(',', '.'));
    return !isNaN(numericPrice) && numericPrice > 0;
  };

  const handleApprove = async () => {
    if (!isValidPrice(costPrice)) {
      toast.error('Por favor, informe um preço de custo válido');
      return;
    }

    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const costPriceValue = parseFloat(costPrice.replace(',', '.'));
      
      if (costPriceValue >= product.price) {
        toast.error('O preço de custo não pode ser maior ou igual ao preço de venda');
        setIsLoading(false);
        return;
      }
      
      const { error } = await supabase
        .from('products')
        .update({
          approval_status: 'approved',
          approved_by: userData.user?.id,
          approved_at: new Date().toISOString(),
          cost_price: costPriceValue,
          active: !approveAsInactive
        })
        .eq('id', product.id);

      if (error) throw error;

      await supabase.from('product_approval_history').insert({
        product_id: product.id,
        action: 'approved',
        performed_by: userData.user?.id,
        previous_status: 'pending_approval',
        new_status: 'approved',
        notes: `Aprovado com preço de custo: R$ ${costPriceValue.toFixed(2)}${approveAsInactive ? ' (aprovado como inativo)' : ''}`
      });

      if (product.created_by) {
        const marginPercent = ((product.price - costPriceValue) / product.price * 100).toFixed(1);
        
        await supabase.from('notifications').insert({
          user_id: product.created_by,
          title: '✅ Produto Aprovado',
          message: `O produto "${product.name}" foi aprovado com preço de custo R$ ${costPriceValue.toFixed(2)} (margem de ${marginPercent}%)${approveAsInactive ? '. O produto foi aprovado mas permanece inativo no catálogo.' : '.'}`,
          type: 'product_approved',
          action_url: '/super-admin/catalogo',
          metadata: {
            product_id: product.id,
            supplier_id: product.supplier_id,
            cost_price: costPriceValue,
            margin_percent: parseFloat(marginPercent),
            approved_as_inactive: approveAsInactive
          }
        });
      }

      toast.success('Produto aprovado com preço de custo registrado!');
      setIsApproveDialogOpen(false);
      setCostPrice("");
      setApproveAsInactive(false);
      onRefresh();
    } catch (error) {
      console.error('Error approving product:', error);
      toast.error('Erro ao aprovar produto');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!isValidUrl(referenceUrl)) {
      toast.error('Por favor, informe um link válido');
      return;
    }

    if (!isValidPrice(suggestedPrice)) {
      toast.error('Por favor, informe um preço válido');
      return;
    }

    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const priceValue = parseFloat(suggestedPrice.replace(',', '.'));
      
      const { error } = await supabase
        .from('products')
        .update({
          approval_status: 'rejected',
          rejection_reason: `Link de referência: ${referenceUrl} | Preço sugerido: R$ ${priceValue.toFixed(2)}`,
          rejected_at: new Date().toISOString(),
          active: false
        })
        .eq('id', product.id);

      if (error) throw error;

      await supabase.from('product_approval_history').insert({
        product_id: product.id,
        action: 'rejected',
        performed_by: userData.user?.id,
        previous_status: 'pending_approval',
        new_status: 'rejected',
        notes: `Link de referência: ${referenceUrl} | Preço sugerido: R$ ${priceValue.toFixed(2)}`
      });

      if (product.created_by) {
        await supabase.from('notifications').insert({
          user_id: product.created_by,
          title: '🔄 Produto Rejeitado - Referência e Preço Sugeridos',
          message: `O produto "${product.name}" foi rejeitado. O fornecedor sugeriu um produto similar por R$ ${priceValue.toFixed(2)}.`,
          type: 'product_rejected',
          action_url: '/super-admin/catalogo',
          metadata: {
            product_id: product.id,
            supplier_id: product.supplier_id,
            reference_url: referenceUrl,
            suggested_price: priceValue
          }
        });
      }

      toast.success('Produto rejeitado, referência e preço enviados ao administrador');
      setIsRejectDialogOpen(false);
      setReferenceUrl("");
      setSuggestedPrice("");
      onRefresh();
    } catch (error) {
      console.error('Error rejecting product:', error);
      toast.error('Erro ao rejeitar produto');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      await supabase.from('product_approval_history').insert({
        product_id: product.id,
        action: 'deleted',
        performed_by: userData.user?.id,
        previous_status: product.approval_status,
        new_status: 'deleted',
        notes: `Produto excluído pelo fornecedor`
      });

      if (product.created_by) {
        await supabase.from('notifications').insert({
          user_id: product.created_by,
          title: '🗑️ Produto Excluído pelo Fornecedor',
          message: `O produto "${product.name}" foi excluído pelo fornecedor e removido da lista de aprovação.`,
          type: 'product_deleted',
          action_url: '/super-admin/catalogo',
          metadata: {
            product_id: product.id,
            supplier_id: product.supplier_id,
            deleted_by: userData.user?.id
          }
        });
      }

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);

      if (error) throw error;

      toast.success('Produto excluído com sucesso');
      setIsDeleteDialogOpen(false);
      onRefresh();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Erro ao excluir produto');
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
            <>
              <div className="flex gap-2 pt-2 border-t">
                <Button 
                  size="sm" 
                  variant="default" 
                  onClick={() => setIsApproveDialogOpen(true)} 
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
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setIsDeleteDialogOpen(true)} 
                className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                disabled={isLoading}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Excluir Produto
              </Button>
            </>
          )}

          {product.approval_status === 'rejected' && product.rejection_reason && (
            <div className="pt-2 border-t space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Produto de referência sugerido:</p>
              
              {product.rejection_reason.includes('Link de referência:') && (
                <a 
                  href={product.rejection_reason.split('|')[0].replace('Link de referência: ', '').trim()} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  Ver produto de referência
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              
              {product.rejection_reason.includes('Preço sugerido:') && (
                <div className="flex items-center gap-2 bg-green-50 p-2 rounded">
                  <span className="text-xs text-muted-foreground">Preço que a Lojafy pagará:</span>
                  <span className="text-sm font-bold text-green-700">
                    {product.rejection_reason.split('Preço sugerido:')[1]?.trim() || 'N/A'}
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprovar Produto</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o valor que a Lojafy vai pagar por este produto. Este será o preço de custo registrado no sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm font-medium text-blue-900">Produto: {product.name}</p>
              <p className="text-xs text-blue-700 mt-1">Preço de venda: R$ {product.price?.toFixed(2)}</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cost-price">Preço de Custo (que a Lojafy vai pagar) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                <Input
                  id="cost-price"
                  type="text"
                  placeholder="0,00"
                  value={costPrice}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d.,]/g, '');
                    setCostPrice(value);
                  }}
                  className={`pl-10 ${costPrice && !isValidPrice(costPrice) ? 'border-red-500' : ''}`}
                />
              </div>
              {costPrice && !isValidPrice(costPrice) && (
                <p className="text-xs text-red-500">Por favor, insira um preço válido (ex: 99,90)</p>
              )}
              <p className="text-xs text-muted-foreground">
                💡 Este será o valor de custo para cálculo de margem de lucro
              </p>
            </div>
            
            {costPrice && isValidPrice(costPrice) && product.price && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-xs text-green-700">
                  Margem de lucro: {(((product.price - parseFloat(costPrice.replace(',', '.'))) / product.price) * 100).toFixed(1)}%
                </p>
              </div>
            )}
            
            <div className="flex items-start space-x-2 p-3 border rounded-md bg-amber-50 border-amber-200">
              <Checkbox
                id="approve-inactive"
                checked={approveAsInactive}
                onCheckedChange={(checked) => setApproveAsInactive(checked === true)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="approve-inactive"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Aprovar como inativo
                </Label>
                <p className="text-xs text-muted-foreground">
                  O produto será aprovado com o preço de custo, mas ficará inativo e não aparecerá no catálogo até ser ativado pelo administrador.
                </p>
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleApprove} 
              disabled={isLoading || !isValidPrice(costPrice)}
            >
              Confirmar Aprovação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar e Sugerir Alternativa</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o link de um produto similar de qualquer loja online e o preço que a Lojafy vai pagar. Essas informações serão usadas como referência pelo administrador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reference-url">Link do Produto de Referência *</Label>
              <Input
                id="reference-url"
                type="url"
                placeholder="https://www.exemplo.com.br/produto-similar..."
                value={referenceUrl}
                onChange={(e) => setReferenceUrl(e.target.value)}
                className={referenceUrl && !isValidUrl(referenceUrl) ? 'border-red-500' : ''}
              />
              {referenceUrl && !isValidUrl(referenceUrl) && (
                <p className="text-xs text-red-500">Por favor, insira um link válido</p>
              )}
              <p className="text-xs text-muted-foreground">
                💡 Pode ser de qualquer loja online (Amazon, Mercado Livre, etc.)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="suggested-price">Preço que a Lojafy vai pagar *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                <Input
                  id="suggested-price"
                  type="text"
                  placeholder="0,00"
                  value={suggestedPrice}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d.,]/g, '');
                    setSuggestedPrice(value);
                  }}
                  className={`pl-10 ${suggestedPrice && !isValidPrice(suggestedPrice) ? 'border-red-500' : ''}`}
                />
              </div>
              {suggestedPrice && !isValidPrice(suggestedPrice) && (
                <p className="text-xs text-red-500">Por favor, insira um preço válido (ex: 99,90)</p>
              )}
              <p className="text-xs text-muted-foreground">
                💡 Este será o preço de custo que a Lojafy pagará ao fornecedor
              </p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReject} 
              disabled={isLoading || !isValidUrl(referenceUrl) || !isValidPrice(suggestedPrice)}
            >
              Confirmar Rejeição
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Excluir Produto Permanentemente?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O produto será removido permanentemente do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="p-4 bg-red-50 border border-red-200 rounded-md space-y-2">
            <p className="text-sm font-medium text-red-900">Produto: {product.name}</p>
            <p className="text-xs text-red-700">SKU: {product.sku || 'N/A'}</p>
            <p className="text-xs text-red-700">Estoque: {product.stock_quantity || 0} unidades</p>
            
            <div className="mt-3 pt-3 border-t border-red-300">
              <p className="text-xs font-medium text-red-900">⚠️ Atenção:</p>
              <ul className="text-xs text-red-800 mt-1 space-y-1 list-disc list-inside">
                <li>O produto será removido permanentemente</li>
                <li>O administrador será notificado da exclusão</li>
                <li>Esta ação não pode ser desfeita</li>
              </ul>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ProductApprovalCard;
