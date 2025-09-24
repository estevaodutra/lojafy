import { supabase } from "@/integrations/supabase/client";

export interface PixPaymentRequest {
  amount: number;
  description: string;
  payer: {
    email: string;
    firstName: string;
    lastName: string;
    cpf: string;
  };
  orderItems?: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
  shippingAddress?: any;
}

export interface PixPaymentResponse {
  order_id: string;
  payment_id: string;
  status: string;
  qr_code: string;
  qr_code_base64: string;
  ticket_url?: string;
  expires_at: string;
}

export interface N8NPixPaymentResponse {
  qrCodeBase64: string;
  qrCodeCopyPaste: string;
  paymentId: string;
}

export async function createModernPixPayment(paymentData: PixPaymentRequest): Promise<PixPaymentResponse> {
  try {
    console.log('Starting PIX payment creation...');
    
    // Use the existing create-pix-payment Edge Function
    const response = await supabase.functions.invoke('create-pix-payment', {
      body: {
        amount: paymentData.amount,
        description: paymentData.description,
        payer: paymentData.payer,
        orderItems: paymentData.orderItems || [],
        shippingAddress: paymentData.shippingAddress || null
      }
    });

    if (response.error) {
      console.error('Error creating PIX payment:', response.error);
      
      // Melhor tratamento de erros do Edge Function
      if (response.error.message) {
        // Tentar fazer parse do corpo do erro para obter informações detalhadas
        try {
          const errorBody = JSON.parse(response.error.message);
          
          if (errorBody.code === 'WEBHOOK_NOT_REGISTERED') {
            throw new Error(`Webhook N8N não está ativo: ${errorBody.message}`);
          } else if (errorBody.error) {
            throw new Error(errorBody.error);
          }
        } catch (parseError) {
          // Se não conseguir fazer parse, usar a mensagem original
          console.log('Erro não é JSON válido, usando mensagem original');
        }
        
        throw new Error(response.error.message);
      }
      
      throw new Error('Failed to create PIX payment');
    }

    console.log('PIX payment created successfully:', response.data);

    // Edge Function already processed the N8N array response
    return {
      order_id: response.data.order_id,
      payment_id: response.data.payment_id,
      status: response.data.status,
      qr_code: response.data.qr_code,
      qr_code_base64: response.data.qr_code_base64,
      ticket_url: response.data.ticket_url,
      expires_at: response.data.expires_at
    };

  } catch (error) {
    console.error('Error creating PIX payment:', error);
    
    // Log detalhes completos do erro para debugging
    if (error.details) {
      console.error('Error details:', error.details);
    }
    
    throw error;
  }
}