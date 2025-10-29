import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Users, DollarSign, Award, Bell } from 'lucide-react';

export const AcademySettings = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Níveis de Acesso
          </CardTitle>
          <CardDescription>
            Configure quem pode acessar cada curso da plataforma
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>All (Todos)</Label>
              <p className="text-sm text-muted-foreground">
                Cursos acessíveis para todos os tipos de usuários
              </p>
              <Badge variant="secondary">Padrão</Badge>
            </div>

            <div className="space-y-2">
              <Label>Customer (Clientes)</Label>
              <p className="text-sm text-muted-foreground">
                Cursos exclusivos para clientes cadastrados
              </p>
            </div>

            <div className="space-y-2">
              <Label>Reseller (Revendedores)</Label>
              <p className="text-sm text-muted-foreground">
                Treinamentos e cursos para revendedores
              </p>
            </div>

            <div className="space-y-2">
              <Label>Supplier (Fornecedores)</Label>
              <p className="text-sm text-muted-foreground">
                Conteúdo específico para fornecedores
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Configurações de Preços
          </CardTitle>
          <CardDescription>
            Defina políticas de precificação para os cursos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Cursos Gratuitos</p>
                <p className="text-sm text-muted-foreground">
                  Defina price = 0 para oferecer cursos sem custo
                </p>
              </div>
              <Badge>Ativo</Badge>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Cursos Pagos</p>
                <p className="text-sm text-muted-foreground">
                  Integração com checkout para cursos premium
                </p>
              </div>
              <Badge variant="secondary">Disponível</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Certificados
          </CardTitle>
          <CardDescription>
            Sistema de certificação para cursos concluídos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-6 border border-dashed rounded-lg text-center">
            <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Funcionalidade de certificados em desenvolvimento
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Em breve você poderá gerar certificados automáticos para alunos que concluírem os cursos
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações Automáticas
          </CardTitle>
          <CardDescription>
            Configure alertas para alunos matriculados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Nova Aula Publicada</p>
                <p className="text-sm text-muted-foreground">
                  Alunos matriculados recebem notificação quando uma nova aula é publicada
                </p>
              </div>
              <Badge>Ativo</Badge>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Curso Concluído</p>
                <p className="text-sm text-muted-foreground">
                  Notificação automática ao completar 100% do curso
                </p>
              </div>
              <Badge>Ativo</Badge>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Lembrete de Progresso</p>
                <p className="text-sm text-muted-foreground">
                  Enviar lembretes para alunos que não acessam o curso há 7 dias
                </p>
              </div>
              <Badge variant="secondary">Em Desenvolvimento</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
