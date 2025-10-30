import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

// Categorias de suporte
const SUPPORT_CATEGORIES = {
  pedidos: { keywords: ['pedido', 'compra', 'order', 'status', 'cancelar'] },
  entrega: { keywords: ['entrega', 'rastreio', 'frete', 'prazo', 'transportadora', 'correios'] },
  pagamento: { keywords: ['pagamento', 'pagar', 'pix', 'cartão', 'estorno', 'boleto'] },
  produtos: { keywords: ['produto', 'item', 'estoque', 'disponível', 'especificação'] },
  trocas: { keywords: ['troca', 'devolução', 'devolver', 'garantia', 'defeito'] },
  conta: { keywords: ['conta', 'login', 'senha', 'cadastro', 'dados pessoais', 'perfil'] },
  academia: { keywords: ['academia', 'curso', 'aula', 'vídeo', 'conteúdo educativo'] },
  comissoes: { keywords: ['comissão', 'repasse', 'vendas', 'ganhos', 'revendedor'] },
  tecnico: { keywords: ['erro', 'bug', 'problema técnico', 'não funciona', 'travando'] },
  outros: { keywords: [] }
};

function detectCategory(text: string): string {
  const lowerText = text.toLowerCase();
  
  for (const [category, config] of Object.entries(SUPPORT_CATEGORIES)) {
    if (config.keywords.some(keyword => lowerText.includes(keyword))) {
      return category;
    }
  }
  
  return 'outros';
}

// Helper function to extract keywords from text
function extractKeywords(text: string): string[] {
  const stopWords = ['o', 'a', 'de', 'da', 'do', 'em', 'para', 'com', 'por', 'um', 'uma', 'os', 'as', 'dos', 'das', 'e', 'é'];
  const words = text.toLowerCase()
    .replace(/[^\w\sáàãâäéèêëíìîïóòõôöúùûüç]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.includes(word));
  return [...new Set(words)].slice(0, 5);
}

// Helper function to calculate text similarity
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(extractKeywords(text1));
  const words2 = new Set(extractKeywords(text2));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

// Helper function to detect vague questions
function isQuestionVague(text: string): { isVague: boolean; suggestions: string[] } {
  const vaguePatterns = [
    /\b(essa|aquela|isso|isto)\s+(aula|curso|produto|pedido)\b/i,
    /^(onde|como|quando)\s+\w+\s+(aula|curso|produto|pedido)\??$/i,
    /\b(meu|minha)\s+(pedido|aula|produto)\b(?!.*#?\d{3,})/i,
    /\b(não|nao)\s+(consigo|consigo acessar|funciona)\b(?!.{20,})/i,
  ];

  const suggestions: string[] = [];
  let isVague = false;

  for (const pattern of vaguePatterns) {
    if (pattern.test(text)) {
      isVague = true;
      
      if (text.includes('aula') || text.includes('curso')) {
        suggestions.push('- Qual é o nome ou tema da aula/curso?');
        suggestions.push('- Você já está matriculado?');
      }
      if (text.includes('pedido')) {
        suggestions.push('- Qual é o número do pedido?');
        suggestions.push('- Quando foi feita a compra?');
      }
      if (text.includes('produto')) {
        suggestions.push('- Qual produto específico?');
        suggestions.push('- Você quer informações sobre estoque, preço ou características?');
      }
      if (text.includes('não consigo') || text.includes('não funciona')) {
        suggestions.push('- O que você está tentando fazer?');
        suggestions.push('- Qual mensagem de erro aparece?');
      }
      break;
    }
  }

  return { isVague, suggestions };
}

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

    // 🆕 Validação Pré-IA: Detectar perguntas vagas
    console.log('Verificando se a pergunta precisa de clarificação...');
    const vagueCheck = isQuestionVague(message);
    if (vagueCheck.isVague && vagueCheck.suggestions.length > 0) {
      console.log('Pergunta vaga detectada, pedindo contexto adicional');
      const clarificationMessage = `Para te ajudar melhor, preciso de mais detalhes:\n\n${vagueCheck.suggestions.join('\n')}\n\nPor favor, me forneça essas informações para que eu possa te dar uma resposta precisa! 😊`;
      
      // Salvar resposta automática
      await supabase
        .from('chat_messages')
        .insert({
          ticket_id: ticketId,
          sender_type: 'ai',
          sender_id: null,
          content: clarificationMessage
        });

      // Atualizar ticket
      await supabase
        .from('support_tickets')
        .update({
          last_message_at: new Date().toISOString(),
          ai_handled: true
        })
        .eq('id', ticketId);

      return new Response(
        JSON.stringify({
          success: true,
          message: clarificationMessage,
          requiresClarification: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 🆕 STEP 1: Check if there's already an answered question matching this message
    console.log('Searching for answered questions...');
    const { data: answeredQuestions, error: aqError } = await supabase
      .from('ai_pending_questions')
      .select('*')
      .eq('status', 'answered')
      .not('answer', 'is', null);

    if (!aqError && answeredQuestions && answeredQuestions.length > 0) {
      // Find best match
      let bestMatch = null;
      let bestSimilarity = 0;

      for (const aq of answeredQuestions) {
        const similarity = calculateSimilarity(message, aq.question);
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = aq;
        }
      }

      // If we found a good match (>70% similarity), return the saved answer
      if (bestMatch && bestSimilarity > 0.7) {
        console.log(`Found matching answer with ${(bestSimilarity * 100).toFixed(1)}% similarity`);
        
        // Save AI response
        await supabase.from('chat_messages').insert({
          ticket_id: ticketId,
          sender_type: 'ai',
          content: bestMatch.answer
        });

        // Update question stats
        await supabase
          .from('ai_pending_questions')
          .update({
            asked_count: bestMatch.asked_count + 1,
            last_asked_at: new Date().toISOString()
          })
          .eq('id', bestMatch.id);

        // Update ticket
        await supabase
          .from('support_tickets')
          .update({
            last_message: bestMatch.answer,
            last_message_at: new Date().toISOString(),
            status: 'waiting_customer',
            updated_at: new Date().toISOString()
          })
          .eq('id', ticketId);

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Resposta enviada (base de respostas válidas)',
            usedSavedAnswer: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 2. Buscar perfil do usuário para detectar role
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .single();

    const userRole = userProfile?.role || 'customer';

    // 3. Buscar contexto da base de conhecimento filtrado por target_audience e configuração
    const [knowledgeResult, configResult, userOrdersResult, academyLessonsResult] = await Promise.all([
      supabase
        .from('ai_knowledge_base')
        .select('*')
        .eq('active', true)
        .or(`target_audience.eq.all,target_audience.eq.${userRole}`)
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
        .limit(5) : Promise.resolve({ data: null }),
      supabase
        .from('course_lessons')
        .select(`
          id,
          title,
          lesson_description,
          video_url,
          course_modules!inner(
            title,
            courses!inner(
              title,
              access_level
            )
          )
        `)
        .eq('is_published', true)
        .eq('course_modules.is_published', true)
        .eq('course_modules.courses.is_published', true)
    ]);

    const knowledge = knowledgeResult.data || [];
    const config = configResult.data;
    const userOrders = userOrdersResult.data;
    const allAcademyLessons = academyLessonsResult.data || [];

    // Filtrar lições da Academy por access_level do usuário
    const relevantLessons = allAcademyLessons.filter((lesson: any) => {
      const accessLevel = lesson.course_modules.courses.access_level;
      return accessLevel === 'all' || accessLevel === userRole;
    });

    // 4. Construir contexto para a IA
    const knowledgeContext = knowledge.map(k => 
      `[${k.category.toUpperCase()}] ${k.title}: ${k.content}`
    ).join('\n\n');

    const ordersContext = userOrders ? 
      userOrders.map((o: any) => 
        `Pedido ${o.order_number}: ${o.status}, R$ ${o.total_amount}, ${new Date(o.created_at).toLocaleDateString('pt-BR')}`
      ).join('\n') : '';

    const academyContext = relevantLessons.length > 0 ?
      relevantLessons.map((l: any) => 
        `[ACADEMY] ${l.course_modules.courses.title} > ${l.title}: ${l.lesson_description || 'Sem descrição'}`
      ).join('\n\n') : '';

    // Validação Pré-IA: Detectar perguntas vagas
    const vagueCheck = isQuestionVague(message);
    if (vagueCheck.isVague && vagueCheck.suggestions.length > 0) {
      const clarificationMessage = `Para te ajudar melhor, preciso de mais detalhes:\n\n${vagueCheck.suggestions.join('\n')}\n\nPor favor, me forneça essas informações para que eu possa te dar uma resposta precisa! 😊`;
      
      // Salvar resposta automática
      await supabase
        .from('chat_messages')
        .insert({
          ticket_id: ticketId,
          user_id: null,
          message: clarificationMessage,
          sender_type: 'ai'
        });

      // Atualizar ticket
      await supabase
        .from('support_tickets')
        .update({
          last_message_at: new Date().toISOString(),
          ai_handled: true
        })
        .eq('id', ticketId);

      return new Response(
        JSON.stringify({
          success: true,
          message: clarificationMessage,
          requiresClarification: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `Você é um assistente de suporte de e-commerce brasileiro.

Tom de voz: ${config?.ai_tone || 'profissional e amigável'}
Público-alvo: ${userRole === 'reseller' ? 'Revendedor' : userRole === 'supplier' ? 'Fornecedor' : 'Cliente Final'}

Contexto da Plataforma:
${config?.platform_context || 'E-commerce brasileiro'}

Base de Conhecimento (filtrada para ${userRole}):
${knowledgeContext}

${academyContext ? `Conteúdo da Lojafy Academy:\n${academyContext}\n\n` : ''}

${ordersContext ? `Pedidos Recentes do Cliente:\n${ordersContext}\n` : ''}

INSTRUÇÕES IMPORTANTES:
- Seja ${config?.ai_tone || 'educado, prestativo e objetivo'}
- Use português brasileiro formal mas acessível
- Responda com base APENAS nas informações da base de conhecimento e Academy
- Se houver uma aula da Academy que resolve o problema, sugira ao usuário acessá-la
- Se não souber responder com certeza, seja honesto e sugira contato com atendimento humano
- NUNCA invente informações sobre prazos, preços ou políticas
- Se o cliente demonstrar insatisfação grave, urgência ou reclamação, inicie sua resposta com "ESCALATE:" para transferir para humano
- Mantenha respostas com no máximo ${config?.max_response_length || 500} caracteres

REGRAS DE CLARIFICAÇÃO (CRÍTICO):
Sempre que receber uma pergunta vaga ou sem contexto suficiente, você DEVE pedir informações detalhadas antes de responder. Exemplos:

❌ PERGUNTA VAGA: "Onde eu vejo essa aula?"
✅ RESPOSTA CORRETA: "Claro! Para te direcionar corretamente, preciso de algumas informações:
- Qual é o nome ou tema da aula que você está procurando?
- É de algum curso específico (ex: Marketing Digital, Vendas, etc)?
- Você já está matriculado nesse curso ou está apenas interessado?"

❌ PERGUNTA VAGA: "Meu pedido não chegou"
✅ RESPOSTA CORRETA: "Vou te ajudar com isso! Para localizar seu pedido rapidamente, por favor me informe:
- Qual é o número do pedido? (formato: #12345)
- Quando foi realizada a compra?
- Qual produto você comprou?"

❌ PERGUNTA VAGA: "Não consigo acessar"
✅ RESPOSTA CORRETA: "Entendo sua dificuldade. Para ajudar melhor, preciso saber:
- O que você está tentando acessar? (ex: uma aula, área de revendedor, etc)
- Qual mensagem de erro aparece (se houver)?
- Você já fez login na plataforma?"

CRITÉRIOS PARA EXIGIR CONTEXTO:
- Pronomes demonstrativos vagos ("essa", "aquela", "isso") sem referente claro
- Perguntas sobre "aula", "curso", "pedido", "produto" sem especificar qual
- Problemas técnicos sem descrição do erro
- Qualquer pergunta que você não possa responder com 100% de certeza com as informações fornecidas

IMPORTANTE: Não tente adivinhar ou dar respostas genéricas. É MELHOR pedir contexto e responder com precisão do que responder rápido mas errado.

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
          // Few-shot examples
          {
            role: 'user',
            content: 'Onde eu vejo essa aula?'
          },
          {
            role: 'assistant',
            content: 'Claro! Para te direcionar corretamente, preciso de algumas informações:\n- Qual é o nome ou tema da aula que você está procurando?\n- É de algum curso específico?\n- Você já está matriculado nesse curso?'
          },
          {
            role: 'user',
            content: 'Meu pedido não chegou'
          },
          {
            role: 'assistant',
            content: 'Vou te ajudar com isso! Para localizar seu pedido rapidamente, por favor me informe:\n- Qual é o número do pedido? (formato: #12345)\n- Quando foi realizada a compra?\n- Qual produto você comprou?'
          },
          // Mensagem real do usuário
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

    // 7. Detectar categoria automaticamente
    const detectedCategory = detectCategory(message);

    // 8. Buscar tags atuais do ticket
    const { data: currentTicket } = await supabase
      .from('support_tickets')
      .select('tags')
      .eq('id', ticketId)
      .single();

    const currentTags = currentTicket?.tags || [];
    const updatedTags = currentTags.length === 0 ? [detectedCategory] : currentTags;

    // 🆕 STEP 2: Register as pending question if not found in knowledge base
    console.log('Checking if question should be registered as pending...');
    const keywords = extractKeywords(message);
    
    // Check if similar pending question already exists
    const { data: existingPending } = await supabase
      .from('ai_pending_questions')
      .select('*')
      .contains('keywords', keywords)
      .limit(1)
      .single();

    if (!existingPending && keywords.length > 0) {
      console.log('Registering new pending question');
      await supabase.from('ai_pending_questions').insert({
        question: message,
        status: 'pending',
        ticket_id: ticketId,
        user_role: userRole,
        keywords: keywords
      });
    } else if (existingPending) {
      // Increment asked count if similar question exists
      await supabase
        .from('ai_pending_questions')
        .update({
          asked_count: existingPending.asked_count + 1,
          last_asked_at: new Date().toISOString()
        })
        .eq('id', existingPending.id);
    }

    // 9. Atualizar ticket
    const { error: updateError } = await supabase
      .from('support_tickets')
      .update({
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
        status: needsEscalation ? 'waiting_admin' : 'waiting_customer',
        ai_handled: !needsEscalation,
        tags: updatedTags
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
