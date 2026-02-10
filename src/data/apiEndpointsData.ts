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
    description: 'Atualiza o status de um pedido pelo número do pedido. Valida transições permitidas entre status. Suporta campos opcionais previsao_envio (obrigatório para em_reposicao) e motivo.',
    headers: [
      { name: 'X-API-Key', description: 'Chave de API com permissão pedidos.write', example: 'sk_...', required: true }
    ],
    requestBody: {
      order_number: 'ORD-1769828426038_865529AC',
      status: 'enviado',
      tracking_number: 'BR123456789BR',
      notes: 'Enviado via Correios SEDEX',
      previsao_envio: '2026-02-15 (obrigatório se status = em_reposicao)',
      motivo: 'string (opcional)'
    },
    responseExample: {
      success: true,
      message: 'Status do pedido atualizado com sucesso',
      data: {
        order_id: 'c40b90a5-bed9-4a11-bd34-358909574b57',
        order_number: 'ORD-1769828426038_865529AC',
        previous_status: 'embalado',
        new_status: 'enviado',
        tracking_number: 'BR123456789BR',
        updated_at: '2026-02-02T12:30:00Z'
      },
      _status_disponiveis: 'pendente, recebido, em_preparacao, embalado, enviado, em_reposicao, em_falta, finalizado, cancelado, reembolsado',
      _transicoes: {
        pendente: ['recebido', 'cancelado'],
        recebido: ['em_preparacao', 'em_falta', 'cancelado'],
        em_preparacao: ['embalado', 'em_reposicao', 'em_falta', 'cancelado'],
        embalado: ['enviado', 'em_reposicao', 'cancelado'],
        enviado: ['finalizado', 'cancelado'],
        em_reposicao: ['em_preparacao', 'embalado', 'enviado', 'cancelado'],
        em_falta: ['cancelado', 'reembolsado'],
        finalizado: ['reembolsado'],
        cancelado: ['reembolsado'],
      }
    },
    errorExamples: [
      { code: 400, title: 'Campos obrigatórios', description: 'order_number ou status não informados', example: { success: false, error: 'order_number e status são obrigatórios' } },
      { code: 400, title: 'Status inválido', description: 'Status não está na lista permitida', example: { success: false, error: 'Status inválido. Use: pendente, recebido, em_preparacao, embalado, enviado, em_reposicao, em_falta, finalizado, cancelado, reembolsado' } },
      { code: 400, title: 'Transição inválida', description: 'Transição de status não permitida', example: { success: false, error: 'Transição não permitida: pendente → finalizado. Transições válidas: recebido, cancelado' } },
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
  },
  {
    title: 'Gerar Link de Primeiro Acesso',
    method: 'POST',
    url: '/functions/v1/api-link-acesso-gerar',
    description: 'Gera um link de acesso único para o usuário. O link permite login automático e direciona para a trilha de primeiro acesso. Validade máxima de 7 dias.',
    headers: [
      { name: 'X-API-Key', description: 'Chave de API com permissão usuarios.write', example: 'sk_...', required: true }
    ],
    requestBody: {
      user_id: 'uuid-do-usuario',
      redirect_url: '/reseller/first-access',
      expires_hours: 24,
      _nota: 'redirect_url e expires_hours são opcionais. Máximo 168h (7 dias)'
    },
    responseExample: {
      success: true,
      data: {
        link: 'https://lojafy.lovable.app/auth/onetime?token=abc123-uuid',
        token: 'abc123-uuid',
        expires_at: '2026-02-06T12:00:00Z',
        expires_hours: 24,
        redirect_url: '/reseller/first-access',
        user: {
          id: 'uuid-do-usuario',
          name: 'Nome do Usuário'
        }
      }
    },
    errorExamples: [
      { code: 400, title: 'user_id ausente', description: 'Campo obrigatório não informado', example: { success: false, error: 'user_id é obrigatório' } },
      { code: 401, title: 'API Key inválida', description: 'Chave não fornecida ou inativa', example: { success: false, error: 'API Key inválida ou inativa' } },
      { code: 403, title: 'Sem permissão', description: 'API Key sem permissão usuarios.write', example: { success: false, error: 'Permissão usuarios.write não concedida' } },
      { code: 404, title: 'Usuário não encontrado', description: 'user_id não existe no sistema', example: { success: false, error: 'Usuário não encontrado' } }
    ]
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

// Lojafy Integra - Mercado Livre Endpoints
const integraMLEndpoints: EndpointData[] = [
  {
    title: 'Salvar Token OAuth',
    method: 'POST',
    url: '/functions/v1/api-integra-ml-token',
    description: 'Recebe e armazena os tokens OAuth do Mercado Livre após o fluxo de autorização. Este endpoint é chamado pelo n8n após o callback do Mercado Livre.',
    headers: [
      { name: 'X-API-Key', description: 'Chave de API com permissão integracoes.write', example: 'sk_...', required: true }
    ],
    requestBody: {
      lojafy_user_id: 'uuid-do-usuario-lojafy',
      access_token: 'APP_USR-2003351424267574-...',
      token_type: 'Bearer',
      expires_in: 21600,
      scope: 'read write ...',
      user_id: 395399092,
      refresh_token: 'TG-...'
    },
    responseExample: {
      success: true,
      message: 'Integração Mercado Livre salva com sucesso',
      data: {
        integration_id: 'uuid',
        lojafy_user_id: 'uuid',
        ml_user_id: 395399092,
        expires_at: '2026-02-06T06:00:00Z',
        is_active: true
      }
    },
    errorExamples: [
      { code: 400, title: 'lojafy_user_id ausente', description: 'ID do usuário Lojafy não fornecido', example: { success: false, error: 'Campo obrigatório: lojafy_user_id' } },
      { code: 400, title: 'access_token ausente', description: 'Token de acesso não fornecido', example: { success: false, error: 'Campo obrigatório: access_token' } },
      { code: 400, title: 'user_id ML ausente', description: 'ID do usuário no Mercado Livre não fornecido', example: { success: false, error: 'Campo obrigatório: user_id (ID do Mercado Livre)' } },
      { code: 401, title: 'API Key inválida', description: 'Chave não fornecida ou inativa', example: { success: false, error: 'API Key inválida' } },
      { code: 403, title: 'Sem permissão', description: 'API Key sem permissão integracoes.write', example: { success: false, error: 'Permissão insuficiente. Requer: integracoes.write' } }
    ]
  }
  ,
  {
    title: 'Listar Tokens Expirando',
    method: 'GET',
    url: '/functions/v1/lojafy-integra/mercadolivre/expiring-tokens',
    description: 'Lista todas as integrações ativas do Mercado Livre cujos tokens estão próximos de expirar. Retorna os dados necessários (incluindo refresh_token) para que o n8n possa renovar os tokens automaticamente. O n8n executa este endpoint a cada 5 horas para garantir que os tokens (ciclo de 6h do ML) estejam sempre válidos.',
    headers: [
      { name: 'X-API-Key', description: 'Chave de API com permissão integracoes.write', example: 'sk_...', required: true }
    ],
    queryParams: [
      { name: 'minutes', description: 'Buscar tokens que expiram nos próximos X minutos (default: 60)', example: '90', required: false },
      { name: 'include_expired', description: 'Incluir tokens já expirados na lista (default: false)', example: 'true', required: false }
    ],
    responseExample: {
      success: true,
      data: [
        {
          id: 'abc-123-def-456',
          user_id: '02e09339-0ebb-4fe4-a816-b8aca7294e16',
          ml_user_id: 1253724320,
          refresh_token: 'TG-69862b0ccbcccce00017dd04b-1253724320',
          expires_at: '2026-02-07T14:30:00.000Z',
          is_active: true,
          minutes_until_expiration: 45,
          is_expired: false
        },
        {
          id: 'xyz-789-ghi-012',
          user_id: '11111111-2222-3333-4444-555555555555',
          ml_user_id: 9876543210,
          refresh_token: 'TG-aaaabbbbccccdddd-9876543210',
          expires_at: '2026-02-07T14:15:00.000Z',
          is_active: true,
          minutes_until_expiration: 30,
          is_expired: false
        }
      ],
      count: 2,
      checked_at: '2026-02-07T13:45:00.000Z',
      threshold_minutes: 60
    },
    errorExamples: [
      { code: 200, title: 'Nenhum token expirando', description: 'Todos os tokens estão válidos', example: { success: true, data: [], count: 0, checked_at: '2026-02-07T13:45:00.000Z', threshold_minutes: 60 } },
      { code: 401, title: 'API Key inválida', description: 'Chave não fornecida ou inativa', example: { success: false, error: 'API Key inválida ou desativada' } }
    ]
  }
];

// Lojafy Integra - Produtos Marketplace Endpoints
const integraProductsEndpoints: EndpointData[] = [
  {
    title: 'Criar Produto para Marketplace',
    method: 'POST',
    url: '/functions/v1/lojafy-integra/products',
    description: 'Cria um produto customizado para um marketplace específico. Permite definir título, preço, atributos e variações diferentes do produto original da Lojafy.',
    headers: [
      { name: 'X-API-Key', description: 'Chave de API com permissão integracoes.write', example: 'sk_...', required: true }
    ],
    requestBody: {
      product_id: 'uuid-do-produto-lojafy',
      marketplace: 'mercadolivre',
      title: 'Mini Máquina de Waffles Elétrica Antiaderente 110V',
      description: 'Máquina compacta para waffles perfeitos...',
      price: 29.90,
      attributes: { BRAND: 'Genérica', VOLTAGE: '110V', MODEL: 'WF-100' },
      variations: [
        { sku: 'WF-100-PINK', attributes: { COLOR: 'Rosa' }, stock_quantity: 25, price: 29.90 }
      ],
      stock_quantity: 50,
      images: ['https://exemplo.com/waffle1.jpg', 'https://exemplo.com/waffle2.jpg'],
      status: 'draft',
      listing_type: 'gold_special'
    },
    responseExample: {
      success: true,
      data: {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        product_id: 'uuid-do-produto-lojafy',
        marketplace: 'mercadolivre',
        title: 'Mini Máquina de Waffles Elétrica Antiaderente 110V',
        price: 29.90,
        status: 'draft',
        created_at: '2026-02-07T15:30:00Z'
      }
    },
    errorExamples: [
      { code: 400, title: 'Campos obrigatórios', description: 'product_id, marketplace, title ou price ausentes', example: { success: false, error: 'Campos obrigatórios: product_id, marketplace, title, price' } },
      { code: 400, title: 'Preço inválido', description: 'Preço deve ser maior que zero', example: { success: false, error: 'price deve ser maior que 0' } },
      { code: 404, title: 'Produto não encontrado', description: 'product_id não existe na tabela products', example: { success: false, error: 'Produto não encontrado na base Lojafy' } },
      { code: 409, title: 'Duplicado', description: 'Produto já cadastrado neste marketplace', example: { success: false, error: 'Este produto já possui cadastro para o marketplace mercadolivre' } }
    ]
  },
  {
    title: 'Criar Produtos em Lote',
    method: 'POST',
    url: '/functions/v1/lojafy-integra/products/bulk',
    description: 'Cria múltiplos produtos para marketplaces em uma única requisição. Retorna resultado individual de cada item.',
    headers: [
      { name: 'X-API-Key', description: 'Chave de API com permissão integracoes.write', example: 'sk_...', required: true }
    ],
    requestBody: {
      products: [
        {
          product_id: 'uuid-produto-1',
          marketplace: 'mercadolivre',
          title: 'Produto A para ML',
          price: 49.90,
          stock_quantity: 100,
          status: 'draft'
        },
        {
          product_id: 'uuid-produto-2',
          marketplace: 'shopee',
          title: 'Produto B para Shopee',
          price: 39.90,
          stock_quantity: 200,
          status: 'draft'
        }
      ]
    },
    responseExample: {
      success: true,
      data: {
        total: 2,
        created: 2,
        errors: 0,
        results: [
          { index: 0, success: true, data: { id: 'uuid-1', marketplace: 'mercadolivre' } },
          { index: 1, success: true, data: { id: 'uuid-2', marketplace: 'shopee' } }
        ]
      }
    },
    errorExamples: [
      { code: 400, title: 'Array vazio', description: 'Nenhum produto enviado', example: { success: false, error: 'products deve ser um array com pelo menos 1 item' } }
    ]
  },
  {
    title: 'Listar Produtos por Marketplace',
    method: 'GET',
    url: '/functions/v1/lojafy-integra/products',
    description: 'Lista produtos cadastrados para marketplaces com filtros e paginação.',
    headers: [
      { name: 'X-API-Key', description: 'Chave de API com permissão integracoes.read', example: 'sk_...', required: true }
    ],
    queryParams: [
      { name: 'marketplace', description: 'Filtrar por marketplace', example: 'mercadolivre' },
      { name: 'status', description: 'Filtrar por status (draft, active, paused, etc.)', example: 'active' },
      { name: 'user_id', description: 'Filtrar por usuário', example: 'uuid-do-usuario' },
      { name: 'page', description: 'Página (padrão: 1)', example: '1' },
      { name: 'limit', description: 'Itens por página (padrão: 50, máx: 100)', example: '20' }
    ],
    responseExample: {
      success: true,
      data: [
        {
          id: 'uuid',
          product_id: 'uuid-produto',
          marketplace: 'mercadolivre',
          title: 'Mini Máquina de Waffles',
          price: 29.90,
          status: 'active',
          listing_id: 'MLB-123456789'
        }
      ],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1 }
    },
    errorExamples: [
      { code: 401, title: 'API Key inválida', description: 'Chave não fornecida ou inativa', example: { success: false, error: 'API Key inválida' } }
    ]
  },
  {
    title: 'Buscar Produto por ID',
    method: 'GET',
    url: '/functions/v1/lojafy-integra/products/:id',
    description: 'Retorna os dados completos de um produto marketplace específico, incluindo dados do produto original da Lojafy via join.',
    headers: [
      { name: 'X-API-Key', description: 'Chave de API com permissão integracoes.read', example: 'sk_...', required: true }
    ],
    responseExample: {
      success: true,
      data: {
        id: 'uuid-marketplace-product',
        product_id: 'uuid-produto-lojafy',
        marketplace: 'mercadolivre',
        title: 'Mini Máquina de Waffles Elétrica',
        price: 29.90,
        status: 'active',
        listing_id: 'MLB-123456789',
        listing_url: 'https://www.mercadolivre.com.br/...',
        attributes: { BRAND: 'Genérica', VOLTAGE: '110V' },
        variations: [],
        original_product: {
          id: 'uuid-produto-lojafy',
          nome: 'Mini Waffle Maker',
          preco: 24.90,
          sku: 'SKU-WF100'
        }
      }
    },
    errorExamples: [
      { code: 404, title: 'Não encontrado', description: 'ID do produto marketplace não existe', example: { success: false, error: 'Produto marketplace não encontrado' } }
    ]
  },
  {
    title: 'Listar Marketplaces de um Produto',
    method: 'GET',
    url: '/functions/v1/lojafy-integra/products/by-product/:productId',
    description: 'Retorna todos os marketplaces em que um produto Lojafy está cadastrado, com status e dados de cada listagem.',
    headers: [
      { name: 'X-API-Key', description: 'Chave de API com permissão integracoes.read', example: 'sk_...', required: true }
    ],
    responseExample: {
      success: true,
      data: [
        { id: 'uuid-1', marketplace: 'mercadolivre', status: 'active', listing_id: 'MLB-123', price: 29.90 },
        { id: 'uuid-2', marketplace: 'shopee', status: 'draft', listing_id: null, price: 27.90 }
      ]
    },
    errorExamples: [
      { code: 401, title: 'API Key inválida', description: 'Chave não fornecida ou inativa', example: { success: false, error: 'API Key inválida' } }
    ]
  },
  {
    title: 'Atualizar Produto no Marketplace',
    method: 'PUT',
    url: '/functions/v1/lojafy-integra/products/:id',
    description: 'Atualiza os dados de um produto marketplace. Campos imutáveis (id, product_id, created_at) são ignorados.',
    headers: [
      { name: 'X-API-Key', description: 'Chave de API com permissão integracoes.write', example: 'sk_...', required: true }
    ],
    requestBody: {
      title: 'Mini Máquina de Waffles - PROMOÇÃO',
      price: 24.90,
      status: 'active',
      stock_quantity: 30,
      listing_id: 'MLB-123456789',
      listing_url: 'https://www.mercadolivre.com.br/...'
    },
    responseExample: {
      success: true,
      data: {
        id: 'uuid-marketplace-product',
        title: 'Mini Máquina de Waffles - PROMOÇÃO',
        price: 24.90,
        status: 'active',
        updated_at: '2026-02-07T16:00:00Z'
      }
    },
    errorExamples: [
      { code: 404, title: 'Não encontrado', description: 'ID do produto marketplace não existe', example: { success: false, error: 'Produto marketplace não encontrado' } },
      { code: 400, title: 'Sem dados', description: 'Nenhum campo para atualizar', example: { success: false, error: 'Nenhum dado para atualizar' } }
    ]
  },
  {
    title: 'Remover Produto do Marketplace',
    method: 'DELETE',
    url: '/functions/v1/lojafy-integra/products/:id',
    description: 'Remove permanentemente o cadastro de um produto em um marketplace. Esta ação não pode ser desfeita.',
    headers: [
      { name: 'X-API-Key', description: 'Chave de API com permissão integracoes.write', example: 'sk_...', required: true }
    ],
    responseExample: {
      success: true,
      message: 'Produto removido do marketplace com sucesso'
    },
    errorExamples: [
      { code: 404, title: 'Não encontrado', description: 'ID do produto marketplace não existe', example: { success: false, error: 'Produto marketplace não encontrado' } }
    ]
  },
  {
    title: 'Buscar Produto Não Publicado',
    method: 'GET',
    url: '/functions/v1/lojafy-integra/products/unpublished',
    description: 'Retorna 1 produto do catálogo Lojafy que ainda não foi cadastrado na tabela product_marketplace_data para o marketplace informado, junto com as credenciais OAuth ativas do Mercado Livre. Ideal para reprocessamento em lote via n8n ou automações externas — chame em loop até receber data: null.',
    headers: [
      { name: 'X-API-Key', description: 'Chave de API com permissão integracoes.write', example: 'sk_...', required: true }
    ],
    queryParams: [
      { name: 'marketplace', description: 'Marketplace alvo (obrigatório). Ex: mercadolivre, shopee, amazon', example: 'mercadolivre' },
      { name: 'user_id', description: 'Filtrar por usuário (opcional). Se informado, busca a integração OAuth desse usuário; caso contrário, retorna qualquer integração ativa.', example: 'uuid-do-usuario' }
    ],
    responseExample: {
      success: true,
      data: {
        id: 'uuid-produto',
        name: 'Mini Máquina de Waffles Elétrica',
        description: 'Máquina compacta para waffles...',
        price: 24.90,
        sku: 'PROD-001',
        gtin_ean13: '7891234567890',
        main_image_url: 'https://exemplo.com/imagem.jpg',
        brand: 'Genérica',
        stock_quantity: 50,
        category_id: 'uuid-categoria'
      },
      marketplace: 'mercadolivre',
      oauth: {
        user_id: 'uuid-do-usuario',
        access_token: 'APP_USR-123456-abcdef',
        token_type: 'Bearer',
        refresh_token: 'TG-abc123-xyz',
        expires_at: '2026-02-08T12:00:00.000Z',
        ml_user_id: 123456789
      },
      remaining: 'Existem mais produtos pendentes'
    },
    errorExamples: [
      { code: 400, title: 'Marketplace obrigatório', description: 'Parâmetro marketplace não foi informado', example: { success: false, error: 'marketplace é obrigatório' } },
      { code: 200, title: 'Todos publicados', description: 'Todos os produtos já estão cadastrados no marketplace', example: { success: true, data: null, marketplace: 'mercadolivre', oauth: { user_id: 'uuid', access_token: 'APP_USR-...', token_type: 'Bearer', refresh_token: 'TG-...', expires_at: '2026-02-08T12:00:00.000Z', ml_user_id: 123456789 }, remaining: 'Todos os produtos já estão cadastrados' } },
      { code: 200, title: 'Sem integração OAuth', description: 'Nenhuma integração ativa encontrada', example: { success: true, data: { id: 'uuid-produto', name: '...' }, marketplace: 'mercadolivre', oauth: null, remaining: 'Existem mais produtos pendentes' } }
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
  },
  {
    id: 'integra',
    title: 'Lojafy Integra',
    subcategories: [
      { id: 'integra-ml', title: 'Mercado Livre', endpoints: integraMLEndpoints },
      { id: 'integra-products', title: 'Produtos Marketplace', endpoints: integraProductsEndpoints }
    ]
  }
];
