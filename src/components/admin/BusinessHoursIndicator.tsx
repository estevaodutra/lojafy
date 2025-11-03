import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { isWithinBusinessHours } from '@/lib/businessHours';

export const BusinessHoursIndicator = () => {
  const status = isWithinBusinessHours();
  
  return (
    <Badge 
      variant={status.isOpen ? 'default' : 'secondary'}
      className="flex items-center gap-1"
    >
      <Clock className="h-3 w-3" />
      {status.isOpen ? 'Horário Comercial' : 'Fora do Horário'}
    </Badge>
  );
};
