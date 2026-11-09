export type WebhookGroupId = 
  | 'user' 
  | 'order' 
  | 'stock' 
  | 'logistics' 
  | 'cart' 
  | 'finance' 
  | 'subscription' 
  | 'academy' 
  | 'support';

export interface WebhookGroup {
  id: WebhookGroupId;
  name: string;
  iconName: string;
  description: string;
}

export interface WebhookEventMeta {
  eventType: string;
  group: WebhookGroupId;
  title: string;
  description: string;
  status: 'production' | 'ready' | 'planned';
  samplePayload: Record<string, any>;
}

export const WEBHOOK_GROUPS: WebhookGroup[] = [
  {
    id: 'user',
    name: 'Eventos de Usuário',
    iconName: 'Users',
    description: 'Cadastros, perfis atualizados, logins, alterações de papel e inatividade',
  },
  {
    id: 'order',
    name: 'Eventos de Pedido',
    iconName: 'Package',
    description: 'Pagamentos confirmados, geração de PIX/Boleto, cancelamentos e reembolsos',
  },
  {
    id: 'stock',
    name: 'Eventos de Estoque & Produtos',
    iconName: 'Boxes',
    description: 'Movimentações de estoque, alertas de estoque baixo e aprovações de catálogo',
  },
  {
    id: 'logistics',
    name: 'Eventos de Logística & Envio',
    iconName: 'Truck',
    description: 'Despacho de pedidos, códigos de rastreamento e entrega ao comprador',
  },
  {
    id: 'cart',
    name: 'Eventos de Carrinho & Checkout',
    iconName: 'ShoppingCart',
    description: 'Recuperação de carrinhos abandonados e início de compras',
  },
  {
    id: 'finance',
    name: 'Eventos Financeiros & Saques',
    iconName: 'DollarSign',
    description: 'Solicitações e pagamentos de saque para revendedores e fornecedores',
  },
  {
    id: 'subscription',
    name: 'Eventos de Assinatura & Planos',
    iconName: 'FileText',
    description: 'Contratação, renovações, atrasos e cancelamentos de planos recorrentes',
  },
  {
    id: 'academy',
    name: 'Eventos de Área de Membros (Academy)',
    iconName: 'GraduationCap',
    description: 'Matrículas em treinamentos, aulas assistidas e conclusão de cursos',
  },
  {
    id: 'support',
    name: 'Eventos de Suporte & SAC',
    iconName: 'MessageSquare',
    description: 'Abertura de chamados, novas mensagens de suporte e chamados finalizados',
  },
];

export const WEBHOOK_EVENTS_CATALOG: WebhookEventMeta[] = [
  // ── 1. Eventos de Usuário ───────────────────────────────────────────────────
  {
    eventType: 'user.created',
    group: 'user',
    title: 'Usuário criado',
    description: 'Disparado imediatamente quando um novo usuário se cadastra na plataforma (via app, checkout ou API).',
    status: 'production',
    samplePayload: {
      event: 'user.created',
      timestamp: '2026-09-29T10:00:00.000Z',
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
        created_at: '2026-09-29T10:00:00.000Z'
      }
    }
  },
  {
    eventType: 'user.updated',
    group: 'user',
    title: 'Usuário atualizado',
    description: 'Disparado quando o usuário altera seus dados cadastrais (nome, telefone, endereço).',
    status: 'ready',
    samplePayload: {
      event: 'user.updated',
      timestamp: '2026-09-29T10:00:00.000Z',
      data: {
        user_id: 'c8a32a68-7b9e-4b68-80f4-526bf764f691',
        email: 'joao.silva@exemplo.com',
        name: 'João Carlos Silva',
        phone: '(11) 99999-8888',
        role: 'customer',
        updated_at: '2026-09-29T10:00:00.000Z'
      }
    }
  },
  {
    eventType: 'user.login',
    group: 'user',
    title: 'Login de usuário',
    description: 'Disparado quando o usuário efetua login com sucesso na plataforma.',
    status: 'ready',
    samplePayload: {
      event: 'user.login',
      timestamp: '2026-09-29T10:00:00.000Z',
      data: {
        user_id: 'c8a32a68-7b9e-4b68-80f4-526bf764f691',
        email: 'joao.silva@exemplo.com',
        role: 'reseller',
        login_at: '2026-09-29T10:00:00.000Z'
      }
    }
  },
  {
    eventType: 'user.role_changed',
    group: 'user',
    title: 'Papel do usuário alterado',
    description: 'Disparado quando o nível de acesso do usuário é modificado (ex: de cliente para revendedor/fornecedor).',
    status: 'ready',
    samplePayload: {
      event: 'user.role_changed',
      timestamp: '2026-09-29T10:00:00.000Z',
      data: {
        user_id: 'c8a32a68-7b9e-4b68-80f4-526bf764f691',
        previous_role: 'customer',
        new_role: 'reseller',
        changed_at: '2026-09-29T10:00:00.000Z'
      }
    }
  },
  {
    eventType: 'user.inactive.7days',
    group: 'user',
    title: 'Usuário inativo (7 dias)',
    description: 'Disparado automaticamente quando um usuário atinge 7 dias sem acessar a plataforma.',
    status: 'production',
    samplePayload: {
      event: 'user.inactive.7days',
      timestamp: '2026-09-29T10:00:00.000Z',
      data: {
        user_id: 'c8a32a68-7b9e-4b68-80f4-526bf764f691',
        email: 'joao.silva@exemplo.com',
        name: 'João Silva',
        days_inactive: 7,
        last_sign_in_at: '2026-09-22T10:00:00.000Z'
      }
    }
  },
  {
    eventType: 'user.inactive.15days',
    group: 'user',
    title: 'Usuário inativo (15 dias)',
    description: 'Disparado automaticamente quando um usuário atinge 15 dias sem acessar.',
    status: 'production',
    samplePayload: {
      event: 'user.inactive.15days',
      timestamp: '2026-09-29T10:00:00.000Z',
      data: {
        user_id: 'c8a32a68-7b9e-4b68-80f4-526bf764f691',
        email: 'joao.silva@exemplo.com',
        name: 'João Silva',
        days_inactive: 15,
        last_sign_in_at: '2026-09-14T10:00:00.000Z'
      }
    }
  },
  {
    eventType: 'user.inactive.30days',
    group: 'user',
    title: 'Usuário inativo (30 dias)',
    description: 'Disparado automaticamente quando um usuário atinge 30 dias sem acessar.',
    status: 'production',
    samplePayload: {
      event: 'user.inactive.30days',
      timestamp: '2026-09-29T10:00:00.000Z',
      data: {
        user_id: 'c8a32a68-7b9e-4b68-80f4-526bf764f691',
        email: 'joao.silva@exemplo.com',
        name: 'João Silva',
        days_inactive: 30,
        last_sign_in_at: '2026-08-30T10:00:00.000Z'
      }
    }
  },

  // ── 2. Eventos de Pedido ────────────────────────────────────────────────────
  {
    eventType: 'order.created',
    group: 'order',
    title: 'Novo pedido gerado',
    description: 'Disparado imediatamente quando um novo pedido é gerado na plataforma (Mercado Livre, Shopee, Loja própria ou API), contendo comprador, itens, link direto de pagamento e código/QR Code Pix.',
    status: 'production',
    samplePayload: {
      event: 'order.created',
      timestamp: '2026-11-09T18:00:00.000Z',
      data: {
        order_id: 'b6e82845-f09b-4389-bd6b-80fc47849e7b',
        order_number: 'LOJ-10892',
        status: 'pendente',
        origin: {
          channel: 'mercadolivre',
          channel_order_id: '2000008492049',
          channel_pack_id: null
        },
        customer: {
          name: 'Maria Silva',
          document: '123.456.789-00',
          email: 'maria.silva@exemplo.com',
          phone: '(11) 98765-4321',
          shipping_address: {
            street: 'Av. Paulista',
            number: '1000',
            complement: 'Apto 42',
            neighborhood: 'Bela Vista',
            city: 'São Paulo',
            state: 'SP',
            zipcode: '01310-100'
          }
        },
        shipping: {
          carrier: 'Mercado Envios',
          tracking_code: null,
          shipping_label_status: 'pending',
          label_url: null
        },
        payment: {
          payment_method: 'pix',
          payment_status: 'pending',
          payment_url: 'https://lojafy.app/pagamento/b6e82845-f09b-4389-bd6b-80fc47849e7b',
          total_amount: 149.90,
          pix: {
            copy_paste_code: '00020101021226840014br.gov.bcb.pix2562...',
            qr_code_base64: 'data:image/png;base64,iVBORw0KGgo...',
            qr_code_image_url: 'https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=00020101021226840014br.gov.bcb.pix2562...',
            expires_at: '2026-11-10T18:00:00.000Z'
          }
        },
        financial: {
          total_order_amount: 149.90,
          supplier_cost: 85.00,
          reseller_profit: 64.90
        },
        reseller: {
          user_id: '45d2e091-7b9e-4b68-80f4-526bf764f691',
          name: 'João Vendedor',
          email: 'joao.vendedor@exemplo.com',
          phone: '(11) 99999-8888',
          document: '123.456.789-00',
          store_name: 'Minha Loja VIP',
          store_url: 'https://lojafy.app/loja/minha-loja-vip',
          custom_fields: {
            id_grupo: 'GRP-2048',
            origem_lead: 'Campanha Meta Ads',
            etapa_lead: 'Convertido',
            potencial_compra: 5000
          }
        },
        supplier: {
          id: 'supplier-uuid',
          name: 'Distribuidora Tech Brasil'
        },
        items: [
          {
            product_id: '92ba8745-f09b-4389-bd6b-80fc47849e7b',
            sku: 'TECH-FONE-BT-PRETO',
            name: 'Fone Bluetooth TWS Pro',
            image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80',
            product_url: 'https://lojafy.app/produto/92ba8745-f09b-4389-bd6b-80fc47849e7b',
            catalog_url: 'https://lojafy.app/catalogo/produto/92ba8745-f09b-4389-bd6b-80fc47849e7b',
            quantity: 1,
            unit_price: 149.90,
            cost_price: 85.00
          }
        ]
      }
    }
  },
  {
    eventType: 'order.paid',
    group: 'order',
    title: 'Compra aprovada (Pedido pago)',
    description: 'Disparado imediatamente quando o pagamento do pedido é confirmado (Mercado Pago, PIX, Carteira).',
    status: 'production',
    samplePayload: {
      event: 'order.paid',
      timestamp: '2026-09-29T10:00:00.000Z',
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
    eventType: 'order.pix_generated',
    group: 'order',
    title: 'Pix gerado',
    description: 'Disparado quando uma cobrança PIX é gerada com o código copia e cola e QR Code.',
    status: 'ready',
    samplePayload: {
      event: 'order.pix_generated',
      timestamp: '2026-09-29T10:00:00.000Z',
      data: {
        order_id: 'b6e82845-f09b-4389-bd6b-80fc47849e7b',
        order_number: 'LOJ-10892',
        total_amount: 199.90,
        pix_qr_code: '00020101021226870014br.gov.bcb.pix2565...',
        expires_at: '2026-09-29T10:30:00.000Z',
        customer: {
          name: 'João Silva',
          email: 'joao.silva@exemplo.com'
        }
      }
    }
  },
  {
    eventType: 'order.boleto_generated',
    group: 'order',
    title: 'Boleto gerado',
    description: 'Disparado quando um boleto bancário é gerado para o pedido.',
    status: 'ready',
    samplePayload: {
      event: 'order.boleto_generated',
      timestamp: '2026-09-29T10:00:00.000Z',
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
    eventType: 'order.payment_failed',
    group: 'order',
    title: 'Compra recusada',
    description: 'Disparado quando a tentativa de pagamento do pedido é recusada pelo banco ou adquirente.',
    status: 'ready',
    samplePayload: {
      event: 'order.payment_failed',
      timestamp: '2026-09-29T10:00:00.000Z',
      data: {
        order_id: 'b6e82845-f09b-4389-bd6b-80fc47849e7b',
        order_number: 'LOJ-10892',
        reason: 'Transação não autorizada pela emissora do cartão',
        total_amount: 199.90
      }
    }
  },
  {
    eventType: 'order.updated',
    group: 'order',
    title: 'Pedido atualizado (Status ou Etiqueta anexada)',
    description: 'Disparado quando ocorrem atualizações no pedido (mudança de status ou quando a etiqueta de frete oficial é anexada/gerada). Inclui a flag event_reason (shipping_label_attached ou status_changed) e o objeto changes com os dados da etiqueta.',
    status: 'production',
    samplePayload: {
      event: 'order.updated',
      timestamp: '2026-11-09T18:00:00.000Z',
      data: {
        event_reason: 'shipping_label_attached',
        changes: {
          shipping_label: {
            attached: true,
            file_name: 'etiqueta-10892.pdf',
            download_url: 'https://lojafy.app/storage/v1/object/sign/shipping-labels/etiqueta-10892.pdf?token=...',
            tracking_code: 'BR104920492ML',
            carrier: 'Mercado Envios'
          },
          previous_status: 'pendente',
          current_status: 'recebido'
        },
        order_id: 'b6e82845-f09b-4389-bd6b-80fc47849e7b',
        order_number: 'LOJ-10892',
        status: 'recebido',
        origin: {
          channel: 'mercadolivre',
          channel_order_id: '2000008492049',
          channel_pack_id: null
        },
        customer: {
          name: 'Maria Silva',
          document: '123.456.789-00',
          email: 'maria.silva@exemplo.com',
          phone: '(11) 98765-4321',
          shipping_address: {
            street: 'Av. Paulista',
            number: '1000',
            complement: 'Apto 42',
            neighborhood: 'Bela Vista',
            city: 'São Paulo',
            state: 'SP',
            zipcode: '01310-100'
          }
        },
        shipping: {
          carrier: 'Mercado Envios',
          tracking_code: 'BR104920492ML',
          shipping_label_status: 'ready',
          label_url: 'https://lojafy.app/storage/v1/object/sign/shipping-labels/etiqueta-10892.pdf?token=...'
        },
        payment: {
          payment_method: 'pix',
          payment_status: 'pending',
          payment_url: 'https://lojafy.app/pagamento/b6e82845-f09b-4389-bd6b-80fc47849e7b',
          total_amount: 149.90,
          pix: {
            copy_paste_code: '00020101021226840014br.gov.bcb.pix2562...',
            qr_code_base64: 'data:image/png;base64,iVBORw0KGgo...',
            qr_code_image_url: 'https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=00020101021226840014br.gov.bcb.pix2562...',
            expires_at: '2026-11-10T18:00:00.000Z'
          }
        },
        financial: {
          total_order_amount: 149.90,
          supplier_cost: 85.00,
          reseller_profit: 64.90
        },
        reseller: {
          user_id: '45d2e091-7b9e-4b68-80f4-526bf764f691',
          name: 'João Vendedor',
          email: 'joao.vendedor@exemplo.com',
          phone: '(11) 99999-8888',
          document: '123.456.789-00',
          store_name: 'Minha Loja VIP',
          store_url: 'https://lojafy.app/loja/minha-loja-vip',
          custom_fields: {
            id_grupo: 'GRP-2048',
            origem_lead: 'Campanha Meta Ads',
            etapa_lead: 'Convertido',
            potencial_compra: 5000
          }
        },
        supplier: {
          id: 'supplier-uuid',
          name: 'Distribuidora Tech Brasil'
        },
        items: [
          {
            product_id: '92ba8745-f09b-4389-bd6b-80fc47849e7b',
            sku: 'TECH-FONE-BT-PRETO',
            name: 'Fone Bluetooth TWS Pro',
            image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80',
            product_url: 'https://lojafy.app/produto/92ba8745-f09b-4389-bd6b-80fc47849e7b',
            catalog_url: 'https://lojafy.app/catalogo/produto/92ba8745-f09b-4389-bd6b-80fc47849e7b',
            quantity: 1,
            unit_price: 149.90,
            cost_price: 85.00
          }
        ]
      }
    }
  },
  {
    eventType: 'order.canceled',
    group: 'order',
    title: 'Pedido cancelado',
    description: 'Disparado quando o pedido é cancelado por falta de pagamento ou pelo vendedor/cliente.',
    status: 'ready',
    samplePayload: {
      event: 'order.canceled',
      timestamp: '2026-09-29T10:00:00.000Z',
      data: {
        order_id: 'b6e82845-f09b-4389-bd6b-80fc47849e7b',
        order_number: 'LOJ-10892',
        reason: 'Cancelado pelo comprador'
      }
    }
  },
  {
    eventType: 'order.refunded',
    group: 'order',
    title: 'Reembolso',
    description: 'Disparado quando ocorre um reembolso (estorno total ou parcial) para o comprador.',
    status: 'ready',
    samplePayload: {
      event: 'order.refunded',
      timestamp: '2026-09-29T10:00:00.000Z',
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
    group: 'order',
    title: 'Chargeback',
    description: 'Disparado quando o titular do cartão contesta a compra perante o banco emissor.',
    status: 'ready',
    samplePayload: {
      event: 'order.chargeback',
      timestamp: '2026-09-29T10:00:00.000Z',
      data: {
        order_id: 'b6e82845-f09b-4389-bd6b-80fc47849e7b',
        order_number: 'LOJ-10892',
        chargeback_amount: 199.90,
        status: 'em_disputa'
      }
    }
  },

  // ── 3. Eventos de Estoque & Produtos ─────────────────────────────────────────
  {
    eventType: 'inventory.updated',
    group: 'stock',
    title: 'Estoque atualizado',
    description: 'Disparado quando há alteração na quantidade em estoque de um produto ou variante.',
    status: 'ready',
    samplePayload: {
      event: 'inventory.updated',
      timestamp: '2026-09-29T10:00:00.000Z',
      data: {
        product_id: 'prod_9872',
        sku: 'CAM-POLO-AZUL-G',
        previous_quantity: 45,
        new_quantity: 44,
        change_reason: 'Venda de pedido LOJ-10892'
      }
    }
  },
  {
    eventType: 'inventory.low',
    group: 'stock',
    title: 'Alerta de estoque baixo',
    description: 'Disparado quando o estoque de um produto atinge o limite mínimo de segurança configurado.',
    status: 'ready',
    samplePayload: {
      event: 'inventory.low',
      timestamp: '2026-09-29T10:00:00.000Z',
      data: {
        product_id: 'prod_9872',
        product_name: 'Camisa Polo Premium',
        current_stock: 4,
        minimum_threshold: 5,
        supplier_id: 'supp_123'
      }
    }
  },
  {
    eventType: 'inventory.out_of_stock',
    group: 'stock',
    title: 'Produto esgotado (Estoque zerado)',
    description: 'Disparado quando o saldo de estoque do produto chega a zero.',
    status: 'ready',
    samplePayload: {
      event: 'inventory.out_of_stock',
      timestamp: '2026-09-29T10:00:00.000Z',
      data: {
        product_id: 'prod_9872',
        product_name: 'Camisa Polo Premium',
        sku: 'CAM-POLO-AZUL-G',
        out_of_stock_at: '2026-09-29T10:00:00.000Z'
      }
    }
  },
  {
    eventType: 'product.created',
    group: 'stock',
    title: 'Produto cadastrado',
    description: 'Disparado quando um novo produto é cadastrado no catálogo.',
    status: 'ready',
    samplePayload: {
      event: 'product.created',
      timestamp: '2026-09-29T10:00:00.000Z',
      data: {
        product_id: 'prod_9872',
        name: 'Tênis Esportivo Ultra',
        price: 289.90,
        category: 'Calçados',
        sku: 'TENIS-ULTRA-41'
      }
    }
  },
  {
    eventType: 'product.approved',
    group: 'stock',
    title: 'Produto aprovado no catálogo',
    description: 'Disparado quando o SuperAdmin aprova um produto submetido por fornecedor.',
    status: 'ready',
    samplePayload: {
      event: 'product.approved',
      timestamp: '2026-09-29T10:00:00.000Z',
      data: {
        product_id: 'prod_9872',
        name: 'Tênis Esportivo Ultra',
        approved_by: 'SuperAdmin'
      }
    }
  },

  // ── 4. Eventos de Logística & Envio ──────────────────────────────────────────
  {
    eventType: 'order.shipped',
    group: 'logistics',
    title: 'Pedido despachado / enviado',
    description: 'Disparado quando o fornecedor/expedição insere o código de rastreio e despacha o pedido.',
    status: 'ready',
    samplePayload: {
      event: 'order.shipped',
      timestamp: '2026-09-29T10:00:00.000Z',
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
    group: 'logistics',
    title: 'Pedido entregue',
    description: 'Disparado quando a transportadora confirma a entrega do pacote ao destinatário.',
    status: 'ready',
    samplePayload: {
      event: 'order.delivered',
      timestamp: '2026-09-29T10:00:00.000Z',
      data: {
        order_id: 'b6e82845-f09b-4389-bd6b-80fc47849e7b',
        order_number: 'LOJ-10892',
        delivered_at: '2026-09-29T10:00:00.000Z'
      }
    }
  },
  {
    eventType: 'order.label_error',
    group: 'logistics',
    title: 'Erro na etiqueta de frete',
    description: 'Disparado quando é registrada ocorrência de erro ou etiqueta inválida.',
    status: 'ready',
    samplePayload: {
      event: 'order.label_error',
      timestamp: '2026-09-29T10:00:00.000Z',
      data: {
        order_id: 'b6e82845-f09b-4389-bd6b-80fc47849e7b',
        order_number: 'LOJ-10892',
        error_detail: 'CEP divergente no arquivo PLP da transportadora'
      }
    }
  },

  // ── 5. Eventos de Carrinho & Checkout ────────────────────────────────────────
  {
    eventType: 'cart.abandoned',
    group: 'cart',
    title: 'Carrinho abandonado',
    description: 'Disparado quando o comprador insere dados de contato no checkout mas não conclui.',
    status: 'ready',
    samplePayload: {
      event: 'cart.abandoned',
      timestamp: '2026-09-29T10:00:00.000Z',
      data: {
        customer_email: 'maria@exemplo.com',
        customer_phone: '(11) 97777-6666',
        items: [{ product_name: 'Relógio Smart Pro', unit_price: 149.00, quantity: 1 }],
        total_amount: 149.00,
        checkout_recovery_url: 'https://lojafy.app/checkout?cart=abc123'
      }
    }
  },

  // ── 6. Eventos Financeiros & Saques ─────────────────────────────────────────
  {
    eventType: 'withdrawal.requested',
    group: 'finance',
    title: 'Solicitação de saque',
    description: 'Disparado quando um revendedor ou fornecedor solicita retirada de saldo de sua carteira.',
    status: 'ready',
    samplePayload: {
      event: 'withdrawal.requested',
      timestamp: '2026-09-29T10:00:00.000Z',
      data: {
        withdrawal_id: 'with_77',
        user_id: '45d2e091-...',
        amount: 850.00,
        pix_key: '11999998888',
        pix_type: 'phone'
      }
    }
  },
  {
    eventType: 'withdrawal.paid',
    group: 'finance',
    title: 'Saque liquidado / pago',
    description: 'Disparado quando a transferência do saque é concluída e o comprovante anexado.',
    status: 'ready',
    samplePayload: {
      event: 'withdrawal.paid',
      timestamp: '2026-09-29T10:00:00.000Z',
      data: {
        withdrawal_id: 'with_77',
        amount: 850.00,
        paid_at: '2026-09-29T10:00:00.000Z'
      }
    }
  },
  {
    eventType: 'wallet.recharge',
    group: 'finance',
    title: 'Recarga de carteira',
    description: 'Disparado quando um lojista adiciona saldo à sua carteira digital.',
    status: 'ready',
    samplePayload: {
      event: 'wallet.recharge',
      timestamp: '2026-09-29T10:00:00.000Z',
      data: {
        user_id: '45d2e091-...',
        amount: 200.00,
        payment_method: 'pix'
      }
    }
  },

  // ── 7. Eventos de Assinatura & Planos ────────────────────────────────────────
  {
    eventType: 'subscription.created',
    group: 'subscription',
    title: 'Assinatura criada',
    description: 'Disparado quando um revendedor assina um plano recorrente.',
    status: 'ready',
    samplePayload: {
      event: 'subscription.created',
      timestamp: '2026-09-29T10:00:00.000Z',
      data: {
        subscription_id: 'sub_89234',
        user_id: '45d2e091-...',
        plan_name: 'Plano Pro VIP',
        amount: 99.00
      }
    }
  },
  {
    eventType: 'subscription.renewed',
    group: 'subscription',
    title: 'Assinatura renovada',
    description: 'Disparado quando o pagamento da mensalidade/anuidade recorrente é processado com êxito.',
    status: 'ready',
    samplePayload: {
      event: 'subscription.renewed',
      timestamp: '2026-09-29T10:00:00.000Z',
      data: {
        subscription_id: 'sub_89234',
        user_id: '45d2e091-...',
        paid_amount: 99.00,
        next_billing_date: '2026-10-29T10:00:00.000Z'
      }
    }
  },
  {
    eventType: 'subscription.past_due',
    group: 'subscription',
    title: 'Assinatura atrasada',
    description: 'Disparado quando a renovação falha e a conta entra em período de carência/inadimplência.',
    status: 'ready',
    samplePayload: {
      event: 'subscription.past_due',
      timestamp: '2026-09-29T10:00:00.000Z',
      data: {
        subscription_id: 'sub_89234',
        user_id: '45d2e091-...',
        amount_due: 99.00,
        days_past_due: 3
      }
    }
  },
  {
    eventType: 'subscription.canceled',
    group: 'subscription',
    title: 'Assinatura cancelada',
    description: 'Disparado quando a assinatura do plano é cancelada.',
    status: 'ready',
    samplePayload: {
      event: 'subscription.canceled',
      timestamp: '2026-09-29T10:00:00.000Z',
      data: {
        subscription_id: 'sub_89234',
        user_id: '45d2e091-...',
        plan_name: 'Plano Pro VIP',
        reason: 'Cancelado pelo usuário'
      }
    }
  },

  // ── 8. Eventos de Área de Membros (Academy) ──────────────────────────────────
  {
    eventType: 'course.enrolled',
    group: 'academy',
    title: 'Aluno matriculado em curso',
    description: 'Disparado quando um usuário ganha acesso a um curso da Lojafy Academy.',
    status: 'ready',
    samplePayload: {
      event: 'course.enrolled',
      timestamp: '2026-09-29T10:00:00.000Z',
      data: {
        course_id: 'course_10',
        course_title: 'Mestres do Dropshipping',
        user_id: 'c8a32a68-7b9e-4b68-80f4-526bf764f691'
      }
    }
  },
  {
    eventType: 'lesson.completed',
    group: 'academy',
    title: 'Aula concluída',
    description: 'Disparado quando um aluno finaliza uma aula da Academy.',
    status: 'ready',
    samplePayload: {
      event: 'lesson.completed',
      timestamp: '2026-09-29T10:00:00.000Z',
      data: {
        course_id: 'course_10',
        lesson_id: 'lesson_22',
        user_id: 'c8a32a68-7b9e-4b68-80f4-526bf764f691'
      }
    }
  },

  // ── 9. Eventos de Suporte & SAC ──────────────────────────────────────────────
  {
    eventType: 'ticket.created',
    group: 'support',
    title: 'Chamado de suporte aberto',
    description: 'Disparado quando um chamado de atendimento é aberto por um cliente ou parceiro.',
    status: 'ready',
    samplePayload: {
      event: 'ticket.created',
      timestamp: '2026-09-29T10:00:00.000Z',
      data: {
        ticket_id: 'tick_45',
        subject: 'Dúvida sobre expedição de pedido',
        priority: 'high',
        customer_email: 'joao.silva@exemplo.com'
      }
    }
  },
  {
    eventType: 'ticket.resolved',
    group: 'support',
    title: 'Chamado de suporte resolvido',
    description: 'Disparado quando a equipe finaliza o chamado com sucesso.',
    status: 'ready',
    samplePayload: {
      event: 'ticket.resolved',
      timestamp: '2026-09-29T10:00:00.000Z',
      data: {
        ticket_id: 'tick_45',
        resolved_at: '2026-09-29T10:00:00.000Z'
      }
    }
  }
];
