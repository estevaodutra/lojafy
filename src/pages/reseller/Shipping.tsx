import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useResellerShipping } from "@/hooks/useResellerShipping";
import { Truck, Package, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const REGIONS = {
  norte: "Norte",
  nordeste: "Nordeste",
  centroOeste: "Centro-Oeste",
  sudeste: "Sudeste",
  sul: "Sul",
};

export default function ResellerShipping() {
  const { shippingRules, isLoading, saveShippingRules } = useResellerShipping();

  const [formData, setFormData] = useState({
    free_shipping_enabled: false,
    free_shipping_min_value: 0,
    additional_days: 0,
    regional_rates: {} as Record<string, number>,
    enabled_shipping_methods: [] as string[],
  });

  useEffect(() => {
    if (shippingRules) {
      setFormData({
        free_shipping_enabled: shippingRules.free_shipping_enabled,
        free_shipping_min_value: shippingRules.free_shipping_min_value,
        additional_days: shippingRules.additional_days,
        regional_rates: shippingRules.regional_rates as Record<string, number>,
        enabled_shipping_methods: shippingRules.enabled_shipping_methods,
      });
    }
  }, [shippingRules]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveShippingRules.mutateAsync(formData);
  };

  const handleRegionalRateChange = (region: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFormData({
      ...formData,
      regional_rates: {
        ...formData.regional_rates,
        [region]: numValue,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Card>
          <CardContent className="p-12">
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações de Frete</h1>
        <p className="text-muted-foreground mt-2">
          Configure as regras de frete da sua loja
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Frete Grátis */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <CardTitle>Frete Grátis</CardTitle>
            </div>
            <CardDescription>
              Ofereça frete grátis para pedidos acima de um valor mínimo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="free_shipping"
                checked={formData.free_shipping_enabled}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, free_shipping_enabled: checked })
                }
              />
              <Label htmlFor="free_shipping">Ativar frete grátis</Label>
            </div>

            {formData.free_shipping_enabled && (
              <div className="space-y-2">
                <Label htmlFor="min_value">Valor mínimo do pedido (R$)</Label>
                <Input
                  id="min_value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.free_shipping_min_value}
                  onChange={(e) =>
                    setFormData({ ...formData, free_shipping_min_value: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="Ex: 150.00"
                />
                <p className="text-sm text-muted-foreground">
                  Pedidos acima deste valor terão frete grátis
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prazo Adicional */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              <CardTitle>Prazo de Entrega</CardTitle>
            </div>
            <CardDescription>
              Adicione dias ao prazo base de entrega
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="additional_days">Dias adicionais</Label>
              <Input
                id="additional_days"
                type="number"
                min="0"
                max="30"
                value={formData.additional_days}
                onChange={(e) =>
                  setFormData({ ...formData, additional_days: parseInt(e.target.value) || 0 })
                }
                placeholder="0"
              />
              <p className="text-sm text-muted-foreground">
                Esses dias serão somados ao prazo base calculado pelos Correios
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Taxas Regionais */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <CardTitle>Taxas Regionais</CardTitle>
            </div>
            <CardDescription>
              Configure valores adicionais de frete por região do Brasil
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(REGIONS).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`region_${key}`}>{label}</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">R$</span>
                    <Input
                      id={`region_${key}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.regional_rates[key] || 0}
                      onChange={(e) => handleRegionalRateChange(key, e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Valores adicionais que serão somados ao frete base para cada região
            </p>
          </CardContent>
        </Card>

        {/* Botão Salvar */}
        <div className="flex justify-end gap-2">
          <Button type="submit" size="lg" disabled={saveShippingRules.isPending}>
            {saveShippingRules.isPending ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>
      </form>
    </div>
  );
}