import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AboutContent {
  story?: string;
  mission?: string;
  vision?: string;
  values?: Array<{ title: string; description: string }>;
  team?: Array<{ name: string; role: string; description: string }>;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  active: boolean;
}

export interface FAQContent {
  faqs: FAQItem[];
}

export const DEFAULT_FAQS: FAQItem[] = [
  {
    id: '1',
    question: 'Como faço para rastrear meu pedido?',
    answer: 'Você pode rastrear seu pedido através da página "Rastrear Pedido" usando o número do pedido enviado por e-mail. Entre em contato conosco pelo telefone {PHONE} ou WhatsApp {WHATSAPP} para mais informações.',
    category: 'pedidos',
    active: true
  },
  {
    id: '2',
    question: 'Qual é o prazo de entrega?',
    answer: 'O prazo de entrega varia conforme sua localização e o método de envio escolhido. Geralmente, entregas são feitas em 7 a 15 dias úteis. Para informações específicas, consulte o rastreamento do pedido ou entre em contato conosco.',
    category: 'entrega',
    active: true
  },
  {
    id: '3',
    question: 'Quais são as formas de pagamento aceitas?',
    answer: 'Aceitamos diversas formas de pagamento incluindo cartões de crédito, débito e PIX. Todas as transações são seguras e protegidas.',
    category: 'pagamento',
    active: true
  },
  {
    id: '4',
    question: 'Como funciona a política de troca e devolução?',
    answer: 'Você tem até 7 dias após o recebimento para solicitar troca ou devolução, conforme o Código de Defesa do Consumidor. O produto deve estar em perfeito estado. Consulte nossa página de Política de Troca para mais detalhes.',
    category: 'troca',
    active: true
  },
  {
    id: '5',
    question: 'Os produtos têm garantia?',
    answer: 'Sim! Todos os nossos produtos possuem garantia do fabricante. O prazo varia de acordo com o produto. Entre em contato para informações específicas.',
    category: 'produtos',
    active: true
  },
  {
    id: '6',
    question: 'Como entro em contato com o suporte?',
    answer: 'Você pode entrar em contato através do telefone {PHONE}, WhatsApp {WHATSAPP}, ou e-mail {EMAIL}. Estamos sempre prontos para ajudar!',
    category: 'produtos',
    active: true
  },
  {
    id: '7',
    question: 'Posso cancelar meu pedido?',
    answer: 'Sim, você pode cancelar seu pedido antes do envio. Entre em contato conosco o mais rápido possível pelo telefone {PHONE} ou WhatsApp {WHATSAPP}.',
    category: 'pedidos',
    active: true
  },
  {
    id: '8',
    question: 'Há frete grátis?',
    answer: 'Sim! Oferecemos frete grátis para pedidos acima de um valor mínimo. Consulte as condições na página do produto ou durante o checkout.',
    category: 'entrega',
    active: true
  }
];

export const DEFAULT_ABOUT: AboutContent = {
  story: 'Nossa loja nasceu da paixão por oferecer produtos de qualidade com o melhor atendimento. Estamos comprometidos em proporcionar uma experiência de compra excepcional para nossos clientes.',
  mission: 'Nossa missão é conectar pessoas aos melhores produtos, oferecendo qualidade, variedade e atendimento diferenciado.',
  vision: 'Ser referência em excelência no atendimento e na qualidade dos produtos oferecidos.',
  values: [
    {
      title: 'Qualidade',
      description: 'Trabalhamos apenas com produtos de alta qualidade e fornecedores confiáveis.'
    },
    {
      title: 'Compromisso',
      description: 'Compromisso com a satisfação e confiança de nossos clientes.'
    },
    {
      title: 'Transparência',
      description: 'Relacionamento transparente e honesto com nossos clientes.'
    },
    {
      title: 'Inovação',
      description: 'Buscamos constantemente melhorar e inovar em nossos serviços.'
    }
  ],
  team: []
};

export const useResellerPages = (resellerId?: string) => {
  const { user } = useAuth();
  const [aboutContent, setAboutContent] = useState<AboutContent | null>(null);
  const [faqContent, setFAQContent] = useState<FAQContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveResellerId = resellerId || user?.id;

  useEffect(() => {
    if (effectiveResellerId) {
      fetchPages();
    }
  }, [effectiveResellerId]);

  const fetchPages = async () => {
    if (!effectiveResellerId) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('reseller_store_pages')
        .select('*')
        .eq('reseller_id', effectiveResellerId);

      if (fetchError) throw fetchError;

      const aboutPage = data?.find(p => p.page_type === 'about');
      const faqPage = data?.find(p => p.page_type === 'faq');

      setAboutContent((aboutPage?.content as any) || DEFAULT_ABOUT);
      setFAQContent((faqPage?.content as any) || { faqs: DEFAULT_FAQS });
    } catch (err: any) {
      console.error('Error fetching reseller pages:', err);
      setError(err.message);
      // Set defaults on error
      setAboutContent(DEFAULT_ABOUT);
      setFAQContent({ faqs: DEFAULT_FAQS });
    } finally {
      setIsLoading(false);
    }
  };

  const saveAboutContent = async (content: AboutContent) => {
    if (!effectiveResellerId) {
      setError('Reseller ID not available');
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { error: upsertError } = await supabase
        .from('reseller_store_pages')
        .upsert({
          reseller_id: effectiveResellerId,
          page_type: 'about',
          content: content as any,
          active: true
        }, {
          onConflict: 'reseller_id,page_type'
        });

      if (upsertError) throw upsertError;

      setAboutContent(content);
      return true;
    } catch (err: any) {
      console.error('Error saving about content:', err);
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const saveFAQContent = async (content: FAQContent) => {
    if (!effectiveResellerId) {
      setError('Reseller ID not available');
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { error: upsertError } = await supabase
        .from('reseller_store_pages')
        .upsert({
          reseller_id: effectiveResellerId,
          page_type: 'faq',
          content: content as any,
          active: true
        }, {
          onConflict: 'reseller_id,page_type'
        });

      if (upsertError) throw upsertError;

      setFAQContent(content);
      return true;
    } catch (err: any) {
      console.error('Error saving FAQ content:', err);
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    aboutContent,
    faqContent,
    isLoading,
    error,
    saveAboutContent,
    saveFAQContent,
    refreshPages: fetchPages
  };
};
