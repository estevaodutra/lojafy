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
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PixPayment from "@/components/PixPayment";
import { ModernPixPayment } from '@/components/ModernPixPayment';
import { PixPaymentModal } from '@/components/PixPaymentModal';
import { createModernPixPayment, PixPaymentRequest } from '@/lib/mercadoPago';
import { ShoppingCart, CreditCard, Truck, Shield, AlertTriangle } from "lucide-react";
import { ShippingMethodSelector } from "@/components/ShippingMethodSelector";
import { HighRotationAlert } from '@/components/HighRotationAlert';

interface CheckoutProps {
  showHeader?: boolean;
  showFooter?: boolean;
}

const Checkout = ({ showHeader = true, showFooter = true }: CheckoutProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { items: cartItems, clearCart } = useCart();
  const { user, session, profile } = useAuth();
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
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [createdOrderData, setCreatedOrderData] = useState<{
    id: string;
    order_number: string;
    total_amount: number;
  } | null>(null);

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
          cpf: profile?.cpf || "",
        }));

        // Try to get user's default address
        try {
          const { data: addresses } = await supabase
            .from('addresses')
            .select('*')
            .eq('user_id', user.id)
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(1);

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
              zipCode: address.zip_code || "",
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
        return selectedShippingMethod && formData.address && formData.number && 
               formData.neighborhood && formData.city && formData.state && formData.zipCode;
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
        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdateData)
          .eq('user_id', user.id);

        if (profileError) {
          console.error('Error updating profile:', profileError);
        } else {
          console.log('Profile updated with checkout data');
        }
      }

      // Save/update address if all required fields are filled and it's not a label method
      if (!isLabelMethod() && formData.address && formData.number && formData.neighborhood && formData.city && formData.state && formData.zipCode) {
        // First, set all existing addresses as non-default
        await supabase
          .from('addresses')
          .update({ is_default: false })
          .eq('user_id', user.id);

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
          is_default: true,
        };

        const { error: addressError } = await supabase
          .from('addresses')
          .insert(addressData);

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

      // Save user data and address before processing payment
      await saveUserDataAndAddress();

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
        shippingAddress: isLabelMethod() ? null : {
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

  // Removed unused createModernPix function

  const checkHighRotationProducts = async (): Promise<boolean> => {
    try {
      const productIds = cartItems.map(item => item.productId);
      
      const { data: products } = await supabase
        .from('products')
        .select('id, high_rotation')
        .in('id', productIds);
      
      return products?.some(product => product.high_rotation) || false;
    } catch (error) {
      console.error('Error checking high rotation products:', error);
      return false;
    }
  };

  // NEW: Create order with draft status BEFORE payment
  const handleCreateOrder = async () => {
    // Validate shipping label if it's a label method
    if (isLabelMethod() && selectedShippingMethod?.requires_upload && !shippingFile) {
      toast({
        title: "Etiqueta obrigatória",
        description: "Por favor, anexe a etiqueta de envio antes de continuar.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingOrder(true);

    try {
      console.log('📝 Creating order with draft status...');

      // Step 1: Save user data
      await saveUserDataAndAddress();

      // Step 2: Upload shipping file if provided
      let uploadedFilePath = null;
      if (shippingFile && shippingFile.file) {
        try {
          console.log('📤 Uploading shipping label...');
          
          const fileExtension = shippingFile.file.name.split('.').pop();
          const tempFileName = `temp_${Date.now()}.${fileExtension}`;
          const tempFilePath = `temp/${tempFileName}`;

          const { error: uploadError } = await supabase.storage
            .from('shipping-files')
            .upload(tempFilePath, shippingFile.file);

          if (uploadError) {
            console.error('Error uploading shipping file:', uploadError);
            toast({
              title: "Erro no upload da etiqueta",
              description: "Não foi possível fazer upload da etiqueta. Tente novamente.",
              variant: "destructive",
            });
            return;
          }

          uploadedFilePath = tempFilePath;
          console.log('✅ Shipping label uploaded successfully:', uploadedFilePath);
        } catch (uploadErr) {
          console.error('Unexpected error uploading file:', uploadErr);
          toast({
            title: "Erro ao enviar etiqueta",
            description: "Erro inesperado. Tente novamente.",
            variant: "destructive",
          });
          return;
        }
      }

      // Step 3: Create order with draft status
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Erro de autenticação",
          description: "Você precisa estar logado para finalizar a compra.",
          variant: "destructive",
        });
        return;
      }

      const externalReference = `order_${Date.now()}_${user?.id.substring(0, 8)}`;
      const orderNumber = externalReference.toUpperCase().replace('ORDER_', 'ORD-');

      const orderInsertData = {
        user_id: user!.id,
        order_number: orderNumber,
        total_amount: total,
        shipping_amount: shippingCost,
        payment_method: 'pix',
        payment_status: 'pending',
        status: 'draft', // Draft status until payment is generated
        shipping_method_id: selectedShippingMethod?.id || null,
        shipping_method_name: selectedShippingMethod?.name || null,
        shipping_estimated_days: selectedShippingMethod?.estimated_days || null,
        shipping_address: isLabelMethod() ? null : {
          street: formData.address,
          number: formData.number,
          complement: formData.complement,
          neighborhood: formData.neighborhood,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
        },
        external_reference: externalReference,
        has_shipping_file: !!uploadedFilePath,
      };

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert(orderInsertData)
        .select()
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        toast({
          title: "Erro ao criar pedido",
          description: "Não foi possível criar o pedido. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      console.log('✅ Order created with draft status:', orderData.id);

      // Store order data for display
      setCreatedOrderData({
        id: orderData.id,
        order_number: orderData.order_number,
        total_amount: orderData.total_amount,
      });

      // Step 4: Create order items
      const orderItemsData = cartItems.map(item => ({
        order_id: orderData.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.quantity * item.price,
        product_snapshot: {
          name: item.productName,
          price: item.price,
        }
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData);

      if (itemsError) {
        console.error('Error creating order items:', itemsError);
        toast({
          title: "Erro ao criar itens do pedido",
          description: "Não foi possível criar os itens do pedido.",
          variant: "destructive",
        });
        return;
      }

      // Step 5: Link shipping file to order if uploaded
      if (uploadedFilePath && orderData.id) {
        try {
          const fileExtension = shippingFile.file.name.split('.').pop();
          const finalFileName = `order_${orderData.id}_${Date.now()}.${fileExtension}`;
          const finalFilePath = `${orderData.id}/${finalFileName}`;

          // Move file to final location
          const { error: moveError } = await supabase.storage
            .from('shipping-files')
            .move(uploadedFilePath, finalFilePath);

          if (moveError) {
            console.error('Error moving file:', moveError);
            // Fallback: copy instead
            const { data: downloadData } = await supabase.storage
              .from('shipping-files')
              .download(uploadedFilePath);
            
            if (downloadData) {
              await supabase.storage
                .from('shipping-files')
                .upload(finalFilePath, downloadData);
              
              await supabase.storage
                .from('shipping-files')
                .remove([uploadedFilePath]);
            }
          }

          // Save file metadata
          const { error: dbError } = await supabase
            .from('order_shipping_files')
            .insert({
              order_id: orderData.id,
              file_name: shippingFile.name,
              file_path: finalFilePath,
              file_size: shippingFile.size
            });

          if (dbError) {
            console.error('❌ Error saving file metadata:', dbError);
          } else {
            console.log('✅ Shipping label linked to order');
          }
        } catch (err) {
          console.error('❌ Error linking shipping file:', err);
        }
      }

      // Step 6: Store order ID and advance to payment
      console.log('✅ [DEBUG] Setting createdOrderId:', orderData.id);
      console.log('✅ [DEBUG] Setting createdOrderData:', {
        id: orderData.id,
        order_number: orderData.order_number,
        total_amount: orderData.total_amount,
      });
      
      setCreatedOrderId(orderData.id);
      
      toast({
        title: "Pedido criado!",
        description: "Agora você pode gerar o pagamento PIX.",
      });

      // Automatically advance to payment generation
      setCurrentStep(4);

    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: "Erro ao criar pedido",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // NEW: Process PIX payment for existing order
  const processPixPayment = async () => {
    console.log('🔍 [DEBUG] processPixPayment called');
    console.log('🔍 [DEBUG] createdOrderId:', createdOrderId);
    console.log('🔍 [DEBUG] createdOrderData:', createdOrderData);
    
    if (!createdOrderId || !createdOrderData) {
      console.error('❌ [DEBUG] Missing order data - createdOrderId:', createdOrderId, 'createdOrderData:', createdOrderData);
      toast({
        title: "Erro",
        description: "Pedido não foi criado. Por favor, volte e crie o pedido primeiro.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingPayment(true);

    try {
      console.log('💳 Generating PIX for order:', createdOrderId);
      console.log('📦 Order details:', createdOrderData);

      const orderItems = cartItems.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.price,
      }));

      const paymentRequest = {
        orderId: createdOrderId, // Send existing order ID
        amount: parseFloat(total.toFixed(2)),
        description: `Pedido - ${cartItems.length} item(s)`,
        payer: {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName || '',
          cpf: formData.cpf
        },
        orderItems,
      };

      const { data, error } = await supabase.functions.invoke('create-pix-payment', {
        body: paymentRequest,
      });

      if (error) {
        console.error('PIX generation error:', error);
        toast({
          title: "Erro ao gerar PIX",
          description: error.message || "Tente novamente em alguns instantes.",
          variant: "destructive",
        });
        return;
      }

      console.log('✅ PIX generated successfully:', data);
      console.log('✅ [DEBUG] PIX data received:', {
        qr_code_base64: data.qr_code_base64 ? 'present' : 'missing',
        qr_code: data.qr_code ? 'present' : 'missing',
        payment_id: data.payment_id,
      });
      
      // Open the PIX modal with the payment data
      const pixData = {
        qrCodeBase64: data.qr_code_base64,
        qrCodeCopyPaste: data.qr_code,
        paymentId: data.payment_id,
        amount: parseFloat(total.toFixed(2))
      };
      
      console.log('✅ [DEBUG] Setting pixModalData:', pixData);
      setPixModalData(pixData);
      
      console.log('✅ [DEBUG] Opening PIX modal');
      setShowPixModal(true);

      toast({
        title: "PIX gerado com sucesso!",
        description: "Escaneie o QR Code ou copie o código PIX para efetuar o pagamento.",
      });

    } catch (error) {
      console.error('Error creating modern PIX:', error);
      
      // Melhor tratamento de erro para diferentes cenários
      let errorTitle = "Erro ao gerar PIX";
      let errorDescription = "Tente novamente em alguns instantes.";
      let showRetryButton = true;
      
      if (error instanceof Error) {
        // Log detalhes do erro para debugging
        console.error('Detalhes do erro PIX:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
        
        // Tratar erros específicos do webhook
        if (error.message.includes('Webhook N8N não está ativo') || error.message.includes('WEBHOOK_NOT_REGISTERED')) {
          errorTitle = "Webhook N8N não está ativo";
          errorDescription = "O sistema de pagamento PIX não está configurado. Entre em contato com o administrador.";
          showRetryButton = false;
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
        variant: "destructive",
      });
      
      // Mostrar botão de retry se apropriado
      if (showRetryButton) {
        setTimeout(() => {
          toast({
            title: "💡 Dica",
            description: "Você pode tentar gerar o PIX novamente clicando no botão de pagamento.",
          });
        }, 3000);
      }
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleSubmit = async () => {
    // Step 1: Check for high rotation products
    const hasHighRotationProducts = await checkHighRotationProducts();
    if (hasHighRotationProducts) {
      setShowHighRotationAlert(true);
      return;
    }

    // Step 2: Create order first
    if (!createdOrderId) {
      await handleCreateOrder();
    }
  };

  const handleGeneratePixPayment = async () => {
    console.log('🎯 [DEBUG] handleGeneratePixPayment called');
    console.log('🔍 [DEBUG] Current state - createdOrderId:', createdOrderId);
    console.log('🔍 [DEBUG] Current state - createdOrderData:', createdOrderData);
    
    if (!createdOrderId || !createdOrderData) {
      console.error('❌ [DEBUG] Cannot generate PIX - missing order data');
      toast({
        title: "Erro",
        description: "Dados do pedido não encontrados. Por favor, tente criar o pedido novamente.",
        variant: "destructive",
      });
      setCurrentStep(3); // Go back to payment step
      return;
    }
    
    await processPixPayment();
  };

  const handlePixPaymentConfirmed = () => {
    clearCart();
    toast({
      title: "Pagamento confirmado!",
      description: `Pedido ${createdOrderData?.order_number || ''} processado com sucesso.`,
    });
    navigate("/customer/orders");
  };

  const steps = [
    { number: 1, title: "Dados Pessoais", icon: ShoppingCart },
    { number: 2, title: "Entrega", icon: Truck },
    { number: 3, title: "Pagamento", icon: CreditCard },
    { number: 4, title: "PIX", icon: Shield }
  ];

  return (
    <div className="min-h-screen bg-background">
      {showHeader && <Header />}
      
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
            
            {/* Profile completion warning for logged-in users */}
            {user && (!profile?.phone || !profile?.cpf) && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-amber-800">Complete seu perfil</h3>
                      <p className="text-sm text-amber-700 mt-1">
                        Para uma experiência mais rápida, complete as informações do seu perfil. 
                        Os dados serão salvos automaticamente após a compra.
                      </p>
                      {!profile?.phone && !profile?.cpf && (
                        <p className="text-xs text-amber-600 mt-2">
                          Preencha telefone e CPF para que sejam salvos no seu perfil.
                        </p>
                      )}
                      {!profile?.phone && profile?.cpf && (
                        <p className="text-xs text-amber-600 mt-2">
                          Preencha seu telefone para que seja salvo no seu perfil.
                        </p>
                      )}
                      {profile?.phone && !profile?.cpf && (
                        <p className="text-xs text-amber-600 mt-2">
                          Preencha seu CPF para que seja salvo no seu perfil.
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Show PIX Payment if available */}
            {modernPixData ? (
              <div className="flex justify-center">
                <ModernPixPayment 
                  qrCode={modernPixData.qr_code}
                  qrCodeBase64={modernPixData.qr_code_base64}
                  amount={total}
                  paymentId={modernPixData.payment_id}
                  onPaymentConfirmed={handlePixPaymentConfirmed}
                />
              </div>
            ) : pixPaymentData ? (
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
                  {/* Shipping Method Selector */}
                  <ShippingMethodSelector
                    orderValue={subtotal}
                    zipCode={formData.zipCode}
                    weight={1} // Calculate this based on products if needed
                    selectedMethodId={selectedShippingMethod?.id}
                    onMethodChange={handleShippingMethodChange}
                    onFileUploaded={handleShippingFileUpload}
                  />
                  
                  {/* Address fields - only show if not using label method */}
                  {!isLabelMethod() && (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4" />
                        <Label className="text-base font-semibold">Endereço de Entrega</Label>
                      </div>
                      
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
                    </div>
                  )}
                  
                  {/* Label method info message */}
                  {isLabelMethod() && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-blue-800">Envio com Etiqueta</h4>
                          <p className="text-sm text-blue-700 mt-1">
                            Com esta modalidade de envio, não é necessário informar o endereço de entrega. 
                            {selectedShippingMethod?.requires_file && !shippingFile && (
                              <span className="block mt-1 font-medium">
                                Por favor, faça o upload da etiqueta de envio para continuar.
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
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

            {currentStep === 4 && !createdOrderData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Processando Pedido
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                    <p className="text-muted-foreground">
                      Criando seu pedido e validando dados...
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 4 && createdOrderData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Confirmação do Pedido
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Order Number Display */}
                    <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-5 h-5 text-green-600" />
                        <p className="text-sm font-semibold text-green-800">
                          Pedido criado com sucesso!
                        </p>
                      </div>
                      <p className="text-lg font-bold text-green-900">
                        Número do Pedido: {createdOrderData?.order_number || 'Carregando...'}
                      </p>
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm text-blue-700">
                        Clique no botão abaixo para gerar o código PIX e finalizar o pagamento.
                      </p>
                    </div>
                    
                    <div className="space-y-2 text-sm p-4 bg-muted/50 rounded-lg">
                      <p><strong>Nome:</strong> {formData.firstName} {formData.lastName}</p>
                      <p><strong>E-mail:</strong> {formData.email}</p>
                      <p><strong>Telefone:</strong> {formData.phone}</p>
                      {!isLabelMethod() ? (
                        <p><strong>Endereço:</strong> {formData.address}, {formData.number} {formData.complement && `- ${formData.complement}`}, {formData.neighborhood}, {formData.city} - {formData.state}</p>
                      ) : (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                          <p><strong>Entrega:</strong> Envio com Etiqueta</p>
                          {shippingFile && (
                            <p className="text-xs text-blue-600 mt-1">
                              ✅ Etiqueta anexada: {shippingFile.name}
                            </p>
                          )}
                        </div>
                      )}
                      <p><strong>Pagamento:</strong> PIX</p>
                      <p><strong>Total:</strong> {formatPrice(total)}</p>
                    </div>

                    <Button 
                      onClick={handleGeneratePixPayment} 
                      disabled={isProcessingPayment || !createdOrderId || !createdOrderData}
                      className="w-full"
                      size="lg"
                    >
                      {isProcessingPayment ? "Gerando PIX..." : "Gerar Código PIX"}
                    </Button>
                    
                    {(!createdOrderId || !createdOrderData) && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-md mt-2">
                        <p className="text-xs text-amber-700 text-center">
                          ⚠️ Dados do pedido não disponíveis. Por favor, volte e recrie o pedido.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}


                {/* Navigation Buttons */}
                <div className="flex justify-between">
                  {currentStep < 4 ? (
                    <>
                      <Button 
                        variant="outline" 
                        onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                        disabled={currentStep === 1}
                      >
                        Voltar
                      </Button>
                      
                      {currentStep < 3 ? (
                        <Button 
                          onClick={() => setCurrentStep(currentStep + 1)}
                          disabled={!canAdvanceToNextStep()}
                        >
                          Continuar
                        </Button>
                      ) : currentStep === 3 ? (
                        <Button 
                          onClick={handleSubmit}
                          disabled={isCreatingOrder || !canAdvanceToNextStep()}
                        >
                          {isCreatingOrder ? "Criando pedido..." : "Criar Pedido e Continuar"}
                        </Button>
                      ) : null}
                    </>
                  ) : null}
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
                    <span>
                      {selectedShippingMethod 
                        ? (shippingCost === 0 ? "GRÁTIS" : formatPrice(shippingCost))
                        : "A calcular"
                      }
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
      {pixModalData && (
        <PixPaymentModal
          isOpen={showPixModal}
          onClose={() => setShowPixModal(false)}
          qrCodeBase64={pixModalData.qrCodeBase64}
          qrCodeCopyPaste={pixModalData.qrCodeCopyPaste}
          paymentId={pixModalData.paymentId}
          amount={pixModalData.amount}
          onPaymentConfirmed={handlePixPaymentConfirmed}
        />
      )}

      {/* High Rotation Alert Modal */}
      <HighRotationAlert
        isOpen={showHighRotationAlert}
        onClose={() => setShowHighRotationAlert(false)}
        onConfirm={() => {
          setShowHighRotationAlert(false);
          processPixPayment();
        }}
      />
    </div>
  );
};

export default Checkout;