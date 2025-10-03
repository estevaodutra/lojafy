import { usePublicStoreContext } from '@/hooks/usePublicStoreContext';
import { usePublicStoreDocumentTitle } from '@/hooks/usePublicStoreDocumentTitle';
import PublicStoreHeader from '@/components/public-store/PublicStoreHeader';
import PublicStoreFooter from '@/components/public-store/PublicStoreFooter';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Shield, User, CreditCard, Truck, AlertTriangle } from "lucide-react";
import { replacePlaceholders } from '@/lib/placeholders';

const PublicStoreTerms = () => {
  const { store } = usePublicStoreContext();
  usePublicStoreDocumentTitle(store, 'Termos de Uso');

  const lastUpdated = new Date().toLocaleDateString('pt-BR');

  return (
    <div className="min-h-screen bg-background">
      <PublicStoreHeader store={store} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Termos de Uso</h1>
            <p className="text-muted-foreground">
              Última atualização: {lastUpdated}
            </p>
          </div>

          {/* Introduction */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Introdução
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Bem-vindo à {store.store_name}. Estes Termos de Uso regulam o uso de nosso site e serviços. 
                Ao acessar ou usar nosso site, você concorda em cumprir estes termos. 
                Se você não concordar com qualquer parte destes termos, não deve usar nossos serviços.
              </p>
            </CardContent>
          </Card>

          {/* Definitions */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>1. Definições</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">"{store.store_name}", "nós", "nosso"</h4>
                <p className="text-muted-foreground">
                  Refere-se à loja {store.store_name}.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">"Usuário", "você", "seu"</h4>
                <p className="text-muted-foreground">
                  Refere-se a qualquer pessoa que acesse ou use nosso site e serviços.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">"Serviços"</h4>
                <p className="text-muted-foreground">
                  Refere-se ao nosso site, plataforma de e-commerce e todos os serviços relacionados.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Account Usage */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                2. Uso da Conta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">2.1 Elegibilidade</h4>
                <p className="text-muted-foreground">
                  Você deve ter pelo menos 18 anos de idade para usar nossos serviços. 
                  Ao criar uma conta, você declara que todas as informações fornecidas são verdadeiras e precisas.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">2.2 Responsabilidade da Conta</h4>
                <p className="text-muted-foreground">
                  Você é responsável por manter a confidencialidade de suas credenciais de login 
                  e por todas as atividades que ocorrem em sua conta.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">2.3 Uso Proibido</h4>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li>Usar o site para atividades ilegais ou não autorizadas</li>
                  <li>Tentar acessar áreas restritas do sistema</li>
                  <li>Interferir no funcionamento normal do site</li>
                  <li>Transmitir vírus ou códigos maliciosos</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Orders and Payments */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                3. Pedidos e Pagamentos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">3.1 Formação do Contrato</h4>
                <p className="text-muted-foreground">
                  Um contrato de compra e venda é formado quando confirmamos o recebimento do seu pedido 
                  e o pagamento é aprovado.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">3.2 Preços e Disponibilidade</h4>
                <p className="text-muted-foreground">
                  Os preços estão sujeitos a alterações sem aviso prévio. Reservamo-nos o direito de 
                  cancelar pedidos em caso de erro de preço ou indisponibilidade do produto.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">3.3 Formas de Pagamento</h4>
                <p className="text-muted-foreground">
                  Aceitamos as formas de pagamento disponíveis no checkout. Todas as transações são seguras e protegidas.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Shipping and Delivery */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                4. Entrega e Frete
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">4.1 Prazos de Entrega</h4>
                <p className="text-muted-foreground">
                  Os prazos de entrega são estimativas e podem variar conforme a localização e 
                  disponibilidade do produto. Não nos responsabilizamos por atrasos dos Correios.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">4.2 Responsabilidade</h4>
                <p className="text-muted-foreground">
                  Nossa responsabilidade pela entrega se encerra no momento em que o produto é 
                  entregue no endereço fornecido pelo cliente.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Intellectual Property */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                5. Propriedade Intelectual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Todo o conteúdo do site, incluindo textos, imagens, logos, gráficos e software, 
                é propriedade de {store.store_name} ou de seus licenciadores e está protegido por leis de 
                direitos autorais e propriedade intelectual.
              </p>
              <p className="text-muted-foreground">
                É proibida a reprodução, distribuição ou modificação de qualquer conteúdo 
                sem autorização expressa por escrito.
              </p>
            </CardContent>
          </Card>

          {/* Privacy */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>6. Privacidade e Proteção de Dados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Respeitamos sua privacidade e estamos comprometidos com a proteção de seus dados pessoais 
                de acordo com a Lei Geral de Proteção de Dados (LGPD).
              </p>
            </CardContent>
          </Card>

          {/* Limitations */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                7. Limitação de Responsabilidade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                {store.store_name} não se responsabiliza por danos indiretos, incidentais, especiais ou 
                consequenciais decorrentes do uso ou incapacidade de usar nossos serviços.
              </p>
              <p className="text-muted-foreground">
                Nossa responsabilidade total não excederá o valor pago pelo produto ou serviço específico.
              </p>
            </CardContent>
          </Card>

          {/* Changes to Terms */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>8. Modificações dos Termos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Reservamo-nos o direito de modificar estes termos a qualquer momento. 
                As alterações entrarão em vigor imediatamente após a publicação no site. 
                É sua responsabilidade revisar periodicamente estes termos.
              </p>
            </CardContent>
          </Card>

          {/* Governing Law */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>9. Lei Aplicável</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Estes termos são regidos pelas leis brasileiras. Qualquer disputa será resolvida 
                nos tribunais competentes.
              </p>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle>10. Contato</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Se você tiver dúvidas sobre estes Termos de Uso, entre em contato conosco:
              </p>
              <div className="space-y-2 text-muted-foreground">
                {store.contact_email && <p><strong>E-mail:</strong> {store.contact_email}</p>}
                {store.contact_phone && <p><strong>Telefone:</strong> {store.contact_phone}</p>}
                {store.contact_address && <p><strong>Endereço:</strong> {store.contact_address}</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <PublicStoreFooter store={store} />
    </div>
  );
};

export default PublicStoreTerms;
