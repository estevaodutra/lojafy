import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Find token record
    const { data: tokenRecord, error: tokenError } = await supabaseAdmin
      .from("one_time_access_tokens")
      .select("*")
      .eq("token", token)
      .single();

    if (tokenError || !tokenRecord) {
      return new Response(
        JSON.stringify({ error: "Link inválido ou não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already used
    if (tokenRecord.used) {
      return new Response(
        JSON.stringify({ error: "Este link já foi utilizado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if expired
    if (new Date(tokenRecord.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Este link expirou" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark token as used
    const { error: updateError } = await supabaseAdmin
      .from("one_time_access_tokens")
      .update({
        used: true,
        used_at: new Date().toISOString(),
      })
      .eq("id", tokenRecord.id);

    if (updateError) {
      console.error("Error updating token:", updateError);
      return new Response(
        JSON.stringify({ error: "Erro ao processar o link" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user email for magic link
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(tokenRecord.user_id);

    if (userError || !userData?.user?.email) {
      console.error("Error getting user:", userError);
      return new Response(
        JSON.stringify({ error: "Usuário não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate magic link for automatic login
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: userData.user.email,
      options: {
        redirectTo: `https://lojafy.lovable.app${tokenRecord.redirect_url || '/reseller/onboarding'}`,
      },
    });

    if (linkError || !linkData) {
      console.error("Error generating magic link:", linkError);
      return new Response(
        JSON.stringify({ error: "Erro ao criar sessão de acesso" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract the token from the magic link
    const magicLinkUrl = new URL(linkData.properties.action_link);
    const magicToken = magicLinkUrl.searchParams.get("token");
    const tokenType = magicLinkUrl.searchParams.get("type");
    const tokenHash = magicLinkUrl.hash;

    return new Response(
      JSON.stringify({
        success: true,
        redirect_url: tokenRecord.redirect_url || "/reseller/onboarding",
        magic_link: linkData.properties.action_link,
        email_otp: linkData.properties.email_otp,
        hashed_token: linkData.properties.hashed_token,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in verify-onetime-link:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
