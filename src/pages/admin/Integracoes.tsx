import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiKeyManager } from '@/components/admin/ApiKeyManager';
import { EndpointCard } from '@/components/admin/EndpointCard';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Shield, Zap, Globe, GraduationCap, Users, BookOpen, Award } from 'lucide-react';

const endpoints = [
  {
    title: 'Cadastrar Produto',
    method: 'POST' as const,
    url: '/functions/v1/api-produtos-cadastrar',
    description: 'Cria um novo produto no sistema com suporte completo a preços promocionais, controle de estoque e dimensões. SKU e GTIN são gerados automaticamente se não fornecidos. Peso deve ser informado em quilogramas (kg). O campo alta_rotatividade indica produtos com alta demanda. IMPORTANTE: Sequências \\r\\n na descrição são automaticamente convertidas em quebras de linha. O campo anuncio_referencia (URL opcional) marca automaticamente o produto como destaque e exibe um botão "Ver Anúncio de Referência" na página do produto. SISTEMA DE APROVAÇÃO: Se fornecedor_id for fornecido com requer_aprovacao=true, o produto será enviado para aprovação do fornecedor antes de ser publicado (status: pending_approval, ativo: false). O fornecedor receberá notificação e poderá aprovar ou rejeitar. Se requer_aprovacao=false ou não fornecido, o produto é publicado diretamente (status: draft, ativo: true). Campos somente leitura retornados na resposta: status_aprovacao, aprovado_por, aprovado_em, motivo_rejeicao, rejeitado_em, criado_por.',
    requestBody: {
      nome: 'Colete Postural Coluna Cervical Hérnia De Disco Cinta Leve Discreta Correção Postura Costas Corretor Feminino Masculino',
      descricao: 'Modelo\\r\\nPeitoral: 75-100cm Altura: 155-180cm\\r\\n\\r\\nEste colete é uma simples forma para corrigir e melhorar a postura, e ajudar aliviar as dores nos ombros e nas costas.\\r\\n\\r\\nBenefícios:\\r\\n\\r\\n* Alívio da dor muscular. Mantém o equilíbrio gravidade do corpo, reduz a carga sobre os músculos, corrige más posturas e alivia dores de pescoço e ombros, e até mesmo dores de cabeça.',
      preco: 15.49,
      preco_promocional: null,
      preco_custo: 13.00,
      estoque: 50,
      nivel_minimo_estoque: 5,
      alerta_estoque_baixo: true,
      sku: '',
      gtin: '',
      categoria_id: 'dd2ee6ab-f376-4876-8d53-9ffc6fb831ff',
      subcategoria_id: '36ab7b10-cad6-4d21-8a41-525695f77ba5',
      marca: '',
      produto_destaque: false,
      alta_rotatividade: false,
      badge: '',
      imagem_principal: null,
      imagens: null,
      especificacoes: {
        'material': '',
        'cor': '',
        'tamanho': '',
        'tecnologia': '',
        'garantia': ''
      },
      peso: 0.3,
      largura: 16,
      altura: 16,
      comprimento: 12,
      fornecedor_id: '550e8400-e29b-41d4-a716-446655440000',
      requer_aprovacao: true,
      anuncio_referencia: 'https://www.mercadolivre.com.br/colete-postural-exemplo'
    },
    responseExample: {
      success: true,
      message: 'Produto criado com sucesso e enviado para aprovação do fornecedor',
      data: {
        id: 'prod123',
        nome: 'Colete Postural Coluna Cervical Hérnia De Disco Cinta Leve Discreta Correção Postura Costas Corretor Feminino Masculino',
        descricao: 'Modelo\\nPeitoral: 75-100cm Altura: 155-180cm\\n\\nEste colete é uma simples forma para corrigir e melhorar a postura, e ajudar aliviar as dores nos ombros e nas costas.\\n\\nBenefícios:\\n\\n* Alívio da dor muscular. Mantém o equilíbrio gravidade do corpo, reduz a carga sobre os músculos, corrige más posturas e alivia dores de pescoço e ombros, e até mesmo dores de cabeça.',
        sku: 'COLE-AUTO-001',
        gtin: '7891234567890',
        preco: 15.49,
        preco_promocional: null,
        preco_custo: 13.00,
        estoque: 50,
        nivel_minimo_estoque: 5,
        alerta_estoque_baixo: true,
        categoria_id: 'dd2ee6ab-f376-4876-8d53-9ffc6fb831ff',
        subcategoria_id: '36ab7b10-cad6-4d21-8a41-525695f77ba5',
        marca: null,
        produto_destaque: true,
        high_rotation: false,
        badge: null,
        imagens: [],
        imagem_principal: null,
        especificacoes: {
          'material': '',
          'cor': '',
          'tamanho': '',
          'tecnologia': '',
          'garantia': ''
        },
        peso: 0.3,
        largura: 16,
        altura: 16,
        comprimento: 12,
        fornecedor_id: '550e8400-e29b-41d4-a716-446655440000',
        requer_aprovacao: true,
        status_aprovacao: 'pending_approval',
        aprovado_por: null,
        aprovado_em: null,
        motivo_rejeicao: null,
        rejeitado_em: null,
        criado_por: 'admin-user-uuid',
        reference_ad_url: 'https://www.mercadolivre.com.br/colete-postural-exemplo',
        ativo: false,
        criado_em: '2025-01-12T10:00:00Z',
        atualizado_em: '2025-01-12T10:00:00Z'
      }
    }
  },
  {
    title: 'Listar Produtos',
    method: 'GET' as const,
    url: '/functions/v1/api-produtos-listar',
    description: 'Retorna a lista de produtos com paginação e filtros opcionais. O campo high_rotation indica produtos com alta rotatividade.',
    queryParams: [
      { name: 'page', description: 'Página (padrão: 1)', example: '1' },
      { name: 'limit', description: 'Itens por página (máx: 100, padrão: 50)', example: '20' },
      { name: 'search', description: 'Buscar por nome, descrição ou SKU', example: 'tênis' },
      { name: 'category_id', description: 'Filtrar por categoria', example: 'cat123' },
      { name: 'active', description: 'Filtrar por status ativo', example: 'true' }
    ],
    responseExample: {
      success: true,
      data: [
        {
          id: 'prod123',
          nome: 'Tênis Esportivo',
          descricao: 'Tênis leve para corrida',
          preco: 199.90,
          preco_original: null,
          estoque: 50,
          sku: 'TENI-NIKE-001',
          gtin: '7891234567890',
          marca: 'Nike',
          ativo: true,
          high_rotation: false,
          categoria: { id: 'cat123', name: 'Calçados', slug: 'calcados' },
          criado_em: '2025-01-12T10:00:00Z',
          atualizado_em: '2025-01-12T10:00:00Z'
        }
      ],
      pagination: {
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    }
  },
  {
    title: 'Listar Produtos Aguardando Aprovação',
    method: 'GET' as const,
    url: '/functions/v1/api-produtos-aguardando-aprovacao',
    description: 'Retorna todos os produtos com status "pending_approval" incluindo informações completas do fornecedor, categoria, subcategoria, imagens, especificações e preços. Ideal para sistemas de gestão de aprovação e integrações externas. Permite filtrar por fornecedor, criador ou busca textual. Retorna também um resumo com total de produtos aguardando e contagem por fornecedor.',
    queryParams: [
      { 
        name: 'page', 
        description: 'Número da página para paginação (padrão: 1)', 
        example: '1' 
      },
      { 
        name: 'limit', 
        description: 'Quantidade de itens por página (máximo: 100, padrão: 50)', 
        example: '20' 
      },
      { 
        name: 'supplier_id', 
        description: 'Filtrar produtos de um fornecedor específico pelo UUID', 
        example: 'abc-123-def-456' 
      },
      { 
        name: 'created_by', 
        description: 'Filtrar produtos criados por um super admin específico pelo UUID', 
        example: 'xyz-789-ghi-012' 
      },
      { 
        name: 'search', 
        description: 'Busca textual por nome, descrição ou SKU (case-insensitive)', 
        example: 'notebook' 
      }
    ],
    responseExample: {
      success: true,
      data: [
        {
          id: 'prod-123-uuid',
          name: 'Notebook Dell Inspiron 15 3000',
          description: 'Notebook Dell Inspiron com processador Intel Core i5 de 11ª geração, 8GB RAM, SSD 256GB, tela Full HD 15.6 polegadas.',
          price: 2999.00,
          original_price: 3499.00,
          cost_price: null,
          stock_quantity: 10,
          sku: 'NB-DELL-I15-3000',
          gtin_ean13: '7891234567890',
          brand: 'Dell',
          active: false,
          high_rotation: false,
          approval_status: 'pending_approval',
          requires_approval: true,
          rejection_reason: null,
          approved_by: null,
          approved_at: null,
          rejected_at: null,
          created_by: 'admin-456-uuid',
          supplier_id: 'supplier-789-uuid',
          reference_ad_url: null,
          image_url: 'https://bbrmjrjorcgsgeztzbsr.supabase.co/storage/v1/object/public/product-images/notebook-main.jpg',
          main_image_url: 'https://bbrmjrjorcgsgeztzbsr.supabase.co/storage/v1/object/public/product-images/notebook-main.jpg',
          images: [
            'https://bbrmjrjorcgsgeztzbsr.supabase.co/storage/v1/object/public/product-images/notebook-1.jpg',
            'https://bbrmjrjorcgsgeztzbsr.supabase.co/storage/v1/object/public/product-images/notebook-2.jpg'
          ],
          specifications: {
            processador: 'Intel Core i5 11ª Geração',
            memoria_ram: '8GB DDR4',
            armazenamento: 'SSD 256GB',
            tela: '15.6" Full HD',
            sistema_operacional: 'Windows 11 Home'
          },
          badge: 'Novo',
          rating: 0,
          review_count: 0,
          featured: false,
          height: 2.5,
          width: 35.8,
          length: 24.2,
          weight: 1.85,
          min_stock_level: 5,
          low_stock_alert: false,
          use_auto_pricing: false,
          category_id: 'cat-111-uuid',
          subcategory_id: 'subcat-999-uuid',
          categories: {
            id: 'cat-111-uuid',
            name: 'Eletrônicos',
            slug: 'eletronicos',
            image_url: 'https://loja.com/categorias/eletronicos.jpg',
            active: true
          },
          subcategories: {
            id: 'subcat-999-uuid',
            name: 'Notebooks',
            slug: 'notebooks'
          },
          supplier: {
            id: 'supplier-789-uuid',
            full_name: 'João Fornecedor da Silva'
          },
          created_by_user: {
            id: 'admin-456-uuid',
            full_name: 'Admin Sistema'
          },
          created_at: '2025-01-12T10:00:00Z',
          updated_at: '2025-01-12T10:00:00Z'
        },
        {
          id: 'prod-456-uuid',
          name: 'Mouse Gamer RGB Logitech G502',
          description: 'Mouse gamer profissional com sensor HERO 25K, 11 botões programáveis e iluminação RGB.',
          price: 349.90,
          original_price: 449.90,
          cost_price: null,
          stock_quantity: 25,
          sku: 'MOUSE-LG-G502',
          gtin_ean13: '7891234567891',
          brand: 'Logitech',
          active: false,
          high_rotation: true,
          approval_status: 'pending_approval',
          requires_approval: true,
          rejection_reason: null,
          approved_by: null,
          approved_at: null,
          rejected_at: null,
          created_by: 'admin-456-uuid',
          supplier_id: 'supplier-222-uuid',
          reference_ad_url: null,
          image_url: 'https://loja.com/produtos/mouse-logitech.jpg',
          main_image_url: 'https://loja.com/produtos/mouse-logitech.jpg',
          images: [
            'https://loja.com/produtos/mouse-1.jpg'
          ],
          specifications: {
            sensor: 'HERO 25K DPI',
            botoes: '11 programáveis',
            iluminacao: 'RGB LIGHTSYNC'
          },
          badge: 'Alta Rotação',
          rating: 0,
          review_count: 0,
          featured: false,
          height: 4.0,
          width: 7.5,
          length: 13.2,
          weight: 0.121,
          min_stock_level: 10,
          low_stock_alert: false,
          use_auto_pricing: false,
          category_id: 'cat-111-uuid',
          subcategory_id: 'subcat-888-uuid',
          categories: {
            id: 'cat-111-uuid',
            name: 'Eletrônicos',
            slug: 'eletronicos',
            image_url: 'https://loja.com/categorias/eletronicos.jpg',
            active: true
          },
          subcategories: {
            id: 'subcat-888-uuid',
            name: 'Periféricos',
            slug: 'perifericos'
          },
          supplier: {
            id: 'supplier-222-uuid',
            full_name: 'Maria Fornecedora Tech'
          },
          created_by_user: {
            id: 'admin-456-uuid',
            full_name: 'Admin Sistema'
          },
          created_at: '2025-01-11T14:30:00Z',
          updated_at: '2025-01-11T14:30:00Z'
        }
      ],
      pagination: {
        page: 1,
        limit: 50,
        total: 15,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      },
      summary: {
        total_aguardando: 15,
        por_fornecedor: [
          {
            supplier_id: 'supplier-789-uuid',
            name: 'João Fornecedor da Silva',
            total: 8
          },
          {
            supplier_id: 'supplier-222-uuid',
            name: 'Maria Fornecedora Tech',
            total: 7
          }
        ]
      }
    }
  },
  {
    title: 'Listar Categorias',
    method: 'GET' as const,
    url: '/functions/v1/api-categorias-listar',
    description: 'Retorna a lista de categorias disponíveis.',
    queryParams: [
      { name: 'active', description: 'Filtrar por status ativo', example: 'true' }
    ],
    responseExample: {
      success: true,
      data: [
        {
          id: 'cat123',
          nome: 'Calçados',
          slug: 'calcados',
          icone: 'ShoppingBag',
          cor: '#3B82F6',
          imagem_url: 'https://loja.com/categorias/calcados.jpg',
          total_produtos: 25,
          ativo: true,
          criado_em: '2025-01-12T10:00:00Z',
          atualizado_em: '2025-01-12T10:00:00Z'
        }
      ]
    }
  },
  {
    title: 'Cadastrar Categoria',
    method: 'POST' as const,
    url: '/functions/v1/api-categorias-cadastrar',
    description: 'Cria uma nova categoria no sistema. O slug é gerado automaticamente.',
    requestBody: {
      nome: 'Eletrônicos',
      icone: 'Smartphone',
      cor: '#10B981',
      imagem_url: 'https://loja.com/categorias/eletronicos.jpg'
    },
    responseExample: {
      success: true,
      message: 'Categoria criada com sucesso',
      data: {
        id: 'cat456',
        nome: 'Eletrônicos',
        slug: 'eletronicos',
        icone: 'Smartphone',
        cor: '#10B981',
        imagem_url: 'https://loja.com/categorias/eletronicos.jpg'
      }
    }
  },
  {
    title: 'Listar Subcategorias',
    method: 'GET' as const,
    url: '/functions/v1/api-subcategorias-listar',
    description: 'Retorna todas as subcategorias ou de uma categoria específica, sempre com informações da categoria pai e contagem de produtos.',
    queryParams: [
      { name: 'category_id', description: 'ID da categoria pai (opcional)', example: 'cat123' },
      { name: 'active', description: 'Filtrar por status ativo', example: 'true' },
      { name: 'page', description: 'Página (padrão: 1)', example: '1' },
      { name: 'limit', description: 'Itens por página (máx: 100, padrão: 50)', example: '20' },
      { name: 'search', description: 'Buscar por nome da subcategoria', example: 'esportivo' }
    ],
    responseExample: {
      success: true,
      data: [
        {
          id: 'subcat123',
          nome: 'Tênis Esportivo',
          slug: 'tenis-esportivo',
          categoria_pai: {
            id: 'cat123',
            nome: 'Calçados',
            slug: 'calcados'
          },
          total_produtos: 15,
          ativo: true,
          criado_em: '2025-01-12T10:00:00Z',
          atualizado_em: '2025-01-12T10:00:00Z'
        },
        {
          id: 'subcat456',
          nome: 'Smartphones',
          slug: 'smartphones',
          categoria_pai: {
            id: 'cat456',
            nome: 'Eletrônicos',
            slug: 'eletronicos'
          },
          total_produtos: 32,
          ativo: true,
          criado_em: '2025-01-12T11:15:00Z',
          atualizado_em: '2025-01-12T11:15:00Z'
        }
      ],
      pagination: {
        page: 1,
        limit: 50,
        total: 45,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    }
  },
  {
    title: 'Cadastrar Subcategoria',
    method: 'POST' as const,
    url: '/functions/v1/api-subcategorias-cadastrar',
    description: 'Cria uma nova subcategoria dentro de uma categoria específica. O slug é gerado automaticamente.',
    requestBody: {
      nome: 'Tênis Esportivo',
      category_id: 'cat123'
    },
    responseExample: {
      success: true,
      message: 'Subcategoria criada com sucesso',
      data: {
        id: 'subcat456',
        nome: 'Tênis Esportivo',
        slug: 'tenis-esportivo',
        categoria_pai: {
          id: 'cat123',
          nome: 'Calçados'
        },
        ativo: true,
        criado_em: '2025-01-12T10:00:00Z',
        atualizado_em: '2025-01-12T10:00:00Z'
      }
    }
  },
  {
    title: 'Top 10 Produtos',
    method: 'GET' as const,
    url: '/functions/v1/api-top-produtos',
    description: 'Retorna os produtos mais vendidos com métricas de vendas, preços médios e lucro. Baseado em dados demo dos últimos dias.',
    queryParams: [
      { name: 'limit', description: 'Número de produtos (máx: 50, padrão: 10)', example: '10' },
      { name: 'period', description: 'Período de análise (7d ou 30d)', example: '7d' }
    ],
    responseExample: {
      success: true,
      data: [
        {
          id: 'prod123',
          nome: 'Smartphone Samsung Galaxy',
          imagem: 'https://loja.com/produtos/samsung.jpg',
          imagem_principal: 'https://loja.com/produtos/samsung-main.jpg',
          preco_custo: 800.00,
          preco: 1200.00,
          vendas_totais: 45,
          preco_medio: 1150.00,
          lucro_medio: 350.00,
          dias_com_vendas: 6
        }
      ],
      period: '7d',
      total_products: 10
    }
  },
  {
    title: 'Pedidos Recentes',
    method: 'GET' as const,
    url: '/functions/v1/api-pedidos-recentes',
    description: 'Retorna os pedidos mais recentes processados com detalhes dos produtos e cálculo de lucro.',
    queryParams: [
      { name: 'limit', description: 'Número de pedidos (máx: 100, padrão: 15)', example: '15' },
      { name: 'status', description: 'Filtrar por status do pedido', example: 'confirmed' }
    ],
    responseExample: {
      success: true,
      data: [
        {
          id: 'order123-prod456',
          numero_pedido: 'DEMO-1642098765-ABC123',
          data_criacao: '2025-01-12T14:30:00Z',
          status: 'confirmed',
          valor_total: 299.90,
          nome_cliente: 'Maria Silva',
          nome_produto: 'Tênis Esportivo',
          imagem_produto: 'https://loja.com/produtos/tenis.jpg',
          preco_unitario: 149.95,
          quantidade: 2,
          lucro: 59.90
        }
      ],
      total: 15
    }
  },
  {
    title: 'Listar Pedidos Completos',
    method: 'GET' as const,
    url: '/functions/v1/api-pedidos-listar',
    description: 'Retorna a lista completa de pedidos reais com todos os detalhes: informações do cliente (nome, CPF, telefone), produtos com breakdown financeiro completo (custo, taxas, lucro), endereços de entrega e cobrança, dados de pagamento e rastreio. Inclui cálculos detalhados de lucro por produto e resumo financeiro do pedido. Suporta filtros de período e paginação.',
    queryParams: [
      { name: 'period', description: 'Período: today, yesterday, 7days, 14days, 30days (padrão: 30days)', example: '7days' },
      { name: 'limit', description: 'Itens por página (máx: 100, padrão: 50)', example: '50' },
      { name: 'page', description: 'Número da página (padrão: 1)', example: '1' },
      { name: 'status', description: 'Filtrar por status: pending, processing, confirmed, shipped, delivered, cancelled, refunded', example: 'confirmed' }
    ],
    responseExample: {
      success: true,
      data: [
        {
          id: 'order_uuid',
          order_number: 'ORD-1761572020168_76357355',
          status: 'processing',
          payment_status: 'paid',
          payment_method: 'pix',
          payment_id: 'MP123456789',
          external_reference: 'REF123',
          total_amount: 39.96,
          shipping_amount: 0,
          tax_amount: 0,
          created_at: '2025-10-27T10:33:41Z',
          updated_at: '2025-10-27T11:00:00Z',
          tracking_number: null,
          shipping_method_name: null,
          shipping_estimated_days: null,
          has_shipping_file: false,
          customer: {
            user_id: 'user_uuid',
            first_name: 'FRANCISCO',
            last_name: 'DIAS',
            full_name: 'FRANCISCO DIAS',
            cpf: '032.658.537-05',
            phone: '(11) 96226-0258'
          },
          shipping_address: {
            street: 'Rua das Flores',
            number: '123',
            complement: 'Apto 45',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            zip_code: '01234-567'
          },
          billing_address: {
            street: 'Rua das Flores',
            number: '123',
            complement: 'Apto 45',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            zip_code: '01234-567'
          },
          items: [
            {
              id: 'item_uuid',
              product_id: 'product_uuid',
              product_name: 'Jarra Chaleira Eletrica Retrátil 600ml 110v / 220v Silicone Esquentar Leite Café Chá',
              product_sku: 'CHALEIRA-001',
              product_brand: 'GenericBrand',
              product_image: 'https://...',
              quantity: 1,
              unit_price: 39.96,
              total_price: 39.96,
              price_breakdown: {
                cost_price: 36.00,
                is_estimated: false,
                sale_price: 39.96,
                transaction_fee: {
                  percentage: 4.5,
                  amount: 1.80,
                  remaining: 38.16
                },
                contingency_fee: {
                  percentage: 1.0,
                  amount: 0.38,
                  remaining: 37.78
                },
                after_cost: 1.78,
                profit: 1.78,
                profit_margin: 4.45
              }
            }
          ],
          financial_summary: {
            subtotal: 39.96,
            shipping_amount: 0,
            tax_amount: 0,
            total_revenue: 39.96,
            transaction_fee: {
              percentage: 4.5,
              amount: 1.80,
              remaining: 38.16
            },
            contingency_fee: {
              percentage: 1.0,
              amount: 0.38,
              remaining: 37.78
            },
            total_cost: 36.00,
            net_profit: 1.78,
            profit_margin: 4.45
          },
          notes: null
        }
      ],
      pagination: {
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      },
      period: '7days'
    }
  },
  {
    title: 'Cadastrar Pedido Demo',
    method: 'POST' as const,
    url: '/functions/v1/api-demo-pedidos-cadastrar',
    description: 'Cria um novo pedido demo para simulação de vendas no ranking. Útil para testes e demonstrações.',
    requestBody: {
      demo_user_id: 'user123',
      items: [
        {
          product_id: 'prod123',
          quantity: 2,
          unit_price: 149.95
        }
      ],
      status: 'confirmed',
      shipping_amount: 15.90,
      tax_amount: 0
    },
    responseExample: {
      success: true,
      data: {
        id: 'demo_order123',
        numero_pedido: 'DEMO-1642098765-XYZ789',
        demo_user_id: 'user123',
        status: 'confirmed',
        valor_total: 315.80,
        valor_frete: 15.90,
        valor_impostos: 0,
        data_criacao: '2025-01-12T15:00:00Z',
        items: 1
      }
    }
  },
  {
    title: 'Cadastrar Usuário Demo',
    method: 'POST' as const,
    url: '/functions/v1/api-demo-usuarios-cadastrar',
    description: 'Cria um novo usuário demo para usar nos pedidos de simulação.',
    requestBody: {
      first_name: 'João',
      last_name: 'Santos',
      email: 'joao.santos@email.com'
    },
    responseExample: {
      success: true,
      data: {
        id: 'demo_user456',
        primeiro_nome: 'João',
        ultimo_nome: 'Santos',
        email: 'joao.santos@email.com',
        data_criacao: '2025-01-12T15:30:00Z'
      }
    }
  },
  {
    title: 'Cadastrar Produto no Ranking',
    method: 'POST' as const,
    url: '/functions/v1/api-ranking-produto-cadastrar',
    description: 'Permite cadastrar ou atualizar a posição de um produto no ranking com métricas customizadas. Ideal para gerenciamento externo via N8N.',
    requestBody: {
      "posicao": "1",
      "sku": "SADE-016", 
      "media_de_venda": 10.99,
      "media_de_lucro": 4.99,
      "vendas.dia": 6.3
    },
    responseExample: {
      success: true,
      data: {
        id: 'ranking123',
        produto_id: 'prod456',
        produto_nome: 'Produto Exemplo',
        sku: 'SADE-016',
        posicao: 1,
        media_de_venda: 10.99,
        media_de_lucro: 4.99,
        vendas_dia: 6.3,
        atualizado_em: '2025-01-12T16:00:00Z'
      }
    }
  }
];

// Academy API Endpoints
const academyUserEndpoints = [
  {
    title: 'Verificar Usuário',
    method: 'GET' as const,
    url: '/functions/v1/api-usuarios-verificar',
    description: 'Verifica se um usuário existe na plataforma através do email.',
    queryParams: [
      { name: 'email', description: 'Email do usuário (obrigatório)', example: 'aluno@example.com' }
    ],
    responseExample: {
      success: true,
      exists: true,
      data: {
        user_id: 'user123',
        email: 'aluno@example.com',
        full_name: 'João Silva',
        role: 'customer',
        created_at: '2024-12-01T10:00:00Z'
      }
    }
  },
  {
    title: 'Cadastrar Usuário',
    method: 'POST' as const,
    url: '/functions/v1/api-usuarios-cadastrar',
    description: 'Cria um novo usuário na plataforma. Define role padrão como "customer" se não especificado.',
    requestBody: {
      email: 'novousuario@example.com',
      full_name: 'Maria Santos',
      password: 'senhaSegura123!',
      role: 'customer'
    },
    responseExample: {
      success: true,
      message: 'Usuário criado com sucesso',
      data: {
        user_id: 'newuser456',
        email: 'novousuario@example.com',
        full_name: 'Maria Santos',
        role: 'customer',
        created_at: '2025-01-12T15:00:00Z'
      }
    }
  },
  {
    title: 'Listar Usuários',
    method: 'GET' as const,
    url: '/functions/v1/api-usuarios-listar',
    description: 'Lista todos os usuários da plataforma com filtros por role, busca e paginação.',
    queryParams: [
      { name: 'limit', description: 'Quantidade por página (máx: 100, padrão: 50)', example: '20' },
      { name: 'page', description: 'Número da página (padrão: 1)', example: '1' },
      { name: 'role', description: 'Filtrar por role (customer, reseller, supplier, admin, super_admin)', example: 'reseller' },
      { name: 'search', description: 'Buscar por nome ou email', example: 'joao' }
    ],
    responseExample: {
      success: true,
      data: [
        {
          user_id: 'user123',
          email: 'joao@example.com',
          full_name: 'João Silva',
          role: 'reseller',
          phone: '11999999999',
          is_active: true,
          created_at: '2025-01-10T10:00:00Z',
          last_sign_in_at: '2025-01-12T15:00:00Z'
        }
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 150,
        totalPages: 8,
        hasNext: true,
        hasPrev: false
      },
      summary: {
        total_users: 150,
        by_role: {
          customer: 100,
          reseller: 30,
          supplier: 15,
          admin: 3,
          super_admin: 2
        }
      }
    }
  },
  {
    title: 'Alterar Role do Usuário',
    method: 'POST' as const,
    url: '/functions/v1/api-usuarios-alterar-role',
    description: 'Altera a role (função) de um usuário específico. Se a transição for de customer para reseller, dispara webhook automático para N8N.',
    requestBody: {
      user_id: 'uuid-do-usuario',
      new_role: 'reseller',
      transitioned_by: 'uuid-do-admin-opcional'
    },
    responseExample: {
      success: true,
      message: 'Role atualizada com sucesso',
      data: {
        user_id: 'uuid-123',
        email: 'usuario@email.com',
        previous_role: 'customer',
        new_role: 'reseller',
        transitioned_at: '2025-01-12T15:00:00Z',
        transitioned_by: 'uuid-admin',
        webhook_triggered: true
      }
    }
  }
];

const academyCourseEndpoints = [
  {
    title: 'Listar Cursos',
    method: 'GET' as const,
    url: '/functions/v1/api-cursos-listar',
    description: 'Retorna a lista de cursos disponíveis na Academy com filtros por nível de publicação e acesso.',
    queryParams: [
      { name: 'is_published', description: 'Filtrar por status publicado', example: 'true' },
      { name: 'access_level', description: 'Nível de acesso (all, customer, supplier, reseller)', example: 'all' },
      { name: 'page', description: 'Página (padrão: 1)', example: '1' },
      { name: 'limit', description: 'Itens por página (máx: 100, padrão: 50)', example: '20' }
    ],
    responseExample: {
      success: true,
      data: [
        {
          id: 'course123',
          title: 'Fundamentos de E-commerce',
          description: 'Aprenda os conceitos básicos de vendas online',
          thumbnail_url: 'https://loja.com/courses/ecommerce.jpg',
          instructor_name: 'João Silva',
          duration_hours: 8,
          level: 'beginner',
          price: 99.90,
          is_published: true,
          position: 1,
          access_level: 'all',
          created_at: '2025-01-12T10:00:00Z',
          updated_at: '2025-01-12T10:00:00Z'
        }
      ]
    }
  },
  {
    title: 'Cadastrar Curso',
    method: 'POST' as const,
    url: '/functions/v1/api-cursos-cadastrar',
    description: 'Cria um novo curso na plataforma Academy. O nível (level) pode ser: beginner, intermediate ou advanced.',
    requestBody: {
      title: 'Marketing Digital para E-commerce',
      description: 'Domine as estratégias de marketing digital',
      instructor_name: 'Maria Santos',
      duration_hours: 12,
      level: 'intermediate',
      price: 199.90
    },
    responseExample: {
      success: true,
      message: 'Curso criado com sucesso',
      data: {
        id: 'course456',
        title: 'Marketing Digital para E-commerce'
      }
    }
  },
  {
    title: 'Detalhe do Curso',
    method: 'GET' as const,
    url: '/functions/v1/api-cursos-detalhe',
    description: 'Retorna informações completas de um curso específico incluindo estatísticas de matrículas e progresso.',
    queryParams: [
      { name: 'course_id', description: 'ID do curso (obrigatório)', example: 'course456' }
    ],
    responseExample: {
      success: true,
      data: {
        id: 'course456',
        title: 'Marketing Digital para E-commerce',
        statistics: {
          total_enrollments: 145,
          active_students: 98,
          completion_rate: 67.5
        }
      }
    }
  },
  {
    title: 'Conteúdo do Curso',
    method: 'GET' as const,
    url: '/functions/v1/api-cursos-conteudo',
    description: 'Lista todos os módulos e aulas de um curso específico com informações de duração e posicionamento.',
    queryParams: [
      { name: 'course_id', description: 'ID do curso (obrigatório)', example: 'course456' }
    ],
    responseExample: {
      success: true,
      data: {
        course_id: 'course456',
        course_title: 'Marketing Digital',
        modules: [],
        summary: {
          total_modules: 4,
          total_lessons: 32
        }
      }
    }
  }
];

const academyEnrollmentEndpoints = [
  {
    title: 'Listar Matrículas',
    method: 'GET' as const,
    url: '/functions/v1/api-matriculas-listar',
    description: 'Retorna todas as matrículas com informações do curso e progresso.',
    queryParams: [
      { name: 'user_id', description: 'Filtrar por ID do usuário', example: 'user123' },
      { name: 'course_id', description: 'Filtrar por ID do curso', example: 'course456' }
    ],
    responseExample: {
      success: true,
      data: []
    }
  },
  {
    title: 'Matricular Usuário',
    method: 'POST' as const,
    url: '/functions/v1/api-matriculas-cadastrar',
    description: 'Matricula um usuário em um curso.',
    requestBody: {
      user_id: 'user123',
      course_id: 'course456',
      expires_at: '2026-01-12T23:59:59Z'
    },
    responseExample: {
      success: true,
      message: 'Matrícula realizada com sucesso'
    }
  },
  {
    title: 'Verificar Matrícula',
    method: 'GET' as const,
    url: '/functions/v1/api-matriculas-verificar',
    description: 'Verifica se um usuário específico já está matriculado em um curso.',
    queryParams: [
      { name: 'user_id', description: 'ID do usuário', example: 'user123' },
      { name: 'course_id', description: 'ID do curso', example: 'course456' }
    ],
    responseExample: {
      success: true,
      enrolled: true
    }
  },
  {
    title: 'Cancelar Matrícula',
    method: 'DELETE' as const,
    url: '/functions/v1/api-matriculas-cancelar',
    description: 'Cancela uma matrícula existente.',
    requestBody: {
      enrollment_id: 'enrollment123'
    },
    responseExample: {
      success: true,
      message: 'Matrícula cancelada'
    }
  },
  {
    title: 'Atualizar Validade',
    method: 'PUT' as const,
    url: '/functions/v1/api-matriculas-atualizar-validade',
    description: 'Atualiza a data de expiração de uma matrícula.',
    requestBody: {
      enrollment_id: 'enrollment123',
      expires_at: '2027-12-31T23:59:59Z'
    },
    responseExample: {
      success: true,
      message: 'Validade atualizada'
    }
  }
];

const academyProgressEndpoints = [
  {
    title: 'Atualizar Progresso',
    method: 'POST' as const,
    url: '/functions/v1/api-progresso-atualizar',
    description: 'Atualiza ou cria o progresso de uma aula específica.',
    requestBody: {
      enrollment_id: 'enrollment789',
      lesson_id: 'lesson101',
      watch_time_seconds: 1250,
      is_completed: true
    },
    responseExample: {
      success: true,
      message: 'Progresso atualizado'
    }
  },
  {
    title: 'Consultar Progresso',
    method: 'GET' as const,
    url: '/functions/v1/api-progresso-usuario',
    description: 'Retorna o progresso completo de todas as aulas do usuário.',
    queryParams: [
      { name: 'user_id', description: 'ID do usuário', example: 'user123' }
    ],
    responseExample: {
      success: true,
      data: []
    }
  }
];

const IntegracaoPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Integrações via API</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie suas chaves de API e acesse a documentação dos endpoints para integração com sistemas externos.
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Seguro</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Autenticação via chave API com controle de permissões granular.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Rápido</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Endpoints otimizados com geração automática de códigos SKU e GTIN.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Flexível</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Integre com qualquer sistema usando nossa API REST.
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="keys" className="space-y-6">
        <TabsList>
          <TabsTrigger value="keys">Chaves de API</TabsTrigger>
          <TabsTrigger value="docs">Documentação</TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="space-y-6">
          <ApiKeyManager />
        </TabsContent>

        <TabsContent value="docs" className="space-y-6">
          {/* Authentication Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Autenticação
              </CardTitle>
              <CardDescription>
                Todas as requisições devem incluir a chave de API no header
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="font-mono text-sm">
                  <span className="text-muted-foreground">Header:</span> X-API-Key: sua_chave_aqui
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Base URL</Badge>
                <span className="font-mono text-sm">https://bbrmjrjorcgsgeztzbsr.supabase.co</span>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Endpoints organizados por categoria */}
          <Tabs defaultValue="catalog" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="catalog">📦 Catálogo</TabsTrigger>
              <TabsTrigger value="orders">🛒 Pedidos</TabsTrigger>
              <TabsTrigger value="ranking">📊 Ranking</TabsTrigger>
              <TabsTrigger value="academy">🎓 Academy</TabsTrigger>
            </TabsList>

            <TabsContent value="catalog" className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold mb-2">Endpoints de Catálogo</h2>
                <p className="text-muted-foreground mb-6">
                  Gerencie produtos, categorias e subcategorias da sua loja
                </p>
              </div>
              <div className="grid gap-6">
                {endpoints.slice(0, 6).map((endpoint, index) => (
                  <EndpointCard key={index} endpoint={endpoint} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="orders" className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold mb-2">Endpoints de Pedidos</h2>
                <p className="text-muted-foreground mb-6">
                  Consulte pedidos reais e informações de vendas
                </p>
              </div>
              <div className="grid gap-6">
                {endpoints.slice(6, 9).map((endpoint, index) => (
                  <EndpointCard key={index} endpoint={endpoint} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="ranking" className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold mb-2">Endpoints de Ranking & Demo</h2>
                <p className="text-muted-foreground mb-6">
                  Gerencie dados de demonstração e ranking de produtos
                </p>
              </div>
              <div className="grid gap-6">
                {endpoints.slice(9).map((endpoint, index) => (
                  <EndpointCard key={index} endpoint={endpoint} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="academy" className="space-y-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <GraduationCap className="h-6 w-6 text-primary" />
                <div>
                  <h2 className="text-2xl font-semibold">Academy API</h2>
                  <p className="text-muted-foreground text-sm">
                    API completa para gestão de cursos, matrículas e progresso de alunos
                  </p>
                </div>
                <Badge variant="secondary" className="ml-auto">Novo</Badge>
              </div>

              {/* Features */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">Usuários</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      Crie e verifique usuários
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">Cursos</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      Gerencie cursos e conteúdo
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">Matrículas</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      Controle completo de matrículas
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">Progresso</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      Acompanhe o progresso dos alunos
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              {/* Academy Tabs */}
              <Tabs defaultValue="users" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="users">👤 Usuários</TabsTrigger>
                  <TabsTrigger value="courses">📚 Cursos</TabsTrigger>
                  <TabsTrigger value="enrollments">🎓 Matrículas</TabsTrigger>
                  <TabsTrigger value="progress">📊 Progresso</TabsTrigger>
                </TabsList>

                <TabsContent value="users" className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Endpoints de Usuários</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Crie e verifique usuários antes de realizar matrículas
                    </p>
                  </div>
                  <div className="grid gap-6">
                    {academyUserEndpoints.map((endpoint, index) => (
                      <EndpointCard key={index} endpoint={endpoint} />
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="courses" className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Endpoints de Cursos</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Gerencie cursos, consulte detalhes e acesse todo o conteúdo
                    </p>
                  </div>
                  <div className="grid gap-6">
                    {academyCourseEndpoints.map((endpoint, index) => (
                      <EndpointCard key={index} endpoint={endpoint} />
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="enrollments" className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Endpoints de Matrículas</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Crie, verifique, cancele e gerencie validade de matrículas
                    </p>
                  </div>
                  <div className="grid gap-6">
                    {academyEnrollmentEndpoints.map((endpoint, index) => (
                      <EndpointCard key={index} endpoint={endpoint} />
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="progress" className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Endpoints de Progresso</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Acompanhe e atualize o progresso detalhado de cada aluno
                    </p>
                  </div>
                  <div className="grid gap-6">
                    {academyProgressEndpoints.map((endpoint, index) => (
                      <EndpointCard key={index} endpoint={endpoint} />
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IntegracaoPage;