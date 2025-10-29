import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CleanupResult {
  disabled_count: number;
  disabled_emails: string[];
  deleted_count: number;
  deleted_emails: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧹 Starting inactive users cleanup process...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Execute disable inactive users function
    console.log('⏳ Disabling users inactive for 30+ days...');
    const { data: disableResult, error: disableError } = await supabase
      .rpc('disable_inactive_users');

    if (disableError) {
      console.error('❌ Error disabling users:', disableError);
      throw disableError;
    }

    const disabledCount = disableResult?.[0]?.affected_count || 0;
    const disabledEmails = disableResult?.[0]?.user_emails || [];
    console.log(`✅ Disabled ${disabledCount} users:`, disabledEmails);

    // Execute delete inactive users function
    console.log('⏳ Deleting users inactive for 60+ days...');
    const { data: deleteResult, error: deleteError } = await supabase
      .rpc('delete_inactive_users');

    if (deleteError) {
      console.error('❌ Error deleting users:', deleteError);
      throw deleteError;
    }

    const deletedCount = deleteResult?.[0]?.affected_count || 0;
    const deletedEmails = deleteResult?.[0]?.user_emails || [];
    console.log(`✅ Deleted ${deletedCount} users:`, deletedEmails);

    const result: CleanupResult = {
      disabled_count: disabledCount,
      disabled_emails: disabledEmails,
      deleted_count: deletedCount,
      deleted_emails: deletedEmails,
    };

    console.log('✨ Cleanup process completed successfully!');
    console.log('📊 Summary:', {
      total_disabled: disabledCount,
      total_deleted: deletedCount,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cleanup completed successfully',
        result,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('💥 Cleanup process failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
