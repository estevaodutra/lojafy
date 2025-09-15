import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calculator, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCep, validateCep, fetchAddressByCep } from "@/lib/cep";
import { toast } from "sonner";

interface ShippingOption {
  id: string;
  name: string;
  description: string;
  price: number;
  estimated_days: number;
  is_label_method: boolean;
}

export function ShippingCalculator() {
  const [cep, setCep] = useState("");
  const [orderValue, setOrderValue] = useState("");
  const [weight, setWeight] = useState("");
  const [address, setAddress] = useState<any>(null);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  const { data: shippingMethods } = useQuery({
    queryKey: ["active-shipping-methods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipping_methods")
        .select("*")
        .eq("active", true)
        .order("priority");
      
      if (error) throw error;
      return data;
    },
  });

  const handleCepChange = (value: string) => {
    const formatted = formatCep(value);
    setCep(formatted);
  };

  const calculateShipping = async () => {
    if (!validateCep(cep)) {
      toast.error("CEP inválido");
      return;
    }

    if (!orderValue) {
      toast.error("Valor do pedido é obrigatório");
      return;
    }

    setIsCalculating(true);

    try {
      // Fetch address info
      const addressData = await fetchAddressByCep(cep);
      setAddress(addressData);

      // Calculate shipping for each method
      const orderValueNum = Number(orderValue);
      const weightNum = Number(weight) || 1;

      const calculatedOptions: ShippingOption[] = shippingMethods?.map(method => {
        let finalPrice = Number(method.base_price);

        // Check if free shipping applies
        if (method.is_free_above_amount && orderValueNum >= Number(method.is_free_above_amount)) {
          finalPrice = 0;
        }

        // Basic weight calculation (could be enhanced with zones/rules)
        if (weightNum > 1 && !method.is_label_method) {
          finalPrice += (weightNum - 1) * 2; // R$2 per kg above 1kg
        }

        return {
          id: method.id,
          name: method.name,
          description: method.description || "",
          price: finalPrice,
          estimated_days: method.estimated_days,
          is_label_method: method.is_label_method
        };
      }) || [];

      setShippingOptions(calculatedOptions);
      toast.success("Frete calculado com sucesso");
    } catch (error: any) {
      toast.error(error.message || "Erro ao calcular frete");
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Simulador de Frete
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cep">CEP de Entrega</Label>
              <Input
                id="cep"
                value={cep}
                onChange={(e) => handleCepChange(e.target.value)}
                placeholder="00000-000"
                maxLength={9}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="orderValue">Valor do Pedido (R$)</Label>
              <Input
                id="orderValue"
                type="number"
                step="0.01"
                min="0"
                value={orderValue}
                onChange={(e) => setOrderValue(e.target.value)}
                placeholder="100.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Peso Total (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                min="0"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="1.0"
              />
            </div>
          </div>

          <Button 
            onClick={calculateShipping} 
            disabled={isCalculating || !cep || !orderValue}
            className="w-full md:w-auto"
          >
            {isCalculating ? "Calculando..." : "Calcular Frete"}
          </Button>
        </CardContent>
      </Card>

      {address && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="w-4 h-4" />
              Endereço de Entrega
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {address.logradouro}, {address.bairro}<br />
              {address.localidade} - {address.uf}<br />
              CEP: {address.cep}
            </p>
          </CardContent>
        </Card>
      )}

      {shippingOptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Opções de Frete Disponíveis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {shippingOptions.map((option) => (
              <div key={option.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{option.name}</span>
                    {option.is_label_method && (
                      <Badge variant="outline" className="text-xs">
                        Com Etiqueta
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {option.estimated_days === 0 
                      ? "Retirada imediata" 
                      : `Entrega em até ${option.estimated_days} dia${option.estimated_days > 1 ? 's' : ''} útil${option.estimated_days > 1 ? 'eis' : ''}`
                    }
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">
                    {option.price === 0 ? "GRÁTIS" : `R$ ${option.price.toFixed(2)}`}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}