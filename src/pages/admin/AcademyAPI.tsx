import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EndpointSection } from '@/components/admin/EndpointSection';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Shield, GraduationCap, BookOpen, Award } from 'lucide-react';

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Gestão de Cursos</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Crie, liste e gerencie cursos com múltiplos níveis de acesso e publicação.
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
              Matricule usuários em cursos e gerencie acessos com data de expiração opcional.
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
              Acompanhe o progresso detalhado de cada aluno com estatísticas completas.
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
            <span className="font-mono text-sm">https://bbrmjrjorcgsgeztzbsr.supabase.co</span>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Endpoints por Categoria */}
      <Tabs defaultValue="courses" className="space-y-6">
        <TabsList>
          <TabsTrigger value="courses">Cursos</TabsTrigger>
          <TabsTrigger value="enrollments">Matrículas</TabsTrigger>
          <TabsTrigger value="progress">Progresso</TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="space-y-6">
          <EndpointSection
            title="Gestão de Cursos"
            description="Endpoints para criar, listar e gerenciar cursos da Academy"
            endpoints={courseEndpoints}
          />
        </TabsContent>

        <TabsContent value="enrollments" className="space-y-6">
          <EndpointSection
            title="Gestão de Matrículas"
            description="Endpoints para matricular usuários e consultar matrículas"
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
            <h4 className="font-medium">1. Matrícula Automática após Compra</h4>
            <p className="text-sm text-muted-foreground">
              Configure um webhook no N8N para matricular automaticamente usuários em cursos após confirmação de pagamento via Mercado Pago.
            </p>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <h4 className="font-medium">2. Relatórios de Progresso</h4>
            <p className="text-sm text-muted-foreground">
              Use o endpoint de consulta de progresso para gerar relatórios automatizados de desempenho dos alunos e enviar por email.
            </p>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <h4 className="font-medium">3. Sincronização com LMS Externo</h4>
            <p className="text-sm text-muted-foreground">
              Integre com plataformas externas de aprendizagem, sincronizando cursos, matrículas e progresso bidirecionalmente.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcademyAPI;
