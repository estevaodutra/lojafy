import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiKeyManager } from '@/components/admin/ApiKeyManager';
import { EndpointCard } from '@/components/admin/EndpointCard';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Shield, Zap, Globe } from 'lucide-react';

const endpoints = [
  {
    title: 'Cadastrar Produto',
    method: 'POST' as const,
    url: '/functions/v1/api-produtos-cadastrar',
    description: 'Cria um novo produto no sistema com suporte completo a preços promocionais, controle de estoque e dimensões. SKU e GTIN são gerados automaticamente se não fornecidos. Peso deve ser informado em quilogramas (kg). O campo alta_rotatividade indica produtos com alta demanda. IMPORTANTE: Sequências \\r\\n na descrição são automaticamente convertidas em quebras de linha.',
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
      comprimento: 12
    },
    responseExample: {
      success: true,
      message: 'Produto criado com sucesso',
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
        produto_destaque: false,
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
        ativo: true,
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
              <Card className="border-primary/50">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-sm">Novo</Badge>
                    <CardTitle>API da Loja Fire Academy</CardTitle>
                  </div>
                  <CardDescription>
                    A API da Academy possui uma página dedicada com documentação completa e endpoints especializados para gestão de cursos, matrículas e progresso.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <a 
                    href="/super-admin/academy-api" 
                    className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                  >
                    Acessar Documentação Completa da Academy API →
                  </a>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IntegracaoPage;