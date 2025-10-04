import { Truck, CreditCard, Shield, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useStoreConfig } from '@/hooks/useStoreConfig';

const benefits = [
  {
    id: 1,
    icon: Truck,
    title: "Envio em 24hrs",
  },
  {
    id: 2,
    icon: Shield,
    title: "Garantia",
  },
  {
    id: 3,
    icon: RefreshCw,
    title: "Troca Fácil",
  },
  {
    id: 4,
    icon: CreditCard,
    title: "Pagamento Seguro",
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {displayBenefits.map((benefit) => {
            const IconComponent = iconMap[benefit.icon as keyof typeof iconMap] || benefit.icon;
            return (
              <Card 
                key={benefit.id}
                className="border-none bg-gray-100 hover:bg-gray-200 transition-all duration-300"
              >
                <CardContent className="p-6 flex items-center gap-4">
                  <IconComponent className="h-12 w-12 text-black flex-shrink-0" />
                  <h3 className="font-bold text-black text-lg">
                    {benefit.title}
                  </h3>
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