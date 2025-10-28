import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Clock, Shield, CheckCircle, AlertCircle, Package } from "lucide-react";
import { Link } from "react-router-dom";

const PoliticaTroca = () => {
  const conditions = [
    {
      icon: Clock,
      title: "Prazo para Troca",
      description: "30 dias corridos a partir da data de recebimento do produto."
    },
    {
      icon: Package,
      title: "Embalagem Original",
      description: "Produto deve estar na embalagem original, sem sinais de uso."
    },
    {
      icon: Shield,
      title: "Nota Fiscal",
      description: "Apresentar a nota fiscal ou comprovante de compra."
    },
    {
      icon: CheckCircle,
      title: "Estado do Produto",
      description: "Produto deve estar íntegro, sem arranhões ou avarias."
    }
  ];

  const steps = [
    {
      step: 1,
      title: "Solicite a Troca",
      description: "Entre em contato conosco através do nosso site ou WhatsApp informando o motivo da troca."
    },
    {
      step: 2,
      title: "Autorização",
      description: "Nossa equipe analisará sua solicitação e fornecerá as instruções para devolução."
    },
    {
      step: 3,
      title: "Envio do Produto",
      description: "Embale o produto adequadamente e envie pelos Correios com AR (porte pago por nós)."
    },
    {
      step: 4,
      title: "Análise e Troca",
      description: "Após recebermos e analisarmos o produto, providenciaremos a troca ou reembolso em até 7 dias úteis."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">Política de Troca</h1>
            <p className="text-xl text-muted-foreground">
              Sua satisfação é nossa prioridade. Conheça nossas condições para trocas e devoluções.
            </p>
          </div>

          {/* Overview */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Direito de Arrependimento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  De acordo com o Código de Defesa do Consumidor (Art. 49), você tem o direito de 
                  desistir da compra em até <strong>7 dias corridos</strong> após o recebimento 
                  do produto, sem necessidade de justificativa.
                </p>
                <p className="text-muted-foreground">
                  Além disso, oferecemos um prazo estendido de <strong>30 dias</strong> 
                  para trocas por defeito, produto diferente do anunciado ou insatisfação.
                </p>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Frete grátis para trocas autorizadas
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Conditions */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-6">Condições para Troca</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {conditions.map((condition, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                        <condition.icon className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">{condition.title}</h3>
                        <p className="text-muted-foreground text-sm">{condition.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Process Steps */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-6">Como Solicitar uma Troca</h2>
            <div className="space-y-6">
              {steps.map((step, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 text-primary-foreground font-bold">
                        {step.step}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                        <p className="text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Important Notes */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Informações Importantes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Produtos Não Trocáveis:</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Produtos personalizados ou sob encomenda</li>
                    <li>Produtos com lacre violado (software, jogos)</li>
                    <li>Produtos de higiene pessoal</li>
                    <li>Produtos com prazo de validade vencido</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Reembolso:</h4>
                  <p className="text-muted-foreground">
                    Em casos de direito de arrependimento, o reembolso será processado em até 
                    10 dias úteis após o recebimento do produto. O valor será estornado na 
                    mesma forma de pagamento utilizada na compra.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Frete:</h4>
                  <p className="text-muted-foreground">
                    Para trocas autorizadas por defeito ou erro nosso, o frete é por nossa conta. 
                    Para desistência, o cliente arca com os custos de devolução.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact CTA */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-foreground mb-4">
                  Precisa Solicitar uma Troca?
                </h3>
                <p className="text-muted-foreground mb-6">
                  Nossa equipe está pronta para ajudar você com sua solicitação de troca.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild>
                    <Link to="/contato">
                      Entrar em Contato
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/rastrear-pedido">
                      Rastrear Meu Pedido
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default PoliticaTroca;