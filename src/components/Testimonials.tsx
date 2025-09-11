import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    id: 1,
    name: "Maria Silva",
    rating: 5,
    comment: "Excelente atendimento e produtos de qualidade. Recomendo!",
    avatar: "MS",
    purchase: "iPhone 15 Pro",
  },
  {
    id: 2,
    name: "João Santos",
    rating: 5,
    comment: "Entrega super rápida e produto exatamente como descrito.",
    avatar: "JS",
    purchase: "MacBook Pro",
  },
  {
    id: 3,
    name: "Ana Costa",
    rating: 5,
    comment: "Melhor preço que encontrei e ainda parcelei sem juros!",
    avatar: "AC",
    purchase: "Smartwatch",
  },
];

const Testimonials = () => {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            O Que Nossos Clientes Dizem
          </h2>
          <p className="text-lg text-muted-foreground">
            Depoimentos reais de quem já comprou conosco
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial) => (
            <Card 
              key={testimonial.id}
              className="border-border bg-card hover:shadow-card-hover transition-all duration-300"
            >
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-primary-foreground font-semibold">
                        {testimonial.avatar}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">
                        {testimonial.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Comprou: {testimonial.purchase}
                      </p>
                    </div>
                  </div>
                  <Quote className="h-6 w-6 text-muted-foreground" />
                </div>

                <div className="flex items-center gap-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star 
                      key={i}
                      className="h-4 w-4 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>

                <p className="text-foreground italic">
                  "{testimonial.comment}"
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;