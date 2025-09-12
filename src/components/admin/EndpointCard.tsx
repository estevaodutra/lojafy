import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CodeBlock } from '@/components/admin/CodeBlock';
import { ApiTester } from '@/components/admin/ApiTester';
import { Copy, Play, Code } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QueryParam {
  name: string;
  description: string;
  example: string;
}

interface EndpointData {
  title: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  description: string;
  requestBody?: any;
  queryParams?: QueryParam[];
  responseExample: any;
}

interface EndpointCardProps {
  endpoint: EndpointData;
}

export const EndpointCard: React.FC<EndpointCardProps> = ({ endpoint }) => {
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copiado!',
      description: `${label} copiado para a área de transferência.`,
    });
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'POST': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'PUT': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'DELETE': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const fullUrl = `https://bbrmjrjorcgsgeztzbsr.supabase.co${endpoint.url}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge className={getMethodColor(endpoint.method)}>
              {endpoint.method}
            </Badge>
            <CardTitle className="text-xl">{endpoint.title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(fullUrl, 'URL do endpoint')}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar URL
            </Button>
          </div>
        </div>
        <CardDescription>{endpoint.description}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* URL */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Code className="h-4 w-4" />
            <span className="font-medium">Endpoint</span>
          </div>
          <div className="bg-muted p-3 rounded-lg">
            <code className="text-sm break-all">{fullUrl}</code>
          </div>
        </div>

        {/* Query Parameters */}
        {endpoint.queryParams && endpoint.queryParams.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">Parâmetros de Query</h4>
            <div className="space-y-2">
              {endpoint.queryParams.map((param) => (
                <div key={param.name} className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                  <div className="font-mono text-primary">{param.name}</div>
                  <div className="text-muted-foreground">{param.description}</div>
                  <div className="font-mono text-xs bg-muted px-2 py-1 rounded">
                    {param.example}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Request Body */}
        {endpoint.requestBody && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">Corpo da Requisição</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(
                  JSON.stringify(endpoint.requestBody, null, 2),
                  'Corpo da requisição'
                )}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </Button>
            </div>
            <CodeBlock 
              code={JSON.stringify(endpoint.requestBody, null, 2)} 
              language="json" 
            />
          </div>
        )}

        <Separator />

        {/* Response Example */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">Exemplo de Resposta</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(
                JSON.stringify(endpoint.responseExample, null, 2),
                'Exemplo de resposta'
              )}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar
            </Button>
          </div>
          <CodeBlock 
            code={JSON.stringify(endpoint.responseExample, null, 2)} 
            language="json" 
          />
        </div>

        <Separator />

        {/* API Tester */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Play className="h-4 w-4" />
            <h4 className="font-medium">Testar Requisição</h4>
          </div>
          <ApiTester endpoint={endpoint} />
        </div>
      </CardContent>
    </Card>
  );
};