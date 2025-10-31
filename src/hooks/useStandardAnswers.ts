import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface StandardAnswer {
  id: string;
  name: string;
  answer: string;
  button_text?: string;
  button_link?: string;
  related_course_id?: string;
  related_module_id?: string;
  related_lesson_id?: string;
  keywords: string[];
  usage_count: number;
  active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export const useStandardAnswers = () => {
  const [standardAnswers, setStandardAnswers] = useState<StandardAnswer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStandardAnswers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ai_standard_answers')
        .select('*')
        .order('usage_count', { ascending: false });

      if (error) throw error;
      setStandardAnswers(data || []);
    } catch (error) {
      console.error('Erro ao carregar respostas padrão:', error);
      toast.error('Erro ao carregar respostas padrão');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStandardAnswers();
  }, []);

  const createStandardAnswer = async (answer: Omit<StandardAnswer, 'id' | 'created_at' | 'updated_at' | 'usage_count'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('ai_standard_answers')
        .insert({
          ...answer,
          created_by: user?.id,
          usage_count: 0
        });

      if (error) throw error;
      toast.success('Resposta padrão criada com sucesso');
      await fetchStandardAnswers();
    } catch (error: any) {
      console.error('Erro ao criar resposta padrão:', error);
      if (error.code === '23505') {
        toast.error('Já existe uma resposta padrão com este nome');
      } else {
        toast.error('Erro ao criar resposta padrão');
      }
      throw error;
    }
  };

  const updateStandardAnswer = async (id: string, updates: Partial<StandardAnswer>) => {
    try {
      const { error } = await supabase
        .from('ai_standard_answers')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      toast.success('Resposta padrão atualizada com sucesso');
      await fetchStandardAnswers();
    } catch (error: any) {
      console.error('Erro ao atualizar resposta padrão:', error);
      if (error.code === '23505') {
        toast.error('Já existe uma resposta padrão com este nome');
      } else {
        toast.error('Erro ao atualizar resposta padrão');
      }
      throw error;
    }
  };

  const deleteStandardAnswer = async (id: string) => {
    try {
      // Check if it's being used
      const { data: usageData } = await supabase
        .from('ai_pending_questions')
        .select('id')
        .eq('standard_answer_id', id)
        .limit(1);

      if (usageData && usageData.length > 0) {
        const confirmDelete = confirm(
          'Esta resposta padrão está sendo usada em perguntas. Ao excluí-la, as perguntas manterão suas respostas atuais mas não estarão mais vinculadas. Deseja continuar?'
        );
        if (!confirmDelete) return;
      }

      const { error } = await supabase
        .from('ai_standard_answers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Resposta padrão excluída com sucesso');
      await fetchStandardAnswers();
    } catch (error) {
      console.error('Erro ao excluir resposta padrão:', error);
      toast.error('Erro ao excluir resposta padrão');
      throw error;
    }
  };

  const incrementUsageCount = async (id: string) => {
    try {
      const answer = standardAnswers.find(a => a.id === id);
      if (answer) {
        await updateStandardAnswer(id, { usage_count: answer.usage_count + 1 });
      }
    } catch (error) {
      console.error('Erro ao incrementar contador de uso:', error);
    }
  };

  return {
    standardAnswers,
    loading,
    createStandardAnswer,
    updateStandardAnswer,
    deleteStandardAnswer,
    incrementUsageCount,
    refetch: fetchStandardAnswers
  };
};
