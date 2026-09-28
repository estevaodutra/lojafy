export interface WebhookEventMeta {
  eventType: string;
  category: 'users' | 'orders' | 'cart' | 'catalog' | 'finance' | 'subscriptions' | 'academy' | 'support' | 'logistics';
  title: string;
  description: string;
  status: 'production' | 'ready' | 'planned';
  samplePayload: Record<string, any>;
}

export const WEBHOOK_CATEGORIES = [
  { id: 'all', label: 'Todos os Eventos' },
  { id: 'users', label: '👤 Usuários & Contas' },
  { id: 'orders', label: '📦 Pedidos & Vendas' },
  { id: 'cart', label: '🛒 Carrinho & Checkout' },
  { id: 'catalog', label: '🏷️ Produtos & Estoque' },
  { id: 'finance', label: '💳 Carteira & Saques' },
  { id: 'subscriptions', label: '📑 Assinaturas & Planos' },
  { id: 'academy', label: '🎓 Área de Membros' },
  { id: 'support', label: '🎫 Suporte & SAC' },
  { id: 'logistics', label: '🚚 Logística' },
] as const;

export const WEBHOOK_EVENTS_CATALOG: WebhookEventMeta[] = [
  // ── 1. Usuários & Contas ────────────────────────────────────────────────────
  {
    eventType: 'user.created',
    category: 'users',
    title: 'Usuário Criado',
    description: 'Disparado imediatamente quando um novo usuário se cadastra na plataforma (via app, checkout ou API).',
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
    eventType: 'user.updated',
    category: 'users',
    title: 'Usuário Atualizado',
    description: 'Disparado quando dados de cadastro, nome, telefone ou perfil são alterados.',
    status: 'ready',
    samplePayload: {
      event: 'user.updated',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        user_id: 'c8a32a68-7b9e-4b68-80f4-526bf764f691',
        email: 'joao.silva@exemplo.com',
        name: 'João Carlos Silva',
        phone: '(11) 99999-8888',
        role: 'customer',
        updated_at: '2026-09-28T16:00:00.000Z'
      }
    }
  },
  {
    eventType: 'user.login',
    category: 'users',
    title: 'Login de Usuário',
    description: 'Disparado quando um usuário efetua login com sucesso.',
    status: 'ready',
    samplePayload: {
      event: 'user.login',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        user_id: 'c8a32a68-7b9e-4b68-80f4-526bf764f691',
        email: 'joao.silva@exemplo.com',
        role: 'reseller',
        login_at: '2026-09-28T16:00:00.000Z'
      }
    }
  },
  {
    eventType: 'user.role_changed',
    category: 'users',
    title: 'Papel do Usuário Alterado',
    description: 'Disparado quando o usuário tem o nível de acesso alterado (ex: promovido para fornecedor ou revendedor).',
    status: 'ready',
    samplePayload: {
      event: 'user.role_changed',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        user_id: 'c8a32a68-7b9e-4b68-80f4-526bf764f691',
        previous_role: 'customer',
        new_role: 'reseller'
      }
    }
  },
  {
    eventType: 'user.inactive.7days',
    category: 'users',
    title: 'Usuário Inativo (7 dias)',
    description: 'Disparado pelo robô agendado quando o usuário completa 7 dias sem acessar a plataforma.',
    status: 'production',
    samplePayload: {
      event: 'user.inactive.7days',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        user_id: 'c8a32a68-7b9e-4b68-80f4-526bf764f691',
        email: 'joao.silva@exemplo.com',
        name: 'João Silva',
        days_inactive: 7,
        last_sign_in_at: '2026-09-21T16:00:00.000Z'
      }
    }
  },
  {
    eventType: 'user.inactive.15days',
    category: 'users',
    title: 'Usuário Inativo (15 dias)',
    description: 'Disparado pelo robô agendado quando o usuário completa 15 dias sem acessar.',
    status: 'production',
    samplePayload: {
      event: 'user.inactive.15days',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        user_id: 'c8a32a68-7b9e-4b68-80f4-526bf764f691',
        email: 'joao.silva@exemplo.com',
        name: 'João Silva',
        days_inactive: 15,
        last_sign_in_at: '2026-09-13T16:00:00.000Z'
      }
    }
  },
  {
    eventType: 'user.inactive.30days',
    category: 'users',
    title: 'Usuário Inativo (30 dias)',
    description: 'Disparado pelo robô agendado quando o usuário completa 30 dias sem acessar.',
    status: 'production',
    samplePayload: {
      event: 'user.inactive.30days',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        user_id: 'c8a32a68-7b9e-4b68-80f4-526bf764f691',
        email: 'joao.silva@exemplo.com',
        name: 'João Silva',
        days_inactive: 30,
        last_sign_in_at: '2026-08-29T16:00:00.000Z'
      }
    }
  },

  // ── 2. Pedidos & Vendas ─────────────────────────────────────────────────────
  {
    eventType: 'order.created',
    category: 'orders',
    title: 'Pedido Criado',
    description: 'Disparado quando um novo pedido é gerado no checkout (pendente de pagamento).',
    status: 'ready',
    samplePayload: {
      event: 'order.created',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        order_id: 'b6e82845-f09b-4389-bd6b-80fc47849e7b',
        order_number: 'LOJ-10892',
        total_amount: 199.90,
        payment_method: 'pix',
        customer: {
          name: 'João Silva',
          email: 'joao.silva@exemplo.com',
          phone: '(11) 98765-4321'
        },
        items_count: 2
      }
    }
  },
  {
    eventType: 'order.paid',
    category: 'orders',
    title: 'Pedido Pago',
    description: 'Disparado quando o pagamento do pedido é confirmado (via Mercado Pago, PIX, Carteira ou Cartão).',
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
        ],
        shipping_label: null
      }
    }
  },
  {
    eventType: 'order.payment_failed',
    category: 'orders',
    title: 'Pagamento Recusado / Falhou',
    description: 'Disparado quando uma transação de pagamento do pedido é rejeitada ou cancelada.',
    status: 'ready',
    samplePayload: {
      event: 'order.payment_failed',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        order_id: 'b6e82845-f09b-4389-bd6b-80fc47849e7b',
        order_number: 'LOJ-10892',
        reason: 'Cartão recusado pela operadora'
      }
    }
  },
  {
    eventType: 'order.updated',
    category: 'orders',
    title: 'Pedido Atualizado',
    description: 'Disparado quando ocorrem atualizações em qualquer detalhe do pedido.',
    status: 'ready',
    samplePayload: {
      event: 'order.updated',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        order_id: 'b6e82845-f09b-4389-bd6b-80fc47849e7b',
        order_number: 'LOJ-10892',
        status: 'em_separacao',
        tracking_number: null
      }
    }
  },
  {
    eventType: 'order.shipped',
    category: 'orders',
    title: 'Pedido Enviado (Despachado)',
    description: 'Disparado quando o código de rastreamento é informado e o pedido é despachado pelo fornecedor.',
    status: 'ready',
    samplePayload: {
      event: 'order.shipped',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        order_id: 'b6e82845-f09b-4389-bd6b-80fc47849e7b',
        order_number: 'LOJ-10892',
        tracking_number: 'BR123456789BR',
        carrier: 'Correios Sedex',
        customer_email: 'joao.silva@exemplo.com'
      }
    }
  },
  {
    eventType: 'order.delivered',
    category: 'orders',
    title: 'Pedido Entregue',
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
    title: 'Pedido Cancelado',
    description: 'Disparado quando o pedido é cancelado pelo cliente, revendedor ou administração.',
    status: 'ready',
    samplePayload: {
      event: 'order.canceled',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        order_id: 'b6e82845-f09b-4389-bd6b-80fc47849e7b',
        order_number: 'LOJ-10892',
        reason: 'Solicitação do comprador'
      }
    }
  },
  {
    eventType: 'order.refunded',
    category: 'orders',
    title: 'Pedido Reembolsado',
    description: 'Disparado quando o estorno/reembolso é executado para o comprador.',
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

  // ── 3. Carrinho & Checkout ──────────────────────────────────────────────────
  {
    eventType: 'cart.abandoned',
    category: 'cart',
    title: 'Carrinho Abandonado',
    description: 'Disparado quando um visitante ou cliente insere dados de contato mas não conclui a compra.',
    status: 'ready',
    samplePayload: {
      event: 'cart.abandoned',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        customer_email: 'maria@exemplo.com',
        customer_phone: '(11) 97777-6666',
        items: [{ product_name: 'Relógio Smart', unit_price: 149.00 }],
        total_amount: 149.00,
        checkout_url: 'https://lojafy.app/checkout?recovery=abc'
      }
    }
  },

  // ── 4. Catálogo, Produtos & Estoque ─────────────────────────────────────────
  {
    eventType: 'product.created',
    category: 'catalog',
    title: 'Produto Criado',
    description: 'Disparado quando um novo produto é adicionado ao catálogo geral.',
    status: 'ready',
    samplePayload: {
      event: 'product.created',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        product_id: '5f9a...',
        name: 'Tênis Esportivo Pro',
        price: 249.90,
        sku: 'TENIS-001',
        supplier_id: '3c8e...'
      }
    }
  },
  {
    eventType: 'product.approved',
    category: 'catalog',
    title: 'Produto Aprovado',
    description: 'Disparado quando o SuperAdmin aprova um produto submetido por um fornecedor.',
    status: 'ready',
    samplePayload: {
      event: 'product.approved',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        product_id: '5f9a...',
        name: 'Tênis Esportivo Pro',
        approved_by: 'Super Admin'
      }
    }
  },
  {
    eventType: 'inventory.low',
    category: 'catalog',
    title: 'Alerta de Estoque Baixo',
    description: 'Disparado quando o estoque de um item atinge a margem de segurança configurada.',
    status: 'ready',
    samplePayload: {
      event: 'inventory.low',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        product_id: '5f9a...',
        product_name: 'Tênis Esportivo Pro',
        current_stock: 3,
        min_threshold: 5
      }
    }
  },

  // ── 5. Carteira & Financeiro ────────────────────────────────────────────────
  {
    eventType: 'withdrawal.requested',
    category: 'finance',
    title: 'Solicitação de Saque',
    description: 'Disparado quando um revendedor ou fornecedor solicita retirada de saldo.',
    status: 'ready',
    samplePayload: {
      event: 'withdrawal.requested',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        withdrawal_id: '90ab...',
        user_id: '45d2e091-...',
        amount: 850.00,
        pix_key: '11999998888',
        pix_type: 'phone'
      }
    }
  },
  {
    eventType: 'withdrawal.paid',
    category: 'finance',
    title: 'Saque Liquidado / Pago',
    description: 'Disparado quando o financeiro processa o pagamento do saque e envia o comprovante.',
    status: 'ready',
    samplePayload: {
      event: 'withdrawal.paid',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        withdrawal_id: '90ab...',
        amount: 850.00,
        receipt_url: 'https://storage.../comprovante.pdf'
      }
    }
  },

  // ── 6. Assinaturas & Planos ─────────────────────────────────────────────────
  {
    eventType: 'subscription.created',
    category: 'subscriptions',
    title: 'Assinatura Criada',
    description: 'Disparado quando um revendedor ou lojista adere a um plano recorrente.',
    status: 'ready',
    samplePayload: {
      event: 'subscription.created',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        subscription_id: 'sub_123',
        plan_name: 'Plano Pro Anual',
        user_id: '45d2e091-...',
        amount: 99.00
      }
    }
  },

  // ── 7. Área de Membros (Academy) ───────────────────────────────────────────
  {
    eventType: 'course.enrolled',
    category: 'academy',
    title: 'Matrícula em Curso',
    description: 'Disparado quando o usuário ganha acesso ou se inscreve em um treinamento da Lojafy Academy.',
    status: 'ready',
    samplePayload: {
      event: 'course.enrolled',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        course_id: 'course_01',
        course_title: 'Vendas Automáticas no Dropshipping',
        user_id: 'c8a32a68-7b9e-4b68-80f4-526bf764f691'
      }
    }
  },

  // ── 8. Suporte & Atendimento ────────────────────────────────────────────────
  {
    eventType: 'ticket.created',
    category: 'support',
    title: 'Chamado de Suporte Aberto',
    description: 'Disparado quando um usuário registra um ticket ou dúvida para a equipe.',
    status: 'ready',
    samplePayload: {
      event: 'ticket.created',
      timestamp: '2026-09-28T16:00:00.000Z',
      data: {
        ticket_id: 'tick_99',
        subject: 'Dúvida sobre envio de remessa',
        priority: 'high',
        customer_email: 'joao.silva@exemplo.com'
      }
    }
  }
];
