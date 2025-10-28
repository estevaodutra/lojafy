import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Lock, Clock, TrendingUp } from "lucide-react";
import { useFinancialBalance } from "@/hooks/useFinancialBalance";
import { Skeleton } from "@/components/ui/skeleton";

export const FinancialSummary = () => {
  const { data: balance, isLoading } = useFinancialBalance();

  const cards = [
    {
      title: "Saldo Disponível",
      value: balance?.available || 0,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Saldo Bloqueado",
      value: balance?.blocked || 0,
      icon: Lock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      title: "Saques em Processamento",
      value: balance?.pending || 0,
      icon: Clock,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Total Sacado",
      value: balance?.totalWithdrawn || 0,
      icon: TrendingUp,
      color: "text-gray-600",
      bgColor: "bg-gray-50",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${card.bgColor}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(card.value)}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
