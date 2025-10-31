import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PendingQuestion {
  id: string;
  question: string;
  answer: string | null;
  status: 'pending' | 'answered';
  asked_count: number;
  similar_questions: any[];
  first_asked_at: string;
  answered_at: string | null;
  answered_by: string | null;
  last_asked_at: string;
  ticket_id: string | null;
  user_role: string | null;
  keywords: string[];
  created_at: string;
  updated_at: string;
  related_lesson_id: string | null;
  related_module_id: string | null;
  related_course_id: string | null;
}

export const usePendingQuestions = () => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<PendingQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ai_pending_questions')
        .select('*')
        .order('asked_count', { ascending: false });

      if (error) throw error;
      setQuestions((data as PendingQuestion[]) || []);
    } catch (error) {
      console.error('Error fetching pending questions:', error);
      toast.error('Erro ao carregar perguntas pendentes');
    } finally {
      setLoading(false);
    }
  };

  const answerQuestion = async (
    id: string, 
    answer: string, 
    relatedContent?: { type: 'course' | 'module' | 'lesson'; id: string }
  ) => {
    try {
      const question = questions.find(q => q.id === id);
      if (!question) return;

      // Determinar qual campo preencher
      const updateData: any = {
        answer,
        status: 'answered',
        answered_at: new Date().toISOString(),
        answered_by: user?.id,
        related_course_id: null,
        related_module_id: null,
        related_lesson_id: null,
      };

      if (relatedContent) {
        if (relatedContent.type === 'course') {
          updateData.related_course_id = relatedContent.id;
        } else if (relatedContent.type === 'module') {
          updateData.related_module_id = relatedContent.id;
        } else if (relatedContent.type === 'lesson') {
          updateData.related_lesson_id = relatedContent.id;
        }
      }

      // 1. Atualizar pergunta pendente
      const { error: updateError } = await supabase
        .from('ai_pending_questions')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      // 2. Copiar para base de conhecimento
      const { error: kbError } = await supabase
        .from('ai_knowledge_base')
        .insert({
          category: 'faq',
          target_audience: 'all',
          title: question.question,
          content: answer,
          keywords: question.keywords,
          priority: Math.min(10, question.asked_count),
          active: true,
          created_by: user?.id,
          related_course_id: updateData.related_course_id,
          related_module_id: updateData.related_module_id,
          related_lesson_id: updateData.related_lesson_id,
        });

      if (kbError) throw kbError;

      toast.success('Resposta registrada com conteúdo relacionado!');
      await fetchQuestions();
    } catch (error) {
      console.error('Error answering question:', error);
      toast.error('Erro ao salvar resposta');
    }
  };

  const deleteQuestion = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ai_pending_questions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Pergunta removida');
      await fetchQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Erro ao remover pergunta');
    }
  };

  useEffect(() => {
    fetchQuestions();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('pending_questions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_pending_questions'
        },
        () => {
          fetchQuestions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    questions,
    loading,
    answerQuestion,
    deleteQuestion,
    refetch: fetchQuestions
  };
};
