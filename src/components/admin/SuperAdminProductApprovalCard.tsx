import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Check, X, Clock, CheckCircle, XCircle, ExternalLink, Trash2, User } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface SuperAdminProductApprovalCardProps {
  product: any;
  onView: () => void;
  onRefresh: () => void;
}

export const SuperAdminProductApprovalCard = ({ 
  product, 
  onView, 
  onRefresh 
}: SuperAdminProductApprovalCardProps) => {
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [costPrice, setCostPrice] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [suggestedPrice, setSuggestedPrice] = useState("");
  const [publishAsActive, setPublishAsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const isValidUrl = (url: string) => {
    if (!url.trim()) return true;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const isValidPrice = (price: string) => {
    const num = parseFloat(price);
    return !isNaN(num) && num > 0;
  };

  const handleApprove = async () => {
    if (!isValidPrice(costPrice)) {
      toast.error("Por favor, insira um preço de custo válido");
      return;
    }

    const costPriceValue = parseFloat(costPrice);
    if (costPriceValue >= product.price) {
      toast.error("Preço de custo não pode ser maior ou igual ao preço de venda");
      return;
    }

    setIsLoading(true);

    try {
      const marginPercent = ((product.price - costPriceValue) / product.price * 100).toFixed(1);

      const { error: updateError } = await supabase
        .from('products')
        .update({
          approval_status: 'approved',
          cost_price: costPriceValue,
          active: publishAsActive,
          approved_at: new Date().toISOString(),
          approved_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('id', product.id);

      if (updateError) throw updateError;

      await supabase.from('product_approval_history').insert({
        product_id: product.id,
        action: 'approved',
        performed_by: (await supabase.auth.getUser()).data.user?.id,
        previous_status: product.approval_status,
        new_status: 'approved',
        notes: `Aprovado com preço de custo: R$ ${costPriceValue.toFixed(2)}${!publishAsActive ? ' (aprovado como inativo)' : ''}`,
      });

      if (product.supplier_id) {
        await supabase.from('notifications').insert({
          user_id: product.supplier_id,
          title: "✅ Produto Aprovado pelo Admin",
          message: `O produto "${product.name}" foi aprovado pelo administrador com preço de custo R$ ${costPriceValue.toFixed(2)} (margem de ${marginPercent}%)${!publishAsActive ? '. O produto foi aprovado mas permanece inativo no catálogo.' : '.'}`,
          type: 'product_approved',
          action_url: '/supplier/produtos/aprovacao',
          action_label: 'Ver Produtos',
          metadata: {
            product_id: product.id,
            cost_price: costPriceValue,
            margin_percent: parseFloat(marginPercent),
            published_as_active: publishAsActive,
          },
        });
      }

      toast.success("Produto aprovado com sucesso!");
      setIsApproveOpen(false);
      setCostPrice("");
      setPublishAsActive(true);
      onRefresh();
    } catch (error) {
      console.error('Erro ao aprovar produto:', error);
      toast.error("Erro ao aprovar produto");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!referenceUrl.trim()) {
      toast.error("Por favor, insira uma URL de referência");
      return;
    }

    if (!isValidUrl(referenceUrl)) {
      toast.error("Por favor, insira uma URL válida");
      return;
    }

    if (suggestedPrice && !isValidPrice(suggestedPrice)) {
      toast.error("Por favor, insira um preço sugerido válido");
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase
        .from('products')
        .update({
          approval_status: 'rejected',
          rejected_at: new Date().toISOString(),
          reference_url: referenceUrl,
          suggested_price: suggestedPrice ? parseFloat(suggestedPrice) : null,
        })
        .eq('id', product.id);

      if (updateError) throw updateError;

      const rejectionMessage = `URL de referência: ${referenceUrl}${suggestedPrice ? ` | Preço sugerido: R$ ${parseFloat(suggestedPrice).toFixed(2)}` : ''}`;

      await supabase.from('product_approval_history').insert({
        product_id: product.id,
        action: 'rejected',
        performed_by: (await supabase.auth.getUser()).data.user?.id,
        previous_status: product.approval_status,
        new_status: 'rejected',
        notes: rejectionMessage,
      });

      if (product.supplier_id) {
        await supabase.from('notifications').insert({
          user_id: product.supplier_id,
          title: "❌ Produto Rejeitado pelo Admin",
          message: `O produto "${product.name}" foi rejeitado pelo administrador. Verifique a URL de referência fornecida.`,
          type: 'product_rejected',
          action_url: '/supplier/produtos/aprovacao',
          action_label: 'Ver Detalhes',
          metadata: {
            product_id: product.id,
            reference_url: referenceUrl,
            suggested_price: suggestedPrice ? parseFloat(suggestedPrice) : null,
          },
        });
      }

      toast.success("Produto rejeitado");
      setIsRejectOpen(false);
      setReferenceUrl("");
      setSuggestedPrice("");
      onRefresh();
    } catch (error) {
      console.error('Erro ao rejeitar produto:', error);
      toast.error("Erro ao rejeitar produto");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);

    try {
      await supabase.from('product_approval_history').insert({
        product_id: product.id,
        action: 'deleted',
        performed_by: (await supabase.auth.getUser()).data.user?.id,
        previous_status: product.approval_status,
        new_status: 'deleted',
        notes: 'Produto excluído pelo administrador',
      });

      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);

      if (deleteError) throw deleteError;

      if (product.supplier_id) {
        await supabase.from('notifications').insert({
          user_id: product.supplier_id,
          title: "🗑️ Produto Excluído pelo Admin",
          message: `O produto "${product.name}" foi excluído pelo administrador.`,
          type: 'product_deleted',
          metadata: {
            product_id: product.id,
            product_name: product.name,
          },
        });
      }

      toast.success("Produto excluído com sucesso");
      setIsDeleteOpen(false);
      onRefresh();
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      toast.error("Erro ao excluir produto");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (product.approval_status === 'pending_approval') {
      return (
        <Badge variant="outline" className="bg-yellow-50 shrink-0">
          <Clock className="w-3 h-3 mr-1" />
          Aguardando
        </Badge>
      );
    }
    if (product.approval_status === 'approved') {
      return (
        <Badge variant="outline" className="bg-green-50 shrink-0">
          <CheckCircle className="w-3 h-3 mr-1" />
          Aprovado
        </Badge>
      );
    }
    if (product.approval_status === 'rejected') {
      return (
        <Badge variant="outline" className="bg-red-50 shrink-0">
          <XCircle className="w-3 h-3 mr-1" />
          Rejeitado
        </Badge>
      );
    }
    return null;
  };

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <CardHeader className="space-y-3">
          {product.supplier_id && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="w-3 h-3" />
              <span>ID: {product.supplier_id.substring(0, 8)}...</span>
            </div>
          )}
          
          <div className="aspect-video relative overflow-hidden rounded-md bg-muted">
            <img
              src={product.main_image_url || product.images?.[0] || '/placeholder.svg'}
              alt={product.name}
              className="object-cover w-full h-full"
            />
          </div>
          
          <div className="space-y-1">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base line-clamp-2">{product.name}</CardTitle>
              {getStatusBadge()}
            </div>
            <p className="text-lg font-bold text-primary">
              R$ {product.price?.toFixed(2)}
            </p>
            {product.categories && (
              <p className="text-xs text-muted-foreground">{product.categories.name}</p>
            )}
            <p className="text-xs text-muted-foreground">Estoque: {product.stock_quantity || 0} un.</p>
          </div>
        </CardHeader>

        <CardContent className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={onView}
          >
            <Eye className="w-4 h-4 mr-2" />
            Ver Detalhes
          </Button>

          {product.approval_status === 'pending_approval' && (
            <div className="flex gap-2">
              <Button 
                variant="default" 
                className="flex-1"
                onClick={() => setIsApproveOpen(true)}
              >
                <Check className="w-4 h-4 mr-2" />
                Aprovar
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1"
                onClick={() => setIsRejectOpen(true)}
              >
                <X className="w-4 h-4 mr-2" />
                Rejeitar
              </Button>
            </div>
          )}

          <Button 
            variant="outline" 
            className="w-full text-destructive hover:text-destructive"
            onClick={() => setIsDeleteOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir Produto
          </Button>
        </CardContent>
      </Card>

      {/* Dialog Aprovar */}
      <AlertDialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprovar Produto</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o preço de custo do produto para calcular a margem de lucro.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cost-price">Preço de Custo (obrigatório)</Label>
              <Input
                id="cost-price"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
              />
              {costPrice && isValidPrice(costPrice) && (
                <p className="text-xs text-muted-foreground">
                  Margem: {((product.price - parseFloat(costPrice)) / product.price * 100).toFixed(1)}%
                </p>
              )}
            </div>

            <div className={`p-3 border rounded-md ${publishAsActive ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-center justify-between">
                <div className="space-y-1 flex-1">
                  <Label htmlFor="publish-active" className="text-sm font-medium leading-none cursor-pointer">
                    Publicar produto ativo no catálogo
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {publishAsActive 
                      ? 'O produto será aprovado e publicado imediatamente no catálogo para os clientes.' 
                      : 'O produto será aprovado com preço de custo, mas ficará inativo até ser ativado.'}
                  </p>
                </div>
                <Switch
                  id="publish-active"
                  checked={publishAsActive}
                  onCheckedChange={setPublishAsActive}
                />
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={isLoading}>
              {isLoading ? "Aprovando..." : "Confirmar Aprovação"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Rejeitar */}
      <AlertDialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar Produto</AlertDialogTitle>
            <AlertDialogDescription>
              Forneça uma URL de referência e opcionalmente um preço sugerido.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reference-url">URL de Referência (obrigatório)</Label>
              <Input
                id="reference-url"
                type="url"
                placeholder="https://..."
                value={referenceUrl}
                onChange={(e) => setReferenceUrl(e.target.value)}
              />
              {referenceUrl && !isValidUrl(referenceUrl) && (
                <p className="text-xs text-destructive">URL inválida</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="suggested-price">Preço Sugerido (opcional)</Label>
              <Input
                id="suggested-price"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={suggestedPrice}
                onChange={(e) => setSuggestedPrice(e.target.value)}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReject} 
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? "Rejeitando..." : "Confirmar Rejeição"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Excluir */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Produto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir permanentemente o produto "{product.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? "Excluindo..." : "Excluir Permanentemente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
