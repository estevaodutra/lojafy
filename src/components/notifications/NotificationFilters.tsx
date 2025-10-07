import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface NotificationFiltersProps {
  statusFilter: 'all' | 'unread' | 'read';
  typeFilter: string;
  onStatusChange: (status: 'all' | 'unread' | 'read') => void;
  onTypeChange: (type: string) => void;
}

export function NotificationFilters({ 
  statusFilter, 
  typeFilter, 
  onStatusChange, 
  onTypeChange 
}: NotificationFiltersProps) {
  return (
    <div className="space-y-4">
      <Tabs value={statusFilter} onValueChange={(v) => onStatusChange(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="unread">Não Lidas</TabsTrigger>
          <TabsTrigger value="read">Lidas</TabsTrigger>
        </TabsList>
      </Tabs>

      <Select value={typeFilter} onValueChange={onTypeChange}>
        <SelectTrigger>
          <SelectValue placeholder="Filtrar por tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os tipos</SelectItem>
          <SelectItem value="new_product">Novo Produto</SelectItem>
          <SelectItem value="product_removed">Produto Removido</SelectItem>
          <SelectItem value="new_lesson">Nova Aula</SelectItem>
          <SelectItem value="new_feature">Nova Funcionalidade</SelectItem>
          <SelectItem value="promotion">Promoção</SelectItem>
          <SelectItem value="system">Sistema</SelectItem>
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
