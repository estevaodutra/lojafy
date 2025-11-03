import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AICorrection {
  ticketId: string;
  messageId: string;
  customerQuestion: string;
  aiResponse: string;
  correctResponse: string;
  keywords: string[];
  createStandardAnswer?: boolean;
  standardAnswerName?: string;
  updateStandardAnswerId?: string;
  addToKnowledgeBase?: boolean;
  knowledgeBaseTitle?: string;
  knowledgeBaseCategory?: string;
}

export const useAICorrections = () => {
  const [saving, setSaving] = useState(false);

  const saveCorrection = async (data: AICorrection) => {
    setSaving(true);
    try {
      // Validações iniciais
      if (!data.correctResponse?.trim()) {
        toast.error('Resposta corrigida é obrigatória');
        return false;
      }

      if (data.createStandardAnswer && !data.standardAnswerName?.trim()) {
        toast.error('Nome da resposta padrão é obrigatório');
        return false;
      }

      if (data.updateStandardAnswerId && !data.updateStandardAnswerId.trim()) {
        toast.error('ID da resposta padrão para atualizar é obrigatório');
        return false;
      }

      if (data.addToKnowledgeBase && (!data.knowledgeBaseTitle?.trim() || !data.knowledgeBaseCategory?.trim())) {
        toast.error('Título e categoria da base de conhecimento são obrigatórios');
        return false;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return false;
      }

      let createdStandardAnswerId = null;
      let createdKnowledgeId = null;

      // 1. Criar resposta padrão se solicitado
      if (data.createStandardAnswer && data.standardAnswerName) {
        const { data: standardAnswer, error: saError } = await supabase
          .from('ai_standard_answers')
          .insert({
            name: data.standardAnswerName,
            answer: data.correctResponse,
            keywords: data.keywords,
            active: true,
            auto_trigger: false,
            created_by: user.id
          })
          .select()
          .single();

        if (saError) throw saError;
        createdStandardAnswerId = standardAnswer.id;
        toast.success('Resposta padrão criada com sucesso!');
      }

      // 2. Atualizar resposta padrão existente se solicitado
      if (data.updateStandardAnswerId) {
        const { error: updateError } = await supabase
          .from('ai_standard_answers')
          .update({
            answer: data.correctResponse,
            keywords: data.keywords,
            updated_at: new Date().toISOString()
          })
          .eq('id', data.updateStandardAnswerId);

        if (updateError) throw updateError;
        toast.success('Resposta padrão atualizada!');
      }

      // 3. Adicionar à base de conhecimento se solicitado
      if (data.addToKnowledgeBase && data.knowledgeBaseTitle && data.knowledgeBaseCategory) {
        const { data: knowledge, error: kbError } = await supabase
          .from('ai_knowledge_base')
          .insert({
            category: data.knowledgeBaseCategory as any,
            title: data.knowledgeBaseTitle,
            content: data.correctResponse,
            keywords: data.keywords,
            active: true
          })
          .select()
          .single();

        if (kbError) throw kbError;
        createdKnowledgeId = knowledge.id;
        toast.success('Adicionado à base de conhecimento!');
      }

      // 4. Salvar correção
      const { error: correctionError } = await supabase
        .from('ai_corrections')
        .insert({
          ticket_id: data.ticketId,
          original_message_id: data.messageId,
          customer_question: data.customerQuestion,
          ai_response: data.aiResponse,
          correct_response: data.correctResponse,
          corrected_by: user.id,
          created_standard_answer_id: createdStandardAnswerId,
          created_knowledge_id: createdKnowledgeId,
          keywords: data.keywords
        });

      if (correctionError) throw correctionError;

      // 5. Enviar mensagem corrigida ao cliente
      const { error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          ticket_id: data.ticketId,
          sender_type: 'admin',
          sender_id: user.id,
          content: data.correctResponse,
          is_internal: false
        });

      if (messageError) throw messageError;

      // 6. Atualizar ticket
      await supabase
        .from('support_tickets')
        .update({
          last_message: data.correctResponse.substring(0, 100),
          updated_at: new Date().toISOString()
        })
        .eq('id', data.ticketId);

      toast.success('Correção salva e resposta enviada ao cliente!');
      return true;
    } catch (error: any) {
      console.error('Error saving correction:', error);
      
      // Mensagens de erro mais específicas
      if (error?.code === '23503') {
        toast.error('Erro de referência: verifique se todos os IDs são válidos');
      } else if (error?.code === '23505') {
        toast.error('Esta correção já existe');
      } else if (error?.message) {
        toast.error(`Erro ao salvar: ${error.message}`);
      } else {
        toast.error('Erro ao salvar correção');
      }
      
      return false;
    } finally {
      setSaving(false);
    }
  };

  const fetchCorrections = async (ticketId: string) => {
    const { data, error } = await supabase
      .from('ai_corrections')
      .select(`
        *,
        profiles!corrected_by(first_name, last_name)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching corrections:', error);
      return [];
    }

    return data || [];
  };

  return { saveCorrection, fetchCorrections, saving };
};
