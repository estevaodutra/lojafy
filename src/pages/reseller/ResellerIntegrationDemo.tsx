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
  ArrowUpDown,
  Search
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
  // Integration Workflow States
  const [activeStep, setActiveStep] = useState<'idle' | 'ml_connecting' | 'margin_setup' | 'publishing' | 'done'>('idle');
  const [selectedMarketplace, setSelectedMarketplace] = useState<'mercadolivre' | 'shopee' | null>(null);
  
  // Connection states
  const [mlConnected, setMlConnected] = useState(false);
  const [shpConnected, setShpConnected] = useState(false);
  
  // Margin & publish simulation
  const [marginPercent, setMarginPercent] = useState<number>(30);
  const [publishProgress, setPublishProgress] = useState(0);
  const [currentPublishingProduct, setCurrentPublishingProduct] = useState('');
  
  // Catalog Search
  const [searchQuery, setSearchQuery] = useState('');

  // Fallback database of real reseller products
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

  // Handle Marketplace Account Linking
  const startConnectionFlow = (mp: 'mercadolivre' | 'shopee') => {
    setSelectedMarketplace(mp);
    setActiveStep('ml_connecting');
    
    toast.info(`Iniciando conexão com o ${mp === 'mercadolivre' ? 'Mercado Livre' : 'Shopee'}...`, {
      description: 'Estabelecendo protocolo OAuth2 seguro.',
      duration: 1500
    });

    // Simulate Auth Linkage Loader
    setTimeout(() => {
      setActiveStep('margin_setup');
      const mpName = mp === 'mercadolivre' ? 'Mercado Livre' : 'Shopee';
      toast.success(`Sua conta foi vinculada no ${mpName}!`, {
        description: 'Autenticação concluída e autorizada com sucesso.',
        duration: 3000
      });
    }, 1500);
  };

  // Submit Margin and Publish Top Products
  const handlePublishProducts = () => {
    if (!selectedMarketplace) return;
    setActiveStep('publishing');
    setPublishProgress(0);

    const mpName = selectedMarketplace === 'mercadolivre' ? 'Mercado Livre' : 'Shopee';
    toast.info(`Publicando catálogo no ${mpName}...`, {
      description: 'Preparando SKUs e precificação.',
      duration: 1000
    });

    // Simulate progressive uploading of top 20 products (mapping items dynamically)
    let currentProdIndex = 0;
    
    const interval = setInterval(() => {
      if (currentProdIndex < products.length) {
        const prod = products[currentProdIndex];
        setCurrentPublishingProduct(`Enviando: ${prod.name}...`);
        
        // Update product individual status
        setProducts(prev => prev.map((p, i) => {
          if (i === currentProdIndex) {
            return {
              ...p,
              status: selectedMarketplace === 'mercadolivre' 
                ? 'published_ml' 
                : 'published_shp'
            };
          }
          return p;
        }));

        currentProdIndex++;
        setPublishProgress(Math.round((currentProdIndex / products.length) * 100));
      } else {
        clearInterval(interval);
        
        // Finish Flow
        setTimeout(() => {
          setActiveStep('done');
          if (selectedMarketplace === 'mercadolivre') {
            setMlConnected(true);
          } else {
            setShpConnected(true);
          }
          
          toast.success(`Catálogo publicado com sucesso!`, {
            description: `Os top ${products.length} produtos já estão ativos no seu ${mpName}.`,
            duration: 4000
          });
        }, 800);
      }
    }, 450); // Speed of simulation
  };

  // Reset Integration Step (for demonstration replay)
  const resetFlow = () => {
    setActiveStep('idle');
    setSelectedMarketplace(null);
    setPublishProgress(0);
    setCurrentPublishingProduct('');
    setProducts(prev => prev.map(p => ({ ...p, status: 'ready' })));
  };

  // Format currency
  const fmtBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Dynamic price calculator based on margin and marketplace fee
  // Price = Cost * (1 + margin) / (1 - fee)
  const calculateSuggestedPrice = (cost: number) => {
    const fee = 0.14; // Default standard marketplace fee
    const margin = marginPercent / 100;
    const finalPrice = (cost * (1 + margin)) / (1 - fee);
    return Math.round(finalPrice * 100) / 100;
  };

  // Filter products by search query
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                Conecte suas contas de marketplaces, defina sua margem e publique os produtos em lote.
              </p>
            </div>
          </div>
          
          {(mlConnected || shpConnected || activeStep !== 'idle') && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={resetFlow} 
              className="text-xs border-slate-200 hover:bg-slate-50 active:scale-95 transition-all text-slate-600 font-bold"
            >
              Resetar Simulação
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-8 space-y-8">
        
        {/* INTERACTION WIZARD CONTAINER */}
        <section className="bg-white border border-slate-100 shadow-md rounded-2xl p-6 md:p-8 space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Sparkles className="w-40 h-40 text-purple-600" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Link2 className="h-5 w-5 text-indigo-500" />
              1. Configurar Integração em Lote
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Siga os passos abaixo para autorizar a publicação automática do catálogo de revenda.
            </p>
          </div>

          {/* STEP 1: ACCOUNT LINKING STATUS BUTTONS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Mercado Livre Card */}
            <Card className={`border rounded-2xl hover:shadow-md transition-all duration-300 ${
              mlConnected 
                ? "border-blue-200 bg-blue-50/10" 
                : selectedMarketplace === 'mercadolivre' && activeStep !== 'done'
                ? "border-indigo-400 shadow-sm"
                : "border-slate-100 bg-white"
            }`}>
              <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-center sm:text-left flex-col sm:flex-row">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-2xl shadow-sm shrink-0">
                    🔵
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-800">Conectar Mercado Livre</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {mlConnected ? "Conta ativa e autorizada." : "Não integrado."}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 w-full sm:w-auto">
                  {mlConnected ? (
                    <Badge className="w-full sm:w-auto bg-green-50 text-green-700 border border-green-200 hover:bg-green-50 font-bold px-3 py-1 text-xs justify-center flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5" /> Conectado
                    </Badge>
                  ) : (
                    <Button
                      onClick={() => startConnectionFlow('mercadolivre')}
                      disabled={activeStep !== 'idle'}
                      className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow active:scale-95 transition-all"
                    >
                      Vincular Conta
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Shopee Card */}
            <Card className={`border rounded-2xl hover:shadow-md transition-all duration-300 ${
              shpConnected 
                ? "border-orange-200 bg-orange-50/10" 
                : selectedMarketplace === 'shopee' && activeStep !== 'done'
                ? "border-indigo-400 shadow-sm"
                : "border-slate-100 bg-white"
            }`}>
              <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-center sm:text-left flex-col sm:flex-row">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-2xl shadow-sm shrink-0">
                    🟠
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-800">Conectar Shopee</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {shpConnected ? "Conta ativa e autorizada." : "Não integrado."}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 w-full sm:w-auto">
                  {shpConnected ? (
                    <Badge className="w-full sm:w-auto bg-green-50 text-green-700 border border-green-200 hover:bg-green-50 font-bold px-3 py-1 text-xs justify-center flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5" /> Conectado
                    </Badge>
                  ) : (
                    <Button
                      onClick={() => startConnectionFlow('shopee')}
                      disabled={activeStep !== 'idle'}
                      className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow active:scale-95 transition-all"
                    >
                      Vincular Conta
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SIMULATION SCREEN OVERLAYS */}
          
          {/* Connecting Loader Overlay */}
          {activeStep === 'ml_connecting' && (
            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in duration-300">
              <RefreshCw className="h-10 w-10 text-purple-600 animate-spin" />
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-slate-800">Autenticando Conexão Segura...</h4>
                <p className="text-xs text-slate-500 font-medium">Buscando token OAuth2 e verificando credenciais da API.</p>
              </div>
            </div>
          )}

          {/* STEP 2: MARGIN CONFIGURATION SCREEN */}
          {activeStep === 'margin_setup' && selectedMarketplace && (
            <div className="bg-gradient-to-r from-indigo-50/50 via-slate-50 to-purple-50/30 border border-indigo-100 rounded-2xl p-6 animate-in slide-in-from-top-4 duration-300 space-y-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-xl">
                  <Settings className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-slate-800">Informe a margem de lucro desejada</h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Sua margem de lucro será aplicada sobre o preço de custo padrão de todos os produtos do catálogo. 
                    Calculamos automaticamente o preço de venda sugerido para garantir a lucratividade líquida pretendida.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-end gap-4 max-w-lg">
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
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 px-5 rounded-xl shadow-sm flex items-center gap-1.5 w-full sm:w-auto"
                >
                  Definir Margem e Publicar <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: PUBLISHING LOADER PROGRESS */}
          {activeStep === 'publishing' && selectedMarketplace && (
            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-6 animate-in fade-in duration-300 space-y-4">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="h-4 w-4 text-purple-600 animate-spin" />
                  Os top 20 produtos estão subindo para sua loja. Aguarde...
                </span>
                <span className="font-extrabold text-slate-900">{publishProgress}%</span>
              </div>

              {/* Progress Bar Container */}
              <div className="w-full h-3.5 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                  style={{ width: `${publishProgress}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-500 font-bold">
                <span className="font-mono text-purple-600 animate-pulse">{currentPublishingProduct}</span>
                <span>{publishProgress === 100 ? "Concluído!" : "Publicando no canal..."}</span>
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS FINISH CONGRATS VIEW */}
          {activeStep === 'done' && selectedMarketplace && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 animate-in zoom-in-95 duration-300 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl mt-0.5">
                  <Check className="h-5 w-5" />
                </div>
                <div className="space-y-1 flex-1">
                  <h4 className="font-bold text-sm text-emerald-950">Sucesso na Integração!</h4>
                  <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                    Sua conta está integrada e os top 20 produtos do catálogo foram publicados com a margem configurada de <strong>{marginPercent}%</strong>. 
                    Eles estão ativos no canal e prontos para vendas!
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Badge className="bg-white text-emerald-700 border border-emerald-200 font-bold text-[10.5px]">
                  20 Anúncios Publicados
                </Badge>
                <Badge className="bg-white text-emerald-700 border border-emerald-200 font-bold text-[10.5px]">
                  Margem: {marginPercent}%
                </Badge>
              </div>
            </div>
          )}
        </section>

        {/* SALE CATALOG TABLE SECTION */}
        <section className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-50 bg-slate-50/20 px-6 py-5">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Database className="h-4 w-4 text-indigo-500" />
                2. Visualização do Catálogo de Produtos
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Lista de produtos integrados para revenda. A precificação sugerida é recalculada dinamicamente conforme sua margem.
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
                  <TableHead className="text-xs font-bold text-indigo-600 h-10 px-4 text-right bg-indigo-50/20">Preço Venda Sugerido</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 h-10 px-4 text-center">Estoque</TableHead>
                  <TableHead className="text-xs font-bold text-slate-500 h-10 px-6 text-center">Status Anúncio</TableHead>
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
                    // Check active publishing state
                    const isPublished = p.status !== 'ready';
                    let statusColor = "bg-slate-50 text-slate-500 border-slate-200";
                    let statusLabel = "Pronto para publicar";

                    if (isPublished) {
                      const mpLabel = selectedMarketplace === 'mercadolivre' ? 'Mercado Livre' : 'Shopee';
                      statusColor = "bg-emerald-50 text-emerald-700 border-emerald-200/50 font-bold";
                      statusLabel = `Ativo no ${mpLabel}`;
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
                            {isPublished && <Check className="h-3 w-3 inline mr-1 text-emerald-600" />}
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

      </main>
    </div>
  );
}
