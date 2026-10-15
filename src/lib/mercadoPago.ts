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
  reseller_id?: string;
  shippingLabel?: any;
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
        shippingAddress: paymentData.shippingAddress || null,
        reseller_id: paymentData.reseller_id || null,
        shippingLabel: paymentData.shippingLabel || null,
        metadata: { platform: 'lojafy' }
      }
    });

    if (response.error) {
      let errorMsg = response.error.message || 'Falha ao processar pagamento PIX';

      // Tentar extrair o corpo do erro HTTP retornado pela Edge Function
      if ('context' in response.error && (response.error as any).context) {
        try {
          const ctx = (response.error as any).context;
          const cloned = ctx.clone ? ctx.clone() : ctx;
          const errorBody = await cloned.json();
          if (errorBody?.error) {
            errorMsg = errorBody.error;
          } else if (errorBody?.message) {
            errorMsg = errorBody.message;
          }
        } catch (_) {
          try {
            const rawText = await (response.error as any).context.text();
            if (rawText && !rawText.includes('<html>')) {
              errorMsg = rawText;
            }
          } catch (_) {}
        }
      }

      if (errorMsg.includes('WEBHOOK_NOT_REGISTERED')) {
        throw new Error(`Webhook N8N não está ativo. Entre em contato com o suporte.`);
      }

      throw new Error(errorMsg);
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