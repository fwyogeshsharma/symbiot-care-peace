import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, newMetadata, newPassword } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // List users to find the one with this email
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error("Error listing users:", listError);
      return new Response(
        JSON.stringify({ error: "Failed to check user status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find user with matching email
    const existingUser = users.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!existingUser) {
      // No existing user, can proceed with normal signup
      return new Response(
        JSON.stringify({ action: "proceed", message: "No existing user found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is confirmed
    const isConfirmed = existingUser.email_confirmed_at !== null;

    if (isConfirmed) {
      // User is confirmed, cannot re-register
      return new Response(
        JSON.stringify({ 
          action: "blocked", 
          message: "This email is already registered and verified. Please sign in instead." 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // User exists but is not confirmed - UPDATE their data and resend verification
    console.log(`Updating unconfirmed user: ${existingUser.id}`);
    
    // Build update object
    const updateData: Record<string, unknown> = {};
    
    if (newMetadata) {
      updateData.user_metadata = {
        ...existingUser.user_metadata,
        ...newMetadata,
      };
    }
    
    if (newPassword) {
      updateData.password = newPassword;
    }

    // Update the user with new data
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      existingUser.id,
      updateData
    );

    if (updateError) {
      console.error("Error updating unconfirmed user:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update registration data" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update profile table if it exists
    if (newMetadata) {
      try {
        const profileUpdate: Record<string, unknown> = {};
        if (newMetadata.full_name) profileUpdate.full_name = newMetadata.full_name;
        if (newMetadata.phone) profileUpdate.phone = newMetadata.phone;
        if (newMetadata.year_of_birth) profileUpdate.year_of_birth = newMetadata.year_of_birth;
        if (newMetadata.postal_address) profileUpdate.postal_address = newMetadata.postal_address;
        
        if (Object.keys(profileUpdate).length > 0) {
          profileUpdate.updated_at = new Date().toISOString();
          await supabaseAdmin
            .from("profiles")
            .update(profileUpdate)
            .eq("id", existingUser.id);
        }
      } catch (profileError) {
        console.log("Profile update (may not exist yet):", profileError);
      }
    }

    // Resend verification email by using inviteUserByEmail or resend
    // Since generateLink requires password for signup, we use a different approach
    // We'll trigger a new confirmation email by updating the user's email (to same email)
    try {
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        email: email, // This triggers a new confirmation email
      });
      console.log("New verification email triggered for:", email);
    } catch (emailError) {
      console.log("Could not resend verification email:", emailError);
    }

    console.log(`Successfully updated unconfirmed user: ${email}`);

    return new Response(
      JSON.stringify({ 
        action: "updated", 
        message: "Your registration data has been updated. A new verification email has been sent.",
        userId: existingUser.id
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in cleanup-unconfirmed-user:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
