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
    const { email, newMetadata } = await req.json();

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

    // User exists but is not confirmed - delete them so they can re-register
    console.log(`Deleting unconfirmed user: ${existingUser.id}`);
    
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      existingUser.id
    );

    if (deleteError) {
      console.error("Error deleting unconfirmed user:", deleteError);
      return new Response(
        JSON.stringify({ error: "Failed to cleanup unconfirmed registration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Also delete any related data (profiles, user_roles, etc.)
    // These should be cleaned up automatically by cascade, but let's be safe
    try {
      await supabaseAdmin.from("profiles").delete().eq("id", existingUser.id);
      await supabaseAdmin.from("user_roles").delete().eq("user_id", existingUser.id);
    } catch (cleanupError) {
      // Ignore cleanup errors for related tables
      console.log("Related data cleanup (may not exist):", cleanupError);
    }

    console.log(`Successfully deleted unconfirmed user: ${email}`);

    return new Response(
      JSON.stringify({ 
        action: "cleaned", 
        message: "Unconfirmed registration cleaned up. Please proceed with signup." 
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
