import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Validate API Key
    const apiKey = req.headers.get('X-API-Key');
    if (!apiKey) {
      console.error('API key missing in request');
      return new Response(
        JSON.stringify({ success: false, error: 'API key ausente' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ success: false, error: 'Configuração do servidor incorreta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify API key validity
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('api_key', apiKey)
      .eq('active', true)
      .single();

    if (apiKeyError || !apiKeyData) {
      console.error('Invalid API key:', apiKeyError);
      return new Response(
        JSON.stringify({ success: false, error: 'API key inválida ou ausente' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last_used timestamp
    await supabase
      .from('api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('api_key', apiKey);

    console.log('API key validated successfully');

    // Parse query parameters
    const url = new URL(req.url);
    const limitParam = url.searchParams.get('limit');
    const pageParam = url.searchParams.get('page');
    const roleFilter = url.searchParams.get('role');
    const searchQuery = url.searchParams.get('search');

    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam), 1), 100) : 50;
    const page = pageParam ? Math.max(parseInt(pageParam), 1) : 1;

    console.log('Query params:', { limit, page, roleFilter, searchQuery });

    // Fetch all profiles directly (service_role bypasses RLS)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao buscar perfis' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetched ${profiles?.length || 0} profiles`);

    // Fetch all auth users with increased page size
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
      perPage: 1000
    });

    if (authError) {
      console.error('Error fetching auth users:', authError);
    }

    console.log(`Fetched ${authData?.users?.length || 0} auth users`);

    // Create email map from auth.users
    const emailMap = new Map(
      authData?.users?.map(u => [u.id, { email: u.email, last_sign_in_at: u.last_sign_in_at }]) || []
    );

    // Combine profiles with auth data
    let combinedUsers = (profiles || []).map(profile => {
      const authInfo = emailMap.get(profile.user_id);
      const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
      
      return {
        user_id: profile.user_id,
        email: authInfo?.email || '',
        full_name: fullName || 'N/A',
        role: profile.role || 'customer',
        phone: profile.phone || null,
        is_active: profile.is_active ?? true,
        created_at: profile.created_at,
        last_sign_in_at: authInfo?.last_sign_in_at || null
      };
    });

    console.log(`Combined ${combinedUsers.length} users`);

    // Apply role filter
    if (roleFilter) {
      combinedUsers = combinedUsers.filter(u => u.role === roleFilter);
      console.log(`After role filter (${roleFilter}): ${combinedUsers.length} users`);
    }

    // Apply search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      combinedUsers = combinedUsers.filter(u => 
        u.full_name.toLowerCase().includes(searchLower) ||
        u.email.toLowerCase().includes(searchLower)
      );
      console.log(`After search filter (${searchQuery}): ${combinedUsers.length} users`);
    }

    const total = combinedUsers.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedUsers = combinedUsers.slice(startIndex, endIndex);

    // Calculate summary
    const roleCount = combinedUsers.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('Response ready:', {
      total,
      totalPages,
      page,
      paginatedCount: paginatedUsers.length,
      roleBreakdown: roleCount
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: paginatedUsers,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        summary: {
          total_users: total,
          by_role: roleCount
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unexpected error in api-usuarios-listar:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro interno do servidor',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
