import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Truck, Clock, Gift, MapPin, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ShippingFileUpload } from "@/components/ShippingFileUpload";
import { validateCep } from "@/lib/cep";

interface ShippingMethod {
  id: string;
  name: string;
  description: string;
  estimated_days: number;
  base_price: number;
  is_free_above_amount?: number;
  is_label_method: boolean;
  requires_upload: boolean;
  max_file_size_mb: number;
  priority: number;
}

interface ShippingMethodSelectorProps {
  orderValue: number;
  zipCode: string;
  weight?: number;
  selectedMethodId?: string;
  onMethodChange: (method: ShippingMethod | null, calculatedPrice: number) => void;
  onFileUploaded?: (file: { name: string; path: string; size: number } | null) => void;
}

export function ShippingMethodSelector({ 
  orderValue, 
  zipCode, 
  weight = 1, 
  selectedMethodId,
  onMethodChange,
  onFileUploaded 
}: ShippingMethodSelectorProps) {
  const [selectedMethod, setSelectedMethod] = useState<ShippingMethod | null>(null);
  const [calculatedPrices, setCalculatedPrices] = useState<Record<string, number>>({});
  const [uploadedFile, setUploadedFile] = useState<any>(null);

  const { data: shippingMethods, isLoading } = useQuery({
    queryKey: ["active-shipping-methods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipping_methods")
        .select("*")
        .eq("active", true)
        .order("priority");
      
      if (error) throw error;
      return data as ShippingMethod[];
    },
  });

  // Calculate shipping prices whenever methods, order value or zip changes
  useEffect(() => {
    if (!shippingMethods || !zipCode || !validateCep(zipCode)) return;

    const calculatePrices = () => {
      const prices: Record<string, number> = {};
      
      shippingMethods.forEach(method => {
        let finalPrice = Number(method.base_price);

        // Check if free shipping applies
        if (method.is_free_above_amount && orderValue >= Number(method.is_free_above_amount)) {
          finalPrice = 0;
        } else {
          // Basic weight calculation (could be enhanced with zones/rules)
          if (weight > 1 && !method.is_label_method) {
            finalPrice += (weight - 1) * 2; // R$2 per kg above 1kg
          }
        }

        prices[method.id] = finalPrice;
      });

      setCalculatedPrices(prices);
    };

    calculatePrices();
  }, [shippingMethods, orderValue, zipCode, weight]);

  // Update selected method when external selectedMethodId changes
  useEffect(() => {
    if (selectedMethodId && shippingMethods) {
      const method = shippingMethods.find(m => m.id === selectedMethodId);
      if (method) {
        setSelectedMethod(method);
      }
    }
  }, [selectedMethodId, shippingMethods]);

  const handleMethodSelect = (method: ShippingMethod) => {
    setSelectedMethod(method);
    const calculatedPrice = calculatedPrices[method.id] || method.base_price;
    
    // Reset uploaded file if switching to a non-label method
    if (!method.is_label_method && uploadedFile) {
      setUploadedFile(null);
      onFileUploaded?.(null);
    }
    
    onMethodChange(method, calculatedPrice);
  };

  const handleFileUpload = (file: any) => {
    setUploadedFile(file);
    onFileUploaded?.(file);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2">Carregando métodos de frete...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!zipCode || !validateCep(zipCode)) {
    return (
      <Alert>
        <MapPin className="h-4 w-4" />
        <AlertDescription>
          Informe um CEP válido para calcular o frete.
        </AlertDescription>
      </Alert>
    );
  }

  if (!shippingMethods || shippingMethods.length === 0) {
    return (
      <Alert>
        <Truck className="h-4 w-4" />
        <AlertDescription>
          Nenhum método de frete disponível para este CEP.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Truck className="w-5 h-5" />
        <Label className="text-base font-semibold">Método de Entrega</Label>
      </div>

      <div className="space-y-3">
        {shippingMethods.map((method) => {
          const calculatedPrice = calculatedPrices[method.id] || method.base_price;
          const isSelected = selectedMethod?.id === method.id;
          const isFree = calculatedPrice === 0;

          return (
            <Card 
              key={method.id} 
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected ? 'ring-2 ring-primary border-primary' : ''
              }`}
              onClick={() => handleMethodSelect(method)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`w-4 h-4 rounded-full border-2 mt-1 ${
                      isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                    }`}>
                      {isSelected && (
                        <div className="w-2 h-2 bg-primary-foreground rounded-full m-0.5"></div>
                      )}
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{method.name}</h4>
                        {method.is_label_method && (
                          <Badge variant="outline" className="text-xs">
                            <Upload className="w-3 h-3 mr-1" />
                            Com Etiqueta
                          </Badge>
                        )}
                        {isFree && (
                          <Badge className="text-xs bg-green-100 text-green-800">
                            <Gift className="w-3 h-3 mr-1" />
                            GRÁTIS
                          </Badge>
                        )}
                      </div>
                      
                      {method.description && (
                        <p className="text-sm text-muted-foreground">{method.description}</p>
                      )}
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {method.estimated_days === 0 
                          ? "Retirada imediata" 
                          : `${method.estimated_days} dia${method.estimated_days > 1 ? 's' : ''} útil${method.estimated_days > 1 ? 'eis' : ''}`
                        }
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      {isFree ? "GRÁTIS" : `R$ ${calculatedPrice.toFixed(2)}`}
                    </div>
                    {method.is_free_above_amount && !isFree && (
                      <div className="text-xs text-muted-foreground">
                        Grátis acima de R$ {Number(method.is_free_above_amount).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* File upload for label methods */}
      {selectedMethod?.is_label_method && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Anexar Etiqueta/Documento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ShippingFileUpload
              onFileUploaded={handleFileUpload}
              maxSizeMB={selectedMethod.max_file_size_mb}
              required={selectedMethod.requires_upload}
            />
          </CardContent>
        </Card>
      )}

      {/* Info about label method */}
      {selectedMethod?.is_label_method && (
        <Alert>
          <Upload className="h-4 w-4" />
          <AlertDescription>
            <strong>Envio com Etiqueta:</strong> Você pode anexar sua própria etiqueta de envio ou documento de transporte. 
            {selectedMethod.requires_upload ? " O upload é obrigatório para este método." : " O upload é opcional."}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}