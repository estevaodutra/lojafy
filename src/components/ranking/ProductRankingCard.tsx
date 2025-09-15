import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Crown, Medal, Award } from "lucide-react";
import { TopProduct } from "@/hooks/useTopProducts";

interface ProductRankingCardProps {
  product: TopProduct;
  position: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const getPositionIcon = (position: number) => {
  switch (position) {
    case 1:
      return <Crown className="w-6 h-6 text-yellow-500" />;
    case 2:
      return <Medal className="w-6 h-6 text-gray-400" />;
    case 3:
      return <Award className="w-6 h-6 text-amber-600" />;
    default:
      return null;
  }
};

const getPositionBadgeVariant = (position: number) => {
  switch (position) {
    case 1:
      return "default";
    case 2:
      return "secondary";
    case 3:
      return "outline";
    default:
      return "outline";
  }
};

export const ProductRankingCard = ({ product, position }: ProductRankingCardProps) => {
  const [showDetails, setShowDetails] = useState(false);
  
  const avgSalesPerDay = product.days_with_sales > 0 
    ? (product.total_sales / product.days_with_sales).toFixed(1)
    : '0';

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${
      position <= 3 ? 'ring-2 ring-primary/20' : ''
    }`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Position */}
          <div className="flex flex-col items-center gap-1">
            <Badge variant={getPositionBadgeVariant(position)} className="w-8 h-8 rounded-full flex items-center justify-center p-0">
              #{position}
            </Badge>
            {getPositionIcon(position)}
          </div>

          {/* Product Image */}
          <Avatar className="w-16 h-16">
            <AvatarImage 
              src={product.main_image_url || product.image_url} 
              alt={product.name}
              className="object-cover"
            />
            <AvatarFallback>{product.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>

          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">
              {product.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-primary">{product.total_sales}</span> vendas esta semana
            </p>
          </div>

          {/* Details Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2"
          >
            Detalhes
            {showDetails ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Expanded Details */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Valor Médio</p>
              <p className="font-semibold text-foreground">
                {formatCurrency(product.avg_price)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Lucro Médio</p>
              <p className="font-semibold text-green-600">
                {formatCurrency(product.avg_profit)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Vendas/Dia</p>
              <p className="font-semibold text-foreground">
                {avgSalesPerDay}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};