import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticketId, message, userId } = await req.json();
    
    console.log('AI Support Chat - Request:', { ticketId, userId, messageLength: message?.length });

    if (!ticketId || !message) {
      throw new Error('ticketId e message são obrigatórios');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Salvar mensagem do cliente
    const { error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        ticket_id: ticketId,
        sender_type: 'customer',
        sender_id: userId || null,
        content: message
      });

    if (insertError) {
      console.error('Erro ao salvar mensagem:', insertError);
      throw insertError;
    }

    // 2. Buscar contexto da base de conhecimento e configuração
    const [knowledgeResult, configResult, userOrdersResult] = await Promise.all([
      supabase
        .from('ai_knowledge_base')
        .select('*')
        .eq('active', true)
        .order('priority', { ascending: false }),
      supabase
        .from('ai_support_config')
        .select('*')
        .single(),
      userId ? supabase
        .from('orders')
        .select('order_number, status, total_amount, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5) : Promise.resolve({ data: null })
    ]);

    const knowledge = knowledgeResult.data || [];
    const config = configResult.data;
    const userOrders = userOrdersResult.data;

    // 3. Construir contexto para a IA
    const knowledgeContext = knowledge.map(k => 
      `[${k.category.toUpperCase()}] ${k.title}: ${k.content}`
    ).join('\n\n');

    const ordersContext = userOrders ? 
      userOrders.map((o: any) => 
        `Pedido ${o.order_number}: ${o.status}, R$ ${o.total_amount}, ${new Date(o.created_at).toLocaleDateString('pt-BR')}`
      ).join('\n') : '';

    const systemPrompt = `Você é um assistente de suporte de e-commerce brasileiro.

Tom de voz: ${config?.ai_tone || 'profissional e amigável'}

Contexto da Plataforma:
${config?.platform_context || 'E-commerce brasileiro'}

Base de Conhecimento:
${knowledgeContext}

${ordersContext ? `Pedidos Recentes do Cliente:\n${ordersContext}\n` : ''}

INSTRUÇÕES IMPORTANTES:
- Seja ${config?.ai_tone || 'educado, prestativo e objetivo'}
- Use português brasileiro formal mas acessível
- Responda com base APENAS nas informações da base de conhecimento
- Se não souber responder com certeza, seja honesto e sugira contato com atendimento humano
- NUNCA invente informações sobre prazos, preços ou políticas
- Se o cliente demonstrar insatisfação grave, urgência ou reclamação, inicie sua resposta com "ESCALATE:" para transferir para humano
- Mantenha respostas com no máximo ${config?.max_response_length || 500} caracteres

Palavras-chave para escalação: ${config?.escalation_keywords?.join(', ') || 'não sei, preciso falar com humano, urgente, reclamação'}`;

    // 4. Chamar Lovable AI
    console.log('Chamando Lovable AI...');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: config?.max_response_length || 500
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Erro na API Lovable AI:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Limite de requisições excedido. Tente novamente em alguns instantes.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Créditos insuficientes na conta Lovable AI.');
      }
      
      throw new Error(`Erro ao processar resposta da IA: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiMessage = aiData.choices?.[0]?.message?.content;
    
    if (!aiMessage) {
      throw new Error('Resposta da IA vazia');
    }

    console.log('Resposta da IA recebida:', { length: aiMessage.length });

    // 5. Verificar se precisa escalação
    const needsEscalation = aiMessage.startsWith('ESCALATE:');
    const cleanMessage = needsEscalation ? aiMessage.replace('ESCALATE:', '').trim() : aiMessage;
    
    // 6. Salvar resposta da IA
    const { error: aiInsertError } = await supabase
      .from('chat_messages')
      .insert({
        ticket_id: ticketId,
        sender_type: 'ai',
        content: cleanMessage
      });

    if (aiInsertError) {
      console.error('Erro ao salvar resposta da IA:', aiInsertError);
      throw aiInsertError;
    }

    // 7. Atualizar ticket
    const { error: updateError } = await supabase
      .from('support_tickets')
      .update({
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
        status: needsEscalation ? 'waiting_admin' : 'waiting_customer',
        ai_handled: !needsEscalation
      })
      .eq('id', ticketId);

    if (updateError) {
      console.error('Erro ao atualizar ticket:', updateError);
      throw updateError;
    }

    console.log('Sucesso!', { needsEscalation });

    return new Response(JSON.stringify({ 
      success: true, 
      message: cleanMessage,
      needsEscalation 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in ai-support-chat:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
