import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  Check, 
  RefreshCw, 
  Link2, 
  ArrowRight, 
  Settings, 
  Plus, 
  Minus,
  Sparkles,
  HelpCircle,
  AlertCircle,
  Database,
  Search,
  User,
  Mail,
  Phone,
  CheckCircle2,
  MapPin,
  HelpCircle as SupportIcon,
  MessageSquare
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DemoProduct {
  id: string;
  name: string;
  sku: string;
  image: string;
  costPrice: number;
  stock: number;
  category: string;
  status: 'ready' | 'publishing' | 'published_ml' | 'published_shp' | 'published_both';
}

export default function ResellerIntegrationDemo() {
  // Wizard Steps:
  // 1: Localizar Contas (Form -> Searching -> Results)
  // 2: Configurar Logística (Idle -> Configuring -> Success)
  // 3: Publicar Catálogo (Idle -> Publishing -> Success/Done)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1 States
  const [step1SubState, setStep1SubState] = useState<'form' | 'searching' | 'results'>('form');
  const [userData, setUserData] = useState({ name: '', email: '', phone: '' });

  // Step 2 States
  const [step2SubState, setStep2SubState] = useState<'idle' | 'configuring' | 'success'>('idle');
  const [logisticProgressML, setLogisticProgressML] = useState<'pending' | 'success'>('pending');
  const [logisticProgressSHP, setLogisticProgressSHP] = useState<'pending' | 'success'>('pending');

  // Step 3 States
  const [step3SubState, setStep3SubState] = useState<'idle' | 'publishing' | 'done'>('idle');
  const [marginPercent, setMarginPercent] = useState<number>(30);
  const [publishProgress, setPublishProgress] = useState(0);
  const [currentPublishingProduct, setCurrentPublishingProduct] = useState('');

  // Global Connection States (which persist in catalog view)
  const [mlConnected, setMlConnected] = useState(false);
  const [shpConnected, setShpConnected] = useState(false);

  // Catalog search state
  const [searchQuery, setSearchQuery] = useState('');

  // Catalog products
  const [products, setProducts] = useState<DemoProduct[]>([
    {
      id: 'dp1',
      name: 'Escova Secadora 5 em 1 Ceramic Pro',
      sku: 'ESC-SEC-5X1-PRO',
      image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=80&h=80&fit=crop&q=80',
      costPrice: 85.00,
      stock: 180,
      category: 'Beleza & Cuidados',
      status: 'ready'
    },
    {
      id: 'dp2',
      name: 'Fone Bluetooth Active Noise Cancelling ANC-90',
      sku: 'FNE-BT-ANC90-BLK',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=80&h=80&fit=crop&q=80',
      costPrice: 130.00,
      stock: 45,
      category: 'Eletrônicos',
      status: 'ready'
    },
    {
      id: 'dp3',
      name: 'Smartwatch Sport Pro GPS AMOLED',
      sku: 'SMT-WTCH-AMOLED-RED',
      image: 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?w=80&h=80&fit=crop&q=80',
      costPrice: 190.00,
      stock: 95,
      category: 'Wearables',
      status: 'ready'
    },
    {
      id: 'dp4',
      name: 'Teclado Mecânico Compact RGB Switch Brown',
      sku: 'TEC-MEC-RGB-BROWN',
      image: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=80&h=80&fit=crop&q=80',
      costPrice: 115.00,
      stock: 62,
      category: 'Informática',
      status: 'ready'
    },
    {
      id: 'dp5',
      name: 'Mini Projetor Portátil HD Cinema Home',
      sku: 'PROJ-MINI-HD-WHITE',
      image: 'https://images.unsplash.com/photo-1535016120720-40c646be5580?w=80&h=80&fit=crop&q=80',
      costPrice: 260.00,
      stock: 32,
      category: 'Eletrônicos',
      status: 'ready'
    },
    {
      id: 'dp6',
      name: 'Carregador Portátil Power Bank 20k mAh',
      sku: 'PWR-BNK-20K-FAST',
      image: 'https://images.unsplash.com/photo-1609592424085-f58475c74230?w=80&h=80&fit=crop&q=80',
      costPrice: 45.00,
      stock: 140,
      category: 'Acessórios',
      status: 'ready'
    },
    {
      id: 'dp7',
      name: 'Ring Light 12 polegadas com Tripé Articulado',
      sku: 'RNG-LGT-12-TRIPOD',
      image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=80&h=80&fit=crop&q=80',
      costPrice: 38.00,
      stock: 75,
      category: 'Fotografia',
      status: 'ready'
    },
    {
      id: 'dp8',
      name: 'Caixinha de Som Bluetooth Resistente à Água',
      sku: 'BOX-BT-WATER-BLU',
      image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=80&h=80&fit=crop&q=80',
      costPrice: 52.00,
      stock: 110,
      category: 'Áudio',
      status: 'ready'
    },
    {
      id: 'dp9',
      name: 'Umidificador de Ar Ultrassônico USB LED',
      sku: 'HUM-USB-LED-WOOD',
      image: 'https://images.unsplash.com/photo-1519558260268-cde7e03a0152?w=80&h=80&fit=crop&q=80',
      costPrice: 29.00,
      stock: 15,
      category: 'Casa',
      status: 'ready'
    },
    {
      id: 'dp10',
      name: 'Suporte Articulado para Monitor Duplo',
      sku: 'SUP-ART-MONITOR-DBL',
      image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=80&h=80&fit=crop&q=80',
      costPrice: 95.00,
      stock: 28,
      category: 'Ergonomia',
      status: 'ready'
    }
  ]);

  // Apply phone number mask (12) 91234-5678
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/\D/g, ""); // Remove non-digits
    if (value.length > 11) {
      value = value.slice(0, 11);
    }
    if (value.length > 10) {
      value = value.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
    } else if (value.length > 6) {
      value = value.replace(/^(\d{2})(\d{4})(\d{0,4})$/, "($1) $2-$3");
    } else if (value.length > 2) {
      value = value.replace(/^(\d{2})(\d{0,5})$/, "($1) $2");
    } else if (value.length > 0) {
      value = `(${value}`;
    }
    setUserData(prev => ({ ...prev, phone: value }));
  };

  // STEP 1 FLOW: Search marketplaces
  const handleSearchAccounts = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData.name || !userData.email || !userData.phone) {
      toast.warning("Por favor, preencha todos os campos para buscar suas contas.");
      return;
    }

    setStep1SubState('searching');
    toast.info("Acessando APIs dos marketplaces para consulta...", {
      description: "Pesquisando contas vinculadas aos seus dados comerciais.",
      duration: 1500
    });

    const totalDuration = 6000 + Math.random() * 6000; // 6 to 12 seconds
    setTimeout(() => {
      setStep1SubState('results');
      toast.success("Busca de contas concluída!", {
        description: "Encontramos contas ativas elegíveis para vinculação.",
        duration: 3000
      });
    }, totalDuration);
  };

  // STEP 2 FLOW: Supplier Address configuration
  const handleConfigureLogistics = () => {
    setStep2SubState('configuring');
    setLogisticProgressML('pending');
    setLogisticProgressSHP('pending');

    toast.info("Vinculando endereço de coleta da Lojafy nas suas contas...", {
      duration: 1000
    });

    const totalDuration = 6000 + Math.random() * 6000; // 6 to 12 seconds
    const mlFinishedTime = totalDuration * 0.45;

    // ML setup first
    setTimeout(() => {
      setLogisticProgressML('success');
      toast.success("Endereço sincronizado no Mercado Livre!", {
        description: "Envio Coleta configurado com o CEP do Fornecedor.",
        duration: 2000
      });
    }, mlFinishedTime);

    // Shopee setup second
    setTimeout(() => {
      setLogisticProgressSHP('success');
      setStep2SubState('success');
      toast.success("Endereço sincronizado na Shopee!", {
        description: "Coleta Shopee Envios vinculada com sucesso.",
        duration: 2500
      });
    }, totalDuration);
  };

  // STEP 3 FLOW: Margin & Publish products
  const handlePublishProducts = () => {
    setStep3SubState('publishing');
    setPublishProgress(0);

    toast.info("Iniciando publicação em lote no Mercado Livre e Shopee...", {
      description: "Formatando SKUs e aplicando margem selecionada.",
      duration: 1000
    });

    let currentProdIndex = 0;
    const totalDuration = 6000 + Math.random() * 6000; // 6 to 12 seconds
    const itemInterval = totalDuration / products.length;
    
    const interval = setInterval(() => {
      if (currentProdIndex < products.length) {
        const prod = products[currentProdIndex];
        setCurrentPublishingProduct(`Publicando SKU: ${prod.sku}...`);
        
        // Update product individual status
        setProducts(prev => prev.map((p, i) => {
          if (i === currentProdIndex) {
            return {
              ...p,
              status: 'published_both' // Uploads to both ML and Shopee
            };
          }
          return p;
        }));

        currentProdIndex++;
        setPublishProgress(Math.round((currentProdIndex / products.length) * 100));
      } else {
        clearInterval(interval);
        
        setTimeout(() => {
          setStep3SubState('done');
          setMlConnected(true);
          setShpConnected(true);
          
          toast.success("Publicação concluída com sucesso!", {
            description: `Os top ${products.length} produtos já estão ativos nas suas lojas do ML e Shopee.`,
            duration: 4000
          });
        }, 800);
      }
    }, itemInterval);
  };

  // Reset Onboarding Replay
  const resetOnboarding = () => {
    setCurrentStep(1);
    setStep1SubState('form');
    setUserData({ name: '', email: '', phone: '' });
    setStep2SubState('idle');
    setLogisticProgressML('pending');
    setLogisticProgressSHP('pending');
    setStep3SubState('idle');
    setPublishProgress(0);
    setCurrentPublishingProduct('');
    setMlConnected(false);
    setShpConnected(false);
    setProducts(prev => prev.map(p => ({ ...p, status: 'ready' })));
    toast.info("Simulador resetado para o início.");
  };

  // Pricing calculations
  const calculateSuggestedPrice = (cost: number) => {
    const fee = 0.14; // Default marketplace fee
    const margin = marginPercent / 100;
    const finalPrice = (cost * (1 + margin)) / (1 - fee);
    return Math.round(finalPrice * 100) / 100;
  };

  // Filter products by search query
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fmtBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-16 font-sans">
      
      {/* HEADER SECTION */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm px-6 py-4">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-xl shadow-md shadow-indigo-200">
                L
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-purple-600 to-indigo-850 bg-clip-text text-transparent">Lojafy</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider -mt-1">Integra</span>
              </div>
            </div>
            <div className="h-8 w-[1px] bg-slate-200 hidden sm:block mx-2"></div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-800 tracking-tight">Painel de Integração do Revendedor</h1>
                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100/50 text-[11px] font-bold py-0.5 px-2.5 rounded-full flex items-center gap-1 shadow-sm select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Operação Ativa
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Conecte suas contas, configure a logística do fornecedor e publique os produtos em lote.
              </p>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={resetOnboarding} 
            className="text-xs border-slate-200 hover:bg-slate-50 active:scale-95 transition-all text-slate-650 font-bold"
          >
            Resetar Integração
          </Button>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-8 space-y-8">
        
        {/* VISUAL STEPPER COMPONENT */}
        <section className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 px-2">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Passo a Passo</span>
          </div>

          <div className="flex flex-wrap md:flex-nowrap flex-1 items-center justify-center md:justify-end gap-3 md:gap-4 text-xs font-bold w-full md:w-auto">
            {/* Step 1 Tag */}
            <div className={`flex items-center gap-2 py-1.5 px-3.5 rounded-xl border transition-all whitespace-nowrap shrink-0 ${
              currentStep === 1 
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-150' 
                : currentStep > 1 
                ? 'bg-emerald-50 border-emerald-250 text-emerald-700' 
                : 'bg-slate-50 border-slate-150 text-slate-400'
            }`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10.5px] shrink-0 ${
                currentStep >= 1 ? 'bg-white text-slate-900 font-black' : 'bg-slate-200 text-slate-400'
              }`}>
                {currentStep > 1 ? "✓" : "1"}
              </span>
              <span>1. Localizar Contas</span>
            </div>

            <div className="h-[1px] w-6 bg-slate-200 hidden md:block shrink-0"></div>

            {/* Step 2 Tag */}
            <div className={`flex items-center gap-2 py-1.5 px-3.5 rounded-xl border transition-all whitespace-nowrap shrink-0 ${
              currentStep === 2 
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-150' 
                : currentStep > 2 
                ? 'bg-emerald-50 border-emerald-250 text-emerald-700' 
                : 'bg-slate-50 border-slate-150 text-slate-400'
            }`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10.5px] shrink-0 ${
                currentStep >= 2 ? 'bg-white text-slate-900 font-black' : 'bg-slate-200 text-slate-400'
              }`}>
                {currentStep > 2 ? "✓" : "2"}
              </span>
              <span>2. Configurar Logística</span>
            </div>

            <div className="h-[1px] w-6 bg-slate-200 hidden md:block shrink-0"></div>

            {/* Step 3 Tag */}
            <div className={`flex items-center gap-2 py-1.5 px-3.5 rounded-xl border transition-all whitespace-nowrap shrink-0 ${
              currentStep === 3 
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-150' 
                : 'bg-slate-50 border-slate-150 text-slate-400'
            }`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10.5px] shrink-0 ${
                currentStep === 3 ? 'bg-white text-slate-900 font-black' : 'bg-slate-200 text-slate-400'
              }`}>
                3
              </span>
              <span>3. Publicar Catálogo</span>
            </div>
          </div>
        </section>

        {/* ONBOARDING BOX */}
        <section className="bg-white border border-slate-150 shadow-md rounded-2xl p-6 md:p-8 space-y-6 relative overflow-hidden">
          
          {/* STEP 1 CONTROLLER */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-1.5">
                <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <User className="h-5 w-5 text-indigo-500" />
                  Passo 1: Identificação do Vendedor e Busca de Contas
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Preencha seus dados para localizarmos suas contas de vendedor ativas nos marketplaces integrados.
                </p>
              </div>

              {step1SubState === 'form' && (
                <form onSubmit={handleSearchAccounts} className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome Completo</Label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <Input 
                        id="name" 
                        placeholder="Ex: João Silva" 
                        required
                        value={userData.name}
                        onChange={e => setUserData(prev => ({ ...prev, name: e.target.value }))}
                        className="pl-10 h-10 text-xs border-slate-200 focus-visible:ring-indigo-500 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-bold text-slate-500 uppercase tracking-wider">E-mail Comercial</Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-slate-400" />
                      <Input 
                        id="email" 
                        type="email"
                        placeholder="Ex: joao@comercio.com" 
                        required
                        value={userData.email}
                        onChange={e => setUserData(prev => ({ ...prev, email: e.target.value }))}
                        className="pl-10 h-10 text-xs border-slate-200 focus-visible:ring-indigo-500 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-bold text-slate-500 uppercase tracking-wider">WhatsApp / Telefone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-slate-400" />
                      <Input 
                        id="phone" 
                        placeholder="Ex: (11) 99999-9999" 
                        required
                        value={userData.phone}
                        onChange={handlePhoneChange}
                        className="pl-10 h-10 text-xs border-slate-200 focus-visible:ring-indigo-500 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-3 pt-2">
                    <Button 
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 px-6 rounded-xl shadow-sm active:scale-95 transition-all"
                    >
                      Buscar contas nos marketplaces
                    </Button>
                  </div>
                </form>
              )}

              {step1SubState === 'searching' && (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in duration-300">
                  <RefreshCw className="h-10 w-10 text-purple-650 animate-spin" />
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-sm text-slate-800">Buscando contas ativas vinculadas aos seus dados...</h4>
                    <p className="text-xs text-slate-500 font-medium max-w-sm">Acessando API centralizada para localizar credenciais e integrações pré-existentes.</p>
                    <p className="text-[11px] text-amber-600 font-bold animate-pulse mt-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5 inline-block">
                      ⚠️ Isso pode levar um tempo...
                    </p>
                  </div>
                </div>
              )}

              {step1SubState === 'results' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    
                    {/* Mercado Livre Card (Habilitado) */}
                    <Card className="border border-blue-200 bg-blue-50/5 rounded-2xl hover:shadow-sm transition-all duration-300">
                      <CardContent className="p-5 flex flex-col items-center text-center space-y-4">
                        <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center p-2.5 shadow-sm overflow-hidden select-none">
                          <img src="https://http2.mlstatic.com/static/org-img/homesnw/mercado-libre.png" alt="Mercado Livre" className="w-full h-full object-contain" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-sm text-slate-800">Mercado Livre</h4>
                          <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-150 inline-block">
                            Conta Encontrada
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Shopee Card (Habilitado) */}
                    <Card className="border border-orange-200 bg-orange-50/5 rounded-2xl hover:shadow-sm transition-all duration-300">
                      <CardContent className="p-5 flex flex-col items-center text-center space-y-4">
                        <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center p-2 shadow-sm overflow-hidden select-none">
                          <img src="https://deo.shopeemobile.com/shopee/shopee-pcmall-live-sg/assets/icon_favicon_1_96.1ce0e05fc18a86e5.png" alt="Shopee" className="w-full h-full object-contain" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-sm text-slate-800">Shopee</h4>
                          <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-150 inline-block">
                            Conta Encontrada
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Amazon Card (Apagadinho) */}
                    <Card className="border border-slate-150 bg-slate-50/40 rounded-2xl opacity-50 relative overflow-hidden">
                      <CardContent className="p-5 flex flex-col items-center text-center space-y-4">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center p-2.5 shadow-inner grayscale select-none">
                          📦
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-sm text-slate-400">Amazon Brasil</h4>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full inline-block">
                            Conta Não Encontrada
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-450 leading-relaxed max-w-[200px]">
                          Não localizamos uma conta ativa. Fale com nosso suporte para ajudarmos você a abrir sua conta de vendedor.
                        </p>
                      </CardContent>
                    </Card>

                    {/* Magalu Card (Apagadinho) */}
                    <Card className="border border-slate-150 bg-slate-50/40 rounded-2xl opacity-50 relative overflow-hidden">
                      <CardContent className="p-5 flex flex-col items-center text-center space-y-4">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center p-2.5 shadow-inner grayscale select-none">
                          🛍️
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-sm text-slate-400">Magalu Marketplace</h4>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full inline-block">
                            Conta Não Encontrada
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-450 leading-relaxed max-w-[200px]">
                          Não localizamos uma conta ativa. Fale com nosso suporte para ajudarmos você a abrir sua conta na Magalu.
                        </p>
                      </CardContent>
                    </Card>

                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <AlertCircle className="h-4.5 w-4.5 text-indigo-500" />
                      Duas contas de vendedor ativas foram encontradas prontas para vinculação!
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs border-slate-200 hover:bg-slate-50 text-slate-600 font-bold w-full sm:w-auto"
                        onClick={() => toast.info("Suporte comercial via WhatsApp: (11) 98765-4321")}
                      >
                        <MessageSquare className="mr-1.5 h-3.5 w-3.5 text-indigo-500" /> Falar com Suporte
                      </Button>
                      <Button
                        onClick={() => setCurrentStep(2)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-5 rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 transition-all w-full sm:w-auto justify-center"
                      >
                        Avançar para Configurações <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* STEP 2 CONTROLLER */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-1.5">
                <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-indigo-500" />
                  Passo 2: Configuração do Endereço do Fornecedor Lojafy
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Para habilitar o envio direto (Drop-shipping / Crossdocking), precisamos sincronizar o endereço do nosso centro de distribuição como ponto de coleta padrão nos seus marketplaces.
                </p>
              </div>

              {step2SubState === 'idle' && (
                <div className="bg-slate-50/60 border border-slate-150 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 max-w-4xl">
                  <div className="space-y-2">
                    <h4 className="font-bold text-sm text-slate-850">Vinculação Logística Automática</h4>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                      Configuraremos o endereço da nossa central nos seus cadastros do Mercado Livre Coleta e Shopee Envios. 
                      Isso garante que todas as etiquetas geradas por você usem nosso centro como local de despacho.
                    </p>
                  </div>
                  <Button
                    onClick={handleConfigureLogistics}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-11 px-6 rounded-xl shadow-sm flex items-center gap-1.5 shrink-0 active:scale-95 transition-all"
                  >
                    Vincular Endereço do Fornecedor
                  </Button>
                </div>
              )}

              {step2SubState === 'configuring' && (
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-6 space-y-5 animate-in fade-in duration-300 max-w-2xl">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="h-5 w-5 text-indigo-500 animate-spin" />
                    <h4 className="font-bold text-sm text-slate-800">Sincronizando endereços nas APIs logísticas...</h4>
                  </div>

                  <div className="space-y-3 font-semibold text-xs text-slate-655">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span>Atualizando dados de coleta no Mercado Livre Envios</span>
                      {logisticProgressML === 'success' ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 select-none">✓ Configurado</Badge>
                      ) : (
                        <span className="text-[10px] text-slate-450 animate-pulse">Processando...</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pb-1">
                      <span>Atualizando dados de coleta na Shopee Envios</span>
                      {logisticProgressSHP === 'success' ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 select-none">✓ Configurado</Badge>
                      ) : (
                        <span className="text-[10px] text-slate-450 animate-pulse">Aguardando fila...</span>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-amber-600 font-bold animate-pulse mt-1 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5 inline-block">
                    ⚠️ Isso pode levar um tempo...
                  </p>
                </div>
              )}

              {step2SubState === 'success' && (
                <div className="space-y-6 animate-in zoom-in-95 duration-300">
                  <div className="bg-emerald-50 border border-emerald-250 rounded-2xl p-5 flex items-start gap-3 max-w-3xl">
                    <CheckCircle2 className="h-5.5 w-5.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-emerald-950">Endereços Logísticos Vinculados!</h4>
                      <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                        O endereço de remessa da Lojafy foi definido como o local de coleta principal em ambos os canais de venda. 
                        Sua logística está pronta para a postagem e entrega automatizada.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <Button
                      onClick={() => setCurrentStep(3)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 px-6 rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                      Avançar para Publicação dos Produtos <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* STEP 3 CONTROLLER */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-1.5">
                <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-500" />
                  Passo 3: Margem de Lucro e Publicação em Lote
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Defina a sua margem comercial sobre o preço de custo e publique os top 20 produtos mais vendidos nas suas contas integradas.
                </p>
              </div>

              {step3SubState === 'idle' && (
                <div className="bg-gradient-to-r from-indigo-50/50 via-slate-50 to-purple-50/30 border border-indigo-100 rounded-2xl p-6 space-y-6 max-w-4xl">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-xl">
                      <Settings className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-slate-850">Definição de Lucratividade</h4>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">
                        Defina a margem desejada abaixo. Ela será somada ao custo do catálogo da Lojafy e calculada de forma ideal, incluindo a taxa de comissão média padrão de 14% do Mercado Livre e Shopee.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-end gap-4 max-w-xl">
                    <div className="space-y-2 flex-1 w-full">
                      <Label htmlFor="margin-input" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Margem de Lucro Pretendida (%)</Label>
                      <div className="relative flex items-center">
                        <button 
                          onClick={() => setMarginPercent(prev => Math.max(0, prev - 5))}
                          className="absolute left-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg p-1.5 text-slate-600 active:scale-90 transition-all"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <Input
                          id="margin-input"
                          type="number"
                          value={marginPercent}
                          onChange={(e) => setMarginPercent(Math.max(0, parseInt(e.target.value) || 0))}
                          className="pl-12 pr-12 text-center font-bold text-sm h-10 border-slate-200 focus-visible:ring-indigo-500 rounded-xl w-full"
                        />
                        <span className="absolute right-12 font-bold text-slate-400 text-xs">%</span>
                        <button 
                          onClick={() => setMarginPercent(prev => prev + 5)}
                          className="absolute right-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg p-1.5 text-slate-600 active:scale-90 transition-all"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <Button
                      onClick={handlePublishProducts}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 px-6 rounded-xl shadow-sm flex items-center gap-1.5 w-full sm:w-auto"
                    >
                      Definir Margem e Publicar em Lote <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {step3SubState === 'publishing' && (
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-6 space-y-4 max-w-3xl">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="h-4 w-4 text-purple-600 animate-spin" />
                      Os top 20 produtos estão subindo para suas lojas. Aguarde...
                    </span>
                    <span className="font-extrabold text-slate-900">{publishProgress}%</span>
                  </div>

                  <div className="w-full h-3.5 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                      style={{ width: `${publishProgress}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-500 font-bold">
                    <span className="font-mono text-purple-650 animate-pulse">{currentPublishingProduct}</span>
                    <span className="text-amber-600 font-bold animate-pulse">⚠️ Isso pode levar um tempo...</span>
                  </div>
                </div>
              )}

              {step3SubState === 'done' && (
                <div className="space-y-6 animate-in zoom-in-95 duration-300">
                  <div className="bg-emerald-50 border border-emerald-250 rounded-2xl p-6 flex items-start gap-3 max-w-4xl">
                    <CheckCircle2 className="h-5.5 w-5.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-emerald-950">Sucesso na Publicação Geral!</h4>
                      <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                        Seu catálogo de 20 SKUs de alta conversão foi enviado e publicado com sucesso no **Mercado Livre** e na **Shopee** com a margem definida de **{marginPercent}%**. 
                        Todos os anúncios já estão ativos e sincronizados no seu catálogo!
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-150 font-bold text-[10.5px]">
                      20 Anúncios Integrados
                    </Badge>
                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-150 font-bold text-[10.5px]">
                      Margem: {marginPercent}%
                    </Badge>
                    <Badge className="bg-blue-50 text-blue-700 border border-blue-150 font-bold text-[10.5px]">
                      ML & Shopee Sincronizados
                    </Badge>
                  </div>
                </div>
              )}

            </div>
          )}

        </section>

        {/* CATALOG LIST CONTAINER */}
        {currentStep === 3 && (
          <section className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-50 bg-slate-50/20 px-6 py-5">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Database className="h-4 w-4 text-indigo-500" />
                Pré-visualização do Catálogo de Produtos
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Os preços de venda exibidos abaixo são calculados em tempo real com base no custo de fornecedor da Lojafy e na margem de lucro selecionada no passo 3.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input 
                  placeholder="Buscar SKU ou nome..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-xs bg-slate-50 border-slate-200 focus:bg-white rounded-lg focus-visible:ring-purple-500"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-b border-slate-100 hover:bg-transparent">
                  <TableHead className="text-xs font-bold text-slate-500 h-10 px-6">Produto</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 h-10 px-4">Categoria</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 h-10 px-4 text-right">Preço de Custo</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 h-10 px-4 text-center">Margem</TableHead>
                  <TableHead className="text-xs font-bold text-indigo-650 h-10 px-4 text-right bg-indigo-55/10">Preço Sugerido (Venda)</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 h-10 px-4 text-center">Estoque</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 h-10 px-6 text-center">Status no Canal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-xs text-slate-400 font-medium">
                      Nenhum produto correspondente encontrado no catálogo.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((p) => {
                    const isMlPublished = mlConnected || p.status === 'published_ml' || p.status === 'published_both';
                    const isShpPublished = shpConnected || p.status === 'published_shp' || p.status === 'published_both';
                    const isPublished = isMlPublished || isShpPublished;
                    
                    let statusColor = "bg-slate-50 text-slate-500 border-slate-200";
                    let statusLabel = "Pronto para publicar";

                    if (isMlPublished && isShpPublished) {
                      statusColor = "bg-indigo-50 text-indigo-750 border-indigo-200/50 font-bold";
                      statusLabel = "Ativo no ML e Shopee";
                    } else if (isMlPublished) {
                      statusColor = "bg-blue-50 text-blue-700 border-blue-200/50 font-bold";
                      statusLabel = "Ativo no Mercado Livre";
                    } else if (isShpPublished) {
                      statusColor = "bg-orange-50 text-orange-700 border-orange-200/50 font-bold";
                      statusLabel = "Ativo na Shopee";
                    }

                    return (
                      <TableRow key={p.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <TableCell className="py-3.5 px-6">
                          <div className="flex items-center gap-3">
                            <img 
                              src={p.image} 
                              alt={p.name} 
                              className="w-10 h-10 rounded-lg object-cover border border-slate-150 shadow-sm shrink-0"
                            />
                            <div className="flex flex-col">
                              <span className="font-bold text-xs text-slate-800 max-w-[280px] truncate">{p.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono mt-0.5">{p.sku}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-xs text-slate-500 py-3.5 px-4">{p.category}</TableCell>
                        <TableCell className="font-bold text-xs text-slate-900 text-right py-3.5 px-4">{fmtBRL(p.costPrice)}</TableCell>
                        <TableCell className="font-bold text-xs text-slate-600 text-center py-3.5 px-4">{marginPercent}%</TableCell>
                        <TableCell className="font-black text-xs text-indigo-700 text-right py-3.5 px-4 bg-indigo-50/10">
                          {fmtBRL(calculateSuggestedPrice(p.costPrice))}
                        </TableCell>
                        <TableCell className="text-center py-3.5 px-4">
                          <span className="text-xs font-bold text-slate-600">{p.stock} un</span>
                        </TableCell>
                        <TableCell className="py-3.5 px-6 text-center">
                          <Badge variant="outline" className={`rounded-lg px-2.5 py-0.5 border text-[10px] ${statusColor}`}>
                            {isPublished && <Check className="h-3 w-3 inline mr-1" />}
                            {statusLabel}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </section>
        )}

      </main>
    </div>
  );
}
