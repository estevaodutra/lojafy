import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { executeWeeklyRankingUpdate, WeeklyUpdateConfig } from '@/services/topProductsService';

/**
 * Hook para verificar em background se a atualização semanal do ranking
 * de produtos está pendente (> 7 dias desde a última execução).
 * Executado quando um administrador está ativo na plataforma.
 */
export const useTopProductsScheduler = () => {
  useEffect(() => {
    let isCancelled = false;

    const checkAndRunWeeklyUpdate = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) return;

        // Busca a feature de top produtos
        const { data: feature, error } = await supabase
          .from('features')
          .select('id, slug, metadata')
          .eq('slug', 'top_10_produtos')
          .maybeSingle();

        if (error || !feature) return;

        const config: WeeklyUpdateConfig = feature.metadata?.top_ranking_config;
        if (!config || !config.auto_update_weekly) return;

        const lastUpdated = config.last_updated_at
          ? new Date(config.last_updated_at).getTime()
          : 0;

        const now = Date.now();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

        // Se nunca rodou ou já passaram 7 dias desde a última execução
        if (now - lastUpdated >= sevenDaysMs && !isCancelled) {
          console.log('🔄 Executando atualização semanal automática de top produtos...');
          await executeWeeklyRankingUpdate({
            featureId: feature.id,
            limit: config.limit || 10,
            notify: config.notify_on_update ?? true,
          });
          console.log('✅ Atualização semanal automática de top produtos concluída!');
        }
      } catch (err) {
        console.warn('Verificação de agendamento do ranking concluída com aviso:', err);
      }
    };

    // Executa verificação inicial após 5 segundos da montagem para não atrasar renderização inicial
    const timeout = setTimeout(() => {
      checkAndRunWeeklyUpdate();
    }, 5000);

    return () => {
      isCancelled = true;
      clearTimeout(timeout);
    };
  }, []);
};
