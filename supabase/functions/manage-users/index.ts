import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ManageUserRequest {
  action: 'block' | 'unblock' | 'delete' | 'reset-password' | 'delete-data';
  userId: string;
  password?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Create admin client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the requesting user is a super admin
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const { data: roleCheck } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .single();

    if (!roleCheck) {
      console.error('User is not a super admin:', user.id);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Super admin access required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const { action, userId, password }: ManageUserRequest = await req.json();
    console.log(`Super admin ${user.email} performing action: ${action} on user: ${userId}`);

    if (action === 'block') {
      // Update profile to mark as blocked
      const { error: blockError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          blocked_at: new Date().toISOString(),
          blocked_by: user.id 
        })
        .eq('id', userId);

      if (blockError) {
        console.error('Error blocking user:', blockError);
        throw blockError;
      }

      // Ban the user in auth (requires admin API)
      const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { ban_duration: '876000h' } // 100 years
      );

      if (banError) {
        console.error('Error banning user:', banError);
        throw banError;
      }

      console.log(`User ${userId} blocked successfully`);
      return new Response(
        JSON.stringify({ success: true, message: 'User blocked successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );

    } else if (action === 'unblock') {
      // Update profile to mark as unblocked
      const { error: unblockError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          blocked_at: null,
          blocked_by: null 
        })
        .eq('id', userId);

      if (unblockError) {
        console.error('Error unblocking user:', unblockError);
        throw unblockError;
      }

      // Unban the user in auth
      const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { ban_duration: 'none' }
      );

      if (unbanError) {
        console.error('Error unbanning user:', unbanError);
        throw unbanError;
      }

      console.log(`User ${userId} unblocked successfully`);
      return new Response(
        JSON.stringify({ success: true, message: 'User unblocked successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );

    } else if (action === 'delete') {
      // Delete user from auth (cascade will handle related data)
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (deleteError) {
        console.error('Error deleting user:', deleteError);
        throw deleteError;
      }

      console.log(`User ${userId} deleted successfully`);
      return new Response(
        JSON.stringify({ success: true, message: 'User and all associated data deleted successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );

    } else if (action === 'reset-password') {
      // Validate password is provided
      if (!password) {
        return new Response(
          JSON.stringify({ error: 'Password is required for reset-password action' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Update user password using admin API
      const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: password }
      );

      if (resetError) {
        console.error('Error resetting password:', resetError);
        throw resetError;
      }

      console.log(`Password reset successfully for user ${userId}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Password reset successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );

    } else if (action === 'delete-data') {
      try {
        console.log(`Starting delete-data action for user: ${userId}`);

        // Get elderly persons that belong to THIS specific user only (where they are the owner)
        const { data: elderlyPersons, error: elderlyError } = await supabaseAdmin
          .from('elderly_persons')
          .select('id, full_name')
          .eq('user_id', userId);

        if (elderlyError) {
          console.error('Error fetching elderly persons owned by user:', elderlyError);
          throw new Error(`Failed to get elderly persons: ${elderlyError.message}`);
        }

        console.log(`Found ${elderlyPersons?.length || 0} elderly persons owned by user ${userId}`);
        if (elderlyPersons && elderlyPersons.length > 0) {
          console.log('Elderly persons:', elderlyPersons.map(ep => `${ep.full_name} (${ep.id})`));
        }

        // Extract elderly person IDs
        const uniqueElderlyIds = elderlyPersons?.map((ep: any) => ep.id) || [];

        console.log(`Total elderly person IDs to delete data for: ${uniqueElderlyIds.length}`, uniqueElderlyIds);

        if (uniqueElderlyIds.length === 0) {
          console.log('No elderly persons found, returning success');
          return new Response(
            JSON.stringify({ success: true, message: 'No data found to delete' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }

        // Call the database function to delete all data
        console.log('Calling delete_elderly_person_data function...');

        const { data: deletedCounts, error: deleteError } = await supabaseAdmin
          .rpc('delete_elderly_person_data', {
            elderly_person_ids: uniqueElderlyIds
          });

        if (deleteError) {
          console.error('Error calling delete_elderly_person_data:', deleteError);
          throw new Error(`Failed to delete data: ${deleteError.message}`);
        }

        console.log(`Data deletion completed for user ${userId}`);
        console.log('Deleted counts:', deletedCounts);

        return new Response(
          JSON.stringify({
            success: true,
            message: 'All device data deleted successfully',
            deletedCounts
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      } catch (error) {
        console.error('Unexpected error in delete-data action:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Delete data failed: ${errorMessage}`);
      }

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

  } catch (error) {
    console.error('Error in manage-users function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
