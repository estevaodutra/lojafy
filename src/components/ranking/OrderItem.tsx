import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { RecentOrder } from "@/hooks/useRecentOrders";
import { useRelativeTime } from "@/hooks/useRelativeTime";

interface OrderItemProps {
  order: RecentOrder;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const OrderItem = ({ order }: OrderItemProps) => {
  const relativeTime = useRelativeTime(order.created_at);

  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      {/* Time */}
      <div className="flex flex-col items-center min-w-[80px]">
        <span className="text-xs text-muted-foreground">
          {relativeTime}
        </span>
        <span className="text-xs text-muted-foreground">
          {new Date(order.created_at).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      </div>

      {/* Product Image */}
      <Avatar className="w-16 h-16">
        <AvatarImage 
          src={order.product_image} 
          alt={order.product_name}
          className="object-cover"
        />
        <AvatarFallback>
          {order.product_name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Product and Customer Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-foreground truncate">
          {order.product_name}
        </h4>
        <p className="text-sm text-muted-foreground">
          Cliente: <span className="font-medium">{order.customer_name}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Pedido: {order.order_number}
        </p>
      </div>

      {/* Pricing Info */}
      <div className="text-right min-w-[140px]">
        <div className="flex items-center justify-end gap-2 mb-1">
          <span className="text-sm text-muted-foreground">Custo:</span>
          <span className="text-sm font-medium">
            {formatCurrency(order.cost_price)}
          </span>
        </div>
        <div className="flex items-center justify-end gap-2 mb-1">
          <span className="text-sm text-muted-foreground">Venda:</span>
          <span className="text-sm font-medium">
            {formatCurrency(order.unit_price)}
          </span>
        </div>
        <div className="flex items-center justify-end gap-2">
          <span className="text-sm text-muted-foreground">Lucro:</span>
          <Badge 
            variant={order.profit > 0 ? "default" : "destructive"}
            className="font-medium"
          >
            {formatCurrency(order.profit)}
          </Badge>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">Valor já descontando taxas</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};