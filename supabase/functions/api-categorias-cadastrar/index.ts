import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify API key
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key required in X-API-Key header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate API key and get permissions
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('user_id, permissions, active')
      .eq('api_key', apiKey)
      .eq('active', true)
      .maybeSingle();

    if (apiKeyError || !apiKeyData) {
      return new Response(
        JSON.stringify({ error: 'Invalid or inactive API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check permissions
    const permissions = apiKeyData.permissions as any;
    if (!permissions?.categorias?.write) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions for this endpoint' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last used timestamp
    await supabase
      .from('api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('api_key', apiKey);

    // Parse request body
    const body = await req.json();
    const { nome, icone, cor, imagem_url } = body;

    // Validate required fields
    if (!nome) {
      return new Response(
        JSON.stringify({ 
          error: 'Campo obrigatório: nome',
          received: { nome }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate slug from name
    const slug = nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim();

    // Create category data
    const categoryData = {
      name: nome,
      slug,
      icon: icone,
      color: cor,
      image_url: imagem_url,
      active: true
    };

    // Insert category
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .insert(categoryData)
      .select()
      .single();

    if (categoryError) {
      console.error('Error creating category:', categoryError);
      
      // Handle unique constraint violation for slug
      if (categoryError.code === '23505' && categoryError.message.includes('slug')) {
        return new Response(
          JSON.stringify({ 
            error: 'Já existe uma categoria com esse nome ou slug similar',
            details: 'Tente usar um nome diferente'
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          error: 'Erro ao criar categoria',
          details: categoryError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Categoria criada com sucesso',
        data: {
          id: category.id,
          nome: category.name,
          slug: category.slug,
          icone: category.icon,
          cor: category.color,
          imagem_url: category.image_url
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in api-categorias-cadastrar:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});