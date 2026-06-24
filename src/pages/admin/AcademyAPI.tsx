import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EndpointSection } from '@/components/admin/EndpointSection';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Shield, GraduationCap, BookOpen, Award, Users, Package } from 'lucide-react';

// Endpoints de Usuários
const userEndpoints = [
  {
    title: 'Verificar Usuário',
    method: 'GET' as const,
    url: '/functions/v1/api-usuarios-verificar',
    description: 'Verifica se um usuário existe na plataforma por user_id ou email antes de realizar matrículas.',
    queryParams: [
      { name: 'user_id', description: 'ID do usuário (opcional se usar email)', example: 'user123' },
      { name: 'email', description: 'Email do usuário (opcional se usar user_id)', example: 'aluno@example.com' }
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
        },
        {
          user_id: 'user456',
          email: 'maria@example.com',
          full_name: 'Maria Santos',
          role: 'reseller',
          phone: '11988888888',
          is_active: true,
          created_at: '2025-01-11T14:00:00Z',
          last_sign_in_at: '2025-01-12T10:30:00Z'
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
  }
];

// Endpoints de Cursos
const courseEndpoints = [
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
      ],
      pagination: {
        page: 1,
        limit: 50,
        total: 15,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    }
  },
  {
    title: 'Cadastrar Curso',
    method: 'POST' as const,
    url: '/functions/v1/api-cursos-cadastrar',
    description: 'Cria um novo curso na plataforma Academy. O nível (level) pode ser: beginner, intermediate ou advanced.',
    requestBody: {
      title: 'Marketing Digital para E-commerce',
      description: 'Domine as estratégias de marketing digital para impulsionar suas vendas online',
      thumbnail_url: 'https://loja.com/courses/marketing.jpg',
      instructor_name: 'Maria Santos',
      duration_hours: 12,
      level: 'intermediate',
      price: 199.90,
      is_published: true,
      position: 2,
      access_level: 'reseller'
    },
    responseExample: {
      success: true,
      message: 'Curso criado com sucesso',
      data: {
        id: 'course456',
        title: 'Marketing Digital para E-commerce',
        description: 'Domine as estratégias de marketing digital para impulsionar suas vendas online',
        thumbnail_url: 'https://loja.com/courses/marketing.jpg',
        instructor_name: 'Maria Santos',
        duration_hours: 12,
        level: 'intermediate',
        price: 199.90,
        is_published: true,
        position: 2,
        access_level: 'reseller',
        created_at: '2025-01-12T11:00:00Z',
        updated_at: '2025-01-12T11:00:00Z'
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
        description: 'Domine as estratégias de marketing digital',
        thumbnail_url: 'https://loja.com/courses/marketing.jpg',
        instructor_name: 'Maria Santos',
        duration_hours: 12,
        level: 'intermediate',
        price: 199.90,
        is_published: true,
        access_level: 'reseller',
        statistics: {
          total_enrollments: 145,
          active_students: 98,
          completion_rate: 67.5,
          average_progress: 42.3
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
        course_title: 'Marketing Digital para E-commerce',
        modules: [
          {
            id: 'module1',
            title: 'Módulo 1: Fundamentos',
            description: 'Aprenda os fundamentos',
            position: 1,
            is_published: true,
            lessons: [
              {
                id: 'lesson1',
                title: 'Introdução ao Marketing',
                description: 'Aula introdutória',
                duration_minutes: 25,
                position: 1,
                video_url: 'https://vimeo.com/123456',
                is_published: true
              }
            ]
          }
        ],
        summary: {
          total_modules: 4,
          total_lessons: 32,
          total_duration_hours: 12.5
        }
      }
    }
  }
];

// Endpoints de Matrículas
const enrollmentEndpoints = [
  {
    title: 'Listar Matrículas',
    method: 'GET' as const,
    url: '/functions/v1/api-matriculas-listar',
    description: 'Retorna todas as matrículas com informações do curso e progresso. Permite filtrar por usuário, curso e status de conclusão.',
    queryParams: [
      { name: 'user_id', description: 'Filtrar por ID do usuário', example: 'user123' },
      { name: 'course_id', description: 'Filtrar por ID do curso', example: 'course456' },
      { name: 'completed', description: 'Filtrar apenas concluídos (true/false)', example: 'false' },
      { name: 'page', description: 'Página (padrão: 1)', example: '1' },
      { name: 'limit', description: 'Itens por página (máx: 100, padrão: 50)', example: '20' }
    ],
    responseExample: {
      success: true,
      data: [
        {
          id: 'enrollment123',
          user_id: 'user123',
          course_id: 'course456',
          enrolled_at: '2025-01-10T10:00:00Z',
          expires_at: null,
          progress_percentage: 45,
          completed_at: null,
          course: {
            id: 'course456',
            title: 'Marketing Digital para E-commerce',
            thumbnail_url: 'https://loja.com/courses/marketing.jpg',
            instructor_name: 'Maria Santos',
            duration_hours: 12
          }
        }
      ],
      pagination: {
        page: 1,
        limit: 50,
        total: 23,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    }
  },
  {
    title: 'Matricular Usuário',
    method: 'POST' as const,
    url: '/functions/v1/api-matriculas-cadastrar',
    description: 'Matricula um usuário em um curso. O campo expires_at é opcional e define uma data de expiração para o acesso.',
    requestBody: {
      user_id: 'user123',
      course_id: 'course456',
      expires_at: '2026-01-12T23:59:59Z'
    },
    responseExample: {
      success: true,
      message: 'Matrícula realizada com sucesso',
      data: {
        id: 'enrollment789',
        user_id: 'user123',
        course_id: 'course456',
        enrolled_at: '2025-01-12T12:00:00Z',
        expires_at: '2026-01-12T23:59:59Z',
        progress_percentage: 0,
        completed_at: null
      }
    }
  },
  {
    title: 'Verificar Matrícula',
    method: 'GET' as const,
    url: '/functions/v1/api-matriculas-verificar',
    description: 'Verifica se um usuário específico já está matriculado em um curso e retorna o status da matrícula.',
    queryParams: [
      { name: 'user_id', description: 'ID do usuário (obrigatório)', example: 'user123' },
      { name: 'course_id', description: 'ID do curso (obrigatório)', example: 'course456' }
    ],
    responseExample: {
      success: true,
      enrolled: true,
      data: {
        enrollment_id: 'enrollment123',
        enrolled_at: '2025-01-01T10:00:00Z',
        expires_at: '2026-01-01T23:59:59Z',
        status: 'active',
        progress_percentage: 35,
        is_expired: false,
        is_completed: false,
        completed_at: null
      }
    }
  },
  {
    title: 'Cancelar Matrícula',
    method: 'DELETE' as const,
    url: '/functions/v1/api-matriculas-cancelar',
    description: 'Cancela uma matrícula existente removendo o acesso do usuário ao curso e todo o progresso associado.',
    requestBody: {
      enrollment_id: 'enrollment123'
    },
    responseExample: {
      success: true,
      message: 'Matrícula cancelada com sucesso'
    }
  },
  {
    title: 'Atualizar Validade',
    method: 'PUT' as const,
    url: '/functions/v1/api-matriculas-atualizar-validade',
    description: 'Atualiza a data de expiração de uma matrícula. Use null para acesso vitalício.',
    requestBody: {
      enrollment_id: 'enrollment123',
      expires_at: '2027-12-31T23:59:59Z'
    },
    responseExample: {
      success: true,
      message: 'Validade atualizada com sucesso',
      data: {
        enrollment_id: 'enrollment123',
        old_expires_at: '2026-01-01T23:59:59Z',
        new_expires_at: '2027-12-31T23:59:59Z',
        updated_at: '2025-01-12T16:00:00Z'
      }
    }
  }
];

// Endpoints de Progresso
const progressEndpoints = [
  {
    title: 'Atualizar Progresso',
    method: 'POST' as const,
    url: '/functions/v1/api-progresso-atualizar',
    description: 'Atualiza ou cria o progresso de uma aula específica. Registra tempo assistido, posição atual e status de conclusão. Automaticamente calcula o progresso geral do curso.',
    requestBody: {
      enrollment_id: 'enrollment789',
      lesson_id: 'lesson101',
      watch_time_seconds: 1250,
      last_position_seconds: 1250,
      is_completed: true,
      notes: 'Anotações do aluno sobre esta aula'
    },
    responseExample: {
      success: true,
      message: 'Progresso atualizado com sucesso',
      data: {
        id: 'progress123',
        user_id: 'user123',
        enrollment_id: 'enrollment789',
        lesson_id: 'lesson101',
        is_completed: true,
        completed_at: '2025-01-12T12:30:00Z',
        watch_time_seconds: 1250,
        last_position_seconds: 1250,
        notes: 'Anotações do aluno sobre esta aula',
        created_at: '2025-01-12T12:00:00Z',
        updated_at: '2025-01-12T12:30:00Z'
      }
    }
  },
  {
    title: 'Consultar Progresso do Usuário',
    method: 'GET' as const,
    url: '/functions/v1/api-progresso-usuario',
    description: 'Retorna o progresso completo de todas as aulas do usuário com estatísticas detalhadas. Inclui informações de curso, módulo e aula.',
    queryParams: [
      { name: 'user_id', description: 'ID do usuário (obrigatório se não usar enrollment_id)', example: 'user123' },
      { name: 'enrollment_id', description: 'ID da matrícula (obrigatório se não usar user_id)', example: 'enrollment789' }
    ],
    responseExample: {
      success: true,
      data: [
        {
          id: 'progress123',
          user_id: 'user123',
          enrollment_id: 'enrollment789',
          lesson_id: 'lesson101',
          is_completed: true,
          completed_at: '2025-01-12T12:30:00Z',
          watch_time_seconds: 1250,
          last_position_seconds: 1250,
          notes: 'Anotações do aluno',
          lesson: {
            id: 'lesson101',
            title: 'Introdução ao Marketing Digital',
            duration_minutes: 25,
            module_id: 'module1',
            module: {
              id: 'module1',
              title: 'Módulo 1: Fundamentos',
              course_id: 'course456',
              course: {
                id: 'course456',
                title: 'Marketing Digital para E-commerce'
              }
            }
          }
        }
      ],
      summary: {
        total_lessons: 12,
        completed_lessons: 5,
        completion_percentage: 42,
        total_watch_time_seconds: 7850,
        total_watch_time_hours: 2.18
      }
    }
  }
];

// Endpoints de Produtos
const productEndpoints = [
  {
    title: 'Listar Produtos Aguardando Aprovação',
    method: 'GET' as const,
    url: '/functions/v1/api-produtos-aguardando-aprovacao',
    description: 'Retorna todos os produtos com status "pending_approval" incluindo informações completas do fornecedor, categoria, subcategoria, imagens, especificações e preços. Ideal para integrações externas e sistemas de gestão de aprovação.',
    headers: [
      { 
        name: 'X-API-Key', 
        description: 'Chave de autenticação da API (obrigatório)', 
        example: 'sk_live_abc123...', 
        required: true 
      },
      { 
        name: 'Content-Type', 
        description: 'Tipo do conteúdo', 
        example: 'application/json', 
        required: true 
      }
    ],
    queryParams: [
      { 
        name: 'page', 
        description: 'Número da página para paginação (padrão: 1)', 
        example: '1',
        required: false
      },
      { 
        name: 'limit', 
        description: 'Quantidade de itens por página (máximo: 100, padrão: 50)', 
        example: '20',
        required: false
      },
      { 
        name: 'supplier_id', 
        description: 'Filtrar produtos de um fornecedor específico pelo UUID', 
        example: 'abc-123-def-456-ghi',
        required: false
      },
      { 
        name: 'created_by', 
        description: 'Filtrar produtos criados por um super admin específico pelo UUID', 
        example: 'xyz-789-ghi-012-jkl',
        required: false
      },
      { 
        name: 'search', 
        description: 'Busca textual por nome, descrição ou SKU do produto (case-insensitive)', 
        example: 'notebook dell',
        required: false
      }
    ],
    responseExample: {
      success: true,
      data: [
        {
          id: 'prod-123-uuid',
          name: 'Notebook Dell Inspiron 15 3000',
          description: 'Notebook Dell Inspiron com processador Intel Core i5 de 11ª geração, 8GB RAM, SSD 256GB, tela Full HD 15.6 polegadas. Ideal para trabalho e estudos.',
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
          image_url: 'https://lojafy.6ksfuf.easypanel.host/storage/v1/object/public/product-images/notebook-dell-main.jpg',
          main_image_url: 'https://lojafy.6ksfuf.easypanel.host/storage/v1/object/public/product-images/notebook-dell-main.jpg',
          images: [
            'https://lojafy.6ksfuf.easypanel.host/storage/v1/object/public/product-images/notebook-dell-1.jpg',
            'https://lojafy.6ksfuf.easypanel.host/storage/v1/object/public/product-images/notebook-dell-2.jpg',
            'https://lojafy.6ksfuf.easypanel.host/storage/v1/object/public/product-images/notebook-dell-3.jpg'
          ],
          specifications: {
            processador: 'Intel Core i5 11ª Geração',
            memoria_ram: '8GB DDR4',
            armazenamento: 'SSD 256GB',
            tela: '15.6" Full HD (1920x1080)',
            placa_video: 'Intel UHD Graphics',
            sistema_operacional: 'Windows 11 Home',
            conectividade: 'Wi-Fi 6, Bluetooth 5.1',
            portas: '2x USB 3.2, 1x USB-C, HDMI, Leitor SD'
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
          subcategory_id: 'subcat-999-uuid',
          categories: {
            id: 'cat-111-uuid',
            name: 'Eletrônicos',
            slug: 'eletronicos',
            image_url: 'https://lojafy.6ksfuf.easypanel.host/storage/v1/object/public/product-images/cat-eletronicos.jpg',
            active: true
          },
          subcategories: {
            id: 'subcat-999-uuid',
            name: 'Notebooks',
            slug: 'notebooks'
          },
          supplier: {
            id: 'supplier-789-uuid',
            full_name: 'João Fornecedor da Silva',
            email: 'joao.fornecedor@example.com'
          },
          created_by_user: {
            id: 'admin-456-uuid',
            full_name: 'Admin Sistema Lojafy',
            email: 'admin@lojafy.com'
          },
          created_at: '2025-01-12T10:00:00Z',
          updated_at: '2025-01-12T10:00:00Z'
        },
        {
          id: 'prod-456-uuid',
          name: 'Mouse Gamer RGB Logitech G502',
          description: 'Mouse gamer profissional com sensor HERO 25K, 11 botões programáveis, iluminação RGB personalizável e sistema de pesos ajustáveis.',
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
          image_url: 'https://lojafy.6ksfuf.easypanel.host/storage/v1/object/public/product-images/mouse-logitech-main.jpg',
          main_image_url: 'https://lojafy.6ksfuf.easypanel.host/storage/v1/object/public/product-images/mouse-logitech-main.jpg',
          images: [
            'https://lojafy.6ksfuf.easypanel.host/storage/v1/object/public/product-images/mouse-logitech-1.jpg',
            'https://lojafy.6ksfuf.easypanel.host/storage/v1/object/public/product-images/mouse-logitech-2.jpg'
          ],
          specifications: {
            sensor: 'HERO 25K DPI',
            botoes: '11 programáveis',
            iluminacao: 'RGB LIGHTSYNC',
            conectividade: 'USB com fio',
            peso: '121g (ajustável)',
            compatibilidade: 'Windows, macOS, Linux'
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
          subcategory_id: 'subcat-888-uuid',
          categories: {
            id: 'cat-111-uuid',
            name: 'Eletrônicos',
            slug: 'eletronicos',
            image_url: 'https://lojafy.6ksfuf.easypanel.host/storage/v1/object/public/product-images/cat-eletronicos.jpg',
            active: true
          },
          subcategories: {
            id: 'subcat-888-uuid',
            name: 'Periféricos',
            slug: 'perifericos'
          },
          supplier: {
            id: 'supplier-222-uuid',
            full_name: 'Maria Fornecedora Tech',
            email: 'maria.tech@example.com'
          },
          created_by_user: {
            id: 'admin-456-uuid',
            full_name: 'Admin Sistema Lojafy',
            email: 'admin@lojafy.com'
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
    },
    errorExamples: [
      {
        code: 401,
        title: 'Não Autenticado',
        description: 'API Key ausente ou inválida',
        example: {
          success: false,
          error: 'API key inválida ou ausente',
          code: 401
        }
      },
      {
        code: 403,
        title: 'Sem Permissão',
        description: 'API Key não tem permissão para leitura de produtos',
        example: {
          success: false,
          error: 'Permissão negada para leitura de produtos',
          code: 403
        }
      },
      {
        code: 500,
        title: 'Erro Interno',
        description: 'Erro no servidor ao processar requisição',
        example: {
          success: false,
          error: 'Erro interno do servidor',
          details: 'Database connection timeout',
          code: 500
        }
      }
    ]
  }
];

const AcademyAPI = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <GraduationCap className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Academy API</h1>
          <Badge variant="secondary" className="ml-2">Novo</Badge>
        </div>
        <p className="text-muted-foreground mt-2">
          API completa para integração com a plataforma de cursos Loja Fire Academy. Gerencie cursos, matrículas e progresso de alunos via automações externas.
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Usuários</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Crie e verifique usuários antes de realizar matrículas automatizadas.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Cursos</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Gerencie cursos, consulte detalhes e acesse todo o conteúdo programaticamente.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Matrículas</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Crie, verifique, cancele e gerencie validade de matrículas via API.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Progresso</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Acompanhe e atualize o progresso detalhado de cada aluno em tempo real.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Produtos</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Consulte produtos aguardando aprovação com todas as informações.
            </p>
          </CardContent>
        </Card>
      </div>

      <Separator />

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
            <span className="font-mono text-sm">https://lojafy.6ksfuf.easypanel.host</span>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Endpoints por Categoria */}
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="courses">Cursos</TabsTrigger>
          <TabsTrigger value="enrollments">Matrículas</TabsTrigger>
          <TabsTrigger value="progress">Progresso</TabsTrigger>
          <TabsTrigger value="products">Produtos</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <EndpointSection
            title="Gestão de Usuários"
            description="Endpoints para criar e verificar usuários antes de matricular"
            endpoints={userEndpoints}
          />
        </TabsContent>

        <TabsContent value="courses" className="space-y-6">
          <EndpointSection
            title="Gestão de Cursos"
            description="Endpoints para criar, listar e consultar detalhes de cursos da Academy"
            endpoints={courseEndpoints}
          />
        </TabsContent>

        <TabsContent value="enrollments" className="space-y-6">
          <EndpointSection
            title="Gestão de Matrículas"
            description="Endpoints para matricular, verificar, cancelar e gerenciar validade de matrículas"
            endpoints={enrollmentEndpoints}
          />
        </TabsContent>

        <TabsContent value="progress" className="space-y-6">
          <EndpointSection
            title="Gestão de Progresso"
            description="Endpoints para atualizar e consultar progresso dos alunos"
            endpoints={progressEndpoints}
          />
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="text-base">📋 Campos Retornados</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <strong>Identificação:</strong> id, sku, gtin_ean13, name, brand
                </div>
                <div>
                  <strong>Preços:</strong> price, original_price, cost_price
                </div>
                <div>
                  <strong>Estoque:</strong> stock_quantity, min_stock_level, low_stock_alert
                </div>
                <div>
                  <strong>Status:</strong> approval_status, active, requires_approval
                </div>
                <div>
                  <strong>Aprovação:</strong> rejection_reason, approved_by, approved_at, rejected_at
                </div>
                <div>
                  <strong>Mídia:</strong> image_url, main_image_url, images[]
                </div>
                <div>
                  <strong>Dimensões:</strong> height, width, length, weight
                </div>
                <div>
                  <strong>Relacionamentos:</strong> supplier, categories, subcategories, created_by_user
                </div>
                <div>
                  <strong>Especificações:</strong> specifications (JSON object)
                </div>
                <div>
                  <strong>Marketing:</strong> badge, rating, review_count, featured, high_rotation
                </div>
              </div>
            </CardContent>
          </Card>
          
          <EndpointSection
            title="Gestão de Produtos"
            description="Endpoints para consultar produtos aguardando aprovação com informações completas"
            endpoints={productEndpoints}
          />
        </TabsContent>
      </Tabs>

      {/* Casos de Uso */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle>💡 Casos de Uso</CardTitle>
          <CardDescription>
            Exemplos de como usar a Academy API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">1. Fluxo Completo de Matrícula via N8N</h4>
            <p className="text-sm text-muted-foreground">
              <strong>Webhook recebe pagamento confirmado</strong> → Verifica se usuário existe (api-usuarios-verificar) → 
              Se não existe, cria usuário (api-usuarios-cadastrar) → Verifica se já está matriculado (api-matriculas-verificar) → 
              Matricula no curso (api-matriculas-cadastrar) → Envia email de boas-vindas com acesso.
            </p>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <h4 className="font-medium">2. Renovação Automática de Matrículas</h4>
            <p className="text-sm text-muted-foreground">
              Use o endpoint api-matriculas-atualizar-validade para estender automaticamente o acesso dos alunos após renovações de assinatura ou novos pagamentos.
            </p>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <h4 className="font-medium">3. Relatórios Personalizados</h4>
            <p className="text-sm text-muted-foreground">
              Combine api-cursos-detalhe, api-matriculas-listar e api-progresso-usuario para gerar dashboards e relatórios externos com estatísticas completas de seus cursos.
            </p>
          </div>

          <Separator />
          
          <div className="space-y-2">
            <h4 className="font-medium">4. Gestão de Acesso por Período</h4>
            <p className="text-sm text-muted-foreground">
              Configure sistemas de assinatura mensal/anual usando api-matriculas-cadastrar com expires_at definido, e cancele automaticamente com api-matriculas-cancelar quando necessário.
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="font-medium">5. Integração de Aprovação de Produtos</h4>
            <p className="text-sm text-muted-foreground">
              <strong>Sistema externo monitora produtos pendentes</strong> → 
              Lista produtos com api-produtos-aguardando-aprovacao → 
              Aplica regras de negócio automatizadas → 
              Aprova ou rejeita via webhook/API → 
              Notifica fornecedor automaticamente → 
              Atualiza catálogo em tempo real.
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200 dark:border-blue-800 mt-2">
              <p className="text-xs text-blue-900 dark:text-blue-300">
                💡 <strong>Dica:</strong> Use o filtro <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">supplier_id</code>
                {' '}para criar dashboards específicos por fornecedor e automatizar fluxos de aprovação baseados em histórico e performance.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcademyAPI;
