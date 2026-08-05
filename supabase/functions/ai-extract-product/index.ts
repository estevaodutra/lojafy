import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImageExtractPayload {
  images: string[]; // base64 data URLs or standard image URLs
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { images } = (await req.json()) as ImageExtractPayload;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nenhuma imagem foi enviada.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY não configurada no ambiente.');
      return new Response(
        JSON.stringify({ success: false, error: 'Chave de API Lovable AI não configurada.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `Você é um assistente especialista em e-commerce e extração de fichas técnicas de produtos a partir de prints e imagens.
Analise com atenção as imagens fornecidas (prints de anúncios, fichas técnicas, tabelas de especificações, embalagens ou etiquetas).

Retorne ESTRITAMENTE um objeto JSON válido (sem qualquer marcação markdown extra ou explicações antes/depois) com a seguinte estrutura:

{
  "name": "Nome Comercial do Produto",
  "brand": "Marca do fabricante (se houver)",
  "sku": "Código SKU ou Referência do Produto (se houver)",
  "gtin_ean13": "Código de barras EAN-13 / GTIN contendo apenas números (se houver)",
  "description": "Descrição detalhada e atrativa do produto resumindo o que é visto na imagem",
  "cost_price": 0.00,
  "price": 0.00,
  "specifications": [
    { "key": "Nome do Atributo (ex: Voltagem, Material, Resolução, Potência)", "value": "Valor (ex: Bivolt, Aço Inox, 1080p, 500W)" }
  ],
  "variations": [
    {
      "type": "tipo (ex: color, size, model ou voltagem)",
      "name": "Nome da variação (ex: Azul, M, 110V)",
      "value": "Código ou descrição da variação (ex: #0000FF, M, 110V)",
      "costPrice": 0.00,
      "stockQuantity": 10
    }
  ]
}

Regras:
1. Se o preço for visível (ex: R$ 49,90), extraia apenas o número decimal (ex: 49.90).
2. Se não encontrar algum campo específico, preencha com texto vazio "" ou 0 para números.
3. Extraia TODAS as especificações/atributos técnicos visíveis na foto e adicione na lista "specifications".
4. Se a imagem mostrar variações de cores, tamanhos ou modelos, monte o array "variations".
5. Retorne APENAS o JSON puro.`;

    const userMessageContent: any[] = [
      { type: "text", text: "Extraia todos os dados do produto presentes nestas imagens e retorne no formato JSON exigido:" }
    ];

    images.forEach(img => {
      userMessageContent.push({
        type: "image_url",
        image_url: {
          url: img
        }
      });
    });

    console.log(`🤖 Processando ${images.length} imagem(ns) via Gemini 2.5 Flash...`);

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
          { role: 'user', content: userMessageContent }
        ],
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('❌ Lovable AI gateway error:', aiResponse.status, errText);
      return new Response(
        JSON.stringify({ success: false, error: `Erro na IA (${aiResponse.status}): ${errText}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content?.trim() || '';

    // Clean JSON content if wrapped in backticks
    const cleanedContent = rawContent
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    try {
      const parsedData = JSON.parse(cleanedContent);
      return new Response(
        JSON.stringify({ success: true, data: parsedData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (jsonErr) {
      console.error('❌ Erro ao parsear JSON da IA:', jsonErr, rawContent);
      return new Response(
        JSON.stringify({ success: false, error: 'A resposta da IA não veio em formato JSON válido.', raw: rawContent }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (err: any) {
    console.error('❌ Exceção interna em ai-extract-product:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
