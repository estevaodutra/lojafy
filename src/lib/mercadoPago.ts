import { supabase } from "@/integrations/supabase/client";

export interface PixPaymentRequest {
  description: string;
  transaction_amount: number;
  payer: {
    email: string;
    first_name: string;
    last_name: string;
    identification: {
      type: string;
      number: string;
    };
  };
}

export interface PixPaymentResponse {
  id: number;
  status: string;
  status_detail: string;
  qr_code: string;
  qr_code_base64: string;
  point_of_interaction: {
    transaction_data: {
      qr_code: string;
      qr_code_base64: string;
    };
  };
}

export async function createPixPayment(paymentData: PixPaymentRequest): Promise<PixPaymentResponse> {
  try {
    // Step 1: Get Mercado Pago access token from protected Edge Function
    console.log('Getting Mercado Pago access token...');
    
    const { data: tokenData, error: tokenError } = await supabase.functions.invoke('get-mercado-pago-token', {
      body: {}
    });

    if (tokenError) {
      console.error('Error getting access token:', tokenError);
      throw new Error('Failed to get access token');
    }

    if (!tokenData?.access_token) {
      console.error('No access token returned');
      throw new Error('No access token received');
    }

    const accessToken = tokenData.access_token;
    console.log('Access token retrieved successfully');

    // Step 2: Create PIX payment via Mercado Pago API
    console.log('Creating PIX payment with Mercado Pago...');

    const idempotencyKey = crypto.randomUUID();
    console.log('Generated idempotency key:', idempotencyKey);

    const requestBody = {
      description: paymentData.description,
      transaction_amount: paymentData.transaction_amount,
      payment_method_id: "pix",
      payer: paymentData.payer
    };

    console.log('Payment request body:', requestBody);

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(requestBody)
    });

    const responseData = await response.json();
    console.log('Mercado Pago response:', {
      status: response.status,
      data: responseData
    });

    if (!response.ok) {
      console.error('Mercado Pago API error:', responseData);
      throw new Error(`Mercado Pago API error: ${responseData.message || 'Unknown error'}`);
    }

    // Extract QR code data
    const qrCode = responseData.point_of_interaction?.transaction_data?.qr_code || '';
    const qrCodeBase64 = responseData.point_of_interaction?.transaction_data?.qr_code_base64 || '';

    console.log('PIX payment created successfully:', {
      id: responseData.id,
      status: responseData.status,
      qr_code_available: !!qrCode,
      qr_code_base64_available: !!qrCodeBase64
    });

    return {
      id: responseData.id,
      status: responseData.status,
      status_detail: responseData.status_detail,
      qr_code: qrCode,
      qr_code_base64: qrCodeBase64,
      point_of_interaction: responseData.point_of_interaction
    };

  } catch (error) {
    console.error('Error creating PIX payment:', error);
    throw error;
  }
}