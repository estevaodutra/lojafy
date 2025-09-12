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
    description: 'Cria um novo produto no sistema. SKU e GTIN são gerados automaticamente se não fornecidos.',
    requestBody: {
      nome: 'Tênis Esportivo',
      descricao: 'Tênis leve para corrida',
      preco: 199.90,
      estoque: 50,
      sku: '',
      gtin: '',
      categoria_id: 'cat123',
      marca: 'Nike',
      imagens: [
        'https://loja.com/produtos/tenis1.jpg',
        'https://loja.com/produtos/tenis2.jpg'
      ],
      especificacoes: {
        'material': 'Sintético',
        'cor': 'Preto',
        'tamanho': '42'
      },
      peso: 0.5,
      largura: 12,
      altura: 8,
      comprimento: 30
    },
    responseExample: {
      success: true,
      message: 'Produto criado com sucesso',
      data: {
        id: 'prod123',
        nome: 'Tênis Esportivo',
        sku: 'TENI-NIKE-001',
        gtin: '7891234567890',
        preco: 199.90,
        estoque: 50
      }
    }
  },
  {
    title: 'Listar Produtos',
    method: 'GET' as const,
    url: '/functions/v1/api-produtos-listar',
    description: 'Retorna a lista de produtos com paginação e filtros opcionais.',
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

          {/* Endpoints */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-4">Endpoints Disponíveis</h2>
              <p className="text-muted-foreground">
                Todos os endpoints retornam JSON e incluem tratamento de erros adequado.
              </p>
            </div>

            <div className="grid gap-6">
              {endpoints.map((endpoint, index) => (
                <EndpointCard key={index} endpoint={endpoint} />
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IntegracaoPage;