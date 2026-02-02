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
    title: 'Atualizar Status do Pedido',
    method: 'PUT',
    url: '/functions/v1/api-pedidos-atualizar-status',
    description: 'Atualiza o status de um pedido pelo número do pedido. Registra automaticamente no histórico de status.',
    headers: [
      { name: 'X-API-Key', description: 'Chave de API', example: 'sk_...', required: true }
    ],
    requestBody: {
      order_number: 'ORD-1769828426038_865529AC',
      status: 'despachado',
      tracking_number: 'BR123456789BR',
      notes: 'Enviado via Correios SEDEX'
    },
    responseExample: {
      success: true,
      message: 'Status do pedido atualizado com sucesso',
      data: {
        order_id: 'c40b90a5-bed9-4a11-bd34-358909574b57',
        order_number: 'ORD-1769828426038_865529AC',
        previous_status: 'em_preparacao',
        new_status: 'despachado',
        tracking_number: 'BR123456789BR',
        updated_at: '2026-02-02T12:30:00Z'
      },
      _status_disponiveis: 'pendente, em_preparacao, despachado, finalizado, cancelado, reembolsado'
    },
    errorExamples: [
      { code: 400, title: 'Campos obrigatórios', description: 'order_number ou status não informados', example: { success: false, error: 'order_number e status são obrigatórios' } },
      { code: 400, title: 'Status inválido', description: 'Status não está na lista permitida', example: { success: false, error: 'Status inválido. Use: pendente, em_preparacao, despachado, finalizado, cancelado, reembolsado' } },
      { code: 401, title: 'API Key inválida', description: 'Chave não fornecida ou inativa', example: { success: false, error: 'API Key inválida ou inativa' } },
      { code: 403, title: 'Sem permissão', description: 'API Key sem permissão pedidos.write', example: { success: false, error: 'Permissão pedidos.write não concedida' } },
      { code: 404, title: 'Pedido não encontrado', description: 'Número do pedido não existe', example: { success: false, error: 'Pedido não encontrado' } }
    ]
  },
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

// Users Endpoints (standalone category)
const usersEndpoints: EndpointData[] = [
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
    description: 'Cria um novo usuário na plataforma. A data de expiração (subscription_expires_at) controla o acesso a features e cursos. Use subscription_days para definir dias de acesso a partir de hoje, ou subscription_expires_at para data fixa.',
    headers: [
      { name: 'X-API-Key', description: 'Chave de API', example: 'sk_...', required: true }
    ],
    requestBody: {
      email: 'novo@email.com',
      full_name: 'Maria Santos',
      password: 'senhaSegura123!',
      role: 'reseller',
      phone: '11999999999',
      subscription_plan: 'premium',
      subscription_days: 30,
      _nota: 'Use subscription_days OU subscription_expires_at (days tem prioridade)'
    },
    responseExample: {
      success: true,
      message: 'Usuário criado com sucesso',
      data: {
        user_id: 'uuid',
        email: 'novo@email.com',
        full_name: 'Maria Santos',
        role: 'reseller',
        subscription_plan: 'premium',
        subscription_expires_at: '2026-02-28T00:00:00Z',
        subscription_days_granted: 30,
        created_at: '2026-01-29T00:00:00Z'
      }
    },
    errorExamples: [
      { code: 400, title: 'Campos obrigatórios', description: 'Email ou senha não informados', example: { success: false, error: 'email e password são obrigatórios' } },
      { code: 400, title: 'Email duplicado', description: 'Email já está em uso', example: { success: false, error: 'Email já está em uso' } },
      { code: 401, title: 'API Key inválida', description: 'Chave não fornecida ou inativa', example: { success: false, error: 'API key inválida' } }
    ]
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
    description: 'Matricula um usuário em um curso específico ou em todos os cursos publicados (all_courses: true). A validade da matrícula é herdada automaticamente de profiles.subscription_expires_at.',
    requestBody: {
      user_id: 'user123',
      course_id: 'course456',
      all_courses: false,
      _nota: 'Use course_id para curso específico OU all_courses: true para todos. Expiração é herdada do perfil.'
    },
    responseExample: {
      success: true,
      message: 'Matrícula realizada com sucesso',
      data: {
        id: 'enrollment123',
        user_id: 'user123',
        course_id: 'course456',
        expires_at: '2026-02-28T00:00:00Z'
      },
      expiracao_info: {
        fonte: 'profiles.subscription_expires_at',
        expires_at: '2026-02-28T00:00:00Z',
        dias_restantes: 30,
        nota: 'Matrícula expira junto com a assinatura do perfil'
      },
      _exemplo_all_courses: {
        success: true,
        message: 'Matrícula realizada em 5 cursos',
        data: {
          total_enrolled: 5,
          enrolled_courses: [
            { course_id: 'uuid1', title: 'Fundamentos de E-commerce' },
            { course_id: 'uuid2', title: 'Marketing Digital' }
          ],
          skipped_existing: 2
        }
      }
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
    title: 'Atualizar Validade da Assinatura',
    method: 'PUT',
    url: '/functions/v1/api-matriculas-atualizar-validade',
    description: 'Atualiza profiles.subscription_expires_at que controla a expiração global de todas as features e matrículas do usuário. Features vitalício/cortesia não são afetadas.',
    requestBody: {
      user_id: 'uuid-do-usuario',
      subscription_expires_at: '2027-12-31T23:59:59Z',
      _nota: 'Atualiza expiração do perfil e sincroniza com todas as matrículas e features'
    },
    responseExample: {
      success: true,
      message: 'Validade da assinatura atualizada com sucesso',
      data: {
        user_id: 'uuid',
        old_expires_at: '2026-02-28T00:00:00Z',
        new_expires_at: '2027-12-31T23:59:59Z',
        dias_restantes: 700,
        updated_at: '2026-01-30T00:00:00Z'
      },
      sincronizacao: {
        matriculas: 'sincronizado',
        features: 'sincronizado',
        nota: 'Features vitalício/cortesia não são afetadas'
      }
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
    description: 'Atribui feature(s) a um usuário. Aceita feature_id (UUID) ou feature_slug. Use all_features: true para atribuir todas as features ativas em lote. A expiração é controlada pela data do perfil (subscription_expires_at). tipo_periodo é opcional (default: mensal).',
    headers: [
      { name: 'X-API-Key', description: 'Chave de API', example: 'sk_...', required: true }
    ],
    requestBody: {
      user_id: 'uuid-do-usuario',
      feature_id: 'uuid-da-feature (ou vazio se all_features)',
      all_features: 'true para atribuir todas',
      tipo_periodo: 'mensal (opcional)',
      motivo: 'Parceria comercial (opcional)',
      _alternativa: 'feature_slug também é aceito para retrocompatibilidade'
    },
    responseExample: {
      _exemplo_individual: {
        success: true,
        message: 'Feature atribuída com sucesso',
        data: {
          user_id: 'uuid',
          feature_id: 'uuid-da-feature',
          feature_slug: 'loja_propria',
          status: 'ativo',
          tipo_periodo: 'mensal',
          data_inicio: '2026-01-30T00:00:00Z',
          usa_expiracao_perfil: true,
          expiracao_perfil: '2026-02-28T00:00:00Z',
          dias_restantes: 30
        }
      },
      _exemplo_lote: {
        success: true,
        message: '3 feature(s) atribuída(s) com sucesso',
        data: {
          total_assigned: 3,
          assigned_features: [
            { id: 'uuid', slug: 'loja_propria', nome: 'Loja Completa' }
          ],
          skipped_existing: 1,
          skipped_dependencies: []
        },
        expiracao_info: {
          fonte: 'profiles.subscription_expires_at',
          expires_at: '2026-02-28T00:00:00Z',
          dias_restantes: 30
        }
      }
    },
    errorExamples: [
      { code: 400, title: 'user_id ausente', description: 'Campo obrigatório não informado', example: { success: false, error: 'user_id é obrigatório' } },
      { code: 400, title: 'feature_id ausente', description: 'Sem feature_id e all_features não ativo', example: { success: false, error: 'feature_id é obrigatório (ou use all_features: true)' } },
      { code: 400, title: 'Dependência ausente', description: 'Usuário não possui feature requerida', example: { success: false, error: 'Feature requer "academy_acesso" que o usuário não possui' } },
      { code: 404, title: 'Feature não encontrada', description: 'ID ou slug não existe no catálogo', example: { success: false, error: 'Feature não encontrada pelo ID' } }
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
    id: 'users',
    title: 'Usuários',
    endpoints: usersEndpoints
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
      { id: 'academy-courses', title: 'Cursos', endpoints: academyCourseEndpoints },
      { id: 'academy-enrollments', title: 'Matrículas', endpoints: academyEnrollmentEndpoints },
      { id: 'academy-progress', title: 'Progresso', endpoints: academyProgressEndpoints }
    ]
  }
];
