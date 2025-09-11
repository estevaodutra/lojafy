import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckoutForm, OrderItem, PixPaymentData } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { formatCPF, validateCPF, cleanCPF } from "@/lib/cpf";
import { useCart } from "@/contexts/CartContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PixPayment from "@/components/PixPayment";
import { ShoppingCart, CreditCard, Truck, Shield } from "lucide-react";

const Checkout = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { items: cartItems, clearCart } = useCart();
  const [currentStep, setCurrentStep] = useState(1);
  const [couponCode, setCouponCode] = useState("");
  const [shippingCost, setShippingCost] = useState(15.90);
  const [pixPaymentData, setPixPaymentData] = useState<PixPaymentData | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Check if cart is empty and redirect
  useEffect(() => {
    if (cartItems.length === 0) {
      toast({
        title: "Carrinho vazio",
        description: "Adicione produtos ao carrinho antes de finalizar a compra.",
        variant: "destructive",
      });
      navigate("/carrinho");
    }
  }, [cartItems, navigate, toast]);

  const [formData, setFormData] = useState<CheckoutForm>({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    cpf: "",
    address: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zipCode: "",
    paymentMethod: "pix"
  });

  const [isLoadingCep, setIsLoadingCep] = useState(false);

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discount = couponCode === "DESCONTO10" ? subtotal * 0.1 : 0;
  const total = subtotal - discount + shippingCost;

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const searchCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          address: data.logradouro || "",
          neighborhood: data.bairro || "",
          city: data.localidade || "",
          state: data.uf || ""
        }));
        
        toast({
          title: "CEP encontrado!",
          description: "Endereço preenchido automaticamente.",
        });
      } else {
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP informado.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao buscar CEP",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleInputChange = (field: keyof CheckoutForm, value: string) => {
    if (field === 'cpf') {
      // Format CPF automatically
      const formattedValue = formatCPF(value);
      setFormData(prev => ({ ...prev, [field]: formattedValue }));
    } else if (field === 'zipCode') {
      // Format CEP and trigger search
      const formattedCep = value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2');
      setFormData(prev => ({ ...prev, [field]: formattedCep }));
      
      if (formattedCep.length === 9) {
        searchCep(formattedCep);
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const applyCoupon = () => {
    if (couponCode === "DESCONTO10") {
      toast({
        title: "Cupom aplicado!",
        description: "Desconto de 10% aplicado com sucesso.",
      });
    } else {
      toast({
        title: "Cupom inválido",
        description: "O cupom informado não é válido.",
        variant: "destructive",
      });
    }
  };

  const createPixPayment = async () => {
    setIsProcessingPayment(true);
    try {
      // Validate CPF
      if (!validateCPF(formData.cpf)) {
        toast({
          title: "CPF inválido",
          description: "Por favor, informe um CPF válido.",
          variant: "destructive",
        });
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Erro de autenticação",
          description: "Você precisa estar logado para finalizar a compra.",
          variant: "destructive",
        });
        return;
      }

      const orderItems = cartItems.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.price,
      }));

      const paymentRequest = {
        amount: total,
        description: `Pedido - ${cartItems.length} item(s)`,
        payer: {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          cpf: cleanCPF(formData.cpf),
        },
        orderItems,
        shippingAddress: {
          street: formData.address,
          number: formData.number,
          complement: formData.complement,
          neighborhood: formData.neighborhood,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
        },
      };

      const { data, error } = await supabase.functions.invoke('create-pix-payment', {
        body: paymentRequest,
      });

      if (error) {
        console.error('PIX payment error:', error);
        toast({
          title: "Erro ao criar pagamento PIX",
          description: error.message || "Tente novamente em alguns instantes.",
          variant: "destructive",
        });
        return;
      }

      setPixPaymentData(data);
      
      toast({
        title: "PIX gerado com sucesso!",
        description: "Escaneie o QR Code ou copie o código para efetuar o pagamento.",
      });

    } catch (error) {
      console.error('Error creating PIX payment:', error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro ao processar seu pagamento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleSubmit = () => {
    createPixPayment();
  };

  const handlePixPaymentConfirmed = () => {
    clearCart();
    toast({
      title: "Pagamento confirmado!",
      description: "Seu pedido foi processado com sucesso. Você receberá um e-mail de confirmação.",
    });
    navigate("/");
  };

  const steps = [
    { number: 1, title: "Dados Pessoais", icon: ShoppingCart },
    { number: 2, title: "Entrega", icon: Truck },
    { number: 3, title: "Pagamento", icon: CreditCard },
    { number: 4, title: "PIX", icon: Shield }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-4">Finalizar Compra</h1>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  currentStep >= step.number ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  <step.icon className="w-5 h-5" />
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  currentStep >= step.number ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <div className={`w-20 h-0.5 mx-4 ${
                    currentStep > step.number ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Show PIX Payment if available */}
            {pixPaymentData ? (
              <div className="flex justify-center">
                <PixPayment 
                  paymentData={pixPaymentData} 
                  onPaymentConfirmed={handlePixPaymentConfirmed}
                />
              </div>
            ) : (
              <>
                {/* Regular checkout steps */}
            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    Dados Pessoais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="seu@email.com"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">Nome</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                        placeholder="Seu nome"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Sobrenome</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange("lastName", e.target.value)}
                        placeholder="Seu sobrenome"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      value={formData.cpf}
                      onChange={(e) => handleInputChange("cpf", e.target.value)}
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="w-5 h-5" />
                    Endereço de Entrega
                  </CardTitle>
                </CardHeader>
                 <CardContent className="space-y-4">
                   <div>
                     <Label htmlFor="zipCode">CEP</Label>
                     <Input
                       id="zipCode"
                       value={formData.zipCode}
                       onChange={(e) => handleInputChange("zipCode", e.target.value)}
                       placeholder="00000-000"
                       maxLength={9}
                       disabled={isLoadingCep}
                     />
                     {isLoadingCep && (
                       <p className="text-sm text-muted-foreground mt-1">
                         Buscando endereço...
                       </p>
                     )}
                   </div>
                   <div>
                     <Label htmlFor="address">Logradouro</Label>
                     <Input
                       id="address"
                       value={formData.address}
                       onChange={(e) => handleInputChange("address", e.target.value)}
                       placeholder="Nome da rua"
                     />
                   </div>
                   <div className="grid grid-cols-3 gap-4">
                     <div className="col-span-1">
                       <Label htmlFor="number">Número</Label>
                       <Input
                         id="number"
                         value={formData.number}
                         onChange={(e) => handleInputChange("number", e.target.value)}
                         placeholder="123"
                       />
                     </div>
                     <div className="col-span-2">
                       <Label htmlFor="complement">Complemento</Label>
                       <Input
                         id="complement"
                         value={formData.complement}
                         onChange={(e) => handleInputChange("complement", e.target.value)}
                         placeholder="Apto, casa, etc. (opcional)"
                       />
                     </div>
                   </div>
                   <div>
                     <Label htmlFor="neighborhood">Bairro</Label>
                     <Input
                       id="neighborhood"
                       value={formData.neighborhood}
                       onChange={(e) => handleInputChange("neighborhood", e.target.value)}
                       placeholder="Nome do bairro"
                     />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <Label htmlFor="city">Cidade</Label>
                       <Input
                         id="city"
                         value={formData.city}
                         onChange={(e) => handleInputChange("city", e.target.value)}
                         placeholder="Sua cidade"
                       />
                     </div>
                     <div>
                       <Label htmlFor="state">Estado</Label>
                       <Select 
                         value={formData.state} 
                         onValueChange={(value) => handleInputChange("state", value)}
                       >
                         <SelectTrigger>
                           <SelectValue placeholder="Selecione" />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="AC">Acre</SelectItem>
                           <SelectItem value="AL">Alagoas</SelectItem>
                           <SelectItem value="AP">Amapá</SelectItem>
                           <SelectItem value="AM">Amazonas</SelectItem>
                           <SelectItem value="BA">Bahia</SelectItem>
                           <SelectItem value="CE">Ceará</SelectItem>
                           <SelectItem value="DF">Distrito Federal</SelectItem>
                           <SelectItem value="ES">Espírito Santo</SelectItem>
                           <SelectItem value="GO">Goiás</SelectItem>
                           <SelectItem value="MA">Maranhão</SelectItem>
                           <SelectItem value="MT">Mato Grosso</SelectItem>
                           <SelectItem value="MS">Mato Grosso do Sul</SelectItem>
                           <SelectItem value="MG">Minas Gerais</SelectItem>
                           <SelectItem value="PA">Pará</SelectItem>
                           <SelectItem value="PB">Paraíba</SelectItem>
                           <SelectItem value="PR">Paraná</SelectItem>
                           <SelectItem value="PE">Pernambuco</SelectItem>
                           <SelectItem value="PI">Piauí</SelectItem>
                           <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                           <SelectItem value="RN">Rio Grande do Norte</SelectItem>
                           <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                           <SelectItem value="RO">Rondônia</SelectItem>
                           <SelectItem value="RR">Roraima</SelectItem>
                           <SelectItem value="SC">Santa Catarina</SelectItem>
                           <SelectItem value="SP">São Paulo</SelectItem>
                           <SelectItem value="SE">Sergipe</SelectItem>
                           <SelectItem value="TO">Tocantins</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>
                   </div>
                 </CardContent>
              </Card>
            )}

            {currentStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Forma de Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                        <Shield className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div>
                        <h4 className="font-semibold">PIX</h4>
                        <p className="text-sm text-muted-foreground">
                          Pagamento instantâneo e seguro
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Após confirmar o pedido, você receberá o QR Code para pagamento via PIX.
                    O pagamento é processado instantaneamente.
                  </p>
                </CardContent>
              </Card>
            )}

            {currentStep === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Confirmação do Pedido
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Revise seus dados e finalize a compra. Você receberá um e-mail de confirmação.
                  </p>
                  <div className="space-y-2 text-sm">
                    <p><strong>Nome:</strong> {formData.firstName} {formData.lastName}</p>
                    <p><strong>E-mail:</strong> {formData.email}</p>
                    <p><strong>Telefone:</strong> {formData.phone}</p>
                     <p><strong>Endereço:</strong> {formData.address}, {formData.number} {formData.complement && `- ${formData.complement}`}, {formData.neighborhood}, {formData.city} - {formData.state}</p>
                     <p><strong>Pagamento:</strong> PIX</p>
                  </div>
                </CardContent>
              </Card>
            )}

                {/* Navigation Buttons */}
                <div className="flex justify-between">
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                    disabled={currentStep === 1}
                  >
                    Voltar
                  </Button>
                  
                  {currentStep < 4 ? (
                    <Button onClick={() => setCurrentStep(currentStep + 1)}>
                      Continuar
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleSubmit} 
                      disabled={isProcessingPayment}
                    >
                      {isProcessingPayment ? "Processando..." : "Finalizar Pedido"}
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumo do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.productId} className="flex gap-3">
                    <img 
                      src={item.productImage} 
                      alt={item.productName}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{item.productName}</h4>
                      {item.variants && (
                        <div className="flex gap-1 mt-1">
                          {Object.entries(item.variants).map(([key, value]) => (
                            <Badge key={key} variant="secondary" className="text-xs">
                              {value}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground">Qtd: {item.quantity}</p>
                      <p className="font-medium">{formatPrice(item.price)}</p>
                    </div>
                  </div>
                ))}
                
                <Separator />
                
                {/* Coupon */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Código do cupom"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                    />
                    <Button variant="outline" onClick={applyCoupon}>
                      Aplicar
                    </Button>
                  </div>
                </div>
                
                <Separator />
                
                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Desconto</span>
                      <span>-{formatPrice(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Frete</span>
                    <span>{formatPrice(shippingCost)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Checkout;