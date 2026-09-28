export interface WebhookEventMeta {
  eventType: string;
  category: 'users' | 'orders' | 'cart' | 'catalog' | 'finance' | 'subscriptions' | 'academy' | 'support';
  title: string;
  description: string;
  status: 'production' | 'ready' | 'planned';
  samplePayload: Record<string, any>;
}

export const WEBHOOK_EVENTS_CATALOG: WebhookEventMeta[] = [
  // ── Eventos de Pedidos e Vendas (conforme layout) ───────────────────────────
  {
    eventType: 'order.boleto_generated',
    category: 'orders',
    title: 'Boleto gerado',
    description: 'Disparado quando um boleto bancário é gerado para o pedido.',
    status: 'ready',
    samplePayload: {
      event: 'order.boleto_generated',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        order_id: 'b6e82845-f09b-4389-bd6b-80fc47849e7b',
        order_number: 'LOJ-10892',
        total_amount: 199.90,
        boleto_url: 'https://bank.com/boleto/123456',
        boleto_barcode: '34191.79001 01043.510047 91020.150008 1 90000000019990',
        customer: {
          name: 'João Silva',
          email: 'joao.silva@exemplo.com',
          phone: '(11) 98765-4321'
        }
      }
    }
  },
  {
    eventType: 'order.pix_generated',
    category: 'orders',
    title: 'Pix gerado',
    description: 'Disparado quando uma cobrança PIX é gerada com o QR Code e código copia e cola.',
    status: 'ready',
    samplePayload: {
      event: 'order.pix_generated',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        order_id: 'b6e82845-f09b-4389-bd6b-80fc47849e7b',
        order_number: 'LOJ-10892',
        total_amount: 199.90,
        pix_qr_code: '00020101021226870014br.gov.bcb.pix2565...',
        expires_at: '2026-09-28T16:30:00.000Z',
        customer: {
          name: 'João Silva',
          email: 'joao.silva@exemplo.com'
        }
      }
    }
  },
  {
    eventType: 'cart.abandoned',
    category: 'cart',
    title: 'Carrinho abandonado',
    description: 'Disparado quando um cliente inicia o checkout, insere dados de contato mas não conclui.',
    status: 'ready',
    samplePayload: {
      event: 'cart.abandoned',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        customer_email: 'maria@exemplo.com',
        customer_phone: '(11) 97777-6666',
        customer_name: 'Maria Oliveira',
        items: [{ product_name: 'Relógio Smart', unit_price: 149.00, quantity: 1 }],
        total_amount: 149.00,
        checkout_recovery_url: 'https://lojafy.app/checkout?cart=abc123'
      }
    }
  },
  {
    eventType: 'order.payment_failed',
    category: 'orders',
    title: 'Compra recusada',
    description: 'Disparado quando a tentativa de pagamento do cliente é recusada pela adquirente/banco.',
    status: 'ready',
    samplePayload: {
      event: 'order.payment_failed',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        order_id: 'b6e82845-f09b-4389-bd6b-80fc47849e7b',
        order_number: 'LOJ-10892',
        reason: 'Cartão não autorizado pela emissora',
        total_amount: 199.90,
        customer: {
          name: 'Carlos Mendes',
          email: 'carlos@exemplo.com',
          phone: '(11) 98888-7777'
        }
      }
    }
  },
  {
    eventType: 'order.paid',
    category: 'orders',
    title: 'Compra aprovada (Pedido pago)',
    description: 'Disparado imediatamente quando o pagamento do pedido é confirmado (Mercado Pago, PIX, Carteira).',
    status: 'production',
    samplePayload: {
      event: 'order.paid',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        order_id: 'b6e82845-f09b-4389-bd6b-80fc47849e7b',
        order_number: 'LOJ-10892',
        total_amount: 199.90,
        payment_method: 'pix',
        customer: {
          user_id: 'c8a32a68-7b9e-4b68-80f4-526bf764f691',
          email: 'joao.silva@exemplo.com',
          name: 'João Silva',
          phone: '(11) 98765-4321'
        },
        reseller: {
          user_id: '45d2e091-...',
          store_name: 'Minha Loja VIP'
        },
        items: [
          {
            product_id: '92ba...',
            quantity: 1,
            unit_price: 199.90,
            product_name: 'Camisa Polo Premium'
          }
        ]
      }
    }
  },
  {
    eventType: 'order.updated',
    category: 'orders',
    title: 'Pedido atualizado',
    description: 'Disparado quando ocorrem alterações cadastrais, de endereço ou status no pedido.',
    status: 'ready',
    samplePayload: {
      event: 'order.updated',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        order_id: 'b6e82845-f09b-4389-bd6b-80fc47849e7b',
        order_number: 'LOJ-10892',
        status: 'em_separacao',
        previous_status: 'pago'
      }
    }
  },
  {
    eventType: 'order.shipped',
    category: 'orders',
    title: 'Pedido despachado / enviado',
    description: 'Disparado quando o código de rastreamento é anexado e o pedido é expedido pelo fornecedor.',
    status: 'ready',
    samplePayload: {
      event: 'order.shipped',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        order_id: 'b6e82845-f09b-4389-bd6b-80fc47849e7b',
        order_number: 'LOJ-10892',
        tracking_number: 'BR123456789BR',
        carrier: 'Correios Sedex'
      }
    }
  },
  {
    eventType: 'order.delivered',
    category: 'orders',
    title: 'Pedido entregue',
    description: 'Disparado quando a transportadora confirma a entrega ao cliente final.',
    status: 'ready',
    samplePayload: {
      event: 'order.delivered',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        order_id: 'b6e82845-f09b-4389-bd6b-80fc47849e7b',
        order_number: 'LOJ-10892',
        delivered_at: '2026-09-28T16:00:00.000Z'
      }
    }
  },
  {
    eventType: 'order.canceled',
    category: 'orders',
    title: 'Pedido cancelado',
    description: 'Disparado quando o pedido é cancelado na plataforma.',
    status: 'ready',
    samplePayload: {
      event: 'order.canceled',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        order_id: 'b6e82845-f09b-4389-bd6b-80fc47849e7b',
        order_number: 'LOJ-10892',
        reason: 'Cancelado pelo cliente'
      }
    }
  },
  {
    eventType: 'order.refunded',
    category: 'orders',
    title: 'Reembolso',
    description: 'Disparado quando ocorre um reembolso (estorno total ou parcial) para o comprador.',
    status: 'ready',
    samplePayload: {
      event: 'order.refunded',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        order_id: 'b6e82845-f09b-4389-bd6b-80fc47849e7b',
        order_number: 'LOJ-10892',
        refund_amount: 199.90,
        refund_type: 'total'
      }
    }
  },
  {
    eventType: 'order.chargeback',
    category: 'orders',
    title: 'Chargeback',
    description: 'Disparado quando o titular do cartão contesta a compra junto à operadora.',
    status: 'ready',
    samplePayload: {
      event: 'order.chargeback',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        order_id: 'b6e82845-f09b-4389-bd6b-80fc47849e7b',
        order_number: 'LOJ-10892',
        chargeback_amount: 199.90,
        status: 'em_disputa'
      }
    }
  },

  // ── Eventos de Usuários & Contas ───────────────────────────────────────────
  {
    eventType: 'user.created',
    category: 'users',
    title: 'Usuário criado',
    description: 'Disparado imediatamente quando um novo usuário se cadastra na plataforma (cliente, revendedor, fornecedor).',
    status: 'production',
    samplePayload: {
      event: 'user.created',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        user_id: 'c8a32a68-7b9e-4b68-80f4-526bf764f691',
        email: 'joao.silva@exemplo.com',
        name: 'João Silva',
        phone: '(11) 98765-4321',
        role: 'customer',
        origin: {
          type: 'frontend',
          store_id: null,
          store_name: null
        },
        created_at: '2026-09-28T16:00:00.000Z'
      }
    }
  },
  {
    eventType: 'user.inactive.7days',
    category: 'users',
    title: 'Usuário inativo (7 dias)',
    description: 'Disparado automaticamente quando um usuário fica 7 dias sem acessar a plataforma.',
    status: 'production',
    samplePayload: {
      event: 'user.inactive.7days',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        user_id: 'c8a32a68-7b9e-4b68-80f4-526bf764f691',
        email: 'joao.silva@exemplo.com',
        name: 'João Silva',
        days_inactive: 7
      }
    }
  },
  {
    eventType: 'user.inactive.15days',
    category: 'users',
    title: 'Usuário inativo (15 dias)',
    description: 'Disparado automaticamente quando um usuário fica 15 dias sem acessar.',
    status: 'production',
    samplePayload: {
      event: 'user.inactive.15days',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        user_id: 'c8a32a68-7b9e-4b68-80f4-526bf764f691',
        email: 'joao.silva@exemplo.com',
        name: 'João Silva',
        days_inactive: 15
      }
    }
  },
  {
    eventType: 'user.inactive.30days',
    category: 'users',
    title: 'Usuário inativo (30 dias)',
    description: 'Disparado automaticamente quando um usuário fica 30 dias sem acessar.',
    status: 'production',
    samplePayload: {
      event: 'user.inactive.30days',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        user_id: 'c8a32a68-7b9e-4b68-80f4-526bf764f691',
        email: 'joao.silva@exemplo.com',
        name: 'João Silva',
        days_inactive: 30
      }
    }
  },

  // ── Eventos de Assinaturas ──────────────────────────────────────────────────
  {
    eventType: 'subscription.canceled',
    category: 'subscriptions',
    title: 'Assinatura cancelada',
    description: 'Disparado quando a assinatura do plano é cancelada pelo usuário ou pelo lojista.',
    status: 'ready',
    samplePayload: {
      event: 'subscription.canceled',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        subscription_id: 'sub_89234',
        user_id: '45d2e091-...',
        plan_name: 'Plano Pro VIP',
        reason: 'Cancelamento solicitado'
      }
    }
  },
  {
    eventType: 'subscription.past_due',
    category: 'subscriptions',
    title: 'Assinatura atrasada',
    description: 'Disparado quando a renovação periódica falha e a assinatura entra em período de carência/inadimplência.',
    status: 'ready',
    samplePayload: {
      event: 'subscription.past_due',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        subscription_id: 'sub_89234',
        user_id: '45d2e091-...',
        amount_due: 99.00,
        days_past_due: 3
      }
    }
  },
  {
    eventType: 'subscription.renewed',
    category: 'subscriptions',
    title: 'Assinatura renovada',
    description: 'Disparado quando o pagamento da mensalidade/anuidade recorrente é processado com êxito.',
    status: 'ready',
    samplePayload: {
      event: 'subscription.renewed',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        subscription_id: 'sub_89234',
        user_id: '45d2e091-...',
        paid_amount: 99.00,
        next_billing_date: '2026-10-28T16:00:00.000Z'
      }
    }
  },

  // ── Outros Eventos Relevantes ───────────────────────────────────────────────
  {
    eventType: 'withdrawal.requested',
    category: 'finance',
    title: 'Solicitação de saque',
    description: 'Disparado quando um revendedor ou fornecedor solicita retirada de saldo da carteira.',
    status: 'ready',
    samplePayload: {
      event: 'withdrawal.requested',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        withdrawal_id: 'with_77',
        user_id: '45d2e091-...',
        amount: 500.00,
        pix_key: '11999998888'
      }
    }
  },
  {
    eventType: 'course.enrolled',
    category: 'academy',
    title: 'Aluno matriculado em curso',
    description: 'Disparado quando um usuário ganha matrícula em um treinamento da Lojafy Academy.',
    status: 'ready',
    samplePayload: {
      event: 'course.enrolled',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        course_id: 'course_10',
        course_title: 'Mestres do Dropshipping',
        user_id: 'c8a32a68-7b9e-4b68-80f4-526bf764f691'
      }
    }
  },
  {
    eventType: 'ticket.created',
    category: 'support',
    title: 'Chamado de suporte aberto',
    description: 'Disparado quando um novo ticket de suporte é aberto por um cliente ou parceiro.',
    status: 'ready',
    samplePayload: {
      event: 'ticket.created',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        ticket_id: 'tick_45',
        subject: 'Dúvida sobre entrega do pedido',
        priority: 'high',
        customer_email: 'joao.silva@exemplo.com'
      }
    }
  }
];
