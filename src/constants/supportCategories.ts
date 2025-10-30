import { 
  ShoppingBag, 
  Package, 
  CreditCard, 
  Box, 
  RefreshCw, 
  User, 
  GraduationCap, 
  DollarSign, 
  Settings, 
  HelpCircle,
  Handshake,
  Truck,
  LucideIcon
} from 'lucide-react';

export interface SupportCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  description: string;
}

export const SUPPORT_CATEGORIES: SupportCategory[] = [
  {
    id: 'pedidos',
    label: 'Pedidos',
    icon: ShoppingBag,
    color: 'hsl(var(--primary))',
    description: 'Dúvidas sobre status, cancelamento, alteração de pedidos'
  },
  {
    id: 'entrega',
    label: 'Entrega',
    icon: Package,
    color: 'hsl(var(--chart-1))',
    description: 'Rastreamento, prazo, problemas com frete'
  },
  {
    id: 'pagamento',
    label: 'Pagamento',
    icon: CreditCard,
    color: 'hsl(var(--chart-2))',
    description: 'Problemas com pagamento, estorno, Pix'
  },
  {
    id: 'produtos',
    label: 'Produtos',
    icon: Box,
    color: 'hsl(var(--chart-3))',
    description: 'Informações sobre produtos, disponibilidade, especificações'
  },
  {
    id: 'trocas',
    label: 'Trocas e Devoluções',
    icon: RefreshCw,
    color: 'hsl(var(--chart-4))',
    description: 'Política de troca, devolução, garantia'
  },
  {
    id: 'conta',
    label: 'Conta',
    icon: User,
    color: 'hsl(var(--chart-5))',
    description: 'Login, cadastro, dados pessoais'
  },
  {
    id: 'academia',
    label: 'Academia',
    icon: GraduationCap,
    color: 'hsl(var(--accent))',
    description: 'Cursos, aulas, acesso a conteúdo'
  },
  {
    id: 'comissoes',
    label: 'Comissões',
    icon: DollarSign,
    color: 'hsl(var(--success))',
    description: 'Revendedores - comissões, vendas, repasses'
  },
  {
    id: 'parceria',
    label: 'Parceria',
    icon: Handshake,
    color: 'hsl(var(--success))',
    description: 'Informações sobre como se tornar parceiro/revendedor'
  },
  {
    id: 'fornecedor',
    label: 'Fornecedor',
    icon: Truck,
    color: 'hsl(var(--warning))',
    description: 'Dúvidas sobre fornecimento de produtos'
  },
  {
    id: 'tecnico',
    label: 'Técnico',
    icon: Settings,
    color: 'hsl(var(--destructive))',
    description: 'Problemas técnicos, bugs, erros no site'
  },
  {
    id: 'outros',
    label: 'Outros',
    icon: HelpCircle,
    color: 'hsl(var(--muted-foreground))',
    description: 'Assuntos gerais'
  }
];

export const getCategoryById = (id: string): SupportCategory | undefined => {
  return SUPPORT_CATEGORIES.find(cat => cat.id === id);
};

export const getCategoryByKeywords = (text: string): SupportCategory => {
  const lowerText = text.toLowerCase();
  
  // Pedidos
  if (lowerText.match(/pedido|compra|order|status.*pedido|cancelar.*pedido/)) {
    return SUPPORT_CATEGORIES[0];
  }
  
  // Entrega
  if (lowerText.match(/entrega|rastreio|frete|prazo|transportadora|correios/)) {
    return SUPPORT_CATEGORIES[1];
  }
  
  // Pagamento
  if (lowerText.match(/pagamento|pagar|pix|cartão|estorno|boleto|cobrança/)) {
    return SUPPORT_CATEGORIES[2];
  }
  
  // Produtos
  if (lowerText.match(/produto|item|estoque|disponível|especificação/)) {
    return SUPPORT_CATEGORIES[3];
  }
  
  // Trocas
  if (lowerText.match(/troca|devolução|devolver|garantia|defeito/)) {
    return SUPPORT_CATEGORIES[4];
  }
  
  // Conta
  if (lowerText.match(/conta|login|senha|cadastro|dados.*pessoais|perfil/)) {
    return SUPPORT_CATEGORIES[5];
  }
  
  // Academia
  if (lowerText.match(/academia|curso|aula|vídeo|conteúdo.*educativo/)) {
    return SUPPORT_CATEGORIES[6];
  }
  
  // Comissões
  if (lowerText.match(/comissão|comissões|repasse|vendas.*revendedor|ganhos/)) {
    return SUPPORT_CATEGORIES[7];
  }
  
  // Parceria
  if (lowerText.match(/parceria|parceiro|revendedor|revenda|como.*vender/)) {
    return SUPPORT_CATEGORIES[8];
  }
  
  // Fornecedor
  if (lowerText.match(/fornecedor|fornecimento|fornecer|estoque.*próprio|enviar.*produtos/)) {
    return SUPPORT_CATEGORIES[9];
  }
  
  // Técnico
  if (lowerText.match(/erro|bug|problema.*técnico|não.*funciona|travando/)) {
    return SUPPORT_CATEGORIES[10];
  }
  
  // Outros (padrão)
  return SUPPORT_CATEGORIES[11];
};
