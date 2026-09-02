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
import { ShoppingCart, CreditCard, Truck, Shield, AlertTriangle, ArrowRight, ArrowLeft, CheckCircle2, Lock, Wallet, ChevronRight } from "lucide-react";
import pixIcon from "@/assets/pix-icon.png";
import { ShippingMethodSelector } from "@/components/ShippingMethodSelector";
import { HighRotationAlert } from '@/components/HighRotationAlert';
import BannerPrevisaoEnvio from "@/components/checkout/BannerPrevisaoEnvio";
import { useWallet } from "@/hooks/useWallet";
interface CheckoutProps {
  showHeader?: boolean;
  showFooter?: boolean;
  storeSlug?: string;
  resellerId?: string;
}
const Checkout = ({
  showHeader = true,
  showFooter = true,
  storeSlug,
  resellerId: propResellerId
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
  const [shippingLabelData, setShippingLabelData] = useState<any>(null);
  const [trackingCode, setTrackingCode] = useState("");
  const [confirmTrackingCode, setConfirmTrackingCode] = useState("");
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
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card' | 'wallet'>('pix');
  const [isPayingWithWallet, setIsPayingWithWallet] = useState(false);
  const [useWalletPartial, setUseWalletPartial] = useState(false);
  const { data: walletData } = useWallet();
  const walletSaldo = walletData?.saldo ?? 0;
  const [resellerId, setResellerId] = useState<string | null>(propResellerId || null);

  // Fetch reseller_id from reseller_stores if storeSlug is provided
  useEffect(() => {
    if (propResellerId) {
      setResellerId(propResellerId);
      return;
    }
    const fetchResellerId = async () => {
      if (!storeSlug) return;
      try {
        const { data, error } = await supabase
          .from("reseller_stores")
          .select("reseller_id")
          .eq("store_slug", storeSlug)
          .maybeSingle();
        if (data && !error) {
          setResellerId(data.reseller_id);
          console.log("Resolved reseller_id:", data.reseller_id, "for storeSlug:", storeSlug);
        }
      } catch (err) {
        console.error("Error resolving reseller_id for store:", err);
      }
    };
    fetchResellerId();
  }, [storeSlug, propResellerId]);

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

  // Restore pending step if returning from auth login
  useEffect(() => {
    const pendingStep = sessionStorage.getItem('checkout_pending_step');
    if (pendingStep) {
      sessionStorage.removeItem('checkout_pending_step');
      const stepNum = parseInt(pendingStep, 10);
      if (stepNum >= 1 && stepNum <= 3) {
        setCurrentStep(stepNum);
      }
    }
  }, []);

  const handleAdvanceStep = (targetStep: number) => {
    if (targetStep >= 3 && !user) {
      toast({
        title: "Login necessário",
        description: "Faça login para continuar com o pagamento.",
      });
      const currentUrl = window.location.pathname + window.location.search;
      sessionStorage.setItem('returnUrl', currentUrl);
      sessionStorage.setItem('checkout_pending_step', targetStep.toString());
      navigate('/auth?redirect=' + encodeURIComponent(currentUrl));
      return;
    }
    setCurrentStep(targetStep);
  };
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
        // Prefill with user profile data if not already entered by the user
        setFormData(prev => ({
          ...prev,
          email: prev.email || user.email || "",
          firstName: prev.firstName || profile?.first_name || "",
          lastName: prev.lastName || profile?.last_name || "",
          phone: prev.phone || profile?.phone || "",
          cpf: prev.cpf || profile?.cpf || ""
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

  const handleLabelProcessed = (data: any) => {
    setShippingLabelData(data);
    if (data?.trackingCode) {
      setTrackingCode(data.trackingCode);
      setConfirmTrackingCode(data.trackingCode);
    }
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
          const fileValid = selectedShippingMethod.requires_upload ? shippingFile : true;
          const trackingValid = trackingCode.trim() !== "" && trackingCode === confirmTrackingCode;
          return selectedShippingMethod && fileValid && trackingValid;
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

      // Validar etiqueta obrigatória
      if (isLabelMethod() && selectedShippingMethod?.requires_upload && !shippingFile) {
        toast({
          title: "Etiqueta obrigatória",
          description: "Por favor, anexe a etiqueta de envio antes de finalizar o pedido.",
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
        },
        reseller_id: resellerId || undefined,
        shippingLabel: shippingLabelData || undefined
      };
      console.log('Creating PIX payment via Edge Function...');
      const response = await createModernPixPayment(paymentRequest);
      console.log('PIX payment created successfully:', response);

      // Save tracking code in orders if it's a label method
      if (isLabelMethod() && trackingCode && response.order_id) {
        console.log('Saving tracking number/code in order:', response.order_id);
        const { error: trackingError } = await supabase
          .from('orders')
          .update({ 
            tracking_number: trackingCode,
            tracking_code: trackingCode
          })
          .eq('id', response.order_id);
        
        if (trackingError) {
          console.error('Error updating order tracking code:', trackingError);
        }

       // Upload shipping file if provided (legacy)
      if (shippingFile && !shippingLabelData && shippingFile.file && response.order_id) {
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
            if (dbError) console.error('Error saving shipping file to db:', dbError);
          }
        } catch (error) {
          console.error('Error in file upload process:', error);
        }
      } else if (shippingLabelData && response.order_id) {
        // Link the existing uploaded label file to the order
        try {
          // Extrair o nome original do arquivo (simulado em shippingFile.name)
          const fileName = shippingFile?.name || 'etiqueta.pdf';
          
          const { error: dbError } = await supabase.from('order_shipping_files').insert({
            order_id: response.order_id,
            file_name: fileName,
            file_path: shippingLabelData.filePath,
            file_size: shippingLabelData.fileSize || 0
          });
          
          if (dbError) console.error('Error saving shipping label to db:', dbError);
          
          // Move o arquivo de temp/ para a pasta do pedido? Podemos manter em temp/ ou mover depois.
          // Para simplicidade, manteremos como está e salvamos o path correto.
          
          // Atualiza o registro de auditoria para vincular ao order_id
          await (supabase as any).from('shipment_label_extractions')
            .update({ order_id: response.order_id })
            .eq('file_path', shippingLabelData.filePath);
            
        } catch (error) {
          console.error('Error linking shipping label:', error);
        }
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
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Você precisa fazer login para continuar com o pagamento.",
      });
      const currentUrl = window.location.pathname + window.location.search;
      sessionStorage.setItem('returnUrl', currentUrl);
      sessionStorage.setItem('checkout_pending_step', '3');
      navigate('/auth?redirect=' + encodeURIComponent(currentUrl));
      return;
    }
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
      } = await supabase.from('store_products').select('id, high_rotation').in('id', productIds);
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
  const handlePayWithWallet = async () => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Você precisa fazer login para pagar com o saldo da carteira.",
      });
      const currentUrl = window.location.pathname + window.location.search;
      sessionStorage.setItem('returnUrl', currentUrl);
      sessionStorage.setItem('checkout_pending_step', '3');
      navigate('/auth?redirect=' + encodeURIComponent(currentUrl));
      return;
    }
    if (walletSaldo < total) {
      toast({
        title: "Saldo insuficiente",
        description: `Seu saldo é ${formatPrice(walletSaldo)}. Faltam ${formatPrice(total - walletSaldo)}.`,
        variant: "destructive",
      });
      return;
    }
    setIsPayingWithWallet(true);
    try {
      // Validate CPF
      if (!validateCPF(formData.cpf)) {
        toast({ title: "CPF inválido", description: "Por favor, informe um CPF válido.", variant: "destructive" });
        return;
      }
      // Validate shipping label
      if (isLabelMethod()) {
        if (selectedShippingMethod?.requires_upload && !shippingFile) {
          toast({ title: "Etiqueta obrigatória", description: "Anexe a etiqueta de envio.", variant: "destructive" });
          return;
        }
        if (!trackingCode.trim() || trackingCode !== confirmTrackingCode) {
          toast({ title: "Código de rastreio inválido", description: "Por favor, preencha e confirme o código de rastreio da etiqueta.", variant: "destructive" });
          return;
        }
      }
      await saveUserDataAndAddress();
      // Create order first via edge function (same as PIX but we'll debit wallet)
      const orderItems = cartItems.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.price
      }));
      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-pix-payment', {
        body: {
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
          },
          payment_method: 'wallet',
          reseller_id: resellerId || null,
          shippingLabel: shippingLabelData || undefined
        },
      });
      if (orderError) throw orderError;
      const orderId = orderData?.order_id;
      if (!orderId) throw new Error('Pedido não criado');

      // Save tracking code in orders if it's a label method
      if (isLabelMethod() && trackingCode && orderId) {
        const { error: trackingError } = await supabase
          .from('orders')
          .update({ 
            tracking_number: trackingCode,
              tracking_code: trackingCode
          })
          .eq('id', orderId);
        
        if (trackingError) {
          console.error('Error updating order tracking code:', trackingError);
        }
      }

      // Upload shipping file if needed
      if (shippingFile?.file && !shippingLabelData && orderId) {
        try {
          console.log('Uploading shipping file for wallet order:', orderId);
          const fileExtension = shippingFile.file.name.split('.').pop();
          const fileName = `order_${orderId}_${Date.now()}.${fileExtension}`;
          const filePath = `${orderId}/${fileName}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('shipping-files')
            .upload(filePath, shippingFile.file);
            
          if (uploadError) {
            console.error('Error uploading shipping file for wallet order:', uploadError);
          } else {
            console.log('Shipping file uploaded successfully for wallet order:', uploadData);
            const { error: dbError } = await supabase.from('order_shipping_files').insert({
              order_id: orderId,
              file_name: shippingFile.file.name,
              file_path: filePath,
              file_size: shippingFile.file.size
            });
            if (dbError) {
              console.error('Error saving shipping file reference for wallet order:', dbError);
            }
          }
        } catch (uploadError) {
          console.error('Error in shipping file upload process for wallet:', uploadError);
        }
      } else if (shippingLabelData && orderId) {
        try {
          const fileName = shippingFile?.name || 'etiqueta.pdf';
          const { error: dbError } = await supabase.from('order_shipping_files').insert({
            order_id: orderId,
            file_name: fileName,
            file_path: shippingLabelData.filePath,
            file_size: shippingFile?.size || 0
          });
          
          if (dbError) console.error('Error saving shipping label to db:', dbError);
          
          await (supabase as any).from('shipment_label_extractions')
            .update({ order_id: orderId })
            .eq('file_path', shippingLabelData.filePath);
            
        } catch (error) {
          console.error('Error linking shipping label:', error);
        }
      }
      
      // Debit wallet
      const { data: debitResult, error: debitError } = await supabase.rpc('debitar_carteira', {
        p_user_id: user!.id,
        p_valor: parseFloat(total.toFixed(2)),
        p_descricao: `Pagamento Pedido ${orderData?.order_number || ''}`,
        p_referencia_tipo: 'pedido',
        p_referencia_id: orderId,
      });
      if (debitError) throw debitError;
      const result = debitResult as any;
      if (!result?.success) throw new Error(result?.error || 'Erro ao debitar saldo');
      // Confirmar pedido via edge function (service role bypassa RLS)
      const { error: confirmError } = await supabase.functions.invoke('complete-wallet-payment', {
        body: { order_id: orderId },
      });
      
      if (confirmError) {
        let errorMessage = confirmError.message;
        try {
          if ('context' in confirmError && confirmError.context) {
            const errBody = await (confirmError.context as any).json();
            errorMessage = errBody.details || errBody.error || errorMessage;
            if (typeof errorMessage === 'object') {
              errorMessage = JSON.stringify(errorMessage);
            }
          }
        } catch (_) {}
        throw new Error(errorMessage);
      }
      clearCart();
      toast({ title: "Pedido confirmado!", description: "Pagamento realizado com saldo da carteira." });
      navigate("/minha-conta/pedidos");
    } catch (err: any) {
      console.error('Wallet payment error:', err);
      toast({ title: "Erro no pagamento", description: err.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setIsPayingWithWallet(false);
    }
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
  return (
    <div className="min-h-screen bg-background relative flex flex-col">
      {showHeader && <Header />}
      
      <main className="container mx-auto px-4 py-6 sm:py-8 flex-1 pb-32 sm:pb-36">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-4 tracking-tight">Finalizar Compra</h1>
          
          {/* Desktop Stepper */}
          <div className="hidden md:flex items-center justify-between mb-8 bg-card border rounded-xl p-4 shadow-sm">
            {steps.slice(0, 3).map((step, index) => (
              <div key={step.number} className="flex items-center flex-1 last:flex-none">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all ${
                    currentStep === step.number 
                      ? 'bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-sm' 
                      : currentStep > step.number 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-muted text-muted-foreground'
                  }`}>
                    {currentStep > step.number ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground font-medium">Etapa {step.number}</span>
                    <span className={`text-sm font-semibold ${currentStep >= step.number ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {step.title}
                    </span>
                  </div>
                </div>
                {index < 2 && (
                  <div className="flex-1 mx-4 h-0.5 bg-border overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: currentStep > step.number ? '100%' : '0%' }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Mobile Stepper */}
          <div className="md:hidden mb-6 bg-card border rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                Etapa {currentStep} de 3
              </span>
              <span className="text-sm font-bold text-foreground">
                {steps.find(s => s.number === currentStep)?.title}
              </span>
            </div>
            <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
              <div 
                className="bg-primary h-full transition-all duration-300 ease-out" 
                style={{ width: `${(Math.min(currentStep, 3) / 3) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          {/* Checkout Form Main Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Profile completion warning for logged-in users */}
            {user && (!profile?.phone || !profile?.cpf) && (
              <Card className="border-amber-200 bg-amber-50/80 shadow-sm rounded-xl">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-amber-900">Complete seu perfil</h3>
                      <p className="text-sm text-amber-800 mt-1">
                        Para uma experiência mais rápida, complete as informações do seu perfil. 
                        Os dados serão salvos automaticamente após a compra.
                      </p>
                      {!profile?.phone && !profile?.cpf && (
                        <p className="text-xs text-amber-700 mt-2 font-medium">
                          Preencha telefone e CPF para que sejam salvos no seu perfil.
                        </p>
                      )}
                      {!profile?.phone && profile?.cpf && (
                        <p className="text-xs text-amber-700 mt-2 font-medium">
                          Preencha seu telefone para que seja salvo no seu perfil.
                        </p>
                      )}
                      {profile?.phone && !profile?.cpf && (
                        <p className="text-xs text-amber-700 mt-2 font-medium">
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
                <ModernPixPayment qrCode={modernPixData.qr_code} qrCodeBase64={modernPixData.qr_code_base64} amount={total} paymentId={modernPixData.payment_id} onPaymentConfirmed={handlePixPaymentConfirmed} />
              </div>
            ) : pixPaymentData ? (
              <div className="flex justify-center">
                <PixPayment paymentData={pixPaymentData} onPaymentConfirmed={handlePixPaymentConfirmed} />
              </div>
            ) : (
              <>
                {/* Regular checkout steps */}
                {currentStep === 1 && (
                  <Card className="shadow-sm rounded-xl border">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-lg font-bold">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg">
                          <ShoppingCart className="w-5 h-5" />
                        </div>
                        Dados Pessoais
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="email" className="font-semibold text-sm">E-mail *</Label>
                        <Input id="email" type="email" value={formData.email} onChange={e => handleInputChange("email", e.target.value)} placeholder="seu@email.com" className="mt-1" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName" className="font-semibold text-sm">Nome *</Label>
                          <Input id="firstName" value={formData.firstName} onChange={e => handleInputChange("firstName", e.target.value)} placeholder="Seu nome" className="mt-1" />
                        </div>
                        <div>
                          <Label htmlFor="lastName" className="font-semibold text-sm">Sobrenome</Label>
                          <Input id="lastName" value={formData.lastName} onChange={e => handleInputChange("lastName", e.target.value)} placeholder="Seu sobrenome" className="mt-1" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="phone" className="font-semibold text-sm">Telefone</Label>
                          <Input id="phone" value={formData.phone} onChange={e => handleInputChange("phone", e.target.value)} placeholder="+55 (11) 99999-9999" maxLength={19} className="mt-1" />
                        </div>
                        <div>
                          <Label htmlFor="cpf" className="font-semibold text-sm">CPF *</Label>
                          <Input id="cpf" value={formData.cpf} onChange={e => handleInputChange("cpf", e.target.value)} placeholder="000.000.000-00" maxLength={14} className="mt-1" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {currentStep === 2 && (
                  <Card className="shadow-sm rounded-xl border">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-lg font-bold">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg">
                          <Truck className="w-5 h-5" />
                        </div>
                        Endereço de Entrega
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ShippingMethodSelector 
                        orderValue={subtotal} 
                        zipCode={formData.zipCode} 
                        weight={1} 
                        selectedMethodId={selectedShippingMethod?.id} 
                        onMethodChange={handleShippingMethodChange} 
                        onFileUploaded={handleShippingFileUpload} 
                        onLabelProcessed={handleLabelProcessed}
                      />
                      
                      {isLabelMethod() && (
                        <div className="space-y-4 pt-4 border-t">
                          <div className="space-y-2">
                            <Label htmlFor="trackingCode" className="font-semibold text-sm">
                              Código de Rastreio da Etiqueta *
                            </Label>
                            <Input
                              id="trackingCode"
                              value={trackingCode}
                              onChange={e => setTrackingCode(e.target.value.toUpperCase())}
                              placeholder="Informe o código de rastreio da etiqueta"
                            />
                            <p className="text-xs text-muted-foreground">
                              Código de rastreio que consta na etiqueta para rastreabilidade em caso de devolução.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="confirmTrackingCode" className="font-semibold text-sm">
                              Confirmar Código de Rastreio *
                            </Label>
                            <Input
                              id="confirmTrackingCode"
                              value={confirmTrackingCode}
                              onChange={e => setConfirmTrackingCode(e.target.value.toUpperCase())}
                              placeholder="Confirme o código de rastreio"
                            />
                          </div>

                          {trackingCode && confirmTrackingCode && trackingCode !== confirmTrackingCode && (
                            <p className="text-sm font-medium text-destructive">
                              ⚠️ Os códigos de rastreio informados não são idênticos.
                            </p>
                          )}
                        </div>
                      )}

                      {!isLabelMethod() && (
                        <div className="space-y-4 pt-4 border-t">
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-primary" />
                            <Label className="text-base font-semibold">Endereço de Entrega</Label>
                          </div>
                          
                          <div>
                            <Label htmlFor="zipCode">CEP</Label>
                            <Input id="zipCode" value={formData.zipCode} onChange={e => handleInputChange("zipCode", e.target.value)} placeholder="00000-000" maxLength={9} disabled={isLoadingCep} />
                            {isLoadingCep && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Buscando endereço...
                              </p>
                            )}
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
                        </div>
                      )}
                      
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
                  <Card className="shadow-sm rounded-xl border">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-lg font-bold">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg">
                          <CreditCard className="w-5 h-5" />
                        </div>
                        Forma de Pagamento
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {user && walletSaldo > 0 && (
                        <div 
                          className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${paymentMethod === 'wallet' ? 'border-emerald-600 bg-emerald-50/50 shadow-sm' : 'border-muted hover:border-primary/50'}`}
                          onClick={() => setPaymentMethod('wallet')}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-xl shrink-0">
                              💰
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold">Saldo da Carteira</h4>
                              <p className="text-sm text-muted-foreground">
                                Disponível: {formatPrice(walletSaldo)}
                              </p>
                              {walletSaldo >= total ? (
                                <p className="text-xs text-emerald-600 font-medium mt-0.5">✅ Saldo suficiente para este pedido</p>
                              ) : (
                                <p className="text-xs text-amber-600 font-medium mt-0.5">⚠️ Saldo insuficiente. Faltam {formatPrice(total - walletSaldo)}</p>
                              )}
                            </div>
                            <input type="radio" checked={paymentMethod === 'wallet'} onChange={() => setPaymentMethod('wallet')} className="w-4 h-4 text-emerald-600" />
                          </div>
                        </div>
                      )}

                      <div 
                        className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${paymentMethod === 'pix' ? 'border-primary bg-primary/5 shadow-sm' : 'border-muted hover:border-primary/50'}`}
                        onClick={() => setPaymentMethod('pix')}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center text-xl shrink-0">
                            💠
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold">PIX</h4>
                            <p className="text-sm text-muted-foreground">
                              Pagamento instantâneo e seguro
                            </p>
                          </div>
                          <input type="radio" checked={paymentMethod === 'pix'} onChange={() => setPaymentMethod('pix')} className="w-4 h-4" />
                        </div>
                      </div>

                      <BannerPrevisaoEnvio />
                    </CardContent>
                  </Card>
                )}

                {currentStep === 4 && (
                  <Card className="shadow-sm rounded-xl border">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-lg font-bold">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg">
                          <Shield className="w-5 h-5" />
                        </div>
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
                        {!isLabelMethod() ? (
                          <p><strong>Endereço:</strong> {formData.address}, {formData.number} {formData.complement && `- ${formData.complement}`}, {formData.neighborhood}, {formData.city} - {formData.state}</p>
                        ) : (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                            <p><strong>Entrega:</strong> Envio com Etiqueta</p>
                            {shippingFile && (
                              <p className="text-xs text-blue-600 mt-1">
                                Etiqueta anexada: {shippingFile.name}
                              </p>
                            )}
                          </div>
                        )}
                        <p><strong>Pagamento:</strong> {paymentMethod === 'pix' ? 'PIX' : 'Saldo da Carteira'}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Inline Card Navigation Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => handleAdvanceStep(Math.max(1, currentStep - 1))} 
                    disabled={currentStep === 1 || isProcessingPayment || isPayingWithWallet}
                    className="gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar
                  </Button>
                  
                  {currentStep < 3 && (
                    <Button 
                      onClick={() => handleAdvanceStep(currentStep + 1)} 
                      disabled={!canAdvanceToNextStep()} 
                      className="bg-[#3fc356] hover:bg-[#35a849] gap-2 text-white font-semibold shadow-sm"
                    >
                      Continuar
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="space-y-6">
            <Card className="shadow-sm rounded-xl border">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold">Resumo do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cartItems.map(item => (
                  <div key={item.productId} className="flex gap-3">
                    <img src={item.productImage} alt={item.productName} className="w-16 h-16 object-cover rounded-lg border shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{item.productName}</h4>
                      {item.variants && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(item.variants).map(([key, value]) => (
                            <Badge key={key} variant="secondary" className="text-[10px] px-1.5 py-0">
                              {value}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">Qtd: {item.quantity}</p>
                      <p className="font-semibold text-sm mt-0.5">{formatPrice(item.price)}</p>
                    </div>
                  </div>
                ))}
                
                <Separator />
                
                {/* Coupon */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input placeholder="Código do cupom" value={couponCode} onChange={e => setCouponCode(e.target.value)} className="text-sm" />
                    <Button variant="outline" onClick={applyCoupon} className="shrink-0">
                      Aplicar
                    </Button>
                  </div>
                </div>
                
                <Separator />
                
                {/* Totals */}
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-medium text-foreground">{formatPrice(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Desconto</span>
                      <span>-{formatPrice(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-muted-foreground">
                    <span>Frete</span>
                    <span className="font-medium text-foreground">
                      {selectedShippingMethod ? (shippingCost === 0 ? <span className="text-emerald-600 font-semibold">GRÁTIS</span> : formatPrice(shippingCost)) : "A calcular"}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg pt-1">
                    <span>Total</span>
                    <span className="text-primary">{formatPrice(total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      {showFooter && <Footer />}

      {/* Floating Action Footer Bar (Always Fixed at Bottom) */}
      {!modernPixData && !pixPaymentData && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.12)] p-3 sm:p-4">
          <div className="container mx-auto max-w-6xl flex items-center justify-between gap-3 sm:gap-4">
            {/* Left: Total Summary */}
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total a pagar</span>
              <div className="flex items-baseline gap-1.5 sm:gap-2">
                <span className="text-lg sm:text-2xl font-extrabold text-foreground tracking-tight">{formatPrice(total)}</span>
                {shippingCost === 0 && selectedShippingMethod && (
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-[10px] sm:text-xs font-semibold px-1.5 py-0">
                    Frete Grátis
                  </Badge>
                )}
              </div>
            </div>

            {/* Right: Floating Actions */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => handleAdvanceStep(Math.max(1, currentStep - 1))}
                  disabled={isProcessingPayment || isPayingWithWallet}
                  className="px-3 sm:px-4 text-xs sm:text-sm font-medium h-10 sm:h-11 border-muted-foreground/30"
                >
                  <ArrowLeft className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Voltar</span>
                </Button>
              )}

              {currentStep < 3 ? (
                <Button
                  onClick={() => handleAdvanceStep(currentStep + 1)}
                  disabled={!canAdvanceToNextStep()}
                  size="default"
                  className="bg-[#3fc356] hover:bg-[#35a849] text-white font-bold px-4 sm:px-6 h-10 sm:h-11 shadow-md transition-all text-xs sm:text-sm rounded-lg"
                >
                  <span>Continuar</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              ) : paymentMethod === 'pix' ? (
                <Button
                  onClick={handleGeneratePix}
                  disabled={isProcessingPayment || !canAdvanceToNextStep()}
                  size="default"
                  className="bg-[#3fc356] hover:bg-[#35a849] text-white font-bold px-4 sm:px-6 h-10 sm:h-11 shadow-md transition-all text-xs sm:text-sm rounded-lg"
                >
                  {isProcessingPayment ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Gerando PIX...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-4 h-4" />
                      Concluir Pagamento via PIX
                    </span>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handlePayWithWallet}
                  disabled={isPayingWithWallet || walletSaldo < total || !canAdvanceToNextStep()}
                  size="default"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 sm:px-6 h-10 sm:h-11 shadow-md transition-all text-xs sm:text-sm rounded-lg"
                >
                  {isPayingWithWallet ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Processando...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Wallet className="w-4 h-4" />
                      Pagar com Saldo
                    </span>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PIX Payment Modal */}
      {pixModalData && <PixPaymentModal isOpen={showPixModal} onClose={() => setShowPixModal(false)} qrCodeBase64={pixModalData.qrCodeBase64} qrCodeCopyPaste={pixModalData.qrCodeCopyPaste} paymentId={pixModalData.paymentId} amount={pixModalData.amount} onPaymentConfirmed={handlePixPaymentConfirmed} />}

      {/* High Rotation Alert Modal */}
      <HighRotationAlert 
        isOpen={showHighRotationAlert} 
        onClose={() => setShowHighRotationAlert(false)} 
        allowContinue={false}
      />
    </div>
  );
};
export default Checkout;