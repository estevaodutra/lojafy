import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Lock em memória para evitar que requisições concorrentes chamem o ML ao mesmo tempo
// e queimem o refresh_token (single-use rotation)
const inFlightRefreshes = new Map<string, Promise<{ access_token: string; ml_user_id: number }>>();

export async function getValidToken(userId: string, force = false): Promise<{ access_token: string; ml_user_id: number }> {
  // Se já existe uma renovação em andamento para este usuário, aguarda a mesma promessa
  if (inFlightRefreshes.has(userId)) {
    console.log(`[ml-token-refresh] Aguardando refresh concorrente em andamento para o usuário ${userId}...`);
    return await inFlightRefreshes.get(userId)!;
  }

  const refreshPromise = (async () => {
    try {
      // Carregar credenciais da tabela marketplace_credentials ou variáveis de ambiente
      let mlClientId = Deno.env.get('ML_CLIENT_ID') || '';
      let mlClientSecret = Deno.env.get('ML_CLIENT_SECRET') || '';

      try {
        const { data: platSettings } = await supabase
          .from('marketplace_credentials')
          .select('client_id, client_secret')
          .eq('marketplace', 'mercadolivre')
          .maybeSingle();

        if (platSettings) {
          if (platSettings.client_id) mlClientId = platSettings.client_id;
          if (platSettings.client_secret) mlClientSecret = platSettings.client_secret;
        }
      } catch (dbErr) {
        console.error('[ml-token-refresh] Erro ao buscar marketplace_credentials:', dbErr);
      }

      if (!mlClientId || !mlClientSecret) {
        throw new Error('Credenciais do Mercado Livre (client_id / client_secret) não configuradas.');
      }

      // Buscar integração no banco
      const { data: integration, error } = await supabase
        .from('mercadolivre_integrations')
        .select('access_token, refresh_token, expires_at, ml_user_id, is_active')
        .eq('user_id', userId)
        .single();

      if (error || !integration) {
        throw new Error('Integração do Mercado Livre não encontrada para este usuário.');
      }

      // Checar se o token expira nos próximos 20 minutos (ou se force === true)
      const expiresAt = integration.expires_at ? new Date(integration.expires_at) : null;
      const needsRefresh = force || !expiresAt || expiresAt.getTime() < Date.now() + 20 * 60 * 1000;

      if (!needsRefresh) {
        return { access_token: integration.access_token, ml_user_id: integration.ml_user_id };
      }

      if (!integration.refresh_token) {
        throw new Error('Token expirado e nenhum refresh_token disponível para renovação.');
      }

      console.log(`[ml-token-refresh] Disparando renovação OAuth no Mercado Livre para o usuário ${userId}...`);

      // Solicitar renovação ao Mercado Livre
      const refreshRes = await fetch('https://api.mercadolibre.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: mlClientId,
          client_secret: mlClientSecret,
          refresh_token: integration.refresh_token,
        }).toString(),
      });

      if (!refreshRes.ok) {
        const errText = await refreshRes.text();
        console.error(`[ml-token-refresh] Falha na resposta do ML (HTTP ${refreshRes.status}):`, errText);

        const isInvalidGrant = errText.includes('invalid_grant') || refreshRes.status === 400;

        // Registrar o erro no banco de dados para visibilidade no painel admin
        await supabase
          .from('mercadolivre_integrations')
          .update({
            last_error: `HTTP ${refreshRes.status}: ${errText}`,
            last_error_at: new Date().toISOString(),
            ...(isInvalidGrant ? { is_active: false } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (isInvalidGrant) {
          throw new Error('Autorização revogada pelo Mercado Livre (invalid_grant). É necessário reconectar a conta.');
        }

        throw new Error(`Falha ao renovar token (ML HTTP ${refreshRes.status}): ${errText}`);
      }

      const newToken = await refreshRes.json();
      const newExpiresAt = new Date(Date.now() + (newToken.expires_in ?? 21600) * 1000).toISOString();

      // Salvar os novos tokens com sucesso e limpar erros anteriores
      await supabase
        .from('mercadolivre_integrations')
        .update({
          access_token: newToken.access_token,
          refresh_token: newToken.refresh_token ?? integration.refresh_token,
          expires_in: newToken.expires_in ?? null,
          expires_at: newExpiresAt,
          last_refreshed_at: new Date().toISOString(),
          last_error: null,
          last_error_at: null,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      console.log(`✅ [ml-token-refresh] Token renovado com sucesso para ${userId}. Válido até ${newExpiresAt}`);
      return { access_token: newToken.access_token, ml_user_id: integration.ml_user_id };

    } finally {
      // Sempre remover a trava após conclusão (sucesso ou erro)
      inFlightRefreshes.delete(userId);
    }
  })();

  inFlightRefreshes.set(userId, refreshPromise);
  return await refreshPromise;
}

// Rotina em lote para renovar todas as contas ativas que expiram em breve
async function refreshAllExpiring(): Promise<{ total: number; refreshed: number; failed: number; errors: any[] }> {
  console.log('[ml-token-refresh] Iniciando verificação proativa de todas as contas ML...');

  const threeHoursFromNow = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();

  // Buscar contas ativas que já expiraram ou expiram nas próximas 3 horas
  const { data: expiringIntegrations, error } = await supabase
    .from('mercadolivre_integrations')
    .select('user_id, ml_user_id, expires_at')
    .eq('is_active', true)
    .or(`expires_at.is.null,expires_at.lt.${threeHoursFromNow}`);

  if (error || !expiringIntegrations) {
    console.error('[ml-token-refresh] Erro ao buscar integrações expirando:', error);
    return { total: 0, refreshed: 0, failed: 0, errors: [String(error)] };
  }

  console.log(`[ml-token-refresh] Encontradas ${expiringIntegrations.length} conta(s) precisando de renovação.`);

  let refreshed = 0;
  let failed = 0;
  const errors: any[] = [];

  for (const intg of expiringIntegrations) {
    try {
      await getValidToken(intg.user_id, true);
      refreshed++;
      // Pequeno delay para evitar rate limit na API do Mercado Livre
      await new Promise(r => setTimeout(r, 600));
    } catch (err: any) {
      failed++;
      errors.push({ user_id: intg.user_id, ml_user_id: intg.ml_user_id, error: err.message });
      console.warn(`[ml-token-refresh] Erro ao renovar usuário ${intg.user_id}:`, err.message);
    }
  }

  return { total: expiringIntegrations.length, refreshed, failed, errors };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { user_id, force = false, mode } = body;

    // Modo batch (chamado pelo pg_cron ou pelo painel Super Admin)
    if (mode === 'refresh_all_expiring') {
      const summary = await refreshAllExpiring();
      return new Response(JSON.stringify({ success: true, summary }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id ou mode obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await getValidToken(user_id, force);
    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
