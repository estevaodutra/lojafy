import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is super_admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profile?.role !== "super_admin") {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id, plan_id, plan_type, motivo } = await req.json();

    if (!user_id || !plan_id || !plan_type) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: user_id, plan_id, plan_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate expiration
    let plan_expires_at: string | null = null;
    const now = new Date();
    if (plan_type === "mensal") {
      plan_expires_at = new Date(now.setMonth(now.getMonth() + 1)).toISOString();
    } else if (plan_type === "anual") {
      plan_expires_at = new Date(now.setFullYear(now.getFullYear() + 1)).toISOString();
    }
    // vitalicio = null (no expiration)

    // Update profile
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({
        plan_id,
        plan_started_at: new Date().toISOString(),
        plan_expires_at,
        plan_type,
      })
      .eq("user_id", user_id);

    if (profileError) throw profileError;

    // Get plan features
    const { data: planFeatures } = await adminClient
      .from("plan_features")
      .select("feature_id, limites")
      .eq("plan_id", plan_id);

    const planFeatureIds = (planFeatures || []).map((pf: any) => pf.feature_id);

    // Remove user_features not in new plan
    if (planFeatureIds.length > 0) {
      await adminClient
        .from("user_features")
        .delete()
        .eq("user_id", user_id)
        .not("feature_id", "in", `(${planFeatureIds.join(",")})`);
    } else {
      await adminClient
        .from("user_features")
        .delete()
        .eq("user_id", user_id);
    }

    // Upsert user_features from plan
    for (const pf of planFeatures || []) {
      const existing = await adminClient
        .from("user_features")
        .select("id")
        .eq("user_id", user_id)
        .eq("feature_id", pf.feature_id)
        .maybeSingle();

      if (!existing.data) {
        await adminClient.from("user_features").insert({
          user_id,
          feature_id: pf.feature_id,
          status: "ativo",
          tipo_periodo: plan_type === "vitalicio" ? "vitalicio" : plan_type === "anual" ? "anual" : "mensal",
          data_inicio: new Date().toISOString(),
          data_expiracao: plan_expires_at,
          atribuido_por: user.id,
          motivo: motivo || `Plano atribuído`,
        });
      } else {
        await adminClient
          .from("user_features")
          .update({
            status: "ativo",
            tipo_periodo: plan_type === "vitalicio" ? "vitalicio" : plan_type === "anual" ? "anual" : "mensal",
            data_expiracao: plan_expires_at,
          })
          .eq("id", existing.data.id);
      }

      // Log transaction
      await adminClient.from("feature_transactions").insert({
        user_id,
        feature_id: pf.feature_id,
        tipo: "ativacao",
        tipo_periodo: plan_type === "vitalicio" ? "vitalicio" : plan_type === "anual" ? "anual" : "mensal",
        executado_por: user.id,
        motivo: motivo || "Atribuição via plano",
      });
    }

    // Get plan and user info for webhook
    const { data: plan } = await adminClient.from("plans").select("nome").eq("id", plan_id).single();
    const { data: targetProfile } = await adminClient
      .from("profiles")
      .select("first_name, last_name, phone")
      .eq("user_id", user_id)
      .single();

    // Get features slugs
    const featureSlugs: string[] = [];
    if (planFeatureIds.length > 0) {
      const { data: features } = await adminClient
        .from("features")
        .select("slug")
        .in("id", planFeatureIds);
      features?.forEach((f: any) => featureSlugs.push(f.slug));
    }

    // Try webhook (non-blocking)
    try {
      const { data: webhookConfig } = await adminClient
        .from("webhook_configs")
        .select("url")
        .eq("event_type", "user.created")
        .eq("active", true)
        .maybeSingle();

      if (webhookConfig?.url) {
        await fetch(webhookConfig.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            evento: "plano.atribuido",
            usuario_id: user_id,
            nome: `${targetProfile?.first_name || ""} ${targetProfile?.last_name || ""}`.trim(),
            telefone: targetProfile?.phone,
            plano_nome: plan?.nome,
            plano_tipo: plan_type,
            expiracao: plan_expires_at,
            features: featureSlugs,
            created_at: new Date().toISOString(),
          }),
        });
      }
    } catch {
      // Webhook failure is non-critical
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
