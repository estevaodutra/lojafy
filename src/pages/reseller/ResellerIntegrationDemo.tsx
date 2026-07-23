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
  MessageSquare,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  const [logisticProgressML, setLogisticProgressML] = useState<'pending' | 'configuring' | 'success'>('pending');
  const [logisticProgressSHP, setLogisticProgressSHP] = useState<'pending' | 'configuring' | 'success'>('pending');

  // Step 3 States
  const [step3SubState, setStep3SubState] = useState<'idle' | 'publishing' | 'done'>('idle');
  const [marginPercent, setMarginPercent] = useState<number>(30);
  const [publishProgress, setPublishProgress] = useState(0);
  const [currentPublishingProduct, setCurrentPublishingProduct] = useState('');
  const [currentPublishingIndex, setCurrentPublishingIndex] = useState<number | null>(null);
  const [viewingIndex, setViewingIndex] = useState<number>(0);
  const [showModal, setShowModal] = useState(false);

  // Live publishing states for the active product
  const [publishingMLState, setPublishingMLState] = useState<'pending' | 'publishing' | 'success'>('pending');
  const [publishingSHPState, setPublishingSHPState] = useState<'pending' | 'publishing' | 'success'>('pending');

  // Global Connection States (which persist in catalog view)
  const [mlConnected, setMlConnected] = useState(false);
  const [shpConnected, setShpConnected] = useState(false);

  // Step 1 selected accounts to configure/integrate
  const [selectedML, setSelectedML] = useState(true);
  const [selectedSHP, setSelectedSHP] = useState(true);

  // Catalog search state
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch real products from Supabase
  const { data: dbProducts = [] } = useQuery({
    queryKey: ['reseller-db-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .limit(20);
      if (error) throw error;
      return data || [];
    }
  });

  // Map database products to reseller demo products
  useEffect(() => {
    if (dbProducts && dbProducts.length > 0) {
      const mapped = dbProducts.map((p: any) => ({
        id: p.id,
        name: p.name,
        sku: p.sku || `SKU-${p.id.slice(0, 8).toUpperCase()}`,
        image: p.main_image_url || p.image_url || (p.images && p.images[0]) || '/placeholder.svg',
        costPrice: Number(p.cost_price || p.price * 0.7 || 10.00),
        stock: p.stock_quantity || 50,
        category: p.category_id || 'Geral',
        status: 'ready' as const
      }));
      setProducts(mapped);
    }
  }, [dbProducts]);

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
    
    toast.info("Vinculando endereço de coleta da Lojafy nas suas contas...", {
      duration: 1000
    });

    const durationML = 3000 + Math.random() * 3000;
    const durationSHP = 3000 + Math.random() * 3000;

    if (selectedML && selectedSHP) {
      setLogisticProgressML('configuring');
      setLogisticProgressSHP('pending');

      // Configure ML first
      setTimeout(() => {
        setLogisticProgressML('success');
        toast.success("Endereço sincronizado no Mercado Livre!", {
          description: "Envio Coleta configurado com o CEP do Fornecedor.",
          duration: 2000
        });

        // Now start configuring Shopee
        setLogisticProgressSHP('configuring');
        
        setTimeout(() => {
          setLogisticProgressSHP('success');
          setStep2SubState('success');
          toast.success("Endereço sincronizado na Shopee!", {
            description: "Coleta Shopee Envios vinculada com sucesso.",
            duration: 2500
          });
        }, durationSHP);

      }, durationML);
    } else if (selectedML) {
      setLogisticProgressML('configuring');
      setLogisticProgressSHP('pending');

      setTimeout(() => {
        setLogisticProgressML('success');
        setStep2SubState('success');
        toast.success("Endereço sincronizado no Mercado Livre!", {
          description: "Envio Coleta configurado com o CEP do Fornecedor.",
          duration: 2500
        });
      }, durationML);
    } else if (selectedSHP) {
      setLogisticProgressML('pending');
      setLogisticProgressSHP('configuring');

      setTimeout(() => {
        setLogisticProgressSHP('success');
        setStep2SubState('success');
        toast.success("Endereço sincronizado na Shopee!", {
          description: "Coleta Shopee Envios vinculada com sucesso.",
          duration: 2500
        });
      }, durationSHP);
    }
  };

  // STEP 3 FLOW: Margin & Publish products
  const handlePublishProducts = () => {
    setStep3SubState('publishing');
    setPublishProgress(0);
    setShowModal(true);
    setCurrentPublishingIndex(0);
    setViewingIndex(0);

    toast.info("Iniciando publicação em lote no Mercado Livre e Shopee...", {
      description: "Formatando SKUs e aplicando margem selecionada.",
      duration: 1500
    });

    const targetStatus = selectedML && selectedSHP 
      ? 'published_both' 
      : selectedML 
      ? 'published_ml' 
      : 'published_shp';

    const publishNextProduct = (index: number) => {
      if (index >= products.length) {
        setStep3SubState('done');
        setMlConnected(selectedML);
        setShpConnected(selectedSHP);
        setCurrentPublishingIndex(null);
        
        const channelsText = selectedML && selectedSHP 
          ? "Mercado Livre e Shopee" 
          : selectedML 
          ? "Mercado Livre" 
          : "Shopee";

        toast.success("Publicação concluída com sucesso!", {
          description: `Os ${products.length} produtos do catálogo foram publicados no ${channelsText}.`,
          duration: 4000
        });
        return;
      }

      const currentProd = products[index];
      setCurrentPublishingProduct(`Publicando: ${currentProd.name}...`);
      setCurrentPublishingIndex(index);
      
      // Update viewing index if user is following live
      setViewingIndex(prev => {
        if (prev === index - 1 || prev === index) {
          return index;
        }
        return prev;
      });

      // Reset active product state
      setProducts(prev => prev.map(p => p.id === currentProd.id ? { ...p, status: 'publishing' } : p));
      setPublishingMLState('pending');
      setPublishingSHPState('pending');

      // Random delay between 5 and 10 seconds total for this product
      // We will split the delay sequentially
      const durationML = selectedML ? (2500 + Math.random() * 2000) : 0;
      const durationSHP = selectedSHP ? (2500 + Math.random() * 2000) : 0;
      const postApprovalDelay = 2500; // Stay on screen for 2.5s

      if (selectedML && selectedSHP) {
        // Start ML publishing
        setPublishingMLState('publishing');

        setTimeout(() => {
          setPublishingMLState('success');
          // Start Shopee publishing
          setPublishingSHPState('publishing');

          setTimeout(() => {
            setPublishingSHPState('success');
            setProducts(prev => prev.map(p => p.id === currentProd.id ? { ...p, status: targetStatus } : p));
            setPublishProgress(Math.round(((index + 1) / products.length) * 100));

            // Wait on screen before proceeding
            setTimeout(() => {
              publishNextProduct(index + 1);
            }, postApprovalDelay);

          }, durationSHP);

        }, durationML);
      } else if (selectedML) {
        setPublishingMLState('publishing');
        setTimeout(() => {
          setPublishingMLState('success');
          setProducts(prev => prev.map(p => p.id === currentProd.id ? { ...p, status: targetStatus } : p));
          setPublishProgress(Math.round(((index + 1) / products.length) * 100));

          setTimeout(() => {
            publishNextProduct(index + 1);
          }, postApprovalDelay);
        }, durationML + durationSHP || 5000);
      } else if (selectedSHP) {
        setPublishingSHPState('publishing');
        setTimeout(() => {
          setPublishingSHPState('success');
          setProducts(prev => prev.map(p => p.id === currentProd.id ? { ...p, status: targetStatus } : p));
          setPublishProgress(Math.round(((index + 1) / products.length) * 100));

          setTimeout(() => {
            publishNextProduct(index + 1);
          }, postApprovalDelay);
        }, durationML + durationSHP || 5000);
      }
    };

    publishNextProduct(0);
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
    setSelectedML(true);
    setSelectedSHP(true);
    setCurrentPublishingIndex(null);
    setViewingIndex(0);
    setPublishingMLState('pending');
    setPublishingSHPState('pending');
    setShowModal(false);
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
        <section className="bg-white border border-slate-150 shadow-md rounded-2xl p-4 sm:p-6 md:p-8 space-y-6 relative overflow-hidden">
          
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
                    
                    {/* Mercado Livre Card (Habilitado / Selecionável) */}
                    <Card 
                      onClick={() => setSelectedML(!selectedML)}
                      className={`relative cursor-pointer transition-all duration-300 rounded-2xl border ${
                        selectedML 
                          ? 'border-blue-450 bg-blue-50/5 shadow-md ring-1 ring-blue-100' 
                          : 'border-slate-150 bg-slate-50/10 opacity-60 shadow-none'
                      }`}
                    >
                      <CardContent className="p-5 flex flex-col items-center text-center space-y-4">
                        {/* Checkbox Selector */}
                        <div className="absolute top-3 right-3 flex items-center justify-center">
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                            selectedML 
                              ? 'bg-blue-600 border-blue-600 text-white' 
                              : 'border-slate-350 bg-white'
                          }`}>
                            {selectedML && <Check className="h-3.5 w-3.5 font-bold" />}
                          </div>
                        </div>

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

                    {/* Shopee Card (Habilitado / Selecionável) */}
                    <Card 
                      onClick={() => setSelectedSHP(!selectedSHP)}
                      className={`relative cursor-pointer transition-all duration-300 rounded-2xl border ${
                        selectedSHP 
                          ? 'border-orange-450 bg-orange-50/5 shadow-md ring-1 ring-orange-100' 
                          : 'border-slate-150 bg-slate-50/10 opacity-60 shadow-none'
                      }`}
                    >
                      <CardContent className="p-5 flex flex-col items-center text-center space-y-4">
                        {/* Checkbox Selector */}
                        <div className="absolute top-3 right-3 flex items-center justify-center">
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                            selectedSHP 
                              ? 'bg-orange-600 border-orange-600 text-white' 
                              : 'border-slate-350 bg-white'
                          }`}>
                            {selectedSHP && <Check className="h-3.5 w-3.5 font-bold" />}
                          </div>
                        </div>

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
                    <Card className="border border-slate-150 bg-slate-50/40 rounded-2xl opacity-50 relative overflow-hidden select-none">
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
                    <Card className="border border-slate-150 bg-slate-50/40 rounded-2xl opacity-50 relative overflow-hidden select-none">
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
                      <AlertCircle className="h-4.5 w-4.5 text-indigo-500 animate-in fade-in" />
                      {!selectedML && !selectedSHP 
                        ? "Selecione pelo menos uma conta de vendedor para avançar." 
                        : (selectedML && selectedSHP) 
                        ? "Duas contas de vendedor selecionadas prontas para vinculação!" 
                        : "Uma conta de vendedor selecionada pronta para vinculação!"}
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
                        disabled={!selectedML && !selectedSHP}
                        onClick={() => setCurrentStep(2)}
                        className={`font-bold text-xs h-9 px-5 rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 transition-all w-full sm:w-auto justify-center ${
                          (!selectedML && !selectedSHP)
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
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
                    <h4 className="font-bold text-sm text-slate-850 flex items-center gap-2">
                      Vinculação Logística Automática
                      <div className="flex items-center gap-1.5 ml-1">
                        {selectedML && (
                          <div className="w-5.5 h-5.5 rounded bg-white border border-slate-100 p-0.5 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                            <img src="https://http2.mlstatic.com/static/org-img/homesnw/mercado-libre.png" alt="ML" className="w-full h-full object-contain" />
                          </div>
                        )}
                        {selectedSHP && (
                          <div className="w-5.5 h-5.5 rounded bg-white border border-slate-100 p-0.5 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                            <img src="https://deo.shopeemobile.com/shopee/shopee-pcmall-live-sg/assets/icon_favicon_1_96.1ce0e05fc18a86e5.png" alt="Shopee" className="w-full h-full object-contain" />
                          </div>
                        )}
                      </div>
                    </h4>
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
                    {selectedML && (
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded bg-white border border-slate-100 p-0.5 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                            <img src="https://http2.mlstatic.com/static/org-img/homesnw/mercado-libre.png" alt="ML" className="w-full h-full object-contain" />
                          </div>
                          <span>Atualizando dados de coleta no Mercado Livre Envios</span>
                        </div>
                        {logisticProgressML === 'success' ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 select-none">✓ Configurado</Badge>
                        ) : logisticProgressML === 'configuring' ? (
                          <span className="text-[10px] text-indigo-600 font-bold animate-pulse flex items-center gap-1 select-none">
                            <RefreshCw className="h-3 w-3 animate-spin" /> Processando...
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 select-none">Aguardando...</span>
                        )}
                      </div>
                    )}

                    {selectedSHP && (
                      <div className="flex items-center justify-between pb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded bg-white border border-slate-100 p-0.5 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                            <img src="https://deo.shopeemobile.com/shopee/shopee-pcmall-live-sg/assets/icon_favicon_1_96.1ce0e05fc18a86e5.png" alt="Shopee" className="w-full h-full object-contain" />
                          </div>
                          <span>Atualizando dados de coleta na Shopee Envios</span>
                        </div>
                        {logisticProgressSHP === 'success' ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 select-none">✓ Configurado</Badge>
                        ) : logisticProgressSHP === 'configuring' ? (
                          <span className="text-[10px] text-orange-600 font-bold animate-pulse flex items-center gap-1 select-none">
                            <RefreshCw className="h-3 w-3 animate-spin text-orange-500" /> Sincronizando...
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 select-none">Aguardando...</span>
                        )}
                      </div>
                    )}
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
                      <h4 className="font-bold text-sm text-emerald-950 flex items-center gap-2">
                        Endereços Logísticos Vinculados!
                        <div className="flex items-center gap-1.5">
                          {selectedML && (
                            <div className="w-5 h-5 rounded bg-white border border-slate-100 p-0.5 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                              <img src="https://http2.mlstatic.com/static/org-img/homesnw/mercado-libre.png" alt="ML" className="w-full h-full object-contain" />
                            </div>
                          )}
                          {selectedSHP && (
                            <div className="w-5 h-5 rounded bg-white border border-slate-100 p-0.5 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                              <img src="https://deo.shopeemobile.com/shopee/shopee-pcmall-live-sg/assets/icon_favicon_1_96.1ce0e05fc18a86e5.png" alt="Shopee" className="w-full h-full object-contain" />
                            </div>
                          )}
                        </div>
                      </h4>
                      <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                        {selectedML && selectedSHP 
                          ? "O endereço de remessa da Lojafy foi definido como o local de coleta principal em ambos os canais de venda. Sua logística está pronta para a postagem e entrega automatizada."
                          : selectedML 
                          ? "O endereço de remessa da Lojafy foi definido como o local de coleta principal no Mercado Livre. Sua logística está pronta para a postagem e entrega automatizada."
                          : "O endereço de remessa da Lojafy foi definido como o local de coleta principal na Shopee. Sua logística está pronta para a postagem e entrega automatizada."
                        }
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <Button
                      onClick={() => setCurrentStep(3)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 px-6 rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 transition-all w-full sm:w-auto justify-center"
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
                      <h4 className="font-bold text-sm text-emerald-950 flex items-center gap-2">
                        Sucesso na Publicação Geral!
                        <div className="flex items-center gap-1.5">
                          {selectedML && (
                            <div className="w-5 h-5 rounded bg-white border border-slate-100 p-0.5 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                              <img src="https://http2.mlstatic.com/static/org-img/homesnw/mercado-libre.png" alt="ML" className="w-full h-full object-contain" />
                            </div>
                          )}
                          {selectedSHP && (
                            <div className="w-5 h-5 rounded bg-white border border-slate-100 p-0.5 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                              <img src="https://deo.shopeemobile.com/shopee/shopee-pcmall-live-sg/assets/icon_favicon_1_96.1ce0e05fc18a86e5.png" alt="Shopee" className="w-full h-full object-contain" />
                            </div>
                          )}
                        </div>
                      </h4>
                      <p className="text-xs text-emerald-800 leading-relaxed font-medium flex flex-wrap items-center gap-1">
                        Seu catálogo de 20 SKUs de alta conversão foi enviado e publicado com sucesso no 
                        {selectedML && (
                          <span className="inline-flex items-center gap-1 font-bold">
                            <span className="w-3.5 h-3.5 rounded bg-white border border-slate-100 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                              <img src="https://http2.mlstatic.com/static/org-img/homesnw/mercado-libre.png" alt="ML" className="w-full h-full object-contain" />
                            </span>
                            Mercado Livre
                          </span>
                        )}
                        {selectedML && selectedSHP && " e na "}
                        {selectedSHP && (
                          <span className="inline-flex items-center gap-1 font-bold">
                            <span className="w-3.5 h-3.5 rounded bg-white border border-slate-100 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                              <img src="https://deo.shopeemobile.com/shopee/shopee-pcmall-live-sg/assets/icon_favicon_1_96.1ce0e05fc18a86e5.png" alt="Shopee" className="w-full h-full object-contain" />
                            </span>
                            Shopee
                          </span>
                        )}
                        com a margem definida de <strong>{marginPercent}%</strong>. Todos os anúncios já estão ativos e sincronizados no seu catálogo!
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-150 font-bold text-[10.5px]">
                      20 Anúncios Integrados
                    </Badge>
                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-150 font-bold text-[10.5px]">
                      Margem: {marginPercent}%
                    </Badge>
                    {selectedML && (
                      <Badge className="bg-blue-50 text-blue-700 border border-blue-150 font-bold text-[10.5px] flex items-center gap-1 select-none">
                        <span className="w-3.5 h-3.5 rounded bg-white border border-slate-100 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                          <img src="https://http2.mlstatic.com/static/org-img/homesnw/mercado-libre.png" alt="ML" className="w-full h-full object-contain" />
                        </span>
                        ML Sincronizado
                      </Badge>
                    )}
                    {selectedSHP && (
                      <Badge className="bg-orange-50 text-orange-700 border border-orange-150 font-bold text-[10.5px] flex items-center gap-1 select-none">
                        <span className="w-3.5 h-3.5 rounded bg-white border border-slate-100 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                          <img src="https://deo.shopeemobile.com/shopee/shopee-pcmall-live-sg/assets/icon_favicon_1_96.1ce0e05fc18a86e5.png" alt="Shopee" className="w-full h-full object-contain" />
                        </span>
                        Shopee Sincronizada
                      </Badge>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}

        </section>

        {/* CATALOG LIST CONTAINER */}
        {currentStep === 3 && (
          <section className="space-y-6">
            <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Database className="h-4 w-4 text-indigo-500" />
                  Visualização do Catálogo de Produtos
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Abaixo estão listados os produtos do seu catálogo. Modifique a margem comercial acima para simular preços de venda e lucros sugeridos.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input 
                  placeholder="Buscar produto por nome ou SKU..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs border-slate-200 focus-visible:ring-indigo-500 rounded-xl"
                />
              </div>
            </div>

            {/* PRODUCT CARDS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full bg-white border border-slate-100 rounded-2xl p-12 text-center text-slate-400 font-semibold text-xs">
                  Nenhum produto correspondente encontrado.
                </div>
              ) : (
                [...filteredProducts]
                  .sort((a, b) => {
                    const score = (p: typeof a) => {
                      if (p.status === 'published_both') return 2;
                      if (p.status === 'publishing') return 1;
                      return 0;
                    };
                    return score(b) - score(a);
                  })
                  .map(product => {
                    const costPrice = product.costPrice;
                    const suggestedPrice = calculateSuggestedPrice(costPrice);
                    const profit = suggestedPrice - costPrice;
                    
                    const isPublishing = product.status === 'publishing';
                    const isPublished = product.status === 'published_both';

                    return (
                      <Card 
                        key={product.id} 
                        className={`overflow-hidden border rounded-2xl transition-all duration-300 ${
                          isPublishing 
                            ? 'border-indigo-400 ring-2 ring-indigo-100 shadow-md animate-pulse' 
                            : isPublished 
                            ? 'border-emerald-200 bg-emerald-50/5 shadow-sm' 
                            : 'border-slate-100 hover:shadow-md'
                        }`}
                      >
                        <CardContent className="p-0 flex flex-col h-full">
                          {/* Image Container */}
                          <div className="relative aspect-square bg-slate-50/50 p-4 flex items-center justify-center border-b border-slate-50">
                            <img 
                              src={product.image} 
                              alt={product.name} 
                              className="max-h-full max-w-full object-contain select-none rounded-lg" 
                            />
                            {isPublished && (
                              <Badge className="absolute top-3 left-3 bg-emerald-50 text-emerald-700 border border-emerald-100/50 flex items-center gap-1 font-bold text-[10px] py-0.5 px-2 select-none">
                                <Check className="h-3 w-3 text-emerald-600" /> Ativo
                              </Badge>
                            )}
                            {isPublishing && (
                              <Badge className="absolute top-3 left-3 bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1 font-bold text-[10px] py-0.5 px-2 animate-pulse select-none">
                                <RefreshCw className="h-2.5 w-2.5 animate-spin text-indigo-500" /> Enviando...
                              </Badge>
                            )}
                          </div>

                          {/* Info Container */}
                          <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                            <div className="space-y-1">
                              <span className="text-[10px] font-mono text-slate-400 font-bold tracking-wider">{product.sku}</span>
                              <h4 className="font-bold text-xs text-slate-800 line-clamp-2 leading-relaxed h-8">
                                {product.name}
                              </h4>
                            </div>

                            {/* Prices and Profit */}
                            <div className="space-y-2 border-t border-slate-50 pt-3">
                              <div className="flex justify-between items-center text-[11px] font-semibold text-slate-500">
                                <span>Custo Fornecedor:</span>
                                <span className="font-bold text-slate-700">{fmtBRL(costPrice)}</span>
                              </div>

                              <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                                <span>Preço de Venda:</span>
                                <span className="text-indigo-650 font-black">{fmtBRL(suggestedPrice)}</span>
                              </div>

                              <div className="flex justify-between items-center text-xs font-bold bg-emerald-50/50 border border-emerald-100/50 rounded-xl px-2.5 py-1.5 mt-1">
                                <span className="text-emerald-800 font-semibold text-[11px]">Seu Lucro Estimado:</span>
                                <span className="text-emerald-700 font-black text-xs font-mono">{fmtBRL(profit)}</span>
                              </div>
                            </div>

                            {/* Channel Integration Badges */}
                            <div className="border-t border-slate-50 pt-3 space-y-1.5">
                              <div className="flex justify-between items-center text-[10px] font-bold">
                                <span className="text-slate-405 flex items-center gap-1">
                                  <span className="w-3.5 h-3.5 rounded bg-white border border-slate-100 p-0.5 flex items-center justify-center overflow-hidden shrink-0 select-none">
                                    <img src="https://http2.mlstatic.com/static/org-img/homesnw/mercado-libre.png" alt="ML" className="w-full h-full object-contain" />
                                  </span>
                                  Mercado Livre
                                </span>
                                {!selectedML ? (
                                  <span className="text-slate-400 bg-slate-100/50 px-1.5 py-0.5 rounded border border-slate-155">
                                    Não integrado
                                  </span>
                                ) : isPublished || product.status === 'published_ml' ? (
                                  <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-150 flex items-center gap-0.5 select-none">
                                    ✓ Publicado
                                  </span>
                                ) : isPublishing ? (
                                  <span className="text-indigo-600 animate-pulse">Enviando...</span>
                                ) : (
                                  <span className="text-slate-400">Pendente</span>
                                )}
                              </div>

                              <div className="flex justify-between items-center text-[10px] font-bold">
                                <span className="text-slate-405 flex items-center gap-1">
                                  <span className="w-3.5 h-3.5 rounded bg-white border border-slate-100 p-0.5 flex items-center justify-center overflow-hidden shrink-0 select-none">
                                    <img src="https://deo.shopeemobile.com/shopee/shopee-pcmall-live-sg/assets/icon_favicon_1_96.1ce0e05fc18a86e5.png" alt="Shopee" className="w-full h-full object-contain" />
                                  </span>
                                  Shopee
                                </span>
                                {!selectedSHP ? (
                                  <span className="text-slate-400 bg-slate-100/50 px-1.5 py-0.5 rounded border border-slate-155">
                                    Não integrado
                                  </span>
                                ) : isPublished || product.status === 'published_shp' ? (
                                  <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-150 flex items-center gap-0.5 select-none">
                                    ✓ Publicado
                                  </span>
                                ) : isPublishing ? (
                                  <span className="text-indigo-600 animate-pulse">Enviando...</span>
                                ) : (
                                  <span className="text-slate-400">Pendente</span>
                                )}
                              </div>
                            </div>

                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
              )}
            </div>
          </section>
        )}

        {/* Modal / Pop-up de Publicação */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
              
              {step3SubState === 'publishing' && viewingIndex !== null && products[viewingIndex] && (() => {
                const product = products[viewingIndex];
                const costPrice = product.costPrice;
                const suggestedPrice = calculateSuggestedPrice(costPrice);
                const profit = suggestedPrice - costPrice;
                const isPastProduct = currentPublishingIndex !== null && viewingIndex < currentPublishingIndex;
                
                return (
                  <>
                    {/* Header Progress */}
                    <div className="bg-slate-50 border-b border-slate-100 px-5 py-4 space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                        <span className="flex items-center gap-1.5 text-indigo-650">
                          {isPastProduct ? (
                            <span className="text-emerald-600 flex items-center gap-1">✓ Sincronizado</span>
                          ) : (
                            <>
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              Sincronizando...
                            </>
                          )}
                        </span>
                        <span className="font-extrabold text-slate-900 select-none">
                          {isPastProduct ? (viewingIndex + 1) : (currentPublishingIndex !== null ? currentPublishingIndex + 1 : 1)} de {products.length} ({publishProgress}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                          style={{ width: `${publishProgress}%` }}
                        />
                      </div>
                    </div>

                    {/* Focused Product Card Container with Chevrons */}
                    <div className="p-6 flex-1 flex items-center justify-center relative select-none">
                      
                      {/* Left Chevron */}
                      {viewingIndex > 0 && (
                        <button 
                          onClick={() => setViewingIndex(prev => prev - 1)}
                          className="absolute left-1.5 top-1/2 -translate-y-1/2 bg-white hover:bg-slate-50 border border-slate-200 rounded-full p-2 text-slate-700 shadow-md active:scale-90 transition-all z-20 animate-in fade-in"
                        >
                          <ChevronLeft className="h-4 w-4 stroke-[3px]" />
                        </button>
                      )}

                      {/* Glowing card */}
                      <div className={`w-full border-2 rounded-2xl overflow-hidden bg-white transition-all duration-500 ${
                        isPastProduct 
                          ? 'border-emerald-500/80 shadow-md ring-4 ring-emerald-50/50' 
                          : 'border-indigo-500/85 shadow-lg ring-4 ring-indigo-50/50 animate-pulse duration-1000'
                      }`}>
                        {/* Image */}
                        <div className="relative aspect-square bg-slate-50/50 p-4 flex items-center justify-center border-b border-slate-50 h-44">
                          <img 
                            src={product.image} 
                            alt={product.name} 
                            className="max-h-full max-w-full object-contain rounded-lg select-none" 
                          />
                          {isPastProduct ? (
                            <Badge className="absolute top-3 left-3 bg-emerald-50 text-emerald-700 border border-emerald-100/50 flex items-center gap-1 font-bold text-[9px] py-0.5 px-2 select-none">
                              <Check className="h-2.5 w-2.5 text-emerald-600" /> Publicado
                            </Badge>
                          ) : (
                            <Badge className="absolute top-3 left-3 bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1 font-bold text-[9px] py-0.5 px-2 select-none">
                              <RefreshCw className="h-2.5 w-2.5 animate-spin text-indigo-500" /> Enviando...
                            </Badge>
                          )}
                        </div>

                        {/* Info */}
                        <div className="p-4 space-y-3">
                          <div>
                            <span className="text-[9px] font-mono text-slate-400 font-bold tracking-wider">{product.sku}</span>
                            <h4 className="font-bold text-xs text-slate-800 line-clamp-2 leading-relaxed h-8">
                              {product.name}
                            </h4>
                          </div>

                          {/* Prices */}
                          <div className="space-y-1.5 border-t border-slate-50 pt-2 text-[11px]">
                            <div className="flex justify-between items-center font-semibold text-slate-500">
                              <span>Custo Fornecedor:</span>
                              <span className="font-bold text-slate-700">{fmtBRL(costPrice)}</span>
                            </div>
                            <div className="flex justify-between items-center font-bold text-slate-850">
                              <span>Preço de Venda:</span>
                              <span className="text-indigo-650 font-black">{fmtBRL(suggestedPrice)}</span>
                            </div>
                            <div className="flex justify-between items-center font-bold bg-emerald-50/50 border border-emerald-100/50 rounded-xl px-2.5 py-1.5 mt-1 text-[10px]">
                              <span className="text-emerald-800 font-semibold">Seu Lucro Estimado:</span>
                              <span className="text-emerald-700 font-black font-mono">{fmtBRL(profit)}</span>
                            </div>
                          </div>

                          {/* Status Checkboxes */}
                          <div className="border-t border-slate-50 pt-2 space-y-1.5">
                            <div className="flex justify-between items-center text-[10px] font-bold">
                              <span className="text-slate-550 flex items-center gap-1">
                                <span className="w-3.5 h-3.5 rounded bg-white border border-slate-100 p-0.5 flex items-center justify-center overflow-hidden shrink-0 select-none">
                                  <img src="https://http2.mlstatic.com/static/org-img/homesnw/mercado-libre.png" alt="ML" className="w-full h-full object-contain" />
                                </span>
                                Mercado Livre
                              </span>
                              {!selectedML ? (
                                <span className="text-slate-400 bg-slate-100/50 px-1.5 py-0.5 rounded border border-slate-150">
                                  Não integrado
                                </span>
                              ) : isPastProduct || publishingMLState === 'success' ? (
                                <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-150 flex items-center gap-0.5 select-none animate-in zoom-in-90">
                                  ✓ Publicado
                                </span>
                              ) : publishingMLState === 'publishing' ? (
                                <span className="text-indigo-600 animate-pulse flex items-center gap-1 select-none">
                                  <RefreshCw className="h-2.5 w-2.5 animate-spin" /> Enviando...
                                </span>
                              ) : (
                                <span className="text-slate-400 select-none">Aguardando...</span>
                              )}
                            </div>

                            <div className="flex justify-between items-center text-[10px] font-bold">
                              <span className="text-slate-550 flex items-center gap-1">
                                <span className="w-3.5 h-3.5 rounded bg-white border border-slate-100 p-0.5 flex items-center justify-center overflow-hidden shrink-0 select-none">
                                  <img src="https://deo.shopeemobile.com/shopee/shopee-pcmall-live-sg/assets/icon_favicon_1_96.1ce0e05fc18a86e5.png" alt="Shopee" className="w-full h-full object-contain" />
                                </span>
                                Shopee
                              </span>
                              {!selectedSHP ? (
                                <span className="text-slate-400 bg-slate-100/50 px-1.5 py-0.5 rounded border border-slate-150">
                                  Não integrado
                                </span>
                              ) : isPastProduct || publishingSHPState === 'success' ? (
                                <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-150 flex items-center gap-0.5 select-none animate-in zoom-in-90">
                                  ✓ Publicado
                                </span>
                              ) : publishingSHPState === 'publishing' ? (
                                <span className="text-indigo-600 animate-pulse flex items-center gap-1 select-none">
                                  <RefreshCw className="h-2.5 w-2.5 animate-spin" /> Enviando...
                                </span>
                              ) : (
                                <span className="text-slate-400 select-none">Aguardando...</span>
                              )}
                            </div>
                          </div>

                        </div>
                      </div>

                      {/* Right Chevron */}
                      {currentPublishingIndex !== null && viewingIndex < currentPublishingIndex && (
                        <button 
                          onClick={() => setViewingIndex(prev => prev + 1)}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-white hover:bg-slate-50 border border-slate-200 rounded-full p-2 text-slate-700 shadow-md active:scale-90 transition-all z-20 animate-in fade-in"
                        >
                          <ChevronRight className="h-4 w-4 stroke-[3px]" />
                        </button>
                      )}

                    </div>
                  </>
                );
              })()}

              {step3SubState === 'done' && (
                <div className="p-8 text-center flex flex-col items-center justify-center space-y-6">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-250 flex items-center justify-center shadow-sm text-emerald-600 animate-bounce duration-1000">
                    <Check className="h-8 w-8 stroke-[3px]" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-black text-slate-800 select-none">Publicação Concluída!</h3>
                    <p className="text-xs text-slate-655 font-medium leading-relaxed">
                      {selectedML && selectedSHP 
                        ? "20 produtos publicados na sua loja da Shopee e do Mercado Livre. Em até 12 horas os produtos vão ser aprovados pelos marketplaces e já publicados."
                        : selectedML 
                        ? "20 produtos publicados na sua loja do Mercado Livre. Em até 12 horas os produtos vão ser aprovados pelo marketplace e já publicados."
                        : "20 produtos publicados na sua loja da Shopee. Em até 12 horas os produtos vão ser aprovados pelo marketplace e já publicados."
                      }
                    </p>
                  </div>

                  <div className="pt-2 w-full flex flex-col gap-2.5">
                    <div className="flex justify-center gap-2 flex-wrap pb-2">
                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-150 font-bold text-[9.5px] select-none">
                        Margem: {marginPercent}%
                      </Badge>
                      {selectedML && (
                        <Badge className="bg-blue-50 text-blue-700 border border-blue-150 font-bold text-[9.5px] flex items-center gap-1 select-none">
                          <span className="w-3 h-3 rounded bg-white p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                            <img src="https://http2.mlstatic.com/static/org-img/homesnw/mercado-libre.png" alt="ML" className="w-full h-full object-contain" />
                          </span>
                          ML
                        </Badge>
                      )}
                      {selectedSHP && (
                        <Badge className="bg-orange-50 text-orange-700 border border-orange-150 font-bold text-[9.5px] flex items-center gap-1 select-none">
                          <span className="w-3 h-3 rounded bg-white p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                            <img src="https://deo.shopeemobile.com/shopee/shopee-pcmall-live-sg/assets/icon_favicon_1_96.1ce0e05fc18a86e5.png" alt="Shopee" className="w-full h-full object-contain" />
                          </span>
                          Shopee
                        </Badge>
                      )}
                    </div>

                    <Button
                      onClick={() => {
                        setShowModal(false);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 w-full rounded-xl shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                    >
                      Ver Catálogo Publicado <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </main>
    </div>
  );
}
