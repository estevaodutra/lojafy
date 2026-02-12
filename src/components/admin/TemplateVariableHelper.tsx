import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import type { AutomaticTriggerType, TemplateVariable } from '@/types/notifications';

interface TemplateVariableHelperProps {
  triggerType: AutomaticTriggerType;
}

const VARIABLES_BY_TRIGGER: Record<AutomaticTriggerType, TemplateVariable[]> = {
  price_decrease: [
    { key: 'PRODUCT_ID', description: 'ID do produto', example: 'abc123' },
    { key: 'PRODUCT_NAME', description: 'Nome do produto', example: 'Smartphone XYZ' },
    { key: 'OLD_PRICE', description: 'Preço antigo formatado', example: '1.999,00' },
    { key: 'NEW_PRICE', description: 'Preço novo formatado', example: '1.799,00' },
    { key: 'DISCOUNT_PERCENTAGE', description: 'Porcentagem de desconto', example: '10' },
  ],
  price_increase: [
    { key: 'PRODUCT_ID', description: 'ID do produto', example: 'abc123' },
    { key: 'PRODUCT_NAME', description: 'Nome do produto', example: 'Smartphone XYZ' },
    { key: 'OLD_PRICE', description: 'Preço antigo formatado', example: '1.799,00' },
    { key: 'NEW_PRICE', description: 'Preço novo formatado', example: '1.999,00' },
  ],
  back_in_stock: [
    { key: 'PRODUCT_ID', description: 'ID do produto', example: 'abc123' },
    { key: 'PRODUCT_NAME', description: 'Nome do produto', example: 'Smartphone XYZ' },
    { key: 'STOCK_QUANTITY', description: 'Quantidade em estoque', example: '15' },
  ],
  low_stock: [
    { key: 'PRODUCT_ID', description: 'ID do produto', example: 'abc123' },
    { key: 'PRODUCT_NAME', description: 'Nome do produto', example: 'Smartphone XYZ' },
    { key: 'STOCK_QUANTITY', description: 'Quantidade em estoque', example: '3' },
  ],
  order_confirmed: [
    { key: 'ORDER_ID', description: 'ID do pedido', example: 'abc123' },
    { key: 'ORDER_NUMBER', description: 'Número do pedido', example: 'ORD-20250107-001234' },
  ],
  order_shipped: [
    { key: 'ORDER_ID', description: 'ID do pedido', example: 'abc123' },
    { key: 'ORDER_NUMBER', description: 'Número do pedido', example: 'ORD-20250107-001234' },
    { key: 'TRACKING_CODE', description: 'Código de rastreamento', example: 'BR123456789' },
  ],
  order_delivered: [
    { key: 'ORDER_ID', description: 'ID do pedido', example: 'abc123' },
    { key: 'ORDER_NUMBER', description: 'Número do pedido', example: 'ORD-20250107-001234' },
  ],
  new_lesson: [
    { key: 'COURSE_ID', description: 'ID do curso', example: 'abc123' },
    { key: 'COURSE_NAME', description: 'Nome do curso', example: 'React Avançado' },
    { key: 'LESSON_TITLE', description: 'Título da aula', example: 'Hooks Personalizados' },
  ],
  course_completed: [
    { key: 'COURSE_ID', description: 'ID do curso', example: 'abc123' },
    { key: 'COURSE_NAME', description: 'Nome do curso', example: 'React Avançado' },
  ],
  product_removed: [
    { key: 'PRODUCT_ID', description: 'ID do produto', example: 'abc123' },
    { key: 'PRODUCT_NAME', description: 'Nome do produto', example: 'Smartphone XYZ' },
  ],
};

export const TemplateVariableHelper = ({ triggerType }: TemplateVariableHelperProps) => {
  const variables = VARIABLES_BY_TRIGGER[triggerType] || [];

  const copyVariable = (key: string) => {
    navigator.clipboard.writeText(`{${key}}`);
    toast.success('Variável copiada!');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Variáveis Disponíveis</CardTitle>
        <CardDescription>
          Clique para copiar e cole no título ou mensagem
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {variables.map((variable) => (
            <div
              key={variable.key}
              className="flex items-center justify-between p-2 rounded-lg border hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1">
                <div className="font-mono text-sm font-medium">
                  {`{${variable.key}}`}
                </div>
                <div className="text-xs text-muted-foreground">
                  {variable.description}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Ex: {variable.example}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyVariable(variable.key)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
