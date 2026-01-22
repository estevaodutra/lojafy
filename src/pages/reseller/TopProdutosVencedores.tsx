import React, { useState } from 'react';
import { Trophy, Clock, Target, CheckCircle2, Circle, ExternalLink, Rocket, Users, MessageCircle, Facebook, Instagram, Store, Zap, AlertTriangle, Sparkles, Timer, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
interface Product {
  id: string;
  number: number;
  name: string;
  productUrl: string;
  completed: boolean;
  userLink: string;
}
const initialProducts: Product[] = [{
  id: '1',
  number: 1,
  name: 'Tela Ampliadora 3D para Celular',
  productUrl: '/produto/0a8d1f8f-984a-4c52-8c2f-88250ac393ca',
  completed: false,
  userLink: ''
}, {
  id: '2',
  number: 2,
  name: 'Dermaroller Microagulhamento',
  productUrl: '/produto/252cd780-fa9f-4825-b14b-9ec6c7e57d7b',
  completed: false,
  userLink: ''
}, {
  id: '3',
  number: 3,
  name: 'Lousa Mágica LCD Infantil',
  productUrl: '/produto/06684218-913b-4e88-94d7-fc193ba8b28f',
  completed: false,
  userLink: ''
}, {
  id: '4',
  number: 4,
  name: 'Palmilha Elevatória',
  productUrl: '/produto/645f1845-b184-47de-b4bf-9b277fe1ce39',
  completed: false,
  userLink: ''
}, {
  id: '5',
  number: 5,
  name: 'Palmilha Gel Ortopédica (Calcanhar)',
  productUrl: '/produto/5211ef86-e034-4cfe-9836-ebbc417dad0d',
  completed: false,
  userLink: ''
}, {
  id: '6',
  number: 6,
  name: 'Joelheira de Compressão',
  productUrl: '/produto/581bd820-17cc-43df-b924-5d15d4ba768a',
  completed: false,
  userLink: ''
}, {
  id: '7',
  number: 7,
  name: 'Meia / Palmilha Fascite Plantar',
  productUrl: '/produto/8954f5bf-cbd6-424a-8e7a-80584cbdd77e',
  completed: false,
  userLink: ''
}, {
  id: '8',
  number: 8,
  name: 'Cascata de Chocolate',
  productUrl: '/produto/e5debf21-08d1-4ab5-9e6b-afb8ba5e04bc',
  completed: false,
  userLink: ''
}, {
  id: '9',
  number: 9,
  name: 'Tábua Mágica de Descongelamento',
  productUrl: '/produto/02d9ea24-0942-4748-97fc-38bb2ad2560b',
  completed: false,
  userLink: ''
}, {
  id: '10',
  number: 10,
  name: 'Regata Modeladora Efeito Sauna',
  productUrl: '/produto/7f6a1540-ff88-4260-8a00-3dcb90e6208d',
  completed: false,
  userLink: ''
}, {
  id: '11',
  number: 11,
  name: 'Cinta Modeladora Alta Compressão Feminina',
  productUrl: '/produto/4bec5a4c-79d3-4ae0-9038-9b9f51c26b62',
  completed: false,
  userLink: ''
}];
const strategies = [{
  icon: Users,
  title: 'Amigos e Familiares',
  description: 'Não venda. Peça opinião sobre seus anúncios.',
  tip: 'Comentário e clique movimentam o anúncio.',
  color: 'bg-blue-500'
}, {
  icon: MessageCircle,
  title: 'Grupos de WhatsApp',
  description: 'Nada de spam. Comece com curiosidade.',
  tip: 'Curiosidade gera inbox.',
  color: 'bg-green-500'
}, {
  icon: Facebook,
  title: 'Grupos do Facebook',
  description: 'Escolha 3 grupos por produto. Texto simples.',
  tip: 'Link só nos comentários.',
  color: 'bg-indigo-500'
}, {
  icon: Zap,
  title: 'Status do WhatsApp',
  description: 'Foto do produto + mensagem simples.',
  tip: 'Status vende no privado.',
  color: 'bg-yellow-500'
}, {
  icon: Store,
  title: 'Facebook Marketplace',
  description: 'Reposte o anúncio com título diferente.',
  tip: 'Marketplace recompensa atividade.',
  color: 'bg-purple-500'
}, {
  icon: Instagram,
  title: 'Impulsionar no Instagram',
  description: 'Opcional. Orçamento baixo, público amplo.',
  tip: 'Impulsionar é tração inicial.',
  color: 'bg-pink-500'
}];
const TopProdutosVencedores: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('missao24h_products');
    return saved ? JSON.parse(saved) : initialProducts;
  });
  const [checklistOpen, setChecklistOpen] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const completedCount = products.filter(p => p.completed).length;
  const progressPercentage = completedCount / products.length * 100;
  const handleToggleComplete = (id: string) => {
    const updated = products.map(p => p.id === id ? {
      ...p,
      completed: !p.completed
    } : p);
    setProducts(updated);
    localStorage.setItem('missao24h_products', JSON.stringify(updated));
    const product = updated.find(p => p.id === id);
    if (product?.completed) {
      toast.success(`✅ ${product.name} marcado como publicado!`);
    }
  };
  const handleUpdateLink = (id: string, link: string) => {
    const updated = products.map(p => p.id === id ? {
      ...p,
      userLink: link
    } : p);
    setProducts(updated);
    localStorage.setItem('missao24h_products', JSON.stringify(updated));
  };
  const handleResetProgress = () => {
    setProducts(initialProducts);
    localStorage.removeItem('missao24h_products');
    toast.info('Progresso resetado!');
  };
  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(window.location.origin + url);
    setCopiedId(id);
    toast.success('Link copiado!');
    setTimeout(() => setCopiedId(null), 2000);
  };
  return <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-8 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10">
          <Badge className="bg-white/20 text-white border-white/30 mb-4">
            <Clock className="w-3 h-3 mr-1" />
            Desafio de 24 Horas
          </Badge>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2">Missão 24h</h1>
              <p className="text-xl text-amber-100 font-medium">11 Produtos Ativos</p>
              <p className="mt-3 text-amber-100/80 max-w-lg">
                <strong className="text-white">Leia em 5 minutos.</strong> Execute em 24 horas.
              </p>
              <p className="mt-2 text-sm text-amber-100/70">
                Daqui a 24 horas, você <strong className="text-white">PRECISA</strong> estar com os 11 anúncios publicados 
                e ativos em pelo menos 1 marketplace.
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center min-w-[140px]">
                <div className="flex items-center justify-center gap-2 text-4xl font-bold">
                  <Trophy className="w-8 h-8 text-yellow-300" />
                  {completedCount}/{products.length}
                </div>
                <p className="text-sm text-amber-100 mt-1">Produtos Publicados</p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex flex-wrap gap-3">
            
            
          </div>
        </div>
      </div>

      {/* Progress & Rules */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Progress Card */}
        <Card className="md:col-span-1 border-2 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-primary" />
              Progresso da Missão
            </CardTitle>
            <CardDescription>{completedCount}/11 produtos publicados</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={progressPercentage} className="h-3 mb-4" />
            <p className="text-sm text-muted-foreground">
              {completedCount === 0 ? 'Comece a publicar seus produtos!' : completedCount === products.length ? '🎉 Parabéns! Missão completa!' : `Faltam ${products.length - completedCount} produtos!`}
            </p>
          </CardContent>
        </Card>

        {/* Checklist Before Starting */}
        <Card className="md:col-span-2">
          <Collapsible open={checklistOpen} onOpenChange={setChecklistOpen}>
            <CardHeader className="pb-2">
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Checklist Antes de Começar</CardTitle>
                </div>
                {checklistOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Escolha 1 marketplace principal</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Copie o título do produto da Lojafy</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Use 3–5 imagens</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Preço competitivo</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm sm:col-span-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Publique. Simples.</strong></span>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </div>

      {/* Important Notice */}
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900 dark:text-amber-100">Importante:</p>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Os links abaixo são a <strong>fonte do produto</strong>. Seu trabalho é replicar o anúncio 
                no marketplace e depois colar <strong>SEU LINK</strong> onde indicado.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products List */}
      <div id="products-list">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-primary" />
          Listagem dos 11 Produtos
        </h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          {products.map(product => <Card key={product.id} className={`transition-all duration-300 ${product.completed ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'hover:border-primary/50'}`}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <button onClick={() => handleToggleComplete(product.id)} className="mt-1 flex-shrink-0">
                    {product.completed ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <Circle className="w-6 h-6 text-muted-foreground hover:text-primary transition-colors" />}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={`${product.completed ? 'bg-green-500 text-white border-green-500' : 'bg-primary text-primary-foreground'} font-bold text-sm px-2`}>
                        {product.number}
                      </Badge>
                      <span className={`font-medium ${product.completed ? 'line-through text-muted-foreground' : ''}`}>
                        {product.name}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground uppercase font-medium">
                          Produto Base:
                        </span>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-primary" onClick={() => window.open(product.productUrl, '_blank')}>
                          Abrir Lojafy
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopyLink(product.productUrl, product.id)}>
                          {copiedId === product.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        </Button>
                      </div>
                      
                      <div>
                        <span className="text-xs text-muted-foreground uppercase font-medium block mb-1">
                          Seu Anúncio:
                        </span>
                        <Input placeholder="Cole o link do seu anúncio aqui" value={product.userLink} onChange={e => handleUpdateLink(product.id, e.target.value)} className="h-8 text-sm" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>)}
        </div>
      </div>

      {/* Sales Strategies */}
      <div>
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Rocket className="w-6 h-6 text-primary" />
          Estratégias de Venda
        </h2>
        <p className="text-muted-foreground mb-6">
          Após publicar seus produtos, use essas estratégias para gerar as primeiras vendas.
        </p>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {strategies.map((strategy, index) => <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className={`${strategy.color} p-2 rounded-lg text-white flex-shrink-0`}>
                    <strategy.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{strategy.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{strategy.description}</p>
                    <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                      💡 {strategy.tip}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>)}
        </div>
      </div>

      {/* Final Truth */}
      <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="pt-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Verdade Final (Sem Desculpa)
          </h3>
          <ul className="space-y-2 mb-6">
            <li className="flex items-center gap-2 text-muted-foreground">
              <span className="text-red-500">✗</span>
              Produto parado não vende
            </li>
            <li className="flex items-center gap-2 text-muted-foreground">
              <span className="text-red-500">✗</span>
              Anúncio não publicado não gera dinheiro
            </li>
            <li className="flex items-center gap-2 text-muted-foreground">
              <span className="text-red-500">✗</span>
              Estratégia só funciona depois da ação
            </li>
          </ul>
          <div className="bg-primary/10 rounded-lg p-4 text-center">
            <p className="text-primary font-semibold text-lg">
              👊 Se você executar isso, já estará à frente de 90%.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>;
};
export default TopProdutosVencedores;