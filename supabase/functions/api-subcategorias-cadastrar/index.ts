import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Method not allowed. Use POST.' 
        }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate API key
    const apiKey = req.headers.get('X-API-Key') || req.headers.get('x-api-key');
    
    if (!apiKey) {
      console.log('Missing API key');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'API key is required. Include X-API-Key header.' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verify API key and get permissions
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('id, permissions, active')
      .eq('api_key', apiKey)
      .single();

    if (apiKeyError || !apiKeyData || !apiKeyData.active) {
      console.log('Invalid or inactive API key:', apiKeyError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid or inactive API key' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if API key has permission to write categories
    const permissions = apiKeyData.permissions as any;
    if (!permissions?.categorias?.write) {
      console.log('Insufficient permissions for categories write');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'API key does not have permission to create categories' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const body = await req.json();
    console.log('Request body:', body);

    // Validate required fields
    if (!body.nome || typeof body.nome !== 'string') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Field "nome" is required and must be a string' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!body.category_id || typeof body.category_id !== 'string') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Field "category_id" is required and must be a string' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify that the parent category exists and is active
    const { data: categoryData, error: categoryError } = await supabase
      .from('categories')
      .select('id, name, active')
      .eq('id', body.category_id)
      .single();

    if (categoryError || !categoryData) {
      console.log('Parent category not found:', categoryError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Parent category not found' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!categoryData.active) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Parent category is not active' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate slug from name
    const slug = body.nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .trim()
      .replace(/\s+/g, '-'); // Replace spaces with hyphens

    // Prepare subcategory data
    const subcategoryData = {
      name: body.nome.trim(),
      slug: slug,
      category_id: body.category_id,
      active: true
    };

    console.log('Creating subcategory with data:', subcategoryData);

    // Insert subcategory
    const { data: newSubcategory, error: insertError } = await supabase
      .from('subcategories')
      .insert([subcategoryData])
      .select('*')
      .single();

    if (insertError) {
      console.error('Error creating subcategory:', insertError);
      
      // Handle unique constraint violation for slug
      if (insertError.code === '23505' && insertError.message.includes('slug')) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'A subcategory with this name already exists in this category' 
          }),
          { 
            status: 409, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Error creating subcategory' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Subcategory created successfully:', newSubcategory);

    // Update last_used timestamp for API key
    await supabase
      .from('api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('id', apiKeyData.id);

    // Format response
    const responseData = {
      success: true,
      message: 'Subcategoria criada com sucesso',
      data: {
        id: newSubcategory.id,
        nome: newSubcategory.name,
        slug: newSubcategory.slug,
        categoria_pai: {
          id: categoryData.id,
          nome: categoryData.name
        },
        ativo: newSubcategory.active,
        criado_em: newSubcategory.created_at,
        atualizado_em: newSubcategory.updated_at
      }
    };

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});