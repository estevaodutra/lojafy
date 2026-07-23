import React, { useState, useEffect, useMemo } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  HelpCircle, 
  RefreshCw, 
  Filter, 
  X, 
  Award, 
  Box, 
  ShoppingCart, 
  User, 
  Info, 
  Calendar, 
  Globe, 
  ArrowUpDown,
  Search,
  SlidersHorizontal
} from "lucide-react";
import { toast } from "sonner";
import logoIntegration from "../../assets/logo-painel-de-integracao.png";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  CartesianGrid 
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";

import { 
  getAggregatedData, 
  PeriodType, 
  FilterOptions, 
  SellerData, 
  mockSellers, 
  mockProducts 
} from "@/data/sellerPerformanceData";

export default function PerformanceDashboardDemo() {
  // Page states
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("22/07/2026 às 21h35");
  const [activeChartMetric, setActiveChartMetric] = useState<"faturamento" | "lucroLiquido" | "pedidos" | "unidades">("faturamento");
  const [activeProductTab, setActiveProductTab] = useState<"qtd" | "faturamento" | "lucro" | "crescimento">("qtd");
  const [selectedSeller, setSelectedSeller] = useState<SellerData | null>(null);
  const [sellerDrawerOpen, setSellerDrawerOpen] = useState(false);
  
  // Real-time notification pop-up state
  const [activeNotification, setActiveNotification] = useState<{
    seller: string;
    product: string;
    price: number;
    marketplace: string;
    profit: number;
  } | null>(null);

  // Search inputs
  const [sellerSearch, setSellerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");

  // Filters State
  const [filters, setFilters] = useState<FilterOptions>({
    period: "30_dias",
    marketplace: "all",
    seller: "all",
    product: "all",
    orderStatus: "all",
    storeAccount: "all"
  });

  // Sort State for Seller Table
  const [sellerSortField, setSellerSortField] = useState<"faturamento" | "lucro" | "pedidos" | "crescimento">("faturamento");
  const [sellerSortOrder, setSellerSortOrder] = useState<"desc" | "desc">("desc");

  // Fetch aggregated data based on filters
  const data = useMemo(() => {
    return getAggregatedData(filters);
  }, [filters]);

  // Simulated Refresh Handler
  const handleRefresh = () => {
    setLoading(true);
    toast.info("Sincronizando dados dos marketplaces...", {
      description: "Buscando atualizações na Shopee, Mercado Livre e Amazon.",
      duration: 1500
    });

    setTimeout(() => {
      setLoading(false);
      const now = new Date();
      const formatTime = (val: number) => val.toString().padStart(2, '0');
      const timeStr = `${formatTime(now.getHours())}h${formatTime(now.getMinutes())}`;
      const dateStr = `${formatTime(now.getDate())}/${formatTime(now.getMonth() + 1)}/${now.getFullYear()}`;
      setLastUpdated(`${dateStr} às ${timeStr}`);
      toast.success("Dados sincronizados com sucesso!", {
        description: "Os indicadores do painel consolidado foram atualizados.",
        duration: 2000
      });
    }, 1200);
  };

  // Real-time sales simulation loop for floating popup notifications
  useEffect(() => {
    const randomSalesList = [
      { seller: "Jéssica Santos", product: "Escova Secadora 5 em 1 Ceramic Pro", price: 149.90, marketplace: "Mercado Livre", profit: 44.20 },
      { seller: "João Silva", product: "Smartwatch Sport Pro GPS AMOLED", price: 353.98, marketplace: "Shopee", profit: 91.10 },
      { seller: "Lucas Oliveira", product: "Fone Bluetooth Active Noise ANC-90", price: 252.87, marketplace: "Amazon", profit: 60.50 },
      { seller: "Beatriz Souza", product: "Mini Projetor Portátil HD", price: 456.48, marketplace: "Mercado Livre", profit: 51.12 },
      { seller: "Amanda Lima", product: "Teclado Mecânico Compact RGB", price: 224.76, marketplace: "Loja Própria", profit: 69.65 },
      { seller: "Thiago Costa", product: "Carregador Portátil 20k mAh", price: 107.48, marketplace: "Shopee", profit: 26.87 },
      { seller: "Rodrigo Santos", product: "Smartwatch Sport Pro GPS", price: 353.98, marketplace: "Amazon", profit: 91.10 },
      { seller: "Camila Alves", product: "Ring Light 12 polegadas", price: 100.00, marketplace: "Shopee", profit: 24.00 },
      { seller: "Patrícia Gomes", product: "Teclado Mecânico RGB", price: 220.90, marketplace: "Loja Própria", profit: 68.48 },
      { seller: "Mariana Costa", product: "Fone Bluetooth ANC-90", price: 252.87, marketplace: "Amazon", profit: 60.50 },
      { seller: "Bruno Ferreira", product: "Escova Secadora 5 em 1", price: 149.90, marketplace: "Mercado Livre", profit: 41.20 },
      { seller: "Fernando Lima", product: "Carregador Portátil 20k", price: 107.48, marketplace: "Shopee", profit: 26.87 },
      { seller: "Gabriel Ribeiro", product: "Mini Projetor Portátil HD", price: 456.48, marketplace: "Mercado Livre", profit: 51.12 },
      { seller: "Aline Teixeira", product: "Ring Light 12 polegadas", price: 100.00, marketplace: "Shopee", profit: 24.00 },
      { seller: "Eduardo Carvalho", product: "Escova Secadora 5 em 1", price: 149.90, marketplace: "Mercado Livre", profit: 41.20 },
      { seller: "Letícia Vieira", product: "Teclado Mecânico Compact", price: 224.76, marketplace: "Loja Própria", profit: 69.65 },
      { seller: "Ricardo Souza", product: "Fone Bluetooth Noise Cancelling", price: 252.87, marketplace: "Amazon", profit: 60.50 },
      { seller: "Juliana Martins", product: "Carregador Portátil Power Bank", price: 107.48, marketplace: "Shopee", profit: 26.87 },
      { seller: "Gustavo Pires", product: "Mini Projetor Portátil HD", price: 456.48, marketplace: "Mercado Livre", profit: 51.12 },
      { seller: "Vanessa Dias", product: "Teclado Mecânico Compact RGB", price: 224.76, marketplace: "Loja Própria", profit: 69.65 }
    ];

    const triggerNotification = () => {
      const randomItem = randomSalesList[Math.floor(Math.random() * randomSalesList.length)];
      setActiveNotification(randomItem);
      
      const dismissTimeout = setTimeout(() => {
        setActiveNotification(null);
      }, 4500);

      return dismissTimeout;
    };

    // Trigger initial simulation after 6 seconds
    const initialTimeout = setTimeout(() => {
      triggerNotification();
    }, 6000);

    // Set interval to trigger notification every 14 seconds
    const interval = setInterval(() => {
      triggerNotification();
    }, 14000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  // Change specific filter
  const updateFilter = (key: keyof FilterOptions, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      period: "30_dias",
      marketplace: "all",
      seller: "all",
      product: "all",
      orderStatus: "all",
      storeAccount: "all"
    });
    setSellerSearch("");
    setProductSearch("");
    toast.success("Filtros redefinidos para os padrões.");
  };

  // Check if any filter is active
  const hasActiveFilters = useMemo(() => {
    return filters.marketplace !== "all" || 
           filters.seller !== "all" || 
           filters.product !== "all" || 
           filters.orderStatus !== "all" || 
           filters.storeAccount !== "all" ||
           sellerSearch !== "" ||
           productSearch !== "";
  }, [filters, sellerSearch, productSearch]);

  // Sort and Filter Sellers
  const processedSellers = useMemo(() => {
    let result = [...data.sellers];
    
    // Apply search filter if present
    if (sellerSearch) {
      result = result.filter(s => s.name.toLowerCase().includes(sellerSearch.toLowerCase()));
    }

    // Apply sorting
    result.sort((a, b) => {
      let valA = 0;
      let valB = 0;
      
      switch (sellerSortField) {
        case "faturamento":
          valA = a.faturamentoBruto;
          valB = b.faturamentoBruto;
          break;
        case "lucro":
          valA = a.lucroLiquidoVendedores;
          valB = b.lucroLiquidoVendedores;
          break;
        case "pedidos":
          valA = a.pedidos;
          valB = b.pedidos;
          break;
        case "crescimento":
          valA = a.crescimento;
          valB = b.crescimento;
          break;
      }

      return sellerSortOrder === "desc" ? valB - valA : valA - valB;
    });

    return result;
  }, [data.sellers, sellerSortField, sellerSortOrder, sellerSearch]);

  // Sort and Filter Products
  const processedProducts = useMemo(() => {
    let result = [...data.products];

    // Apply search filter
    if (productSearch) {
      result = result.filter(p => 
        p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
        p.sku.toLowerCase().includes(productSearch.toLowerCase())
      );
    }

    // Apply Tab Sorting
    switch (activeProductTab) {
      case "qtd":
        result.sort((a, b) => b.unidadesVendidas - a.unidadesVendidas);
        break;
      case "faturamento":
        result.sort((a, b) => b.faturamentoBruto - a.faturamentoBruto);
        break;
      case "lucro":
        result.sort((a, b) => b.lucroLiquidoGerado - a.lucroLiquidoGerado);
        break;
      case "crescimento":
        result.sort((a, b) => b.crescimento - a.crescimento);
        break;
    }

    return result;
  }, [data.products, activeProductTab, productSearch]);

  // Click row to view seller details drawer
  const handleSellerClick = (seller: SellerData) => {
    setSelectedSeller(seller);
    setSellerDrawerOpen(true);
  };

  // Format currency helpers
  const fmtBRL = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  const getKpiIcon = (title: string) => {
    switch (title) {
      case "Faturamento":
      case "Faturamento Bruto":
        return <TrendingUp className="h-5 w-5 text-indigo-500" />;
      case "Lucro Líquido":
      case "Lucro Líquido dos Vendedores":
        return <Award className="h-5 w-5 text-emerald-500" />;
      case "Pedidos para Processar":
        return <ShoppingCart className="h-5 w-5 text-amber-500" />;
      case "Pedidos Enviados":
        return <Box className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5 text-slate-500" />;
    }
  };

  const profitFormulaStr = "Lucro líquido do vendedor = faturamento bruto recebido − custo dos produtos vendidos − tarifas do marketplace − comissões da plataforma − fretes pagos pelo vendedor − impostos − reembolsos por devolução − outros custos operacionais do vendedor.";

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-16 font-sans">
      {/* 1. TOP HEADER SECTION */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm px-6 py-5">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <img 
              src={logoIntegration} 
              alt="Lojafy Integra" 
              className="h-[75px] w-auto object-contain select-none"
            />
            
            <div className="h-8 w-[1px] bg-slate-200 hidden sm:block mx-2"></div>
            
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-800 tracking-tight">Marketplaces sem estoque automático</h1>
                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-100/50 text-[11px] font-bold py-0.5 px-2.5 rounded-full flex items-center gap-1 shadow-sm select-none">
                  📦 Estoque Integrado
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Visão consolidada dos resultados gerados pelos vendedores da plataforma nos marketplaces.
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap sm:flex-nowrap gap-3 self-end md:self-auto">
            <div className="text-right text-xs font-semibold text-slate-400">
              Última sincronização: <span className="text-slate-600 font-bold">{lastUpdated}</span>
            </div>
            <Button 
              onClick={handleRefresh} 
              disabled={loading}
              variant="outline" 
              size="sm" 
              className="bg-white border-slate-200 hover:bg-slate-50 active:scale-95 transition-all text-slate-700 font-semibold"
            >
              <RefreshCw className={`mr-2 h-3.5 w-3.5 text-slate-500 ${loading ? "animate-spin text-purple-600" : ""}`} />
              Sincronizar
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 mt-8 space-y-8">
        
        {/* 3. FILTERS BAR */}
        <section className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4 px-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500">
                <Filter className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Filtros Operacionais</h3>
              {hasActiveFilters && (
                <Badge variant="secondary" className="bg-purple-50 text-purple-600 font-bold border border-purple-100 text-[10px] ml-2">
                  Filtros Ativos
                </Badge>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400 mr-2 uppercase tracking-wider">Período:</span>
              {[
                { key: "hoje", label: "Hoje" },
                { key: "7_dias", label: "7 Dias" },
                { key: "10_dias", label: "10 Dias" },
                { key: "15_dias", label: "15 Dias" },
                { key: "30_dias", label: "30 Dias" }
              ].map((p) => (
                <button
                  key={p.key}
                  onClick={() => updateFilter("period", p.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filters.period === p.key 
                      ? "bg-slate-900 text-white shadow-sm shadow-slate-950/20" 
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-50 text-slate-400 hover:bg-slate-100 cursor-not-allowed border border-dashed border-slate-200">
                      Personalizado
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-900 text-white border-none p-2 text-xs">
                    Período personalizado indisponível nesta visão de performance.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <div className="hidden grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Marketplace Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Marketplace</label>
              <Select value={filters.marketplace} onValueChange={(val) => updateFilter("marketplace", val)}>
                <SelectTrigger className="w-full bg-slate-50 border-slate-200 text-xs font-semibold rounded-xl focus:ring-purple-500">
                  <SelectValue placeholder="Selecionar canal" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-100 text-xs font-medium">
                  <SelectItem value="all">Todos os canais</SelectItem>
                  <SelectItem value="mercadolivre">Mercado Livre</SelectItem>
                  <SelectItem value="shopee">Shopee</SelectItem>
                  <SelectItem value="amazon">Amazon</SelectItem>
                  <SelectItem value="lojapropria">Loja Própria</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Seller Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vendedor</label>
              <Select value={filters.seller} onValueChange={(val) => updateFilter("seller", val)}>
                <SelectTrigger className="w-full bg-slate-50 border-slate-200 text-xs font-semibold rounded-xl focus:ring-purple-500">
                  <SelectValue placeholder="Selecionar vendedor" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-100 text-xs font-medium">
                  <SelectItem value="all">Todos os vendedores ({mockSellers.length})</SelectItem>
                  {mockSellers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Product Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Produto</label>
              <Select value={filters.product} onValueChange={(val) => updateFilter("product", val)}>
                <SelectTrigger className="w-full bg-slate-50 border-slate-200 text-xs font-semibold rounded-xl focus:ring-purple-500">
                  <SelectValue placeholder="Selecionar produto" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-100 text-xs font-medium">
                  <SelectItem value="all">Todos os produtos ({mockProducts.length})</SelectItem>
                  {mockProducts.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.sku} - {p.name.substring(0, 20)}...</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Order Status Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status do Pedido</label>
              <Select value={filters.orderStatus} onValueChange={(val) => updateFilter("orderStatus", val)}>
                <SelectTrigger className="w-full bg-slate-50 border-slate-200 text-xs font-semibold rounded-xl focus:ring-purple-500">
                  <SelectValue placeholder="Filtrar status" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-100 text-xs font-medium">
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="approved">Aprovado / Pago</SelectItem>
                  <SelectItem value="shipped">Despachado / Enviado</SelectItem>
                  <SelectItem value="delivered">Entregue</SelectItem>
                  <SelectItem value="canceled">Cancelado / Devolvido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Connected Account Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Conta Conectada</label>
              <Select value={filters.storeAccount} onValueChange={(val) => updateFilter("storeAccount", val)}>
                <SelectTrigger className="w-full bg-slate-50 border-slate-200 text-xs font-semibold rounded-xl focus:ring-purple-500">
                  <SelectValue placeholder="Filtrar conta" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-100 text-xs font-medium">
                  <SelectItem value="all">Todas as contas integradas</SelectItem>
                  <SelectItem value="acc_1">Conta Principal (ML-PRO)</SelectItem>
                  <SelectItem value="acc_2">Conta Secundária (SHP-STORE)</SelectItem>
                  <SelectItem value="acc_3">Amazon Direct BR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filter Badges & Clear button */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 mt-4 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Filtros ativos:</span>
                {filters.marketplace !== "all" && (
                  <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[10px] font-semibold py-1 rounded-lg">
                    Canal: {filters.marketplace === "mercadolivre" ? "Mercado Livre" : filters.marketplace.toUpperCase()}
                    <button className="ml-1.5 hover:text-red-500" onClick={() => updateFilter("marketplace", "all")}><X className="h-3 w-3 inline" /></button>
                  </Badge>
                )}
                {filters.seller !== "all" && (
                  <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[10px] font-semibold py-1 rounded-lg">
                    Vendedor: {mockSellers.find(s => s.id === filters.seller)?.name}
                    <button className="ml-1.5 hover:text-red-500" onClick={() => updateFilter("seller", "all")}><X className="h-3 w-3 inline" /></button>
                  </Badge>
                )}
                {filters.product !== "all" && (
                  <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[10px] font-semibold py-1 rounded-lg">
                    Produto: {mockProducts.find(p => p.id === filters.product)?.sku}
                    <button className="ml-1.5 hover:text-red-500" onClick={() => updateFilter("product", "all")}><X className="h-3 w-3 inline" /></button>
                  </Badge>
                )}
                {filters.orderStatus !== "all" && (
                  <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[10px] font-semibold py-1 rounded-lg">
                    Status: {filters.orderStatus}
                    <button className="ml-1.5 hover:text-red-500" onClick={() => updateFilter("orderStatus", "all")}><X className="h-3 w-3 inline" /></button>
                  </Badge>
                )}
                {filters.storeAccount !== "all" && (
                  <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[10px] font-semibold py-1 rounded-lg">
                    Conta: {filters.storeAccount}
                    <button className="ml-1.5 hover:text-red-500" onClick={() => updateFilter("storeAccount", "all")}><X className="h-3 w-3 inline" /></button>
                  </Badge>
                )}
                {sellerSearch && (
                  <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[10px] font-semibold py-1 rounded-lg">
                    Busca Vendedor: "{sellerSearch}"
                    <button className="ml-1.5 hover:text-red-500" onClick={() => setSellerSearch("")}><X className="h-3 w-3 inline" /></button>
                  </Badge>
                )}
                {productSearch && (
                  <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[10px] font-semibold py-1 rounded-lg">
                    Busca Produto: "{productSearch}"
                    <button className="ml-1.5 hover:text-red-500" onClick={() => setProductSearch("")}><X className="h-3 w-3 inline" /></button>
                  </Badge>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilters} 
                className="text-red-500 hover:text-red-600 hover:bg-red-50 font-bold text-xs h-7 px-2.5 rounded-lg"
              >
                Limpar Filtros
              </Button>
            </div>
          )}
        </section>

        {/* 4. KPI CARDS LINE */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {data.kpis.map((kpi, idx) => {
            const isProfit = kpi.title === "Lucro Líquido";
            
            if (loading) {
              return (
                <Card key={idx} className="border border-slate-100 shadow-sm bg-white rounded-2xl">
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-28 bg-slate-100" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-36 bg-slate-100 mb-2" />
                    <Skeleton className="h-3.5 w-24 bg-slate-100" />
                  </CardContent>
                </Card>
              );
            }

            return (
              <Card 
                key={idx} 
                className={`relative border shadow-sm rounded-2xl hover:shadow-md hover:border-slate-200 transition-all duration-300 bg-white ${
                  isProfit 
                    ? "border-emerald-200 ring-2 ring-emerald-500/5 bg-gradient-to-br from-white to-emerald-50/20" 
                    : "border-slate-100"
                }`}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <span className={`text-[12px] font-bold tracking-wide uppercase ${isProfit ? "text-emerald-700" : "text-slate-400"}`}>
                    {kpi.title}
                  </span>
                  <div className={`p-2 rounded-xl ${isProfit ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-50 text-slate-500"}`}>
                    {getKpiIcon(kpi.title)}
                  </div>
                </CardHeader>
                <CardContent className="pt-1">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-black tracking-tight ${isProfit ? "text-emerald-800" : "text-slate-800"}`}>
                      {kpi.value}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2">
                    {kpi.changePercent !== 0 && (
                      <span className={`flex items-center text-[11px] font-extrabold px-1.5 py-0.5 rounded-md ${
                        kpi.isPositive 
                          ? "bg-green-50 text-green-700" 
                          : "bg-red-50 text-red-600"
                      }`}>
                        {kpi.isPositive ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                        {Math.abs(kpi.changePercent)}%
                      </span>
                    )}
                    <span className="text-[11px] font-semibold text-slate-400">
                      {kpi.microtext}
                    </span>
                  </div>

                  {kpi.tooltip && (
                    <div className="absolute top-4 right-4 z-10">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="text-slate-300 hover:text-slate-500 p-0.5 transition-colors">
                              <HelpCircle className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-slate-900 text-white border-none p-3 max-w-[280px] rounded-xl shadow-lg leading-relaxed text-xs">
                            <p className="font-bold text-slate-200 mb-1">{kpi.title}</p>
                            <p className="text-[11px] text-slate-300">{kpi.tooltip}</p>
                            {isProfit && (
                              <p className="text-[10px] text-emerald-400 border-t border-slate-700 pt-1.5 mt-1.5 font-mono italic">
                                * {profitFormulaStr}
                              </p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </section>

        {/* 5. EVOLUTION CHART & MARKETPLACES OVERVIEW */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart Card (66%) */}
          <Card className="lg:col-span-2 border border-slate-100 shadow-sm bg-white rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-50 bg-slate-50/20 px-6 py-4">
              <div>
                <CardTitle className="text-base font-bold text-slate-800">Evolução de Performance Operacional</CardTitle>
                <CardDescription className="text-xs text-slate-500 font-medium">
                  Acompanhamento temporal dos resultados gerados pelos vendedores {data.labelPeriod}
                </CardDescription>
              </div>

              {/* Chart Metric Selector */}
              <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {[
                  { key: "faturamento", label: "Faturamento" },
                  { key: "lucroLiquido", label: "Lucro Líquido" },
                  { key: "pedidos", label: "Pedidos" },
                  { key: "unidades", label: "Unidades" }
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setActiveChartMetric(item.key as any)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      activeChartMetric === item.key 
                        ? "bg-white text-slate-800 shadow-sm" 
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {loading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <Skeleton className="h-[280px] w-full bg-slate-100 rounded-xl" />
                </div>
              ) : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={data.chartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={activeChartMetric === "lucroLiquido" ? "#10B981" : "#6366F1"} stopOpacity={0.15}/>
                          <stop offset="95%" stopColor={activeChartMetric === "lucroLiquido" ? "#10B981" : "#6366F1"} stopOpacity={0.01}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis 
                        dataKey="date" 
                        tickLine={false} 
                        axisLine={false}
                        tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 'bold' }} 
                      />
                      <YAxis 
                        tickLine={false} 
                        axisLine={false}
                        tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 'bold' }} 
                        tickFormatter={(v) => activeChartMetric === "faturamento" || activeChartMetric === "lucroLiquido" ? `R$ ${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}` : v}
                      />
                      <RechartsTooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const point = payload[0].payload;
                            return (
                              <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-4 shadow-xl text-xs max-w-[240px] space-y-2">
                                <p className="font-bold text-slate-400 border-b border-slate-800 pb-1.5 mb-1.5">{label}</p>
                                <div className="space-y-1">
                                  <p className="flex justify-between gap-4 font-semibold text-slate-300">
                                    Faturamento: <span className="font-black text-white">{fmtBRL(point.faturamento)}</span>
                                  </p>
                                  <p className="flex justify-between gap-4 font-semibold text-emerald-400">
                                    Lucro Vendedor: <span className="font-black">{fmtBRL(point.lucroLiquido)}</span>
                                  </p>
                                  <p className="flex justify-between gap-4 font-medium text-slate-400">
                                    Pedidos: <span className="font-bold text-white">{point.pedidos} un</span>
                                  </p>
                                  <p className="flex justify-between gap-4 font-medium text-slate-400">
                                    Qtd Itens: <span className="font-bold text-white">{point.unidades} un</span>
                                  </p>
                                </div>
                                <div className="border-t border-slate-800 pt-1.5 mt-1.5 text-[9px] text-slate-500 italic leading-relaxed">
                                  * Lucro deduz custos operacionais estimados do vendedor.
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey={activeChartMetric} 
                        stroke={activeChartMetric === "lucroLiquido" ? "#10B981" : "#6366F1"} 
                        strokeWidth={3} 
                        fillOpacity={1} 
                        fill="url(#colorMetric)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Marketplaces Share (33%) */}
          <Card className="border border-slate-100 shadow-sm bg-white rounded-2xl flex flex-col justify-between">
            <CardHeader className="border-b border-slate-50 bg-slate-50/20 px-6 py-4">
              <CardTitle className="text-base font-bold text-slate-800">Participação por Canal</CardTitle>
              <CardDescription className="text-xs text-slate-500 font-medium">
                Volume de faturamento bruto consolidado gerado nos marketplaces
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 flex-1 flex flex-col justify-center space-y-6">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(idx => (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between"><Skeleton className="h-4 w-20 bg-slate-100" /><Skeleton className="h-4 w-12 bg-slate-100" /></div>
                      <Skeleton className="h-3 w-full bg-slate-100 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-5">
                  {data.marketplaces.map((mp) => {
                    let barColor = "bg-indigo-600";
                    if (mp.name === "Mercado Livre") {
                      barColor = "bg-blue-500";
                    } else if (mp.name === "Shopee") {
                      barColor = "bg-orange-500";
                    } else if (mp.name === "Amazon") {
                      barColor = "bg-yellow-600";
                    } else if (mp.name === "Loja Própria") {
                      barColor = "bg-emerald-600";
                    }

                    return (
                      <div key={mp.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                          <span className="flex items-center gap-1.5">
                            <span className={`w-2.5 h-2.5 rounded-full ${barColor}`} />
                            {mp.name}
                          </span>
                          <span className="font-extrabold text-slate-900">{mp.share}%</span>
                        </div>
                        
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
                            style={{ width: `${mp.share}%` }}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                          <span>{fmtBRL(mp.faturamentoBruto)}</span>
                          <span>{mp.pedidos} pedidos</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* 6. MARKETPLACES TABLE & SELLERS RANKING */}
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          {/* Marketplace Detailed Table */}
          <Card className="border border-slate-100 shadow-sm bg-white rounded-2xl overflow-hidden flex flex-col">
            <CardHeader className="border-b border-slate-50 bg-slate-50/20 px-6 py-4">
              <CardTitle className="text-base font-bold text-slate-800">Desempenho por Marketplace</CardTitle>
              <CardDescription className="text-xs text-slate-500 font-medium">
                Métricas detalhadas de vendas dos parceiros em cada canal integrado
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-x-auto">
              {loading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3, 4].map(idx => <Skeleton key={idx} className="h-8 w-full bg-slate-100" />)}
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-b border-slate-100 hover:bg-transparent">
                      <TableHead className="text-xs font-bold text-slate-500 h-10 px-4">Canal</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 h-10 px-4 text-right">Faturamento</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 h-10 px-4 text-right">Lucro Vendedores</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 h-10 px-4 text-center">Pedidos</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 h-10 px-4 text-center">Canc.</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 h-10 px-4 text-right">Crescimento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.marketplaces.map((mp) => (
                      <TableRow key={mp.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <TableCell className="font-bold text-xs text-slate-800 py-3 px-4 flex items-center gap-1.5">
                          {mp.name === "Mercado Livre" && <span className="text-blue-500">🔵</span>}
                          {mp.name === "Shopee" && <span className="text-orange-500">🟠</span>}
                          {mp.name === "Amazon" && <span className="text-yellow-600">🟡</span>}
                          {mp.name === "Loja Própria" && <span className="text-emerald-500">🟢</span>}
                          {mp.name}
                        </TableCell>
                        <TableCell className="font-bold text-xs text-slate-900 text-right py-3 px-4">{fmtBRL(mp.faturamentoBruto)}</TableCell>
                        <TableCell className="font-bold text-xs text-emerald-700 text-right py-3 px-4">{fmtBRL(mp.lucroLiquidoVendedores)}</TableCell>
                        <TableCell className="font-semibold text-xs text-slate-600 text-center py-3 px-4">{mp.pedidos}</TableCell>
                        <TableCell className="font-semibold text-xs text-slate-500 text-center py-3 px-4">{mp.taxaCancelamento.toFixed(2)}%</TableCell>
                        <TableCell className={`font-extrabold text-xs text-right py-3 px-4 ${mp.crescimento > 0 ? "text-green-600" : "text-red-500"}`}>
                          {mp.crescimento > 0 ? "+" : ""}{mp.crescimento}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Ranking of Top Products */}
          <Card className="border border-slate-100 shadow-sm bg-white rounded-2xl overflow-hidden flex flex-col">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-50 bg-slate-50/20 px-6 py-4">
              <div>
                <CardTitle className="text-base font-bold text-slate-800">Produtos Mais Vendidos da Semana</CardTitle>
                <CardDescription className="text-xs text-slate-500 font-medium">
                  Listagem dos produtos campeões em volume de saída e lucratividade
                </CardDescription>
              </div>
              
              <div className="relative w-full sm:w-48">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input 
                  placeholder="Buscar produto..." 
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-slate-50 border-slate-200 focus:bg-white rounded-lg focus-visible:ring-purple-500"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto max-h-[350px]">
              {loading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3, 4].map(idx => <Skeleton key={idx} className="h-8 w-full bg-slate-100" />)}
                </div>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 bg-slate-50 z-15">
                    <TableRow className="border-b border-slate-100 hover:bg-transparent">
                      <TableHead className="text-xs font-bold text-slate-500 h-10 px-4 text-center w-12 bg-slate-50">Pos.</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 h-10 px-4 bg-slate-50">Produto</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 h-10 px-4 text-center bg-slate-50">Unidades</TableHead>
                      <TableHead className="text-xs font-bold text-slate-500 h-10 px-4 text-right bg-slate-50">Faturamento</TableHead>
                      <TableHead className="text-xs font-bold text-emerald-700 h-10 px-4 text-right bg-slate-50">Lucro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-xs text-slate-400 font-medium">
                          Nenhum produto encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      [...processedProducts]
                        .sort((a, b) => b.unidadesVendidas - a.unidadesVendidas)
                        .map((product, index) => {
                          let medal = "";
                          if (index === 0) medal = "🥇";
                          else if (index === 1) medal = "🥈";
                          else if (index === 2) medal = "🥉";

                          return (
                            <TableRow 
                              key={product.id} 
                              className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                            >
                              <TableCell className="font-extrabold text-xs text-slate-500 text-center py-3 px-4">
                                {medal ? <span className="text-base">{medal}</span> : `${index + 1}º`}
                              </TableCell>
                              <TableCell className="font-bold text-xs text-slate-800 py-3 px-4 flex items-center gap-2">
                                <img 
                                  src={product.image} 
                                  alt={product.name} 
                                  className="w-8 h-8 rounded object-cover border border-slate-150 shadow-sm shrink-0"
                                  onError={(e) => {
                                    (e.target as any).src = "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=80&h=80&fit=crop";
                                  }}
                                />
                                <div className="flex flex-col min-w-0">
                                  <span className="truncate max-w-[120px] font-bold text-slate-800">{product.name}</span>
                                  <span className="text-[9px] font-mono text-slate-400 font-bold">{product.sku}</span>
                                </div>
                              </TableCell>
                              <TableCell className="font-semibold text-xs text-slate-600 text-center py-3 px-4">
                                {product.unidadesVendidas}
                              </TableCell>
                              <TableCell className="font-bold text-xs text-slate-900 text-right py-3 px-4">
                                {fmtBRL(product.faturamentoBruto)}
                              </TableCell>
                              <TableCell className="font-bold text-xs text-emerald-700 text-right py-3 px-4">
                                {fmtBRL(product.lucroLiquidoGerado)}
                              </TableCell>
                            </TableRow>
                          );
                        })
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

        </section>



        {/* 8. RECENT ACTIVITIES (Expanded to Full Width) */}
        <section className="w-full">
          <Card className="border border-slate-100 shadow-sm bg-white rounded-2xl">
            <CardHeader className="border-b border-slate-50 bg-slate-50/20 px-6 py-4">
              <CardTitle className="text-base font-bold text-slate-800">Histórico de Atividades da Operação</CardTitle>
              <CardDescription className="text-xs text-slate-500 font-medium">
                Linha do tempo em tempo real com as últimas ações comerciais sincronizadas dos canais integrados
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(idx => <Skeleton key={idx} className="h-10 w-full bg-slate-100" />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100/55">
                  {data.activities.slice(0, 8).map((activity) => (
                    <div key={activity.id} className="flex gap-4 relative group items-center py-1">
                      <div className="w-7 h-7 rounded-full bg-white border-2 border-indigo-100 shadow-sm flex items-center justify-center text-xs shrink-0 z-10 select-none">
                        {activity.type === "sale" && "🛒"}
                        {activity.type === "connection" && "🔗"}
                        {activity.type === "shipping" && "📦"}
                        {activity.type === "onboarding" && "✨"}
                        {activity.type === "milestone" && "🏆"}
                        {activity.type === "cancellation" && "❌"}
                        {activity.type === "issue" && "⚠️"}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2.5">
                          <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md shrink-0">{activity.time}</span>
                          <span className="text-xs font-semibold text-slate-700 leading-relaxed truncate max-w-[90%] md:max-w-md">{activity.message}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

      </main>

      {/* 9. SELLER DETAILED DRAWER (360º VIEW) */}
      <Sheet open={sellerDrawerOpen} onOpenChange={setSellerDrawerOpen}>
        <SheetContent className="sm:max-w-md w-full bg-white p-6 overflow-y-auto border-l border-slate-100 shadow-2xl">
          <SheetHeader className="pb-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold">
                Performance do Vendedor
              </Badge>
              <SheetClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50">
                  <X className="h-4 w-4" />
                </Button>
              </SheetClose>
            </div>
            
            <div className="flex items-center gap-3 mt-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-lg font-black text-indigo-700">
                {selectedSeller?.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div>
                <SheetTitle className="text-lg font-black text-slate-800">{selectedSeller?.name}</SheetTitle>
                <SheetDescription className="text-xs text-slate-500 font-medium">
                  Canal Principal: <span className="font-bold text-slate-700">{selectedSeller?.marketplacePrincipal}</span>
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {selectedSeller && (
            <div className="space-y-6 pt-6">
              
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Métricas consolidadas (30 dias)</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Faturamento Bruto</span>
                    <p className="text-sm font-extrabold text-slate-800 mt-1">{fmtBRL(selectedSeller.faturamentoBruto)}</p>
                  </div>
                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase">Lucro Líquido</span>
                    <p className="text-sm font-extrabold text-emerald-800 mt-1">{fmtBRL(selectedSeller.lucroLiquidoVendedores)}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Margem Líquida</span>
                    <p className="text-sm font-extrabold text-slate-800 mt-1">{selectedSeller.margemLiquida.toFixed(2)}%</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Pedidos Aprovados</span>
                    <p className="text-sm font-extrabold text-slate-800 mt-1">{selectedSeller.pedidos} un</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/50 flex justify-between items-center text-xs font-medium text-slate-600">
                  <span>Ticket Médio: <strong className="text-slate-800">{fmtBRL(selectedSeller.ticketMedio)}</strong></span>
                  <span>Cancelamentos: <strong className="text-rose-600">{selectedSeller.taxaCancelamento.toFixed(2)}%</strong></span>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Share de Canais</h4>
                <div className="space-y-2">
                  {selectedSeller.marketplacesShare.map((share, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span>{share.name}</span>
                        <span>{share.percent}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-600 rounded-full"
                          style={{ width: `${share.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Produtos mais vendidos</h4>
                <div className="space-y-2">
                  {selectedSeller.produtosVendidos.map((prod, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 text-xs transition-colors">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{prod.name}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{prod.unidades} unidades</span>
                      </div>
                      <span className="font-extrabold text-slate-900">{fmtBRL(prod.faturamento)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Evolução do faturamento</h4>
                <div className="flex items-end justify-between h-20 pt-4 px-2">
                  {selectedSeller.mensalEvolucao.map((evol, idx) => {
                    const maxFat = Math.max(...selectedSeller.mensalEvolucao.map(e => e.faturamento));
                    const heightPercent = maxFat > 0 ? (evol.faturamento / maxFat) * 100 : 0;
                    return (
                      <div key={idx} className="flex flex-col items-center gap-1.5 flex-1">
                        <span className="text-[9px] font-bold text-slate-400">{fmtBRL(evol.faturamento).replace("R$", "").trim()}</span>
                        <div className="w-7 bg-indigo-500 rounded-t-md hover:bg-indigo-600 transition-colors" style={{ height: `${heightPercent * 0.4}px` }} />
                        <span className="text-[10px] font-bold text-slate-500">{evol.month}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-[10px] text-emerald-800 leading-relaxed font-medium">
                <span className="font-bold flex items-center gap-1 mb-1">
                  <Info className="h-3.5 w-3.5 text-emerald-600" />
                  Lucro Líquido do Vendedor (Definição):
                </span>
                {profitFormulaStr}
              </div>

            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* 10. REAL-TIME FLOATING SALES POP-UP */}
      {activeNotification && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-[360px] bg-white/95 backdrop-blur-md border border-indigo-100/50 shadow-2xl rounded-2xl p-4 animate-in slide-in-from-bottom-5 duration-300 transition-all flex items-start gap-3.5 shadow-indigo-100/40">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-sm ${
            activeNotification.marketplace === "Mercado Livre" ? "bg-blue-50 text-blue-500" :
            activeNotification.marketplace === "Shopee" ? "bg-orange-50 text-orange-500" :
            activeNotification.marketplace === "Amazon" ? "bg-yellow-50 text-yellow-600" : "bg-emerald-50 text-emerald-600"
          }`}>
            🛒
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Nova Venda Realizada!</span>
              <button 
                onClick={() => setActiveNotification(null)} 
                className="text-slate-300 hover:text-slate-500 transition-colors p-0.5 rounded-md hover:bg-slate-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            
            <p className="text-xs text-slate-700 leading-normal">
              <strong className="text-slate-900 font-bold">{activeNotification.seller}</strong> vendeu <strong>{activeNotification.product}</strong> no <strong className="text-slate-800 font-bold">{activeNotification.marketplace}</strong>.
            </p>
            
            <div className="flex items-center justify-between text-[10.5px] pt-1.5 border-t border-slate-100 mt-1.5">
              <span className="text-slate-500 font-semibold">Valor: <strong className="text-slate-850 font-bold">{fmtBRL(activeNotification.price)}</strong></span>
              <span className="text-emerald-600 font-bold">Lucro Vendedor: <strong>{fmtBRL(activeNotification.profit)}</strong></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
