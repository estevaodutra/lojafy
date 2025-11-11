import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { RecentOrder } from "@/hooks/useRecentOrders";
import { useRelativeTime } from "@/hooks/useRelativeTime";

interface OrderItemProps {
  order: RecentOrder;
}

const generateProfitPercentage = (id: string): number => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash = hash & hash;
  }
  const min = 25;
  const max = 50;
  return min + (Math.abs(hash) % (max - min + 1));
};

const censorCustomerName = (name: string): string => {
  if (!name || name === 'Cliente') return 'Cliente Anônimo';
  
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    // Nome único: "Maria" → "Mar**ia" 
    const single = parts[0];
    if (single.length <= 3) return single; // Nomes muito curtos não censura
    return single.substring(0, 3) + '*'.repeat(single.length - 4) + single.slice(-1);
  }
  
  // Múltiplas palavras: "Maria da Silva" → "Mar*****va"
  const firstName = parts[0];
  const lastName = parts[parts.length - 1];
  
  const firstCensored = firstName.length <= 3 ? firstName : 
    firstName.substring(0, 3) + '*'.repeat(Math.max(3, firstName.length - 4));
    
  const lastCensored = lastName.length <= 2 ? lastName :
    lastName.slice(-2);
    
  return firstCensored + lastCensored;
};

export const OrderItem = ({ order }: OrderItemProps) => {
  const relativeTime = useRelativeTime(order.created_at);
  const profitPercentage = generateProfitPercentage(order.order_number);

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
          Cliente: <span className="font-medium">{censorCustomerName(order.customer_name)}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Pedido: {order.order_number}
        </p>
      </div>

      {/* Profit Percentage */}
      <div className="text-right min-w-[100px]">
        <Badge 
          className={`font-medium text-sm px-3 py-1 ${
            profitPercentage >= 40 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : profitPercentage >= 35 
              ? 'bg-green-500 hover:bg-green-600 text-white' 
              : 'bg-green-400 hover:bg-green-500 text-white'
          }`}
        >
          +{profitPercentage}% lucro
        </Badge>
      </div>
    </div>
  );
};