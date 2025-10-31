import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, keywords = [] } = await req.json();
    console.log('🤖 Suggest-answer invoked for question:', question);
    console.log('📝 Keywords:', keywords);

    if (!question) {
      return new Response(
        JSON.stringify({ error: 'Question is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Buscar knowledge base por keywords e conteúdo
    const { data: kbResults, error: kbError } = await supabase
      .from('ai_knowledge_base')
      .select(`
        *,
        related_course:courses(id, title),
        related_module:course_modules(id, title),
        related_lesson:course_lessons(id, title)
      `)
      .eq('active', true)
      .or(keywords.length > 0 ? `keywords.cs.{${keywords.join(',')}}` : 'id.not.is.null')
      .limit(5);

    console.log('📚 Found KB results:', kbResults?.length || 0);
    if (kbError) {
      console.error('❌ Error fetching knowledge base:', kbError);
    }

    // 2. Buscar perguntas similares já respondidas
    const { data: similarQuestions, error: sqError } = await supabase
      .from('ai_pending_questions')
      .select('question, answer, related_course_id, related_module_id, related_lesson_id')
      .eq('status', 'answered')
      .not('answer', 'is', null)
      .limit(3);

    console.log('❓ Found similar questions:', similarQuestions?.length || 0);
    if (sqError) {
      console.error('❌ Error fetching similar questions:', sqError);
    }

    // 3. Montar contexto para a IA
    let knowledgeContext = '';
    if (kbResults && kbResults.length > 0) {
      knowledgeContext = kbResults
        .map(kb => `[${kb.category}] ${kb.title}: ${kb.content}`)
        .join('\n\n');
    }

    let similarAnswersContext = '';
    if (similarQuestions && similarQuestions.length > 0) {
      similarAnswersContext = similarQuestions
        .map(q => `Pergunta: ${q.question}\nResposta: ${q.answer}`)
        .join('\n\n---\n\n');
    }

    const systemPrompt = `Você é um especialista em suporte de e-commerce brasileiro especializado em plataformas SaaS.

TAREFA: Gerar uma resposta completa, clara e acionável para a pergunta do usuário.

CONTEXTO DA BASE DE CONHECIMENTO:
${knowledgeContext || 'Nenhum conteúdo específico encontrado na base de conhecimento.'}

PERGUNTAS SIMILARES JÁ RESPONDIDAS:
${similarAnswersContext || 'Nenhuma pergunta similar encontrada.'}

REGRAS OBRIGATÓRIAS:
1. Seja objetivo e prático - máximo 150 palavras
2. Use listas numeradas para passo-a-passo quando apropriado
3. Use tom profissional mas amigável (tutear com "você")
4. Se houver conteúdo da Academia relacionado no contexto acima, mencione no final
5. Não invente funcionalidades - use apenas o contexto fornecido
6. Se não tiver informação suficiente, seja honesto: "Vou verificar essa informação com a equipe técnica e retorno em breve."

FORMATO DE SAÍDA:
- Resposta em texto plano (sem markdown pesado, apenas negrito ** para ênfase se necessário)
- Se recomendar conteúdo educacional: finalize com "📚 Recomendação: [Título do curso/módulo/aula]"
- Seja direto e acionável`;

    // 4. Chamar Lovable AI
    console.log('🤖 Calling Lovable AI...');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `PERGUNTA DO USUÁRIO:\n${question}` }
        ],
        max_completion_tokens: 500,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('❌ Lovable AI error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`AI request failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const suggestedAnswer = aiData.choices?.[0]?.message?.content || '';
    console.log('✅ AI response generated successfully');

    // 5. Detectar conteúdo relacionado mais relevante
    let relatedContent = null;
    let confidence = 'low';

    if (kbResults && kbResults.length > 0) {
      const mostRelevant = kbResults[0];
      
      if (mostRelevant.related_lesson) {
        relatedContent = {
          type: 'lesson',
          id: mostRelevant.related_lesson.id,
          title: mostRelevant.related_lesson.title,
        };
      } else if (mostRelevant.related_module) {
        relatedContent = {
          type: 'module',
          id: mostRelevant.related_module.id,
          title: mostRelevant.related_module.title,
        };
      } else if (mostRelevant.related_course) {
        relatedContent = {
          type: 'course',
          id: mostRelevant.related_course.id,
          title: mostRelevant.related_course.title,
        };
      }

      // Calcular confiança baseado em contexto disponível
      if (kbResults.length >= 3 && similarQuestions && similarQuestions.length >= 2) {
        confidence = 'high';
      } else if (kbResults.length >= 1 || (similarQuestions && similarQuestions.length >= 1)) {
        confidence = 'medium';
      }
    }

    console.log('✅ Response prepared:', { 
      hasAnswer: !!suggestedAnswer,
      hasRelatedContent: !!relatedContent,
      confidence 
    });

    return new Response(
      JSON.stringify({
        suggestedAnswer,
        relatedContent,
        confidence,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Error in suggest-answer function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
