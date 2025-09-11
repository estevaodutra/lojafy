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
  payment_id: string;
  status: string;
  qr_code: string;
  qr_code_base64: string;
  ticket_url?: string;
  expires_at: string;
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
      throw new Error(response.error.message || 'Failed to create PIX payment');
    }

    console.log('PIX payment created successfully:', response.data);

    return {
      payment_id: response.data.payment_id,
      status: response.data.status,
      qr_code: response.data.qr_code,
      qr_code_base64: response.data.qr_code_base64,
      ticket_url: response.data.ticket_url,
      expires_at: response.data.expires_at
    };

  } catch (error) {
    console.error('Error creating PIX payment:', error);
    throw error;
  }
}