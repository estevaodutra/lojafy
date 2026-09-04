import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export const OFFICIAL_MACRO_CATEGORIES = [
  { name: 'Saúde e Beleza', slug: 'saude-e-beleza' },
  { name: 'Eletrônicos e Informática', slug: 'eletronicos-e-informatica' },
  { name: 'Casa e Utilidades Domésticas', slug: 'casa-e-utilidades-domesticas' },
  { name: 'Moda e Joias', slug: 'moda-e-joias' },
  { name: 'Infantil e Brinquedos', slug: 'infantil-e-brinquedos' },
  { name: 'Esportes, Lazer e Ferramentas', slug: 'esportes-lazer-e-ferramentas' },
];

export function categorizeProductName(name: string): string {
  const n = (name || '').toLowerCase();
  
  if (
    n.includes('infantil') || n.includes('bebê') || n.includes('bebe') ||
    n.includes('brinquedo') || n.includes('carrinho') || n.includes('squish') ||
    n.includes('mcqueen') || n.includes('carros 3') || n.includes('veículos sem controle')
  ) {
    return 'Infantil e Brinquedos';
  }

  if (
    n.includes('cordão') || n.includes('cordao') || n.includes('corrente') ||
    n.includes('ouro') || n.includes('banhad') || n.includes('pingente') ||
    n.includes('escudo') || n.includes('visujóias') || n.includes('visujoias') ||
    n.includes('cadeado') || n.includes('baiano') || n.includes('moda') ||
    n.includes('bolsa') || n.includes('mochila') || n.includes('relógio') ||
    n.includes('relogio') || n.includes('óculos') || n.includes('oculos')
  ) {
    return 'Moda e Joias';
  }

  if (
    n.includes('wifi') || n.includes('usb') || n.includes('memória') ||
    n.includes('memoria') || n.includes('sd') || n.includes('microsd') ||
    n.includes('rasptech') || n.includes('altomex') || n.includes('a\'gold') ||
    n.includes('agold') || n.includes('placa de rede') || n.includes('placas de rede') ||
    n.includes('fone') || n.includes('carregador') || n.includes('cabo') ||
    n.includes('mouse') || n.includes('teclado') || n.includes('eletrônico') ||
    n.includes('eletronico') || n.includes('eletrônicos')
  ) {
    return 'Eletrônicos e Informática';
  }

  if (
    n.includes('lenço') || n.includes('lenco') || n.includes('desentupidor') ||
    n.includes('ralo') || n.includes('pia') || n.includes('limpador') ||
    n.includes('rodo') || n.includes('vidro') || n.includes('blindex') ||
    n.includes('fita') || n.includes('selante') || n.includes('tesoura') ||
    n.includes('frasco') || n.includes('garrafa') || n.includes('cozinha') ||
    n.includes('mancha') || n.includes('utilidade') || n.includes('panela') ||
    n.includes('casa') || n.includes('remendos') || n.includes('limpa-vidro')
  ) {
    return 'Casa e Utilidades Domésticas';
  }

  if (
    n.includes('baralho') || n.includes('uno') || n.includes('copag') ||
    n.includes('canivete') || n.includes('faca') || n.includes('tática') ||
    n.includes('tatica') || n.includes('chaveiro') || n.includes('jogo') ||
    n.includes('defesa pessoal') || n.includes('ferramenta')
  ) {
    return 'Esportes, Lazer e Ferramentas';
  }

  return 'Saúde e Beleza';
}

export function AutoCategorizeButton({ label = 'Organizar & Categorizar Produtos', className = '' }: { label?: string; className?: string }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleCategorize = async () => {
    setLoading(true);
    toast({ title: '🔄 Reorganizando e limpando catálogo de categorias...' });

    try {
      // 1. Buscar todas as categorias existentes
      const { data: existingCats, error: catFetchErr } = await supabase
        .from('categories')
        .select('id, name, slug');

      if (catFetchErr) throw catFetchErr;

      // 2. Garantir que as 6 Macro Categorias Oficiais existam no banco
      const macroCatMap = new Map<string, string>();

      for (const macro of OFFICIAL_MACRO_CATEGORIES) {
        let cat = existingCats?.find(c => c.name.toLowerCase() === macro.name.toLowerCase());
        if (!cat) {
          const { data: newCat, error: insertErr } = await supabase
            .from('categories')
            .insert({
              name: macro.name,
              slug: macro.slug,
              active: true
            })
            .select('id, name')
            .single();

          if (!insertErr && newCat) {
            cat = newCat;
          }
        }
        if (cat) {
          macroCatMap.set(macro.name, cat.id);
        }
      }

      // 3. Buscar TODOS os produtos no banco de dados
      const { data: products, error: prodErr } = await supabase
        .from('products')
        .select('id, name, category_id');

      if (prodErr) throw prodErr;

      let updatedCount = 0;

      if (products && products.length > 0) {
        for (const p of products) {
          const targetMacroName = categorizeProductName(p.name);
          const targetMacroId = macroCatMap.get(targetMacroName);

          if (targetMacroId && p.category_id !== targetMacroId) {
            await supabase
              .from('products')
              .update({ category_id: targetMacroId })
              .eq('id', p.id);

            updatedCount++;
          }
        }
      }

      // 4. Limpar categorias "sujas" (categorias que são nomes de produtos e não pertencem às 6 Macro Categorias)
      const officialNamesLower = OFFICIAL_MACRO_CATEGORIES.map(m => m.name.toLowerCase());
      const dirtyCats = (existingCats || []).filter(c => !officialNamesLower.includes(c.name.toLowerCase()));

      let deletedCatsCount = 0;
      for (const dirty of dirtyCats) {
        // Reatribuir qualquer produto residual que ainda aponte para essa categoria suja
        const targetMacroName = categorizeProductName(dirty.name);
        const targetMacroId = macroCatMap.get(targetMacroName);

        if (targetMacroId) {
          await supabase
            .from('products')
            .update({ category_id: targetMacroId })
            .eq('category_id', dirty.id);
        }

        // Deletar a categoria suja
        const { error: deleteErr } = await supabase
          .from('categories')
          .delete()
          .eq('id', dirty.id);

        if (!deleteErr) {
          deletedCatsCount++;
        }
      }

      toast({
        title: '🎉 Categorização e Limpeza Concluídas!',
        description: `${updatedCount} produto(s) re-categorizados e ${deletedCatsCount} categoria(s) sujas/inválidas removidas com sucesso.`,
      });

      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['admin-categories-with-counts'] });
      queryClient.invalidateQueries({ queryKey: ['meta-ads-categories'] });
    } catch (error: any) {
      console.error('Erro na reorganização de categorias:', error);
      toast({ title: 'Erro ao reorganizar categorias', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCategorize}
      disabled={loading}
      className={`bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold shadow gap-2 ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Reorganizando catálogo...
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4 text-amber-300" />
          {label}
        </>
      )}
    </Button>
  );
}
