import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CodeBlock } from './CodeBlock';
import { Play, Loader2 } from 'lucide-react';

interface EndpointData {
  title: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  description: string;
  requestBody?: any;
  queryParams?: any[];
  responseExample: any;
}

interface ApiTesterProps {
  endpoint: EndpointData;
}

export const ApiTester: React.FC<ApiTesterProps> = ({ endpoint }) => {
  const [selectedApiKey, setSelectedApiKey] = useState('');
  const [requestBody, setRequestBody] = useState(
    endpoint.requestBody ? JSON.stringify(endpoint.requestBody, null, 2) : ''
  );
  const [queryParams, setQueryParams] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Fetch user's API keys
  const { data: apiKeys = [] } = useQuery({
    queryKey: ['api-keys-tester'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_keys')
        .select('id, key_name, api_key, active')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const testEndpoint = async () => {
    if (!selectedApiKey) {
      toast({
        title: 'Chave de API obrigatória',
        description: 'Selecione uma chave de API para testar o endpoint.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setResponse('');

    try {
      const selectedKey = apiKeys.find(key => key.id === selectedApiKey);
      if (!selectedKey) {
        throw new Error('Chave de API não encontrada');
      }

      // Build URL with query parameters
      let url = `https://bbrmjrjorcgsgeztzbsr.supabase.co${endpoint.url}`;
      if (queryParams.trim() && endpoint.method === 'GET') {
        const params = queryParams.split('\n')
          .filter(line => line.trim())
          .map(line => {
            const [key, value] = line.split('=');
            return `${encodeURIComponent(key.trim())}=${encodeURIComponent(value?.trim() || '')}`;
          })
          .join('&');
        
        if (params) {
          url += `?${params}`;
        }
      }

      // Prepare request options
      const requestOptions: RequestInit = {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': selectedKey.api_key,
        },
      };

      // Add body for non-GET requests
      if (endpoint.method !== 'GET' && requestBody.trim()) {
        try {
          JSON.parse(requestBody); // Validate JSON
          requestOptions.body = requestBody;
        } catch (err) {
          throw new Error('JSON inválido no corpo da requisição');
        }
      }

      // Make request
      const response = await fetch(url, requestOptions);
      const responseText = await response.text();
      
      // Try to parse as JSON, fallback to text
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      const result = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData
      };

      setResponse(JSON.stringify(result, null, 2));

      if (response.ok) {
        toast({
          title: 'Requisição bem-sucedida',
          description: `Status: ${response.status} ${response.statusText}`,
        });
      } else {
        toast({
          title: 'Erro na requisição',
          description: `Status: ${response.status} ${response.statusText}`,
          variant: 'destructive',
        });
      }

    } catch (error: any) {
      const errorResponse = {
        error: error.message || 'Erro desconhecido',
        timestamp: new Date().toISOString()
      };
      
      setResponse(JSON.stringify(errorResponse, null, 2));
      
      toast({
        title: 'Erro ao testar endpoint',
        description: error.message || 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Testar Endpoint</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* API Key Selection */}
        <div>
          <Label htmlFor="apiKey">Chave de API</Label>
          <Select value={selectedApiKey} onValueChange={setSelectedApiKey}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Selecione uma chave de API" />
            </SelectTrigger>
            <SelectContent>
              {apiKeys.map((key) => (
                <SelectItem key={key.id} value={key.id}>
                  {key.key_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {apiKeys.length === 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              Você precisa criar uma chave de API primeiro.
            </p>
          )}
        </div>

        {/* Query Parameters for GET requests */}
        {endpoint.method === 'GET' && (
          <div>
            <Label htmlFor="queryParams">Parâmetros de Query (um por linha: chave=valor)</Label>
            <Textarea
              id="queryParams"
              value={queryParams}
              onChange={(e) => setQueryParams(e.target.value)}
              placeholder="page=1&#10;limit=20&#10;search=produto"
              className="mt-2 font-mono text-sm"
              rows={4}
            />
          </div>
        )}

        {/* Request Body for non-GET requests */}
        {endpoint.method !== 'GET' && (
          <div>
            <Label htmlFor="requestBody">Corpo da Requisição (JSON)</Label>
            <Textarea
              id="requestBody"
              value={requestBody}
              onChange={(e) => setRequestBody(e.target.value)}
              className="mt-2 font-mono text-sm"
              rows={8}
            />
          </div>
        )}

        {/* Test Button */}
        <Button 
          onClick={testEndpoint} 
          disabled={isLoading || !selectedApiKey}
          className="w-full"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          {isLoading ? 'Testando...' : 'Testar Requisição'}
        </Button>

        {/* Response */}
        {response && (
          <div>
            <Label>Resposta</Label>
            <div className="mt-2">
              <CodeBlock code={response} language="json" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};