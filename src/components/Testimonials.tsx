import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const Testimonials = () => {
  const { data: testimonials, isLoading } = useQuery({
    queryKey: ["testimonials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .eq("active", true)
        .order("position", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Skeleton className="h-10 w-96 mx-auto mb-4" />
            <Skeleton className="h-6 w-64 mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-border bg-card">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div>
                        <Skeleton className="h-4 w-24 mb-2" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-6" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!testimonials || testimonials.length === 0) {
    return null;
  }

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
                    {testimonial.customer_avatar_url ? (
                      <img 
                        src={testimonial.customer_avatar_url} 
                        alt={testimonial.customer_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-primary-foreground font-semibold">
                          {testimonial.customer_initials}
                        </span>
                      </div>
                    )}
                    <div>
                      <h4 className="font-semibold text-foreground">
                        {testimonial.customer_name}
                      </h4>
                      {testimonial.product_purchased && (
                        <p className="text-sm text-muted-foreground">
                          Comprou: {testimonial.product_purchased}
                        </p>
                      )}
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