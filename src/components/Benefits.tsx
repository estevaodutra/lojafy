import { Truck, CreditCard, Shield, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useStoreConfig } from '@/hooks/useStoreConfig';

const benefits = [
  {
    id: 1,
    icon: Truck,
    title: "Frete Grátis",
    description: "Acima de R$ 199",
    color: "bg-green-500",
  },
  {
    id: 2,
    icon: CreditCard,
    title: "Parcelamento",
    description: "Em até 10x sem juros",
    color: "bg-blue-500",
  },
  {
    id: 3,
    icon: Shield,
    title: "Compra Segura",
    description: "Site protegido",
    color: "bg-purple-500",
  },
  {
    id: 4,
    icon: RefreshCw,
    title: "Troca Fácil",
    description: "30 dias para trocar",
    color: "bg-orange-500",
  },
];

const Benefits = () => {
  const { config } = useStoreConfig();
  
  // Use configured benefits or fallback to default
  const displayBenefits = config?.benefits_config?.filter(b => b.active) || benefits;
  
  // Icon mapping
  const iconMap = {
    Truck,
    CreditCard, 
    Shield,
    RefreshCw
  };
  
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayBenefits.map((benefit) => {
            const IconComponent = iconMap[benefit.icon as keyof typeof iconMap] || benefit.icon;
            return (
              <Card 
                key={benefit.id}
                className="text-center border-border bg-card hover:shadow-card transition-all duration-300"
              >
                <CardContent className="p-6 flex flex-col items-center space-y-4">
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: benefit.color }}
                  >
                    <IconComponent className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-lg mb-1">
                      {benefit.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {benefit.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Benefits;