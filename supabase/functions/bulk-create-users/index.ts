import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { users, default_password } = await req.json();

    if (!users || !Array.isArray(users) || !default_password) {
      return new Response(
        JSON.stringify({ error: "users array and default_password required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (const user of users) {
      const { email, name } = user;
      if (!email) continue;

      try {
        // Create auth user with confirmed email
        const { data: userData, error: createError } =
          await supabaseAdmin.auth.admin.createUser({
            email: email.toLowerCase(),
            password: default_password,
            email_confirm: true,
          });

        if (createError) {
          if (createError.message.includes("already been registered")) {
            results.skipped++;
          } else {
            results.errors.push(`${email}: ${createError.message}`);
          }
          continue;
        }

        const userId = userData.user.id;

        // Find employee record
        const { data: empData } = await supabaseAdmin
          .from("employees")
          .select("id, department")
          .ilike("email", email)
          .maybeSingle();

        // Create profile
        await supabaseAdmin.from("profiles").upsert({
          id: userId,
          email: email.toLowerCase(),
          name: name || email.split("@")[0],
          department: empData?.department || null,
          employee_id: empData?.id || null,
        });

        results.created++;
      } catch (err) {
        results.errors.push(`${email}: ${err.message}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
