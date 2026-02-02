import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ApiKeyManager } from '@/components/admin/ApiKeyManager';
import { EndpointCard } from '@/components/admin/EndpointCard';
import { CodeBlock } from '@/components/admin/CodeBlock';
import { WebhooksSection } from '@/components/admin/WebhooksSection';
import { ApiLogsSection } from '@/components/admin/ApiLogsSection';
import { Shield, Zap, Globe, FileText, BookOpen, Terminal } from 'lucide-react';

interface EndpointData {
  title: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  description: string;
  headers?: any[];
  requestBody?: any;
  queryParams?: any[];
  responseExample: any;
  errorExamples?: any[];
}

interface ApiDocsContentProps {
  selectedSection: string;
  endpoints: EndpointData[];
}

const IntroSection: React.FC = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-2xl font-bold mb-2">Introdução à API</h2>
      <p className="text-muted-foreground">
        Bem-vindo à documentação da API REST da plataforma. Aqui você encontrará todos os recursos 
        necessários para integrar sistemas externos.
      </p>
    </div>

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

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Terminal className="h-5 w-5" />
          Formato das Requisições
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          <div className="flex items-start gap-3">
            <Badge variant="secondary" className="shrink-0 mt-0.5">Content-Type</Badge>
            <div>
              <p className="font-mono text-sm">application/json</p>
              <p className="text-xs text-muted-foreground">Todas as requisições e respostas usam JSON</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="secondary" className="shrink-0 mt-0.5">Método</Badge>
            <div>
              <p className="text-sm">GET, POST, PUT, DELETE</p>
              <p className="text-xs text-muted-foreground">Depende da operação desejada</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="secondary" className="shrink-0 mt-0.5">Encoding</Badge>
            <div>
              <p className="font-mono text-sm">UTF-8</p>
              <p className="text-xs text-muted-foreground">Suporte completo a caracteres especiais</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Categorias de Endpoints
        </CardTitle>
        <CardDescription>
          A API está organizada nas seguintes categorias principais
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <span className="text-2xl">📦</span>
            <div>
              <p className="font-medium">Catálogo</p>
              <p className="text-xs text-muted-foreground">Produtos, categorias e subcategorias</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <span className="text-2xl">🛒</span>
            <div>
              <p className="font-medium">Pedidos</p>
              <p className="text-xs text-muted-foreground">Vendas e informações financeiras</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <span className="text-2xl">📊</span>
            <div>
              <p className="font-medium">Ranking</p>
              <p className="text-xs text-muted-foreground">Métricas e dados demo</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <span className="text-2xl">🎓</span>
            <div>
              <p className="font-medium">Academy</p>
              <p className="text-xs text-muted-foreground">Cursos e matrículas</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

const AuthSection: React.FC = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-2xl font-bold mb-2">Autenticação</h2>
      <p className="text-muted-foreground">
        Todas as requisições à API devem incluir uma chave de autenticação válida.
      </p>
    </div>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Header de Autenticação
        </CardTitle>
        <CardDescription>
          Inclua sua chave de API em todas as requisições
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted p-4 rounded-lg">
          <p className="font-mono text-sm">
            <span className="text-muted-foreground">Header:</span>{' '}
            <span className="text-primary">X-API-Key</span>: sua_chave_aqui
          </p>
        </div>
        
        <Separator />
        
        <div className="space-y-3">
          <h4 className="font-medium">Exemplo de Requisição</h4>
          <CodeBlock 
            code={`curl -X GET "https://bbrmjrjorcgsgeztzbsr.supabase.co/functions/v1/api-produtos-listar" \\
  -H "X-API-Key: sk_sua_chave_aqui" \\
  -H "Content-Type: application/json"`}
            language="bash"
          />
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Base URL</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">URL Base</Badge>
          <span className="font-mono text-sm break-all">https://bbrmjrjorcgsgeztzbsr.supabase.co</span>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Códigos de Erro de Autenticação</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded border">
            <Badge variant="destructive">401</Badge>
            <div>
              <p className="font-medium">Unauthorized</p>
              <p className="text-sm text-muted-foreground">Chave de API ausente ou inválida</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded border">
            <Badge variant="destructive">403</Badge>
            <div>
              <p className="font-medium">Forbidden</p>
              <p className="text-sm text-muted-foreground">Chave de API não possui permissão para este recurso</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

const KeysSection: React.FC = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-2xl font-bold mb-2">Chaves de API</h2>
      <p className="text-muted-foreground">
        Gerencie suas chaves de API para integração com sistemas externos.
      </p>
    </div>
    <ApiKeyManager />
  </div>
);

export const ApiDocsContent: React.FC<ApiDocsContentProps> = ({
  selectedSection,
  endpoints,
}) => {
  // Static sections
  if (selectedSection === 'intro') {
    return <IntroSection />;
  }

  if (selectedSection === 'auth') {
    return <AuthSection />;
  }

  if (selectedSection === 'keys') {
    return <KeysSection />;
  }

  if (selectedSection === 'webhooks') {
    return <WebhooksSection />;
  }

  if (selectedSection === 'logs') {
    return <ApiLogsSection />;
  }

  // Endpoint sections
  const getCategoryTitle = () => {
    switch (selectedSection) {
      case 'catalog': return { title: 'Endpoints de Catálogo', desc: 'Gerencie produtos, categorias e subcategorias da sua loja' };
      case 'orders': return { title: 'Endpoints de Pedidos', desc: 'Consulte pedidos reais e informações de vendas' };
      case 'ranking': return { title: 'Endpoints de Ranking & Demo', desc: 'Gerencie dados de demonstração e ranking de produtos' };
      case 'academy': return { title: 'Endpoints da Academy', desc: 'API completa para gestão de cursos, matrículas e progresso' };
      default: return { title: 'Endpoints', desc: '' };
    }
  };

  const { title, desc } = getCategoryTitle();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <p className="text-muted-foreground">{desc}</p>
      </div>

      <div className="grid gap-6">
        {endpoints.map((endpoint, index) => (
          <EndpointCard key={index} endpoint={endpoint} />
        ))}
      </div>
    </div>
  );
};
