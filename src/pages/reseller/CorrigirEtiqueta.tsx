import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ShippingFileUpload } from "@/components/ShippingFileUpload";
import { AlertCircle, ArrowLeft, CheckCircle, FileText, Loader2, ShieldAlert } from "lucide-react";

export default function CorrigirEtiqueta() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [trackingCode, setTrackingCode] = useState("");
  const [confirmTrackingCode, setConfirmTrackingCode] = useState("");
  const [shippingFile, setShippingFile] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: order, isLoading, error } = useQuery({
    queryKey: ["reseller-order-correct-label", orderId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, status, total_amount, created_at, reseller_id, user_id")
        .eq("id", orderId)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        throw new Error(`Pedido não encontrado. Certifique-se de que você está logado na conta de revendedor correta que possui este pedido. (Logado como: ${user.email})`);
      }
      
      // Validação de segurança: o usuário logado deve ser o revendedor ou o comprador (customer) do pedido
      const isResellerOwner = data.reseller_id === user.id;
      const isCustomerOwner = data.user_id === user.id;
      
      if (!isResellerOwner && !isCustomerOwner) {
        throw new Error(`Acesso não autorizado a este pedido. Este pedido pertence ao revendedor (ID: ${data.reseller_id || "NULO"}) e ao cliente (ID: ${data.user_id || "NULO"}). Você está logado como: ${user.email} (Seu ID: ${user.id})`);
      }

      return data;
    },
    enabled: !!orderId,
  });

  const handleFileUpload = (fileData: any) => {
    setShippingFile(fileData);
  };

  const isFormValid = () => {
    const isFileUploaded = !!shippingFile;
    const isTrackingFilled = trackingCode.trim() !== "";
    const isTrackingMatching = trackingCode === confirmTrackingCode;
    return isFileUploaded && isTrackingFilled && isTrackingMatching;
  };

  const handleSubmit = async () => {
    if (!isFormValid() || !orderId) return;
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // 1. Upload do arquivo para o bucket shipping-files
      const fileExt = shippingFile.file.name.split('.').pop();
      const fileName = `order_${orderId}_corrected_${Date.now()}.${fileExt}`;
      const filePath = `${orderId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('shipping-files')
        .upload(filePath, shippingFile.file);

      if (uploadError) throw uploadError;

      // 2. Registrar o arquivo na tabela order_shipping_files
      const { error: dbError } = await supabase.from('order_shipping_files').insert({
        order_id: orderId,
        file_name: shippingFile.file.name,
        file_path: filePath,
        file_size: shippingFile.file.size
      });

      if (dbError) throw dbError;

      // 3. Atualizar o pedido para o status 'pago' e salvar os novos códigos de rastreio
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'pago',
          tracking_number: trackingCode,
          tracking_code: trackingCode,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (orderError) throw orderError;

      // 4. Inserir no histórico de status do pedido
      await supabase.from('order_status_history').insert({
        order_id: orderId,
        status: 'pago',
        notes: `Etiqueta corrigida pelo revendedor. Status alterado de etiqueta_incorreta para pago. Código de rastreio: ${trackingCode}`
      });

      // 5. Enviar webhook de atualização de etiqueta para o n8n
      try {
        console.log("Enviando webhook de atualização de etiqueta para o n8n...");
        
        // Buscar informações completas do pedido para igualar ao evento "order.paid"
        const { data: fullOrder } = await supabase
          .from('orders')
          .select('id, order_number, total_amount, payment_method, user_id, reseller_id')
          .eq('id', orderId)
          .single();

        if (fullOrder) {
          // Buscar perfil do cliente
          const { data: customerProfile } = await supabase
            .from('profiles')
            .select('first_name, last_name, phone')
            .eq('user_id', fullOrder.user_id)
            .maybeSingle();

          // Determinar e-mail do cliente (usando o do usuário logado se for o comprador)
          const customerEmail = fullOrder.user_id === user.id ? user.email : null;
          const customerName = customerProfile
            ? `${customerProfile.first_name || ''} ${customerProfile.last_name || ''}`.trim() || 'Cliente'
            : 'Cliente';

          // Buscar dados do revendedor/loja
          let resellerData = { user_id: null, store_name: null };
          if (fullOrder.reseller_id) {
            const { data: store } = await supabase
              .from('reseller_stores')
              .select('store_name')
              .eq('user_id', fullOrder.reseller_id)
              .maybeSingle();
            if (store) {
              resellerData = { user_id: fullOrder.reseller_id, store_name: store.store_name };
            }
          }

          // Buscar itens do pedido
          const { data: items } = await supabase
            .from('order_items')
            .select('product_id, quantity, unit_price, product_snapshot')
            .eq('order_id', fullOrder.id);

          const enrichedItems = (items || []).map(item => {
            const snapshot = item.product_snapshot || {};
            return {
              product_id: item.product_id,
              product_url: `https://lojafy.app/produto/${item.product_id}`,
              name: snapshot.name || 'Produto',
              sku: snapshot.sku || null,
              image_url: snapshot.image_url || null,
              cost_price: snapshot.cost_price || null,
              quantity: item.quantity,
              unit_price: item.unit_price,
              variation: snapshot.variation || null
            };
          });

          // Como o bucket 'shipping-files' é privado, precisamos gerar uma URL assinada (válida por 1 ano)
          let fileUrl = "";
          try {
            const { data: signedUrlData, error: signedUrlError } = await supabase.storage
              .from('shipping-files')
              .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 ano
            
            if (!signedUrlError && signedUrlData) {
              fileUrl = signedUrlData.signedUrl;
            } else {
              fileUrl = supabase.storage.from('shipping-files').getPublicUrl(filePath).data.publicUrl;
            }
          } catch (urlErr) {
            fileUrl = supabase.storage.from('shipping-files').getPublicUrl(filePath).data.publicUrl;
          }

          const payload = {
            event: "order.paid",
            timestamp: new Date().toISOString(),
            data: {
              order_id: fullOrder.id,
              order_number: fullOrder.order_number,
              total_amount: Number(fullOrder.total_amount),
              payment_method: fullOrder.payment_method,
              customer: {
                user_id: fullOrder.user_id,
                email: customerEmail,
                name: customerName,
                phone: customerProfile?.phone || null
              },
              reseller: resellerData,
              items: enrichedItems,
              shipping_label: {
                file_name: shippingFile.file.name,
                file_size: shippingFile.file.size,
                uploaded_at: new Date().toISOString(),
                download_url: fileUrl
              }
            }
          };

          await fetch("https://n8n-n8n.nuwfic.easypanel.host/webhook/label_update", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload)
          });
          console.log("Webhook enviado com sucesso!");
        }
      } catch (webhookErr) {
        console.error("Erro ao enviar webhook para o n8n:", webhookErr);
      }

      toast({
        title: "Sucesso!",
        description: "Etiqueta e código de rastreio corrigidos com sucesso. O pedido foi devolvido para a expedição.",
      });

      navigate("/reseller/pedidos");
    } catch (err: any) {
      console.error("Erro ao enviar correção da etiqueta:", err);
      toast({
        title: "Erro ao atualizar etiqueta",
        description: err.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground mt-2 text-sm">Carregando dados do pedido...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Erro ao carregar</AlertTitle>
          <AlertDescription>
            {error?.message || "Não foi possível carregar as informações do pedido. Verifique se você tem permissão."}
          </AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/reseller/pedidos")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para Pedidos
        </Button>
      </div>
    );
  }

  // Se o status não for etiqueta_incorreta, bloquear interface de correção
  if (order.status !== "etiqueta_incorreta") {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-amber-800 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Correção não necessária
            </CardTitle>
            <CardDescription>
              Este pedido não está marcado com etiqueta incorreta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              O status atual do pedido #{order.order_number} é: <strong>{order.status}</strong>. 
              Apenas pedidos com o status <strong>Erro | Etiqueta Incorreta</strong> podem ser corrigidos nesta página.
            </p>
            <Button className="w-full" onClick={() => navigate("/reseller/pedidos")}>
              Voltar para a Lista de Pedidos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto p-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/reseller/pedidos")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold">Corrigir Etiqueta do Pedido</h1>
        <p className="text-muted-foreground mt-2">
          Pedido #{order.order_number} • Envie a etiqueta correta para prosseguir com a entrega.
        </p>
      </div>

      <Alert className="border-rose-300 bg-rose-50 text-rose-900">
        <AlertCircle className="h-4 w-4 text-rose-700" />
        <AlertTitle className="font-semibold text-rose-800">Etiqueta Incorreta</AlertTitle>
        <AlertDescription className="text-rose-700 text-sm mt-1">
          O fornecedor informou que a etiqueta enviada anteriormente é inválida ou possui dados incorretos. 
          Por favor, gere uma nova etiqueta de frete, anexe o PDF e confirme o novo código de rastreamento abaixo.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Nova Documentação de Envio
          </CardTitle>
          <CardDescription>
            Faça o upload do novo PDF da etiqueta e atualize o código de rastreio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          <ShippingFileUpload
            onFileUploaded={handleFileUpload}
            maxSizeMB={10}
            required={true}
          />

          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="trackingCode" className="font-semibold text-sm">
                Novo Código de Rastreio da Etiqueta *
              </Label>
              <Input
                id="trackingCode"
                value={trackingCode}
                onChange={e => setTrackingCode(e.target.value.toUpperCase())}
                placeholder="Informe o novo código de rastreio"
              />
              <p className="text-xs text-muted-foreground">
                Informe o código de rastreio exato que consta na nova etiqueta.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmTrackingCode" className="font-semibold text-sm">
                Confirmar Novo Código de Rastreio *
              </Label>
              <Input
                id="confirmTrackingCode"
                value={confirmTrackingCode}
                onChange={e => setConfirmTrackingCode(e.target.value.toUpperCase())}
                placeholder="Confirme o novo código de rastreio"
              />
            </div>

            {trackingCode && confirmTrackingCode && trackingCode !== confirmTrackingCode && (
              <p className="text-sm font-medium text-destructive">
                ⚠️ Os códigos de rastreio informados não são idênticos.
              </p>
            )}
            
            {trackingCode && confirmTrackingCode && trackingCode === confirmTrackingCode && (
              <p className="text-sm font-medium text-green-600 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" /> Códigos de rastreio confirmados e idênticos.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => navigate("/reseller/pedidos")} disabled={submitting}>
              Cancelar
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white" 
              onClick={handleSubmit} 
              disabled={!isFormValid() || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Atualizando...
                </>
              ) : (
                "Confirmar Atualização"
              )}
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
