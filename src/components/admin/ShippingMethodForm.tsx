import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Package, Upload } from "lucide-react";

interface ShippingMethodFormData {
  name: string;
  description: string;
  estimated_days: number;
  base_price: number;
  is_free_above_amount?: number;
  is_label_method: boolean;
  requires_upload: boolean;
  max_file_size_mb: number;
  transporter: string;
  priority: number;
  active: boolean;
}

interface ShippingMethodFormProps {
  method?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ShippingMethodForm({ method, onSuccess, onCancel }: ShippingMethodFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!method;

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ShippingMethodFormData>({
    defaultValues: method ? {
      name: method.name,
      description: method.description || "",
      estimated_days: method.estimated_days,
      base_price: Number(method.base_price),
      is_free_above_amount: method.is_free_above_amount ? Number(method.is_free_above_amount) : undefined,
      is_label_method: method.is_label_method,
      requires_upload: method.requires_upload,
      max_file_size_mb: method.max_file_size_mb || 5,
      transporter: method.transporter || "",
      priority: method.priority,
      active: method.active
    } : {
      name: "",
      description: "",
      estimated_days: 7,
      base_price: 0,
      is_label_method: false,
      requires_upload: false,
      max_file_size_mb: 5,
      transporter: "",
      priority: 1,
      active: true
    }
  });

  const isLabelMethod = watch("is_label_method");
  const requiresUpload = watch("requires_upload");

  useEffect(() => {
    if (isLabelMethod && !requiresUpload) {
      setValue("requires_upload", true);
    }
  }, [isLabelMethod, requiresUpload, setValue]);

  const onSubmit = async (data: ShippingMethodFormData) => {
    setIsLoading(true);
    try {
      const payload = {
        ...data,
        is_free_above_amount: data.is_free_above_amount || null,
        transporter: data.transporter || null
      };

      if (isEditing) {
        const { error } = await supabase
          .from("shipping_methods")
          .update(payload)
          .eq("id", method.id);
        
        if (error) throw error;
        toast.success("Método de frete atualizado com sucesso");
      } else {
        const { error } = await supabase
          .from("shipping_methods")
          .insert(payload);
        
        if (error) throw error;
        toast.success("Método de frete criado com sucesso");
      }

      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar método de frete");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <DialogHeader>
        <DialogTitle>
          {isEditing ? "Editar Método de Frete" : "Novo Método de Frete"}
        </DialogTitle>
      </DialogHeader>

      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Método *</Label>
            <Input
              id="name"
              {...register("name", { required: "Nome é obrigatório" })}
              placeholder="Ex: Frete Expresso"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Prioridade</Label>
            <Input
              id="priority"
              type="number"
              min="1"
              {...register("priority", { valueAsNumber: true })}
              placeholder="1"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            {...register("description")}
            placeholder="Ex: Entrega expressa em até 3 dias úteis"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="estimated_days">Prazo Estimado (dias)</Label>
            <Input
              id="estimated_days"
              type="number"
              min="0"
              {...register("estimated_days", { valueAsNumber: true, required: "Prazo é obrigatório" })}
              placeholder="7"
            />
            {errors.estimated_days && (
              <p className="text-sm text-destructive">{errors.estimated_days.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="base_price">Preço Base (R$)</Label>
            <Input
              id="base_price"
              type="number"
              step="0.01"
              min="0"
              {...register("base_price", { valueAsNumber: true, required: "Preço é obrigatório" })}
              placeholder="25.00"
            />
            {errors.base_price && (
              <p className="text-sm text-destructive">{errors.base_price.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="is_free_above_amount">Frete Grátis Acima de (R$)</Label>
          <Input
            id="is_free_above_amount"
            type="number"
            step="0.01"
            min="0"
            {...register("is_free_above_amount", { valueAsNumber: true })}
            placeholder="199.00"
          />
          <p className="text-xs text-muted-foreground">
            Deixe vazio se não oferece frete grátis
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="transporter">Transportadora</Label>
          <Input
            id="transporter"
            {...register("transporter")}
            placeholder="Ex: Correios, Jadlog, Transportadora X"
          />
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4" />
              Configurações Especiais
            </CardTitle>
            <CardDescription>
              Configure opções especiais para este método de frete
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="is_label_method">Método com Etiqueta</Label>
                <p className="text-sm text-muted-foreground">
                  Cliente pode anexar etiqueta personalizada
                </p>
              </div>
              <Switch
                id="is_label_method"
                {...register("is_label_method")}
                checked={isLabelMethod}
                onCheckedChange={(checked) => setValue("is_label_method", checked)}
              />
            </div>

            {isLabelMethod && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="requires_upload">Upload Obrigatório</Label>
                    <p className="text-sm text-muted-foreground">
                      Tornar o upload do arquivo obrigatório
                    </p>
                  </div>
                  <Switch
                    id="requires_upload"
                    {...register("requires_upload")}
                    checked={requiresUpload}
                    onCheckedChange={(checked) => setValue("requires_upload", checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_file_size_mb">Tamanho Máximo do Arquivo (MB)</Label>
                  <Input
                    id="max_file_size_mb"
                    type="number"
                    min="1"
                    max="20"
                    {...register("max_file_size_mb", { valueAsNumber: true })}
                    placeholder="5"
                  />
                </div>
              </>
            )}

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="active">Método Ativo</Label>
                <p className="text-sm text-muted-foreground">
                  Disponível para seleção no checkout
                </p>
              </div>
              <Switch
                id="active"
                {...register("active")}
                onCheckedChange={(checked) => setValue("active", checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Salvando..." : isEditing ? "Atualizar" : "Criar"}
        </Button>
      </div>
    </form>
  );
}