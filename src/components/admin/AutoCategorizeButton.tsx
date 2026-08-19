import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export function AutoCategorizeButton() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleCategorize = async () => {
    setLoading(true);
    toast({ title: 'Iniciando categorização automática...' });

    try {
      const { data: products, error: fetchErr } = await supabase
        .from('products')
        .select('id, name')
        .is('category_id', null);

      if (fetchErr) throw fetchErr;

      if (!products || products.length === 0) {
        toast({ title: 'Todos os produtos já estão categorizados!' });
        setLoading(false);
        return;
      }

      // Predefined broad categories
      const broadCategories = ['Saúde e Beleza', 'Casa e Cozinha', 'Eletrônicos', 'Moda e Acessórios', 'Geral'];
      
      const { data: existingCats } = await supabase.from('categories').select('id, name');
      
      const catMap = new Map();
      
      // Ensure all broad categories exist
      for (const catName of broadCategories) {
        let cat = existingCats?.find(c => c.name.toLowerCase() === catName.toLowerCase());
        if (!cat) {
          const { data: newCat } = await supabase.from('categories').insert({
            name: catName,
            slug: catName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
          }).select('id, name').single();
          if (newCat) cat = newCat;
        }
        if (cat) catMap.set(catName, cat.id);
      }

      let updatedCount = 0;

      // Simple heuristic categorizer
      for (const p of products) {
        const name = p.name.toLowerCase();
        let targetCat = 'Geral';

        if (name.includes('escova') || name.includes('maquiagem') || name.includes('secador') || name.includes('pele') || name.includes('cabelo') || name.includes('beleza') || name.includes('saúde') || name.includes('massagem') || name.includes('massageador')) {
          targetCat = 'Saúde e Beleza';
        } else if (name.includes('panela') || name.includes('copo') || name.includes('mesa') || name.includes('cozinha') || name.includes('limpeza') || name.includes('vassoura') || name.includes('rodo') || name.includes('sala') || name.includes('tapete') || name.includes('casa')) {
          targetCat = 'Casa e Cozinha';
        } else if (name.includes('fone') || name.includes('carregador') || name.includes('smart') || name.includes('tv') || name.includes('cabo') || name.includes('mouse') || name.includes('teclado') || name.includes('usb') || name.includes('eletrônico')) {
          targetCat = 'Eletrônicos';
        } else if (name.includes('camisa') || name.includes('calça') || name.includes('tênis') || name.includes('relógio') || name.includes('bolsa') || name.includes('mochila') || name.includes('vestido') || name.includes('moda') || name.includes('óculos')) {
          targetCat = 'Moda e Acessórios';
        }

        const catId = catMap.get(targetCat);
        if (catId) {
          await supabase.from('products').update({ category_id: catId }).eq('id', p.id);
          updatedCount++;
        }
      }

      toast({
        title: 'Categorização concluída!',
        description: `${updatedCount} produtos foram categorizados com sucesso.`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    } catch (error: any) {
      toast({ title: 'Erro ao categorizar', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleCategorize} disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white">
      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
      Auto Categorizar ({loading ? '...' : 'Magia'})
    </Button>
  );
}
