import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useStoreConfig } from "@/hooks/useStoreConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Target, Heart, Award, Globe, Zap } from "lucide-react";

const QuemSomos = () => {
  const { config } = useStoreConfig();
  const values = [
    {
      icon: Heart,
      title: "Compromisso com o Cliente",
      description: "Nosso cliente é sempre a prioridade número um em tudo que fazemos."
    },
    {
      icon: Award,
      title: "Qualidade Garantida",
      description: "Oferecemos apenas produtos de alta qualidade com garantia total."
    },
    {
      icon: Zap,
      title: "Inovação Constante",
      description: "Sempre buscamos as últimas tendências e tecnologias do mercado."
    },
    {
      icon: Globe,
      title: "Sustentabilidade",
      description: "Comprometidos com práticas sustentáveis e responsabilidade ambiental."
    }
  ];

  const team = [
    {
      name: "Ana Silva",
      role: "CEO & Fundadora",
      description: "15 anos de experiência em e-commerce e tecnologia."
    },
    {
      name: "Carlos Santos",
      role: "Diretor de Operações",
      description: "Especialista em logística e otimização de processos."
    },
    {
      name: "Marina Costa",
      role: "Diretora de Marketing",
      description: "Expert em marketing digital e experiência do cliente."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">Quem Somos</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Somos uma empresa brasileira dedicada a oferecer os melhores produtos 
            tecnológicos com excelência no atendimento e preços justos.
          </p>
        </div>

        {/* Company Story */}
        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-6">Nossa História</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Fundada em 2020, a {config?.store_name || "EcoShop"} nasceu da paixão por tecnologia e do desejo 
                de democratizar o acesso aos melhores produtos eletrônicos do mercado.
              </p>
              <p>
                Começamos como uma pequena loja online e hoje somos referência nacional 
                em e-commerce de tecnologia, atendendo milhares de clientes em todo o Brasil.
              </p>
              <p>
                Nossa jornada é marcada pela constante busca por inovação, qualidade 
                e satisfação do cliente. Cada produto que vendemos passa por rigorosos 
                critérios de seleção.
              </p>
            </div>
          </div>
          
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">500.000+</h3>
                    <p className="text-muted-foreground">Clientes satisfeitos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                    <Target className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">50.000+</h3>
                    <p className="text-muted-foreground">Produtos vendidos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Mission & Vision */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Nossa Missão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Oferecer produtos tecnológicos de qualidade superior com atendimento 
                excepcional, tornando a tecnologia acessível para todos os brasileiros 
                através de uma experiência de compra segura e conveniente.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Nossa Visão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Ser a principal referência em e-commerce de tecnologia no Brasil, 
                reconhecida pela excelência no atendimento, variedade de produtos 
                e compromisso com a inovação e sustentabilidade.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Values */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-foreground mb-8">Nossos Valores</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <Card key={index} className="text-center">
                <CardContent className="pt-6">
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <value.icon className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{value.title}</h3>
                  <p className="text-muted-foreground text-sm">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Team */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-foreground mb-8">Nossa Equipe</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <Card key={index} className="text-center">
                <CardContent className="pt-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-10 h-10 text-primary-foreground" />
                  </div>
                  <h3 className="font-bold text-lg">{member.name}</h3>
                  <Badge variant="secondary" className="mb-3">{member.role}</Badge>
                  <p className="text-muted-foreground text-sm">{member.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Certifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Certificações e Parcerias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <Badge variant="outline" className="mb-2">ISO 9001:2015</Badge>
                <p className="text-sm text-muted-foreground">Gestão da Qualidade</p>
              </div>
              <div>
                <Badge variant="outline" className="mb-2">SSL Certificado</Badge>
                <p className="text-sm text-muted-foreground">Segurança de Dados</p>
              </div>
              <div>
                <Badge variant="outline" className="mb-2">E-bit Diamante</Badge>
                <p className="text-sm text-muted-foreground">Excelência em E-commerce</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
      
      <Footer />
    </div>
  );
};

export default QuemSomos;