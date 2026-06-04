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
        await fetch("https://n8n-n8n.nuwfic.easypanel.host/webhook/label_update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            order_id: orderId,
            order_number: order.order_number,
            status: "pago",
            tracking_code: trackingCode,
            tracking_number: trackingCode,
            total_amount: order.total_amount,
            reseller_id: order.reseller_id,
            user_id: order.user_id,
            shipping_file: {
              file_name: shippingFile.file.name,
              file_path: filePath,
              file_size: shippingFile.file.size
            },
            updated_at: new Date().toISOString()
          })
        });
        console.log("Webhook enviado com sucesso!");
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
