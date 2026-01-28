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
import { formatPhone } from "@/lib/phone";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PixPayment from "@/components/PixPayment";
import { ModernPixPayment } from '@/components/ModernPixPayment';
import { PixPaymentModal } from '@/components/PixPaymentModal';
import { createModernPixPayment, PixPaymentRequest } from '@/lib/mercadoPago';
import { ShoppingCart, CreditCard, Truck, Shield, AlertTriangle } from "lucide-react";
import pixIcon from "@/assets/pix-icon.png";
import { ShippingMethodSelector } from "@/components/ShippingMethodSelector";
import { HighRotationAlert } from '@/components/HighRotationAlert';
interface CheckoutProps {
  showHeader?: boolean;
  showFooter?: boolean;
  storeSlug?: string;
}
const Checkout = ({
  showHeader = true,
  showFooter = true,
  storeSlug
}: CheckoutProps) => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    items: cartItems,
    clearCart
  } = useCart();
  const {
    user,
    session,
    profile
  } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [couponCode, setCouponCode] = useState("");
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<any>(null);
  const [shippingCost, setShippingCost] = useState(0);
  const [shippingFile, setShippingFile] = useState<any>(null);
  const [pixPaymentData, setPixPaymentData] = useState<PixPaymentData | null>(null);
  const [modernPixData, setModernPixData] = useState<{
    qr_code: string;
    qr_code_base64: string;
    payment_id: string;
  } | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixModalData, setPixModalData] = useState<{
    qrCodeBase64: string;
    qrCodeCopyPaste: string;
    paymentId: string;
    amount: number;
  } | null>(null);
  const [showHighRotationAlert, setShowHighRotationAlert] = useState(false);

  // Check if cart is empty and redirect
  useEffect(() => {
    if (cartItems.length === 0) {
      toast({
        title: "Carrinho vazio",
        description: "Adicione produtos ao carrinho antes de finalizar a compra.",
        variant: "destructive"
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

  // Load user data when component mounts
  useEffect(() => {
    const loadUserData = async () => {
      if (user && session) {
        // Prefill with user profile data
        setFormData(prev => ({
          ...prev,
          email: user.email || "",
          firstName: profile?.first_name || "",
          lastName: profile?.last_name || "",
          phone: profile?.phone || "",
          cpf: profile?.cpf || ""
        }));

        // Try to get user's default address
        try {
          const {
            data: addresses
          } = await supabase.from('addresses').select('*').eq('user_id', user.id).order('is_default', {
            ascending: false
          }).order('created_at', {
            ascending: false
          }).limit(1);
          if (addresses && addresses.length > 0) {
            const address = addresses[0];
            setFormData(prev => ({
              ...prev,
              address: address.street || "",
              number: address.number || "",
              complement: address.complement || "",
              neighborhood: address.neighborhood || "",
              city: address.city || "",
              state: address.state || "",
              zipCode: address.zip_code || ""
            }));
          }
        } catch (error) {
          console.error('Error loading user address:', error);
        }
      }
    };
    loadUserData();
  }, [user, session, profile]);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const handleShippingMethodChange = (method: any, calculatedPrice: number) => {
    setSelectedShippingMethod(method);
    setShippingCost(calculatedPrice);
  };
  const handleShippingFileUpload = (file: any) => {
    setShippingFile(file);
  };
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = couponCode === "DESCONTO10" ? subtotal * 0.1 : 0;
  const total = subtotal - discount + shippingCost;
  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
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
          description: "Endereço preenchido automaticamente."
        });
      } else {
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP informado.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao buscar CEP",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingCep(false);
    }
  };
  const handleInputChange = (field: keyof CheckoutForm, value: string) => {
    if (field === 'cpf') {
      // Format CPF automatically
      const formattedValue = formatCPF(value);
      setFormData(prev => ({
        ...prev,
        [field]: formattedValue
      }));
    } else if (field === 'phone') {
      // Format phone automatically
      const formattedPhone = formatPhone(value);
      setFormData(prev => ({
        ...prev,
        [field]: formattedPhone
      }));
    } else if (field === 'zipCode') {
      // Format CEP and trigger search
      const formattedCep = value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2');
      setFormData(prev => ({
        ...prev,
        [field]: formattedCep
      }));
      if (formattedCep.length === 9) {
        searchCep(formattedCep);
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };
  const applyCoupon = () => {
    if (couponCode === "DESCONTO10") {
      toast({
        title: "Cupom aplicado!",
        description: "Desconto de 10% aplicado com sucesso."
      });
    } else {
      toast({
        title: "Cupom inválido",
        description: "O cupom informado não é válido.",
        variant: "destructive"
      });
    }
  };

  // Helper function to check if selected method is label method
  const isLabelMethod = () => {
    return selectedShippingMethod?.is_label_method === true;
  };

  // Validation for step progression
  const canAdvanceToNextStep = () => {
    switch (currentStep) {
      case 1:
        return formData.email && formData.firstName && formData.cpf;
      case 2:
        // If label method, only need shipping method selected
        if (isLabelMethod()) {
          return selectedShippingMethod && (selectedShippingMethod.requires_upload ? shippingFile : true);
        }
        // Regular method requires full address
        return selectedShippingMethod && formData.address && formData.number && formData.neighborhood && formData.city && formData.state && formData.zipCode;
      case 3:
        return formData.paymentMethod;
      default:
        return true;
    }
  };
  const saveUserDataAndAddress = async () => {
    if (!user) return;
    try {
      // Update user profile with checkout data to complete missing information
      const profileUpdateData: any = {};
      let profileUpdated = false;

      // Complete missing first name
      if (formData.firstName && (!profile?.first_name || profile.first_name.trim() === '')) {
        profileUpdateData.first_name = formData.firstName.trim();
        profileUpdated = true;
      }

      // Complete missing last name
      if (formData.lastName && (!profile?.last_name || profile.last_name.trim() === '')) {
        profileUpdateData.last_name = formData.lastName.trim();
        profileUpdated = true;
      }

      // Update phone if missing or empty
      if (formData.phone && (!profile?.phone || profile.phone.trim() === '')) {
        profileUpdateData.phone = formData.phone.trim();
        profileUpdated = true;
      }

      // Update CPF if missing or empty
      if (formData.cpf && (!profile?.cpf || profile.cpf.trim() === '')) {
        profileUpdateData.cpf = cleanCPF(formData.cpf);
        profileUpdated = true;
      }

      // Update profile if any data was changed
      if (profileUpdated) {
        const {
          error: profileError
        } = await supabase.from('profiles').update(profileUpdateData).eq('user_id', user.id);
        if (profileError) {
          console.error('Error updating profile:', profileError);
        } else {
          console.log('Profile updated with checkout data');
        }
      }

      // Save/update address if all required fields are filled and it's not a label method
      if (!isLabelMethod() && formData.address && formData.number && formData.neighborhood && formData.city && formData.state && formData.zipCode) {
        // First, set all existing addresses as non-default
        await supabase.from('addresses').update({
          is_default: false
        }).eq('user_id', user.id);

        // Then insert or update the new address as default
        const addressData = {
          user_id: user.id,
          type: 'delivery',
          street: formData.address,
          number: formData.number,
          complement: formData.complement || null,
          neighborhood: formData.neighborhood,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zipCode,
          is_default: true
        };
        const {
          error: addressError
        } = await supabase.from('addresses').insert(addressData);
        if (addressError) {
          console.error('Error saving address:', addressError);
        }
      }
    } catch (error) {
      console.error('Error saving user data:', error);
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
          variant: "destructive"
        });
        setIsProcessingPayment(false);
        return;
      }

      // Save user data and address before processing payment
      await saveUserDataAndAddress();
      const orderItems = cartItems.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.price
      }));
      const paymentRequest: PixPaymentRequest = {
        amount: parseFloat(total.toFixed(2)),
        description: `Pedido - ${cartItems.length} item(s)`,
        payer: {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName || '',
          cpf: cleanCPF(formData.cpf)
        },
        orderItems,
        shippingAddress: isLabelMethod() ? null : {
          street: formData.address,
          number: formData.number,
          complement: formData.complement,
          neighborhood: formData.neighborhood,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode
        }
      };
      console.log('Creating PIX payment via Edge Function...');
      const response = await createModernPixPayment(paymentRequest);
      console.log('PIX payment created successfully:', response);

      // Upload shipping file if provided
      if (shippingFile && shippingFile.file && response.order_id) {
        try {
          console.log('Uploading shipping file for order:', response.order_id);
          const fileExtension = shippingFile.file.name.split('.').pop();
          const fileName = `order_${response.order_id}_${Date.now()}.${fileExtension}`;
          const filePath = `${response.order_id}/${fileName}`;
          const {
            data: uploadData,
            error: uploadError
          } = await supabase.storage.from('shipping-files').upload(filePath, shippingFile.file);
          if (uploadError) {
            console.error('Error uploading shipping file:', uploadError);
          } else {
            console.log('Shipping file uploaded successfully:', uploadData);
            const {
              error: dbError
            } = await supabase.from('order_shipping_files').insert({
              order_id: response.order_id,
              file_name: shippingFile.file.name,
              file_path: filePath,
              file_size: shippingFile.file.size
            });
            if (dbError) {
              console.error('Error saving shipping file reference:', dbError);
            }
          }
        } catch (uploadError) {
          console.error('Error in shipping file upload process:', uploadError);
        }
      }

      // Set PIX data to show payment UI
      setModernPixData({
        qr_code: response.qr_code,
        qr_code_base64: response.qr_code_base64,
        payment_id: response.payment_id
      });
      toast({
        title: "PIX gerado com sucesso!",
        description: "Escaneie o QR Code ou copie o código para efetuar o pagamento."
      });
    } catch (error) {
      console.error('Error creating PIX payment:', error);
      let errorTitle = "Erro ao gerar PIX";
      let errorDescription = "Tente novamente em alguns instantes.";
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
        if (error.message.includes('Webhook N8N não está ativo') || error.message.includes('WEBHOOK_NOT_REGISTERED')) {
          errorTitle = "Webhook N8N não está ativo";
          errorDescription = "O sistema de pagamento PIX não está configurado. Entre em contato com o administrador.";
        } else if (error.message.includes('timeout') || error.message.includes('PIX_SERVICE_TIMEOUT')) {
          errorTitle = "Timeout do serviço";
          errorDescription = "O serviço de PIX demorou para responder. Tente novamente.";
        } else if (error.message.includes('PIX service unavailable') || error.message.includes('503')) {
          errorTitle = "Serviço indisponível";
          errorDescription = "O serviço de PIX está temporariamente indisponível. Tente novamente em alguns minutos.";
        } else {
          errorDescription = error.message;
        }
      }
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive"
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };
  const createModernPix = async () => {
    if (!formData.firstName || !formData.email || !formData.cpf) {
      toast({
        title: "Dados incompletos",
        description: "Preencha todos os dados pessoais para continuar.",
        variant: "destructive"
      });
      return;
    }

    // Check if there are high rotation products in cart
    const hasHighRotationProducts = await checkHighRotationProducts();
    if (hasHighRotationProducts) {
      setShowHighRotationAlert(true);
      return;
    }
    await createPixPayment();
  };
  const checkHighRotationProducts = async (): Promise<boolean> => {
    // Não verificar produtos de alta rotação na loja do revendedor
    if (storeSlug) {
      return false;
    }
    try {
      const productIds = cartItems.map(item => item.productId);
      const {
        data: products
      } = await supabase.from('products').select('id, high_rotation').in('id', productIds);
      return products?.some(product => product.high_rotation) || false;
    } catch (error) {
      console.error('Error checking high rotation products:', error);
      return false;
    }
  };
  const processPixPayment = async () => {
    // This function is no longer used, kept for compatibility
    await createPixPayment();
  };
  const handleSubmit = () => {
    createModernPix();
  };
  const handleGeneratePix = () => {
    createModernPix();
  };
  const handlePixPaymentConfirmed = () => {
    clearCart();
    toast({
      title: "Pagamento confirmado!",
      description: "Seu pedido foi processado com sucesso."
    });
    navigate("/");
  };
  const steps = [{
    number: 1,
    title: "Dados Pessoais",
    icon: ShoppingCart
  }, {
    number: 2,
    title: "Entrega",
    icon: Truck
  }, {
    number: 3,
    title: "Pagamento",
    icon: CreditCard
  }, {
    number: 4,
    title: "PIX",
    icon: Shield
  }];
  return <div className="min-h-screen bg-background">
      {showHeader && <Header />}
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-4">Finalizar Compra</h1>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8">
            {steps.map((step, index) => <div key={step.number} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${currentStep >= step.number ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  <step.icon className="w-5 h-5" />
                </div>
                <span className={`ml-2 text-sm font-medium ${currentStep >= step.number ? 'text-primary' : 'text-muted-foreground'}`}>
                  {step.title}
                </span>
                {index < steps.length - 1 && <div className={`w-20 h-0.5 mx-4 ${currentStep > step.number ? 'bg-primary' : 'bg-muted'}`} />}
              </div>)}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Profile completion warning for logged-in users */}
            {user && (!profile?.phone || !profile?.cpf) && <Card className="border-amber-200 bg-amber-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-amber-800">Complete seu perfil</h3>
                      <p className="text-sm text-amber-700 mt-1">
                        Para uma experiência mais rápida, complete as informações do seu perfil. 
                        Os dados serão salvos automaticamente após a compra.
                      </p>
                      {!profile?.phone && !profile?.cpf && <p className="text-xs text-amber-600 mt-2">
                          Preencha telefone e CPF para que sejam salvos no seu perfil.
                        </p>}
                      {!profile?.phone && profile?.cpf && <p className="text-xs text-amber-600 mt-2">
                          Preencha seu telefone para que seja salvo no seu perfil.
                        </p>}
                      {profile?.phone && !profile?.cpf && <p className="text-xs text-amber-600 mt-2">
                          Preencha seu CPF para que seja salvo no seu perfil.
                        </p>}
                    </div>
                  </div>
                </CardContent>
              </Card>}
            
            {/* Show PIX Payment if available */}
            {modernPixData ? <div className="flex justify-center">
                <ModernPixPayment qrCode={modernPixData.qr_code} qrCodeBase64={modernPixData.qr_code_base64} amount={total} paymentId={modernPixData.payment_id} onPaymentConfirmed={handlePixPaymentConfirmed} />
              </div> : pixPaymentData ? <div className="flex justify-center">
                <PixPayment paymentData={pixPaymentData} onPaymentConfirmed={handlePixPaymentConfirmed} />
              </div> : <>
                {/* Regular checkout steps */}
            {currentStep === 1 && <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    Dados Pessoais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" type="email" value={formData.email} onChange={e => handleInputChange("email", e.target.value)} placeholder="seu@email.com" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">Nome</Label>
                      <Input id="firstName" value={formData.firstName} onChange={e => handleInputChange("firstName", e.target.value)} placeholder="Seu nome" />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Sobrenome</Label>
                      <Input id="lastName" value={formData.lastName} onChange={e => handleInputChange("lastName", e.target.value)} placeholder="Seu sobrenome" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" value={formData.phone} onChange={e => handleInputChange("phone", e.target.value)} placeholder="+55 (11) 99999-9999" maxLength={19} />
                  </div>
                  <div>
                    <Label htmlFor="cpf">CPF</Label>
                    <Input id="cpf" value={formData.cpf} onChange={e => handleInputChange("cpf", e.target.value)} placeholder="000.000.000-00" maxLength={14} />
                  </div>
                </CardContent>
              </Card>}

            {currentStep === 2 && <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="w-5 h-5" />
                    Endereço de Entrega
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Shipping Method Selector */}
                  <ShippingMethodSelector orderValue={subtotal} zipCode={formData.zipCode} weight={1} // Calculate this based on products if needed
                selectedMethodId={selectedShippingMethod?.id} onMethodChange={handleShippingMethodChange} onFileUploaded={handleShippingFileUpload} />
                  
                  {/* Address fields - only show if not using label method */}
                  {!isLabelMethod() && <div className="space-y-4 pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4" />
                        <Label className="text-base font-semibold">Endereço de Entrega</Label>
                      </div>
                      
                      <div>
                        <Label htmlFor="zipCode">CEP</Label>
                        <Input id="zipCode" value={formData.zipCode} onChange={e => handleInputChange("zipCode", e.target.value)} placeholder="00000-000" maxLength={9} disabled={isLoadingCep} />
                        {isLoadingCep && <p className="text-sm text-muted-foreground mt-1">
                            Buscando endereço...
                          </p>}
                      </div>
                      <div>
                        <Label htmlFor="address">Logradouro</Label>
                        <Input id="address" value={formData.address} onChange={e => handleInputChange("address", e.target.value)} placeholder="Nome da rua" />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                          <Label htmlFor="number">Número</Label>
                          <Input id="number" value={formData.number} onChange={e => handleInputChange("number", e.target.value)} placeholder="123" />
                        </div>
                        <div className="col-span-2">
                          <Label htmlFor="complement">Complemento</Label>
                          <Input id="complement" value={formData.complement} onChange={e => handleInputChange("complement", e.target.value)} placeholder="Apto, casa, etc. (opcional)" />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="neighborhood">Bairro</Label>
                        <Input id="neighborhood" value={formData.neighborhood} onChange={e => handleInputChange("neighborhood", e.target.value)} placeholder="Nome do bairro" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="city">Cidade</Label>
                          <Input id="city" value={formData.city} onChange={e => handleInputChange("city", e.target.value)} placeholder="Sua cidade" />
                        </div>
                        <div>
                          <Label htmlFor="state">Estado</Label>
                          <Select value={formData.state} onValueChange={value => handleInputChange("state", value)}>
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
                    </div>}
                  
                  {/* Label method info message */}
                  {isLabelMethod() && <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-blue-800">Envio com Etiqueta</h4>
                          <p className="text-sm text-blue-700 mt-1">
                            Com esta modalidade de envio, não é necessário informar o endereço de entrega. 
                            {selectedShippingMethod?.requires_file && !shippingFile && <span className="block mt-1 font-medium">
                                Por favor, faça o upload da etiqueta de envio para continuar.
                              </span>}
                          </p>
                        </div>
                      </div>
                    </div>}
                </CardContent>
              </Card>}

            {currentStep === 3 && <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Forma de Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-xl">
                        💠
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
                    Clique no botão abaixo para gerar o QR Code PIX para pagamento.
                    O pagamento é processado instantaneamente.
                  </p>
                  <Button onClick={handleGeneratePix} disabled={isProcessingPayment || !canAdvanceToNextStep()} size="lg" className="w-full bg-[#3fc356]">
                    {isProcessingPayment ? "Gerando PIX..." : "Concluir Pagamento"}
                  </Button>
                </CardContent>
              </Card>}

            {currentStep === 4 && <Card>
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
                    {!isLabelMethod() ? <p><strong>Endereço:</strong> {formData.address}, {formData.number} {formData.complement && `- ${formData.complement}`}, {formData.neighborhood}, {formData.city} - {formData.state}</p> : <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                        <p><strong>Entrega:</strong> Envio com Etiqueta</p>
                        {shippingFile && <p className="text-xs text-blue-600 mt-1">
                            Etiqueta anexada: {shippingFile.name}
                          </p>}
                      </div>}
                    <p><strong>Pagamento:</strong> PIX</p>
                  </div>
                </CardContent>
              </Card>}

                {/* Navigation Buttons */}
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setCurrentStep(Math.max(1, currentStep - 1))} disabled={currentStep === 1 || isProcessingPayment}>
                    Voltar
                  </Button>
                  
                  {currentStep < 3 && <Button onClick={() => setCurrentStep(currentStep + 1)} disabled={!canAdvanceToNextStep()} className="bg-[#3fc356]">
                      Continuar
                    </Button>}
                </div>
              </>}
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumo do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cartItems.map(item => <div key={item.productId} className="flex gap-3">
                    <img src={item.productImage} alt={item.productName} className="w-16 h-16 object-cover rounded" />
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{item.productName}</h4>
                      {item.variants && <div className="flex gap-1 mt-1">
                          {Object.entries(item.variants).map(([key, value]) => <Badge key={key} variant="secondary" className="text-xs">
                              {value}
                            </Badge>)}
                        </div>}
                      <p className="text-sm text-muted-foreground">Qtd: {item.quantity}</p>
                      <p className="font-medium">{formatPrice(item.price)}</p>
                    </div>
                  </div>)}
                
                <Separator />
                
                {/* Coupon */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input placeholder="Código do cupom" value={couponCode} onChange={e => setCouponCode(e.target.value)} />
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
                  {discount > 0 && <div className="flex justify-between text-green-600">
                      <span>Desconto</span>
                      <span>-{formatPrice(discount)}</span>
                    </div>}
                  <div className="flex justify-between">
                    <span>Frete</span>
                    <span>
                      {selectedShippingMethod ? shippingCost === 0 ? "GRÁTIS" : formatPrice(shippingCost) : "A calcular"}
                    </span>
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
      
      {showFooter && <Footer />}

      {/* PIX Payment Modal */}
      {pixModalData && <PixPaymentModal isOpen={showPixModal} onClose={() => setShowPixModal(false)} qrCodeBase64={pixModalData.qrCodeBase64} qrCodeCopyPaste={pixModalData.qrCodeCopyPaste} paymentId={pixModalData.paymentId} amount={pixModalData.amount} onPaymentConfirmed={handlePixPaymentConfirmed} />}

      {/* High Rotation Alert Modal */}
      <HighRotationAlert 
        isOpen={showHighRotationAlert} 
        onClose={() => setShowHighRotationAlert(false)} 
        allowContinue={false}
      />
    </div>;
};
export default Checkout;