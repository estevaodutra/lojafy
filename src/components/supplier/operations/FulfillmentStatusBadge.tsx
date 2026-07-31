import { Badge } from '@/components/ui/badge';
import { getFulfillmentStatusConfig } from '@/constants/fulfillmentStatus';

export const FulfillmentStatusBadge = ({ status }: { status: string }) => {
  const config = getFulfillmentStatusConfig(status);
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1 whitespace-nowrap">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};
