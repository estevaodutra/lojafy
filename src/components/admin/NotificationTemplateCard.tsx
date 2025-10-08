import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Edit, TrendingDown, TrendingUp, Package, AlertCircle, CheckCircle, Truck, Gift, GraduationCap, BookOpen } from 'lucide-react';
import type { NotificationTemplate } from '@/types/notifications';

interface NotificationTemplateCardProps {
  template: NotificationTemplate;
  onToggle: (id: string, active: boolean) => void;
  onEdit: (template: NotificationTemplate) => void;
}

const TRIGGER_ICONS = {
  price_decrease: TrendingDown,
  price_increase: TrendingUp,
  back_in_stock: Package,
  low_stock: AlertCircle,
  order_confirmed: CheckCircle,
  order_shipped: Truck,
  order_delivered: Gift,
  new_lesson: BookOpen,
  course_completed: GraduationCap,
};

const TRIGGER_LABELS = {
  price_decrease: 'Produto mais barato',
  price_increase: 'Produto mais caro',
  back_in_stock: 'Voltou ao estoque',
  low_stock: 'Estoque baixo',
  order_confirmed: 'Pedido confirmado',
  order_shipped: 'Pedido enviado',
  order_delivered: 'Pedido entregue',
  new_lesson: 'Nova aula',
  course_completed: 'Curso concluído',
};

export const NotificationTemplateCard = ({ template, onToggle, onEdit }: NotificationTemplateCardProps) => {
  const Icon = TRIGGER_ICONS[template.trigger_type];
  const label = TRIGGER_LABELS[template.trigger_type];
  const readRate = template.total_sent > 0 ? ((template.total_read / template.total_sent) * 100).toFixed(1) : '0';

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {Icon && <Icon className="h-5 w-5 text-primary" />}
            <div>
              <CardTitle className="text-lg">{label}</CardTitle>
              <CardDescription className="text-sm mt-1">
                {template.title_template}
              </CardDescription>
            </div>
          </div>
          <Badge variant={template.active ? 'default' : 'secondary'}>
            {template.active ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          {template.message_template}
        </div>
        
        <div className="grid grid-cols-3 gap-4 py-3 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{template.total_sent}</div>
            <div className="text-xs text-muted-foreground">Enviadas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{template.total_read}</div>
            <div className="text-xs text-muted-foreground">Lidas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{readRate}%</div>
            <div className="text-xs text-muted-foreground">Taxa</div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center space-x-2">
            <Switch
              id={`active-${template.id}`}
              checked={template.active}
              onCheckedChange={(checked) => onToggle(template.id, checked)}
            />
            <Label htmlFor={`active-${template.id}`} className="text-sm cursor-pointer">
              {template.active ? 'Ativo' : 'Inativo'}
            </Label>
          </div>
          
          <Button variant="outline" size="sm" onClick={() => onEdit(template)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
