// Seller Performance Dashboard Data & Utilities
// Exclusively represents performance of sellers using Lojafy to sell on marketplaces.

export type PeriodType = "hoje" | "7_dias" | "10_dias" | "15_dias" | "30_dias";

export interface KPICard {
  title: string;
  value: string;
  rawValue: number;
  changePercent: number;
  isPositive: boolean;
  microtext: string;
  tooltip?: string;
}

export interface ChartDataPoint {
  date: string;
  faturamento: number;
  pedidos: number;
  unidades: number;
  lucroLiquido: number;
}

export interface MarketplaceData {
  id: string;
  name: string;
  faturamentoBruto: number;
  receitaLiquida: number;
  lucroLiquidoVendedores: number;
  pedidos: number;
  unidadesVendidas: number;
  ticketMedio: number;
  share: number;
  taxaCancelamento: number;
  crescimento: number;
}

export interface SellerData {
  id: string;
  name: string;
  avatar?: string;
  faturamentoBruto: number;
  receitaLiquida: number;
  lucroLiquidoVendedores: number;
  margemLiquida: number; // (lucroLiquidoVendedores / faturamentoBruto) * 100
  pedidos: number;
  unidadesVendidas: number;
  ticketMedio: number;
  marketplacePrincipal: string;
  taxaCancelamento: number;
  crescimento: number;
  // Detalhes 360
  produtosVendidos: Array<{
    name: string;
    unidades: number;
    faturamento: number;
  }>;
  marketplacesShare: Array<{
    name: string;
    percent: number;
  }>;
  mensalEvolucao: Array<{
    month: string;
    faturamento: number;
    lucro: number;
  }>;
}

export interface ProductPerformance {
  id: string;
  name: string;
  sku: string;
  image: string;
  unidadesVendidas: number;
  pedidos: number;
  faturamentoBruto: number;
  lucroLiquidoGerado: number;
  ticketMedio: number;
  marketplacePrincipal: string;
  crescimento: number;
  estoqueDisponivel: number;
  status: "Campeão de vendas" | "Alta conversão" | "Em crescimento" | "Estável" | "Queda de vendas" | "Risco de estoque" | "Alto cancelamento";
}

export interface RecentActivity {
  id: string;
  time: string;
  message: string;
  type: "sale" | "onboarding" | "shipping" | "milestone" | "connection" | "issue" | "cancellation";
}

// Recent Activities Feed for Real-time Simulator
export const mockActivities: RecentActivity[] = [
  {
    id: "act1",
    time: "21h35",
    message: "Jéssica Santos vendeu 1x Escova Secadora 5 em 1 no Mercado Livre por R$ 149,90. Lucro líquido estimado do vendedor: R$ 41,20.",
    type: "sale"
  },
  {
    id: "act2",
    time: "21h32",
    message: "Novo marketplace conectado: Rodrigo Santos integrou sua conta da Shopee à Amazon Brasil.",
    type: "connection"
  },
  {
    id: "act3",
    time: "21h15",
    message: "Pedido Enviado: João Silva despachou 2x Smartwatch Sport Pro Max via Shopee Envios.",
    type: "shipping"
  },
  {
    id: "act4",
    time: "20h58",
    message: "Nova integração ativa! Camila Alves realizou sua primeira venda no Mercado Livre (R$ 89,90) via Lojafy.",
    type: "onboarding"
  },
  {
    id: "act5",
    time: "20h12",
    message: "Teclado Mecânico RGB subiu de posição no ranking de produtos mais vendidos.",
    type: "milestone"
  },
  {
    id: "act6",
    time: "19h40",
    message: "Pedido Cancelado: Venda #84931 de Lucas Oliveira foi cancelada na Amazon (motivo: cliente desistiu).",
    type: "cancellation"
  },
  {
    id: "act7",
    time: "18h15",
    message: "Sincronização de Integração concluída com sucesso para a API da Shopee.",
    type: "issue"
  }
];

export const mockProducts: ProductPerformance[] = [
  {
    id: "p1",
    name: "Escova Secadora 5 em 1 Ceramic Pro",
    sku: "ESC-SEC-5X1-PRO",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=80&h=80&fit=crop&q=80",
    unidadesVendidas: 412,
    pedidos: 395,
    faturamentoBruto: 61758.80,
    lucroLiquidoGerado: 17292.46,
    ticketMedio: 156.35,
    marketplacePrincipal: "Mercado Livre",
    crescimento: 34.2,
    estoqueDisponivel: 180,
    status: "Campeão de vendas"
  },
  {
    id: "p2",
    name: "Fone Bluetooth Active Noise Cancelling ANC-90",
    sku: "FNE-BT-ANC90-BLK",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=80&h=80&fit=crop&q=80",
    unidadesVendidas: 328,
    pedidos: 310,
    faturamentoBruto: 78392.00,
    lucroLiquidoGerado: 19598.00,
    ticketMedio: 252.87,
    marketplacePrincipal: "Amazon",
    crescimento: 18.5,
    estoqueDisponivel: 6,
    status: "Risco de estoque"
  },
  {
    id: "p3",
    name: "Smartwatch Sport Pro GPS AMOLED",
    sku: "SMT-WTCH-AMOLED-RED",
    image: "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?w=80&h=80&fit=crop&q=80",
    unidadesVendidas: 284,
    pedidos: 280,
    faturamentoBruto: 99116.00,
    lucroLiquidoGerado: 23787.84,
    ticketMedio: 353.98,
    marketplacePrincipal: "Shopee",
    crescimento: 48.0,
    estoqueDisponivel: 95,
    status: "Alta conversão"
  },
  {
    id: "p4",
    name: "Teclado Mecânico Compact RGB Switch Brown",
    sku: "TEC-MEC-RGB-BROWN",
    image: "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=80&h=80&fit=crop&q=80",
    unidadesVendidas: 195,
    pedidos: 190,
    faturamentoBruto: 42705.00,
    lucroLiquidoGerado: 10676.25,
    ticketMedio: 224.76,
    marketplacePrincipal: "Loja Própria",
    crescimento: 8.9,
    estoqueDisponivel: 45,
    status: "Estável"
  },
  {
    id: "p5",
    name: "Mini Projetor Portátil HD Cinema Home",
    sku: "PROJ-MINI-HD-WHITE",
    image: "https://images.unsplash.com/photo-1535016120720-40c646be5580?w=80&h=80&fit=crop&q=80",
    unidadesVendidas: 122,
    pedidos: 120,
    faturamentoBruto: 54778.00,
    lucroLiquidoGerado: 6135.13,
    ticketMedio: 456.48,
    marketplacePrincipal: "Mercado Livre",
    crescimento: -12.4,
    estoqueDisponivel: 32,
    status: "Queda de vendas"
  },
  {
    id: "p6",
    name: "Carregador Portátil Power Bank 20k mAh",
    sku: "PWR-BNK-20K-FAST",
    image: "https://images.unsplash.com/photo-1609592424085-f58475c74230?w=80&h=80&fit=crop&q=80",
    unidadesVendidas: 380,
    pedidos: 350,
    faturamentoBruto: 37620.00,
    lucroLiquidoGerado: 9405.00,
    ticketMedio: 107.48,
    marketplacePrincipal: "Shopee",
    crescimento: 55.4,
    estoqueDisponivel: 140,
    status: "Em crescimento"
  },
  {
    id: "p7",
    name: "Ring Light 12 polegadas com Tripé Articulado",
    sku: "RNG-LGT-12-TRIPOD",
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=80&h=80&fit=crop&q=80",
    unidadesVendidas: 220,
    pedidos: 198,
    faturamentoBruto: 19800.00,
    lucroLiquidoGerado: 4752.00,
    ticketMedio: 100.00,
    marketplacePrincipal: "Shopee",
    crescimento: -8.0,
    estoqueDisponivel: 12,
    status: "Alto cancelamento"
  }
];

// Expanded Sellers list containing 22 high-performance sellers
export const mockSellers: SellerData[] = [
  {
    id: "s1",
    name: "Jéssica Santos",
    faturamentoBruto: 148900.00,
    receitaLiquida: 122100.00,
    lucroLiquidoVendedores: 44210.00,
    margemLiquida: 29.69,
    pedidos: 980,
    unidadesVendidas: 1080,
    ticketMedio: 151.93,
    marketplacePrincipal: "Mercado Livre",
    crescimento: 45.20,
    produtosVendidos: [
      { name: "Escova Secadora 5 em 1", unidades: 290, faturamento: 43490.00 },
      { name: "Mini Projetor Portátil HD", unidades: 82, faturamento: 37400.00 }
    ],
    marketplacesShare: [
      { name: "Mercado Livre", percent: 85 },
      { name: "Shopee", percent: 15 }
    ],
    mensalEvolucao: [
      { month: "Fev", faturamento: 90000, lucro: 26000 },
      { month: "Mar", faturamento: 105000, lucro: 30200 },
      { month: "Abr", faturamento: 120000, lucro: 35100 },
      { month: "Mai", faturamento: 148900, lucro: 44210 }
    ]
  },
  {
    id: "s2",
    name: "João Silva",
    faturamentoBruto: 124500.00,
    receitaLiquida: 102090.00,
    lucroLiquidoVendedores: 32840.00,
    margemLiquida: 26.38,
    pedidos: 812,
    unidadesVendidas: 940,
    ticketMedio: 153.32,
    marketplacePrincipal: "Shopee",
    crescimento: 32.00,
    produtosVendidos: [
      { name: "Smartwatch Sport Pro GPS", unidades: 142, faturamento: 49700.00 },
      { name: "Carregador Portátil 20k mAh", unidades: 180, faturamento: 17820.00 },
      { name: "Ring Light 12 polegadas", unidades: 90, faturamento: 8100.00 }
    ],
    marketplacesShare: [
      { name: "Shopee", percent: 75 },
      { name: "Mercado Livre", percent: 20 },
      { name: "Amazon", percent: 5 }
    ],
    mensalEvolucao: [
      { month: "Fev", faturamento: 80000, lucro: 20500 },
      { month: "Mar", faturamento: 95000, lucro: 24200 },
      { month: "Abr", faturamento: 110000, lucro: 28800 },
      { month: "Mai", faturamento: 124500, lucro: 32840 }
    ]
  },
  {
    id: "s3",
    name: "Lucas Oliveira",
    faturamentoBruto: 98200.00,
    receitaLiquida: 81500.00,
    lucroLiquidoVendedores: 22580.00,
    margemLiquida: 22.99,
    pedidos: 410,
    unidadesVendidas: 450,
    ticketMedio: 239.51,
    marketplacePrincipal: "Amazon",
    crescimento: 18.15,
    produtosVendidos: [
      { name: "Fone Bluetooth Noise Cancelling", unidades: 195, faturamento: 46800.00 },
      { name: "Teclado Mecânico RGB", unidades: 80, faturamento: 17600.00 }
    ],
    marketplacesShare: [
      { name: "Amazon", percent: 80 },
      { name: "Loja Própria", percent: 20 }
    ],
    mensalEvolucao: [
      { month: "Fev", faturamento: 78000, lucro: 17500 },
      { month: "Mar", faturamento: 82000, lucro: 18600 },
      { month: "Abr", faturamento: 90000, lucro: 20500 },
      { month: "Mai", faturamento: 98200, lucro: 22580 }
    ]
  },
  {
    id: "s4",
    name: "Beatriz Souza",
    faturamentoBruto: 74200.00,
    receitaLiquida: 60800.00,
    lucroLiquidoVendedores: 18180.00,
    margemLiquida: 24.50,
    pedidos: 480,
    unidadesVendidas: 510,
    ticketMedio: 154.58,
    marketplacePrincipal: "Mercado Livre",
    crescimento: 12.80,
    produtosVendidos: [
      { name: "Escova Secadora 5 em 1", unidades: 122, faturamento: 18268.00 },
      { name: "Mini Projetor Portátil HD", unidades: 40, faturamento: 17378.00 }
    ],
    marketplacesShare: [
      { name: "Mercado Livre", percent: 60 },
      { name: "Shopee", percent: 40 }
    ],
    mensalEvolucao: [
      { month: "Fev", faturamento: 62000, lucro: 14900 },
      { month: "Mar", faturamento: 65000, lucro: 15800 },
      { month: "Abr", faturamento: 70000, lucro: 17100 },
      { month: "Mai", faturamento: 74200, lucro: 18180 }
    ]
  },
  {
    id: "s5",
    name: "Thiago Costa",
    faturamentoBruto: 52100.00,
    receitaLiquida: 42200.00,
    lucroLiquidoVendedores: 11460.00,
    margemLiquida: 22.00,
    pedidos: 390,
    unidadesVendidas: 460,
    ticketMedio: 133.59,
    marketplacePrincipal: "Shopee",
    crescimento: -5.40,
    produtosVendidos: [
      { name: "Carregador Portátil 20k mAh", unidades: 200, faturamento: 19800.00 },
      { name: "Ring Light 12 polegadas", unidades: 130, faturamento: 11700.00 }
    ],
    marketplacesShare: [
      { name: "Shopee", percent: 90 },
      { name: "Mercado Livre", percent: 10 }
    ],
    mensalEvolucao: [
      { month: "Fev", faturamento: 55000, lucro: 12200 },
      { month: "Mar", faturamento: 56000, lucro: 12400 },
      { month: "Abr", faturamento: 54000, lucro: 11900 },
      { month: "Mai", faturamento: 52100, lucro: 11460 }
    ]
  },
  {
    id: "s6",
    name: "Amanda Lima",
    faturamentoBruto: 45600.00,
    receitaLiquida: 39800.00,
    lucroLiquidoVendedores: 14130.00,
    margemLiquida: 30.99,
    pedidos: 205,
    unidadesVendidas: 220,
    ticketMedio: 222.44,
    marketplacePrincipal: "Loja Própria",
    crescimento: 24.30,
    produtosVendidos: [
      { name: "Teclado Mecânico RGB", unidades: 115, faturamento: 25105.00 },
      { name: "Fone Bluetooth Noise Cancelling", unidades: 50, faturamento: 12000.00 }
    ],
    marketplacesShare: [
      { name: "Loja Própria", percent: 80 },
      { name: "Amazon", percent: 20 }
    ],
    mensalEvolucao: [
      { month: "Fev", faturamento: 34000, lucro: 9800 },
      { month: "Mar", faturamento: 38000, lucro: 11200 },
      { month: "Abr", faturamento: 41000, lucro: 12500 },
      { month: "Mai", faturamento: 45600, lucro: 14130 }
    ]
  },
  {
    id: "s7",
    name: "Rodrigo Santos",
    faturamentoBruto: 38400.00,
    receitaLiquida: 31200.00,
    lucroLiquidoVendedores: 8900.00,
    margemLiquida: 23.18,
    pedidos: 155,
    unidadesVendidas: 175,
    ticketMedio: 247.74,
    marketplacePrincipal: "Amazon",
    crescimento: 8.50,
    produtosVendidos: [
      { name: "Smartwatch Sport Pro GPS", unidades: 62, faturamento: 21700.00 },
      { name: "Fone Bluetooth Noise Cancelling", unidades: 40, faturamento: 9600.00 }
    ],
    marketplacesShare: [
      { name: "Amazon", percent: 70 },
      { name: "Shopee", percent: 30 }
    ],
    mensalEvolucao: [
      { month: "Fev", faturamento: 32000, lucro: 7100 },
      { month: "Mar", faturamento: 34000, lucro: 7700 },
      { month: "Abr", faturamento: 36000, lucro: 8300 },
      { month: "Mai", faturamento: 38400, lucro: 8900 }
    ]
  },
  {
    id: "s8",
    name: "Camila Alves",
    faturamentoBruto: 29500.00,
    receitaLiquida: 24100.00,
    lucroLiquidoVendedores: 6780.00,
    margemLiquida: 22.98,
    pedidos: 240,
    unidadesVendidas: 270,
    ticketMedio: 122.92,
    marketplacePrincipal: "Shopee",
    crescimento: 104.20,
    produtosVendidos: [
      { name: "Carregador Portátil 20k mAh", unidades: 120, faturamento: 11880.00 },
      { name: "Ring Light 12 polegadas", unidades: 90, faturamento: 8100.00 }
    ],
    marketplacesShare: [
      { name: "Shopee", percent: 100 }
    ],
    mensalEvolucao: [
      { month: "Fev", faturamento: 5000, lucro: 1100 },
      { month: "Mar", faturamento: 10000, lucro: 2200 },
      { month: "Abr", faturamento: 14450, lucro: 3300 },
      { month: "Mai", faturamento: 29500, lucro: 6780 }
    ]
  },
  {
    id: "s9",
    name: "Bruno Ferreira",
    faturamentoBruto: 26800.00,
    receitaLiquida: 22100.00,
    lucroLiquidoVendedores: 6430.00,
    margemLiquida: 23.99,
    pedidos: 168,
    unidadesVendidas: 180,
    ticketMedio: 159.52,
    marketplacePrincipal: "Mercado Livre",
    crescimento: 15.40,
    produtosVendidos: [
      { name: "Escova Secadora 5 em 1", unidades: 80, faturamento: 12000.00 },
      { name: "Mini Projetor Portátil HD", unidades: 32, faturamento: 14800.00 }
    ],
    marketplacesShare: [
      { name: "Mercado Livre", percent: 70 },
      { name: "Shopee", percent: 30 }
    ],
    mensalEvolucao: [
      { month: "Fev", faturamento: 20000, lucro: 4500 },
      { month: "Mar", faturamento: 22000, lucro: 5100 },
      { month: "Abr", faturamento: 24500, lucro: 5800 },
      { month: "Mai", faturamento: 26800, lucro: 6430 }
    ]
  },
  {
    id: "s10",
    name: "Patrícia Gomes",
    faturamentoBruto: 24300.00,
    receitaLiquida: 21100.00,
    lucroLiquidoVendedores: 7530.00,
    margemLiquida: 30.98,
    pedidos: 110,
    unidadesVendidas: 120,
    ticketMedio: 220.90,
    marketplacePrincipal: "Loja Própria",
    crescimento: 12.30,
    produtosVendidos: [
      { name: "Teclado Mecânico RGB", unidades: 60, faturamento: 13200.00 },
      { name: "Fone Bluetooth Noise Cancelling", unidades: 44, faturamento: 11100.00 }
    ],
    marketplacesShare: [
      { name: "Loja Própria", percent: 90 },
      { name: "Amazon", percent: 10 }
    ],
    mensalEvolucao: [
      { month: "Fev", faturamento: 18000, lucro: 5500 },
      { month: "Mar", faturamento: 20000, lucro: 6100 },
      { month: "Abr", faturamento: 22000, lucro: 6800 },
      { month: "Mai", faturamento: 24300, lucro: 7530 }
    ]
  },
  {
    id: "s11",
    name: "Fernando Lima",
    faturamentoBruto: 22100.00,
    receitaLiquida: 18100.00,
    lucroLiquidoVendedores: 4860.00,
    margemLiquida: 21.99,
    pedidos: 172,
    unidadesVendidas: 195,
    ticketMedio: 128.48,
    marketplacePrincipal: "Shopee",
    crescimento: -2.10,
    produtosVendidos: [
      { name: "Carregador Portátil 20k mAh", unidades: 120, faturamento: 11880.00 },
      { name: "Ring Light 12 polegadas", unidades: 110, faturamento: 10220.00 }
    ],
    marketplacesShare: [
      { name: "Shopee", percent: 85 },
      { name: "Mercado Livre", percent: 15 }
    ],
    mensalEvolucao: [
      { month: "Fev", faturamento: 21000, lucro: 4600 },
      { month: "Mar", faturamento: 23000, lucro: 5100 },
      { month: "Abr", faturamento: 22500, lucro: 4900 },
      { month: "Mai", faturamento: 22100, lucro: 4860 }
    ]
  },
  {
    id: "s12",
    name: "Mariana Costa",
    faturamentoBruto: 20500.00,
    receitaLiquida: 16900.00,
    lucroLiquidoVendedores: 4710.00,
    margemLiquida: 22.97,
    pedidos: 86,
    unidadesVendidas: 98,
    ticketMedio: 238.37,
    marketplacePrincipal: "Amazon",
    crescimento: 14.50,
    produtosVendidos: [
      { name: "Fone Bluetooth Noise Cancelling", unidades: 50, faturamento: 12000.00 },
      { name: "Teclado Mecânico RGB", unidades: 38, faturamento: 8500.00 }
    ],
    marketplacesShare: [
      { name: "Amazon", percent: 90 },
      { name: "Loja Própria", percent: 10 }
    ],
    mensalEvolucao: [
      { month: "Fev", faturamento: 15000, lucro: 3400 },
      { month: "Mar", faturamento: 17000, lucro: 3900 },
      { month: "Abr", faturamento: 19000, lucro: 4300 },
      { month: "Mai", faturamento: 20500, lucro: 4710 }
    ]
  },
  {
    id: "s13",
    name: "Gabriel Ribeiro",
    faturamentoBruto: 18900.00,
    receitaLiquida: 15600.00,
    lucroLiquidoVendedores: 4950.00,
    margemLiquida: 26.19,
    pedidos: 122,
    unidadesVendidas: 140,
    ticketMedio: 154.91,
    marketplacePrincipal: "Mercado Livre",
    crescimento: 18.20,
    produtosVendidos: [
      { name: "Escova Secadora 5 em 1", unidades: 60, faturamento: 9000.00 },
      { name: "Mini Projetor Portátil HD", unidades: 22, faturamento: 9900.00 }
    ],
    marketplacesShare: [
      { name: "Mercado Livre", percent: 100 }
    ],
    mensalEvolucao: [
      { month: "Fev", faturamento: 13000, lucro: 3400 },
      { month: "Mar", faturamento: 15000, lucro: 3900 },
      { month: "Abr", faturamento: 17000, lucro: 4400 },
      { month: "Mai", faturamento: 18900, lucro: 4950 }
    ]
  },
  {
    id: "s14",
    name: "Aline Teixeira",
    faturamentoBruto: 17200.00,
    receitaLiquida: 14100.00,
    lucroLiquidoVendedores: 3950.00,
    margemLiquida: 22.96,
    pedidos: 136,
    unidadesVendidas: 155,
    ticketMedio: 126.47,
    marketplacePrincipal: "Shopee",
    crescimento: 25.60,
    produtosVendidos: [
      { name: "Carregador Portátil 20k mAh", unidades: 80, faturamento: 7920.00 },
      { name: "Ring Light 12 polegadas", unidades: 85, faturamento: 9280.00 }
    ],
    marketplacesShare: [
      { name: "Shopee", percent: 80 },
      { name: "Mercado Livre", percent: 20 }
    ],
    mensalEvolucao: [
      { month: "Fev", faturamento: 10000, lucro: 2200 },
      { month: "Mar", faturamento: 12000, lucro: 2700 },
      { month: "Abr", faturamento: 14000, lucro: 3100 },
      { month: "Mai", faturamento: 17200, lucro: 3950 }
    ]
  },
  {
    id: "s15",
    name: "Eduardo Carvalho",
    faturamentoBruto: 15600.00,
    receitaLiquida: 12800.00,
    lucroLiquidoVendedores: 3740.00,
    margemLiquida: 23.97,
    pedidos: 98,
    unidadesVendidas: 110,
    ticketMedio: 159.18,
    marketplacePrincipal: "Mercado Livre",
    crescimento: 5.40,
    produtosVendidos: [
      { name: "Escova Secadora 5 em 1", unidades: 48, faturamento: 7200.00 },
      { name: "Mini Projetor Portátil HD", unidades: 18, faturamento: 8400.00 }
    ],
    marketplacesShare: [
      { name: "Mercado Livre", percent: 75 },
      { name: "Shopee", percent: 25 }
    ],
    mensalEvolucao: [
      { month: "Fev", faturamento: 13000, lucro: 3100 },
      { month: "Mar", faturamento: 14000, lucro: 3300 },
      { month: "Abr", faturamento: 14800, lucro: 3500 },
      { month: "Mai", faturamento: 15600, lucro: 3740 }
    ]
  },
  {
    id: "s16",
    name: "Letícia Vieira",
    faturamentoBruto: 14100.00,
    receitaLiquida: 12200.00,
    lucroLiquidoVendedores: 4350.00,
    margemLiquida: 30.85,
    pedidos: 64,
    unidadesVendidas: 72,
    ticketMedio: 220.31,
    marketplacePrincipal: "Loja Própria",
    crescimento: 31.20,
    produtosVendidos: [
      { name: "Teclado Mecânico RGB", unidades: 40, faturamento: 8800.00 },
      { name: "Fone Bluetooth Noise Cancelling", unidades: 22, faturamento: 5300.00 }
    ],
    marketplacesShare: [
      { name: "Loja Própria", percent: 100 }
    ],
    mensalEvolucao: [
      { month: "Fev", faturamento: 8000, lucro: 2400 },
      { month: "Mar", faturamento: 10000, lucro: 3100 },
      { month: "Abr", faturamento: 12000, lucro: 3700 },
      { month: "Mai", faturamento: 14100, lucro: 4350 }
    ]
  },
  {
    id: "s17",
    name: "Ricardo Souza",
    faturamentoBruto: 12800.00,
    receitaLiquida: 10500.00,
    lucroLiquidoVendedores: 2940.00,
    margemLiquida: 22.96,
    pedidos: 54,
    unidadesVendidas: 60,
    ticketMedio: 237.03,
    marketplacePrincipal: "Amazon",
    crescimento: 8.40,
    produtosVendidos: [
      { name: "Fone Bluetooth Noise Cancelling", unidades: 30, faturamento: 7200.00 },
      { name: "Teclado Mecânico RGB", unidades: 25, faturamento: 5600.00 }
    ],
    marketplacesShare: [
      { name: "Amazon", percent: 80 },
      { name: "Shopee", percent: 20 }
    ],
    mensalEvolucao: [
      { month: "Fev", faturamento: 10000, lucro: 2300 },
      { month: "Mar", faturamento: 11000, lucro: 2500 },
      { month: "Abr", faturamento: 12000, lucro: 2700 },
      { month: "Mai", faturamento: 12800, lucro: 2940 }
    ]
  },
  {
    id: "s18",
    name: "Juliana Martins",
    faturamentoBruto: 11500.00,
    receitaLiquida: 9400.00,
    lucroLiquidoVendedores: 2530.00,
    margemLiquida: 22.00,
    pedidos: 88,
    unidadesVendidas: 96,
    ticketMedio: 130.68,
    marketplacePrincipal: "Shopee",
    crescimento: 41.50,
    produtosVendidos: [
      { name: "Carregador Portátil 20k mAh", unidades: 50, faturamento: 4950.00 },
      { name: "Ring Light 12 polegadas", unidades: 60, faturamento: 6550.00 }
    ],
    marketplacesShare: [
      { name: "Shopee", percent: 100 }
    ],
    mensalEvolucao: [
      { month: "Fev", faturamento: 5000, lucro: 1100 },
      { month: "Mar", faturamento: 7000, lucro: 1500 },
      { month: "Abr", faturamento: 9000, lucro: 1900 },
      { month: "Mai", faturamento: 11500, lucro: 2530 }
    ]
  },
  {
    id: "s19",
    name: "Gustavo Pires",
    faturamentoBruto: 10200.00,
    receitaLiquida: 8400.00,
    lucroLiquidoVendedores: 2440.00,
    margemLiquida: 23.92,
    pedidos: 66,
    unidadesVendidas: 75,
    ticketMedio: 154.54,
    marketplacePrincipal: "Mercado Livre",
    crescimento: -3.50,
    produtosVendidos: [
      { name: "Escova Secadora 5 em 1", unidades: 32, faturamento: 4800.00 },
      { name: "Mini Projetor Portátil HD", unidades: 12, faturamento: 5400.00 }
    ],
    marketplacesShare: [
      { name: "Mercado Livre", percent: 80 },
      { name: "Shopee", percent: 20 }
    ],
    mensalEvolucao: [
      { month: "Fev", faturamento: 9500, lucro: 2200 },
      { month: "Mar", faturamento: 10500, lucro: 2500 },
      { month: "Abr", faturamento: 10400, lucro: 2480 },
      { month: "Mai", faturamento: 10200, lucro: 2440 }
    ]
  },
  {
    id: "s20",
    name: "Vanessa Dias",
    faturamentoBruto: 9100.00,
    receitaLiquida: 7900.00,
    lucroLiquidoVendedores: 2810.00,
    margemLiquida: 30.87,
    pedidos: 42,
    unidadesVendidas: 46,
    ticketMedio: 216.66,
    marketplacePrincipal: "Loja Própria",
    crescimento: 18.90,
    produtosVendidos: [
      { name: "Teclado Mecânico RGB", unidades: 25, faturamento: 5500.00 },
      { name: "Fone Bluetooth Noise Cancelling", unidades: 15, faturamento: 3600.00 }
    ],
    marketplacesShare: [
      { name: "Loja Própria", percent: 100 }
    ],
    mensalEvolucao: [
      { month: "Fev", faturamento: 6000, lucro: 1800 },
      { month: "Mar", faturamento: 7000, lucro: 2100 },
      { month: "Abr", faturamento: 8200, lucro: 2500 },
      { month: "Mai", faturamento: 9100, lucro: 2810 }
    ]
  },
  {
    id: "s21",
    name: "Felipe Rocha",
    faturamentoBruto: 8300.00,
    receitaLiquida: 6800.00,
    lucroLiquidoVendedores: 1910.00,
    margemLiquida: 23.01,
    pedidos: 35,
    unidadesVendidas: 40,
    ticketMedio: 237.14,
    marketplacePrincipal: "Amazon",
    crescimento: 9.80,
    produtosVendidos: [
      { name: "Fone Bluetooth Noise Cancelling", unidades: 20, faturamento: 4800.00 },
      { name: "Teclado Mecânico RGB", unidades: 15, faturamento: 3500.00 }
    ],
    marketplacesShare: [
      { name: "Amazon", percent: 90 },
      { name: "Shopee", percent: 10 }
    ],
    mensalEvolucao: [
      { month: "Fev", faturamento: 6500, lucro: 1500 },
      { month: "Mar", faturamento: 7000, lucro: 1600 },
      { month: "Abr", faturamento: 7800, lucro: 1800 },
      { month: "Mai", faturamento: 8300, lucro: 1910 }
    ]
  },
  {
    id: "s22",
    name: "Carolina Nogueira",
    faturamentoBruto: 7500.00,
    receitaLiquida: 6100.00,
    lucroLiquidoVendedores: 1650.00,
    margemLiquida: 22.00,
    pedidos: 58,
    unidadesVendidas: 65,
    ticketMedio: 129.31,
    marketplacePrincipal: "Shopee",
    crescimento: 15.20,
    produtosVendidos: [
      { name: "Carregador Portátil 20k mAh", unidades: 30, faturamento: 2970.00 },
      { name: "Ring Light 12 polegadas", unidades: 35, faturamento: 4530.00 }
    ],
    marketplacesShare: [
      { name: "Shopee", percent: 100 }
    ],
    mensalEvolucao: [
      { month: "Fev", faturamento: 5000, lucro: 1100 },
      { month: "Mar", faturamento: 5500, lucro: 1200 },
      { month: "Abr", faturamento: 6500, lucro: 1400 },
      { month: "Mai", faturamento: 7500, lucro: 1650 }
    ]
  }
];

// Helper to compile time series for the graph based on period
export const getChartData = (period: PeriodType): ChartDataPoint[] => {
  const points: { [key in PeriodType]: { dates: string[]; mult: number } } = {
    hoje: {
      dates: ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"],
      mult: 0.05
    },
    "7_dias": {
      dates: ["Qui", "Sex", "Sáb", "Dom", "Seg", "Ter", "Qua"],
      mult: 0.23
    },
    "10_dias": {
      dates: ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "Hoje"],
      mult: 0.32
    },
    "15_dias": {
      dates: ["D1", "D3", "D5", "D7", "D9", "D11", "D13", "Hoje"],
      mult: 0.49
    },
    "30_dias": {
      dates: ["01/07", "04/07", "07/07", "10/07", "13/07", "16/07", "19/07", "22/07"],
      mult: 1.0
    }
  };

  const active = points[period];
  
  // Base numbers for 30 days (impressive volumes)
  const baseFaturamentos = [92000, 110000, 105000, 125000, 142000, 131000, 155000, 185000];
  const basePedidos = [580, 690, 660, 780, 890, 820, 970, 1150];
  const baseUnidades = [670, 790, 760, 900, 1020, 940, 1110, 1320];
  const baseLucros = [23920, 28600, 27300, 32500, 36920, 34060, 40300, 48100]; // ~26% margem

  return active.dates.map((date, idx) => {
    const factor = active.mult * (0.95 + Math.random() * 0.1); 
    const isToday = period === "hoje";
    const refIdx = idx % baseFaturamentos.length;
    
    return {
      date,
      faturamento: Math.round((isToday ? 6000 + Math.random()*8000 : baseFaturamentos[refIdx] * factor) * 100) / 100,
      pedidos: Math.round(isToday ? 35 + Math.random()*45 : basePedidos[refIdx] * factor),
      unidades: Math.round(isToday ? 42 + Math.random()*52 : baseUnidades[refIdx] * factor),
      lucroLiquido: Math.round((isToday ? 1560 + Math.random()*2100 : baseLucros[refIdx] * factor) * 100) / 100
    };
  });
};

// ----------------------------------------------------
// SYSTEM STATE FILTER COMPILER
// ----------------------------------------------------

export interface FilterOptions {
  period: PeriodType;
  marketplace: string;
  seller: string;
  product: string;
  orderStatus: string;
  storeAccount: string;
}

export const getAggregatedData = (filters: FilterOptions) => {
  let scale = 1.0;
  let labelPeriod = "nos últimos 30 dias";
  switch (filters.period) {
    case "hoje":
      scale = 0.035;
      labelPeriod = "hoje";
      break;
    case "7_dias":
      scale = 0.23;
      labelPeriod = "nos últimos 7 dias";
      break;
    case "10_dias":
      scale = 0.33;
      labelPeriod = "nos últimos 10 dias";
      break;
    case "15_dias":
      scale = 0.50;
      labelPeriod = "nos últimos 15 dias";
      break;
    case "30_dias":
      scale = 1.0;
      labelPeriod = "nos últimos 30 dias";
      break;
  }

  let targetSeller: SellerData | undefined;
  if (filters.seller && filters.seller !== "all") {
    targetSeller = mockSellers.find(s => s.id === filters.seller);
  }

  let targetProduct: ProductPerformance | undefined;
  if (filters.product && filters.product !== "all") {
    targetProduct = mockProducts.find(p => p.id === filters.product);
  }

  // Combined sum of all 22 sellers for 30 days:
  // faturamentoBruto: ~945k
  // receitaLiquida: ~780k
  // lucroLiquidoVendedores: ~245k
  let rawFat = 945200.00;
  let rawRec = 781500.00;
  let rawLuc = 244580.00; // ~25.8% margem
  let rawPed = 5920;
  let rawUni = 6780;
  let rawVendedores = 22;
  let rawCancel = 2.5;

  if (targetSeller) {
    rawFat = targetSeller.faturamentoBruto;
    rawRec = targetSeller.receitaLiquida;
    rawLuc = targetSeller.lucroLiquidoVendedores;
    rawPed = targetSeller.pedidos;
    rawUni = targetSeller.unidadesVendidas;
    rawVendedores = 1;
    rawCancel = targetSeller.taxaCancelamento;
  } else if (targetProduct) {
    rawFat = targetProduct.faturamentoBruto;
    rawRec = targetProduct.faturamentoBruto * 0.82;
    rawLuc = targetProduct.lucroLiquidoGerado;
    rawPed = targetProduct.pedidos;
    rawUni = targetProduct.unidadesVendidas;
    rawVendedores = 12;
    rawCancel = targetProduct.status === "Alto cancelamento" ? 6.5 : 1.9;
  }

  let marketplaceFactor = 1.0;
  if (filters.marketplace && filters.marketplace !== "all") {
    const mpShares: { [key: string]: number } = {
      shopee: 0.35,
      mercadolivre: 0.45,
      amazon: 0.12,
      lojapropria: 0.08
    };
    marketplaceFactor = mpShares[filters.marketplace] || 1.0;
    if (filters.marketplace === "shopee") rawCancel = 3.9;
    if (filters.marketplace === "lojapropria") rawCancel = 1.0;
    if (filters.marketplace === "mercadolivre") rawCancel = 2.1;
  }

  const activeFat = rawFat * scale * marketplaceFactor;
  const activeRec = rawRec * scale * marketplaceFactor;
  const activeLuc = rawLuc * scale * marketplaceFactor;
  const activePed = Math.round(rawPed * scale * marketplaceFactor);
  const activeUni = Math.round(rawUni * scale * marketplaceFactor);
  const activeTicket = activePed > 0 ? activeFat / activePed : 0;
  const activeVendedores = targetSeller ? 1 : Math.max(1, Math.round(rawVendedores * (filters.marketplace !== "all" ? 0.75 : 1)));

  const isPositiveGrowth = filters.period !== "hoje";
  const growthFat = isPositiveGrowth ? 14.8 : -2.5;
  const growthRec = isPositiveGrowth ? 12.3 : -1.8;
  const growthLuc = isPositiveGrowth ? 16.5 : -3.2;
  const growthPed = isPositiveGrowth ? 10.2 : -4.0;
  const growthUni = isPositiveGrowth ? 9.8 : -3.5;
  const growthTicket = isPositiveGrowth ? 4.1 : 1.5;
  const growthCancel = isPositiveGrowth ? -8.4 : 5.2;

  const fmtCurrency = (v: number) => 
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const fmtNumber = (v: number) => 
    new Intl.NumberFormat("pt-BR").format(v);

  const kpis: KPICard[] = [
    {
      title: "Faturamento Bruto",
      value: fmtCurrency(activeFat),
      rawValue: activeFat,
      changePercent: growthFat,
      isPositive: growthFat > 0,
      microtext: `vs. período anterior`,
      tooltip: "Soma das vendas brutas registradas pelos vendedores nos marketplaces selecionados antes de taxas."
    },
    {
      title: "Receita Líquida",
      value: fmtCurrency(activeRec),
      rawValue: activeRec,
      changePercent: growthRec,
      isPositive: growthRec > 0,
      microtext: `vs. período anterior`,
      tooltip: "Valor faturado após dedução das tarifas padrão dos marketplaces e cancelamentos."
    },
    {
      title: "Lucro Líquido dos Vendedores",
      value: fmtCurrency(activeLuc),
      rawValue: activeLuc,
      changePercent: growthLuc,
      isPositive: growthLuc > 0,
      microtext: `vs. período anterior`,
      tooltip: "Estimativa que sobra no bolso do vendedor. Descontados: custo do produto, taxas de marketplaces, comissões, frete pago, impostos e reembolsos. NÃO representa receita ou lucro da Lojafy."
    },
    {
      title: "Total de Pedidos",
      value: fmtNumber(activePed),
      rawValue: activePed,
      changePercent: growthPed,
      isPositive: growthPed > 0,
      microtext: `vs. período anterior`,
      tooltip: "Número de pedidos aprovados realizados nas contas dos vendedores."
    },
    {
      title: "Unidades Vendidas",
      value: fmtNumber(activeUni),
      rawValue: activeUni,
      changePercent: growthUni,
      isPositive: growthUni > 0,
      microtext: `vs. período anterior`,
      tooltip: "Quantidade total de itens físicos vendidos no período."
    },
    {
      title: "Ticket Médio",
      value: fmtCurrency(activeTicket),
      rawValue: activeTicket,
      changePercent: growthTicket,
      isPositive: growthTicket > 0,
      microtext: `vs. período anterior`,
      tooltip: "Valor médio faturado por pedido (Faturamento Bruto / Total de Pedidos)."
    },
    {
      title: "Vendedores Ativos",
      value: fmtNumber(activeVendedores),
      rawValue: activeVendedores,
      changePercent: filters.period === "hoje" ? 0 : 4.5,
      isPositive: true,
      microtext: `com vendas no período`,
      tooltip: "Total de vendedores únicos que registraram ao menos uma venda no período com os filtros aplicados."
    },
    {
      title: "Taxa de Cancelamento",
      value: `${rawCancel.toFixed(2)}%`,
      rawValue: rawCancel,
      changePercent: growthCancel,
      isPositive: growthCancel < 0,
      microtext: `vs. período anterior`,
      tooltip: "Percentual de pedidos que foram cancelados no período por reembolsos, recusas ou falta de estoque."
    }
  ];

  const baseMarketplaces: MarketplaceData[] = [
    {
      id: "mp_ml",
      name: "Mercado Livre",
      faturamentoBruto: 425340.00 * scale,
      receitaLiquida: 351700.00 * scale,
      lucroLiquidoVendedores: 110060.00 * scale,
      pedidos: Math.round(2664 * scale),
      unidadesVendidas: Math.round(3050 * scale),
      ticketMedio: 159.66,
      share: 45,
      taxaCancelamento: 2.1,
      crescimento: 15.4
    },
    {
      id: "mp_sh",
      name: "Shopee",
      faturamentoBruto: 330820.00 * scale,
      receitaLiquida: 273525.00 * scale,
      lucroLiquidoVendedores: 85600.00 * scale,
      pedidos: Math.round(2072 * scale),
      unidadesVendidas: Math.round(2373 * scale),
      ticketMedio: 159.66,
      share: 35,
      taxaCancelamento: 3.9,
      crescimento: 28.2
    },
    {
      id: "mp_am",
      name: "Amazon",
      faturamentoBruto: 113424.00 * scale,
      receitaLiquida: 93780.00 * scale,
      lucroLiquidoVendedores: 29350.00 * scale,
      pedidos: Math.round(710 * scale),
      unidadesVendidas: Math.round(814 * scale),
      ticketMedio: 159.75,
      share: 12,
      taxaCancelamento: 1.8,
      crescimento: 11.2
    },
    {
      id: "mp_lp",
      name: "Loja Própria",
      faturamentoBruto: 75616.00 * scale,
      receitaLiquida: 62495.00 * scale,
      lucroLiquidoVendedores: 19570.00 * scale,
      pedidos: Math.round(474 * scale),
      unidadesVendidas: Math.round(543 * scale),
      ticketMedio: 159.52,
      share: 8,
      taxaCancelamento: 1.0,
      crescimento: 5.6
    }
  ];

  let marketplaces = baseMarketplaces;
  if (filters.marketplace && filters.marketplace !== "all") {
    marketplaces = baseMarketplaces.filter(mp => 
      mp.name.toLowerCase().replace(" ", "") === filters.marketplace
    );
    if (marketplaces.length > 0) {
      marketplaces[0].share = 100;
    }
  }

  let sellersList = mockSellers.map(s => {
    const fat = s.faturamentoBruto * scale;
    const luc = s.lucroLiquidoVendedores * scale;
    const rec = s.receitaLiquida * scale;
    const ped = Math.max(1, Math.round(s.pedidos * scale));
    const uni = Math.max(1, Math.round(s.unidadesVendidas * scale));
    
    return {
      ...s,
      faturamentoBruto: fat,
      receitaLiquida: rec,
      lucroLiquidoVendedores: luc,
      margemLiquida: fat > 0 ? (luc / fat) * 100 : 0,
      pedidos: ped,
      unidadesVendidas: uni,
      ticketMedio: ped > 0 ? fat / ped : 0
    };
  });

  if (filters.marketplace && filters.marketplace !== "all") {
    const mpMap: { [key: string]: string } = {
      shopee: "Shopee",
      mercadolivre: "Mercado Livre",
      amazon: "Amazon",
      lojapropria: "Loja Própria"
    };
    const targetMp = mpMap[filters.marketplace];
    sellersList = sellersList.filter(s => s.marketplacePrincipal === targetMp);
  }

  sellersList.sort((a, b) => b.faturamentoBruto - a.faturamentoBruto);

  let productsList = mockProducts.map(p => {
    const fat = p.faturamentoBruto * scale;
    const luc = p.lucroLiquidoGerado * scale;
    const ped = Math.max(1, Math.round(p.pedidos * scale));
    const uni = Math.max(1, Math.round(p.unidadesVendidas * scale));
    
    return {
      ...p,
      faturamentoBruto: fat,
      lucroLiquidoGerado: luc,
      pedidos: ped,
      unidadesVendidas: uni,
      ticketMedio: ped > 0 ? fat / ped : 0
    };
  });

  if (filters.marketplace && filters.marketplace !== "all") {
    const mpMap: { [key: string]: string } = {
      shopee: "Shopee",
      mercadolivre: "Mercado Livre",
      amazon: "Amazon",
      lojapropria: "Loja Própria"
    };
    const targetMp = mpMap[filters.marketplace];
    productsList = productsList.filter(p => p.marketplacePrincipal === targetMp);
  }

  return {
    kpis,
    chartData: getChartData(filters.period),
    marketplaces,
    sellers: sellersList,
    products: productsList,
    activities: mockActivities,
    labelPeriod
  };
};
