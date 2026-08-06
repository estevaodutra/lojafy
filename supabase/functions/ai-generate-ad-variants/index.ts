import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AiGeneratePayload {
  product_id: string;
  source_ads: any[];
  objective?: string;
  requested_quantity?: number;
  varying_fields?: string[];
  marketplace?: string;
  apiKey?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as AiGeneratePayload;
    const {
      source_ads = [],
      objective = 'Aumentar conversão',
      requested_quantity = 3,
      varying_fields = ['internal_name', 'public_title', 'public_description'],
      marketplace = 'mercadolivre',
      apiKey: customApiKey,
    } = payload;

    if (!source_ads || source_ads.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Selecione pelo menos 1 anúncio de referência.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiApiKey = customApiKey?.trim() || Deno.env.get('LOVABLE_API_KEY') || Deno.env.get('OPENAI_API_KEY') || Deno.env.get('GEMINI_API_KEY');
    if (!aiApiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Chave da API de IA não configurada. Forneça uma chave OpenAI válida.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `Você é um especialista em Copywriting, Growth Hacking e E-commerce de alta conversão para Mercado Livre e Shopee.
Sua missão é analisar anúncios campeões de venda fornecidos e criar exatamente ${requested_quantity} novas variações de anúncios vencedores.

REGRAS RÍGIDAS:
1. NOME INTERNO (internal_name): Deve ser único, claro e funcional para a organização da loja Lojafy (ex: "[IA-Conversão] Oferta Frete Grátis + Bônus"). Não é enviado ao marketplace.
2. TÍTULO PÚBLICO (public_title): 
   - Se marketplace = "mercadolivre", o título DEVE TER NO MÁXIMO 60 CARACTERES. Nunca ultrapasse 60 caracteres.
   - Deve ser altamente persuasivo, incluindo palavra-chave principal, benefício e especificações.
3. DESCRIÇÃO PÚBLICA (public_description): Estruturada com ganchos emocionais, benefícios em tópicos, especificações técnicas e chamada para ação (CTA).
4. PRESERVAÇÃO DA VERDADE: Não invente acessórios, características ou garantias não mencionadas nos anúncios de referência.
5. OBJETIVO PRINCIPAL: "${objective}".

Retorne ESTRITAMENTE um objeto JSON válido (sem textos explicativos ou blocos adicionais):
{
  "variations": [
    {
      "internal_name": "Nome interno do anúncio para organização local",
      "public_title": "Título público persuasivo (máx 60 caracteres se ML)",
      "public_description": "Descrição completa formatada",
      "rationale": "Justificativa resumida do porquê essa variação converte"
    }
  ]
}`;

    const userPrompt = `Anúncios de Referência para Análise:
${JSON.stringify(source_ads, null, 2)}

Marketplace Alvo: ${marketplace}
Objetivo: ${objective}
Quantidade Solicitada: ${requested_quantity}
Campos a Variar: ${varying_fields.join(', ')}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      console.error('OpenAI Error:', response.status, errJson);
      throw new Error(`OpenAI API Error: ${errJson.error?.message || response.statusText}`);
    }

    const aiResult = await response.json();
    const rawContent = aiResult.choices?.[0]?.message?.content;
    if (!rawContent) {
      throw new Error('A IA não retornou nenhum conteúdo.');
    }

    const parsed = JSON.parse(rawContent);
    return new Response(
      JSON.stringify({ success: true, variations: parsed.variations || [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('Error in ai-generate-ad-variants:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Erro desconhecido ao gerar variações por IA.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
