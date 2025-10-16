import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface KnowledgeBaseItem {
  id: string;
  category: 'faq' | 'policy' | 'product_info' | 'general';
  title: string;
  content: string;
  keywords: string[];
  priority: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface AIConfig {
  id: string;
  platform_context: string;
  ai_tone: string;
  max_response_length: number;
  escalation_keywords: string[];
  created_at: string;
  updated_at: string;
}

export const useKnowledgeBase = () => {
  const [knowledge, setKnowledge] = useState<KnowledgeBaseItem[]>([]);
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [knowledgeResult, configResult] = await Promise.all([
        supabase
          .from('ai_knowledge_base')
          .select('*')
          .order('priority', { ascending: false }),
        supabase
          .from('ai_support_config')
          .select('*')
          .single()
      ]);

      if (knowledgeResult.error) throw knowledgeResult.error;
      if (configResult.error) throw configResult.error;

      setKnowledge(knowledgeResult.data || []);
      setConfig(configResult.data);
    } catch (error) {
      console.error('Erro ao carregar base de conhecimento:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const createKnowledge = async (item: Omit<KnowledgeBaseItem, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
    try {
      const { error } = await supabase
        .from('ai_knowledge_base')
        .insert(item);

      if (error) throw error;

      toast.success('Item adicionado à base de conhecimento');
      fetchData();
    } catch (error) {
      console.error('Erro ao criar item:', error);
      toast.error('Erro ao adicionar item');
    }
  };

  const updateKnowledge = async (id: string, updates: Partial<KnowledgeBaseItem>) => {
    try {
      const { error } = await supabase
        .from('ai_knowledge_base')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast.success('Item atualizado');
      fetchData();
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      toast.error('Erro ao atualizar item');
    }
  };

  const deleteKnowledge = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ai_knowledge_base')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Item removido');
      fetchData();
    } catch (error) {
      console.error('Erro ao remover item:', error);
      toast.error('Erro ao remover item');
    }
  };

  const updateConfig = async (updates: Partial<AIConfig>) => {
    if (!config) return;

    try {
      const { error } = await supabase
        .from('ai_support_config')
        .update(updates)
        .eq('id', config.id);

      if (error) throw error;

      toast.success('Configuração atualizada');
      fetchData();
    } catch (error) {
      console.error('Erro ao atualizar configuração:', error);
      toast.error('Erro ao atualizar configuração');
    }
  };

  return {
    knowledge,
    config,
    loading,
    createKnowledge,
    updateKnowledge,
    deleteKnowledge,
    updateConfig,
    refetch: fetchData
  };
};
