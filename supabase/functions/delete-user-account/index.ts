import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Delete user account request received');

    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Nincs jogosultság' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a Supabase client with the user's auth token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the user from the auth token
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError) {
      console.error('Error getting user:', userError);
      
      // If user doesn't exist, they might have already been deleted
      if (userError.message?.includes('does not exist')) {
        return new Response(
          JSON.stringify({ error: 'A fiók már törölve lett' }),
          { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Érvénytelen felhasználó' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!user) {
      console.error('No user found');
      return new Response(
        JSON.stringify({ error: 'Érvénytelen felhasználó' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Deleting account for user:', user.id);

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Delete all related records before deleting profile
    console.log('Deleting related records...');

    // Delete pending_animals where user is hunter_society or reviewer
    await supabaseAdmin.from('pending_animals').delete().eq('hunter_society_id', user.id);
    await supabaseAdmin.from('pending_animals').delete().eq('reviewed_by', user.id);

    // Delete buyer_price_proposals
    await supabaseAdmin.from('buyer_price_proposals').delete().eq('hunter_society_id', user.id);
    await supabaseAdmin.from('buyer_price_proposals').delete().eq('reviewed_by', user.id);

    // Delete hunter_feature_permissions
    await supabaseAdmin.from('hunter_feature_permissions').delete().eq('hunter_society_id', user.id);

    // Delete hunter_society_members
    await supabaseAdmin.from('hunter_society_members').delete().eq('hunter_society_id', user.id);
    await supabaseAdmin.from('hunter_society_members').delete().eq('hunter_id', user.id);

    // Delete membership_fee_settings
    await supabaseAdmin.from('membership_fee_settings').delete().eq('hunter_society_id', user.id);

    // Delete membership_payments
    await supabaseAdmin.from('membership_payments').delete().eq('hunter_society_id', user.id);
    await supabaseAdmin.from('membership_payments').delete().eq('user_id', user.id);
    await supabaseAdmin.from('membership_payments').delete().eq('paid_by', user.id);

    // Update profiles that reference this user as hunter_society_id
    await supabaseAdmin.from('profiles').update({ hunter_society_id: null }).eq('hunter_society_id', user.id);

    // Delete the profile (this will cascade delete other related data)
    console.log('Deleting profile...');
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', user.id);

    if (profileError) {
      console.error('[INTERNAL] Error deleting profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'A fiók törlése nem sikerült. Kérjük, próbálja újra később vagy vegye fel a kapcsolatot az ügyfélszolgálattal.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Then delete the user from auth.users (this also cascades)
    console.log('Deleting auth user...');
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('[INTERNAL] Error deleting auth user:', deleteError);
      return new Response(
        JSON.stringify({ error: 'A fiók törlése nem sikerült. Kérjük, próbálja újra később.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User account successfully deleted');

    return new Response(
      JSON.stringify({ message: 'Fiók sikeresen törölve' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[INTERNAL] Unexpected error in delete-user-account:', error);
    return new Response(
      JSON.stringify({ error: 'Váratlan hiba történt. Kérjük, próbálja újra később.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
