import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Gift } from "lucide-react";
import { useState } from "react";

const Newsletter = () => {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Newsletter signup logic would go here
    console.log("Newsletter signup:", email);
    setEmail("");
  };

  return (
    <section className="py-16 bg-hero-gradient">
      <div className="container mx-auto px-4">
        <Card className="max-w-4xl mx-auto border-0 shadow-2xl">
          <CardContent className="p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                    <Gift className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-2xl md:text-3xl font-bold text-foreground">
                      Ofertas Exclusivas
                    </h3>
                    <p className="text-muted-foreground">
                      Direto no seu e-mail
                    </p>
                  </div>
                </div>
                
                <p className="text-lg text-foreground">
                  Receba <strong>10% de desconto</strong> na primeira compra e fique por dentro das melhores promoções antes de todo mundo!
                </p>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>📱 Novidades</span>
                  <span>🎯 Promoções</span>
                  <span>🎁 Descontos</span>
                </div>
              </div>

              <div className="space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Input
                      type="email"
                      placeholder="Digite seu melhor e-mail"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 text-lg"
                      required
                    />
                  </div>
                  <Button 
                    type="submit"
                    size="lg"
                    className="w-full h-12 text-lg font-semibold"
                  >
                    Quero Receber Ofertas
                  </Button>
                </form>
                
                <p className="text-xs text-muted-foreground text-center">
                  📧 Não enviamos spam. Você pode cancelar quando quiser.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default Newsletter;