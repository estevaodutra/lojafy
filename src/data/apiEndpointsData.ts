// API Endpoints Data - Organized by category for the API Documentation page

export interface EndpointData {
  title: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  description: string;
  headers?: Array<{
    name: string;
    description: string;
    example: string;
    required: boolean;
  }>;
  requestBody?: any;
  queryParams?: Array<{
    name: string;
    description: string;
    example: string;
    required?: boolean;
  }>;
  responseExample: any;
  errorExamples?: Array<{
    code: number;
    title: string;
    description: string;
    example: any;
  }>;
}

export interface EndpointSubcategory {
  id: string;
  title: string;
  endpoints: EndpointData[];
}

export interface EndpointCategory {
  id: string;
  title: string;
  endpoints?: EndpointData[];
  subcategories?: EndpointSubcategory[];
}

// Catalog Endpoints
const catalogEndpoints: EndpointData[] = [
  {
    title: 'Cadastrar Produto',
    method: 'POST',
    url: '/functions/v1/api-produtos-cadastrar',
    description: 'Cria um novo produto no sistema com suporte completo a preços promocionais, controle de estoque e dimensões.',
    requestBody: {
      nome: 'Colete Postural',
      descricao: 'Colete para correção de postura',
      preco: 15.49,
      estoque: 50,
      categoria_id: 'uuid-categoria'
    },
    responseExample: {
      success: true,
      message: 'Produto criado com sucesso',
      data: { id: 'prod123', nome: 'Colete Postural' }
    }
  },
  {
    title: 'Listar Produtos',
    method: 'GET',
    url: '/functions/v1/api-produtos-listar',
    description: 'Retorna a lista de produtos com paginação e filtros opcionais.',
    queryParams: [
      { name: 'page', description: 'Página (padrão: 1)', example: '1' },
      { name: 'limit', description: 'Itens por página (máx: 100)', example: '20' },
      { name: 'search', description: 'Buscar por nome ou SKU', example: 'tênis' }
    ],
    responseExample: {
      success: true,
      data: [{ id: 'prod123', nome: 'Tênis Esportivo', preco: 199.90 }],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1 }
    }
  },
  {
    title: 'Produtos Aguardando Aprovação',
    method: 'GET',
    url: '/functions/v1/api-produtos-aguardando-aprovacao',
    description: 'Retorna todos os produtos com status "pending_approval" para gestão de aprovação.',
    queryParams: [
      { name: 'page', description: 'Número da página', example: '1' },
      { name: 'supplier_id', description: 'Filtrar por fornecedor', example: 'uuid' }
    ],
    responseExample: {
      success: true,
      data: [],
      summary: { total_aguardando: 0 }
    }
  },
  {
    title: 'Listar Categorias',
    method: 'GET',
    url: '/functions/v1/api-categorias-listar',
    description: 'Retorna a lista de categorias disponíveis.',
    queryParams: [
      { name: 'active', description: 'Filtrar por status ativo', example: 'true' }
    ],
    responseExample: {
      success: true,
      data: [{ id: 'cat123', nome: 'Calçados', slug: 'calcados' }]
    }
  },
  {
    title: 'Cadastrar Categoria',
    method: 'POST',
    url: '/functions/v1/api-categorias-cadastrar',
    description: 'Cria uma nova categoria no sistema.',
    requestBody: {
      nome: 'Eletrônicos',
      icone: 'Smartphone',
      cor: '#10B981'
    },
    responseExample: {
      success: true,
      message: 'Categoria criada com sucesso',
      data: { id: 'cat456', nome: 'Eletrônicos' }
    }
  },
  {
    title: 'Listar Subcategorias',
    method: 'GET',
    url: '/functions/v1/api-subcategorias-listar',
    description: 'Retorna todas as subcategorias ou de uma categoria específica.',
    queryParams: [
      { name: 'category_id', description: 'ID da categoria pai', example: 'cat123' }
    ],
    responseExample: {
      success: true,
      data: [{ id: 'subcat123', nome: 'Tênis Esportivo' }]
    }
  },
  {
    title: 'Cadastrar Subcategoria',
    method: 'POST',
    url: '/functions/v1/api-subcategorias-cadastrar',
    description: 'Cria uma nova subcategoria dentro de uma categoria.',
    requestBody: {
      nome: 'Tênis Esportivo',
      category_id: 'cat123'
    },
    responseExample: {
      success: true,
      message: 'Subcategoria criada com sucesso'
    }
  }
];

// Orders Endpoints
const ordersEndpoints: EndpointData[] = [
  {
    title: 'Top 10 Produtos',
    method: 'GET',
    url: '/functions/v1/api-top-produtos',
    description: 'Retorna os produtos mais vendidos com métricas de vendas.',
    queryParams: [
      { name: 'limit', description: 'Número de produtos (máx: 50)', example: '10' },
      { name: 'period', description: 'Período (7d ou 30d)', example: '7d' }
    ],
    responseExample: {
      success: true,
      data: [{ id: 'prod123', nome: 'Smartphone', vendas_totais: 45 }]
    }
  },
  {
    title: 'Pedidos Recentes',
    method: 'GET',
    url: '/functions/v1/api-pedidos-recentes',
    description: 'Retorna os pedidos mais recentes processados.',
    queryParams: [
      { name: 'limit', description: 'Número de pedidos (máx: 100)', example: '15' }
    ],
    responseExample: {
      success: true,
      data: [{ numero_pedido: 'ORD-123', status: 'confirmed' }]
    }
  },
  {
    title: 'Listar Pedidos Completos',
    method: 'GET',
    url: '/functions/v1/api-pedidos-listar',
    description: 'Retorna lista completa de pedidos com todos os detalhes.',
    queryParams: [
      { name: 'period', description: 'Período: today, 7days, 30days', example: '7days' },
      { name: 'status', description: 'Filtrar por status', example: 'confirmed' }
    ],
    responseExample: {
      success: true,
      data: [],
      pagination: { page: 1, total: 0 }
    }
  }
];

// Ranking/Demo Endpoints
const rankingEndpoints: EndpointData[] = [
  {
    title: 'Cadastrar Pedido Demo',
    method: 'POST',
    url: '/functions/v1/api-demo-pedidos-cadastrar',
    description: 'Cria um novo pedido demo para simulação de vendas.',
    requestBody: {
      demo_user_id: 'user123',
      items: [{ product_id: 'prod123', quantity: 2, unit_price: 149.95 }],
      status: 'confirmed'
    },
    responseExample: {
      success: true,
      data: { id: 'demo_order123', numero_pedido: 'DEMO-123' }
    }
  },
  {
    title: 'Cadastrar Usuário Demo',
    method: 'POST',
    url: '/functions/v1/api-demo-usuarios-cadastrar',
    description: 'Cria um novo usuário demo para simulação.',
    requestBody: {
      first_name: 'João',
      last_name: 'Santos',
      email: 'joao@email.com'
    },
    responseExample: {
      success: true,
      data: { id: 'demo_user456' }
    }
  },
  {
    title: 'Cadastrar Produto no Ranking',
    method: 'POST',
    url: '/functions/v1/api-ranking-produto-cadastrar',
    description: 'Cadastra ou atualiza a posição de um produto no ranking.',
    requestBody: {
      posicao: '1',
      sku: 'SKU-001',
      media_de_venda: 10.99
    },
    responseExample: {
      success: true,
      data: { produto_id: 'prod456', posicao: 1 }
    }
  }
];

// Academy Endpoints - Subcategories
const academyUserEndpoints: EndpointData[] = [
  {
    title: 'Verificar Usuário',
    method: 'GET',
    url: '/functions/v1/api-usuarios-verificar',
    description: 'Verifica se um usuário existe na plataforma.',
    queryParams: [
      { name: 'email', description: 'Email do usuário', example: 'aluno@email.com', required: true }
    ],
    responseExample: {
      success: true,
      exists: true,
      data: { user_id: 'user123', email: 'aluno@email.com' }
    }
  },
  {
    title: 'Cadastrar Usuário',
    method: 'POST',
    url: '/functions/v1/api-usuarios-cadastrar',
    description: 'Cria um novo usuário na plataforma.',
    requestBody: {
      email: 'novo@email.com',
      full_name: 'Maria Santos',
      password: 'senhaSegura123!'
    },
    responseExample: {
      success: true,
      message: 'Usuário criado com sucesso'
    }
  },
  {
    title: 'Listar Usuários',
    method: 'GET',
    url: '/functions/v1/api-usuarios-listar',
    description: 'Lista todos os usuários com filtros.',
    queryParams: [
      { name: 'role', description: 'Filtrar por role', example: 'reseller' },
      { name: 'search', description: 'Buscar por nome ou email', example: 'joao' }
    ],
    responseExample: {
      success: true,
      data: [],
      pagination: { page: 1, total: 0 }
    }
  },
  {
    title: 'Alterar Role do Usuário',
    method: 'POST',
    url: '/functions/v1/api-usuarios-alterar-role',
    description: 'Altera a role (função) de um usuário.',
    requestBody: {
      user_id: 'uuid-usuario',
      new_role: 'reseller'
    },
    responseExample: {
      success: true,
      message: 'Role atualizada com sucesso'
    }
  }
];

const academyCourseEndpoints: EndpointData[] = [
  {
    title: 'Listar Cursos',
    method: 'GET',
    url: '/functions/v1/api-cursos-listar',
    description: 'Retorna a lista de cursos disponíveis na Academy.',
    queryParams: [
      { name: 'is_published', description: 'Filtrar por publicado', example: 'true' }
    ],
    responseExample: {
      success: true,
      data: [{ id: 'course123', title: 'Fundamentos de E-commerce' }]
    }
  },
  {
    title: 'Cadastrar Curso',
    method: 'POST',
    url: '/functions/v1/api-cursos-cadastrar',
    description: 'Cria um novo curso na plataforma.',
    requestBody: {
      title: 'Marketing Digital',
      description: 'Domine as estratégias de marketing',
      instructor_name: 'Maria Santos'
    },
    responseExample: {
      success: true,
      message: 'Curso criado com sucesso'
    }
  },
  {
    title: 'Detalhe do Curso',
    method: 'GET',
    url: '/functions/v1/api-cursos-detalhe',
    description: 'Retorna informações completas de um curso.',
    queryParams: [
      { name: 'course_id', description: 'ID do curso', example: 'course456', required: true }
    ],
    responseExample: {
      success: true,
      data: { id: 'course456', title: 'Marketing Digital' }
    }
  },
  {
    title: 'Conteúdo do Curso',
    method: 'GET',
    url: '/functions/v1/api-cursos-conteudo',
    description: 'Lista todos os módulos e aulas de um curso.',
    queryParams: [
      { name: 'course_id', description: 'ID do curso', example: 'course456', required: true }
    ],
    responseExample: {
      success: true,
      data: { modules: [], summary: { total_modules: 0 } }
    }
  }
];

const academyEnrollmentEndpoints: EndpointData[] = [
  {
    title: 'Listar Matrículas',
    method: 'GET',
    url: '/functions/v1/api-matriculas-listar',
    description: 'Retorna todas as matrículas com informações do curso.',
    queryParams: [
      { name: 'user_id', description: 'Filtrar por usuário', example: 'user123' },
      { name: 'course_id', description: 'Filtrar por curso', example: 'course456' }
    ],
    responseExample: {
      success: true,
      data: []
    }
  },
  {
    title: 'Matricular Usuário',
    method: 'POST',
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
    method: 'GET',
    url: '/functions/v1/api-matriculas-verificar',
    description: 'Verifica se um usuário está matriculado.',
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
    method: 'DELETE',
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
    method: 'PUT',
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

const academyProgressEndpoints: EndpointData[] = [
  {
    title: 'Atualizar Progresso',
    method: 'POST',
    url: '/functions/v1/api-progresso-atualizar',
    description: 'Atualiza ou cria o progresso de uma aula.',
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
    method: 'GET',
    url: '/functions/v1/api-progresso-usuario',
    description: 'Retorna o progresso completo do usuário.',
    queryParams: [
      { name: 'user_id', description: 'ID do usuário', example: 'user123' }
    ],
    responseExample: {
      success: true,
      data: []
    }
  }
];

// Features Endpoints
const featuresEndpoints: EndpointData[] = [
  {
    title: 'Listar Features',
    method: 'GET',
    url: '/functions/v1/api-features-listar',
    description: 'Retorna a lista de features disponíveis no catálogo com contagem de usuários ativos.',
    headers: [
      { name: 'X-API-Key', description: 'Chave de API', example: 'sk_...', required: true }
    ],
    queryParams: [
      { name: 'active', description: 'Filtrar por status ativo', example: 'true' },
      { name: 'categoria', description: 'Filtrar por categoria (loja, recursos, acessos, geral)', example: 'loja' }
    ],
    responseExample: {
      success: true,
      data: [
        {
          id: 'uuid',
          slug: 'loja_propria',
          nome: 'Loja Completa',
          descricao: 'Permite criar e gerenciar uma loja personalizada',
          icone: 'Store',
          categoria: 'loja',
          ativo: true,
          preco_mensal: 49.90,
          preco_anual: 479.00,
          trial_dias: 7,
          usuarios_ativos: 15
        }
      ],
      summary: {
        total: 2,
        por_categoria: { loja: 1, recursos: 1 }
      },
      expiracao_info: {
        nota: 'A expiração das features é controlada por profiles.subscription_expires_at',
        excecoes: ['vitalicio', 'cortesia']
      }
    },
    errorExamples: [
      { code: 401, title: 'API Key inválida', description: 'Chave não fornecida ou inativa', example: { success: false, error: 'API Key inválida ou inativa' } },
      { code: 403, title: 'Sem permissão', description: 'API Key sem permissão features.read', example: { success: false, error: 'Permissão features.read não concedida' } }
    ]
  },
  {
    title: 'Atribuir Feature',
    method: 'POST',
    url: '/functions/v1/api-features-atribuir',
    description: 'Atribui uma feature a um usuário. A expiração é controlada pela data do perfil do usuário (subscription_expires_at). Períodos vitalício e cortesia nunca expiram.',
    headers: [
      { name: 'X-API-Key', description: 'Chave de API', example: 'sk_...', required: true }
    ],
    requestBody: {
      user_id: 'uuid-do-usuario',
      feature_slug: 'loja_propria',
      tipo_periodo: 'mensal',
      motivo: 'Parceria comercial',
      _nota: 'tipo_periodo define classificação, não data de expiração individual'
    },
    responseExample: {
      success: true,
      message: 'Feature atribuída com sucesso',
      data: {
        user_id: 'uuid',
        feature_slug: 'loja_propria',
        status: 'ativo',
        tipo_periodo: 'mensal',
        data_inicio: '2026-01-29T00:00:00Z',
        usa_expiracao_perfil: true,
        expiracao_perfil: '2026-02-28T00:00:00Z',
        dias_restantes: 30
      },
      expiracao_info: {
        fonte: 'profiles.subscription_expires_at',
        nota: 'Features expiram junto com a assinatura do perfil',
        excecoes: 'tipo_periodo vitalicio ou cortesia nunca expiram'
      }
    },
    errorExamples: [
      { code: 400, title: 'Parâmetros inválidos', description: 'Campos obrigatórios ausentes', example: { success: false, error: 'Parâmetros obrigatórios: user_id, feature_slug, tipo_periodo' } },
      { code: 400, title: 'Dependência ausente', description: 'Usuário não possui feature requerida', example: { success: false, error: 'Feature requer "academy_acesso" que o usuário não possui' } },
      { code: 404, title: 'Feature não encontrada', description: 'Slug não existe no catálogo', example: { success: false, error: 'Feature não encontrada' } }
    ]
  }
];

// Export organized data structure
export const apiEndpointsData: EndpointCategory[] = [
  {
    id: 'catalog',
    title: 'Catálogo',
    endpoints: catalogEndpoints
  },
  {
    id: 'orders',
    title: 'Pedidos',
    endpoints: ordersEndpoints
  },
  {
    id: 'ranking',
    title: 'Ranking & Demo',
    endpoints: rankingEndpoints
  },
  {
    id: 'features',
    title: 'Features',
    endpoints: featuresEndpoints
  },
  {
    id: 'academy',
    title: 'Academy',
    subcategories: [
      { id: 'academy-users', title: 'Usuários', endpoints: academyUserEndpoints },
      { id: 'academy-courses', title: 'Cursos', endpoints: academyCourseEndpoints },
      { id: 'academy-enrollments', title: 'Matrículas', endpoints: academyEnrollmentEndpoints },
      { id: 'academy-progress', title: 'Progresso', endpoints: academyProgressEndpoints }
    ]
  }
];
